"""Fighter state machine + physics. Pure Python, no rendering."""

from __future__ import annotations

from dataclasses import dataclass
from enum import IntEnum
from typing import Optional

from . import constants as C
from .actions import Action


class FighterState(IntEnum):
    IDLE = 0
    WALK = 1
    JUMP = 2
    LIGHT = 3
    HEAVY = 4
    BLOCK = 5
    HITSTUN = 6
    KO = 7
    BLOCKSTUN = 8  # locked after absorbing a hit on shield
    GUARD_BREAK = 9  # stamina emptied while blocking
    PARRY = 10  # brief success state (invuln / flash)
    PARRY_WHIFF = 11  # failed parry attempt — recovery, fully open


@dataclass
class AttackDef:
    startup: int
    active: int
    recovery: int
    damage: float
    chip: float
    hitstun: int
    blockstun: int
    knockback: float
    range: float
    hitbox_h: float
    hitbox_y_offset: float
    stamina_cost: float
    is_heavy: bool = False

    @property
    def total_frames(self) -> int:
        return self.startup + self.active + self.recovery


LIGHT_ATK = AttackDef(
    startup=C.LIGHT_STARTUP,
    active=C.LIGHT_ACTIVE,
    recovery=C.LIGHT_RECOVERY,
    damage=C.LIGHT_DAMAGE,
    chip=C.LIGHT_CHIP,
    hitstun=C.LIGHT_HITSTUN,
    blockstun=C.LIGHT_BLOCKSTUN,
    knockback=C.LIGHT_KNOCKBACK,
    range=C.LIGHT_RANGE,
    hitbox_h=C.LIGHT_HITBOX_H,
    hitbox_y_offset=C.LIGHT_HITBOX_Y_OFFSET,
    stamina_cost=C.LIGHT_STAMINA_COST,
    is_heavy=False,
)

HEAVY_ATK = AttackDef(
    startup=C.HEAVY_STARTUP,
    active=C.HEAVY_ACTIVE,
    recovery=C.HEAVY_RECOVERY,
    damage=C.HEAVY_DAMAGE,
    chip=C.HEAVY_CHIP,
    hitstun=C.HEAVY_HITSTUN,
    blockstun=C.HEAVY_BLOCKSTUN,
    knockback=C.HEAVY_KNOCKBACK,
    range=C.HEAVY_RANGE,
    hitbox_h=C.HEAVY_HITBOX_H,
    hitbox_y_offset=C.HEAVY_HITBOX_Y_OFFSET,
    stamina_cost=C.HEAVY_STAMINA_COST,
    is_heavy=True,
)


@dataclass
class Fighter:
    """One combatant. Index 0 is usually P1 (left), 1 is P2 (right)."""

    index: int
    x: float
    y: float = C.GROUND_Y
    vx: float = 0.0
    vy: float = 0.0
    facing: int = 1  # +1 right, -1 left
    hp: float = C.MAX_HP
    stamina: float = C.MAX_STAMINA
    state: FighterState = FighterState.IDLE
    state_timer: int = 0  # frames remaining in locked states
    attack_timer: int = 0  # frames into current attack
    attack_def: Optional[AttackDef] = None
    hit_connected: bool = False
    on_ground: bool = True
    last_action: Action = Action.IDLE
    # Shield: frames spent holding block on this press (0 = not blocking)
    block_hold_frames: int = 0
    # Frames until stamina regen resumes after a spend
    stamina_regen_cd: int = 0
    # Set for one frame after a successful parry (match uses this for FX / rewards)
    just_parried: bool = False
    just_guard_broke: bool = False
    just_parry_whiffed: bool = False
    # True if this shield press already scored a parry (shouldn't happen while still BLOCK)
    parry_connected: bool = False

    def clone(self) -> "Fighter":
        return Fighter(
            index=self.index,
            x=self.x,
            y=self.y,
            vx=self.vx,
            vy=self.vy,
            facing=self.facing,
            hp=self.hp,
            stamina=self.stamina,
            state=self.state,
            state_timer=self.state_timer,
            attack_timer=self.attack_timer,
            attack_def=self.attack_def,
            hit_connected=self.hit_connected,
            on_ground=self.on_ground,
            last_action=self.last_action,
            block_hold_frames=self.block_hold_frames,
            stamina_regen_cd=self.stamina_regen_cd,
            just_parried=self.just_parried,
            just_guard_broke=self.just_guard_broke,
            just_parry_whiffed=self.just_parry_whiffed,
            parry_connected=self.parry_connected,
        )

    @property
    def alive(self) -> bool:
        return self.hp > 0 and self.state != FighterState.KO

    @property
    def locked(self) -> bool:
        """Cannot freely choose movement/attacks."""
        return self.state in (
            FighterState.LIGHT,
            FighterState.HEAVY,
            FighterState.HITSTUN,
            FighterState.BLOCKSTUN,
            FighterState.GUARD_BREAK,
            FighterState.PARRY,
            FighterState.PARRY_WHIFF,
            FighterState.KO,
        )

    @property
    def is_attacking(self) -> bool:
        return self.state in (FighterState.LIGHT, FighterState.HEAVY)

    @property
    def is_shielding(self) -> bool:
        return self.state == FighterState.BLOCK and self.on_ground

    @property
    def in_parry_window(self) -> bool:
        """Fresh shield press: first PARRY_WINDOW_FRAMES of a hold."""
        return (
            self.is_shielding
            and 0 < self.block_hold_frames <= C.PARRY_WINDOW_FRAMES
        )

    @property
    def attack_active(self) -> bool:
        if not self.is_attacking or self.attack_def is None:
            return False
        ad = self.attack_def
        return ad.startup <= self.attack_timer < ad.startup + ad.active

    def body_rect(self) -> tuple[float, float, float, float]:
        half_w = C.FIGHTER_WIDTH * 0.5
        return (
            self.x - half_w,
            self.y - C.FIGHTER_HEIGHT,
            self.x + half_w,
            self.y,
        )

    def shield_rect(self) -> Optional[tuple[float, float, float, float]]:
        """Visual/logical shield plate in front of fighter."""
        if not self.is_shielding and self.state != FighterState.BLOCKSTUN:
            return None
        half_h = C.FIGHTER_HEIGHT * 0.55
        cx = self.x + self.facing * (C.FIGHTER_WIDTH * 0.55)
        top = self.y - C.FIGHTER_HEIGHT * 0.85
        w = 14.0
        if self.facing >= 0:
            return (cx, top, cx + w, top + half_h)
        return (cx - w, top, cx, top + half_h)

    def hitbox_rect(self) -> Optional[tuple[float, float, float, float]]:
        if not self.attack_active or self.attack_def is None:
            return None
        ad = self.attack_def
        if self.facing >= 0:
            left = self.x
            right = self.x + ad.range
        else:
            right = self.x
            left = self.x - ad.range
        top = self.y + ad.hitbox_y_offset - ad.hitbox_h * 0.5
        bottom = top + ad.hitbox_h
        return (left, top, right, bottom)

    def can_afford(self, cost: float) -> bool:
        return self.stamina >= cost

    def spend_stamina(self, amount: float) -> None:
        self.stamina = max(0.0, self.stamina - amount)
        self.stamina_regen_cd = C.STAMINA_REGEN_DELAY

    def apply_action(self, action: Action) -> None:
        """Begin processing an action for this frame (before physics)."""
        self.last_action = action
        self.just_parried = False
        self.just_guard_broke = False
        self.just_parry_whiffed = False

        if self.state == FighterState.KO:
            return

        # Locked recovery states
        if self.state in (
            FighterState.HITSTUN,
            FighterState.BLOCKSTUN,
            FighterState.GUARD_BREAK,
            FighterState.PARRY,
            FighterState.PARRY_WHIFF,
        ):
            return

        if self.is_attacking:
            return

        # --- Block / shield ---
        if action == Action.BLOCK and self.on_ground and self.stamina > 0:
            if self.state != FighterState.BLOCK:
                self.block_hold_frames = 0
                self.parry_connected = False
            self.state = FighterState.BLOCK
            self.block_hold_frames += 1
            self.vx = 0.0
            self.spend_stamina(C.BLOCK_HOLD_DRAIN)
            # Empty stamina while holding → drop shield (soft break)
            if self.stamina <= 0:
                self.stamina = 0.0
                self._release_block(whiff_check=True)
            return

        # Leaving block (release shield)
        if self.state == FighterState.BLOCK:
            self._release_block(whiff_check=True)
            # fall through so other actions on this frame can still apply
            if self.state == FighterState.PARRY_WHIFF:
                return

        if action == Action.LIGHT and self.on_ground:
            if self.can_afford(LIGHT_ATK.stamina_cost):
                self.spend_stamina(LIGHT_ATK.stamina_cost)
                self._start_attack(LIGHT_ATK, FighterState.LIGHT)
            return

        if action == Action.HEAVY and self.on_ground:
            if self.can_afford(HEAVY_ATK.stamina_cost):
                self.spend_stamina(HEAVY_ATK.stamina_cost)
                self._start_attack(HEAVY_ATK, FighterState.HEAVY)
            return

        if action == Action.JUMP and self.on_ground:
            if self.can_afford(C.JUMP_STAMINA_COST):
                self.spend_stamina(C.JUMP_STAMINA_COST)
                self.vy = C.JUMP_VELOCITY
                self.on_ground = False
                self.state = FighterState.JUMP
            return

        # Horizontal movement (costs stamina)
        moving = action in (Action.LEFT, Action.RIGHT)
        if moving:
            drain = (
                C.WALK_STAMINA_PER_FRAME
                if self.on_ground
                else C.AIR_MOVE_STAMINA_PER_FRAME
            )
            if self.stamina < C.MOVE_MIN_STAMINA:
                # Exhausted — can't walk
                if self.on_ground:
                    self.vx = 0.0
                    self.state = FighterState.IDLE
                return
            self.spend_stamina(drain)
            speed = C.WALK_SPEED if self.on_ground else C.WALK_SPEED * C.AIR_CONTROL
            if action == Action.LEFT:
                self.vx = -speed
            else:
                self.vx = speed
            if self.on_ground:
                self.state = FighterState.WALK
            return

        if self.on_ground:
            self.vx = 0.0
            self.state = FighterState.IDLE

    def _release_block(self, whiff_check: bool) -> None:
        """Drop shield. Short tap with no connect = parry whiff recovery."""
        held = self.block_hold_frames
        self.block_hold_frames = 0
        if (
            whiff_check
            and not self.parry_connected
            and 0 < held <= C.PARRY_WINDOW_FRAMES
        ):
            # Fished for a parry and got nothing — punish
            self.just_parry_whiffed = True
            self.state = FighterState.PARRY_WHIFF
            self.state_timer = C.PARRY_WHIFF_RECOVERY
            self.spend_stamina(C.PARRY_WHIFF_STAMINA_COST)
            self.vx = 0.0
        else:
            self.state = FighterState.IDLE
        self.parry_connected = False

    def _start_attack(self, attack: AttackDef, state: FighterState) -> None:
        self.state = state
        self.attack_def = attack
        self.attack_timer = 0
        self.hit_connected = False
        self.vx = 0.0
        self.block_hold_frames = 0

    def tick_timers_and_physics(self) -> None:
        """Advance timers, regen stamina, integrate motion."""
        self._regen_stamina()

        if self.state == FighterState.KO:
            self.vx *= 0.9
            self._integrate()
            return

        if self.state in (
            FighterState.HITSTUN,
            FighterState.BLOCKSTUN,
            FighterState.GUARD_BREAK,
            FighterState.PARRY,
            FighterState.PARRY_WHIFF,
        ):
            self.state_timer -= 1
            self.vx *= 0.85
            if self.state_timer <= 0:
                self.state = FighterState.IDLE if self.on_ground else FighterState.JUMP
                self.vx = 0.0
                self.block_hold_frames = 0
            self._integrate()
            return

        if self.is_attacking and self.attack_def is not None:
            self.attack_timer += 1
            if self.attack_timer >= self.attack_def.total_frames:
                self.state = FighterState.IDLE if self.on_ground else FighterState.JUMP
                self.attack_def = None
                self.attack_timer = 0
                self.hit_connected = False
            self._integrate()
            return

        if self.state == FighterState.BLOCK:
            self.vx = 0.0

        self._integrate()

        if self.on_ground and self.state == FighterState.JUMP:
            self.state = FighterState.IDLE

    def _regen_stamina(self) -> None:
        if self.stamina_regen_cd > 0:
            self.stamina_regen_cd -= 1
            return
        # No regen while attacking, blocking, walking hard, or broken
        if self.state in (
            FighterState.LIGHT,
            FighterState.HEAVY,
            FighterState.BLOCK,
            FighterState.BLOCKSTUN,
            FighterState.GUARD_BREAK,
            FighterState.PARRY_WHIFF,
            FighterState.WALK,
            FighterState.KO,
        ):
            return
        self.stamina = min(C.MAX_STAMINA, self.stamina + C.STAMINA_REGEN_PER_FRAME)

    def _integrate(self) -> None:
        if not self.on_ground or self.vy < 0:
            self.vy = min(self.vy + C.GRAVITY, C.MAX_FALL_SPEED)

        self.x += self.vx
        self.y += self.vy

        min_x = C.WALL_MARGIN
        max_x = C.STAGE_WIDTH - C.WALL_MARGIN
        if self.x < min_x:
            self.x = min_x
            self.vx = 0.0
        elif self.x > max_x:
            self.x = max_x
            self.vx = 0.0

        if self.y >= C.GROUND_Y:
            self.y = C.GROUND_Y
            self.vy = 0.0
            self.on_ground = True
        else:
            self.on_ground = False

    def facing_attacker(self, attacker_x: float) -> bool:
        """True if we are looking toward the attacker (required to shield/parry)."""
        if attacker_x >= self.x:
            return self.facing > 0
        return self.facing < 0

    def take_hit(
        self,
        damage: float,
        hitstun: int,
        knockback: float,
        direction: int,
        attacker_x: float,
        chip: float,
        block_stamina_cost: float,
        attack_blockstun: int,
    ) -> tuple[float, str]:
        """
        Apply a hit. Returns (damage_dealt, result) where result is one of:
        'hit' | 'block' | 'parry' | 'guard_break' | 'none'
        """
        if self.state == FighterState.KO:
            return 0.0, "none"

        # Parry success flash is invulnerable
        if self.state == FighterState.PARRY:
            return 0.0, "none"

        can_defend = (
            self.state == FighterState.BLOCK
            and self.on_ground
            and self.facing_attacker(attacker_x)
            and self.stamina > 0
        )

        if can_defend and self.in_parry_window:
            # Perfect parry: no damage taken; counter-damage applied to attacker in match
            self.just_parried = True
            self.parry_connected = True
            self.state = FighterState.PARRY
            self.state_timer = C.PARRY_FLASH_FRAMES
            self.block_hold_frames = 0
            self.attack_def = None
            self.attack_timer = 0
            self.stamina = min(C.MAX_STAMINA, self.stamina + C.PARRY_STAMINA_REFUND)
            self.vx = 0.0
            return 0.0, "parry"

        # Hit during parry-whiff recovery = free punish (full damage, already falls through)

        if can_defend:
            # Normal shield block
            self.spend_stamina(block_stamina_cost)
            if self.stamina <= 0:
                # Guard break — eat full damage + long stun
                self.stamina = 0.0
                self.just_guard_broke = True
                dealt = damage
                self.hp = max(0.0, self.hp - dealt)
                self.block_hold_frames = 0
                self.attack_def = None
                self.attack_timer = 0
                if self.hp <= 0:
                    self._ko()
                    self.vx = direction * knockback
                    return dealt, "guard_break"
                self.state = FighterState.GUARD_BREAK
                self.state_timer = C.GUARD_BREAK_STUN
                self.vx = direction * knockback * 1.1
                return dealt, "guard_break"

            dealt = chip
            self.hp = max(0.0, self.hp - dealt)
            self.state = FighterState.BLOCKSTUN
            self.state_timer = attack_blockstun
            self.block_hold_frames = 0
            self.vx = direction * knockback * C.BLOCK_PUSHBACK_SCALE
            if self.hp <= 0:
                self._ko()
            return dealt, "block"

        # Clean hit
        dealt = damage
        self.hp = max(0.0, self.hp - dealt)
        self.block_hold_frames = 0
        self.attack_def = None
        self.attack_timer = 0
        if self.hp <= 0:
            self._ko()
            self.vx = direction * knockback
            return dealt, "hit"

        self.state = FighterState.HITSTUN
        self.state_timer = hitstun
        self.vx = direction * knockback
        return dealt, "hit"

    def apply_parry_punish(self, direction: int, is_heavy: bool = False) -> float:
        """
        Called on attacker when their hit is parried.
        Deals counter damage and long stun. Returns damage dealt.
        """
        if self.state == FighterState.KO:
            return 0.0

        dmg = C.PARRY_COUNTER_DAMAGE + (
            C.PARRY_COUNTER_HEAVY_BONUS if is_heavy else 0.0
        )
        self.hp = max(0.0, self.hp - dmg)
        self.attack_def = None
        self.attack_timer = 0
        self.hit_connected = True
        self.block_hold_frames = 0
        self.vx = direction * C.PARRY_COUNTER_KNOCKBACK

        if self.hp <= 0:
            self._ko()
            return dmg

        self.state = FighterState.HITSTUN
        self.state_timer = C.PARRY_STUN_ATTACKER
        return dmg

    def _ko(self) -> None:
        self.hp = 0.0
        self.state = FighterState.KO
        self.state_timer = 0
        self.attack_def = None
        self.block_hold_frames = 0
        self.parry_connected = False
