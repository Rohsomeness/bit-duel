"""Save / load player match trajectories for Mirror (BC) training."""

from __future__ import annotations

import json
import time
from dataclasses import asdict
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

import numpy as np

from bit_duel.core.match import FrameLog, Match


DEFAULT_DIR = Path(__file__).resolve().parents[2] / "data" / "trajectories"


class TrajectoryStore:
    def __init__(self, root: Path | str = DEFAULT_DIR) -> None:
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)

    def save_match(
        self,
        match: Match,
        player_side: int = 0,
        tag: str = "play",
        meta: Optional[Dict[str, Any]] = None,
    ) -> Path:
        return save_match_logs(
            match.logs,
            out_dir=self.root,
            player_side=player_side,
            tag=tag,
            result=asdict(match.result) if match.result else None,
            meta=meta,
        )


def save_match_logs(
    logs: Sequence[FrameLog],
    out_dir: Path | str = DEFAULT_DIR,
    player_side: int = 0,
    tag: str = "play",
    result: Optional[Dict[str, Any]] = None,
    meta: Optional[Dict[str, Any]] = None,
) -> Path:
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    ts = time.strftime("%Y%m%d_%H%M%S")
    # Microseconds + pid-ish uniqueness so rapid saves don't clobber each other
    uniq = f"{ts}_{int(time.time() * 1000000) % 1000000:06d}"
    path = out_dir / f"{tag}_{uniq}.npz"
    n = 1
    while path.exists():
        path = out_dir / f"{tag}_{uniq}_{n}.npz"
        n += 1

    obs = []
    actions = []
    rewards = []
    for step in logs:
        if player_side == 0:
            obs.append(step.obs_p0)
            actions.append(step.action_p0)
            rewards.append(step.reward_p0)
        else:
            obs.append(step.obs_p1)
            actions.append(step.action_p1)
            rewards.append(step.reward_p1)

    payload = {
        "obs": np.asarray(obs, dtype=np.float32),
        "actions": np.asarray(actions, dtype=np.int64),
        "rewards": np.asarray(rewards, dtype=np.float32),
        "player_side": player_side,
        "result": result or {},
        "meta": meta or {},
    }
    np.savez_compressed(path, **{k: v for k, v in payload.items() if k not in ("result", "meta", "player_side")})
    # side-car json for human-readable meta
    meta_path = path.with_suffix(".json")
    meta_path.write_text(
        json.dumps(
            {
                "player_side": player_side,
                "result": result or {},
                "meta": meta or {},
                "n_steps": len(logs),
                "file": path.name,
            },
            indent=2,
        )
    )
    return path


def load_dataset(
    root: Path | str = DEFAULT_DIR,
    glob: str = "*.npz",
) -> Tuple[np.ndarray, np.ndarray]:
    """Stack all trajectories into (N, obs_dim), (N,) actions for BC."""
    root = Path(root)
    files = sorted(root.glob(glob))
    if not files:
        raise FileNotFoundError(f"No trajectory files matching {glob} in {root}")

    obs_list: List[np.ndarray] = []
    act_list: List[np.ndarray] = []
    for f in files:
        data = np.load(f)
        obs_list.append(data["obs"])
        act_list.append(data["actions"])

    obs = np.concatenate(obs_list, axis=0)
    actions = np.concatenate(act_list, axis=0)
    return obs, actions
