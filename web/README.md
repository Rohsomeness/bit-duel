# BIT·DUEL (web)

Pixel-art arena fighter built with **Phaser 3 + Vite**.  
This is the **playable, shippable** client — designed for **GitHub Pages**.

## GitHub Pages — yes

GitHub Pages only hosts **static** files (HTML/CSS/JS).  
Pygame cannot run there. This web build **can**.

| Layer | Runs on GH Pages? | Role |
|--------|-------------------|------|
| `web/` (this) | **Yes** | Game, art, UI, scripted CPU |
| `../bit_duel` Python | No (local/CI) | RL training, Gym env, logs |

**Deploy options**

1. **Project Pages** from this folder’s `dist/`:
   ```bash
   npm run build
   # upload / push contents of dist/ to gh-pages branch
   # or use GitHub Action peaceiris/actions-gh-pages
   ```
2. **Subfolder** of an existing site (e.g. `rohsomeness.github.io/bit-duel/`) — `base: './'` already supports relative paths.
3. **Local**: `npm run dev` → http://localhost:5173

RL bosses (Mirror / Counter) stay offline for now; export ONNX → `onnxruntime-web` later if you want them in-browser.

## Develop

```bash
cd web
npm install
npm run dev
```

```bash
npm run build    # → dist/
npm run preview  # serve dist locally
```

## Flow

1. **Title** — neon splash  
2. **Character select** — 5 fighters + CPU style  
3. **Fight** — stamina / shield / parry  
4. **Result** — rematch or roster  

## Controls

| Key | Action |
|-----|--------|
| A/D or ←/→ | Move (stamina) |
| W / ↑ / Space | Jump |
| J / Z | Light |
| K / X | Heavy |
| L / C / Shift | Shield · tap to parry |
| Enter | Confirm / rematch |
| Esc | Back / title |

## Characters

| ID | Vibe |
|----|------|
| **ION** | Balanced cyan |
| **EMBER** | Heavy red |
| **NULL** | Fast glass purple |
| **ROOT** | Tanky green stamina |
| **ECHO** | Stylish pink |

Sprites are **procedural pixel art** baked at boot (no huge asset pack). Swap in hand-drawn sheets later under the same texture keys.
