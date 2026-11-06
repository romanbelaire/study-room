export type CodingTask = {
  id: string
  title: string
  difficulty: 'easy' | 'medium' | 'hard'
  track: 'openai-ml-math' | 'anthropic-coderpad' | 'systems-rl'
  prompt: string
  starter: string
  hint: string
  solution: string
  check: string
}

export const CODING_TASKS: CodingTask[] = [
  {
    id: 'masked-softmax',
    title: 'Masked causal softmax',
    difficulty: 'medium',
    track: 'openai-ml-math',
    prompt:
      'OpenAI live ML-math style. Implement `solve(logits)` where logits is T×T. Apply a causal mask (position j>i → -Infinity) then row-wise numerically stable softmax. Return T×T probabilities; masked positions must be exactly 0.',
    starter: `function solve(logits) {
  // logits: number[][] square
}`,
    hint: 'Copy rows; set j>i to -Infinity; max-subtract; exp; normalize. Finite fillers leak mass.',
    solution: `function solve(logits) {
  const T = logits.length;
  const out = [];
  for (let i = 0; i < T; i++) {
    const row = logits[i].map((v, j) => (j > i ? -Infinity : v));
    let m = -Infinity;
    for (const v of row) if (v > m) m = v;
    const exps = row.map((v) => (v === -Infinity ? 0 : Math.exp(v - m)));
    const s = exps.reduce((a, b) => a + b, 0);
    out.push(exps.map((e) => e / s));
  }
  return out;
}`,
    check: `function check(solve) {
  const L = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
  const W = solve(L);
  if (W.length !== 3 || W[0].length !== 3) throw new Error('shape');
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (j > i && W[i][j] !== 0) throw new Error('mask leak at '+i+','+j);
    }
    const sum = W[i].reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 1) > 1e-8) throw new Error('row sum');
  }
  if (!(W[2][2] > 0)) throw new Error('last should attend itself');
  return 'masked softmax OK';
}`,
  },
  {
    id: 'ffn-1nn',
    title: '1NN scores via ReLU features (sketch)',
    difficulty: 'hard',
    track: 'openai-ml-math',
    prompt:
      'Toy 1NN-in-FFN construction check. Keys are 1-D points `keys` (number[]), query `q`. Implement `solve(keys, q)` returning index of nearest key by absolute distance (ties → lower index). Then implement feature map `phi(x, keys)` returning a vector in R^{2K} used by a linear head idea: for each key k_i use ReLU features [ReLU(x-k_i), ReLU(k_i-x)]. (You only must get 1NN index right in `solve`; `phi` must match that formula for the checker.)',
    starter: `function phi(x, keys) {
  // return number[] length 2*keys.length
}
function solve(keys, q) {
  // return nearest index
}`,
    hint: '1NN is argmin |q-k_i|. phi stacks ReLU(x-k) and ReLU(k-x) per key — classic piecewise-linear localization sketch.',
    solution: `function phi(x, keys) {
  const out = [];
  for (const k of keys) {
    out.push(Math.max(0, x - k));
    out.push(Math.max(0, k - x));
  }
  return out;
}
function solve(keys, q) {
  let best = 0;
  let bestD = Math.abs(q - keys[0]);
  for (let i = 1; i < keys.length; i++) {
    const d = Math.abs(q - keys[i]);
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}`,
    check: `function check(solve) {
  const keys = [0, 2, 5];
  if (solve(keys, 1.9) !== 1) throw new Error('1NN idx');
  if (solve(keys, -10) !== 0) throw new Error('left edge');
  if (typeof phi !== 'function') throw new Error('define phi');
  const v = phi(3, keys);
  if (v.length !== 6) throw new Error('phi len');
  if (Math.abs(v[2] - 1) > 1e-9 || Math.abs(v[3] - 0) > 1e-9) throw new Error('phi values');
  return '1NN + phi OK';
}`,
  },
  {
    id: 'batcher',
    title: 'Request batcher',
    difficulty: 'hard',
    track: 'anthropic-coderpad',
    prompt:
      'Anthropic CoderPad-style. Implement `solve(requests, maxBatch, maxWindow)` where each request is `{id, t}` (arrival time, sorted by t). Greedily form batches: start a batch at the first unbatched request’s time; include following requests while size≤maxBatch and arrival≤start+maxWindow. Return batches as arrays of ids in arrival order.',
    starter: `function solve(requests, maxBatch, maxWindow) {
  // requests: {id:string, t:number}[] sorted by t
}`,
    hint: 'One pass; when opening a batch, fix start=t_i; pull while constraints hold.',
    solution: `function solve(requests, maxBatch, maxWindow) {
  const batches = [];
  let i = 0;
  while (i < requests.length) {
    const start = requests[i].t;
    const batch = [];
    while (
      i < requests.length &&
      batch.length < maxBatch &&
      requests[i].t <= start + maxWindow
    ) {
      batch.push(requests[i].id);
      i++;
    }
    batches.push(batch);
  }
  return batches;
}`,
    check: `function check(solve) {
  const req = [
    {id:'a', t:0},{id:'b', t:1},{id:'c', t:5},{id:'d', t:6},{id:'e', t:7}
  ];
  const b = solve(req, 2, 2);
  if (JSON.stringify(b) !== JSON.stringify([['a','b'],['c','d'],['e']])) {
    throw new Error('got '+JSON.stringify(b));
  }
  return 'batcher OK';
}`,
  },
  {
    id: 'toy-db',
    title: 'Toy DB with CAS',
    difficulty: 'hard',
    track: 'anthropic-coderpad',
    prompt:
      'Toy key-value DB. Implement `solve(ops)` processing ops in order. Ops: `{type:"put", key, value}`, `{type:"get", key}`, `{type:"cas", key, expect, value}` (compare-and-swap: write only if current===expect; missing key treated as null). Return an array of results: put→"ok", get→value or null, cas→true/false.',
    starter: `function solve(ops) {
  // return any[]
}`,
    hint: 'Keep a Map; cas checks equality with === against stored value or null.',
    solution: `function solve(ops) {
  const db = new Map();
  const out = [];
  for (const op of ops) {
    if (op.type === 'put') {
      db.set(op.key, op.value);
      out.push('ok');
    } else if (op.type === 'get') {
      out.push(db.has(op.key) ? db.get(op.key) : null);
    } else if (op.type === 'cas') {
      const cur = db.has(op.key) ? db.get(op.key) : null;
      if (cur === op.expect) {
        db.set(op.key, op.value);
        out.push(true);
      } else out.push(false);
    } else throw new Error('bad op');
  }
  return out;
}`,
    check: `function check(solve) {
  const out = solve([
    {type:'get', key:'x'},
    {type:'put', key:'x', value:1},
    {type:'cas', key:'x', expect:1, value:2},
    {type:'cas', key:'x', expect:1, value:9},
    {type:'get', key:'x'},
  ]);
  if (JSON.stringify(out) !== JSON.stringify([null,'ok',true,false,2])) {
    throw new Error('got '+JSON.stringify(out));
  }
  return 'toy db OK';
}`,
  },
  {
    id: 'stable-softmax',
    title: 'Stable softmax vector',
    difficulty: 'easy',
    track: 'openai-ml-math',
    prompt: 'Implement `solve(logits)` → probability vector with max-subtraction. Must be stable for large logits.',
    starter: `function solve(logits) {
}`,
    hint: 'm=max; exp(x-m); normalize.',
    solution: `function solve(logits) {
  const m = Math.max(...logits);
  const exps = logits.map((x) => Math.exp(x - m));
  const s = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / s);
}`,
    check: `function check(solve) {
  const out = solve([1000, 1001, 1002]);
  if (out.some((x) => !Number.isFinite(x))) throw new Error('unstable');
  if (Math.abs(out.reduce((a, b) => a + b, 0) - 1) > 1e-8) throw new Error('sum');
  return 'softmax OK';
}`,
  },
  {
    id: 'kl-penalty',
    title: 'Token KL penalty (Spinning Up / RLHF)',
    difficulty: 'medium',
    track: 'systems-rl',
    prompt:
      'RLHF-adjacent. `solve(logP, logPref, beta)` returns beta * Σ_t (logP[t]-logPref[t]) — token-sum reverse-KL style penalty term.',
    starter: `function solve(logP, logPref, beta) {
}`,
    hint: 'Sum deltas; scale by beta.',
    solution: `function solve(logP, logPref, beta) {
  let s = 0;
  for (let i = 0; i < logP.length; i++) s += logP[i] - logPref[i];
  return beta * s;
}`,
    check: `function check(solve) {
  const v = solve([-1, -2], [-1.5, -2.5], 0.2);
  if (Math.abs(v - 0.2) > 1e-9) throw new Error('got '+v);
  return 'KL OK';
}`,
  },
]
