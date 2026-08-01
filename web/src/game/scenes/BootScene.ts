import Phaser from "phaser";
import { CHARACTERS } from "../data/characters";
import {
  bakeCharacterTextures,
  bakeStageTextures,
  bakeUiTextures,
  bakeWeaponTextures,
} from "../render/pixelArt";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  create() {
    bakeUiTextures(this);
    bakeStageTextures(this);
    bakeWeaponTextures(this);
    for (const c of CHARACTERS) {
      bakeCharacterTextures(this, c);
    }

    document.getElementById("boot")?.classList.add("hide");
    this.scene.start("Title");
  }
}
