Challenge 04 - Positional encodings: sinusoidal + RoPE (Medium).

PROBLEM
-------
Numpy only:

1. sinusoidal_encoding(n_positions: int, d_model: int) -> np.ndarray
   The "Attention Is All You Need" table, shape (n_positions, d_model):
       PE[pos, 2i]   = sin(pos / 10000^(2i / d_model))
       PE[pos, 2i+1] = cos(pos / 10000^(2i / d_model))
   d_model is even. Build it vectorized (no double loop).

2. apply_rope(x, positions=None, base=10000.0) -> np.ndarray
   Rotary Position Embedding, half-split ("rotate half") convention as used
   by GPT-NeoX and the Hugging Face Llama port (Meta's reference Llama code
   rotates interleaved pairs instead, so converted checkpoints permute the
   Q/K weights). x has shape (..., T, d) with d even; dimension pair
   (j, j + d/2) is rotated by angle pos * theta_j, theta_j = base^(-2j/d).
   `positions` is an optional (T,) int array (defaults to 0..T-1) - needed
   for KV-cache decode, where the new token's position is not 0.

INTERVIEW NOTES
---------------
A strong solution: knows RoPE rotates Q and K *inside* attention (it is not
added to embeddings like sinusoidal PE); can state the key property - the
rotation makes q_m . k_n depend only on the offset m - n, giving relative
position from an absolute encoding; mentions that rotations preserve norms
so attention logit scale is unchanged; accepts explicit positions (cache-
aware) rather than assuming 0..T-1.

Common mistakes: mixing the interleaved (original paper, pairs (2i, 2i+1))
and half-split (pairs (i, i + d/2)) conventions - both are valid but
incompatible, a classic source of broken checkpoint conversions; wrong
frequency exponent (theta_j must span 1 down to ~1/base across dims);
adding RoPE to V (it belongs on Q and K only).

Follow-up variations: why low dims rotate fast and high dims slow
(multi-scale positional resolution); context extension - position
interpolation, NTK-aware / YaRN scaling of theta, and raising the base
(many long-context models ship base 500000 or higher); ALiBi as a
bias-based alternative; decoupled RoPE in multi-head latent attention
(DeepSeek-V2/V3) and interleaving no-position (NoPE) layers with RoPE
layers; why learned absolute embeddings fail to extrapolate.
