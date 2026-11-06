Challenge 01 - Attention from scratch (Medium).

PROBLEM
-------
Using only numpy, implement:

1. softmax(x: np.ndarray, axis: int = -1) -> np.ndarray
   Numerically stable softmax along `axis`.

2. causal_mask(t: int) -> np.ndarray
   Boolean (t, t) mask where entry [i, j] is True iff position i may attend
   to position j (i.e. j <= i).

3. scaled_dot_product_attention(q, k, v, mask=None) -> (output, weights)
   q: (..., T_q, d_k), k: (..., T_k, d_k), v: (..., T_k, d_v).
   mask: optional bool array broadcastable to (..., T_q, T_k); True = keep,
   False = block. Returns output (..., T_q, d_v) and weights (..., T_q, T_k)
   whose rows sum to 1.

4. multi_head_attention(x, w_q, w_k, w_v, w_o, n_heads, causal=True) -> np.ndarray
   x: (T, d_model); each weight: (d_model, d_model); d_model % n_heads == 0.
   Split heads, attend per head, concatenate, project. Returns (T, d_model).

Constraint: no Python loops over sequence positions or heads - use
reshape/transpose/broadcasting.

INTERVIEW NOTES
---------------
A strong solution: subtracts the row max before exp; scales scores by
1/sqrt(d_k) BEFORE softmax; applies the mask as -inf on the scores (masking
weights after softmax leaves rows that don't sum to 1); splits heads with a
(T, H, d_h) -> (H, T, d_h) transpose.

Common mistakes: scaling by d_k instead of sqrt(d_k); using np.triu when you
mean np.tril; a wrong transpose when splitting heads (shapes check out,
values are silently wrong); forgetting the output projection w_o.

Follow-up variations: why sqrt(d_k)? (dot-product variance grows with d_k,
saturating softmax and killing gradients); grouped-query / multi-query
attention (each group of query heads shares one K/V head, shrinking the KV
cache by n_heads / n_kv_heads); multi-head latent attention (DeepSeek-V2/V3
caches a low-rank latent instead of full K/V); FlashAttention (tiling +
online softmax so the (T, T) matrix never materialises in HBM);
cross-attention (K/V come from a different sequence than Q).
