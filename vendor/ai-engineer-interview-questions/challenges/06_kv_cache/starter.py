from __future__ import annotations
import numpy as np
def softmax(x: np.ndarray, axis: int=-1) -> np.ndarray:
    raise NotImplementedError

class TinyDecoder:
    def __init__(self, vocab_size: int, d_model: int, seed: int=0) -> None:
        raise NotImplementedError

    def forward_full(self, token_ids: list[int]) -> np.ndarray:
        raise NotImplementedError

    def forward_step(self, token_id: int, cache: dict[str, list[np.ndarray]]) -> np.ndarray:
        raise NotImplementedError


def generate_no_cache(model: TinyDecoder, prompt_ids: list[int], n_new: int) -> list[int]:
    raise NotImplementedError

def generate_with_cache(model: TinyDecoder, prompt_ids: list[int], n_new: int) -> list[int]:
    raise NotImplementedError

