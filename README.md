# BIT·DUEL

A **pixel-art 1v1 arena fighter** with shield, parry, stamina, character select — and a path to **RL final bosses**.

## Play (recommended): web client

The main game is a **Phaser** app under `web/`. It looks like a proper bit-art game and **can be hosted on GitHub Pages**.

```bash
cd web
npm install
npm run dev
# → http://localhost:5173
```

**Controls:** A/D move · W jump · J light · K heavy · L shield/parry · Enter confirm · Esc back

See [`web/README.md`](web/README.md) for deploy details.

### GitHub Pages — yes

| | |
|--|--|
| **Can this live on GitHub Pages?** | **Yes** — the `web/` build is static HTML/JS/CSS. |
| **Can the Python/Pygame version?** | **No** — Pages has no Python runtime. |
| **Can RL train on Pages?** | **No** — train offline; optionally ship trained weights later (e.g. ONNX in browser). |

Deploy: push `web/` and enable the included workflow [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml)  
(Settings → Pages → Source: **GitHub Actions**), or run `npm run build` and publish `web/dist/`.

---

## Characters

| Fighter | Role |
|---------|------|
| **ION** | Balanced cyan striker |
| **EMBER** | Heavy, slower, hard hits |
| **NULL** | Fast glass cannon |
| **ROOT** | Tank + stamina well |
| **ECHO** | Stylish mid-range all-rounder |

## Combat (shared design)

- **Stamina** — walking, jumping, attacking, shielding  
- **Shield** — hold L (chip + STA cost)  
- **Parry** — tap L in the gold window as a hit lands → **counter damage**  
- **Whiff** — tap-and-release in the window with no hit → long punish recovery  
- **Guard break** — 0 STA on a blocked hit  

## Python stack (RL / headless)

Still under `bit_duel/` for training Mirror & Counter:

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m bit_duel.game.play --opponent aggressive   # pygame prototype
python train/train_mirror.py
python train/train_counter.py --opponent models/mirror.pt
pytest -q
```

| Boss | How it learns |
|------|----------------|
| **Mirror** | Behavioral clone of your logs |
| **Counter** | PPO best-response vs Mirror |

## Layout

```
bit-duel/
  web/                 ← playable art game (GitHub Pages)
  bit_duel/            ← Python combat + pygame + RL hooks
  train/               ← Mirror BC + Counter PPO
  tests/
```
