from __future__ import annotations

import numpy as np
from solution import *  # noqa: F403 — student implementation

rng = np.random.default_rng(0)

# --- softmax: stability and correctness ---
s = softmax(np.array([1e4, 1e4 + 1.0, 1e4 + 2.0]))
assert np.all(np.isfinite(s)) and np.isclose(s.sum(), 1.0)
assert np.allclose(s, softmax(np.array([0.0, 1.0, 2.0])))  # shift invariant

# --- scaled dot-product attention vs hand-computed values ---
# d_k = 1 so the scale is 1. scores = [[1, 0], [0, 0]].
q = k = np.array([[1.0], [0.0]])
v = np.array([[1.0], [2.0]])
out, w = scaled_dot_product_attention(q, k, v)
e = np.e
assert np.allclose(w[0], [e / (e + 1), 1 / (e + 1)])
assert np.allclose(w[1], [0.5, 0.5])
assert np.allclose(out, [[(e + 2) / (e + 1)], [1.5]])

# --- causal masking: zero weight on the future, rows still sum to 1 ---
t, d = 5, 8
x = rng.normal(size=(t, d))
_, w = scaled_dot_product_attention(x, x, x, mask=causal_mask(t))
assert np.allclose(w.sum(axis=-1), 1.0)
assert np.all(w[np.triu_indices(t, k=1)] == 0.0)

# --- batched shapes broadcast correctly ---
qb = rng.normal(size=(2, 4, 7, 8))  # (batch, heads, T, d_k)
kb = rng.normal(size=(2, 4, 7, 8))
vb = rng.normal(size=(2, 4, 7, 16))
ob, wb = scaled_dot_product_attention(qb, kb, vb, mask=causal_mask(7))
assert ob.shape == (2, 4, 7, 16) and wb.shape == (2, 4, 7, 7)
# each (batch, head) slice must equal the unbatched computation
o12, w12 = scaled_dot_product_attention(qb[1, 2], kb[1, 2], vb[1, 2], causal_mask(7))
assert np.allclose(ob[1, 2], o12) and np.allclose(wb[1, 2], w12)

# --- multi-head with 1 head and identity w_o == single-head attention ---
d_model = 8
x = rng.normal(size=(6, d_model))
w_q, w_k, w_v = (rng.normal(size=(d_model, d_model)) for _ in range(3))
mha_out = multi_head_attention(x, w_q, w_k, w_v, np.eye(d_model), n_heads=1)
ref, _ = scaled_dot_product_attention(x @ w_q, x @ w_k, x @ w_v, causal_mask(6))
assert np.allclose(mha_out, ref)

# --- multi-head: shape, and causality end to end ---
w_o = rng.normal(size=(d_model, d_model))
out1 = multi_head_attention(x, w_q, w_k, w_v, w_o, n_heads=4)
assert out1.shape == (6, d_model)
x2 = x.copy()
x2[-1] += 10.0  # perturb only the last token
out2 = multi_head_attention(x2, w_q, w_k, w_v, w_o, n_heads=4)
assert np.allclose(out1[:-1], out2[:-1]), "earlier positions saw the future"
assert not np.allclose(out1[-1], out2[-1])

# --- multi-head: matches an explicit per-head loop (catches bad splits) ---
d_h = d_model // 4
heads = []
for h in range(4):
    cols = slice(h * d_h, (h + 1) * d_h)
    o_h, _ = scaled_dot_product_attention(
        x @ w_q[:, cols], x @ w_k[:, cols], x @ w_v[:, cols], causal_mask(6)
    )
    heads.append(o_h)
assert np.allclose(out1, np.concatenate(heads, axis=-1) @ w_o)

print("All tests passed.")

