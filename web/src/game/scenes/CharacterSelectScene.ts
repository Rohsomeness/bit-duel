import Phaser from "phaser";
import * as C from "../combat/constants";
import { CHARACTERS, OPPONENTS, type CharacterDef, type OpponentKind } from "../data/characters";
import { REG, type GameSelection } from "../registry";

export class CharacterSelectScene extends Phaser.Scene {
  private pIndex = 0;
  private rIndex = 1;
  private aiIndex = 0;
  private focus: "player" | "rival" | "ai" = "player";

  private cardPlayer!: Phaser.GameObjects.Container;
  private cardRival!: Phaser.GameObjects.Container;
  private aiLabel!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private confirmFlash?: Phaser.GameObjects.Text;

  constructor() {
    super("CharacterSelect");
  }

  create() {
    const w = C.STAGE_WIDTH;
    const h = C.STAGE_HEIGHT;

    this.add.tileSprite(w / 2, h / 2, w, h, "starfield");
    this.add
      .text(w / 2, 28, "SELECT YOUR SIGNAL", {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "14px",
        color: "#e8e4ff",
      })
      .setOrigin(0.5);

    this.add
      .text(w / 2, 52, "← → change   ·   TAB switch panel   ·   ENTER fight", {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "7px",
        color: "#7a7599",
      })
      .setOrigin(0.5);

    this.cardPlayer = this.buildCard(200, 230, true);
    this.cardRival = this.buildCard(600, 230, false);

    this.add
      .text(w / 2, 200, "VS", {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "18px",
        color: "#ff6b9d",
      })
      .setOrigin(0.5);

    this.aiLabel = this.add
      .text(w / 2, 360, "", {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "10px",
        color: "#6ef3ff",
        align: "center",
      })
      .setOrigin(0.5);

    this.hint = this.add
      .text(w / 2, 400, "", {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "7px",
        color: "#7a7599",
        align: "center",
        wordWrap: { width: 600 },
      })
      .setOrigin(0.5);

    this.refresh();

    const kb = this.input.keyboard!;
    kb.on("keydown-LEFT", () => this.nudge(-1));
    kb.on("keydown-RIGHT", () => this.nudge(1));
    kb.on("keydown-A", () => this.nudge(-1));
    kb.on("keydown-D", () => this.nudge(1));
    kb.on("keydown-TAB", (e: KeyboardEvent) => {
      e.preventDefault();
      this.cycleFocus();
    });
    kb.on("keydown-UP", () => this.cycleFocus(-1));
    kb.on("keydown-DOWN", () => this.cycleFocus(1));
    kb.on("keydown-ENTER", () => this.confirm());
    kb.on("keydown-SPACE", () => this.confirm());
  }

  private buildCard(x: number, y: number, isPlayer: boolean) {
    const c = this.add.container(x, y);
    const frame = this.add.rectangle(0, 0, 220, 260, 0x120f1c, 0.95).setStrokeStyle(2, 0x2a2540);
    const portrait = this.add.image(0, -40, "char_ion_portrait").setScale(2);
    const name = this.add
      .text(0, 50, "ION", {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "12px",
        color: "#6ef3ff",
      })
      .setOrigin(0.5);
    const title = this.add
      .text(0, 72, "title", {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "7px",
        color: "#7a7599",
      })
      .setOrigin(0.5);
    const stats = this.add
      .text(0, 100, "", {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "6px",
        color: "#c4c0e0",
        align: "center",
        lineSpacing: 6,
      })
      .setOrigin(0.5);
    const tag = this.add
      .text(0, -118, isPlayer ? "YOU" : "RIVAL", {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "8px",
        color: isPlayer ? "#6ef3ff" : "#ff6b9d",
      })
      .setOrigin(0.5);

    c.add([frame, portrait, name, title, stats, tag]);
    (c as unknown as { frame: Phaser.GameObjects.Rectangle }).frame = frame;
    (c as unknown as { portrait: Phaser.GameObjects.Image }).portrait = portrait;
    (c as unknown as { name: Phaser.GameObjects.Text }).name = name;
    (c as unknown as { title: Phaser.GameObjects.Text }).title = title;
    (c as unknown as { stats: Phaser.GameObjects.Text }).stats = stats;
    return c;
  }

  private fillCard(card: Phaser.GameObjects.Container, char: CharacterDef, active: boolean) {
    const frame = (card as unknown as { frame: Phaser.GameObjects.Rectangle }).frame;
    const portrait = (card as unknown as { portrait: Phaser.GameObjects.Image }).portrait;
    const name = (card as unknown as { name: Phaser.GameObjects.Text }).name;
    const title = (card as unknown as { title: Phaser.GameObjects.Text }).title;
    const stats = (card as unknown as { stats: Phaser.GameObjects.Text }).stats;

    portrait.setTexture(`char_${char.id}_portrait`);
    name.setText(char.name).setColor(char.palette.body);
    title.setText(char.title);
    stats.setText(
      [
        `HP ${bar(char.stats.hp)}`,
        `STA ${bar(char.stats.stamina)}`,
        `SPD ${bar(char.stats.speed)}`,
        `DMG ${bar(char.stats.damage)}`,
      ].join("\n")
    );
    frame.setStrokeStyle(3, active ? Phaser.Display.Color.HexStringToColor(char.palette.body).color : 0x2a2540);
    this.tweens.add({
      targets: card,
      scale: active ? 1.04 : 1,
      duration: 120,
    });
  }

  private nudge(dir: number) {
    if (this.focus === "player") {
      this.pIndex = (this.pIndex + dir + CHARACTERS.length) % CHARACTERS.length;
    } else if (this.focus === "rival") {
      this.rIndex = (this.rIndex + dir + CHARACTERS.length) % CHARACTERS.length;
    } else {
      this.aiIndex = (this.aiIndex + dir + OPPONENTS.length) % OPPONENTS.length;
    }
    this.refresh();
  }

  private cycleFocus(dir = 1) {
    const order: Array<"player" | "rival" | "ai"> = ["player", "rival", "ai"];
    const i = order.indexOf(this.focus);
    this.focus = order[(i + dir + order.length) % order.length];
    this.refresh();
  }

  private refresh() {
    const p = CHARACTERS[this.pIndex];
    const r = CHARACTERS[this.rIndex];
    const ai = OPPONENTS[this.aiIndex];
    this.fillCard(this.cardPlayer, p, this.focus === "player");
    this.fillCard(this.cardRival, r, this.focus === "rival");

    const aiActive = this.focus === "ai";
    this.aiLabel.setText(
      `${aiActive ? "▸ " : ""}CPU STYLE: ${ai.label}${aiActive ? " ◂" : ""}`
    );
    this.aiLabel.setColor(aiActive ? "#ffe66d" : "#6ef3ff");

    const blurb =
      this.focus === "player"
        ? p.blurb
        : this.focus === "rival"
          ? r.blurb
          : ai.blurb;
    this.hint.setText(blurb);
  }

  private confirm() {
    const selection: GameSelection = {
      player: CHARACTERS[this.pIndex],
      rival: CHARACTERS[this.rIndex],
      opponentAI: OPPONENTS[this.aiIndex].id as OpponentKind,
    };
    this.registry.set(REG.selection, selection);

    this.confirmFlash = this.add
      .text(C.STAGE_WIDTH / 2, C.STAGE_HEIGHT / 2, "ENGAGE", {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "28px",
        color: "#ffe66d",
      })
      .setOrigin(0.5)
      .setDepth(20);
    this.cameras.main.flash(200, 110, 243, 255);
    this.time.delayedCall(420, () => {
      this.scene.start("Fight");
    });
  }
}

function bar(mult: number) {
  // 0.85..1.22 → 1..5 blocks
  const n = Math.max(1, Math.min(5, Math.round((mult - 0.8) / 0.1)));
  return "■".repeat(n) + "□".repeat(5 - n);
}
