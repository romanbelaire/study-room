from __future__ import annotations
import numpy as np
def sinusoidal_encoding(n_positions: int, d_model: int) -> np.ndarray:
    raise NotImplementedError

def apply_rope(x: np.ndarray, positions: np.ndarray | None=None, base: float=10000.0) -> np.ndarray:
    raise NotImplementedError

