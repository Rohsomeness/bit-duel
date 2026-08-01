"""Gymnasium environments for single-agent training (vs frozen opponent)."""

from __future__ import annotations

from typing import Any, Callable, Optional, Tuple

import gymnasium as gym
import numpy as np
from gymnasium import spaces

from bit_duel.ai.policies import Policy, RandomPolicy, ScriptedPolicy
from bit_duel.ai.scripted import AggressiveAI
from bit_duel.core.actions import NUM_ACTIONS
from bit_duel.core.match import Match


OpponentFn = Callable[[np.ndarray, Match, int], int]


class BitDuelEnv(gym.Env):
    """
    Single-agent env: the learning agent is always side 0.
    Opponent is a fixed policy (scripted, BC mirror, etc.).
    """

    metadata = {"render_modes": []}

    def __init__(
        self,
        opponent: Optional[Policy] = None,
        max_frames: int = 60 * 45,
        seed: Optional[int] = None,
    ) -> None:
        super().__init__()
        self.match = Match(max_frames=max_frames)
        self.opponent: Policy = opponent or ScriptedPolicy(AggressiveAI(seed=seed))
        self._agent_side = 0
        self._opp_side = 1

        # Dummy reset for space sizes
        obs0, _ = self.match.reset()
        self.observation_space = spaces.Box(
            low=-10.0, high=10.0, shape=obs0.shape, dtype=np.float32
        )
        self.action_space = spaces.Discrete(NUM_ACTIONS)
        self._np_random = np.random.default_rng(seed)

    def set_opponent(self, policy: Policy) -> None:
        self.opponent = policy

    def reset(
        self, *, seed: Optional[int] = None, options: Optional[dict] = None
    ) -> Tuple[np.ndarray, dict]:
        super().reset(seed=seed)
        if seed is not None:
            self._np_random = np.random.default_rng(seed)
        obs0, obs1 = self.match.reset()
        return obs0, {"obs_p1": obs1}

    def step(self, action: int):
        obs0 = self.match.observe(0)
        obs1 = self.match.observe(1)
        opp_action = self.opponent.act(obs1, match=self.match, me_idx=1)
        obs0, obs1, r0, r1, done, info = self.match.step(int(action), int(opp_action))
        terminated = done
        truncated = False
        info = {**info, "reward_p1": r1, "obs_p1": obs1}
        return obs0, float(r0), terminated, truncated, info
