"""
Search Router — text and image based semantic search via CLIP + Qdrant.
"""

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from backend.schemas import SearchResult, TextSearchRequest
from backend.services import ai_service, qdrant_service

router = APIRouter(prefix="/search", tags=["search"])


@router.post("/text", response_model=list[SearchResult])
async def search_by_text(body: TextSearchRequest):
    """
    Semantic text search using CLIP text embeddings.

    The text query is embedded into the same 512-dim vector space as images,
    enabling cross-modal matching (e.g., "red backpack" matches photos of red backpacks).
    """
    # Generate CLIP text embedding
    embedding = ai_service.get_text_embedding(body.query)

    # Search Qdrant
    results = await qdrant_service.search_similar(
        query_vector=embedding,
        report_type=body.report_type,
        exclude_status="claimed",
        top_k=body.top_k,
    )

    return [
        SearchResult(
            report_id=r["report_id"],
            score=r["score"],
            title=r.get("title"),
            image_url=r.get("image_url"),
            description=r.get("description"),
            location_name=r.get("location_name"),
            report_type=r.get("report_type"),
        )
        for r in results
    ]


@router.post("/image", response_model=list[SearchResult])
async def search_by_image(
    image: UploadFile = File(...),
    top_k: int = 5,
):
    """
    Image-to-image semantic search using CLIP image embeddings.

    Upload an image and find the most visually similar reports.
    """
    # Validate content type
    if image.content_type not in {"image/jpeg", "image/png", "image/jpg"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image type. Allowed: JPEG, PNG.",
        )

    image_bytes = await image.read()

    # Generate CLIP image embedding
    embedding = ai_service.get_image_embedding(image_bytes)

    # Search Qdrant
    results = await qdrant_service.search_similar(
        query_vector=embedding,
        exclude_status="claimed",
        top_k=top_k,
    )

    return [
        SearchResult(
            report_id=r["report_id"],
            score=r["score"],
            title=r.get("title"),
            image_url=r.get("image_url"),
            description=r.get("description"),
            location_name=r.get("location_name"),
            report_type=r.get("report_type"),
        )
        for r in results
    ]
