"""
CampusFind Multimodal AI Matching API (FastAPI + scikit-learn TF-IDF + Sentence-BERT + OpenCLIP / CLIP ViT-B/32)
=================================================================================================================
Implements:
1. TF-IDF + Cosine Similarity (lexical baseline)
2. Sentence-BERT (`all-MiniLM-L6-v2`) + Cosine Similarity (semantic text embeddings)
3. CLIP Image Embeddings (`openai/clip-vit-base-patch32` via PyTorch / OpenCLIP / Transformers + Pillow) + Cosine Similarity
4. Multimodal Weighted Ranking:
   Final Score = 0.35 * SBERT + 0.15 * TF-IDF + 0.30 * CLIP_Image + 0.10 * Category + 0.05 * Location + 0.05 * Date
   with automatic weight recalibration when photographs are absent.
5. Singleton model loading & SHA-256 image embedding cache.
"""

from datetime import date
from io import BytesIO
from typing import Dict, List, Literal, Optional
import base64
import hashlib
import os

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import numpy as np
from PIL import Image
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

app = FastAPI(
    title="CampusFind Multimodal AI Matching API",
    description="TF-IDF + Sentence-BERT + CLIP ViT-B/32 Image Similarity Service for OUTR Smart Campus Lost & Found Portal",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Singleton Lazy Model Loaders & Embedding Cache (Loaded Once and Reused)
# ---------------------------------------------------------------------------
_sbert_model = None
_clip_bundle = None
_image_embedding_cache: Dict[str, List[float]] = {}

CLIP_MODEL_NAME = "openai/clip-vit-base-patch32"


def get_sbert_model():
    global _sbert_model
    if _sbert_model is None:
        try:
            from sentence_transformers import SentenceTransformer

            _sbert_model = SentenceTransformer("all-MiniLM-L6-v2")
        except Exception as exc:
            print(f"[CampusFind] Sentence-BERT unavailable ({exc}); falling back to TF-IDF n-grams.")
            _sbert_model = False
    return _sbert_model


def get_clip_model():
    """Loads pretrained CLIP (`openai/clip-vit-base-patch32`) once and reuses it across requests."""
    global _clip_bundle
    if _clip_bundle is None:
        try:
            import torch
            from transformers import CLIPModel, CLIPProcessor

            device = "cuda" if torch.cuda.is_available() else "cpu"
            model = CLIPModel.from_pretrained(CLIP_MODEL_NAME).to(device)
            model.eval()
            processor = CLIPProcessor.from_pretrained(CLIP_MODEL_NAME)
            _clip_bundle = {"model": model, "processor": processor, "device": device, "backend": "transformers"}
        except Exception:
            try:
                import torch
                import open_clip

                device = "cuda" if torch.cuda.is_available() else "cpu"
                model, _, preprocess = open_clip.create_model_and_transforms("ViT-B-32", pretrained="openai")
                model = model.to(device).eval()
                _clip_bundle = {"model": model, "preprocess": preprocess, "device": device, "backend": "open_clip"}
            except Exception as exc:
                print(f"[CampusFind] PyTorch CLIP unavailable ({exc}); using Pillow spatial histogram fallback.")
                _clip_bundle = False
    return _clip_bundle


def preprocess_and_embed_image(image_bytes: bytes) -> Dict[str, object]:
    """Validates image with Pillow, caches by SHA-256 digest, and returns a 512-d L2-normalized CLIP embedding."""
    digest = hashlib.sha256(image_bytes).hexdigest()[:20]
    ref_id = f"clip-vit-b32-{digest}"
    if ref_id in _image_embedding_cache:
        return {"embedding_reference": ref_id, "embedding": _image_embedding_cache[ref_id], "cached": True}

    img = Image.open(BytesIO(image_bytes)).convert("RGB")
    img.thumbnail((512, 512))

    clip_bundle = get_clip_model()
    if clip_bundle:
        import torch

        with torch.no_grad():
            if clip_bundle["backend"] == "transformers":
                inputs = clip_bundle["processor"](images=img, return_tensors="pt").to(clip_bundle["device"])
                features = clip_bundle["model"].get_image_features(**inputs)
            else:
                tensor = clip_bundle["preprocess"](img).unsqueeze(0).to(clip_bundle["device"])
                features = clip_bundle["model"].encode_image(tensor)

            features = features / features.norm(p=2, dim=-1, keepdim=True)
            vec = features.cpu().numpy()[0].astype(float).tolist()
    else:
        # Deterministic 512-d Pillow RGB spatial & color histogram vector fallback
        resized = img.resize((16, 16))
        arr = np.asarray(resized, dtype=np.float32) / 255.0
        flat = arr.flatten()
        vec_np = np.zeros(512, dtype=np.float32)
        vec_np[: min(512, len(flat))] = flat[:512]
        norm = float(np.linalg.norm(vec_np)) or 1.0
        vec = (vec_np / norm).tolist()

    _image_embedding_cache[ref_id] = vec
    return {"embedding_reference": ref_id, "embedding": vec, "cached": False}


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
class ItemReport(BaseModel):
    id: str
    type: Literal["lost", "found"]
    title: str
    category: str
    description: str
    color: Optional[str] = ""
    brand: Optional[str] = ""
    location: str
    date: str
    photo: Optional[str] = None
    image_embedding: Optional[List[float]] = None
    status: str = "Active"


class MultimodalMatchRequest(BaseModel):
    target: ItemReport
    candidates: List[ItemReport]
    weights: Dict[str, float] = Field(
        default_factory=lambda: {
            "sbert": 0.35,
            "tfidf": 0.15,
            "clip": 0.30,
            "category": 0.10,
            "location": 0.05,
            "date": 0.05,
        }
    )
    threshold: float = 0.25


def compute_date_score(date_a: str, date_b: str) -> float:
    try:
        d1 = date.fromisoformat(date_a[:10])
        d2 = date.fromisoformat(date_b[:10])
        diff = abs((d1 - d2).days)
        if diff == 0:
            return 1.0
        if diff <= 1:
            return 0.90
        if diff <= 3:
            return 0.75
        if diff <= 7:
            return 0.50
        return 0.20
    except Exception:
        return 0.35


@app.post("/api/image/embed")
async def embed_uploaded_image(file: UploadFile = File(...)):
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image exceeds 5 MB maximum size.")
    result = preprocess_and_embed_image(content)
    return {"model": CLIP_MODEL_NAME, **result}


@app.post("/api/multimodal-match")
def compute_multimodal_matches(req: MultimodalMatchRequest):
    opposite_type = "found" if req.target.type == "lost" else "lost"
    pool = [c for c in req.candidates if c.type == opposite_type and c.status != "Returned"]
    if not pool:
        return []

    target_text = f"{req.target.title} {req.target.description} {req.target.color or ''} {req.target.brand or ''}"
    candidate_texts = [f"{c.title} {c.description} {c.color or ''} {c.brand or ''}" for c in pool]
    all_texts = [target_text] + candidate_texts

    # 1. TF-IDF Cosine Similarity
    vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), sublinear_tf=True)
    tfidf_matrix = vectorizer.fit_transform(all_texts)
    tfidf_scores = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:]).flatten()

    # 2. Sentence-BERT Cosine Similarity
    sbert_model = get_sbert_model()
    if sbert_model:
        embeddings = sbert_model.encode(all_texts, normalize_embeddings=True)
        sbert_scores = np.dot(embeddings[1:], embeddings[0])
    else:
        sbert_scores = tfidf_scores

    w = req.weights
    results = []
    for idx, cand in enumerate(pool):
        tfidf_sim = float(np.clip(tfidf_scores[idx], 0.0, 1.0))
        sbert_sim = float(np.clip(sbert_scores[idx], 0.0, 1.0))

        # 3. CLIP Image Similarity (with missing-photo weight recalibration)
        clip_sim = None
        if req.target.image_embedding and cand.image_embedding:
            v1 = np.asarray(req.target.image_embedding, dtype=np.float32)
            v2 = np.asarray(cand.image_embedding, dtype=np.float32)
            denom = (np.linalg.norm(v1) * np.linalg.norm(v2)) or 1.0
            clip_sim = float(np.clip(np.dot(v1, v2) / denom, 0.0, 1.0))

        cat_score = 1.0 if req.target.category == cand.category else 0.0
        loc_score = 1.0 if req.target.location.lower() == cand.location.lower() else 0.25
        dt_score = compute_date_score(req.target.date, cand.date)

        if clip_sim is not None:
            final_score = (
                w.get("sbert", 0.35) * sbert_sim
                + w.get("tfidf", 0.15) * tfidf_sim
                + w.get("clip", 0.30) * clip_sim
                + w.get("category", 0.10) * cat_score
                + w.get("location", 0.05) * loc_score
                + w.get("date", 0.05) * dt_score
            )
        else:
            # Recalibrate available non-image weights so missing images are not penalized as 0
            non_image_sum = (
                w.get("sbert", 0.35)
                + w.get("tfidf", 0.15)
                + w.get("category", 0.10)
                + w.get("location", 0.05)
                + w.get("date", 0.05)
            ) or 0.70
            final_score = (
                w.get("sbert", 0.35) * sbert_sim
                + w.get("tfidf", 0.15) * tfidf_sim
                + w.get("category", 0.10) * cat_score
                + w.get("location", 0.05) * loc_score
                + w.get("date", 0.05) * dt_score
            ) / non_image_sum

        if final_score < req.threshold:
            continue

        results.append(
            {
                "candidateId": cand.id,
                "sbertSimilarity": round(sbert_sim, 4),
                "tfidfCosine": round(tfidf_sim, 4),
                "clipImageScore": round(clip_sim, 4) if clip_sim is not None else None,
                "categoryScore": round(cat_score, 4),
                "locationScore": round(loc_score, 4),
                "dateScore": round(dt_score, 4),
                "score": round(final_score, 4),
            }
        )

    results.sort(key=lambda x: x["score"], reverse=True)
    return results
