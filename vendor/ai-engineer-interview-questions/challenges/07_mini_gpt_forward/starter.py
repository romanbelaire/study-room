from __future__ import annotations

from dataclasses import dataclass
import numpy as np
class GPTConfig:

def layer_norm(x: np.ndarray, g: np.ndarray, b: np.ndarray, eps: float=1e-05) -> np.ndarray:
    raise NotImplementedError

def gelu(x: np.ndarray) -> np.ndarray:
    raise NotImplementedError

def softmax(x: np.ndarray, axis: int=-1) -> np.ndarray:
    raise NotImplementedError

def init_params(cfg: GPTConfig, seed: int=0) -> dict:
    raise NotImplementedError

def causal_self_attention(x: np.ndarray, p: dict, n_heads: int) -> tuple[np.ndarray, np.ndarray]:
    raise NotImplementedError

def gpt_forward(params: dict, cfg: GPTConfig, token_ids, return_attn: bool=False):
    raise NotImplementedError

