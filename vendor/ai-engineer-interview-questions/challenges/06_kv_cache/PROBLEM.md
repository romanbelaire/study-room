Challenge 06 - Autoregressive decoding with vs. without a KV cache (Medium).

PROBLEM
-------
Given a toy single-layer causal-attention language model (provided: embedding
matrix, Wq/Wk/Wv/Wo, unembedding matrix), implement greedy decoding two ways
and prove they are equivalent:

1. generate_no_cache(model, prompt_ids, n_new) -> list[int]
   Every step re-runs the FULL forward pass over the whole sequence and takes
   the last position's logits. Per-step attention cost: O(T^2).

2. generate_with_cache(model, prompt_ids, n_new) -> list[int]
   Keep K and V for every processed position. Each step embeds ONE token,
   computes its q/k/v, appends k/v to the cache, and attends the single query
   over all cached keys. Per-step attention cost: O(T). No causal mask is
   needed: the cache only contains the past.

Both must produce byte-identical token sequences and (near-)identical logits.
Instrument the model to count q.k score dot-products as a FLOP proxy and show
the cached path does asymptotically less work.

INTERVIEW NOTES
---------------
A strong solution: explains WHY caching is exact (causal attention means
k/v at past positions never change when a token is appended; only the new
query is needed); attends the new query over ALL cached positions including
itself; notes the memory bill - per token the cache stores
2 * n_layers * n_kv_heads * d_head values (times bytes per value), which is
why long-context decode is memory-bound and why GQA/MQA shrink n_kv_heads
and MLA (DeepSeek-V2/V3) caches a compressed latent instead of full K/V.

Common mistakes: applying a causal mask in the cached path and accidentally
masking valid past positions; recomputing k/v for the whole prefix each step
(cache exists but saves nothing); forgetting positional information - with
RoPE the new token must be rotated by its TRUE absolute position, not 0
(this toy model omits positions to keep the diff focused on caching).

Follow-up variations: prefill vs decode phases (compute-bound vs memory-
bandwidth-bound) and serving them on separate GPU pools (prefill/decode
disaggregation); continuous batching; PagedAttention (vLLM) for cache
fragmentation; prefix caching to reuse a shared system prompt's KV across
requests; cache quantization (fp8 KV); sliding-window attention and
attention sinks as cache-eviction strategies; speculative decoding.
