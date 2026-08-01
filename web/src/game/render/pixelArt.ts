import Phaser from "phaser";
import type { CharacterDef, CharacterPalette } from "../data/characters";

/** Draw filled pixel rects into a graphics texture helper */
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

/** Generate idle / walk / attack / block frames as textures for a character */
export function bakeCharacterTextures(scene: Phaser.Scene, char: CharacterDef) {
  const p = char.palette;
  const prefix = `char_${char.id}`;
  const frames: { key: string; draw: (g: Phaser.GameObjects.Graphics) => void }[] = [
    { key: `${prefix}_idle`, draw: (g) => drawFighter(g, p, "idle", 0) },
    { key: `${prefix}_walk0`, draw: (g) => drawFighter(g, p, "walk", 0) },
    { key: `${prefix}_walk1`, draw: (g) => drawFighter(g, p, "walk", 1) },
    { key: `${prefix}_jump`, draw: (g) => drawFighter(g, p, "jump", 0) },
    { key: `${prefix}_light`, draw: (g) => drawFighter(g, p, "light", 0) },
    { key: `${prefix}_heavy`, draw: (g) => drawFighter(g, p, "heavy", 0) },
    { key: `${prefix}_block`, draw: (g) => drawFighter(g, p, "block", 0) },
    { key: `${prefix}_parry`, draw: (g) => drawFighter(g, p, "parry", 0) },
    { key: `${prefix}_hit`, draw: (g) => drawFighter(g, p, "hit", 0) },
    { key: `${prefix}_ko`, draw: (g) => drawFighter(g, p, "ko", 0) },
    { key: `${prefix}_portrait`, draw: (g) => drawPortrait(g, p, char) },
  ];

  for (const f of frames) {
    if (scene.textures.exists(f.key)) continue;
    const g = scene.make.graphics({ x: 0, y: 0 });
    f.draw(g);
    g.generateTexture(f.key, 64, 80);
    g.destroy();
  }

  // animations
  if (!scene.anims.exists(`${prefix}_walk`)) {
    scene.anims.create({
      key: `${prefix}_walk`,
      frames: [{ key: `${prefix}_walk0` }, { key: `${prefix}_walk1` }],
      frameRate: 8,
      repeat: -1,
    });
  }
}

function drawFighter(
  g: Phaser.GameObjects.Graphics,
  p: CharacterPalette,
  pose: string,
  frame: number
) {
  // canvas 64x80, feet at y~72, facing right in texture (flip in scene)
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
    armExt = 22;
    armY = 30;
    lean = 3;
  } else if (pose === "heavy") {
    armExt = 28;
    armY = 26;
    lean = 5;
  } else if (pose === "block") {
    crouch = 4;
    armExt = 8;
    armY = 24;
  } else if (pose === "parry") {
    armExt = 10;
    armY = 22;
    lean = -2;
  } else if (pose === "hit") {
    lean = -6;
    oy = 6;
  } else if (pose === "ko") {
    // laid out later as flat
    px(g, 8, 52, 48, 12, p.bodyDark);
    px(g, 10, 48, 44, 10, p.body);
    px(g, 14, 44, 10, 8, p.accent);
    return;
  }

  const bodyX = ox + lean;
  const bodyY = oy + crouch;

  // shadow
  px(g, 16, 72, 32, 4, "#000000", 0.35);

  // legs
  px(g, bodyX + 6 + legSpread, bodyY + 48, 8, 18, p.bodyDark);
  px(g, bodyX + 18 - legSpread, bodyY + 48, 8, 18, p.bodyDark);
  px(g, bodyX + 6 + legSpread, bodyY + 62, 9, 4, p.outline);
  px(g, bodyX + 18 - legSpread, bodyY + 62, 9, 4, p.outline);

  // torso
  px(g, bodyX + 4, bodyY + 22, 24, 28, p.outline);
  px(g, bodyX + 6, bodyY + 24, 20, 24, p.body);
  px(g, bodyX + 8, bodyY + 28, 16, 8, p.accent, 0.85);

  // head
  px(g, bodyX + 8, bodyY + 6, 16, 16, p.outline);
  px(g, bodyX + 10, bodyY + 8, 12, 12, p.body);
  // eye
  px(g, bodyX + 16, bodyY + 12, 4, 4, p.eye);
  px(g, bodyX + 17, bodyY + 12, 1, 1, "#ffffff");
  // hair / crest
  px(g, bodyX + 8, bodyY + 4, 16, 4, p.accent2);
  px(g, bodyX + 20, bodyY + 2, 6, 6, p.accent2);

  // front arm / attack
  if (armExt > 0) {
    px(g, bodyX + 22, bodyY + armY, armExt, 6, p.outline);
    px(g, bodyX + 22, bodyY + armY + 1, armExt - 1, 4, p.accent);
    if (pose === "heavy") {
      px(g, bodyX + 22 + armExt - 6, bodyY + armY - 2, 8, 10, p.accent2);
    }
  } else {
    // idle arm
    px(g, bodyX + 24, bodyY + 30, 6, 14, p.bodyDark);
  }

  // shield plate
  if (pose === "block" || pose === "parry") {
    const col = pose === "parry" ? "#ffe66d" : "#9ad7ff";
    px(g, bodyX + 28, bodyY + 18, 6, 22, col, 0.9);
    px(g, bodyX + 29, bodyY + 20, 3, 18, "#ffffff", 0.35);
  }

  // parry burst
  if (pose === "parry") {
    px(g, bodyX - 2, bodyY + 16, 4, 4, "#ffe66d", 0.8);
    px(g, bodyX + 30, bodyY + 10, 4, 4, "#ffe66d", 0.8);
  }
}

function drawPortrait(g: Phaser.GameObjects.Graphics, p: CharacterPalette, char: CharacterDef) {
  // 64x80 portrait bust
  px(g, 0, 0, 64, 80, "#120f1c");
  px(g, 2, 2, 60, 76, p.outline);
  px(g, 4, 4, 56, 72, "#0a0814");

  // glow
  px(g, 12, 18, 40, 40, p.body, 0.15);

  // shoulders
  px(g, 8, 52, 48, 20, p.bodyDark);
  px(g, 12, 48, 40, 18, p.body);

  // head
  px(g, 18, 14, 28, 28, p.outline);
  px(g, 20, 16, 24, 24, p.body);
  px(g, 24, 24, 6, 6, p.eye);
  px(g, 34, 24, 6, 6, p.eye);
  px(g, 26, 25, 2, 2, "#ffffff");
  px(g, 36, 25, 2, 2, "#ffffff");

  // crest
  px(g, 16, 10, 32, 8, p.accent2);
  px(g, 28, 4, 8, 10, p.accent);

  // accent bar
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

  // starfield tile
  if (!scene.textures.exists("starfield")) {
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x0a0814, 1);
    g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 40; i++) {
      const x = (i * 37) % 128;
      const y = (i * 53) % 128;
      const a = 0.3 + (i % 5) * 0.12;
      g.fillStyle(0xffffff, a);
      g.fillRect(x, y, 1 + (i % 2), 1 + (i % 2));
    }
    g.generateTexture("starfield", 128, 128);
    g.destroy();
  }

  // arena floor strip
  if (!scene.textures.exists("arena_floor")) {
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x1a1630, 1);
    g.fillRect(0, 0, 64, 32);
    g.fillStyle(0x2a2448, 1);
    g.fillRect(0, 0, 64, 4);
    for (let x = 0; x < 64; x += 8) {
      g.fillStyle(0x12101f, 1);
      g.fillRect(x, 8, 1, 24);
    }
    g.fillStyle(0x6ef3ff, 0.25);
    g.fillRect(0, 0, 64, 2);
    g.generateTexture("arena_floor", 64, 32);
    g.destroy();
  }
}

export function bakeStageTextures(scene: Phaser.Scene) {
  if (scene.textures.exists("stage_neon")) return;
  const g = scene.make.graphics({ x: 0, y: 0 });
  // gradient sky
  for (let y = 0; y < 360; y++) {
    const t = y / 360;
    const r = Math.floor(10 + t * 20);
    const gr = Math.floor(8 + t * 10);
    const b = Math.floor(24 + t * 40);
    g.fillStyle(Phaser.Display.Color.GetColor(r, gr, b), 1);
    g.fillRect(0, y, 800, 1);
  }
  // distant city blocks
  for (let i = 0; i < 18; i++) {
    const x = i * 48 + (i % 3) * 6;
    const h = 40 + (i * 17) % 90;
    g.fillStyle(0x0c0a18, 1);
    g.fillRect(x, 360 - h, 36, h);
    g.fillStyle(0x6ef3ff, 0.15 + (i % 4) * 0.05);
    g.fillRect(x + 4, 360 - h + 8, 6, 6);
    g.fillStyle(0xff6b9d, 0.12);
    g.fillRect(x + 18, 360 - h + 20, 6, 6);
  }
  // moon
  g.fillStyle(0xe8e4ff, 0.9);
  g.fillRect(640, 48, 36, 36);
  g.fillStyle(0x1a1430, 1);
  g.fillRect(652, 52, 24, 24);

  g.generateTexture("stage_neon", 800, 360);
  g.destroy();
}
