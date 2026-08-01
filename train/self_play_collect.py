#!/usr/bin/env python3
"""Generate synthetic trajectories (AI vs AI) so Mirror BC can be tested without play."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from bit_duel.ai.scripted import make_scripted
from bit_duel.core.match import Match
from bit_duel.logging.trajectories import save_match_logs


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--matches", type=int, default=20)
    parser.add_argument("--p0", type=str, default="aggressive")
    parser.add_argument("--p1", type=str, default="turtle")
    parser.add_argument(
        "--out",
        type=Path,
        default=ROOT / "data" / "trajectories",
    )
    parser.add_argument("--seed", type=int, default=0)
    args = parser.parse_args()

    for i in range(args.matches):
        m = Match()
        m.reset()
        p0 = make_scripted(args.p0, seed=args.seed + i)
        p1 = make_scripted(args.p1, seed=args.seed + 1000 + i)
        while not m.done:
            a0 = p0.act(m, 0)
            a1 = p1.act(m, 1)
            m.step(a0, a1, record=True)
        path = save_match_logs(
            m.logs,
            out_dir=args.out,
            player_side=0,
            tag=f"synth_{args.p0}",
            result=m.result.__dict__ if m.result else None,
            meta={"p0": args.p0, "p1": args.p1, "match_i": i},
        )
        print(f"[{i+1}/{args.matches}] winner={m.result.winner if m.result else None} → {path.name}")


if __name__ == "__main__":
    main()
