import Phaser from "phaser";
import * as C from "./game/combat/constants";
import { BootScene } from "./game/scenes/BootScene";
import { TitleScene } from "./game/scenes/TitleScene";
import { CharacterSelectScene } from "./game/scenes/CharacterSelectScene";
import { FightScene } from "./game/scenes/FightScene";
import { ResultScene } from "./game/scenes/ResultScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  width: C.STAGE_WIDTH,
  height: C.STAGE_HEIGHT,
  backgroundColor: "#07060e",
  pixelArt: true,
  antialias: false,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, TitleScene, CharacterSelectScene, FightScene, ResultScene],
  fps: {
    target: 60,
    forceSetTimeOut: true,
  },
  input: {
    keyboard: true,
  },
};

// eslint-disable-next-line no-new
new Phaser.Game(config);
