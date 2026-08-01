import Phaser from "phaser";
import type { CharacterDef, CharacterPalette } from "../data/characters";
import type { WeaponDef } from "../data/weapons";
import { WEAPONS } from "../data/weapons";

function px(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  alpha = 1
) {
  g.fillStyle(Phaser.Display.Color.HexStringToColor(color).color, alpha);
  g.fillRect(x, y, w, h);
}

export function bakeCharacterTextures(scene: Phaser.Scene, char: CharacterDef) {
  const p = char.palette;
  const prefix = `char_${char.id}`;
  // Base body poses without weapon (weapon drawn as overlay sprite)
  const poses: [string, string, number][] = [
    ["idle", "idle", 0],
    ["walk0", "walk", 0],
    ["walk1", "walk", 1],
    ["jump", "jump", 0],
    ["light", "light", 0],
    ["heavy", "heavy", 0],
    ["special", "special", 0],
    ["block", "block", 0],
    ["parry", "parry", 0],
    ["hit", "hit", 0],
    ["ko", "ko", 0],
  ];

  for (const [suffix, pose, frame] of poses) {
    const key = `${prefix}_${suffix}`;
    if (scene.textures.exists(key)) continue;
    const g = scene.make.graphics({ x: 0, y: 0 });
    drawFighterBody(g, p, pose, frame);
    g.generateTexture(key, 64, 80);
    g.destroy();
  }

  const portKey = `${prefix}_portrait`;
  if (!scene.textures.exists(portKey)) {
    const g = scene.make.graphics({ x: 0, y: 0 });
    drawPortrait(g, p);
    g.generateTexture(portKey, 64, 80);
    g.destroy();
  }
}

export function bakeWeaponTextures(scene: Phaser.Scene) {
  for (const w of WEAPONS) {
    for (const pose of ["idle", "light", "heavy", "special", "block"] as const) {
      const key = `wpn_${w.id}_${pose}`;
      if (scene.textures.exists(key)) continue;
      const g = scene.make.graphics({ x: 0, y: 0 });
      drawWeapon(g, w, pose);
      g.generateTexture(key, 80, 80);
      g.destroy();
    }
    const icon = `wpn_${w.id}_icon`;
    if (!scene.textures.exists(icon)) {
      const g = scene.make.graphics({ x: 0, y: 0 });
      drawWeaponIcon(g, w);
      g.generateTexture(icon, 48, 48);
      g.destroy();
    }
  }
}

function drawFighterBody(
  g: Phaser.GameObjects.Graphics,
  p: CharacterPalette,
  pose: string,
  frame: number
) {
  const ox = 20;
  let oy = 8;
  let lean = 0;
  let armExt = 0;
  let armY = 28;
  let legSpread = 0;
  let crouch = 0;

  if (pose === "walk") {
    legSpread = frame === 0 ? 4 : -4;
    lean = frame === 0 ? 1 : -1;
  } else if (pose === "jump") {
    oy = 2;
    legSpread = 3;
  } else if (pose === "light") {
    armExt = 10;
    armY = 30;
    lean = 3;
  } else if (pose === "heavy") {
    armExt = 8;
    armY = 24;
    lean = 5;
  } else if (pose === "special") {
    armExt = 12;
    armY = 26;
    lean = 4;
  } else if (pose === "block") {
    crouch = 4;
    armExt = 6;
    armY = 24;
  } else if (pose === "parry") {
    armExt = 8;
    armY = 22;
    lean = -2;
  } else if (pose === "hit") {
    lean = -6;
    oy = 6;
  } else if (pose === "ko") {
    px(g, 8, 52, 48, 12, p.bodyDark);
    px(g, 10, 48, 44, 10, p.body);
    px(g, 14, 44, 10, 8, p.accent);
    return;
  }

  const bodyX = ox + lean;
  const bodyY = oy + crouch;

  px(g, 16, 72, 32, 4, "#000000", 0.35);
  px(g, bodyX + 6 + legSpread, bodyY + 48, 8, 18, p.bodyDark);
  px(g, bodyX + 18 - legSpread, bodyY + 48, 8, 18, p.bodyDark);
  px(g, bodyX + 6 + legSpread, bodyY + 62, 9, 4, p.outline);
  px(g, bodyX + 18 - legSpread, bodyY + 62, 9, 4, p.outline);
  px(g, bodyX + 4, bodyY + 22, 24, 28, p.outline);
  px(g, bodyX + 6, bodyY + 24, 20, 24, p.body);
  px(g, bodyX + 8, bodyY + 28, 16, 8, p.accent, 0.85);
  px(g, bodyX + 8, bodyY + 6, 16, 16, p.outline);
  px(g, bodyX + 10, bodyY + 8, 12, 12, p.body);
  px(g, bodyX + 16, bodyY + 12, 4, 4, p.eye);
  px(g, bodyX + 17, bodyY + 12, 1, 1, "#ffffff");
  px(g, bodyX + 8, bodyY + 4, 16, 4, p.accent2);
  px(g, bodyX + 20, bodyY + 2, 6, 6, p.accent2);

  if (armExt > 0) {
    px(g, bodyX + 22, bodyY + armY, armExt, 5, p.bodyDark);
  } else {
    px(g, bodyX + 24, bodyY + 30, 6, 14, p.bodyDark);
  }

  if (pose === "block" || pose === "parry") {
    const col = pose === "parry" ? "#ffe66d" : "#9ad7ff";
    px(g, bodyX + 28, bodyY + 18, 6, 22, col, 0.9);
  }
  if (pose === "parry") {
    px(g, bodyX - 2, bodyY + 16, 4, 4, "#ffe66d", 0.8);
    px(g, bodyX + 30, bodyY + 10, 4, 4, "#ffe66d", 0.8);
  }
}

function drawWeapon(g: Phaser.GameObjects.Graphics, w: WeaponDef, pose: string) {
  // 80x80 canvas, pivot near hand ~ (28, 40) facing right
  const metal = w.metal;
  const grip = w.grip;
  const extend =
    pose === "light" ? 10 : pose === "heavy" ? 14 : pose === "special" ? 16 : 0;
  const hx = 28 + extend;
  const hy = pose === "heavy" ? 28 : pose === "special" ? 34 : 36;

  switch (w.id) {
    case "fists":
      px(g, hx + 4, hy, 10, 10, metal, 0.9);
      px(g, hx + 6, hy + 2, 6, 6, grip, 0.5);
      break;
    case "nunchaku":
      px(g, hx, hy, 10, 5, metal);
      px(g, hx + 10, hy + 1, 8, 2, "#888888");
      px(g, hx + 18, hy - 2 + (pose === "special" ? 6 : 0), 10, 5, metal);
      break;
    case "sword":
      px(g, hx, hy + 2, 6, 6, grip);
      px(g, hx + 4, hy, 4, 10, "#888888");
      px(g, hx + 8, hy + 3, 22 + extend, 4, metal);
      px(g, hx + 28 + extend, hy + 2, 4, 6, "#ffffff", 0.7);
      break;
    case "spear":
      px(g, hx - 4, hy + 2, 36 + extend, 3, metal);
      px(g, hx - 6, hy, 6, 7, grip);
      px(g, hx + 30 + extend, hy, 10, 7, "#e8e8e8");
      break;
    case "knives":
      px(g, hx, hy, 4, 5, grip);
      px(g, hx + 4, hy + 1, 14 + extend / 2, 3, metal);
      px(g, hx + 2, hy + 10, 4, 5, grip);
      px(g, hx + 6, hy + 11, 12 + extend / 2, 3, metal);
      break;
    case "staff":
      px(g, hx - 6, hy + 2, 40 + extend, 4, metal);
      px(g, hx + 8, hy, 6, 8, grip);
      break;
    default:
      px(g, hx, hy, 16, 4, metal);
  }
}

function drawWeaponIcon(g: Phaser.GameObjects.Graphics, w: WeaponDef) {
  px(g, 0, 0, 48, 48, "#120f1c");
  px(g, 2, 2, 44, 44, w.grip, 0.35);
  // reuse simplified weapon
  drawWeapon(g, w, "idle");
}

function drawPortrait(g: Phaser.GameObjects.Graphics, p: CharacterPalette) {
  px(g, 0, 0, 64, 80, "#120f1c");
  px(g, 2, 2, 60, 76, p.outline);
  px(g, 4, 4, 56, 72, "#0a0814");
  px(g, 12, 18, 40, 40, p.body, 0.15);
  px(g, 8, 52, 48, 20, p.bodyDark);
  px(g, 12, 48, 40, 18, p.body);
  px(g, 18, 14, 28, 28, p.outline);
  px(g, 20, 16, 24, 24, p.body);
  px(g, 24, 24, 6, 6, p.eye);
  px(g, 34, 24, 6, 6, p.eye);
  px(g, 26, 25, 2, 2, "#ffffff");
  px(g, 36, 25, 2, 2, "#ffffff");
  px(g, 16, 10, 32, 8, p.accent2);
  px(g, 28, 4, 8, 10, p.accent);
  px(g, 4, 70, 56, 6, p.accent2);
}

export function bakeUiTextures(scene: Phaser.Scene) {
  if (!scene.textures.exists("pixel_white")) {
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 4, 4);
    g.generateTexture("pixel_white", 4, 4);
    g.destroy();
  }
  if (!scene.textures.exists("starfield")) {
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x0a0814, 1);
    g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 28; i++) {
      const x = (i * 37) % 128;
      const y = (i * 53) % 128;
      g.fillStyle(0xffffff, 0.25 + (i % 4) * 0.1);
      g.fillRect(x, y, 1, 1);
    }
    g.generateTexture("starfield", 128, 128);
    g.destroy();
  }
  if (!scene.textures.exists("arena_floor")) {
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x1a1630, 1);
    g.fillRect(0, 0, 64, 32);
    g.fillStyle(0x2a2448, 1);
    g.fillRect(0, 0, 64, 4);
    g.fillStyle(0x6ef3ff, 0.3);
    g.fillRect(0, 0, 64, 2);
    g.generateTexture("arena_floor", 64, 32);
    g.destroy();
  }
}

export function bakeStageTextures(scene: Phaser.Scene) {
  if (scene.textures.exists("stage_neon")) return;
  const g = scene.make.graphics({ x: 0, y: 0 });
  // fewer gradient steps for cheaper bake
  for (let y = 0; y < 360; y += 2) {
    const t = y / 360;
    const r = Math.floor(10 + t * 20);
    const gr = Math.floor(8 + t * 10);
    const b = Math.floor(24 + t * 40);
    g.fillStyle(Phaser.Display.Color.GetColor(r, gr, b), 1);
    g.fillRect(0, y, 800, 2);
  }
  for (let i = 0; i < 14; i++) {
    const x = i * 58;
    const h = 50 + (i * 19) % 80;
    g.fillStyle(0x0c0a18, 1);
    g.fillRect(x, 360 - h, 40, h);
    g.fillStyle(0x6ef3ff, 0.12);
    g.fillRect(x + 6, 360 - h + 10, 6, 6);
  }
  g.fillStyle(0xe8e4ff, 0.85);
  g.fillRect(640, 48, 32, 32);
  g.generateTexture("stage_neon", 800, 360);
  g.destroy();
}
