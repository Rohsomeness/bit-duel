"""Core combat sim tests."""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from bit_duel.ai.scripted import AggressiveAI, TurtleAI
from bit_duel.ai.policies import ScriptedPolicy
from bit_duel.core.actions import Action
from bit_duel.core.constants import MAX_HP, MAX_STAMINA, PARRY_WINDOW_FRAMES
from bit_duel.core.fighter import FighterState
from bit_duel.core.match import Match
from bit_duel.env.gym_env import BitDuelEnv


def test_reset_and_obs_shape():
    m = Match()
    o0, o1 = m.reset()
    assert o0.shape == o1.shape
    assert o0.dtype == np.float32
    assert m.OBS_SIZE == o0.shape[0]


def test_idle_does_not_crash():
    m = Match()
    m.reset()
    for _ in range(30):
        m.step(Action.IDLE, Action.IDLE)
    assert not m.done
    assert m.fighters[0].hp == MAX_HP


def test_light_attack_can_damage():
    m = Match()
    m.reset()
    m.fighters[0].x = 400
    m.fighters[1].x = 440
    m.fighters[0].facing = 1
    m.fighters[1].facing = -1

    for _ in range(20):
        m.step(Action.LIGHT, Action.IDLE)
        if m.fighters[1].hp < MAX_HP:
            break
    assert m.fighters[1].hp < MAX_HP


def test_block_reduces_damage():
    """Holding block (past parry window) takes chip only."""
    m = Match()
    m.reset()
    m.fighters[0].x = 400
    m.fighters[1].x = 445
    m.fighters[0].stamina = MAX_STAMINA
    m.fighters[1].stamina = MAX_STAMINA

    # Warm up defender's block past the parry window so we get a normal shield
    for _ in range(PARRY_WINDOW_FRAMES + 2):
        m.step(Action.IDLE, Action.BLOCK)

    hp_before = m.fighters[1].hp
    # Attacker lights while defender keeps blocking
    for _ in range(25):
        m.step(Action.LIGHT, Action.BLOCK)
        if m.fighters[1].hp < hp_before:
            break

    assert m.fighters[1].hp < hp_before  # some chip
    assert m.fighters[1].hp > MAX_HP - 30  # not full light damage spam


def test_block_requires_facing():
    """Facing away should not block."""
    m = Match()
    m.reset()
    m.fighters[0].x = 400
    m.fighters[1].x = 445
    # Force defender facing wrong way after face_each_other by placing and
    # immediately blocking while we override facing each step via side effects.
    # Simpler: put defender to the right, attacker left, defender faces right (away).
    m.fighters[0].x = 400
    m.fighters[1].x = 450

    # Hold block past parry window
    for _ in range(PARRY_WINDOW_FRAMES + 2):
        m.step(Action.IDLE, Action.BLOCK)

    # Manually flip defender facing away after auto-face in step is hard;
    # instead attack from same side by swapping positions mid-match:
    # Walk: use take_hit API directly for this unit case.
    d = m.fighters[1]
    d.state = FighterState.BLOCK
    d.block_hold_frames = PARRY_WINDOW_FRAMES + 5
    d.facing = 1  # attacker will be at lower x → should face -1 to block
    d.on_ground = True
    dealt, result = d.take_hit(
        damage=18.0,
        hitstun=20,
        knockback=5.0,
        direction=-1,
        attacker_x=400.0,
        chip=3.0,
        block_stamina_cost=10.0,
        attack_blockstun=10,
    )
    assert result == "hit"
    assert dealt == 18.0


def test_parry_on_fresh_block():
    m = Match()
    m.reset()
    m.fighters[0].x = 400
    m.fighters[1].x = 445

    from bit_duel.core.fighter import LIGHT_ATK
    from bit_duel.core.constants import PARRY_COUNTER_DAMAGE

    atk = m.fighters[0]
    dfd = m.fighters[1]
    atk.state = FighterState.LIGHT
    atk.attack_def = LIGHT_ATK
    atk.attack_timer = LIGHT_ATK.startup
    atk.hit_connected = False
    atk.facing = 1
    atk.hp = MAX_HP
    dfd.state = FighterState.BLOCK
    dfd.block_hold_frames = 1  # inside parry window
    dfd.facing = -1
    dfd.on_ground = True
    dfd.stamina = MAX_STAMINA

    dealt, result = dfd.take_hit(
        damage=LIGHT_ATK.damage,
        hitstun=LIGHT_ATK.hitstun,
        knockback=LIGHT_ATK.knockback,
        direction=1,
        attacker_x=atk.x,
        chip=LIGHT_ATK.chip,
        block_stamina_cost=12.0,
        attack_blockstun=LIGHT_ATK.blockstun,
    )
    assert result == "parry"
    assert dealt == 0.0
    assert dfd.state == FighterState.PARRY

    # Counter-damage + stun on attacker
    counter = atk.apply_parry_punish(direction=-1, is_heavy=False)
    assert counter == PARRY_COUNTER_DAMAGE
    assert atk.hp == MAX_HP - PARRY_COUNTER_DAMAGE
    assert atk.state == FighterState.HITSTUN


def test_parry_whiff_on_early_release():
    """Tap shield without a hit → recovery (fully open)."""
    m = Match()
    m.reset()
    # Hold block for a few frames inside parry window, then release
    for _ in range(4):
        m.step(Action.BLOCK, Action.IDLE)
    assert m.fighters[0].state == FighterState.BLOCK
    assert m.fighters[0].block_hold_frames <= PARRY_WINDOW_FRAMES

    m.step(Action.IDLE, Action.IDLE)
    assert m.fighters[0].state == FighterState.PARRY_WHIFF
    assert m.fighters[0].state_timer > 0


def test_hold_block_past_window_no_whiff():
    """Hold shield past parry window then release = safe, no whiff."""
    m = Match()
    m.reset()
    for _ in range(PARRY_WINDOW_FRAMES + 5):
        m.step(Action.BLOCK, Action.IDLE)
    m.step(Action.IDLE, Action.IDLE)
    assert m.fighters[0].state == FighterState.IDLE


def test_walk_drains_stamina():
    m = Match()
    m.reset()
    start = m.fighters[0].stamina
    for _ in range(30):
        m.step(Action.RIGHT, Action.IDLE)
    assert m.fighters[0].stamina < start
    # Exhausted: cannot keep walking speed
    m.fighters[0].stamina = 0.0
    x_before = m.fighters[0].x
    m.step(Action.RIGHT, Action.IDLE)
    assert m.fighters[0].x == x_before


def test_stamina_blocks_spam():
    m = Match()
    m.reset()
    m.fighters[0].x = 300
    # Drain stamina with lights
    swings = 0
    for _ in range(40):
        stam_before = m.fighters[0].stamina
        m.step(Action.LIGHT, Action.IDLE)
        if m.fighters[0].state == FighterState.LIGHT and stam_before > m.fighters[0].stamina:
            swings += 1
        # Wait out recovery
        for _ in range(20):
            if m.fighters[0].state not in (FighterState.LIGHT, FighterState.HEAVY):
                break
            m.step(Action.IDLE, Action.IDLE)
    # Should not be able to swing forever without regen pauses
    assert m.fighters[0].stamina < MAX_STAMINA
    assert swings >= 3
    # With empty stamina, light should not start
    m.fighters[0].stamina = 0.0
    m.fighters[0].state = FighterState.IDLE
    m.fighters[0].attack_def = None
    m.step(Action.LIGHT, Action.IDLE)
    assert m.fighters[0].state != FighterState.LIGHT


def test_guard_break_on_empty_stamina_block():
    m = Match()
    m.reset()
    d = m.fighters[1]
    d.x = 445
    m.fighters[0].x = 400
    d.state = FighterState.BLOCK
    d.block_hold_frames = PARRY_WINDOW_FRAMES + 3
    d.facing = -1
    d.on_ground = True
    d.stamina = 5.0  # less than block hit cost

    dealt, result = d.take_hit(
        damage=18.0,
        hitstun=20,
        knockback=8.0,
        direction=1,
        attacker_x=400.0,
        chip=3.0,
        block_stamina_cost=22.0,
        attack_blockstun=12,
    )
    assert result == "guard_break"
    assert dealt == 18.0
    assert d.state == FighterState.GUARD_BREAK


def test_scripted_match_terminates():
    m = Match(max_frames=60 * 30)
    m.reset()
    a0 = AggressiveAI(seed=1)
    a1 = TurtleAI(seed=2)
    while not m.done:
        m.step(a0.act(m, 0), a1.act(m, 1), record=True)
    assert m.result is not None
    assert len(m.logs) == m.frame


def test_gym_env_episode():
    env = BitDuelEnv(opponent=ScriptedPolicy(AggressiveAI(seed=0)), max_frames=120)
    obs, info = env.reset(seed=0)
    assert env.observation_space.contains(obs)
    done = False
    steps = 0
    while not done and steps < 200:
        obs, reward, term, trunc, info = env.step(env.action_space.sample())
        done = term or trunc
        steps += 1
    assert steps > 0
