import { Action } from "./actions";
import * as C from "./constants";
import { Fighter, rectsOverlap } from "./fighter";
import type { CharacterDef } from "../data/characters";
import type { WeaponDef } from "../data/weapons";

export type MatchResult = {
  winner: number | null;
  frames: number;
  reason: string;
};

export class Match {
  fighters: [Fighter, Fighter];
  frame = 0;
  done = false;
  result: MatchResult | null = null;
  maxFrames: number;
  lastEvents: string[] = [];

  constructor(
    p0: CharacterDef,
    w0: WeaponDef,
    p1: CharacterDef,
    w1: WeaponDef,
    maxFrames = C.MAX_FRAMES
  ) {
    this.maxFrames = maxFrames;
    this.fighters = [
      new Fighter(0, C.STAGE_WIDTH * 0.28, 1, p0, w0),
      new Fighter(1, C.STAGE_WIDTH * 0.72, -1, p1, w1),
    ];
    this.faceEachOther();
  }

  faceEachOther() {
    const [a, b] = this.fighters;
    if (a.x <= b.x) {
      a.facing = 1;
      b.facing = -1;
    } else {
      a.facing = -1;
      b.facing = 1;
    }
  }

  step(a0: Action, a1: Action) {
    if (this.done) throw new Error("Match over");
    this.lastEvents = [];
    this.faceEachOther();
    const [f0, f1] = this.fighters;
    f0.lastParryDamageTaken = 0;
    f1.lastParryDamageTaken = 0;
    f0.applyAction(a0);
    f1.applyAction(a1);
    f0.tickTimersAndPhysics();
    f1.tickTimersAndPhysics();
    this.resolveBodyPush();
    this.tryHit(f1, f0);
    this.tryHit(f0, f1);
    if (f0.justParryWhiffed) this.lastEvents.push("parry_whiff_p0");
    if (f1.justParryWhiffed) this.lastEvents.push("parry_whiff_p1");
    this.frame += 1;
    this.checkEnd();
    return {
      done: this.done,
      events: this.lastEvents,
      result: this.result,
    };
  }

  private resolveBodyPush() {
    const [a, b] = this.fighters;
    if (!rectsOverlap(a.bodyRect(), b.bodyRect())) return;
    const mid = (a.x + b.x) * 0.5;
    // Slightly tighter so short weapons can still trade in the clinch
    const gap = C.FIGHTER_WIDTH * 0.48;
    if (a.x <= b.x) {
      a.x = mid - gap;
      b.x = mid + gap;
    } else {
      b.x = mid - gap;
      a.x = mid + gap;
    }
    a.x = Math.max(C.WALL_MARGIN, Math.min(C.STAGE_WIDTH - C.WALL_MARGIN, a.x));
    b.x = Math.max(C.WALL_MARGIN, Math.min(C.STAGE_WIDTH - C.WALL_MARGIN, b.x));
  }

  private tryHit(attacker: Fighter, defender: Fighter) {
    if (!attacker.attackActive || attacker.hitConnected) return;
    const hb = attacker.hitboxRect();
    if (!hb || !rectsOverlap(hb, defender.bodyRect())) return;
    attacker.hitConnected = true;
    const ad = attacker.attackMove!;
    const direction = attacker.x <= defender.x ? 1 : -1;
    const heavy = attacker.attackIsHeavy;
    const stamCost = heavy ? C.BLOCK_HIT_STAMINA_HEAVY : C.BLOCK_HIT_STAMINA_LIGHT;
    const hpBefore = defender.hp;
    const { result, dealt } = defender.takeHit({
      damage: ad.damage,
      hitstun: ad.hitstun,
      knockback: ad.knockback,
      direction,
      attackerX: attacker.x,
      chip: ad.chip,
      blockStaminaCost: stamCost,
      attackBlockstun: ad.blockstun,
    });
    if (result === "parry") {
      attacker.applyParryPunish(-direction, heavy);
      this.lastEvents.push(`parry_p${defender.index}`);
    } else if (result !== "none") {
      this.lastEvents.push(`${result}_p${defender.index}`);
      if (dealt > 0) {
        this.lastEvents.push(
          `dmg_p${defender.index}:${dealt.toFixed(0)}:${hpBefore - defender.hp > 0 ? "1" : "0"}`
        );
      }
    }
  }

  private checkEnd() {
    const [f0, f1] = this.fighters;
    if (!f0.alive && !f1.alive) {
      this.done = true;
      this.result = { winner: null, frames: this.frame, reason: "double_ko" };
    } else if (!f0.alive) {
      this.done = true;
      this.result = { winner: 1, frames: this.frame, reason: "ko" };
    } else if (!f1.alive) {
      this.done = true;
      this.result = { winner: 0, frames: this.frame, reason: "ko" };
    } else if (this.frame >= this.maxFrames) {
      this.done = true;
      let winner: number | null = null;
      if (f0.hp > f1.hp) winner = 0;
      else if (f1.hp > f0.hp) winner = 1;
      this.result = { winner, frames: this.frame, reason: "timeout" };
    }
  }
}
