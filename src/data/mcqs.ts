export type Difficulty = 'easy' | 'medium' | 'hard'
export type McqTopic =
  | 'transformers'
  | 'scaling'
  | 'rlhf'
  | 'interpretability'
  | 'evals'
  | 'multimodal'
  | 'safety'
  | 'systems'
  | 'papers'
  | 'loop'

export type Mcq = {
  id: string
  topic: McqTopic
  difficulty: Difficulty
  question: string
  choices: string[]
  answerIndex: number
  explanation: string
}

export const TOPIC_LABELS: Record<McqTopic, string> = {
  transformers: 'Transformers / attention',
  scaling: 'Scaling laws',
  rlhf: 'RLHF / preference opt',
  interpretability: 'Interpretability',
  evals: 'Evals / empirics',
  multimodal: 'Multimodal',
  safety: 'Safety / oversight',
  systems: 'Systems / inference',
  papers: 'Papers / constructions',
  loop: 'Interview loop / culture',
}

/**
 * Authoring: see skills/mcq-authoring.md — distractors must match the correct
 * option in complexity, length, specificity, and register (no stylistic tells).
 */
export const MCQS: Mcq[] = [
  {
    id: 'mask-sm',
    topic: 'transformers',
    difficulty: 'medium',
    question:
      'In causal masked softmax, setting future logits to −∞ before softmax is preferred over a large negative constant primarily because…',
    choices: [
      'It guarantees exact zero probability on masked positions (no leakage) and avoids temperature-dependent residual mass',
      'A large negative constant is cheaper in SRAM tiling kernels but forces an extra renormalization pass that −∞ avoids',
      'Finite negatives keep mixed-precision softmax in the normal range while −∞ would flush the entire row to NaN',
      'Masking with −∞ is required for FlashAttention’s forward pass but unnecessary once KV cache is materialized',
    ],
    answerIndex: 0,
    explanation:
      'A finite “large negative” still assigns tiny mass to masked positions and can interact badly with dtype/temperature. True −∞ (or kernel-level masking) yields exact zeros. The other options invent unrelated kernel/numerics constraints.',
  },
  {
    id: 'attn-scale',
    topic: 'transformers',
    difficulty: 'easy',
    question: 'Scaled dot-product attention divides QKᵀ by √d_k to…',
    choices: [
      'Keep attention entropy high enough that every head stays near-uniform regardless of d_k',
      'Cancel the contribution of positional encodings so rotary embeddings remain scale-invariant',
      'Keep logit variance ~O(1) as d_k grows so softmax does not saturate',
      'Match AdamW’s second-moment scale so attention gradients share the optimizer’s effective step size',
    ],
    answerIndex: 2,
    explanation:
      'Dot products of roughly unit-variance vectors grow like √d_k; unscaled softmax saturates and starves gradients. Scaling is not about forcing uniform heads, rotary invariance, or AdamW coupling.',
  },
  {
    id: 'ffn-1nn',
    topic: 'papers',
    difficulty: 'hard',
    question:
      'A common “1NN-in-FFN” style construction intuition is that a shallow ReLU network can…',
    choices: [
      'Memorize finite key→value maps by carving local linear pieces / indicator-like regions around stored keys',
      'Implement exact softmax attention over unbounded context with only O(1) extra activations at decode time',
      'Recover the Bayes-optimal classifier for any continuous density using two layers and polynomial activations',
      'Force every residual stream direction to be monosemantic without needing a sparse autoencoder dictionary',
    ],
    answerIndex: 0,
    explanation:
      'The construction is about finite-set lookup via ReLU region geometry—not replacing attention for unbounded context, universal Bayes optimality, or free monosemanticity.',
  },
  {
    id: 'chinchilla',
    topic: 'scaling',
    difficulty: 'easy',
    question:
      'Chinchilla-style compute-optimal guidance (fixed FLOP budget) says you should roughly…',
    choices: [
      'Prefer substantially more parameters than tokens so capacity saturates before data repeats hurt loss',
      'Scale parameters and training tokens in tandem rather than oversizing an under-trained model',
      'Freeze parameter count and only grow tokens once validation perplexity flattens for one epoch',
      'Allocate almost all FLOPs to longer context windows while holding both N and D roughly fixed',
    ],
    answerIndex: 1,
    explanation:
      'Hoffmann et al.: many prior LLMs were undertrained; allocate tokens and params jointly. The distractors invert or sidestep that joint allocation.',
  },
  {
    id: 'scale-off-frontier',
    topic: 'scaling',
    difficulty: 'hard',
    question:
      'You double parameters, hold tokens fixed, same family. Best first-order expectation?',
    choices: [
      'Loss improves exactly as much as doubling tokens would, because compute-optimal frontiers are symmetric in N and D',
      'Loss worsens once N exceeds D because overparameterized LLMs necessarily memorize and fail to generalize',
      'Loss plateaus immediately at the irreducible entropy of the data distribution; extra parameters cannot help',
      'Loss may improve but you can leave the compute-optimal frontier versus also scaling data',
    ],
    answerIndex: 3,
    explanation:
      'Larger models can still help, but holding tokens fixed often leaves the compute-optimal region. There is no exact N↔D symmetry, and “must overfit” / “entropy floor now” are overclaimed.',
  },
  {
    id: 'dpo',
    topic: 'rlhf',
    difficulty: 'medium',
    question: 'DPO’s distinctive move vs PPO-RLHF is that it…',
    choices: [
      'Trains a separate reward model then freezes it while PPO optimizes a KL-regularized policy against that scalar reward',
      'Replaces preference pairs with a single margin loss on next-token log-probs without any reference-model term',
      'Reparameterizes the KL-constrained reward optimum into a classification loss on preferred vs dispreferred pairs',
      'Removes SFT entirely and initializes the policy from the base pretrained checkpoint under a pure RL objective',
    ],
    answerIndex: 2,
    explanation:
      'DPO’s closed-form reparameterization yields a preference classification loss with an implicit reward; it does not eliminate reference/KL structure or mandate skipping SFT.',
  },
  {
    id: 'pg-baseline',
    topic: 'rlhf',
    difficulty: 'hard',
    question:
      'In the policy-gradient theorem (Spinning Up style), subtracting a state-dependent baseline…',
    choices: [
      'Biases the gradient toward higher-entropy actions while preserving the same fixed point as REINFORCE',
      'Leaves the policy-gradient expectation unbiased while typically reducing estimator variance in practice',
      'Is algebraically equivalent to lowering γ so long-horizon returns are down-weighted in the advantage',
      'Requires a separately trained reward model whose scale matches the critic’s value head exactly',
    ],
    answerIndex: 1,
    explanation:
      'On-policy, state-dependent baselines cancel in expectation and mainly cut variance. They are not a bias toward safer/higher-entropy actions, a γ redefinition, or an RM requirement.',
  },
  {
    id: 'reward-hack',
    topic: 'safety',
    difficulty: 'medium',
    question:
      'High reward-model score with degraded human quality after optimization is best diagnosed as…',
    choices: [
      'Tokenizer fertility mismatch that inflates token-level log-prob mass without changing semantics',
      'Excessive KL to the reference policy that freezes style while the reward model underfits helpfulness',
      'MoE routing collapse that routes all preference-sensitive tokens through a single undertrained expert',
      'Reward hacking / Goodharting a proxy whose optimum diverges from the intended human preference distribution',
    ],
    answerIndex: 3,
    explanation:
      'Classic Goodhart: optimizing the proxy (RM) peels away from true quality. Distractors name real failure modes that do not specifically explain high-RM / low-human quality.',
  },
  {
    id: 'cai',
    topic: 'safety',
    difficulty: 'medium',
    question: 'Constitutional AI’s distinctive idea vs vanilla RLHF is roughly…',
    choices: [
      'Removing preference learning entirely and relying on constrained decoding against a static safety automaton',
      'Using written principles plus model critique/revision (AI feedback) to shape harmlessness with less dense human labeling',
      'Formally verifying each sampled continuation against a dependent-type specification before it can be preferred',
      'Training only on synthetic theorem-proving traces so natural-language harmlessness emerges as a side effect',
    ],
    answerIndex: 1,
    explanation:
      'CAI uses a constitution and AI critique/revision loops to reduce dense human harmlessness labels—not formal verification, pure constrained decoding, or math-only training.',
  },
  {
    id: 'oversight',
    topic: 'safety',
    difficulty: 'hard',
    question:
      'A scalable-oversight research answer that only says “use a bigger overseer model” fails primarily because…',
    choices: [
      'Larger overseers systematically underperform smaller ones on math grading once context exceeds the teacher’s window',
      'It ignores overseer error, recursive deception/incentive issues, and measurement of when oversight fails',
      'Policy-gradient methods cannot consume scalar feedback from any model larger than the actor being optimized',
      'Oversight models are legally barred from training on on-policy transcripts generated by the system under test',
    ],
    answerIndex: 1,
    explanation:
      'Scalable oversight needs error models and evals of the overseer itself; “stack a bigger grader” skips the research problem. The other options are false constraints.',
  },
  {
    id: 'sae',
    topic: 'interpretability',
    difficulty: 'medium',
    question: 'SAEs on residual streams are primarily motivated by…',
    choices: [
      'Compressing checkpoints for cheaper multi-tenant serving without changing the activation geometry',
      'Replacing multi-head attention with a bank of linear probes that reconstruct next-token logits',
      'Learning an overcomplete sparse dictionary of more monosemantic features than neurons afford',
      'Proving that transformer residual streams implement exact Bayesian filtering in the large-width limit',
    ],
    answerIndex: 2,
    explanation:
      'SAEs target polysemanticity via sparse overcomplete dictionaries. They are not a serving compressor, attention replacement, or Bayesian proof.',
  },
  {
    id: 'probe-causal',
    topic: 'interpretability',
    difficulty: 'hard',
    question:
      'A linear direction separates truthful vs untruthful answers on a probe set. Best-supported claim?',
    choices: [
      'A single additive steering vector is guaranteed to be a clean, editable “truth circuit” across tasks',
      'A correlate is linearly readable; causality needs interventions (steering, ablation, scrubbing)',
      'Attention heads can be removed entirely once a linear probe exceeds chance on held-out truth labels',
      'The pretraining corpus contained no false statements whenever such a separating direction exists',
    ],
    answerIndex: 1,
    explanation:
      'Linear separability is correlational. Causal claims need interventions. Guaranteed clean circuits, attention obsolescence, or empty-of-falsehoods data do not follow.',
  },
  {
    id: 'eval-contam',
    topic: 'evals',
    difficulty: 'easy',
    question: 'High MMLU can still be weak RS signal because…',
    choices: [
      'MMLU scores are computed only on image captions and ignore text-only reasoning channels',
      'Contamination, saturation, and mismatch with open-ended research skills can inflate or misalign the metric',
      'The benchmark forbids multiple-choice formats, so strong models cannot express calibrated uncertainty',
      'MMLU evaluates GPU kernel correctness rather than factual or procedural knowledge in language models',
    ],
    answerIndex: 1,
    explanation:
      'Leakage, saturation, and construct mismatch undermine MMLU as an RS signal. The distractors invent false format/modality/hardware claims at similar density.',
  },
  {
    id: 'work-trial-uncertainty',
    topic: 'evals',
    difficulty: 'hard',
    question:
      'In an OpenAI-style 48h work-trial writeup, the strongest empirics hygiene is…',
    choices: [
      'Report only the best seed after sweeping, then treat that point estimate as the trial’s primary result',
      'Pre-register a kill criterion, show baselines/tests, and discuss uncertainty when n is small',
      'Replace quantitative plots with narrative anecdotes so reviewers focus on research taste over variance',
      'Omit negative ablations to keep the memo within page limits while preserving the winning configuration',
    ],
    answerIndex: 1,
    explanation:
      'Speed with honesty: kill criteria, tests/baselines, and uncertainty. Cherry-picking seeds, anecdote substitution, and hiding negatives are parallel-sounding anti-patterns.',
  },
  {
    id: 'kv-cache',
    topic: 'systems',
    difficulty: 'medium',
    question:
      'For autoregressive decode, KV cache memory scales primarily with…',
    choices: [
      'Vocabulary size × embedding dimension only, independent of sequence length once the prompt is encoded',
      'Layers × heads/kv-heads × hidden × sequence × batch (precision-dependent)',
      'Optimizer-state shards × data-parallel world size, because decode reloads Adam moments each step',
      'Disk-backed activation checkpoints × microbatch size, since decode rematerializes every layer from SSD',
    ],
    answerIndex: 1,
    explanation:
      'KV grows with layers, kv-heads, width, sequence, batch, and dtype. It is not dominated by vocab-only, optimizer state, or disk activation checkpoints.',
  },
  {
    id: 'fsdp',
    topic: 'systems',
    difficulty: 'medium',
    question: 'ZeRO-3 / full FSDP primarily shards…',
    choices: [
      'Only microbatches across data-parallel ranks while replicating full parameters and optimizer state on every GPU',
      'Only tokenizer vocabulary tables and embedding rows, leaving transformer blocks fully replicated across ranks',
      'Parameters, gradients, and optimizer states across ranks to cut per-GPU memory during large-model training',
      'Only evaluation YAML and metric accumulators so training state stays mirrored for fast failover recovery',
    ],
    answerIndex: 2,
    explanation:
      'Full sharding covers params, grads, and optimizer state. Microbatch-only parallelism is plain DDP-ish; sharding tokenizer/YAML is not the point.',
  },
  {
    id: 'safety-layer-infer',
    topic: 'systems',
    difficulty: 'hard',
    question:
      'Placing a refusal/safety filter after speculative decoding draft verification matters because…',
    choices: [
      'Safety classifiers cannot execute on GPU tensor cores, so they must run after any draft/verify loop completes',
      'You must ensure rejected drafts/tokens cannot commit to user-visible output or poison caches inconsistently',
      'Speculative decoding forbids any post-hoc filtering because draft tokens are already irrevocably sampled',
      'Filters belong only in the byte-level tokenizer so speculative kernels never see policy-relevant strings',
    ],
    answerIndex: 1,
    explanation:
      'Policy placement vs draft/verify/cache determines leakage and consistency. Spec decode does not forbid filtering, nor must filters live only in the tokenizer or off-GPU.',
  },
  {
    id: 'flash-attn',
    topic: 'systems',
    difficulty: 'hard',
    question: 'FlashAttention-style kernels typically…',
    choices: [
      'Materialize the full N×N attention matrix in HBM, then fuse softmax and the value multiply in one epilogue',
      'Tile QKV blocks in on-chip SRAM and recompute attention in the backward to avoid storing full matrices',
      'Require bidirectional attention masks only, and therefore cannot implement causal language-model training',
      'Replace softmax with a fixed linear kernel so asymptotic cost becomes O(N) for every attention variant',
    ],
    answerIndex: 1,
    explanation:
      'IO-aware tiling + recomputation avoids full attention materialization. That is distinct from always-on linear attention or bidirectional-only constraints.',
  },
  {
    id: 'culture-oa',
    topic: 'loop',
    difficulty: 'medium',
    question: 'OpenAI RS culture signal most aligned with mid/onsite empirics is…',
    choices: [
      'Long pure-philosophy essays that defer measurement until a full academic manuscript is ready',
      'Speed, execution, shipped empirics, and intellectual honesty when results disagree with a favored hypothesis',
      'Avoiding automated tests during work trials so iteration velocity is not slowed by flaky CI',
      'Omitting baselines from memos to emphasize novelty of the proposed method over incremental gains',
    ],
    answerIndex: 1,
    explanation:
      'OpenAI-shaped signal: ship measurements fast and stay honest under disagreement. Parallel distractors endorse delay, skipping tests, or hiding baselines.',
  },
  {
    id: 'culture-anth',
    topic: 'loop',
    difficulty: 'medium',
    question: 'Anthropic RS culture signal most aligned with gatekeeper rounds is…',
    choices: [
      'Alignment philosophy, research taste, peer collaboration, and mid-loop academic references with technical teeth',
      'Exclusive leaderboard chasing on static benchmarks without discussing oversight or failure modes',
      'Refusing trade-off memos in favor of launching experiments first and documenting rationale only after wins',
      'Treating scalable oversight as out-of-scope so capability progress is never delayed by measurement design',
    ],
    answerIndex: 0,
    explanation:
      'Anthropic-shaped signal: taste + alignment + peer-grade refs. Distractors reject that gatekeeper posture at similar rhetorical density.',
  },
  {
    id: 'mm-projector',
    topic: 'multimodal',
    difficulty: 'medium',
    question: 'In LLaVA-style LMMs, the projector mainly…',
    choices: [
      'Tokenizes raw audio waveforms into a discrete codebook that permanently replaces the text vocabulary',
      'Maps vision-encoder features into the LLM embedding space so visual tokens can be consumed by the language backbone',
      'Stores only CLIP nearest-neighbor retrieval keys and never passes continuous visual features into the LLM',
      'Deletes the vision tower at inference after distilling all visual information into frozen text-only adapters',
    ],
    answerIndex: 1,
    explanation:
      'The projector aligns vision features to token embedding space. It is not an audio VQ tokenizer, pure knn store, or mandatory tower deletion.',
  },
  {
    id: 'over-refusal',
    topic: 'safety',
    difficulty: 'hard',
    question:
      'Safety-tuned refusal of clearly benign scientific homework is…',
    choices: [
      'Evidence of a successful jailbreak that inverted the model’s harmlessness objectives on scientific prompts',
      'Over-refusal; measure and mitigate capability–alignment tradeoffs rather than treating refusal as pure success',
      'Proof that RLHF irreversibly deletes the underlying scientific knowledge from the base pretrained model',
      'Explained only by tokenizer fertility artifacts that make homework prompts look like disallowed tool calls',
    ],
    answerIndex: 1,
    explanation:
      'Over-refusal is a measurable tradeoff, not jailbreak success, knowledge erasure, or a tokenizer-only bug.',
  },
]
