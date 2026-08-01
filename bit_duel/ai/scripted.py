"""Finite-state scripted opponents for the campaign ladder."""

from __future__ import annotations

import random
from abc import ABC, abstractmethod
from typing import TYPE_CHECKING

from bit_duel.core import constants as C
from bit_duel.core.actions import Action
from bit_duel.core.fighter import FighterState, HEAVY_ATK, LIGHT_ATK

if TYPE_CHECKING:
    from bit_duel.core.match import Match


class ScriptedAI(ABC):
    name: str = "scripted"

    @abstractmethod
    def act(self, match: "Match", me_idx: int) -> int:
        ...

    def _can_light(self, me) -> bool:
        return me.stamina >= LIGHT_ATK.stamina_cost

    def _can_heavy(self, me) -> bool:
        return me.stamina >= HEAVY_ATK.stamina_cost

    def _can_block(self, me) -> bool:
        return me.stamina > 5.0 and me.on_ground


class RandomAI(ScriptedAI):
    name = "random"

    def __init__(self, seed: int | None = None) -> None:
        self.rng = random.Random(seed)

    def act(self, match: "Match", me_idx: int) -> int:
        return self.rng.randrange(len(Action))


class AggressiveAI(ScriptedAI):
    """Rush down, light poke, occasional heavy."""

    name = "aggressive"

    def __init__(self, seed: int | None = None) -> None:
        self.rng = random.Random(seed)

    def act(self, match: "Match", me_idx: int) -> int:
        me = match.fighters[me_idx]
        opp = match.fighters[1 - me_idx]
        if me.locked:
            return int(Action.IDLE)

        dist = opp.x - me.x
        toward = Action.RIGHT if dist > 0 else Action.LEFT
        away = Action.LEFT if dist > 0 else Action.RIGHT
        abs_dist = abs(dist)

        # Try to parry/block incoming attacks when close
        if opp.is_attacking and abs_dist < 90 and self._can_block(me):
            if self.rng.random() < 0.6:
                return int(Action.BLOCK)

        # Low stamina: back off and wait
        if me.stamina < LIGHT_ATK.stamina_cost:
            if abs_dist < 80 and self._can_block(me) and opp.is_attacking:
                return int(Action.BLOCK)
            return int(away if abs_dist < 100 else Action.IDLE)

        if abs_dist > 70:
            if self.rng.random() < 0.08 and me.on_ground and me.stamina >= C.JUMP_STAMINA_COST:
                return int(Action.JUMP)
            return int(toward)

        if abs_dist > 50:
            if self.rng.random() < 0.25 and self._can_light(me):
                return int(Action.LIGHT)
            return int(toward)

        r = self.rng.random()
        if r < 0.45 and self._can_light(me):
            return int(Action.LIGHT)
        if r < 0.60 and self._can_heavy(me):
            return int(Action.HEAVY)
        if r < 0.75 and self._can_block(me):
            return int(Action.BLOCK)
        if r < 0.85:
            return int(away)
        return int(toward)


class TurtleAI(ScriptedAI):
    """Blocks a lot, punishes with heavy."""

    name = "turtle"

    def __init__(self, seed: int | None = None) -> None:
        self.rng = random.Random(seed)

    def act(self, match: "Match", me_idx: int) -> int:
        me = match.fighters[me_idx]
        opp = match.fighters[1 - me_idx]
        if me.locked:
            return int(Action.IDLE)

        dist = abs(opp.x - me.x)
        toward = Action.RIGHT if opp.x > me.x else Action.LEFT

        if opp.is_attacking and dist < 100 and self._can_block(me):
            return int(Action.BLOCK)

        if me.stamina < 25:
            return int(Action.IDLE if dist > 70 else toward)

        if dist > 120:
            return int(toward)

        if dist < 55 and not opp.is_attacking:
            if self.rng.random() < 0.4 and self._can_heavy(me):
                return int(Action.HEAVY)
            if self.rng.random() < 0.5 and self._can_light(me):
                return int(Action.LIGHT)

        if self.rng.random() < 0.55 and self._can_block(me):
            return int(Action.BLOCK)
        return int(toward)


class JumpyAI(ScriptedAI):
    """Jump-happy mixup bot."""

    name = "jumpy"

    def __init__(self, seed: int | None = None) -> None:
        self.rng = random.Random(seed)

    def act(self, match: "Match", me_idx: int) -> int:
        me = match.fighters[me_idx]
        opp = match.fighters[1 - me_idx]
        if me.locked:
            return int(Action.IDLE)

        dist = opp.x - me.x
        toward = Action.RIGHT if dist > 0 else Action.LEFT
        abs_dist = abs(dist)

        if me.on_ground and self.rng.random() < 0.12 and me.stamina >= C.JUMP_STAMINA_COST:
            return int(Action.JUMP)

        if not me.on_ground:
            return int(toward)

        if abs_dist < 60:
            if self.rng.random() < 0.7 and self._can_light(me):
                return int(Action.LIGHT)
            if self._can_heavy(me):
                return int(Action.HEAVY)

        return int(toward)


def make_scripted(name: str, seed: int | None = None) -> ScriptedAI:
    table = {
        "random": RandomAI,
        "aggressive": AggressiveAI,
        "turtle": TurtleAI,
        "jumpy": JumpyAI,
    }
    if name not in table:
        raise ValueError(f"Unknown AI '{name}'. Choose from {list(table)}")
    return table[name](seed=seed)
