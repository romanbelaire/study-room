Challenge 07 - Mini GPT Forward Pass (Hard)

PROBLEM
-------
Implement the full forward pass of a decoder-only transformer (GPT-style) in
pure numpy. No autograd, no training - just inference-time math.

Architecture (GPT-2 style, pre-norm):

    token embeddings + learned position embeddings
    -> N x [ LayerNorm -> causal multi-head self-attention -> residual add
             LayerNorm -> MLP (4x expansion, GELU)         -> residual add ]
    -> final LayerNorm
    -> logits via tied embedding matrix (x @ W_emb.T)

Required signatures:

    init_params(cfg: GPTConfig, seed: int = 0) -> dict
    gpt_forward(params: dict, cfg: GPTConfig, token_ids, return_attn=False)
        token_ids: int array of shape (batch, seq_len)
        returns logits of shape (batch, seq_len, vocab_size)
        (and, if return_attn, a list of per-layer attention weight tensors
        of shape (batch, n_heads, seq_len, seq_len))

Constraints:
- Tiny config: vocab 64, d_model 32, 2 layers, 4 heads, max_seq_len 16.
- Attention must be causal: position i may attend only to positions <= i.
- Softmax must be numerically stable (subtract the row max).

INTERVIEW NOTES
---------------
A strong solution demonstrates:
- Correct pre-norm residual wiring (norm INSIDE the residual branch; post-norm
  is the original 2017 layout and a common mix-up).
- Head split/merge done with reshape+transpose, not Python loops over heads.
- Scaling scores by 1/sqrt(head_dim), not 1/sqrt(d_model).
- The causality argument: masking scores (not weights) before softmax so each
  row renormalizes over the visible prefix only.
Common mistakes: forgetting the mask entirely (tests below catch it), masking
with 0 instead of -inf/-1e9, applying LayerNorm over the sequence axis instead
of the feature axis, and unstable softmax overflowing in float32.
Follow-up variations: add a KV cache and show decode is O(T) per step;
convert the block to the layout most current open models use (RMSNorm,
RoPE instead of learned positions, SwiGLU MLP, no biases, often untied
unembedding); make attention weights optional to save memory; implement
grouped-query attention (fewer K/V heads than Q heads).
