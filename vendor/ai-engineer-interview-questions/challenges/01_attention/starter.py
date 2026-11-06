from __future__ import annotations
import numpy as np
def softmax(x: np.ndarray, axis: int=-1) -> np.ndarray:
    raise NotImplementedError

def causal_mask(t: int) -> np.ndarray:
    raise NotImplementedError

def scaled_dot_product_attention(q: np.ndarray, k: np.ndarray, v: np.ndarray, mask: np.ndarray | None=None) -> tuple[np.ndarray, np.ndarray]:
    raise NotImplementedError

def multi_head_attention(x: np.ndarray, w_q: np.ndarray, w_k: np.ndarray, w_v: np.ndarray, w_o: np.ndarray, n_heads: int, causal: bool=True) -> np.ndarray:
    raise NotImplementedError

