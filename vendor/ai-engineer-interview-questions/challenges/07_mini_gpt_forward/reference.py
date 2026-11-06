
from dataclasses import dataclass

import numpy as np


@dataclass(frozen=True)
class GPTConfig:
    vocab_size: int = 64
    d_model: int = 32
    n_layers: int = 2
    n_heads: int = 4
    max_seq_len: int = 16


def layer_norm(x: np.ndarray, g: np.ndarray, b: np.ndarray, eps: float = 1e-5) -> np.ndarray:
    mu = x.mean(axis=-1, keepdims=True)
    var = x.var(axis=-1, keepdims=True)
    return g * (x - mu) / np.sqrt(var + eps) + b


def gelu(x: np.ndarray) -> np.ndarray:
    # tanh approximation, as used in GPT-2.
    return 0.5 * x * (1.0 + np.tanh(np.sqrt(2.0 / np.pi) * (x + 0.044715 * x**3)))


def softmax(x: np.ndarray, axis: int = -1) -> np.ndarray:
    x = x - x.max(axis=axis, keepdims=True)  # stability: exp of <=0 only
    e = np.exp(x)
    return e / e.sum(axis=axis, keepdims=True)


def init_params(cfg: GPTConfig, seed: int = 0) -> dict:
    rng = np.random.default_rng(seed)

    def w(*shape: int) -> np.ndarray:
        return rng.standard_normal(shape) * 0.02

    def ln() -> dict:
        return {"g": np.ones(cfg.d_model), "b": np.zeros(cfg.d_model)}

    blocks = []
    for _ in range(cfg.n_layers):
        blocks.append({
            "ln1": ln(),
            "attn": {
                "w_qkv": w(cfg.d_model, 3 * cfg.d_model),
                "b_qkv": np.zeros(3 * cfg.d_model),
                "w_o": w(cfg.d_model, cfg.d_model),
                "b_o": np.zeros(cfg.d_model),
            },
            "ln2": ln(),
            "mlp": {
                "w1": w(cfg.d_model, 4 * cfg.d_model),
                "b1": np.zeros(4 * cfg.d_model),
                "w2": w(4 * cfg.d_model, cfg.d_model),
                "b2": np.zeros(cfg.d_model),
            },
        })
    return {"wte": w(cfg.vocab_size, cfg.d_model), "wpe": w(cfg.max_seq_len, cfg.d_model),
            "blocks": blocks, "ln_f": ln()}


def causal_self_attention(x: np.ndarray, p: dict, n_heads: int) -> tuple[np.ndarray, np.ndarray]:
    """Returns (output, attention_weights). x: (B, T, D)."""
    B, T, D = x.shape
    head_dim = D // n_heads

    qkv = x @ p["w_qkv"] + p["b_qkv"]              # (B, T, 3D)
    q, k, v = np.split(qkv, 3, axis=-1)

    def split_heads(t: np.ndarray) -> np.ndarray:  # (B, T, D) -> (B, H, T, hd)
        return t.reshape(B, T, n_heads, head_dim).transpose(0, 2, 1, 3)

    q, k, v = split_heads(q), split_heads(k), split_heads(v)

    scores = q @ k.transpose(0, 1, 3, 2) / np.sqrt(head_dim)   # (B, H, T, T)
    future = np.triu(np.ones((T, T), dtype=bool), k=1)         # True above diagonal
    scores = np.where(future, -1e9, scores)                    # mask BEFORE softmax
    weights = softmax(scores, axis=-1)

    out = weights @ v                                          # (B, H, T, hd)
    out = out.transpose(0, 2, 1, 3).reshape(B, T, D)           # merge heads
    return out @ p["w_o"] + p["b_o"], weights


def gpt_forward(params: dict, cfg: GPTConfig, token_ids, return_attn: bool = False):
    ids = np.asarray(token_ids)
    B, T = ids.shape
    assert T <= cfg.max_seq_len, "sequence longer than max_seq_len"

    x = params["wte"][ids] + params["wpe"][:T]     # (B, T, D)
    attn_maps = []
    for blk in params["blocks"]:
        a, w = causal_self_attention(layer_norm(x, **blk["ln1"]), blk["attn"], cfg.n_heads)
        x = x + a                                  # pre-norm residual
        h = layer_norm(x, **blk["ln2"])
        m = blk["mlp"]
        x = x + gelu(h @ m["w1"] + m["b1"]) @ m["w2"] + m["b2"]
        attn_maps.append(w)

    x = layer_norm(x, **params["ln_f"])
    logits = x @ params["wte"].T                   # weight tying
    return (logits, attn_maps) if return_attn else logits
