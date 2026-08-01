import Phaser from "phaser";
import * as C from "../combat/constants";
import { CHARACTERS, OPPONENTS, type OpponentKind } from "../data/characters";
import { WEAPONS } from "../data/weapons";
import { REG, type GameSelection } from "../registry";

const FONT = '"Press Start 2P", monospace';

type SideUI = {
  frame: Phaser.GameObjects.Rectangle;
  portrait: Phaser.GameObjects.Image;
  name: Phaser.GameObjects.Text;
  charHint: Phaser.GameObjects.Text;
  weaponTitle: Phaser.GameObjects.Text;
  weaponBlurb: Phaser.GameObjects.Text;
  moves: Phaser.GameObjects.Text;
  weaponIcons: Phaser.GameObjects.Image[];
  weaponFrames: Phaser.GameObjects.Rectangle[];
  leftChar: Phaser.GameObjects.Container;
  rightChar: Phaser.GameObjects.Container;
};

/**
 * Armory select — always-visible weapon tray, click targets, simple keys.
 *
 * YOU:   A/D character · Q/E weapon · click portrait arrows or weapon icons
 * RIVAL: ←/→ character · Z/C weapon · same clicks
 * CPU:   1/2/3 or click chips
 * ENTER / click FIGHT to start
 */
export class CharacterSelectScene extends Phaser.Scene {
  private pIndex = 0;
  private rIndex = 1;
  private pwIndex = 0;
  private rwIndex = 2;
  private aiIndex = 0;

  private you!: SideUI;
  private rival!: SideUI;
  private aiChips: Phaser.GameObjects.Container[] = [];
  private footerHint!: Phaser.GameObjects.Text;

  constructor() {
    super("CharacterSelect");
  }

  create() {
    const w = C.STAGE_WIDTH;
    const h = C.STAGE_HEIGHT;

    this.add.image(w / 2, h / 2, "starfield").setDisplaySize(w, h).setAlpha(0.9);

    this.add
      .text(w / 2, 18, "ARMORY", {
        fontFamily: FONT,
        fontSize: "16px",
        color: "#e8e4ff",
      })
      .setOrigin(0.5);

    this.add
      .text(w / 2, 40, "pick fighter + weapon · click or use keys", {
        fontFamily: FONT,
        fontSize: "7px",
        color: "#7a7599",
      })
      .setOrigin(0.5);

    this.you = this.buildSide(170, true);
    this.rival = this.buildSide(630, false);

    this.add
      .text(w / 2, 140, "VS", {
        fontFamily: FONT,
        fontSize: "16px",
        color: "#ff6b9d",
      })
      .setOrigin(0.5);

    // CPU row
    this.add
      .text(w / 2, 310, "CPU STYLE  ·  click or 1 / 2 / 3", {
        fontFamily: FONT,
        fontSize: "7px",
        color: "#7a7599",
      })
      .setOrigin(0.5);

    this.aiChips = [];
    const chipY = 336;
    const startX = w / 2 - ((OPPONENTS.length - 1) * 120) / 2;
    OPPONENTS.forEach((op, i) => {
      const chipX = startX + i * 120;
      const box = this.add
        .rectangle(0, 0, 108, 30, 0x120f1c, 1)
        .setStrokeStyle(2, 0x2a2540)
        .setInteractive({ useHandCursor: true });
      const label = this.add
        .text(0, 0, op.label, {
          fontFamily: FONT,
          fontSize: "8px",
          color: "#c4c0e0",
        })
        .setOrigin(0.5);
      const c = this.add.container(chipX, chipY, [box, label]);
      box.on("pointerdown", () => {
        this.aiIndex = i;
        this.refresh();
      });
      this.aiChips.push(c);
    });

    // FIGHT button
    const fightBtn = this.add
      .rectangle(w / 2, 388, 220, 42, 0x6ef3ff, 1)
      .setInteractive({ useHandCursor: true });
    const fightTxt = this.add
      .text(w / 2, 388, "FIGHT", {
        fontFamily: FONT,
        fontSize: "14px",
        color: "#0a0814",
      })
      .setOrigin(0.5)
      .setDepth(2);
    fightBtn.on("pointerover", () => fightBtn.setFillStyle(0xa8f7ff, 1));
    fightBtn.on("pointerout", () => fightBtn.setFillStyle(0x6ef3ff, 1));
    fightBtn.on("pointerdown", () => this.confirm());

    this.footerHint = this.add
      .text(
        w / 2,
        428,
        "YOU: A/D fighter · Q/E weapon     RIVAL: ←/→ fighter · Z/C weapon     ENTER fight",
        {
          fontFamily: FONT,
          fontSize: "6px",
          color: "#4a4660",
        }
      )
      .setOrigin(0.5);

    this.bindKeys();
    this.refresh();
  }

  private buildSide(cx: number, isYou: boolean): SideUI {
    const accent = isYou ? 0x6ef3ff : 0xff6b9d;
    const accentStr = isYou ? "#6ef3ff" : "#ff6b9d";
    const tag = isYou ? "YOU" : "RIVAL";

    const frame = this.add
      .rectangle(cx, 168, 290, 230, 0x120f1c, 0.96)
      .setStrokeStyle(2, accent);

    this.add
      .text(cx, 62, tag, {
        fontFamily: FONT,
        fontSize: "9px",
        color: accentStr,
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 80, "FIGHTER  ·  click arrows", {
        fontFamily: FONT,
        fontSize: "6px",
        color: "#7a7599",
      })
      .setOrigin(0.5);

    const portrait = this.add.image(cx, 128, "char_ion_portrait").setScale(1.35);
    portrait.setInteractive({ useHandCursor: true });

    const leftChar = this.makeArrow(cx - 72, 128, "<", accentStr);
    const rightChar = this.makeArrow(cx + 72, 128, ">", accentStr);

    const name = this.add
      .text(cx, 170, "ION", {
        fontFamily: FONT,
        fontSize: "10px",
        color: accentStr,
      })
      .setOrigin(0.5);

    const charHint = this.add
      .text(cx, 184, "", {
        fontFamily: FONT,
        fontSize: "5px",
        color: "#7a7599",
        align: "center",
        wordWrap: { width: 250 },
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 202, "WEAPON  ·  click any icon", {
        fontFamily: FONT,
        fontSize: "6px",
        color: "#7a7599",
      })
      .setOrigin(0.5);

    const weaponIcons: Phaser.GameObjects.Image[] = [];
    const weaponFrames: Phaser.GameObjects.Rectangle[] = [];
    const trayW = 6 * 38;
    const trayStart = cx - trayW / 2 + 19;
    WEAPONS.forEach((_wpn, i) => {
      const ix = trayStart + i * 38;
      const fr = this.add
        .rectangle(ix, 230, 34, 34, 0x0a0814, 1)
        .setStrokeStyle(2, 0x2a2540)
        .setInteractive({ useHandCursor: true });
      const icon = this.add.image(ix, 230, `wpn_${WEAPONS[i].id}_icon`).setScale(0.9);
      icon.setInteractive({ useHandCursor: true });
      const pick = () => {
        if (isYou) this.pwIndex = i;
        else this.rwIndex = i;
        this.refresh();
      };
      fr.on("pointerdown", pick);
      icon.on("pointerdown", pick);
      fr.on("pointerover", () => {
        if ((isYou ? this.pwIndex : this.rwIndex) !== i) fr.setStrokeStyle(2, 0x5a5670);
      });
      fr.on("pointerout", () => this.refresh());
      weaponFrames.push(fr);
      weaponIcons.push(icon);
    });

    const weaponTitle = this.add
      .text(cx, 256, "FISTS", {
        fontFamily: FONT,
        fontSize: "8px",
        color: "#e8e4ff",
      })
      .setOrigin(0.5);

    const weaponBlurb = this.add
      .text(cx, 270, "", {
        fontFamily: FONT,
        fontSize: "5px",
        color: "#7a7599",
        align: "center",
        wordWrap: { width: 270 },
      })
      .setOrigin(0.5);

    const moves = this.add
      .text(cx, 286, "", {
        fontFamily: FONT,
        fontSize: "5px",
        color: "#5a5670",
        align: "center",
      })
      .setOrigin(0.5);

    const side = isYou ? "you" : "rival";
    (leftChar.list[0] as Phaser.GameObjects.Rectangle).on("pointerdown", () =>
      this.nudgeChar(side, -1)
    );
    (rightChar.list[0] as Phaser.GameObjects.Rectangle).on("pointerdown", () =>
      this.nudgeChar(side, 1)
    );
    portrait.on("pointerdown", () => this.nudgeChar(side, 1));

    return {
      frame,
      portrait,
      name,
      charHint,
      weaponTitle,
      weaponBlurb,
      moves,
      weaponIcons,
      weaponFrames,
      leftChar,
      rightChar,
    };
  }

  private makeArrow(x: number, y: number, label: string, color: string) {
    const bg = this.add
      .rectangle(0, 0, 28, 36, 0x1a1630, 1)
      .setStrokeStyle(2, 0x2a2540)
      .setInteractive({ useHandCursor: true });
    const t = this.add
      .text(0, 0, label, {
        fontFamily: FONT,
        fontSize: "12px",
        color,
      })
      .setOrigin(0.5);
    bg.on("pointerover", () => bg.setFillStyle(0x2a2540, 1));
    bg.on("pointerout", () => bg.setFillStyle(0x1a1630, 1));
    return this.add.container(x, y, [bg, t]);
  }

  private bindKeys() {
    const kb = this.input.keyboard!;
    // YOU character
    kb.on("keydown-A", () => this.nudgeChar("you", -1));
    kb.on("keydown-D", () => this.nudgeChar("you", 1));
    // YOU weapon
    kb.on("keydown-Q", () => this.nudgeWeapon("you", -1));
    kb.on("keydown-E", () => this.nudgeWeapon("you", 1));
    // RIVAL character
    kb.on("keydown-LEFT", () => this.nudgeChar("rival", -1));
    kb.on("keydown-RIGHT", () => this.nudgeChar("rival", 1));
    // RIVAL weapon
    kb.on("keydown-Z", () => this.nudgeWeapon("rival", -1));
    kb.on("keydown-C", () => this.nudgeWeapon("rival", 1));
    // CPU
    kb.on("keydown-ONE", () => {
      this.aiIndex = 0;
      this.refresh();
    });
    kb.on("keydown-TWO", () => {
      this.aiIndex = 1;
      this.refresh();
    });
    kb.on("keydown-THREE", () => {
      this.aiIndex = 2;
      this.refresh();
    });
    kb.on("keydown-ENTER", () => this.confirm());
    kb.on("keydown-SPACE", () => this.confirm());
  }

  private nudgeChar(side: "you" | "rival", dir: number) {
    if (side === "you") {
      this.pIndex = (this.pIndex + dir + CHARACTERS.length) % CHARACTERS.length;
    } else {
      this.rIndex = (this.rIndex + dir + CHARACTERS.length) % CHARACTERS.length;
    }
    this.refresh();
  }

  private nudgeWeapon(side: "you" | "rival", dir: number) {
    if (side === "you") {
      this.pwIndex = (this.pwIndex + dir + WEAPONS.length) % WEAPONS.length;
    } else {
      this.rwIndex = (this.rwIndex + dir + WEAPONS.length) % WEAPONS.length;
    }
    this.refresh();
  }

  private refresh() {
    this.applySide(this.you, this.pIndex, this.pwIndex, true);
    this.applySide(this.rival, this.rIndex, this.rwIndex, false);

    OPPONENTS.forEach((op, i) => {
      const c = this.aiChips[i];
      const box = c.list[0] as Phaser.GameObjects.Rectangle;
      const label = c.list[1] as Phaser.GameObjects.Text;
      const on = i === this.aiIndex;
      box.setStrokeStyle(2, on ? 0xffe66d : 0x2a2540);
      box.setFillStyle(on ? 0x2a2040 : 0x120f1c, 1);
      label.setColor(on ? "#ffe66d" : "#c4c0e0");
      label.setText(op.label);
    });
  }

  private applySide(ui: SideUI, charIdx: number, wpnIdx: number, isYou: boolean) {
    const ch = CHARACTERS[charIdx];
    const wpn = WEAPONS[wpnIdx];
    const accent = isYou ? 0x6ef3ff : 0xff6b9d;

    ui.portrait.setTexture(`char_${ch.id}_portrait`);
    ui.name.setText(ch.name).setColor(ch.palette.body);
    ui.charHint.setText(ch.title);
    ui.weaponTitle.setText(`${wpn.name}  ·  ${wpn.reach.toUpperCase()}`);
    ui.weaponBlurb.setText(wpn.blurb);
    ui.moves.setText(
      `J:${wpn.light.name}  K:${wpn.heavy.name}  I:${wpn.special.name}`
    );

    ui.weaponIcons.forEach((icon, i) => {
      icon.setTexture(`wpn_${WEAPONS[i].id}_icon`);
      const fr = ui.weaponFrames[i];
      const on = i === wpnIdx;
      fr.setStrokeStyle(2, on ? accent : 0x2a2540);
      fr.setFillStyle(on ? 0x1a1630 : 0x0a0814, 1);
      icon.setAlpha(on ? 1 : 0.55);
      icon.setScale(on ? 1.0 : 0.8);
    });
  }

  private confirm() {
    const selection: GameSelection = {
      player: CHARACTERS[this.pIndex],
      rival: CHARACTERS[this.rIndex],
      playerWeapon: WEAPONS[this.pwIndex],
      rivalWeapon: WEAPONS[this.rwIndex],
      opponentAI: OPPONENTS[this.aiIndex].id as OpponentKind,
    };
    this.registry.set(REG.selection, selection);
    this.cameras.main.flash(140, 110, 243, 255);
    this.time.delayedCall(220, () => this.scene.start("Fight"));
  }
}
