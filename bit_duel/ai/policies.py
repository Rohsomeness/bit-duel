"""Unified policy interface for play + training inference."""

from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional

import numpy as np

from bit_duel.ai.scripted import ScriptedAI, make_scripted
from bit_duel.core.actions import NUM_ACTIONS
from bit_duel.core.match import Match


class Policy(ABC):
    name: str = "policy"

    @abstractmethod
    def act(self, obs: np.ndarray, match: Optional[Match] = None, me_idx: int = 0) -> int:
        ...


class RandomPolicy(Policy):
    name = "random"

    def __init__(self, seed: int | None = None) -> None:
        self.rng = np.random.default_rng(seed)

    def act(self, obs: np.ndarray, match: Optional[Match] = None, me_idx: int = 0) -> int:
        return int(self.rng.integers(0, NUM_ACTIONS))


class ScriptedPolicy(Policy):
    def __init__(self, ai: ScriptedAI) -> None:
        self.ai = ai
        self.name = ai.name

    def act(self, obs: np.ndarray, match: Optional[Match] = None, me_idx: int = 0) -> int:
        if match is None:
            raise ValueError("ScriptedPolicy requires match context")
        return self.ai.act(match, me_idx)


class TorchPolicy(Policy):
    """Load a SB3 / torch policy or a simple BC MLP checkpoint."""

    def __init__(self, model_path: str | Path, name: str = "torch") -> None:
        self.name = name
        self.model_path = Path(model_path)
        self._sb3_model = None
        self._torch_net = None
        self._load()

    def _load(self) -> None:
        path = self.model_path
        if not path.exists():
            raise FileNotFoundError(path)

        if path.suffix == ".zip":
            # Stable-Baselines3 PPO/DQN
            from stable_baselines3 import PPO

            self._sb3_model = PPO.load(str(path))
            return

        if path.suffix in {".pt", ".pth"}:
            import torch

            from bit_duel.ai.bc_model import ActionMLP

            try:
                ckpt = torch.load(path, map_location="cpu", weights_only=False)
            except TypeError:
                ckpt = torch.load(path, map_location="cpu")
            obs_dim = int(ckpt["obs_dim"])
            n_actions = int(ckpt.get("n_actions", NUM_ACTIONS))
            net = ActionMLP(obs_dim, n_actions)
            net.load_state_dict(ckpt["state_dict"])
            net.eval()
            self._torch_net = net
            return

        raise ValueError(f"Unsupported model format: {path}")

    def act(self, obs: np.ndarray, match: Optional[Match] = None, me_idx: int = 0) -> int:
        if self._sb3_model is not None:
            action, _ = self._sb3_model.predict(obs, deterministic=True)
            return int(action)

        if self._torch_net is not None:
            import torch

            with torch.no_grad():
                x = torch.from_numpy(obs).float().unsqueeze(0)
                logits = self._torch_net(x)
                return int(torch.argmax(logits, dim=-1).item())

        return 0


def load_policy(
    spec: str,
    seed: int | None = None,
) -> Policy:
    """
    Load a policy from a short spec string:
      random | aggressive | turtle | jumpy | path/to/model.zip|.pt
    """
    if spec in {"random", "aggressive", "turtle", "jumpy"}:
        return ScriptedPolicy(make_scripted(spec, seed=seed))
    path = Path(spec)
    if path.exists():
        return TorchPolicy(path, name=path.stem)
    raise ValueError(f"Unknown policy spec: {spec}")
