Challenge 03 - Sampling strategies: temperature, top-k, top-p, min-p, repetition penalty (Easy).

PROBLEM
-------
Implement the standard LLM decoding toolbox over a 1-D logits vector
(shape (vocab_size,)), numpy only:

1. apply_temperature(logits, temperature) -> logits / T          (T > 0)
2. apply_repetition_penalty(logits, generated_ids, penalty)
   CTRL-style, with the sign fix used by Hugging Face transformers: for
   every token already generated, divide its logit by `penalty` if
   positive, multiply if negative (penalty > 1 discourages).
3. top_k_filter(logits, k)   -> keep the k highest logits, others -> -inf
4. top_p_filter(logits, p)   -> nucleus: keep the smallest set of tokens
   (by descending probability) whose cumulative probability >= p
5. min_p_filter(logits, min_p) -> keep tokens with prob >= min_p * max_prob
6. sample(logits, *, temperature=1.0, top_k=None, top_p=None, min_p=None,
          repetition_penalty=1.0, generated_ids=(), rng=None) -> int
   Pipeline: penalty -> temperature -> top_k -> top_p -> min_p -> softmax
   -> draw. Filters mark dropped tokens as -inf; softmax renormalizes.

INTERVIEW NOTES
---------------
A strong solution: filters by setting -inf and renormalizing via softmax
(never zeroing probabilities without renormalizing); applies temperature
BEFORE the filters (order changes which tokens survive top-p); always keeps
at least the top token in top-p (p smaller than the max prob must not
produce an empty set).

Common mistakes: dividing probabilities instead of logits by T; top-p on
unsorted cumulative sums; off-by-one at the nucleus boundary (the token that
crosses p is INCLUDED); repetition penalty that multiplies negative logits
by 1/penalty, which *encourages* repeats; forgetting penalty is applied per
unique token, not per occurrence.

Follow-up variations: why min-p adapts better than top-p when the
distribution is flat vs peaked; greedy vs T->0 equivalence; frequency and
presence penalties (additive, per the OpenAI API) vs multiplicative CTRL
penalty; some stacks offer a temperature-last order so truncation sees the
unscaled distribution - what changes?; beam search and why it's rare for
open-ended chat generation; why you should check which sampling knobs a
hosted model actually honours (some reasoning models restrict or ignore
temperature/top_p overrides).
