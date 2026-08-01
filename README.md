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

## Weapons (Shadow Fight–style kits)

Each weapon has **light**, optional **light2 chain**, **heavy**, and **special**:

| Weapon | Reach | Identity |
|--------|-------|----------|
| **Fists** | Short | Fast jabs, flurry |
| **Nunchaku** | Mid | Whips + cyclone |
| **Sword** | Mid | Cuts, cleave, lunge |
| **Spear** | Long | Pokes, impale |
| **Knives** | Short | Rapid shred |
| **Staff** | Mid | Sweep control |

## Combat

- **Stamina** — walk, jump, attacks, shield  
- **J** light (+ chain) · **K** heavy · **I** special · **L** shield/parry  
- **Parry** — counter damage · **Whiff** — punish recovery · **Guard break** on 0 STA  

## Tests

```bash
cd web && npm test    # 12 combat tests
cd .. && pytest -q    # python prototype (older kit)
```


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
