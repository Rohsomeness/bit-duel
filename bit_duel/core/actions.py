"""Discrete action space shared by player, scripted AI, and RL agents."""

from __future__ import annotations

from enum import IntEnum


class Action(IntEnum):
    IDLE = 0
    LEFT = 1
    RIGHT = 2
    JUMP = 3
    LIGHT = 4
    HEAVY = 5
    BLOCK = 6


ACTION_NAMES = {
    Action.IDLE: "idle",
    Action.LEFT: "left",
    Action.RIGHT: "right",
    Action.JUMP: "jump",
    Action.LIGHT: "light",
    Action.HEAVY: "heavy",
    Action.BLOCK: "block",
}

NUM_ACTIONS = len(Action)
