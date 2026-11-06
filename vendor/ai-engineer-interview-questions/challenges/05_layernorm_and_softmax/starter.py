from __future__ import annotations
import numpy as np
def softmax(x: np.ndarray, axis: int=-1) -> np.ndarray:
    raise NotImplementedError

def log_softmax(x: np.ndarray, axis: int=-1) -> np.ndarray:
    raise NotImplementedError

def layer_norm(x: np.ndarray, gamma: np.ndarray, beta: np.ndarray, eps: float=1e-05) -> np.ndarray:
    raise NotImplementedError

def rms_norm(x: np.ndarray, gamma: np.ndarray, eps: float=1e-06) -> np.ndarray:
    raise NotImplementedError

