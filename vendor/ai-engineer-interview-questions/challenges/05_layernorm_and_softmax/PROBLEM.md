Challenge 05 - Numerically stable softmax, LayerNorm, RMSNorm (Easy).

PROBLEM
-------
Numpy only:

1. softmax(x, axis=-1) -> np.ndarray
   Must not overflow for logits like 1e4 (naive exp(1e4) = inf -> nan).

2. log_softmax(x, axis=-1) -> np.ndarray
   Computed directly, NOT as np.log(softmax(x)) - that underflows to
   log(0) = -inf for strongly negative logits.

3. layer_norm(x, gamma, beta, eps=1e-5) -> np.ndarray
   Normalize over the LAST axis to zero mean / unit variance (biased
   variance, as in PyTorch), then scale and shift:
       y = (x - mean) / sqrt(var + eps) * gamma + beta

4. rms_norm(x, gamma, eps=1e-6) -> np.ndarray
   Llama-style: no mean subtraction, no beta:
       y = x / sqrt(mean(x^2) + eps) * gamma

INTERVIEW NOTES
---------------
A strong solution: subtracts the row max in softmax and explains WHY it is
exact (softmax is shift-invariant: exp(x-c)/sum(exp(x-c)) == softmax(x));
puts eps INSIDE the sqrt; uses the biased variance (ddof=0); knows RMSNorm
drops mean-centring because re-centring empirically adds little while the
mean reduction costs an extra pass - one reason Llama, Mistral, Qwen and
most current open-weight LLMs use it.

Common mistakes: eps outside the sqrt (subtly different, breaks checkpoint
parity); normalizing over the wrong axis (batch instead of features - that's
BatchNorm: outputs then depend on what else is in the batch, and in a causal
LM, statistics over the batch and time axes leak future tokens during
training); log(softmax(x)) instead of a fused log-softmax; forgetting
gamma/beta entirely.

Follow-up variations: pre-norm vs post-norm transformer blocks (pre-norm
keeps a clean residual path and tolerates little or no warmup; post-norm was
the original and is harder to train deep); why a pre-norm stack needs a
final norm before the LM head (the residual stream itself is never
normalized); QK-norm to tame attention logit growth; norms placed after the
sublayer as well as, or instead of, before it in some recent open models;
where float16 overflows first and why norms usually run in float32 even in
mixed-precision training.
