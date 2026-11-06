from __future__ import annotations
from collections.abc import Sequence
import numpy as np
def softmax(x: np.ndarray) -> np.ndarray:
    raise NotImplementedError

def apply_temperature(logits: np.ndarray, temperature: float) -> np.ndarray:
    raise NotImplementedError

def apply_repetition_penalty(logits: np.ndarray, generated_ids: Sequence[int], penalty: float) -> np.ndarray:
    raise NotImplementedError

def top_k_filter(logits: np.ndarray, k: int) -> np.ndarray:
    raise NotImplementedError

def top_p_filter(logits: np.ndarray, p: float) -> np.ndarray:
    raise NotImplementedError

def min_p_filter(logits: np.ndarray, min_p: float) -> np.ndarray:
    raise NotImplementedError

def sample(logits: np.ndarray, *, temperature: float=1.0, top_k: int | None=None, top_p: float | None=None, min_p: float | None=None, repetition_penalty: float=1.0, generated_ids: Sequence[int]=(), rng: np.random.Generator | None=None) -> int:
    raise NotImplementedError

