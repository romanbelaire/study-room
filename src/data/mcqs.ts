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

export const MCQS: Mcq[] = [
  {
    id: 'mask-sm',
    topic: 'transformers',
    difficulty: 'medium',
    question:
      'In causal masked softmax, setting future logits to −∞ before softmax is preferred over a large negative constant primarily because…',
    choices: [
      '−∞ is cheaper to store than float constants',
      'It guarantees exact zero probability on masked positions (no leakage) and avoids temperature-dependent residual mass',
      'Softmax is undefined unless at least one logit is −∞',
      'It forces the attention matrix to be orthogonal',
    ],
    answerIndex: 1,
    explanation:
      'A finite “large negative” still assigns tiny mass to masked positions and can interact badly with dtype/temperature. True −∞ (or kernel-level masking) yields exact zeros — a live ML-math gotcha.',
  },
  {
    id: 'attn-scale',
    topic: 'transformers',
    difficulty: 'easy',
    question:
      'Scaled dot-product attention divides QKᵀ by √d_k to…',
    choices: [
      'Sparsify heads by construction',
      'Keep logit variance ~O(1) as d_k grows so softmax does not saturate',
      'Enforce attention weights summing to √d_k',
      'Cancel AdamW’s ε term',
    ],
    answerIndex: 1,
    explanation:
      'Dot products of roughly unit-variance vectors grow like √d_k; unscaled softmax saturates and starves gradients.',
  },
  {
    id: 'ffn-1nn',
    topic: 'papers',
    difficulty: 'hard',
    question:
      'A common “1NN-in-FFN” style construction intuition is that a shallow ReLU network can…',
    choices: [
      'Only approximate linear separators, never Voronoi-like regions',
      'Memorize finite key→value maps by carving local linear pieces / indicator-like regions around stored keys',
      'Replace attention entirely while preserving O(1) inference memory for unbounded context',
      'Prove PAC-Bayes bounds automatically',
    ],
    answerIndex: 1,
    explanation:
      'OpenAI-style live ML-math often probes whether you can sketch how FFNs implement lookup-like behavior on finite sets via ReLU region geometry — not that they obsolete attention for long context.',
  },
  {
    id: 'chinchilla',
    topic: 'scaling',
    difficulty: 'easy',
    question:
      'Chinchilla-style compute-optimal guidance (fixed FLOP budget) says you should roughly…',
    choices: [
      'Always maximize parameters and minimize tokens',
      'Scale parameters and training tokens in tandem rather than oversizing an under-trained model',
      'Ignore data quality past 100B tokens',
      'Train only one epoch of unique tokens ever',
    ],
    answerIndex: 1,
    explanation:
      'Hoffmann et al.: many prior LLMs were undertrained; allocate tokens and params jointly for the budget.',
  },
  {
    id: 'scale-off-frontier',
    topic: 'scaling',
    difficulty: 'hard',
    question:
      'You double parameters, hold tokens fixed, same family. Best first-order expectation?',
    choices: [
      'Identical gain to doubling tokens (exact symmetry)',
      'Loss necessarily worsens from overfitting',
      'Loss may improve but you can leave the compute-optimal frontier versus also scaling data',
      'Irreducible entropy floor is hit immediately',
    ],
    answerIndex: 2,
    explanation:
      'Larger models help, but fixed tokens can be off-frontier. No exact param↔token symmetry.',
  },
  {
    id: 'dpo',
    topic: 'rlhf',
    difficulty: 'medium',
    question: 'DPO’s distinctive move vs PPO-RLHF is that it…',
    choices: [
      'Trains a larger reward model then ignores it',
      'Reparameterizes the KL-constrained reward optimum into a classification loss on preferred vs dispreferred pairs',
      'Removes any need for SFT',
      'Proves preference noise cannot cause hacking',
    ],
    answerIndex: 1,
    explanation:
      'Bradley–Terry + optimal-policy reparameterization → direct preference loss; still sensitive to data/noise.',
  },
  {
    id: 'pg-baseline',
    topic: 'rlhf',
    difficulty: 'hard',
    question:
      'In the policy-gradient theorem (Spinning Up style), subtracting a state-dependent baseline…',
    choices: [
      'Biases the gradient toward safer actions',
      'Leaves the expectation unbiased while typically reducing variance',
      'Is equivalent to changing the discount γ',
      'Requires a second reward model copy',
    ],
    answerIndex: 1,
    explanation:
      'Baseline terms cancel in expectation under on-policy sampling; variance reduction is why advantages / critics matter for RLHF-ish optimizers.',
  },
  {
    id: 'reward-hack',
    topic: 'safety',
    difficulty: 'medium',
    question:
      'High reward-model score with degraded human quality after optimization is best diagnosed as…',
    choices: [
      'Tokenizer fertility mismatch',
      'Reward hacking / Goodharting a proxy',
      'Proof that KL was too large',
      'Mandatory MoE routing failure',
    ],
    answerIndex: 1,
    explanation:
      'Anthropic mission rounds expect crisp Goodhart language plus how you’d catch it with held-out human/AI raters.',
  },
  {
    id: 'cai',
    topic: 'safety',
    difficulty: 'medium',
    question: 'Constitutional AI’s distinctive idea vs vanilla RLHF is roughly…',
    choices: [
      'Removing all feedback from training',
      'Using written principles plus model critique/revision (AI feedback) to shape harmlessness with less dense human labeling',
      'Formal verification of every token',
      'Training only on synthetic math',
    ],
    answerIndex: 1,
    explanation:
      'CAI: constitution → critiques/revisions → preference data / RLAIF-style loops; still not a proof system.',
  },
  {
    id: 'oversight',
    topic: 'safety',
    difficulty: 'hard',
    question:
      'A scalable-oversight research answer that only says “use a bigger overseer model” fails primarily because…',
    choices: [
      'Bigger models cannot grade math',
      'It ignores overseer error, recursive deception/incentive issues, and measurement of when oversight fails',
      'Overseers are illegal to train',
      'PPO cannot consume overseer logits',
    ],
    answerIndex: 1,
    explanation:
      'Gatekeeper bar: oversight schemes need error models, evaluation of the overseer, and failure modes — not a single stack-more-layers slogan.',
  },
  {
    id: 'sae',
    topic: 'interpretability',
    difficulty: 'medium',
    question: 'SAEs on residual streams are primarily motivated by…',
    choices: [
      'Checkpoint compression for serving',
      'Learning an overcomplete sparse dictionary of more monosemantic features than neurons afford',
      'Replacing attention with probes',
      'Proving Bayesian transformers',
    ],
    answerIndex: 1,
    explanation:
      'Polysemanticity → sparse overcomplete latents; still need causal validation.',
  },
  {
    id: 'probe-causal',
    topic: 'interpretability',
    difficulty: 'hard',
    question:
      'A linear direction separates truthful vs untruthful answers on a probe set. Best-supported claim?',
    choices: [
      'A single additive edit is a clean truth circuit',
      'A correlate is linearly readable; causality needs interventions (steering, ablation, scrubbing)',
      'Attention is unnecessary for facts',
      'Training data had no falsehoods',
    ],
    answerIndex: 1,
    explanation:
      'Readout ≠ circuit. Elite answers separate correlation from intervention.',
  },
  {
    id: 'eval-contam',
    topic: 'evals',
    difficulty: 'easy',
    question: 'High MMLU can still be weak RS signal because…',
    choices: [
      'MMLU is image-only',
      'Contamination, saturation, and mismatch with open-ended research skills',
      'It forbids multiple choice',
      'It only tests GPUs',
    ],
    answerIndex: 1,
    explanation:
      'Static MC benchmarks leak, saturate, and miss experiment design / tool use.',
  },
  {
    id: 'work-trial-uncertainty',
    topic: 'evals',
    difficulty: 'hard',
    question:
      'In an OpenAI-style 48h work-trial writeup, the strongest empirics hygiene is…',
    choices: [
      'Report only the best seed',
      'Pre-register a kill criterion, show baselines/tests, and discuss uncertainty when n is small',
      'Replace plots with anecdotes',
      'Hide negative ablations',
    ],
    answerIndex: 1,
    explanation:
      'Culture bar: speed with honesty — tests, uncertainty, and when you would stop.',
  },
  {
    id: 'kv-cache',
    topic: 'systems',
    difficulty: 'medium',
    question:
      'For autoregressive decode, KV cache memory scales primarily with…',
    choices: [
      'Only vocabulary size',
      'Layers × heads/kv-heads × hidden × sequence × batch (precision-dependent)',
      'Disk RPM',
      'Number of optimizer states',
    ],
    answerIndex: 1,
    explanation:
      'Onsite systems: cache footprint dominates long-context serving; GQA/MQA exist to shrink KV.',
  },
  {
    id: 'fsdp',
    topic: 'systems',
    difficulty: 'medium',
    question: 'ZeRO-3 / full FSDP primarily shards…',
    choices: [
      'Only microbatches',
      'Parameters, gradients, and optimizer states across ranks',
      'Only tokenizer files',
      'Only evaluation YAML',
    ],
    answerIndex: 1,
    explanation:
      'Memory win vs DDP: shard params/grads/opt state; gather for compute.',
  },
  {
    id: 'safety-layer-infer',
    topic: 'systems',
    difficulty: 'hard',
    question:
      'Placing a refusal/safety filter after speculative decoding draft verification matters because…',
    choices: [
      'Safety layers cannot run on GPUs',
      'You must ensure rejected drafts/tokens cannot commit to user-visible output or poison caches inconsistently',
      'Speculative decoding forbids any filtering',
      'Filters only belong in the tokenizer',
    ],
    answerIndex: 1,
    explanation:
      'Systems×safety: where policy sits relative to draft/verify/cache determines leakage and consistency.',
  },
  {
    id: 'flash-attn',
    topic: 'systems',
    difficulty: 'hard',
    question: 'FlashAttention-style kernels typically…',
    choices: [
      'Materialize full N×N then fuse softmax',
      'Tile QKV in SRAM and recompute in backward to avoid storing full attention',
      'Require bidirectional masks only',
      'Replace softmax with O(N) linear attention always',
    ],
    answerIndex: 1,
    explanation:
      'IO-aware tiling + recomputation; distinct from linear-attention approximations.',
  },
  {
    id: 'culture-oa',
    topic: 'loop',
    difficulty: 'medium',
    question: 'OpenAI RS culture signal most aligned with mid/onsite empirics is…',
    choices: [
      'Long pure-philosophy essays without measurements',
      'Speed, execution, shipped empirics, intellectual honesty under disagreement',
      'Avoiding tests to move faster',
      'Never citing baselines',
    ],
    answerIndex: 1,
    explanation:
      'Loop blueprint: OpenAI ≈ speed + shipped measurement + honesty.',
  },
  {
    id: 'culture-anth',
    topic: 'loop',
    difficulty: 'medium',
    question: 'Anthropic RS culture signal most aligned with gatekeeper rounds is…',
    choices: [
      'Alignment philosophy, research taste, peer collaboration, mid-loop academic refs',
      'Only leaderboard chasing',
      'Refusing to write trade-off memos',
      'Ignoring oversight failure modes',
    ],
    answerIndex: 0,
    explanation:
      'Loop blueprint: Anthropic ≈ taste + alignment + peer-grade refs — with technical teeth.',
  },
  {
    id: 'mm-projector',
    topic: 'multimodal',
    difficulty: 'medium',
    question: 'In LLaVA-style LMMs, the projector mainly…',
    choices: [
      'Tokenizes audio only',
      'Maps vision-encoder features into the LLM embedding space',
      'Stores CLIP knn indices exclusively',
      'Deletes the vision tower at inference',
    ],
    answerIndex: 1,
    explanation:
      'Lightweight alignment MLP/perceiver into language token space.',
  },
  {
    id: 'over-refusal',
    topic: 'safety',
    difficulty: 'hard',
    question:
      'Safety-tuned refusal of clearly benign scientific homework is…',
    choices: [
      'Jailbreak success',
      'Over-refusal; measure and mitigate capability–alignment tradeoffs',
      'Proof RLHF deletes knowledge',
      'Only a tokenizer bug',
    ],
    answerIndex: 1,
    explanation:
      'Mission/culture: calibrate refusal; scientific assistance vs harm is a measured tradeoff.',
  },
]
