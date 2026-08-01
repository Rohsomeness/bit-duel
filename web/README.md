# BIT·DUEL (web)

Shadow Fight–inspired **pixel arena** with **six weapons**, unique movesets, stamina/shield/parry.

## Play

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # combat unit tests
npm run build
```

**Live:** https://rohsomeness.github.io/bit-duel/

## Controls

| Key | Action |
|-----|--------|
| A/D | Move (stamina) |
| W / Space | Jump |
| **J** | Light (tap again in recovery for **light2** chain) |
| **K** | Heavy |
| **I** / U | Weapon **special** |
| **L** | Shield · tap to **parry** |
| Tab / ↑↓ | Select panels |
| Enter | Confirm / rematch |
| Esc | Back |

## Weapons

| Weapon | Feel |
|--------|------|
| **Fists** | Short, fast, flurry special |
| **Nunchaku** | Mid whip, cyclone special |
| **Sword** | Mid slash, piercing lunge |
| **Spear** | Long pokes, impale heavy |
| **Knives** | Close shred, fan slash |
| **Staff** | Balanced pole, spin sweep |

## Performance notes

- Sim capped at 2 steps/frame (no spiral-of-death lag)
- No `forceSetTimeOut` (uses rAF)
- Static stage (no scrolling tile sprites)
- Sourcemaps off in production builds
