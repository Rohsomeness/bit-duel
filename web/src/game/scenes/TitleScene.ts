import Phaser from "phaser";
import * as C from "../combat/constants";

export class TitleScene extends Phaser.Scene {
  constructor() {
    super("Title");
  }

  create() {
    const w = C.STAGE_WIDTH;
    const h = C.STAGE_HEIGHT;

    this.add.image(w / 2, h / 2, "starfield").setDisplaySize(w, h).setAlpha(0.9);
    this.add.rectangle(w / 2, h * 0.4, w * 0.65, 100, 0x6ef3ff, 0.05);

    const title = this.add
      .text(w / 2, 110, "BIT·DUEL", {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "36px",
        color: "#6ef3ff",
      })
      .setOrigin(0.5);
    title.setShadow(0, 0, "#6ef3ff", 14, true, true);

    this.add
      .text(w / 2, 158, "WEAPON ARENA", {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "10px",
        color: "#ff6b9d",
      })
      .setOrigin(0.5);

    this.add
      .text(w / 2, 200, "Shadow of the neon pit — fists, steel, staff & chain", {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "7px",
        color: "#7a7599",
        align: "center",
        wordWrap: { width: 560 },
      })
      .setOrigin(0.5);

    this.add.image(200, 300, "char_ion_idle").setScale(2);
    this.add.image(250, 290, "wpn_sword_idle").setScale(2);
    this.add.image(600, 300, "char_ember_idle").setScale(2).setFlipX(true);
    this.add.image(550, 290, "wpn_nunchaku_idle").setScale(2).setFlipX(true);

    const weapons = "FISTS · NUNCHAKU · SWORD · SPEAR · KNIVES · STAFF";
    this.add
      .text(w / 2, 350, weapons, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "6px",
        color: "#5a5670",
      })
      .setOrigin(0.5);

    const prompt = this.add
      .text(w / 2, 390, "PRESS  ENTER  /  SPACE", {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "12px",
        color: "#e8e4ff",
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: prompt,
      alpha: 0.3,
      duration: 700,
      yoyo: true,
      repeat: -1,
    });

    this.add
      .text(w / 2, 430, "J light  K heavy  I special  L shield/parry", {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "7px",
        color: "#4a4660",
      })
      .setOrigin(0.5);

    this.input.keyboard?.once("keydown-ENTER", () => this.go());
    this.input.keyboard?.once("keydown-SPACE", () => this.go());
    this.input.once("pointerdown", () => this.go());
  }

  private go() {
    this.cameras.main.fadeOut(220, 7, 6, 14);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.start("CharacterSelect");
    });
  }
}
