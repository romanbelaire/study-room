from __future__ import annotations

import numpy as np
from solution import *  # noqa: F403 — student implementation

vocab, d_model, n_new = 50, 16, 20
prompt = [1, 7, 42]

# --- exactness: the two decoding paths agree token for token ---
m1 = TinyDecoder(vocab, d_model)
out_full = generate_no_cache(m1, prompt, n_new)
ops_full = m1.score_dots

m2 = TinyDecoder(vocab, d_model)  # same seed -> identical weights
out_cache = generate_with_cache(m2, prompt, n_new)
ops_cache = m2.score_dots

assert out_full == out_cache, f"{out_full} != {out_cache}"
assert len(out_full) == len(prompt) + n_new
assert len(set(out_full[len(prompt):])) >= 4, \
    "degenerate generation; equivalence test would prove little"

# --- per-step logits agree numerically, not just argmax ---
m3 = TinyDecoder(vocab, d_model)
cache: dict[str, list[np.ndarray]] = {"k": [], "v": []}
for i, tok in enumerate(out_full):
    step_logits = m3.forward_step(tok, cache)
    full_logits = m3.forward_full(out_full[: i + 1])[-1]
    assert np.allclose(step_logits, full_logits, atol=1e-10)

# --- the cache state has one k and one v per processed token ---
assert len(cache["k"]) == len(cache["v"]) == len(out_full)
assert cache["k"][0].shape == (d_model,)

# --- work: cached decoding does asymptotically less ---
# no-cache: sum of T^2 over steps; cache: sum of T (here T runs 3..22).
t0, T = len(prompt), len(prompt) + n_new
assert ops_full == sum(t * t for t in range(t0, T))
assert ops_cache == sum(range(1, T + 1))
assert ops_cache < ops_full / 10, (ops_cache, ops_full)

# --- prompt is preserved verbatim ---
assert out_full[: len(prompt)] == prompt

print(f"score dot-products  no cache: {ops_full}   with cache: {ops_cache}")
print("All tests passed.")

