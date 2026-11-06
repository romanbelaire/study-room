from __future__ import annotations

import numpy as np
from solution import *  # noqa: F403 — student implementation

cfg = GPTConfig()
params = init_params(cfg, seed=0)
rng = np.random.default_rng(42)
B, T = 2, 10
ids = rng.integers(0, cfg.vocab_size, size=(B, T))

# 1. Output shape.
logits, attn_maps = gpt_forward(params, cfg, ids, return_attn=True)
assert logits.shape == (B, T, cfg.vocab_size)
assert len(attn_maps) == cfg.n_layers
assert attn_maps[0].shape == (B, cfg.n_heads, T, T)

# 2. Attention softmax rows sum to 1, and future positions get zero weight.
for w in attn_maps:
    assert np.allclose(w.sum(axis=-1), 1.0)
    assert np.allclose(w[..., np.triu_indices(T, k=1)[0], np.triu_indices(T, k=1)[1]], 0.0)

# 3. Causality: changing a FUTURE token must not change past logits.
t = 6
ids2 = ids.copy()
ids2[:, t] = (ids2[:, t] + 1) % cfg.vocab_size
logits2 = gpt_forward(params, cfg, ids2)
assert np.allclose(logits[:, :t], logits2[:, :t], rtol=0.0, atol=1e-12), \
    "past logits changed when a future token changed - attention is not causal"
# ...and the changed position itself SHOULD produce different logits.
assert not np.allclose(logits[:, t], logits2[:, t])

# 3b. Batch rows are independent: running row 0 alone gives the same logits
# (catches norms or reshapes that mix the batch axis).
assert np.allclose(gpt_forward(params, cfg, ids[:1]), logits[:1])

# 3c. Layer-0, head-0 weights match a hand-built reference scaled by
# 1/sqrt(head_dim) (scaling by 1/sqrt(d_model) would fail this).
hd = cfg.d_model // cfg.n_heads
blk0 = params["blocks"][0]
h0 = layer_norm(params["wte"][ids[0]] + params["wpe"][:T], **blk0["ln1"])
qkv0 = h0 @ blk0["attn"]["w_qkv"] + blk0["attn"]["b_qkv"]
q0, k0 = qkv0[:, :hd], qkv0[:, cfg.d_model:cfg.d_model + hd]
ref = np.where(np.tril(np.ones((T, T), dtype=bool)), q0 @ k0.T / np.sqrt(hd), -np.inf)
assert np.allclose(attn_maps[0][0, 0], softmax(ref, axis=-1))

# 4. Logits are finite and the next-token distribution is valid.
assert np.isfinite(logits).all()
probs = softmax(logits, axis=-1)
assert np.allclose(probs.sum(axis=-1), 1.0)
assert (probs >= 0).all()

# 5. Works at max context length.
ids_full = rng.integers(0, cfg.vocab_size, size=(1, cfg.max_seq_len))
assert gpt_forward(params, cfg, ids_full).shape == (1, cfg.max_seq_len, cfg.vocab_size)

print("All tests passed.")

