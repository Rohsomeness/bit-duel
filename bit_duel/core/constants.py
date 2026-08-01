"""Tunable combat rules. Single source of truth for game + headless training."""

# Stage
STAGE_WIDTH = 800.0
STAGE_HEIGHT = 360.0
GROUND_Y = 300.0
WALL_MARGIN = 24.0

# Fighter body
FIGHTER_WIDTH = 40.0
FIGHTER_HEIGHT = 72.0
MAX_HP = 100.0

# Movement
WALK_SPEED = 3.2
JUMP_VELOCITY = -11.5
GRAVITY = 0.55
MAX_FALL_SPEED = 14.0
AIR_CONTROL = 0.55
WALK_STAMINA_PER_FRAME = 0.28  # continuous drain while walking
AIR_MOVE_STAMINA_PER_FRAME = 0.12  # lighter drain for air control
MOVE_MIN_STAMINA = 0.5  # can't start/continue walk below this

# Light attack (quick poke)
LIGHT_STARTUP = 4
LIGHT_ACTIVE = 3
LIGHT_RECOVERY = 8
LIGHT_DAMAGE = 8.0
LIGHT_CHIP = 1.5
LIGHT_HITSTUN = 12
LIGHT_BLOCKSTUN = 8
LIGHT_KNOCKBACK = 4.5
LIGHT_RANGE = 52.0
LIGHT_HITBOX_H = 36.0
LIGHT_HITBOX_Y_OFFSET = -40.0
LIGHT_STAMINA_COST = 14.0

# Heavy attack (slow punish)
HEAVY_STARTUP = 10
HEAVY_ACTIVE = 4
HEAVY_RECOVERY = 16
HEAVY_DAMAGE = 18.0
HEAVY_CHIP = 3.0
HEAVY_HITSTUN = 20
HEAVY_BLOCKSTUN = 12
HEAVY_KNOCKBACK = 9.0
HEAVY_RANGE = 62.0
HEAVY_HITBOX_H = 42.0
HEAVY_HITBOX_Y_OFFSET = -38.0
HEAVY_STAMINA_COST = 28.0

# Stamina
MAX_STAMINA = 100.0
STAMINA_REGEN_PER_FRAME = 0.55  # ~33/sec when free
STAMINA_REGEN_DELAY = 18  # frames after spend before regen
BLOCK_HOLD_DRAIN = 0.35  # per frame while holding shield
BLOCK_HIT_STAMINA_LIGHT = 12.0
BLOCK_HIT_STAMINA_HEAVY = 22.0
GUARD_BREAK_STUN = 28  # frames locked after stamina hits 0 on block
JUMP_STAMINA_COST = 8.0

# Block / shield
# Parry: first N frames of a fresh block press (facing attacker)
PARRY_WINDOW_FRAMES = 8
PARRY_STUN_ATTACKER = 28  # attacker recovery on successful parry
PARRY_STAMINA_REFUND = 10.0  # small refund on perfect parry
PARRY_FLASH_FRAMES = 14  # visual / state timer for "PARRY!" feel
PARRY_COUNTER_DAMAGE = 12.0  # base damage returned on successful parry
PARRY_COUNTER_HEAVY_BONUS = 6.0  # extra when parrying a heavy
PARRY_COUNTER_KNOCKBACK = 6.5
# Whiff: release shield during the parry window without connecting
PARRY_WHIFF_RECOVERY = 22  # locked + vulnerable frames
PARRY_WHIFF_STAMINA_COST = 16.0  # stamina tax for fishing parries
BLOCK_PUSHBACK_SCALE = 0.4  # knockback scale when shielding

# Match
FPS = 60
MAX_FRAMES = FPS * 60  # 60 second round
ROUND_WIN_HP = 0.0

# Observation
ACTION_HISTORY = 8
