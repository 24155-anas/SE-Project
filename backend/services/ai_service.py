"""
AI Service — CLIP embedding generation for images and text.

Uses openai/clip-vit-base-patch32 loaded once at startup.
Both image and text embeddings share the same 512-dim vector space,
enabling cross-modal search (text query ↔ image).
"""

import io
import logging

import torch
from PIL import Image
from transformers import CLIPModel, CLIPProcessor, CLIPTokenizer

logger = logging.getLogger(__name__)

# ── Model loading (runs once at import / startup) ──────────────────────────
MODEL_NAME = "openai/clip-vit-base-patch32"

logger.info("Loading CLIP model: %s …", MODEL_NAME)

_processor = CLIPProcessor.from_pretrained(MODEL_NAME)
_tokenizer = CLIPTokenizer.from_pretrained(MODEL_NAME)
_model = CLIPModel.from_pretrained(MODEL_NAME)
_model.eval()  # inference mode — no dropout / gradients

logger.info("CLIP model loaded successfully.")


def get_image_embedding(image_bytes: bytes) -> list[float]:
    """
    Generate a 512-dim CLIP embedding from raw image bytes.

    Args:
        image_bytes: Raw bytes of a JPEG/PNG image.

    Returns:
        A list of 512 floats representing the image embedding.
    """
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    inputs = _processor(images=image, return_tensors="pt")

    with torch.no_grad():
        features = _model.get_image_features(**inputs)
    # Some transformers versions return a model output object — extract tensor
    if not isinstance(features, torch.Tensor) and hasattr(features, "pooler_output"):
        features = features.pooler_output

    # Normalize to unit vector for cosine similarity
    features = features / features.norm(p=2, dim=-1, keepdim=True)

    return features[0].tolist()


def get_text_embedding(text: str) -> list[float]:
    """
    Generate a 512-dim CLIP embedding from a text query.

    This embedding lives in the same vector space as image embeddings,
    so "black leather wallet" will match images of wallets.

    Args:
        text: A text query string.

    Returns:
        A list of 512 floats representing the text embedding.
    """
    inputs = _tokenizer(text, return_tensors="pt", padding=True, truncation=True)

    with torch.no_grad():
        features = _model.get_text_features(**inputs)
    # Some transformers versions return a model output object — extract tensor
    if not isinstance(features, torch.Tensor) and hasattr(features, "pooler_output"):
        features = features.pooler_output

    # Normalize to unit vector for cosine similarity
    features = features / features.norm(p=2, dim=-1, keepdim=True)

    return features[0].tolist()
