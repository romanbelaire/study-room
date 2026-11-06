from __future__ import annotations

import numpy as np
from solution import *  # noqa: F403 — student implementation

rng = np.random.default_rng(0)

# --- sinusoidal: hand-computed values, d_model=4 ---
# theta for dim pairs: [1, 1/100] since 10000^(2*1/4) = 100.
pe = sinusoidal_encoding(8, 4)
assert pe.shape == (8, 4)
assert np.allclose(pe[0], [0.0, 1.0, 0.0, 1.0])          # pos 0: sin=0, cos=1
assert np.allclose(pe[1], [np.sin(1), np.cos(1), np.sin(0.01), np.cos(0.01)])
assert np.allclose(pe[5, 2], np.sin(5 / 100.0))

# --- each (sin, cos) pair lies on the unit circle ---
pe = sinusoidal_encoding(50, 64)
assert np.allclose(pe[:, 0::2] ** 2 + pe[:, 1::2] ** 2, 1.0)
# values bounded (unlike learned embeddings, no growth with position)
assert np.all(np.abs(pe) <= 1.0)

# --- RoPE: position 0 is the identity rotation ---
d = 16
q = rng.normal(size=(1, d))
assert np.allclose(apply_rope(q, positions=np.array([0])), q)

# --- RoPE: hand-computed, pins the half-split pairing (j, j + d/2) ---
# d=4: theta = [1, 1/100]. e0 at position 1 rotates within pair (0, 2) by
# 1 rad. The interleaved convention would pair (0, 1) and give
# [cos 1, sin 1, 0, 0] instead.
e0 = np.array([[1.0, 0.0, 0.0, 0.0]])
assert np.allclose(apply_rope(e0, positions=np.array([1])),
                   [[np.cos(1), 0.0, np.sin(1), 0.0]])
e1 = np.array([[0.0, 1.0, 0.0, 0.0]])  # slow pair (1, 3): angle 2 * 0.01
assert np.allclose(apply_rope(e1, positions=np.array([2])),
                   [[0.0, np.cos(0.02), 0.0, np.sin(0.02)]])

# --- RoPE preserves norms (pure rotation) ---
x = rng.normal(size=(7, d))
rx = apply_rope(x)
assert np.allclose(np.linalg.norm(rx, axis=-1), np.linalg.norm(x, axis=-1))

# --- THE property: q_m . k_n depends only on the offset m - n ---
qv = rng.normal(size=(1, d))
kv = rng.normal(size=(1, d))

def rot_dot(m: int, n: int) -> float:
    qm = apply_rope(qv, positions=np.array([m]))
    kn = apply_rope(kv, positions=np.array([n]))
    return float((qm @ kn.T).item())

assert np.isclose(rot_dot(3, 7), rot_dot(10, 14), atol=1e-9)     # offset -4
assert np.isclose(rot_dot(0, 5), rot_dot(100, 105), atol=1e-9)   # offset -5
assert not np.isclose(rot_dot(3, 7), rot_dot(3, 8), atol=1e-6)   # offset matters

# --- explicit positions match the default range (KV-cache decode) ---
full = apply_rope(x)
last = apply_rope(x[-1:], positions=np.array([6]))
assert np.allclose(full[-1:], last), "cached decode must pass true position"

# --- batched input: leading axes broadcast (e.g. heads) ---
xb = rng.normal(size=(2, 4, 7, d))  # (batch, heads, T, d)
rb = apply_rope(xb)
assert rb.shape == xb.shape
assert np.allclose(rb[1, 2], apply_rope(xb[1, 2]))

# --- rotation is linear: rope(a+b) == rope(a) + rope(b) ---
a, b = rng.normal(size=(5, d)), rng.normal(size=(5, d))
assert np.allclose(apply_rope(a + b), apply_rope(a) + apply_rope(b))

print("All tests passed.")

