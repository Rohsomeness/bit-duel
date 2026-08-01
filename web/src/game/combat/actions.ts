export enum Action {
  IDLE = 0,
  LEFT = 1,
  RIGHT = 2,
  JUMP = 3,
  LIGHT = 4,
  HEAVY = 5,
  BLOCK = 6,
  /** Weapon special (I / U) */
  SPECIAL = 7,
}

export const NUM_ACTIONS = 8;

export const ACTION_NAMES: Record<Action, string> = {
  [Action.IDLE]: "idle",
  [Action.LEFT]: "left",
  [Action.RIGHT]: "right",
  [Action.JUMP]: "jump",
  [Action.LIGHT]: "light",
  [Action.HEAVY]: "heavy",
  [Action.BLOCK]: "block",
  [Action.SPECIAL]: "special",
};
