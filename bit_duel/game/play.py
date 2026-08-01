#!/usr/bin/env python3
"""
Bit-Duel playable client.

Controls (P1):
  A/D or Left/Right  move
  W / Up / Space      jump
  J / Z               light attack
  K / X               heavy attack
  L / C / Shift       block / shield
                      (tap just before a hit lands = PARRY)

Esc  quit · R  rematch · N next (campaign)
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import List, Optional, Tuple

import pygame

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from bit_duel.ai.policies import Policy, load_policy
from bit_duel.core import constants as C
from bit_duel.core.fighter import FighterState
from bit_duel.core.match import Match
from bit_duel.logging.trajectories import TrajectoryStore

SCREEN_W = int(C.STAGE_WIDTH)
SCREEN_H = int(C.STAGE_HEIGHT + 80)
GROUND_SCREEN_Y = int(C.GROUND_Y)
TOP_PANEL_H = 72

# Palette
BG_TOP = (18, 16, 40)
BG_BOT = (40, 28, 60)
GROUND = (32, 36, 48)
GROUND_LINE = (90, 80, 120)
P1_BODY = (80, 200, 255)
P1_DARK = (40, 120, 180)
P2_BODY = (255, 100, 120)
P2_DARK = (180, 40, 70)
HITBOX = (255, 240, 80)
SHIELD = (120, 200, 255)
SHIELD_PARRY = (255, 255, 120)
UI_BG = (12, 10, 24)
HP_BG = (40, 40, 50)
HP_P1 = (60, 220, 140)
HP_P2 = (240, 90, 100)
STAM_P1 = (90, 170, 255)
STAM_P2 = (255, 160, 90)
TEXT = (230, 225, 245)
MUTED = (140, 135, 160)
PARRY_GOLD = (255, 230, 90)
GUARD_BREAK_RED = (255, 60, 80)

STATE_COLORS = {
    FighterState.IDLE: None,
    FighterState.WALK: None,
    FighterState.JUMP: (200, 200, 255),
    FighterState.LIGHT: (255, 220, 100),
    FighterState.HEAVY: (255, 140, 40),
    FighterState.BLOCK: (140, 200, 255),
    FighterState.HITSTUN: (255, 80, 80),
    FighterState.KO: (80, 80, 90),
    FighterState.BLOCKSTUN: (160, 190, 230),
    FighterState.GUARD_BREAK: (255, 40, 60),
    FighterState.PARRY: (255, 240, 120),
    FighterState.PARRY_WHIFF: (180, 100, 200),
}


def read_player_action(keys: pygame.key.ScancodeWrapper) -> int:
    from bit_duel.core.actions import Action

    if keys[pygame.K_l] or keys[pygame.K_c] or keys[pygame.K_LSHIFT] or keys[pygame.K_RSHIFT]:
        return int(Action.BLOCK)
    if keys[pygame.K_j] or keys[pygame.K_z]:
        return int(Action.LIGHT)
    if keys[pygame.K_k] or keys[pygame.K_x]:
        return int(Action.HEAVY)
    if keys[pygame.K_w] or keys[pygame.K_UP] or keys[pygame.K_SPACE]:
        return int(Action.JUMP)
    left = keys[pygame.K_a] or keys[pygame.K_LEFT]
    right = keys[pygame.K_d] or keys[pygame.K_RIGHT]
    if left and not right:
        return int(Action.LEFT)
    if right and not left:
        return int(Action.RIGHT)
    return int(Action.IDLE)


def draw_vertical_gradient(
    surf: pygame.Surface, top: Tuple[int, int, int], bot: Tuple[int, int, int]
) -> None:
    h = surf.get_height()
    for y in range(h):
        t = y / max(h - 1, 1)
        col = tuple(int(top[i] * (1 - t) + bot[i] * t) for i in range(3))
        pygame.draw.line(surf, col, (0, y), (surf.get_width(), y))


def draw_fighter(
    surf: pygame.Surface,
    fighter,
    body: Tuple[int, int, int],
    dark: Tuple[int, int, int],
) -> None:
    x, y = fighter.x, fighter.y
    facing = fighter.facing
    state = fighter.state
    w, h = int(C.FIGHTER_WIDTH), int(C.FIGHTER_HEIGHT)
    rect = pygame.Rect(int(x - w / 2), int(y - h), w, h)

    flash = STATE_COLORS.get(state)
    color = flash if flash else body

    pygame.draw.ellipse(
        surf,
        (0, 0, 0),
        pygame.Rect(int(x - w * 0.45), int(y - 6), int(w * 0.9), 10),
    )

    pygame.draw.rect(surf, color, rect, border_radius=6)
    pygame.draw.rect(surf, dark, rect, width=2, border_radius=6)

    eye_x = int(x + facing * 8)
    eye_y = int(y - h + 18)
    pygame.draw.circle(surf, (20, 20, 30), (eye_x, eye_y), 4)
    pygame.draw.circle(surf, (255, 255, 255), (eye_x + facing, eye_y - 1), 1)

    # Attack arm
    if state in (FighterState.LIGHT, FighterState.HEAVY):
        arm_len = 28 if state == FighterState.LIGHT else 40
        ay = int(y - h * 0.55)
        ax0 = int(x)
        ax1 = int(x + facing * arm_len)
        thickness = 5 if state == FighterState.LIGHT else 8
        pygame.draw.line(surf, HITBOX, (ax0, ay), (ax1, ay), thickness)

    # Shield plate
    if state in (FighterState.BLOCK, FighterState.BLOCKSTUN):
        sr = fighter.shield_rect()
        if sr is not None:
            in_parry = (
                state == FighterState.BLOCK
                and 0 < fighter.block_hold_frames <= C.PARRY_WINDOW_FRAMES
            )
            col = SHIELD_PARRY if in_parry else SHIELD
            rect_s = pygame.Rect(
                int(sr[0]), int(sr[1]), int(sr[2] - sr[0]), int(sr[3] - sr[1])
            )
            s = pygame.Surface((max(rect_s.width, 1), max(rect_s.height, 1)), pygame.SRCALPHA)
            alpha = 200 if in_parry else 140
            s.fill((*col, alpha))
            surf.blit(s, rect_s.topleft)
            pygame.draw.rect(surf, col, rect_s, width=2, border_radius=3)

    # Parry burst
    if state == FighterState.PARRY:
        pygame.draw.circle(surf, PARRY_GOLD, (int(x), int(y - h * 0.5)), 28, width=3)
        pygame.draw.circle(surf, (255, 255, 200), (int(x), int(y - h * 0.5)), 18, width=2)

    # Whiffed parry — purple stagger pose
    if state == FighterState.PARRY_WHIFF:
        pygame.draw.circle(surf, (180, 100, 200), (int(x), int(y - h * 0.5)), 22, width=2)
        pygame.draw.line(
            surf,
            (200, 120, 220),
            (int(x - 16), int(y - h * 0.7)),
            (int(x + 16), int(y - h * 0.3)),
            2,
        )

    # Guard break crack
    if state == FighterState.GUARD_BREAK:
        pygame.draw.line(
            surf,
            GUARD_BREAK_RED,
            (int(x - 12), int(y - h + 10)),
            (int(x + 12), int(y - 10)),
            3,
        )


def draw_hitbox(surf: pygame.Surface, match: Match, idx: int) -> None:
    f = match.fighters[idx]
    hb = f.hitbox_rect()
    if hb is None:
        return
    rect = pygame.Rect(int(hb[0]), int(hb[1]), int(hb[2] - hb[0]), int(hb[3] - hb[1]))
    if rect.width <= 0 or rect.height <= 0:
        return
    s = pygame.Surface((rect.width, rect.height), pygame.SRCALPHA)
    s.fill((255, 230, 80, 90))
    surf.blit(s, rect.topleft)
    pygame.draw.rect(surf, HITBOX, rect, width=1)


def draw_resource_bar(
    surf: pygame.Surface,
    x: int,
    y: int,
    w: int,
    h: int,
    value: float,
    maximum: float,
    color: Tuple[int, int, int],
    align_right: bool = False,
) -> None:
    pct = max(0.0, min(1.0, value / maximum))
    bar = pygame.Rect(x, y, w, h)
    pygame.draw.rect(surf, HP_BG, bar, border_radius=3)
    fill_w = int(w * pct)
    if fill_w > 0:
        if align_right:
            fill = pygame.Rect(x + w - fill_w, y, fill_w, h)
        else:
            fill = pygame.Rect(x, y, fill_w, h)
        pygame.draw.rect(surf, color, fill, border_radius=3)
    pygame.draw.rect(surf, MUTED, bar, width=1, border_radius=3)


def draw_ui(
    surf: pygame.Surface,
    font: pygame.font.Font,
    small: pygame.font.Font,
    match: Match,
    opponent_name: str,
    message: str,
    float_msgs: List[Tuple[str, int]],
) -> None:
    pygame.draw.rect(surf, UI_BG, pygame.Rect(0, 0, SCREEN_W, TOP_PANEL_H))
    f0, f1 = match.fighters

    # Labels
    surf.blit(small.render("YOU", True, TEXT), (16, 6))
    opp_label = small.render(opponent_name.upper(), True, TEXT)
    surf.blit(opp_label, (SCREEN_W - 16 - opp_label.get_width(), 6))

    # HP
    draw_resource_bar(surf, 16, 24, 280, 16, f0.hp, C.MAX_HP, HP_P1, align_right=False)
    draw_resource_bar(
        surf, SCREEN_W - 296, 24, 280, 16, f1.hp, C.MAX_HP, HP_P2, align_right=True
    )

    # Stamina
    draw_resource_bar(
        surf, 16, 46, 280, 10, f0.stamina, C.MAX_STAMINA, STAM_P1, align_right=False
    )
    draw_resource_bar(
        surf,
        SCREEN_W - 296,
        46,
        280,
        10,
        f1.stamina,
        C.MAX_STAMINA,
        STAM_P2,
        align_right=True,
    )
    surf.blit(small.render("STA", True, MUTED), (16, 58))
    sta_r = small.render("STA", True, MUTED)
    surf.blit(sta_r, (SCREEN_W - 16 - sta_r.get_width(), 58))

    timer = max(0, (match.max_frames - match.frame) // C.FPS)
    t_surf = font.render(f"{timer:02d}", True, TEXT)
    surf.blit(t_surf, (SCREEN_W // 2 - t_surf.get_width() // 2, 22))

    # Ground
    pygame.draw.rect(
        surf, GROUND, pygame.Rect(0, GROUND_SCREEN_Y, SCREEN_W, SCREEN_H - GROUND_SCREEN_Y)
    )
    pygame.draw.line(surf, GROUND_LINE, (0, GROUND_SCREEN_Y), (SCREEN_W, GROUND_SCREEN_Y), 3)
    for x in range(0, SCREEN_W, 40):
        pygame.draw.line(surf, (50, 48, 70), (x, GROUND_SCREEN_Y + 4), (x, SCREEN_H), 1)

    footer = small.render(
        "Move A/D (uses STA)  Jump W  Light J  Heavy K  Shield L (tap=parry, whiff=punish)  ·  R rematch  Esc quit",
        True,
        MUTED,
    )
    surf.blit(footer, (16, SCREEN_H - 28))

    if message:
        msg = font.render(message, True, TEXT)
        surf.blit(msg, (SCREEN_W // 2 - msg.get_width() // 2, TOP_PANEL_H + 12))

    # Floating combat callouts
    for text, age in float_msgs:
        alpha_t = max(0, 1.0 - age / 45.0)
        if "WHIFF" in text:
            col = (200, 140, 255)
        elif "PARRY" in text:
            col = PARRY_GOLD
        elif "BREAK" in text:
            col = GUARD_BREAK_RED
        else:
            col = TEXT
        s = font.render(text, True, col)
        surf.blit(
            s,
            (SCREEN_W // 2 - s.get_width() // 2, 120 + int(age * 0.4)),
        )


def run_match(
    screen: pygame.Surface,
    clock: pygame.time.Clock,
    font: pygame.font.Font,
    small: pygame.font.Font,
    opponent: Policy,
    store: TrajectoryStore,
    record: bool,
    show_hitboxes: bool,
) -> Optional[str]:
    match = Match()
    match.reset()
    message = ""
    ended = False
    result_saved = False
    float_msgs: List[Tuple[str, int]] = []

    while True:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                return "quit"
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    return "quit"
                if ended:
                    if event.key == pygame.K_r:
                        return "rematch"
                    if event.key in (pygame.K_n, pygame.K_RETURN):
                        return "next"

        keys = pygame.key.get_pressed()
        if not ended:
            p_action = read_player_action(keys)
            obs1 = match.observe(1)
            o_action = opponent.act(obs1, match=match, me_idx=1)
            _, _, _, _, done, info = match.step(p_action, o_action, record=record)

            for ev in info.get("events", []):
                if ev.startswith("parry_dmg_"):
                    # e.g. parry_dmg_p1:12
                    continue
                if ev.startswith("parry_whiff_"):
                    who = "YOU" if ev.endswith("p0") else opponent.name.upper()
                    float_msgs.append((f"WHIFF! ({who})", 0))
                elif ev.startswith("parry_p"):
                    who = "YOU" if ev.endswith("p0") else opponent.name.upper()
                    float_msgs.append((f"PARRY! +DMG ({who})", 0))
                elif ev.startswith("guard_break_"):
                    who = "YOU" if ev.endswith("p0") else opponent.name.upper()
                    float_msgs.append((f"GUARD BREAK! ({who})", 0))
                elif ev.startswith("block_"):
                    pass  # quiet — shield flash is enough

            if done:
                ended = True
                res = match.result
                if res is None:
                    message = "Draw"
                elif res.winner == 0:
                    message = "YOU WIN"
                elif res.winner == 1:
                    message = f"{opponent.name.upper()} WINS"
                else:
                    message = "DRAW"
                message += f"  ({res.reason if res else '?'})"
                message += "   [R] rematch  [N] next  [Esc] quit"
                if record and not result_saved:
                    path = store.save_match(
                        match,
                        player_side=0,
                        tag="play",
                        meta={"opponent": opponent.name},
                    )
                    message += f"  ·  {path.name}"
                    result_saved = True

        # Age float messages
        float_msgs = [(t, a + 1) for t, a in float_msgs if a < 45]

        draw_vertical_gradient(screen, BG_TOP, BG_BOT)
        draw_ui(screen, font, small, match, opponent.name, message, float_msgs)

        f0, f1 = match.fighters
        draw_fighter(screen, f0, P1_BODY, P1_DARK)
        draw_fighter(screen, f1, P2_BODY, P2_DARK)
        if show_hitboxes:
            draw_hitbox(screen, match, 0)
            draw_hitbox(screen, match, 1)

        pygame.display.flip()
        clock.tick(C.FPS)


CAMPAIGN = [
    "aggressive",
    "turtle",
    "jumpy",
    "models/mirror.pt",
    "models/counter.zip",
]


def main(argv: Optional[List[str]] = None) -> None:
    parser = argparse.ArgumentParser(description="Play Bit-Duel")
    parser.add_argument(
        "--opponent",
        type=str,
        default="aggressive",
        help="aggressive|turtle|jumpy|random|path/to/model.pt|.zip",
    )
    parser.add_argument(
        "--campaign",
        action="store_true",
        help="Short ladder: aggressive → turtle → jumpy → Mirror → Counter",
    )
    parser.add_argument("--no-record", action="store_true", help="Do not log trajectories")
    parser.add_argument("--hitboxes", action="store_true", help="Draw attack hitboxes")
    parser.add_argument("--seed", type=int, default=None)
    args = parser.parse_args(argv)

    pygame.init()
    pygame.display.set_caption("Bit-Duel")
    screen = pygame.display.set_mode((SCREEN_W, SCREEN_H))
    clock = pygame.time.Clock()
    font = pygame.font.SysFont("Menlo", 18)
    small = pygame.font.SysFont("Menlo", 12)

    store = TrajectoryStore(ROOT / "data" / "trajectories")

    if args.campaign:
        ladder: List[Policy] = []
        for spec in CAMPAIGN:
            resolved = str(ROOT / spec) if spec.startswith("models/") else spec
            if spec.startswith("models/") and not (ROOT / spec).exists():
                print(f"[campaign] skip missing model {spec} (train it first)")
                continue
            try:
                ladder.append(load_policy(resolved, seed=args.seed))
            except Exception as exc:  # noqa: BLE001
                print(f"[campaign] skip {spec}: {exc}")
        if not ladder:
            ladder = [load_policy("aggressive", seed=args.seed)]

        idx = 0
        while 0 <= idx < len(ladder):
            opp = ladder[idx]
            pygame.display.set_caption(f"Bit-Duel — {idx + 1}/{len(ladder)}: {opp.name}")
            result = run_match(
                screen,
                clock,
                font,
                small,
                opp,
                store,
                record=not args.no_record,
                show_hitboxes=args.hitboxes,
            )
            if result == "quit":
                break
            if result == "next":
                idx += 1
                if idx >= len(ladder):
                    print("Campaign complete.")
                    break
    else:
        opponent = load_policy(args.opponent, seed=args.seed)
        while True:
            result = run_match(
                screen,
                clock,
                font,
                small,
                opponent,
                store,
                record=not args.no_record,
                show_hitboxes=args.hitboxes,
            )
            if result in ("quit", "next"):
                break

    pygame.quit()


if __name__ == "__main__":
    main()
