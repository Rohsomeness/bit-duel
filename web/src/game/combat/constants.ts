/** Shared arena + resource rules (move data lives on weapons). */

export const STAGE_WIDTH = 800;
export const STAGE_HEIGHT = 450;
export const GROUND_Y = 360;
export const WALL_MARGIN = 28;

export const FIGHTER_WIDTH = 40;
export const FIGHTER_HEIGHT = 72;
export const MAX_HP = 100;

export const WALK_SPEED = 3.15;
export const JUMP_VELOCITY = -11.5;
export const GRAVITY = 0.55;
export const MAX_FALL_SPEED = 14;
export const AIR_CONTROL = 0.55;
export const WALK_STAMINA_PER_FRAME = 0.22;
export const AIR_MOVE_STAMINA_PER_FRAME = 0.1;
export const MOVE_MIN_STAMINA = 0.5;

export const MAX_STAMINA = 100;
export const STAMINA_REGEN_PER_FRAME = 0.62;
export const STAMINA_REGEN_DELAY = 14;
export const BLOCK_HOLD_DRAIN = 0.32;
export const BLOCK_HIT_STAMINA_LIGHT = 11;
export const BLOCK_HIT_STAMINA_HEAVY = 20;
export const GUARD_BREAK_STUN = 28;
export const JUMP_STAMINA_COST = 7;

export const PARRY_WINDOW_FRAMES = 8;
export const PARRY_STUN_ATTACKER = 28;
export const PARRY_STAMINA_REFUND = 10;
export const PARRY_FLASH_FRAMES = 12;
export const PARRY_COUNTER_DAMAGE = 11;
export const PARRY_COUNTER_HEAVY_BONUS = 5;
export const PARRY_COUNTER_KNOCKBACK = 6.5;
export const PARRY_WHIFF_RECOVERY = 20;
export const PARRY_WHIFF_STAMINA_COST = 14;
export const BLOCK_PUSHBACK_SCALE = 0.4;

/** Frames into recovery where light→light2 cancel is allowed */
export const LIGHT_CANCEL_WINDOW = 10;

export const FPS = 60;
export const MAX_FRAMES = FPS * 90;
/** Cap sim steps per render frame (anti spiral-of-death / lag) */
export const MAX_SIM_STEPS_PER_FRAME = 2;
