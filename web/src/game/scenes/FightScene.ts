import Phaser from "phaser";
import * as C from "../combat/constants";
import { FighterState } from "../combat/fighter";
import { Match } from "../combat/match";
import { makeAI, readPlayerAction } from "../combat/scriptedAI";
import { REG, type GameSelection } from "../registry";

export class FightScene extends Phaser.Scene {
  private match!: Match;
  private ai!: ReturnType<typeof makeAI>;
  private selection!: GameSelection;

  private spr0!: Phaser.GameObjects.Image;
  private spr1!: Phaser.GameObjects.Image;
  private wpn0!: Phaser.GameObjects.Image;
  private wpn1!: Phaser.GameObjects.Image;
  private shield0!: Phaser.GameObjects.Rectangle;
  private shield1!: Phaser.GameObjects.Rectangle;

  private hp0!: Phaser.GameObjects.Rectangle;
  private hp1!: Phaser.GameObjects.Rectangle;
  private sta0!: Phaser.GameObjects.Rectangle;
  private sta1!: Phaser.GameObjects.Rectangle;
  private timerText!: Phaser.GameObjects.Text;
  private callout!: Phaser.GameObjects.Text;
  private moveLabel!: Phaser.GameObjects.Text;

  private ended = false;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private walkFrame = 0;
  private walkTick = 0;
  private accum = 0;
  private readonly stepMs = 1000 / C.FPS;
  private lastCallout = "";
  private prevHp: [number, number] = [0, 0];
  private dmgFloats: Phaser.GameObjects.Text[] = [];

  constructor() {
    super("Fight");
  }

  create() {
    this.ended = false;
    this.accum = 0;
    this.selection = this.registry.get(REG.selection) as GameSelection;
    if (!this.selection?.playerWeapon) {
      this.scene.start("CharacterSelect");
      return;
    }

    const { player, rival, playerWeapon, rivalWeapon, opponentAI } = this.selection;
    this.match = new Match(player, playerWeapon, rival, rivalWeapon);
    this.ai = makeAI(opponentAI, (Date.now() % 9000) + 1);
    this.prevHp = [this.match.fighters[0].hp, this.match.fighters[1].hp];

    // Static stage (no scrolling tileSprites for perf)
    this.add.image(C.STAGE_WIDTH / 2, 180, "stage_neon").setDisplaySize(C.STAGE_WIDTH, 360);
    this.add.rectangle(C.STAGE_WIDTH / 2, C.GROUND_Y + 45, C.STAGE_WIDTH, 90, 0x1a1630);
    this.add
      .rectangle(C.STAGE_WIDTH / 2, C.GROUND_Y + 1, C.STAGE_WIDTH, 3, 0x6ef3ff, 0.5)
      .setOrigin(0.5, 0);

    // UI
    this.add.rectangle(C.STAGE_WIDTH / 2, 36, C.STAGE_WIDTH, 72, 0x07060e, 0.88);
    this.add
      .text(16, 8, `${player.name} · ${playerWeapon.name}`, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "8px",
        color: player.palette.body,
      });
    this.add
      .text(C.STAGE_WIDTH - 16, 8, `${rivalWeapon.name} · ${rival.name}`, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "8px",
        color: rival.palette.body,
      })
      .setOrigin(1, 0);

    this.add.rectangle(156, 30, 284, 14, 0x1a1630).setOrigin(0.5);
    this.add.rectangle(C.STAGE_WIDTH - 156, 30, 284, 14, 0x1a1630).setOrigin(0.5);
    this.hp0 = this.add.rectangle(14, 30, 280, 10, 0x3ce89a).setOrigin(0, 0.5);
    this.hp1 = this.add.rectangle(C.STAGE_WIDTH - 14, 30, 280, 10, 0xff6b7a).setOrigin(1, 0.5);

    this.add.rectangle(156, 48, 284, 8, 0x1a1630).setOrigin(0.5);
    this.add.rectangle(C.STAGE_WIDTH - 156, 48, 284, 8, 0x1a1630).setOrigin(0.5);
    this.sta0 = this.add.rectangle(14, 48, 280, 6, 0x5ec8ff).setOrigin(0, 0.5);
    this.sta1 = this.add.rectangle(C.STAGE_WIDTH - 14, 48, 280, 6, 0xffb86b).setOrigin(1, 0.5);

    this.timerText = this.add
      .text(C.STAGE_WIDTH / 2, 28, "90", {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "16px",
        color: "#e8e4ff",
      })
      .setOrigin(0.5);

    this.moveLabel = this.add
      .text(C.STAGE_WIDTH / 2, 58, "", {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "7px",
        color: "#7a7599",
      })
      .setOrigin(0.5);

    this.callout = this.add
      .text(C.STAGE_WIDTH / 2, 100, "", {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "16px",
        color: "#ffe66d",
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(30);

    this.add
      .text(
        C.STAGE_WIDTH / 2,
        C.STAGE_HEIGHT - 16,
        "A/D move  W jump  J light(+chain)  K heavy  I special  L shield  ESC",
        {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: "6px",
          color: "#4a4660",
        }
      )
      .setOrigin(0.5);

    this.spr0 = this.add
      .image(this.match.fighters[0].x, this.match.fighters[0].y, `char_${player.id}_idle`)
      .setOrigin(0.5, 1)
      .setScale(2);
    this.spr1 = this.add
      .image(this.match.fighters[1].x, this.match.fighters[1].y, `char_${rival.id}_idle`)
      .setOrigin(0.5, 1)
      .setScale(2);

    this.wpn0 = this.add
      .image(0, 0, `wpn_${playerWeapon.id}_idle`)
      .setOrigin(0.35, 0.55)
      .setScale(2)
      .setDepth(4);
    this.wpn1 = this.add
      .image(0, 0, `wpn_${rivalWeapon.id}_idle`)
      .setOrigin(0.35, 0.55)
      .setScale(2)
      .setDepth(4);

    this.shield0 = this.add.rectangle(0, 0, 10, 36, 0x9ad7ff, 0).setDepth(5);
    this.shield1 = this.add.rectangle(0, 0, 10, 36, 0x9ad7ff, 0).setDepth(5);

    this.cameras.main.fadeIn(250, 7, 6, 14);
    this.showCallout("FIGHT", "#6ef3ff", 600);

    const kb = this.input.keyboard!;
    this.keys = {
      left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      up: kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      space: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      w: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      a: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      d: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      j: kb.addKey(Phaser.Input.Keyboard.KeyCodes.J),
      k: kb.addKey(Phaser.Input.Keyboard.KeyCodes.K),
      i: kb.addKey(Phaser.Input.Keyboard.KeyCodes.I),
      u: kb.addKey(Phaser.Input.Keyboard.KeyCodes.U),
      z: kb.addKey(Phaser.Input.Keyboard.KeyCodes.Z),
      x: kb.addKey(Phaser.Input.Keyboard.KeyCodes.X),
      l: kb.addKey(Phaser.Input.Keyboard.KeyCodes.L),
      c: kb.addKey(Phaser.Input.Keyboard.KeyCodes.C),
      shift: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
    };

    kb.on("keydown-ESC", () => this.scene.start("Title"));
  }

  update(_t: number, dt: number) {
    if (this.ended) return;

    this.accum += Math.min(dt, 40);
    let steps = 0;
    while (this.accum >= this.stepMs && !this.ended && steps < C.MAX_SIM_STEPS_PER_FRAME) {
      this.accum -= this.stepMs;
      steps += 1;
      this.simStep();
    }
    // Drop leftover sim debt when lagging (keeps UI smooth)
    if (this.accum > this.stepMs * 2) this.accum = 0;

    this.syncVisuals();
  }

  private simStep() {
    const k = this.keys;
    const action0 = readPlayerAction({
      left: k.left.isDown || k.a.isDown,
      right: k.right.isDown || k.d.isDown,
      jump: k.up.isDown || k.w.isDown || k.space.isDown,
      light: k.j.isDown || k.z.isDown,
      heavy: k.k.isDown || k.x.isDown,
      special: k.i.isDown || k.u.isDown,
      block: k.l.isDown || k.c.isDown || k.shift.isDown,
    });
    const action1 = this.ai.act(this.match, 1);
    const { done, events } = this.match.step(action0, action1);

    for (const ev of events) {
      if (ev.startsWith("parry_whiff_")) {
        this.showCallout("WHIFF", "#c084fc", 450);
        this.cameras.main.shake(60, 0.003);
      } else if (ev.startsWith("parry_p")) {
        this.showCallout(ev.endsWith("p0") ? "PARRY!" : "PARRIED", "#ffe66d", 550);
        this.cameras.main.flash(60, 255, 230, 100);
      } else if (ev.startsWith("guard_break_")) {
        this.showCallout("GUARD BREAK", "#ff4d6d", 600);
        this.cameras.main.shake(140, 0.01);
      } else if (ev.startsWith("hit_p") || ev.startsWith("block_p")) {
        this.cameras.main.shake(50, 0.004);
      } else if (ev.startsWith("dmg_p")) {
        // dmg_p{idx}:{amount}:...
        const parts = ev.split(":");
        const who = parts[0].endsWith("0") ? 0 : 1;
        const amount = parts[1] ?? "?";
        const f = this.match.fighters[who];
        this.spawnDamageNumber(f.x, f.y - 80, amount, who === 1);
      }
    }

    // HP drop feedback on bars
    const [f0, f1] = this.match.fighters;
    if (f0.hp < this.prevHp[0]) this.flashBar(this.hp0, 0xff6666);
    if (f1.hp < this.prevHp[1]) this.flashBar(this.hp1, 0xff6666);
    this.prevHp = [f0.hp, f1.hp];

    if (done) {
      this.ended = true;
      const res = this.match.result!;
      const won = res.winner === 0;
      const draw = res.winner === null;
      this.showCallout(
        draw ? "DRAW" : won ? "YOU WIN" : "DEFEAT",
        won ? "#6ef3ff" : "#ff6b9d",
        1000
      );
      this.time.delayedCall(1200, () => {
        this.scene.start("Result", { selection: this.selection, result: res });
      });
    }
  }

  private syncVisuals() {
    const [f0, f1] = this.match.fighters;
    const p = this.selection.player;
    const r = this.selection.rival;
    const pw = this.selection.playerWeapon;
    const rw = this.selection.rivalWeapon;

    this.placeFighter(this.spr0, this.wpn0, f0, p.id, pw.id);
    this.placeFighter(this.spr1, this.wpn1, f1, r.id, rw.id);
    this.placeShield(this.shield0, f0);
    this.placeShield(this.shield1, f1);

    // Phaser Rectangle: must use setSize — assigning .width does not redraw
    const hp0w = Math.max(0, 280 * (f0.hp / f0.maxHp));
    const hp1w = Math.max(0, 280 * (f1.hp / f1.maxHp));
    const st0w = Math.max(0, 280 * (f0.stamina / f0.maxStamina));
    const st1w = Math.max(0, 280 * (f1.stamina / f1.maxStamina));
    this.hp0.setSize(hp0w, 10);
    this.hp1.setSize(hp1w, 10);
    this.sta0.setSize(st0w, 6);
    this.sta1.setSize(st1w, 6);

    const sec = Math.max(0, Math.ceil((this.match.maxFrames - this.match.frame) / C.FPS));
    this.timerText.setText(String(sec).padStart(2, "0"));

    const moveName = f0.attackMove?.name ?? "";
    if (this.moveLabel.text !== moveName) this.moveLabel.setText(moveName);
  }

  private placeFighter(
    spr: Phaser.GameObjects.Image,
    wpn: Phaser.GameObjects.Image,
    f: (typeof this.match.fighters)[0],
    charId: string,
    weaponId: string
  ) {
    spr.setPosition(f.x, f.y);
    spr.setFlipX(f.facing < 0);

    let bodyKey = `char_${charId}_idle`;
    let wpnPose: "idle" | "light" | "heavy" | "special" | "block" = "idle";

    switch (f.state) {
      case FighterState.WALK:
        this.walkTick++;
        if (this.walkTick % 8 === 0) this.walkFrame = 1 - this.walkFrame;
        bodyKey = `char_${charId}_walk${this.walkFrame}`;
        break;
      case FighterState.JUMP:
        bodyKey = `char_${charId}_jump`;
        break;
      case FighterState.ATTACK:
        if (f.attackSlot === "heavy") {
          bodyKey = `char_${charId}_heavy`;
          wpnPose = "heavy";
        } else if (f.attackSlot === "special") {
          bodyKey = `char_${charId}_special`;
          wpnPose = "special";
        } else {
          bodyKey = `char_${charId}_light`;
          wpnPose = "light";
        }
        break;
      case FighterState.BLOCK:
      case FighterState.BLOCKSTUN:
        bodyKey = `char_${charId}_block`;
        wpnPose = "block";
        break;
      case FighterState.PARRY:
        bodyKey = `char_${charId}_parry`;
        break;
      case FighterState.HITSTUN:
      case FighterState.GUARD_BREAK:
      case FighterState.PARRY_WHIFF:
        bodyKey = `char_${charId}_hit`;
        break;
      case FighterState.KO:
        bodyKey = `char_${charId}_ko`;
        break;
      default:
        bodyKey = `char_${charId}_idle`;
    }

    if (spr.texture.key !== bodyKey) spr.setTexture(bodyKey);

    const wpnKey = `wpn_${weaponId}_${wpnPose}`;
    if (wpn.texture.key !== wpnKey) wpn.setTexture(wpnKey);
    wpn.setVisible(f.state !== FighterState.KO);
    wpn.setPosition(f.x + f.facing * 10, f.y - 38);
    wpn.setFlipX(f.facing < 0);
    // Mirror weapon origin when flipped
    wpn.setOrigin(f.facing < 0 ? 0.65 : 0.35, 0.55);

    if (f.state === FighterState.HITSTUN || f.state === FighterState.GUARD_BREAK) {
      spr.setTint(0xffaaaa);
    } else if (f.state === FighterState.PARRY) {
      spr.setTint(0xffffaa);
    } else {
      spr.clearTint();
    }
  }

  private placeShield(rect: Phaser.GameObjects.Rectangle, f: (typeof this.match.fighters)[0]) {
    const sr = f.shieldRect();
    if (!sr) {
      rect.setAlpha(0);
      return;
    }
    const parry = f.inParryWindow;
    rect.setPosition((sr.left + sr.right) / 2, (sr.top + sr.bottom) / 2);
    rect.setSize(Math.max(1, sr.right - sr.left), Math.max(1, sr.bottom - sr.top));
    rect.setFillStyle(parry ? 0xffe66d : 0x9ad7ff, parry ? 0.85 : 0.55);
    rect.setAlpha(1);
  }

  private showCallout(text: string, color: string, ms: number) {
    if (this.lastCallout === text && this.callout.alpha > 0.5) return;
    this.lastCallout = text;
    this.callout.setText(text).setColor(color).setAlpha(1).setScale(1.15);
    this.tweens.killTweensOf(this.callout);
    this.tweens.add({ targets: this.callout, scale: 1, duration: 100 });
    this.tweens.add({ targets: this.callout, alpha: 0, delay: ms, duration: 220 });
  }

  private spawnDamageNumber(x: number, y: number, amount: string, onRival: boolean) {
    const t = this.add
      .text(x, y, `-${amount}`, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "12px",
        color: onRival ? "#6ef3ff" : "#ff6b9d",
      })
      .setOrigin(0.5)
      .setDepth(40);
    this.tweens.add({
      targets: t,
      y: y - 36,
      alpha: 0,
      duration: 450,
      onComplete: () => t.destroy(),
    });
  }

  private flashBar(bar: Phaser.GameObjects.Rectangle, color: number) {
    const prev = bar.fillColor;
    bar.setFillStyle(color, 1);
    this.time.delayedCall(80, () => {
      if (bar.active) bar.setFillStyle(prev, 1);
    });
  }
}
