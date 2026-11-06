from __future__ import annotations

import numpy as np


def softmax(x: np.ndarray, axis: int = -1) -> np.ndarray:
    e = np.exp(x - np.max(x, axis=axis, keepdims=True))
    return e / np.sum(e, axis=axis, keepdims=True)


class TinyDecoder:
    """One causal self-attention layer + residual + unembedding."""

    def __init__(self, vocab_size: int, d_model: int, seed: int = 0) -> None:
        rng = np.random.default_rng(seed)
        s = 1.0 / np.sqrt(d_model)
        self.emb = rng.normal(0.0, s, (vocab_size, d_model))
        self.w_q = rng.normal(0.0, s, (d_model, d_model))
        self.w_k = rng.normal(0.0, s, (d_model, d_model))
        self.w_v = rng.normal(0.0, s, (d_model, d_model))
        self.w_o = rng.normal(0.0, s, (d_model, d_model))
        self.w_u = rng.normal(0.0, s, (d_model, vocab_size))  # unembedding
        self.d_model = d_model
        self.score_dots = 0  # number of q.k dot products computed (FLOP proxy)

    def forward_full(self, token_ids: list[int]) -> np.ndarray:
        """Recompute everything. Returns logits for every position: (T, V)."""
        x = self.emb[np.asarray(token_ids)]                      # (T, d)
        q, k, v = x @ self.w_q, x @ self.w_k, x @ self.w_v
        t = len(token_ids)
        self.score_dots += t * t
        scores = q @ k.T / np.sqrt(self.d_model)                 # (T, T)
        scores = np.where(np.tril(np.ones((t, t), dtype=bool)), scores, -np.inf)
        h = x + softmax(scores) @ v @ self.w_o                   # residual
        return h @ self.w_u                                      # (T, V)

    def forward_step(
        self, token_id: int, cache: dict[str, list[np.ndarray]]
    ) -> np.ndarray:
        """Process ONE new token using the KV cache. Returns logits: (V,)."""
        x = self.emb[token_id]                                   # (d,)
        q = x @ self.w_q
        cache["k"].append(x @ self.w_k)
        cache["v"].append(x @ self.w_v)
        k = np.stack(cache["k"])                                 # (T_past+1, d)
        v = np.stack(cache["v"])
        self.score_dots += k.shape[0]
        scores = k @ q / np.sqrt(self.d_model)                   # (T_past+1,)
        h = x + softmax(scores) @ v @ self.w_o
        return h @ self.w_u                                      # (V,)


def generate_no_cache(
    model: TinyDecoder, prompt_ids: list[int], n_new: int
) -> list[int]:
    ids = list(prompt_ids)
    for _ in range(n_new):
        logits = model.forward_full(ids)          # O(T^2) attention, every step
        ids.append(int(np.argmax(logits[-1])))
    return ids


def generate_with_cache(
    model: TinyDecoder, prompt_ids: list[int], n_new: int
) -> list[int]:
    ids = list(prompt_ids)
    cache: dict[str, list[np.ndarray]] = {"k": [], "v": []}
    logits = None
    for tok in prompt_ids:                        # prefill (token by token here)
        logits = model.forward_step(tok, cache)
    for _ in range(n_new):                        # decode: O(T) per step
        nxt = int(np.argmax(logits))
        ids.append(nxt)
        logits = model.forward_step(nxt, cache)
    return ids
