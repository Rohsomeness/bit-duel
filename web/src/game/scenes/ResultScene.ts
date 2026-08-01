import Phaser from "phaser";
import * as C from "../combat/constants";
import type { MatchResult } from "../combat/match";
import type { GameSelection } from "../registry";

type ResultData = {
  selection: GameSelection;
  result: MatchResult;
};

export class ResultScene extends Phaser.Scene {
  constructor() {
    super("Result");
  }

  create(data: ResultData) {
    const { selection, result } = data;
    const w = C.STAGE_WIDTH;
    const h = C.STAGE_HEIGHT;

    this.add.tileSprite(w / 2, h / 2, w, h, "starfield");
    this.add.rectangle(w / 2, h / 2, w * 0.72, 280, 0x0c0a16, 0.92).setStrokeStyle(2, 0x2a2540);

    const won = result.winner === 0;
    const draw = result.winner === null;
    const headline = draw ? "DRAW" : won ? "VICTORY" : "DEFEAT";
    const color = draw ? "#e8e4ff" : won ? "#6ef3ff" : "#ff6b9d";

    this.add
      .text(w / 2, 140, headline, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "28px",
        color,
      })
      .setOrigin(0.5)
      .setShadow(0, 0, color, 12, true, true);

    this.add
      .text(
        w / 2,
        190,
        `${selection.player.name}  vs  ${selection.rival.name}`,
        {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: "10px",
          color: "#7a7599",
        }
      )
      .setOrigin(0.5);

    this.add
      .text(w / 2, 220, `reason · ${result.reason}   frames · ${result.frames}`, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "7px",
        color: "#4a4660",
      })
      .setOrigin(0.5);

    this.add.image(w / 2 - 80, 300, `char_${selection.player.id}_portrait`).setScale(1.6);
    this.add.image(w / 2 + 80, 300, `char_${selection.rival.id}_portrait`).setScale(1.6);

    const prompt = this.add
      .text(w / 2, 380, "ENTER rematch   ·   ESC roster", {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "9px",
        color: "#e8e4ff",
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: prompt,
      alpha: 0.35,
      duration: 700,
      yoyo: true,
      repeat: -1,
    });

    this.input.keyboard?.once("keydown-ENTER", () => this.scene.start("Fight"));
    this.input.keyboard?.once("keydown-SPACE", () => this.scene.start("Fight"));
    this.input.keyboard?.once("keydown-ESC", () => this.scene.start("CharacterSelect"));
    this.input.keyboard?.once("keydown-R", () => this.scene.start("Fight"));
  }
}
