#!/usr/bin/env python3
"""Train the Mirror boss via behavioral cloning on player trajectories."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np
import torch
import torch.nn.functional as F
from torch.utils.data import DataLoader, TensorDataset

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from bit_duel.ai.bc_model import ActionMLP
from bit_duel.core.actions import NUM_ACTIONS
from bit_duel.logging.trajectories import load_dataset


def main() -> None:
    parser = argparse.ArgumentParser(description="Train Mirror (BC) from player logs")
    parser.add_argument(
        "--data",
        type=Path,
        default=ROOT / "data" / "trajectories",
        help="Directory of .npz trajectory files",
    )
    parser.add_argument("--epochs", type=int, default=30)
    parser.add_argument("--batch-size", type=int, default=256)
    parser.add_argument("--lr", type=float, default=1e-3)
    parser.add_argument(
        "--out",
        type=Path,
        default=ROOT / "models" / "mirror.pt",
    )
    args = parser.parse_args()

    obs, actions = load_dataset(args.data)
    print(f"Loaded {len(actions)} steps from {args.data}")
    print(f"Action histogram: {np.bincount(actions, minlength=NUM_ACTIONS)}")

    obs_t = torch.from_numpy(obs).float()
    act_t = torch.from_numpy(actions).long()
    loader = DataLoader(
        TensorDataset(obs_t, act_t), batch_size=args.batch_size, shuffle=True
    )

    model = ActionMLP(obs_dim=obs.shape[1], n_actions=NUM_ACTIONS)
    opt = torch.optim.Adam(model.parameters(), lr=args.lr)

    model.train()
    for epoch in range(1, args.epochs + 1):
        total_loss = 0.0
        correct = 0
        n = 0
        for xb, yb in loader:
            logits = model(xb)
            loss = F.cross_entropy(logits, yb)
            opt.zero_grad()
            loss.backward()
            opt.step()
            total_loss += float(loss.item()) * len(yb)
            correct += int((logits.argmax(-1) == yb).sum().item())
            n += len(yb)
        print(
            f"epoch {epoch:03d}  loss={total_loss / n:.4f}  acc={correct / n:.3f}"
        )

    args.out.parent.mkdir(parents=True, exist_ok=True)
    torch.save(
        {
            "state_dict": model.state_dict(),
            "obs_dim": obs.shape[1],
            "n_actions": NUM_ACTIONS,
        },
        args.out,
    )
    print(f"Saved Mirror policy → {args.out}")


if __name__ == "__main__":
    main()
