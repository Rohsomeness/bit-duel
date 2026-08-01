import { Action } from "./actions";
import * as C from "./constants";
import type { Match } from "./match";
import type { OpponentKind } from "../data/characters";
import { weaponThreatRange } from "../data/weapons";

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
      if (me.locked && !me.inLightRecoveryCancel) return Action.IDLE;

      // Chain light2 when available
      if (me.inLightRecoveryCancel && rand() < 0.65) return Action.LIGHT;

      const dist = opp.x - me.x;
      const abs = Math.abs(dist);
      const toward = dist > 0 ? Action.RIGHT : Action.LEFT;
      const away = dist > 0 ? Action.LEFT : Action.RIGHT;
      const threat = weaponThreatRange(me.weapon) * 0.92;
      const myLight = me.weapon.light.range;
      const canLight = me.stamina >= me.weapon.light.staminaCost * 0.85;
      const canHeavy = me.stamina >= me.weapon.heavy.staminaCost * 0.85;
      const canSpecial = me.stamina >= me.weapon.special.staminaCost * 0.85;
      const canBlock = me.stamina > 5 && me.onGround;

      if (kind === "aggressive") {
        if (opp.isAttacking && abs < threat * 0.9 && canBlock && rand() < 0.5)
          return Action.BLOCK;
        if (me.stamina < me.weapon.light.staminaCost) {
          if (abs < 80 && canBlock && opp.isAttacking) return Action.BLOCK;
          return abs < 100 ? away : Action.IDLE;
        }
        if (abs > threat * 1.05) {
          if (rand() < 0.06 && me.onGround && me.stamina >= C.JUMP_STAMINA_COST)
            return Action.JUMP;
          return toward;
        }
        if (abs > myLight * 0.85) return toward;
        const r = rand();
        if (r < 0.4 && canLight) return Action.LIGHT;
        if (r < 0.55 && canHeavy) return Action.HEAVY;
        if (r < 0.68 && canSpecial) return Action.SPECIAL;
        if (r < 0.8 && canBlock) return Action.BLOCK;
        return toward;
      }

      if (kind === "turtle") {
        if (opp.isAttacking && abs < threat && canBlock) return Action.BLOCK;
        if (me.stamina < 28) return abs > threat * 0.8 ? Action.IDLE : toward;
        if (abs > threat * 1.15) return toward;
        if (abs < myLight * 0.9 && !opp.isAttacking) {
          if (rand() < 0.35 && canHeavy) return Action.HEAVY;
          if (rand() < 0.45 && canSpecial) return Action.SPECIAL;
          if (rand() < 0.55 && canLight) return Action.LIGHT;
        }
        if (rand() < 0.55 && canBlock) return Action.BLOCK;
        return toward;
      }

      // jumpy
      if (me.onGround && rand() < 0.1 && me.stamina >= C.JUMP_STAMINA_COST)
        return Action.JUMP;
      if (!me.onGround) return toward;
      if (abs < threat * 0.85) {
        if (rand() < 0.55 && canLight) return Action.LIGHT;
        if (rand() < 0.35 && canSpecial) return Action.SPECIAL;
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
  special: boolean;
}): Action {
  if (keys.block) return Action.BLOCK;
  if (keys.special) return Action.SPECIAL;
  if (keys.light) return Action.LIGHT;
  if (keys.heavy) return Action.HEAVY;
  if (keys.jump) return Action.JUMP;
  if (keys.left && !keys.right) return Action.LEFT;
  if (keys.right && !keys.left) return Action.RIGHT;
  return Action.IDLE;
}
