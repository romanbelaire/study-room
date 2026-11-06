from __future__ import annotations

import numpy as np


def sinusoidal_encoding(n_positions: int, d_model: int) -> np.ndarray:
    assert d_model % 2 == 0
    pos = np.arange(n_positions)[:, None]            # (T, 1)
    i = np.arange(d_model // 2)[None, :]             # (1, d/2)
    angles = pos / (10000.0 ** (2 * i / d_model))    # (T, d/2)
    pe = np.empty((n_positions, d_model))
    pe[:, 0::2] = np.sin(angles)
    pe[:, 1::2] = np.cos(angles)
    return pe


def apply_rope(
    x: np.ndarray,
    positions: np.ndarray | None = None,
    base: float = 10000.0,
) -> np.ndarray:
    t, d = x.shape[-2], x.shape[-1]
    assert d % 2 == 0
    if positions is None:
        positions = np.arange(t)
    theta = base ** (-np.arange(0, d, 2) / d)        # (d/2,) frequencies
    angles = positions[:, None] * theta[None, :]     # (T, d/2)
    cos, sin = np.cos(angles), np.sin(angles)
    x1, x2 = x[..., : d // 2], x[..., d // 2:]
    # 2-D rotation of each (x1_j, x2_j) pair by its angle
    return np.concatenate([x1 * cos - x2 * sin, x1 * sin + x2 * cos], axis=-1)
