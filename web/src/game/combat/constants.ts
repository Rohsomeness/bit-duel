/** Combat rules — keep roughly aligned with Python bit_duel.core.constants */

export const STAGE_WIDTH = 800;
export const STAGE_HEIGHT = 450;
export const GROUND_Y = 360;
export const WALL_MARGIN = 28;

export const FIGHTER_WIDTH = 40;
export const FIGHTER_HEIGHT = 72;
export const MAX_HP = 100;

export const WALK_SPEED = 3.2;
export const JUMP_VELOCITY = -11.5;
export const GRAVITY = 0.55;
export const MAX_FALL_SPEED = 14;
export const AIR_CONTROL = 0.55;
export const WALK_STAMINA_PER_FRAME = 0.28;
export const AIR_MOVE_STAMINA_PER_FRAME = 0.12;
export const MOVE_MIN_STAMINA = 0.5;

export const LIGHT = {
  startup: 4,
  active: 3,
  recovery: 8,
  damage: 8,
  chip: 1.5,
  hitstun: 12,
  blockstun: 8,
  knockback: 4.5,
  range: 52,
  hitboxH: 36,
  hitboxYOffset: -40,
  staminaCost: 14,
  isHeavy: false,
} as const;

export const HEAVY = {
  startup: 10,
  active: 4,
  recovery: 16,
  damage: 18,
  chip: 3,
  hitstun: 20,
  blockstun: 12,
  knockback: 9,
  range: 62,
  hitboxH: 42,
  hitboxYOffset: -38,
  staminaCost: 28,
  isHeavy: true,
} as const;

export type AttackDef = {
  startup: number;
  active: number;
  recovery: number;
  damage: number;
  chip: number;
  hitstun: number;
  blockstun: number;
  knockback: number;
  range: number;
  hitboxH: number;
  hitboxYOffset: number;
  staminaCost: number;
  isHeavy: boolean;
};

export const MAX_STAMINA = 100;
export const STAMINA_REGEN_PER_FRAME = 0.55;
export const STAMINA_REGEN_DELAY = 18;
export const BLOCK_HOLD_DRAIN = 0.35;
export const BLOCK_HIT_STAMINA_LIGHT = 12;
export const BLOCK_HIT_STAMINA_HEAVY = 22;
export const GUARD_BREAK_STUN = 28;
export const JUMP_STAMINA_COST = 8;

export const PARRY_WINDOW_FRAMES = 8;
export const PARRY_STUN_ATTACKER = 28;
export const PARRY_STAMINA_REFUND = 10;
export const PARRY_FLASH_FRAMES = 14;
export const PARRY_COUNTER_DAMAGE = 12;
export const PARRY_COUNTER_HEAVY_BONUS = 6;
export const PARRY_COUNTER_KNOCKBACK = 6.5;
export const PARRY_WHIFF_RECOVERY = 22;
export const PARRY_WHIFF_STAMINA_COST = 16;
export const BLOCK_PUSHBACK_SCALE = 0.4;

export const FPS = 60;
export const MAX_FRAMES = FPS * 60;
