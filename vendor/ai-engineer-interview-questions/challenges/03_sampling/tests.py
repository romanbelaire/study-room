from __future__ import annotations

import numpy as np
from solution import *  # noqa: F403 — student implementation

rng = np.random.default_rng(0)
# Logits chosen so softmax(logits) is exactly [0.5, 0.3, 0.15, 0.05].
probs = np.array([0.5, 0.3, 0.15, 0.05])
logits = np.log(probs)
assert np.allclose(softmax(logits), probs)

# --- temperature: <1 sharpens, >1 flattens ---
assert softmax(apply_temperature(logits, 0.5)).max() > probs.max()
assert softmax(apply_temperature(logits, 2.0)).max() < probs.max()
hot = softmax(apply_temperature(logits, 100.0))
assert np.allclose(hot, 0.25, atol=1e-2)  # -> uniform

# --- top-k keeps exactly k tokens, and the right ones ---
f = top_k_filter(logits, 2)
assert np.isfinite(f).sum() == 2 and np.all(np.isinf(f[[2, 3]]))
assert np.isfinite(top_k_filter(logits, 1)).sum() == 1

# --- top-p: minimal nucleus, crossing token included ---
f = top_p_filter(logits, 0.75)  # 0.5 < 0.75, 0.5+0.3 >= 0.75 -> keep {0,1}
assert np.isfinite(f[[0, 1]]).all() and np.isinf(f[[2, 3]]).all()
f = top_p_filter(logits, 0.3)  # smaller than max prob: still keeps top token
assert np.isfinite(f).sum() == 1 and np.isfinite(f[0])
assert np.isfinite(top_p_filter(logits, 1.0)).sum() == 4  # p=1 keeps all
renorm = softmax(top_p_filter(logits, 0.75))
assert np.allclose(renorm[[0, 1]], [0.5 / 0.8, 0.3 / 0.8])  # renormalized

# --- min-p: threshold is relative to the max probability ---
f = min_p_filter(logits, 0.2)  # cutoff = 0.2 * 0.5 = 0.1 -> keep {0,1,2}
assert np.isfinite(f[[0, 1, 2]]).all() and np.isinf(f[3])

# --- repetition penalty: divide positive, multiply negative ---
pen = apply_repetition_penalty(np.array([2.0, -2.0, 0.5]), [0, 1, 1], 2.0)
assert np.allclose(pen, [1.0, -4.0, 0.5])
# penalised-away token loses probability mass
p_before = softmax(np.array([2.0, -2.0, 0.5]))
p_after = softmax(pen)
assert p_after[0] < p_before[0] and p_after[2] > p_before[2]

# --- sample(): top_k=1 is greedy regardless of randomness ---
big = rng.normal(size=1000)
for _ in range(10):
    assert sample(big, top_k=1, rng=rng) == int(np.argmax(big))

# --- sample(): empirical frequencies track the distribution ---
draws = np.array([sample(logits, rng=rng) for _ in range(4000)])
freq0 = float(np.mean(draws == 0))
assert 0.45 < freq0 < 0.55, f"token 0 frequency {freq0} far from 0.5"
# filters actually constrain the support
draws = {sample(logits, top_p=0.75, rng=rng) for _ in range(500)}
assert draws <= {0, 1}

# --- sample(): temperature runs BEFORE top-p, so it changes the nucleus ---
# At T=1, p=0.75 keeps {0, 1}. At T=0.25 probs are ~[0.88, 0.11, ...], so
# token 0 alone crosses 0.75 and must be the only survivor.
sharp = softmax(apply_temperature(logits, 0.25))
assert sharp[0] > 0.75
draws = {sample(logits, temperature=0.25, top_p=0.75, rng=rng) for _ in range(200)}
assert draws == {0}, f"temperature must be applied before top-p, got {draws}"

print("All tests passed.")

