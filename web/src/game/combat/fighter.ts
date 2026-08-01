import { Action } from "./actions";
import * as C from "./constants";
import type { AttackDef } from "./constants";
import type { CharacterDef } from "../data/characters";

export enum FighterState {
  IDLE = 0,
  WALK = 1,
  JUMP = 2,
  LIGHT = 3,
  HEAVY = 4,
  BLOCK = 5,
  HITSTUN = 6,
  KO = 7,
  BLOCKSTUN = 8,
  GUARD_BREAK = 9,
  PARRY = 10,
  PARRY_WHIFF = 11,
}

export type Rect = { left: number; top: number; right: number; bottom: number };

function scaleAtk(base: AttackDef, char: CharacterDef): AttackDef {
  return {
    ...base,
    damage: base.damage * char.stats.damage,
    chip: base.chip * char.stats.damage,
    staminaCost: base.staminaCost * char.stats.staminaCost,
    knockback: base.knockback * char.stats.knockback,
  };
}

export class Fighter {
  index: number;
  characterId: string;
  x: number;
  y = C.GROUND_Y;
  vx = 0;
  vy = 0;
  facing = 1;
  hp = C.MAX_HP;
  maxHp = C.MAX_HP;
  stamina = C.MAX_STAMINA;
  maxStamina = C.MAX_STAMINA;
  state: FighterState = FighterState.IDLE;
  stateTimer = 0;
  attackTimer = 0;
  attackDef: AttackDef | null = null;
  hitConnected = false;
  onGround = true;
  lastAction: Action = Action.IDLE;
  blockHoldFrames = 0;
  staminaRegenCd = 0;
  justParried = false;
  justGuardBroke = false;
  justParryWhiffed = false;
  parryConnected = false;
  lastParryDamageTaken = 0;

  // character-scaled kits
  private light: AttackDef;
  private heavy: AttackDef;
  private walkSpeed: number;
  private jumpVel: number;

  constructor(index: number, x: number, facing: number, character: CharacterDef) {
    this.index = index;
    this.characterId = character.id;
    this.x = x;
    this.facing = facing;
    this.maxHp = C.MAX_HP * character.stats.hp;
    this.hp = this.maxHp;
    this.maxStamina = C.MAX_STAMINA * character.stats.stamina;
    this.stamina = this.maxStamina;
    this.light = scaleAtk(C.LIGHT, character);
    this.heavy = scaleAtk(C.HEAVY, character);
    this.walkSpeed = C.WALK_SPEED * character.stats.speed;
    this.jumpVel = C.JUMP_VELOCITY * character.stats.jump;
  }

  get alive() {
    return this.hp > 0 && this.state !== FighterState.KO;
  }

  get locked() {
    return (
      this.state === FighterState.LIGHT ||
      this.state === FighterState.HEAVY ||
      this.state === FighterState.HITSTUN ||
      this.state === FighterState.BLOCKSTUN ||
      this.state === FighterState.GUARD_BREAK ||
      this.state === FighterState.PARRY ||
      this.state === FighterState.PARRY_WHIFF ||
      this.state === FighterState.KO
    );
  }

  get isAttacking() {
    return this.state === FighterState.LIGHT || this.state === FighterState.HEAVY;
  }

  get isShielding() {
    return this.state === FighterState.BLOCK && this.onGround;
  }

  get inParryWindow() {
    return (
      this.isShielding &&
      this.blockHoldFrames > 0 &&
      this.blockHoldFrames <= C.PARRY_WINDOW_FRAMES
    );
  }

  get attackActive() {
    if (!this.isAttacking || !this.attackDef) return false;
    const ad = this.attackDef;
    return this.attackTimer >= ad.startup && this.attackTimer < ad.startup + ad.active;
  }

  bodyRect(): Rect {
    const half = C.FIGHTER_WIDTH * 0.5;
    return {
      left: this.x - half,
      top: this.y - C.FIGHTER_HEIGHT,
      right: this.x + half,
      bottom: this.y,
    };
  }

  shieldRect(): Rect | null {
    if (!this.isShielding && this.state !== FighterState.BLOCKSTUN) return null;
    const halfH = C.FIGHTER_HEIGHT * 0.55;
    const cx = this.x + this.facing * (C.FIGHTER_WIDTH * 0.55);
    const top = this.y - C.FIGHTER_HEIGHT * 0.85;
    const w = 14;
    return this.facing >= 0
      ? { left: cx, top, right: cx + w, bottom: top + halfH }
      : { left: cx - w, top, right: cx, bottom: top + halfH };
  }

  hitboxRect(): Rect | null {
    if (!this.attackActive || !this.attackDef) return null;
    const ad = this.attackDef;
    const left = this.facing >= 0 ? this.x : this.x - ad.range;
    const right = this.facing >= 0 ? this.x + ad.range : this.x;
    const top = this.y + ad.hitboxYOffset - ad.hitboxH * 0.5;
    return { left, top, right, bottom: top + ad.hitboxH };
  }

  canAfford(cost: number) {
    return this.stamina >= cost;
  }

  spendStamina(amount: number) {
    this.stamina = Math.max(0, this.stamina - amount);
    this.staminaRegenCd = C.STAMINA_REGEN_DELAY;
  }

  applyAction(action: Action) {
    this.lastAction = action;
    this.justParried = false;
    this.justGuardBroke = false;
    this.justParryWhiffed = false;

    if (this.state === FighterState.KO) return;
    if (
      this.state === FighterState.HITSTUN ||
      this.state === FighterState.BLOCKSTUN ||
      this.state === FighterState.GUARD_BREAK ||
      this.state === FighterState.PARRY ||
      this.state === FighterState.PARRY_WHIFF
    ) {
      return;
    }
    if (this.isAttacking) return;

    if (action === Action.BLOCK && this.onGround && this.stamina > 0) {
      if (this.state !== FighterState.BLOCK) {
        this.blockHoldFrames = 0;
        this.parryConnected = false;
      }
      this.state = FighterState.BLOCK;
      this.blockHoldFrames += 1;
      this.vx = 0;
      this.spendStamina(C.BLOCK_HOLD_DRAIN);
      if (this.stamina <= 0) {
        this.stamina = 0;
        this.releaseBlock(true);
      }
      return;
    }

    if (this.state === FighterState.BLOCK) {
      this.releaseBlock(true);
      // releaseBlock may enter PARRY_WHIFF recovery
      if (this.locked) return;
    }

    if (action === Action.LIGHT && this.onGround) {
      if (this.canAfford(this.light.staminaCost)) {
        this.spendStamina(this.light.staminaCost);
        this.startAttack(this.light, FighterState.LIGHT);
      }
      return;
    }

    if (action === Action.HEAVY && this.onGround) {
      if (this.canAfford(this.heavy.staminaCost)) {
        this.spendStamina(this.heavy.staminaCost);
        this.startAttack(this.heavy, FighterState.HEAVY);
      }
      return;
    }

    if (action === Action.JUMP && this.onGround) {
      if (this.canAfford(C.JUMP_STAMINA_COST)) {
        this.spendStamina(C.JUMP_STAMINA_COST);
        this.vy = this.jumpVel;
        this.onGround = false;
        this.state = FighterState.JUMP;
      }
      return;
    }

    const moving = action === Action.LEFT || action === Action.RIGHT;
    if (moving) {
      const drain = this.onGround
        ? C.WALK_STAMINA_PER_FRAME
        : C.AIR_MOVE_STAMINA_PER_FRAME;
      if (this.stamina < C.MOVE_MIN_STAMINA) {
        if (this.onGround) {
          this.vx = 0;
          this.state = FighterState.IDLE;
        }
        return;
      }
      this.spendStamina(drain);
      const speed = this.onGround ? this.walkSpeed : this.walkSpeed * C.AIR_CONTROL;
      this.vx = action === Action.LEFT ? -speed : speed;
      if (this.onGround) this.state = FighterState.WALK;
      return;
    }

    if (this.onGround) {
      this.vx = 0;
      this.state = FighterState.IDLE;
    }
  }

  private releaseBlock(whiffCheck: boolean) {
    const held = this.blockHoldFrames;
    this.blockHoldFrames = 0;
    if (
      whiffCheck &&
      !this.parryConnected &&
      held > 0 &&
      held <= C.PARRY_WINDOW_FRAMES
    ) {
      this.justParryWhiffed = true;
      this.state = FighterState.PARRY_WHIFF;
      this.stateTimer = C.PARRY_WHIFF_RECOVERY;
      this.spendStamina(C.PARRY_WHIFF_STAMINA_COST);
      this.vx = 0;
    } else {
      this.state = FighterState.IDLE;
    }
    this.parryConnected = false;
  }

  private startAttack(attack: AttackDef, state: FighterState) {
    this.state = state;
    this.attackDef = attack;
    this.attackTimer = 0;
    this.hitConnected = false;
    this.vx = 0;
    this.blockHoldFrames = 0;
  }

  tickTimersAndPhysics() {
    this.regenStamina();

    if (this.state === FighterState.KO) {
      this.vx *= 0.9;
      this.integrate();
      return;
    }

    if (
      this.state === FighterState.HITSTUN ||
      this.state === FighterState.BLOCKSTUN ||
      this.state === FighterState.GUARD_BREAK ||
      this.state === FighterState.PARRY ||
      this.state === FighterState.PARRY_WHIFF
    ) {
      this.stateTimer -= 1;
      this.vx *= 0.85;
      if (this.stateTimer <= 0) {
        this.state = this.onGround ? FighterState.IDLE : FighterState.JUMP;
        this.vx = 0;
        this.blockHoldFrames = 0;
      }
      this.integrate();
      return;
    }

    if (this.isAttacking && this.attackDef) {
      this.attackTimer += 1;
      const total =
        this.attackDef.startup + this.attackDef.active + this.attackDef.recovery;
      if (this.attackTimer >= total) {
        this.state = this.onGround ? FighterState.IDLE : FighterState.JUMP;
        this.attackDef = null;
        this.attackTimer = 0;
        this.hitConnected = false;
      }
      this.integrate();
      return;
    }

    if (this.state === FighterState.BLOCK) this.vx = 0;
    this.integrate();
    if (this.onGround && this.state === FighterState.JUMP) this.state = FighterState.IDLE;
  }

  private regenStamina() {
    if (this.staminaRegenCd > 0) {
      this.staminaRegenCd -= 1;
      return;
    }
    if (
      this.state === FighterState.LIGHT ||
      this.state === FighterState.HEAVY ||
      this.state === FighterState.BLOCK ||
      this.state === FighterState.BLOCKSTUN ||
      this.state === FighterState.GUARD_BREAK ||
      this.state === FighterState.PARRY_WHIFF ||
      this.state === FighterState.WALK ||
      this.state === FighterState.KO
    ) {
      return;
    }
    this.stamina = Math.min(this.maxStamina, this.stamina + C.STAMINA_REGEN_PER_FRAME);
  }

  private integrate() {
    if (!this.onGround || this.vy < 0) {
      this.vy = Math.min(this.vy + C.GRAVITY, C.MAX_FALL_SPEED);
    }
    this.x += this.vx;
    this.y += this.vy;
    this.x = Math.max(C.WALL_MARGIN, Math.min(C.STAGE_WIDTH - C.WALL_MARGIN, this.x));
    if (this.y >= C.GROUND_Y) {
      this.y = C.GROUND_Y;
      this.vy = 0;
      this.onGround = true;
    } else {
      this.onGround = false;
    }
  }

  facingAttacker(attackerX: number) {
    return attackerX >= this.x ? this.facing > 0 : this.facing < 0;
  }

  takeHit(opts: {
    damage: number;
    hitstun: number;
    knockback: number;
    direction: number;
    attackerX: number;
    chip: number;
    blockStaminaCost: number;
    attackBlockstun: number;
  }): { dealt: number; result: string } {
    if (this.state === FighterState.KO) return { dealt: 0, result: "none" };
    if (this.state === FighterState.PARRY) return { dealt: 0, result: "none" };

    const canDefend =
      this.state === FighterState.BLOCK &&
      this.onGround &&
      this.facingAttacker(opts.attackerX) &&
      this.stamina > 0;

    if (canDefend && this.inParryWindow) {
      this.justParried = true;
      this.parryConnected = true;
      this.state = FighterState.PARRY;
      this.stateTimer = C.PARRY_FLASH_FRAMES;
      this.blockHoldFrames = 0;
      this.attackDef = null;
      this.attackTimer = 0;
      this.stamina = Math.min(this.maxStamina, this.stamina + C.PARRY_STAMINA_REFUND);
      this.vx = 0;
      return { dealt: 0, result: "parry" };
    }

    if (canDefend) {
      this.spendStamina(opts.blockStaminaCost);
      if (this.stamina <= 0) {
        this.stamina = 0;
        this.justGuardBroke = true;
        const dealt = opts.damage;
        this.hp = Math.max(0, this.hp - dealt);
        this.blockHoldFrames = 0;
        this.attackDef = null;
        this.attackTimer = 0;
        if (this.hp <= 0) {
          this.ko();
          this.vx = opts.direction * opts.knockback;
          return { dealt, result: "guard_break" };
        }
        this.state = FighterState.GUARD_BREAK;
        this.stateTimer = C.GUARD_BREAK_STUN;
        this.vx = opts.direction * opts.knockback * 1.1;
        return { dealt, result: "guard_break" };
      }
      const dealt = opts.chip;
      this.hp = Math.max(0, this.hp - dealt);
      this.state = FighterState.BLOCKSTUN;
      this.stateTimer = opts.attackBlockstun;
      this.blockHoldFrames = 0;
      this.vx = opts.direction * opts.knockback * C.BLOCK_PUSHBACK_SCALE;
      if (this.hp <= 0) this.ko();
      return { dealt, result: "block" };
    }

    const dealt = opts.damage;
    this.hp = Math.max(0, this.hp - dealt);
    this.blockHoldFrames = 0;
    this.attackDef = null;
    this.attackTimer = 0;
    if (this.hp <= 0) {
      this.ko();
      this.vx = opts.direction * opts.knockback;
      return { dealt, result: "hit" };
    }
    this.state = FighterState.HITSTUN;
    this.stateTimer = opts.hitstun;
    this.vx = opts.direction * opts.knockback;
    return { dealt, result: "hit" };
  }

  applyParryPunish(direction: number, isHeavy: boolean): number {
    if (this.state === FighterState.KO) return 0;
    const dmg =
      C.PARRY_COUNTER_DAMAGE + (isHeavy ? C.PARRY_COUNTER_HEAVY_BONUS : 0);
    this.hp = Math.max(0, this.hp - dmg);
    this.attackDef = null;
    this.attackTimer = 0;
    this.hitConnected = true;
    this.blockHoldFrames = 0;
    this.vx = direction * C.PARRY_COUNTER_KNOCKBACK;
    this.lastParryDamageTaken = dmg;
    if (this.hp <= 0) {
      this.ko();
      return dmg;
    }
    this.state = FighterState.HITSTUN;
    this.stateTimer = C.PARRY_STUN_ATTACKER;
    return dmg;
  }

  private ko() {
    this.hp = 0;
    this.state = FighterState.KO;
    this.stateTimer = 0;
    this.attackDef = null;
    this.blockHoldFrames = 0;
    this.parryConnected = false;
  }
}

export function rectsOverlap(a: Rect, b: Rect) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}
