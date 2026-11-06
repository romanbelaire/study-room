from __future__ import annotations

from collections.abc import Sequence

import numpy as np


def softmax(x: np.ndarray) -> np.ndarray:
    e = np.exp(x - np.max(x))
    return e / e.sum()


def apply_temperature(logits: np.ndarray, temperature: float) -> np.ndarray:
    assert temperature > 0, "T=0 is greedy decoding; handle it as argmax"
    return logits / temperature


def apply_repetition_penalty(
    logits: np.ndarray, generated_ids: Sequence[int], penalty: float
) -> np.ndarray:
    out = logits.astype(float).copy()
    for i in set(generated_ids):  # per unique token, not per occurrence
        out[i] = out[i] / penalty if out[i] > 0 else out[i] * penalty
    return out


def top_k_filter(logits: np.ndarray, k: int) -> np.ndarray:
    assert 1 <= k <= logits.size
    kth = np.sort(logits)[-k]  # value of the k-th largest logit
    return np.where(logits >= kth, logits, -np.inf)


def top_p_filter(logits: np.ndarray, p: float) -> np.ndarray:
    assert 0 < p <= 1
    probs = softmax(logits)
    order = np.argsort(-probs)  # descending
    csum = np.cumsum(probs[order])
    # First index where cumulative mass reaches p; that token is included,
    # so even p < max_prob keeps the top token.
    cutoff = int(np.searchsorted(csum, p))
    keep = order[: cutoff + 1]
    out = np.full(logits.shape, -np.inf)
    out[keep] = logits[keep]
    return out


def min_p_filter(logits: np.ndarray, min_p: float) -> np.ndarray:
    assert 0 < min_p <= 1
    probs = softmax(logits)
    return np.where(probs >= min_p * probs.max(), logits, -np.inf)


def sample(
    logits: np.ndarray,
    *,
    temperature: float = 1.0,
    top_k: int | None = None,
    top_p: float | None = None,
    min_p: float | None = None,
    repetition_penalty: float = 1.0,
    generated_ids: Sequence[int] = (),
    rng: np.random.Generator | None = None,
) -> int:
    rng = rng or np.random.default_rng()
    x = logits.astype(float)
    if repetition_penalty != 1.0:
        x = apply_repetition_penalty(x, generated_ids, repetition_penalty)
    x = apply_temperature(x, temperature)
    if top_k is not None:
        x = top_k_filter(x, top_k)
    if top_p is not None:
        x = top_p_filter(x, top_p)
    if min_p is not None:
        x = min_p_filter(x, min_p)
    return int(rng.choice(x.size, p=softmax(x)))
