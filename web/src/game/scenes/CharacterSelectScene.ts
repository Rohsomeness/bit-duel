import Phaser from "phaser";
import * as C from "../combat/constants";
import { CHARACTERS, OPPONENTS, type OpponentKind } from "../data/characters";
import { WEAPONS } from "../data/weapons";
import { REG, type GameSelection } from "../registry";

type Panel = "player" | "pWeapon" | "rival" | "rWeapon" | "ai";

export class CharacterSelectScene extends Phaser.Scene {
  private pIndex = 0;
  private rIndex = 1;
  private pwIndex = 0;
  private rwIndex = 2; // sword default for rival
  private aiIndex = 0;
  private focus: Panel = "player";

  private pPortrait!: Phaser.GameObjects.Image;
  private rPortrait!: Phaser.GameObjects.Image;
  private pName!: Phaser.GameObjects.Text;
  private rName!: Phaser.GameObjects.Text;
  private pWep!: Phaser.GameObjects.Text;
  private rWep!: Phaser.GameObjects.Text;
  private pWepIcon!: Phaser.GameObjects.Image;
  private rWepIcon!: Phaser.GameObjects.Image;
  private aiLabel!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private focusLabel!: Phaser.GameObjects.Text;
  private pFrame!: Phaser.GameObjects.Rectangle;
  private rFrame!: Phaser.GameObjects.Rectangle;

  constructor() {
    super("CharacterSelect");
  }

  create() {
    const w = C.STAGE_WIDTH;
    const h = C.STAGE_HEIGHT;

    this.add.image(w / 2, h / 2, "starfield").setDisplaySize(w, h).setAlpha(0.85);

    this.add
      .text(w / 2, 22, "ARMORY · SELECT", {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "14px",
        color: "#e8e4ff",
      })
      .setOrigin(0.5);

    this.add
      .text(w / 2, 46, "← → change   TAB panel   ENTER fight", {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "7px",
        color: "#7a7599",
      })
      .setOrigin(0.5);

    // Player card
    this.pFrame = this.add.rectangle(190, 200, 240, 250, 0x120f1c, 0.95).setStrokeStyle(2, 0x2a2540);
    this.add
      .text(190, 90, "YOU", {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "8px",
        color: "#6ef3ff",
      })
      .setOrigin(0.5);
    this.pPortrait = this.add.image(190, 160, "char_ion_portrait").setScale(1.8);
    this.pName = this.add
      .text(190, 240, "ION", {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "11px",
        color: "#6ef3ff",
      })
      .setOrigin(0.5);
    this.pWepIcon = this.add.image(150, 280, "wpn_fists_icon").setScale(1.2);
    this.pWep = this.add
      .text(210, 280, "FISTS", {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "8px",
        color: "#c4c0e0",
      })
      .setOrigin(0, 0.5);

    // Rival card
    this.rFrame = this.add.rectangle(610, 200, 240, 250, 0x120f1c, 0.95).setStrokeStyle(2, 0x2a2540);
    this.add
      .text(610, 90, "RIVAL", {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "8px",
        color: "#ff6b9d",
      })
      .setOrigin(0.5);
    this.rPortrait = this.add.image(610, 160, "char_ember_portrait").setScale(1.8);
    this.rName = this.add
      .text(610, 240, "EMBER", {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "11px",
        color: "#ff7a45",
      })
      .setOrigin(0.5);
    this.rWepIcon = this.add.image(570, 280, "wpn_sword_icon").setScale(1.2);
    this.rWep = this.add
      .text(630, 280, "SWORD", {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "8px",
        color: "#c4c0e0",
      })
      .setOrigin(0, 0.5);

    this.add
      .text(w / 2, 190, "VS", {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "16px",
        color: "#ff6b9d",
      })
      .setOrigin(0.5);

    this.focusLabel = this.add
      .text(w / 2, 340, "", {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "9px",
        color: "#ffe66d",
      })
      .setOrigin(0.5);

    this.aiLabel = this.add
      .text(w / 2, 365, "", {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "9px",
        color: "#6ef3ff",
      })
      .setOrigin(0.5);

    this.hint = this.add
      .text(w / 2, 400, "", {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "7px",
        color: "#7a7599",
        align: "center",
        wordWrap: { width: 640 },
      })
      .setOrigin(0.5);

    this.add
      .text(w / 2, 430, "J light chain  ·  K heavy  ·  I special  ·  L shield", {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "6px",
        color: "#4a4660",
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
      this.cycleFocus(1);
    });
    kb.on("keydown-UP", () => this.cycleFocus(-1));
    kb.on("keydown-DOWN", () => this.cycleFocus(1));
    kb.on("keydown-ENTER", () => this.confirm());
    kb.on("keydown-SPACE", () => this.confirm());
  }

  private panels: Panel[] = ["player", "pWeapon", "rival", "rWeapon", "ai"];

  private cycleFocus(dir: number) {
    const i = this.panels.indexOf(this.focus);
    this.focus = this.panels[(i + dir + this.panels.length) % this.panels.length];
    this.refresh();
  }

  private nudge(dir: number) {
    if (this.focus === "player") {
      this.pIndex = (this.pIndex + dir + CHARACTERS.length) % CHARACTERS.length;
    } else if (this.focus === "rival") {
      this.rIndex = (this.rIndex + dir + CHARACTERS.length) % CHARACTERS.length;
    } else if (this.focus === "pWeapon") {
      this.pwIndex = (this.pwIndex + dir + WEAPONS.length) % WEAPONS.length;
    } else if (this.focus === "rWeapon") {
      this.rwIndex = (this.rwIndex + dir + WEAPONS.length) % WEAPONS.length;
    } else {
      this.aiIndex = (this.aiIndex + dir + OPPONENTS.length) % OPPONENTS.length;
    }
    this.refresh();
  }

  private refresh() {
    const p = CHARACTERS[this.pIndex];
    const r = CHARACTERS[this.rIndex];
    const pw = WEAPONS[this.pwIndex];
    const rw = WEAPONS[this.rwIndex];
    const ai = OPPONENTS[this.aiIndex];

    this.pPortrait.setTexture(`char_${p.id}_portrait`);
    this.rPortrait.setTexture(`char_${r.id}_portrait`);
    this.pName.setText(p.name).setColor(p.palette.body);
    this.rName.setText(r.name).setColor(r.palette.body);
    this.pWep.setText(pw.name);
    this.rWep.setText(rw.name);
    this.pWepIcon.setTexture(`wpn_${pw.id}_icon`);
    this.rWepIcon.setTexture(`wpn_${rw.id}_icon`);

    const focusColor = (panel: Panel, activeHex: number, idle = 0x2a2540) =>
      this.focus === panel ? activeHex : idle;

    this.pFrame.setStrokeStyle(
      3,
      focusColor("player", 0x6ef3ff) === 0x6ef3ff || this.focus === "pWeapon"
        ? 0x6ef3ff
        : 0x2a2540
    );
    this.rFrame.setStrokeStyle(
      3,
      this.focus === "rival" || this.focus === "rWeapon" ? 0xff6b9d : 0x2a2540
    );

    const labels: Record<Panel, string> = {
      player: "▸ FIGHTER (YOU)",
      pWeapon: "▸ WEAPON (YOU)",
      rival: "▸ FIGHTER (RIVAL)",
      rWeapon: "▸ WEAPON (RIVAL)",
      ai: "▸ CPU STYLE",
    };
    this.focusLabel.setText(labels[this.focus]);

    this.aiLabel.setText(`CPU: ${ai.label}`);
    this.aiLabel.setColor(this.focus === "ai" ? "#ffe66d" : "#6ef3ff");

    let blurb = "";
    if (this.focus === "player") blurb = p.blurb;
    else if (this.focus === "rival") blurb = r.blurb;
    else if (this.focus === "pWeapon") blurb = `${pw.title} — ${pw.blurb}`;
    else if (this.focus === "rWeapon") blurb = `${rw.title} — ${rw.blurb}`;
    else blurb = ai.blurb;
    this.hint.setText(blurb);
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
    this.cameras.main.flash(160, 110, 243, 255);
    this.time.delayedCall(280, () => this.scene.start("Fight"));
  }
}
