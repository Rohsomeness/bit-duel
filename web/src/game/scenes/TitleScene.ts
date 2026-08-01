import Phaser from "phaser";
import * as C from "../combat/constants";

export class TitleScene extends Phaser.Scene {
  constructor() {
    super("Title");
  }

  create() {
    const w = C.STAGE_WIDTH;
    const h = C.STAGE_HEIGHT;

    // backdrop
    this.add.tileSprite(w / 2, h / 2, w, h, "starfield").setAlpha(0.9);
    const glow = this.add.rectangle(w / 2, h * 0.42, w * 0.7, 120, 0x6ef3ff, 0.06);

    // title block
    const title = this.add
      .text(w / 2, 120, "BIT·DUEL", {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "36px",
        color: "#6ef3ff",
      })
      .setOrigin(0.5);
    title.setShadow(0, 0, "#6ef3ff", 16, true, true);

    this.add
      .text(w / 2, 168, "ARENA PROTOCOL", {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "10px",
        color: "#ff6b9d",
      })
      .setOrigin(0.5);

    this.add
      .text(w / 2, 220, "a pixel arena of stamina, shields & perfect parries", {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "8px",
        color: "#7a7599",
        align: "center",
        wordWrap: { width: 520 },
      })
      .setOrigin(0.5);

    // decorative fighters
    this.add.image(180, 320, "char_ion_idle").setScale(2).setFlipX(false);
    this.add.image(620, 320, "char_ember_idle").setScale(2).setFlipX(true);

    const prompt = this.add
      .text(w / 2, 390, "PRESS  ENTER  /  SPACE", {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "12px",
        color: "#e8e4ff",
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: prompt,
      alpha: 0.25,
      duration: 650,
      yoyo: true,
      repeat: -1,
    });
    this.tweens.add({
      targets: glow,
      alpha: 0.12,
      duration: 1400,
      yoyo: true,
      repeat: -1,
    });

    this.add
      .text(w / 2, 430, "J light  ·  K heavy  ·  L shield/parry  ·  move A/D", {
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
    this.cameras.main.fadeOut(280, 7, 6, 14);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.start("CharacterSelect");
    });
  }
}
