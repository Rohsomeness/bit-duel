import type { CharacterDef, OpponentKind } from "./data/characters";
import type { WeaponDef } from "./data/weapons";

export type GameSelection = {
  player: CharacterDef;
  rival: CharacterDef;
  playerWeapon: WeaponDef;
  rivalWeapon: WeaponDef;
  opponentAI: OpponentKind;
};

export const REG = {
  selection: "selection",
} as const;
