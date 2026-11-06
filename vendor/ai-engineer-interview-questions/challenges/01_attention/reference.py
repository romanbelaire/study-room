from __future__ import annotations

import numpy as np


def softmax(x: np.ndarray, axis: int = -1) -> np.ndarray:
    x_max = np.max(x, axis=axis, keepdims=True)
    e = np.exp(x - x_max)
    return e / np.sum(e, axis=axis, keepdims=True)


def causal_mask(t: int) -> np.ndarray:
    return np.tril(np.ones((t, t), dtype=bool))


def scaled_dot_product_attention(
    q: np.ndarray,
    k: np.ndarray,
    v: np.ndarray,
    mask: np.ndarray | None = None,
) -> tuple[np.ndarray, np.ndarray]:
    d_k = q.shape[-1]
    scores = q @ np.swapaxes(k, -1, -2) / np.sqrt(d_k)  # (..., T_q, T_k)
    if mask is not None:
        # -inf, not 0: after softmax the blocked positions get exactly 0 weight
        # and each row still sums to 1.
        scores = np.where(mask, scores, -np.inf)
    weights = softmax(scores, axis=-1)
    return weights @ v, weights


def multi_head_attention(
    x: np.ndarray,
    w_q: np.ndarray,
    w_k: np.ndarray,
    w_v: np.ndarray,
    w_o: np.ndarray,
    n_heads: int,
    causal: bool = True,
) -> np.ndarray:
    t, d_model = x.shape
    assert d_model % n_heads == 0, "d_model must be divisible by n_heads"
    d_head = d_model // n_heads

    def split(m: np.ndarray) -> np.ndarray:
        # (T, d_model) -> (H, T, d_head); transpose, don't reshape directly to
        # (H, T, d_head) - that would interleave positions across heads.
        return m.reshape(t, n_heads, d_head).transpose(1, 0, 2)

    q, k, v = split(x @ w_q), split(x @ w_k), split(x @ w_v)
    mask = causal_mask(t) if causal else None  # broadcasts over the head axis
    out, _ = scaled_dot_product_attention(q, k, v, mask)  # (H, T, d_head)
    out = out.transpose(1, 0, 2).reshape(t, d_model)  # concat heads
    return out @ w_o
