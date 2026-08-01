"""1v1 match simulation: step actions, resolve hits, build observations."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from typing import Deque, List, Optional, Tuple

import numpy as np

from . import constants as C
from .actions import Action, NUM_ACTIONS
from .fighter import Fighter, FighterState


def _rects_overlap(
    a: Tuple[float, float, float, float], b: Tuple[float, float, float, float]
) -> bool:
    return a[0] < b[2] and a[2] > b[0] and a[1] < b[3] and a[3] > b[1]


@dataclass
class FighterSnapshot:
    x: float
    y: float
    vx: float
    vy: float
    facing: int
    hp: float
    stamina: float
    state: int
    state_timer: int
    attack_timer: int
    on_ground: bool
    last_action: int
    block_hold_frames: int


@dataclass
class MatchResult:
    winner: Optional[int]  # 0, 1, or None (draw / timeout)
    frames: int
    reason: str


@dataclass
class FrameLog:
    """One step of experience for BC / RL."""

    obs_p0: np.ndarray
    obs_p1: np.ndarray
    action_p0: int
    action_p1: int
    reward_p0: float
    reward_p1: float
    done: bool


class Match:
    """Deterministic headless 1v1 match."""

    # base features + action history (see observe)
    OBS_SIZE = 24 + C.ACTION_HISTORY

    def __init__(self, max_frames: int = C.MAX_FRAMES) -> None:
        self.max_frames = max_frames
        self.fighters: List[Fighter] = []
        self.frame = 0
        self.done = False
        self.result: Optional[MatchResult] = None
        self._action_hist: List[Deque[int]] = []
        self._prev_hp: List[float] = []
        self.logs: List[FrameLog] = []
        # Per-frame combat events for UI / rewards
        self.last_events: List[str] = []

    def reset(self) -> Tuple[np.ndarray, np.ndarray]:
        self.fighters = [
            Fighter(index=0, x=C.STAGE_WIDTH * 0.28, facing=1),
            Fighter(index=1, x=C.STAGE_WIDTH * 0.72, facing=-1),
        ]
        self.frame = 0
        self.done = False
        self.result = None
        self._action_hist = [
            deque([int(Action.IDLE)] * C.ACTION_HISTORY, maxlen=C.ACTION_HISTORY),
            deque([int(Action.IDLE)] * C.ACTION_HISTORY, maxlen=C.ACTION_HISTORY),
        ]
        self._prev_hp = [C.MAX_HP, C.MAX_HP]
        self.logs = []
        self.last_events = []
        self._face_each_other()
        return self.observe(0), self.observe(1)

    def _face_each_other(self) -> None:
        a, b = self.fighters
        if a.x <= b.x:
            a.facing = 1
            b.facing = -1
        else:
            a.facing = -1
            b.facing = 1

    def observe(self, perspective: int) -> np.ndarray:
        """Compact observation vector for one fighter."""
        me = self.fighters[perspective]
        opp = self.fighters[1 - perspective]
        scale_x = C.STAGE_WIDTH
        scale_y = C.STAGE_HEIGHT

        rel_x = (opp.x - me.x) / scale_x
        rel_y = (opp.y - me.y) / scale_y

        hist = np.array(self._action_hist[perspective], dtype=np.float32) / max(
            NUM_ACTIONS - 1, 1
        )

        base = np.array(
            [
                me.hp / C.MAX_HP,
                opp.hp / C.MAX_HP,
                me.stamina / C.MAX_STAMINA,
                opp.stamina / C.MAX_STAMINA,
                me.x / scale_x,
                me.y / scale_y,
                me.vx / 10.0,
                me.vy / 15.0,
                float(me.facing),
                float(me.on_ground),
                rel_x,
                rel_y,
                opp.vx / 10.0,
                opp.vy / 15.0,
                float(opp.facing),
                float(opp.on_ground),
                me.attack_timer / 30.0,
                opp.attack_timer / 30.0,
                float(me.state_timer) / 30.0,
                float(opp.state_timer) / 30.0,
                float(me.block_hold_frames) / max(C.PARRY_WINDOW_FRAMES, 1),
                float(int(me.state)) / 10.0,
                float(int(opp.state)) / 10.0,
                float(self.frame) / max(self.max_frames, 1),
            ],
            dtype=np.float32,
        )
        return np.concatenate([base, hist]).astype(np.float32)

    def step(
        self, action_p0: int, action_p1: int, record: bool = False
    ) -> Tuple[np.ndarray, np.ndarray, float, float, bool, dict]:
        if self.done:
            raise RuntimeError("Match is over; call reset()")

        a0 = Action(int(action_p0))
        a1 = Action(int(action_p1))
        obs0_before = self.observe(0)
        obs1_before = self.observe(1)
        self.last_events = []

        self._action_hist[0].append(int(a0))
        self._action_hist[1].append(int(a1))

        # Face opponent before acting (helps attacks aim correctly)
        self._face_each_other()

        f0, f1 = self.fighters
        f0.apply_action(a0)
        f1.apply_action(a1)

        f0.tick_timers_and_physics()
        f1.tick_timers_and_physics()

        self._resolve_body_push()

        dmg0 = 0.0  # damage taken by p0
        dmg1 = 0.0
        parry0 = False
        parry1 = False

        d, ev = self._try_hit(attacker=f1, defender=f0)
        dmg0 += d
        if ev == "parry":
            parry0 = True
            # Counter damage was applied to attacker (p1) inside _try_hit
        d, ev = self._try_hit(attacker=f0, defender=f1)
        dmg1 += d
        if ev == "parry":
            parry1 = True

        # Whiff events for UI
        if f0.just_parry_whiffed:
            self.last_events.append("parry_whiff_p0")
        if f1.just_parry_whiffed:
            self.last_events.append("parry_whiff_p1")

        self.frame += 1
        reward0, reward1 = self._rewards(dmg0, dmg1, parry0, parry1)

        self._check_end()

        obs0 = self.observe(0)
        obs1 = self.observe(1)
        info = {
            "frame": self.frame,
            "hp": (f0.hp, f1.hp),
            "stamina": (f0.stamina, f1.stamina),
            "result": self.result,
            "events": list(self.last_events),
        }

        if record:
            self.logs.append(
                FrameLog(
                    obs_p0=obs0_before,
                    obs_p1=obs1_before,
                    action_p0=int(a0),
                    action_p1=int(a1),
                    reward_p0=reward0,
                    reward_p1=reward1,
                    done=self.done,
                )
            )

        self._prev_hp = [f0.hp, f1.hp]
        return obs0, obs1, reward0, reward1, self.done, info

    def _resolve_body_push(self) -> None:
        a, b = self.fighters
        ra, rb = a.body_rect(), b.body_rect()
        if not _rects_overlap(ra, rb):
            return
        mid = (a.x + b.x) * 0.5
        gap = C.FIGHTER_WIDTH * 0.55
        if a.x <= b.x:
            a.x = mid - gap
            b.x = mid + gap
        else:
            b.x = mid - gap
            a.x = mid + gap
        a.x = max(C.WALL_MARGIN, min(C.STAGE_WIDTH - C.WALL_MARGIN, a.x))
        b.x = max(C.WALL_MARGIN, min(C.STAGE_WIDTH - C.WALL_MARGIN, b.x))

    def _try_hit(self, attacker: Fighter, defender: Fighter) -> Tuple[float, str]:
        """Returns (damage_to_defender, event)."""
        if not attacker.attack_active or attacker.hit_connected:
            return 0.0, "none"
        hb = attacker.hitbox_rect()
        if hb is None:
            return 0.0, "none"
        if not _rects_overlap(hb, defender.body_rect()):
            return 0.0, "none"

        attacker.hit_connected = True
        ad = attacker.attack_def
        assert ad is not None

        direction = 1 if attacker.x <= defender.x else -1
        stam_cost = (
            C.BLOCK_HIT_STAMINA_HEAVY if ad.is_heavy else C.BLOCK_HIT_STAMINA_LIGHT
        )

        dealt, result = defender.take_hit(
            damage=ad.damage,
            hitstun=ad.hitstun,
            knockback=ad.knockback,
            direction=direction,
            attacker_x=attacker.x,
            chip=ad.chip,
            block_stamina_cost=stam_cost,
            attack_blockstun=ad.blockstun,
        )

        if result == "parry":
            # Counter-damage + stun on attacker
            counter = attacker.apply_parry_punish(
                direction=-direction, is_heavy=ad.is_heavy
            )
            self.last_events.append(f"parry_p{defender.index}")
            if counter > 0:
                self.last_events.append(f"parry_dmg_p{attacker.index}:{counter:.0f}")
            # Attribute counter damage for rewards: attacker took damage
            if attacker.index == 0:
                # will be handled via hp delta in rewards only partially —
                # fold into return path by adjusting via side channel
                pass
            # Store counter on fighter for reward shaping this frame
            attacker._last_parry_damage_taken = counter  # type: ignore[attr-defined]
        elif result == "block":
            self.last_events.append(f"block_p{defender.index}")
        elif result == "guard_break":
            self.last_events.append(f"guard_break_p{defender.index}")
        elif result == "hit":
            self.last_events.append(f"hit_p{defender.index}")

        return dealt, result

    def _rewards(
        self,
        dmg_taken_p0: float,
        dmg_taken_p1: float,
        parry0: bool,
        parry1: bool,
    ) -> Tuple[float, float]:
        # Include parry counter-damage taken by each side
        f0, f1 = self.fighters
        counter0 = float(getattr(f0, "_last_parry_damage_taken", 0.0) or 0.0)
        counter1 = float(getattr(f1, "_last_parry_damage_taken", 0.0) or 0.0)
        f0._last_parry_damage_taken = 0.0  # type: ignore[attr-defined]
        f1._last_parry_damage_taken = 0.0  # type: ignore[attr-defined]

        total0 = dmg_taken_p0 + counter0
        total1 = dmg_taken_p1 + counter1
        r0 = (total1 - total0) / C.MAX_HP
        r1 = (total0 - total1) / C.MAX_HP
        if parry0:
            r0 += 0.2
            r1 -= 0.12
        if parry1:
            r1 += 0.2
            r0 -= 0.12
        if f0.just_parry_whiffed:
            r0 -= 0.05
        if f1.just_parry_whiffed:
            r1 -= 0.05
        if self.done and self.result is not None:
            if self.result.winner == 0:
                r0 += 1.0
                r1 -= 1.0
            elif self.result.winner == 1:
                r0 -= 1.0
                r1 += 1.0
        return r0, r1

    def _check_end(self) -> None:
        f0, f1 = self.fighters
        if not f0.alive and not f1.alive:
            self.done = True
            self.result = MatchResult(winner=None, frames=self.frame, reason="double_ko")
        elif not f0.alive:
            self.done = True
            self.result = MatchResult(winner=1, frames=self.frame, reason="ko")
        elif not f1.alive:
            self.done = True
            self.result = MatchResult(winner=0, frames=self.frame, reason="ko")
        elif self.frame >= self.max_frames:
            self.done = True
            if f0.hp > f1.hp:
                winner: Optional[int] = 0
            elif f1.hp > f0.hp:
                winner = 1
            else:
                winner = None
            self.result = MatchResult(winner=winner, frames=self.frame, reason="timeout")

    def snapshots(self) -> Tuple[FighterSnapshot, FighterSnapshot]:
        def snap(f: Fighter) -> FighterSnapshot:
            return FighterSnapshot(
                x=f.x,
                y=f.y,
                vx=f.vx,
                vy=f.vy,
                facing=f.facing,
                hp=f.hp,
                stamina=f.stamina,
                state=int(f.state),
                state_timer=f.state_timer,
                attack_timer=f.attack_timer,
                on_ground=f.on_ground,
                last_action=int(f.last_action),
                block_hold_frames=f.block_hold_frames,
            )

        return snap(self.fighters[0]), snap(self.fighters[1])
