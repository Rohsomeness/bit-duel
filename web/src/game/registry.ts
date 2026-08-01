import type { CharacterDef, OpponentKind } from "./data/characters";

export type GameSelection = {
  player: CharacterDef;
  rival: CharacterDef;
  opponentAI: OpponentKind;
};

export const REG = {
  selection: "selection",
} as const;
