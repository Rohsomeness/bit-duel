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
  private shield0!: Phaser.GameObjects.Rectangle;
  private shield1!: Phaser.GameObjects.Rectangle;

  private hp0!: Phaser.GameObjects.Rectangle;
  private hp1!: Phaser.GameObjects.Rectangle;
  private sta0!: Phaser.GameObjects.Rectangle;
  private sta1!: Phaser.GameObjects.Rectangle;
  private timerText!: Phaser.GameObjects.Text;
  private callout!: Phaser.GameObjects.Text;
  private names!: Phaser.GameObjects.Text;

  private ended = false;
  private keys!: {
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    up: Phaser.Input.Keyboard.Key;
    space: Phaser.Input.Keyboard.Key;
    w: Phaser.Input.Keyboard.Key;
    a: Phaser.Input.Keyboard.Key;
    d: Phaser.Input.Keyboard.Key;
    j: Phaser.Input.Keyboard.Key;
    k: Phaser.Input.Keyboard.Key;
    z: Phaser.Input.Keyboard.Key;
    x: Phaser.Input.Keyboard.Key;
    l: Phaser.Input.Keyboard.Key;
    c: Phaser.Input.Keyboard.Key;
    shift: Phaser.Input.Keyboard.Key;
  };

  private walkFrame = 0;
  private walkTick = 0;
  private accum = 0;
  private readonly stepMs = 1000 / C.FPS;

  constructor() {
    super("Fight");
  }

  create() {
    this.ended = false;
    this.accum = 0;
    this.selection = this.registry.get(REG.selection) as GameSelection;
    if (!this.selection) {
      this.scene.start("CharacterSelect");
      return;
    }

    const { player, rival, opponentAI } = this.selection;
    this.match = new Match(player, rival);
    this.ai = makeAI(opponentAI, Date.now() % 10000);

    // Stage
    this.add.image(C.STAGE_WIDTH / 2, 180, "stage_neon").setDisplaySize(C.STAGE_WIDTH, 360);
    this.add.tileSprite(C.STAGE_WIDTH / 2, C.GROUND_Y + 40, C.STAGE_WIDTH, 90, "arena_floor");

    // soft neon ground line
    this.add
      .rectangle(C.STAGE_WIDTH / 2, C.GROUND_Y + 1, C.STAGE_WIDTH, 3, 0x6ef3ff, 0.55)
      .setOrigin(0.5, 0);

    // UI chrome
    this.add.rectangle(C.STAGE_WIDTH / 2, 36, C.STAGE_WIDTH, 72, 0x07060e, 0.82);
    this.names = this.add
      .text(16, 8, `${player.name}`, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "9px",
        color: player.palette.body,
      });
    this.add
      .text(C.STAGE_WIDTH - 16, 8, rival.name, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "9px",
        color: rival.palette.body,
      })
      .setOrigin(1, 0);

    // HP / STA tracks
    this.add.rectangle(156, 30, 284, 14, 0x1a1630).setOrigin(0.5);
    this.add.rectangle(C.STAGE_WIDTH - 156, 30, 284, 14, 0x1a1630).setOrigin(0.5);
    this.hp0 = this.add.rectangle(14, 30, 280, 10, 0x3ce89a).setOrigin(0, 0.5);
    this.hp1 = this.add.rectangle(C.STAGE_WIDTH - 14, 30, 280, 10, 0xff6b7a).setOrigin(1, 0.5);

    this.add.rectangle(156, 48, 284, 8, 0x1a1630).setOrigin(0.5);
    this.add.rectangle(C.STAGE_WIDTH - 156, 48, 284, 8, 0x1a1630).setOrigin(0.5);
    this.sta0 = this.add.rectangle(14, 48, 280, 6, 0x5ec8ff).setOrigin(0, 0.5);
    this.sta1 = this.add.rectangle(C.STAGE_WIDTH - 14, 48, 280, 6, 0xffb86b).setOrigin(1, 0.5);

    this.timerText = this.add
      .text(C.STAGE_WIDTH / 2, 28, "60", {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "16px",
        color: "#e8e4ff",
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
      .text(C.STAGE_WIDTH / 2, C.STAGE_HEIGHT - 18, "A/D move  W jump  J light  K heavy  L shield  ·  ESC menu", {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "6px",
        color: "#4a4660",
      })
      .setOrigin(0.5);

    // Fighters
    this.spr0 = this.add
      .image(this.match.fighters[0].x, this.match.fighters[0].y, `char_${player.id}_idle`)
      .setOrigin(0.5, 1)
      .setScale(2);
    this.spr1 = this.add
      .image(this.match.fighters[1].x, this.match.fighters[1].y, `char_${rival.id}_idle`)
      .setOrigin(0.5, 1)
      .setScale(2);

    this.shield0 = this.add.rectangle(0, 0, 10, 36, 0x9ad7ff, 0.0).setDepth(5);
    this.shield1 = this.add.rectangle(0, 0, 10, 36, 0x9ad7ff, 0.0).setDepth(5);

    // intro
    this.cameras.main.fadeIn(350, 7, 6, 14);
    this.showCallout("FIGHT", "#6ef3ff", 700);

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
      z: kb.addKey(Phaser.Input.Keyboard.KeyCodes.Z),
      x: kb.addKey(Phaser.Input.Keyboard.KeyCodes.X),
      l: kb.addKey(Phaser.Input.Keyboard.KeyCodes.L),
      c: kb.addKey(Phaser.Input.Keyboard.KeyCodes.C),
      shift: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
    };

    kb.on("keydown-ESC", () => {
      this.scene.start("Title");
    });
  }

  update(_t: number, dt: number) {
    if (this.ended) return;

    // Fixed 60Hz combat sim (independent of display refresh)
    this.accum += Math.min(dt, 50);
    while (this.accum >= this.stepMs && !this.ended) {
      this.accum -= this.stepMs;
      this.simStep();
    }
    this.syncVisuals(dt);
  }

  private simStep() {
    const action0 = readPlayerAction({
      left: this.keys.left.isDown || this.keys.a.isDown,
      right: this.keys.right.isDown || this.keys.d.isDown,
      jump: this.keys.up.isDown || this.keys.w.isDown || this.keys.space.isDown,
      light: this.keys.j.isDown || this.keys.z.isDown,
      heavy: this.keys.k.isDown || this.keys.x.isDown,
      block: this.keys.l.isDown || this.keys.c.isDown || this.keys.shift.isDown,
    });
    const action1 = this.ai.act(this.match, 1);
    const { done, events } = this.match.step(action0, action1);

    for (const ev of events) {
      if (ev.startsWith("parry_whiff_")) {
        this.showCallout("WHIFF", "#c084fc", 500);
        this.cameras.main.shake(80, 0.004);
      } else if (ev.startsWith("parry_p")) {
        const you = ev.endsWith("p0");
        this.showCallout(you ? "PARRY!" : "PARRIED", "#ffe66d", 650);
        this.cameras.main.flash(80, 255, 230, 100);
        this.cameras.main.shake(120, 0.008);
      } else if (ev.startsWith("guard_break_")) {
        this.showCallout("GUARD BREAK", "#ff4d6d", 700);
        this.cameras.main.shake(200, 0.012);
      } else if (ev.startsWith("hit_p")) {
        this.cameras.main.shake(60, 0.004);
      }
    }

    if (done) {
      this.ended = true;
      const res = this.match.result!;
      const won = res.winner === 0;
      const draw = res.winner === null;
      this.showCallout(
        draw ? "DRAW" : won ? "YOU WIN" : "DEFEAT",
        won ? "#6ef3ff" : "#ff6b9d",
        1200
      );
      this.time.delayedCall(1400, () => {
        this.scene.start("Result", {
          selection: this.selection,
          result: res,
        });
      });
    }
  }

  private syncVisuals(_dt: number) {
    const [f0, f1] = this.match.fighters;
    const p = this.selection.player;
    const r = this.selection.rival;

    this.placeFighter(this.spr0, f0, p.id);
    this.placeFighter(this.spr1, f1, r.id);
    this.placeShield(this.shield0, f0);
    this.placeShield(this.shield1, f1);

    const hp0w = 280 * (f0.hp / f0.maxHp);
    const hp1w = 280 * (f1.hp / f1.maxHp);
    this.hp0.width = Math.max(0, hp0w);
    this.hp1.width = Math.max(0, hp1w);
    this.sta0.width = Math.max(0, 280 * (f0.stamina / f0.maxStamina));
    this.sta1.width = Math.max(0, 280 * (f1.stamina / f1.maxStamina));

    const sec = Math.max(0, Math.ceil((this.match.maxFrames - this.match.frame) / C.FPS));
    this.timerText.setText(String(sec).padStart(2, "0"));
  }

  private placeFighter(
    spr: Phaser.GameObjects.Image,
    f: (typeof this.match.fighters)[0],
    charId: string
  ) {
    spr.setPosition(f.x, f.y);
    spr.setFlipX(f.facing < 0);

    let key = `char_${charId}_idle`;
    switch (f.state) {
      case FighterState.WALK:
        this.walkTick++;
        if (this.walkTick % 8 === 0) this.walkFrame = 1 - this.walkFrame;
        key = `char_${charId}_walk${this.walkFrame}`;
        break;
      case FighterState.JUMP:
        key = `char_${charId}_jump`;
        break;
      case FighterState.LIGHT:
        key = `char_${charId}_light`;
        break;
      case FighterState.HEAVY:
        key = `char_${charId}_heavy`;
        break;
      case FighterState.BLOCK:
      case FighterState.BLOCKSTUN:
        key = `char_${charId}_block`;
        break;
      case FighterState.PARRY:
        key = `char_${charId}_parry`;
        break;
      case FighterState.HITSTUN:
      case FighterState.GUARD_BREAK:
      case FighterState.PARRY_WHIFF:
        key = `char_${charId}_hit`;
        break;
      case FighterState.KO:
        key = `char_${charId}_ko`;
        break;
      default:
        key = `char_${charId}_idle`;
    }
    if (spr.texture.key !== key) spr.setTexture(key);

    // hit flash
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
    rect.setSize(sr.right - sr.left, sr.bottom - sr.top);
    rect.setFillStyle(parry ? 0xffe66d : 0x9ad7ff, parry ? 0.85 : 0.55);
    rect.setAlpha(1);
  }

  private showCallout(text: string, color: string, ms: number) {
    this.callout.setText(text).setColor(color).setAlpha(1).setScale(1.2);
    this.tweens.killTweensOf(this.callout);
    this.tweens.add({
      targets: this.callout,
      scale: 1,
      duration: 120,
    });
    this.tweens.add({
      targets: this.callout,
      alpha: 0,
      delay: ms,
      duration: 280,
    });
  }
}
