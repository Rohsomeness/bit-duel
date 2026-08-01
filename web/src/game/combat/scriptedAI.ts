import { Action } from "./actions";
import * as C from "./constants";
import { FighterState } from "./fighter";
import type { Match } from "./match";
import type { OpponentKind } from "../data/characters";

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

export function makeAI(kind: OpponentKind, seed = 1) {
  const rand = rng(seed + kind.length * 17);

  return {
    name: kind,
    act(match: Match, meIdx: number): Action {
      const me = match.fighters[meIdx];
      const opp = match.fighters[1 - meIdx];
      if (me.locked) return Action.IDLE;

      const dist = opp.x - me.x;
      const abs = Math.abs(dist);
      const toward = dist > 0 ? Action.RIGHT : Action.LEFT;
      const away = dist > 0 ? Action.LEFT : Action.RIGHT;
      const canLight = me.stamina >= C.LIGHT.staminaCost * 0.9;
      const canHeavy = me.stamina >= C.HEAVY.staminaCost * 0.9;
      const canBlock = me.stamina > 5 && me.onGround;

      if (kind === "aggressive") {
        if (opp.isAttacking && abs < 90 && canBlock && rand() < 0.55) return Action.BLOCK;
        if (me.stamina < C.LIGHT.staminaCost) {
          if (abs < 80 && canBlock && opp.isAttacking) return Action.BLOCK;
          return abs < 100 ? away : Action.IDLE;
        }
        if (abs > 70) {
          if (rand() < 0.08 && me.onGround && me.stamina >= C.JUMP_STAMINA_COST)
            return Action.JUMP;
          return toward;
        }
        if (abs > 50) return rand() < 0.25 && canLight ? Action.LIGHT : toward;
        const r = rand();
        if (r < 0.45 && canLight) return Action.LIGHT;
        if (r < 0.6 && canHeavy) return Action.HEAVY;
        if (r < 0.75 && canBlock) return Action.BLOCK;
        if (r < 0.85) return away;
        return toward;
      }

      if (kind === "turtle") {
        if (opp.isAttacking && abs < 100 && canBlock) return Action.BLOCK;
        if (me.stamina < 25) return abs > 70 ? Action.IDLE : toward;
        if (abs > 120) return toward;
        if (abs < 55 && !opp.isAttacking) {
          if (rand() < 0.4 && canHeavy) return Action.HEAVY;
          if (rand() < 0.5 && canLight) return Action.LIGHT;
        }
        if (rand() < 0.55 && canBlock) return Action.BLOCK;
        return toward;
      }

      // jumpy
      if (me.onGround && rand() < 0.12 && me.stamina >= C.JUMP_STAMINA_COST)
        return Action.JUMP;
      if (!me.onGround) return toward;
      if (abs < 60) {
        if (rand() < 0.7 && canLight) return Action.LIGHT;
        if (canHeavy) return Action.HEAVY;
      }
      return toward;
    },
  };
}

export function readPlayerAction(keys: {
  left: boolean;
  right: boolean;
  jump: boolean;
  light: boolean;
  heavy: boolean;
  block: boolean;
}): Action {
  if (keys.block) return Action.BLOCK;
  if (keys.light) return Action.LIGHT;
  if (keys.heavy) return Action.HEAVY;
  if (keys.jump) return Action.JUMP;
  if (keys.left && !keys.right) return Action.LEFT;
  if (keys.right && !keys.left) return Action.RIGHT;
  return Action.IDLE;
}
