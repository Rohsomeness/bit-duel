export type CharacterStats = {
  /** Multipliers on base kit */
  hp: number;
  stamina: number;
  speed: number;
  jump: number;
  damage: number;
  knockback: number;
  staminaCost: number;
};

export type CharacterPalette = {
  body: string;
  bodyDark: string;
  accent: string;
  accent2: string;
  eye: string;
  outline: string;
  glow: string;
};

export type CharacterDef = {
  id: string;
  name: string;
  title: string;
  blurb: string;
  palette: CharacterPalette;
  stats: CharacterStats;
  /** Decorative sigil for select screen */
  sigil: "bolt" | "flame" | "moon" | "leaf" | "diamond";
};

const balanced: CharacterStats = {
  hp: 1,
  stamina: 1,
  speed: 1,
  jump: 1,
  damage: 1,
  knockback: 1,
  staminaCost: 1,
};

export const CHARACTERS: CharacterDef[] = [
  {
    id: "ion",
    name: "ION",
    title: "Circuit Striker",
    blurb: "Balanced voltage. Clean confirms. The default rhythm of the arena.",
    sigil: "bolt",
    palette: {
      body: "#6ef3ff",
      bodyDark: "#1a8fa8",
      accent: "#e8ffff",
      accent2: "#ff6b9d",
      eye: "#0a2030",
      outline: "#0c3040",
      glow: "#6ef3ff88",
    },
    stats: { ...balanced },
  },
  {
    id: "ember",
    name: "EMBER",
    title: "Ashen Knuckle",
    blurb: "Heavy fists, slower feet. One clean heavy rewrites the round.",
    sigil: "flame",
    palette: {
      body: "#ff7a45",
      bodyDark: "#a83218",
      accent: "#ffd29a",
      accent2: "#ff3d5a",
      eye: "#2a1008",
      outline: "#3a1408",
      glow: "#ff7a4588",
    },
    stats: {
      hp: 1.05,
      stamina: 0.95,
      speed: 0.88,
      jump: 0.95,
      damage: 1.18,
      knockback: 1.12,
      staminaCost: 1.05,
    },
  },
  {
    id: "null",
    name: "NULL",
    title: "Hollow Step",
    blurb: "Glass and glitter. Fast, fragile, lives in the parry window.",
    sigil: "moon",
    palette: {
      body: "#c084fc",
      bodyDark: "#6b21a8",
      accent: "#f5d0fe",
      accent2: "#67e8f9",
      eye: "#1e0a30",
      outline: "#2e1065",
      glow: "#c084fc88",
    },
    stats: {
      hp: 0.88,
      stamina: 1.05,
      speed: 1.18,
      jump: 1.12,
      damage: 0.95,
      knockback: 0.95,
      staminaCost: 0.92,
    },
  },
  {
    id: "root",
    name: "ROOT",
    title: "Stone Garden",
    blurb: "Deep stamina well. Turtle the storm, then plant a heavy.",
    sigil: "leaf",
    palette: {
      body: "#4ade80",
      bodyDark: "#166534",
      accent: "#d9f99d",
      accent2: "#fbbf24",
      eye: "#052e16",
      outline: "#14532d",
      glow: "#4ade8088",
    },
    stats: {
      hp: 1.12,
      stamina: 1.22,
      speed: 0.9,
      jump: 0.9,
      damage: 0.95,
      knockback: 1.05,
      staminaCost: 0.88,
    },
  },
  {
    id: "echo",
    name: "ECHO",
    title: "Mirror Bloom",
    blurb: "Stylish pressure. Mid stats, loud palette — a showman's blade.",
    sigil: "diamond",
    palette: {
      body: "#f472b6",
      bodyDark: "#9d174d",
      accent: "#fce7f3",
      accent2: "#a5b4fc",
      eye: "#3b0764",
      outline: "#831843",
      glow: "#f472b688",
    },
    stats: {
      hp: 0.98,
      stamina: 1.0,
      speed: 1.06,
      jump: 1.05,
      damage: 1.04,
      knockback: 1.0,
      staminaCost: 1.0,
    },
  },
];

export function getCharacter(id: string): CharacterDef {
  const c = CHARACTERS.find((x) => x.id === id);
  if (!c) throw new Error(`Unknown character: ${id}`);
  return c;
}

export type OpponentKind = "aggressive" | "turtle" | "jumpy";

export const OPPONENTS: { id: OpponentKind; label: string; blurb: string }[] = [
  { id: "aggressive", label: "RUSH", blurb: "Closes space. Throws hands." },
  { id: "turtle", label: "SHELL", blurb: "Blocks, waits, punishes." },
  { id: "jumpy", label: "DRIFT", blurb: "Air-happy mixups." },
];
