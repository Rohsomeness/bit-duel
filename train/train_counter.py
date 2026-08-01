#!/usr/bin/env python3
"""Train the Counter boss with PPO against a frozen opponent (usually Mirror)."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from stable_baselines3 import PPO
from stable_baselines3.common.env_util import make_vec_env

from bit_duel.ai.policies import load_policy
from bit_duel.env.gym_env import BitDuelEnv


def main() -> None:
    parser = argparse.ArgumentParser(description="Train Counter (PPO best-response)")
    parser.add_argument(
        "--opponent",
        type=str,
        default="aggressive",
        help="Policy spec: aggressive|turtle|jumpy|path/to/mirror.pt",
    )
    parser.add_argument("--timesteps", type=int, default=200_000)
    parser.add_argument("--n-envs", type=int, default=4)
    parser.add_argument(
        "--out",
        type=Path,
        default=ROOT / "models" / "counter.zip",
    )
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    def _make():
        opp = load_policy(args.opponent, seed=args.seed)
        return BitDuelEnv(opponent=opp, seed=args.seed)

    env = make_vec_env(_make, n_envs=args.n_envs, seed=args.seed)
    model = PPO(
        "MlpPolicy",
        env,
        verbose=1,
        seed=args.seed,
        n_steps=1024,
        batch_size=256,
        learning_rate=3e-4,
        gamma=0.99,
        ent_coef=0.01,
    )
    model.learn(total_timesteps=args.timesteps)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    model.save(str(args.out))
    print(f"Saved Counter policy → {args.out}")


if __name__ == "__main__":
    main()
