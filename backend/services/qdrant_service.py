"""
Qdrant Service — vector storage and semantic search.

Collection: milaap_reports
Vector size: 512 (CLIP ViT-Base/32)
Distance: Cosine
"""

import logging
from uuid import UUID

from qdrant_client import AsyncQdrantClient, models

from backend.config import settings

logger = logging.getLogger(__name__)

COLLECTION_NAME = "milaap_reports"
VECTOR_SIZE = 512

# ── Qdrant async client ────────────────────────────────────────────────────
_client = AsyncQdrantClient(
    url=settings.QDRANT_URL,
    api_key=settings.QDRANT_API_KEY,
)


async def ensure_collection() -> None:
    """Create the milaap_reports collection if it doesn't exist."""
    collections = await _client.get_collections()
    existing_names = {c.name for c in collections.collections}

    if COLLECTION_NAME not in existing_names:
        await _client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=models.VectorParams(
                size=VECTOR_SIZE,
                distance=models.Distance.COSINE,
            ),
        )
        logger.info("Created Qdrant collection: %s", COLLECTION_NAME)
    else:
        logger.info("Qdrant collection already exists: %s", COLLECTION_NAME)

    # Ensure payload indexes exist for fields used in filters (required by Qdrant)
    # Qdrant requires indexes for keyword/text/integer filters — create them if missing.
    for field_name in ("report_type", "status"):
        try:
            await _client.create_payload_index(
                collection_name=COLLECTION_NAME,
                field_name=field_name,
                field_schema=models.PayloadSchemaType.KEYWORD,
            )
            logger.info("Created payload index for %s on %s", field_name, COLLECTION_NAME)
        except Exception as exc:  # already exists or other non-fatal error
            logger.debug("Could not create payload index for %s: %s", field_name, exc)


async def upsert_report(
    report_id: str,
    embedding: list[float],
    payload: dict,
) -> None:
    """
    Upsert a single report embedding into Qdrant.

    Args:
        report_id: UUID string used as the point ID.
        embedding: 512-dim float vector from CLIP.
        payload: Metadata dict (report_type, category, title, etc.).
    """
    await _client.upsert(
        collection_name=COLLECTION_NAME,
        points=[
            models.PointStruct(
                id=report_id,
                vector=embedding,
                payload=payload,
            )
        ],
    )
    logger.debug("Upserted point %s to Qdrant", report_id)


async def search_similar(
    query_vector: list[float],
    report_type: str | None = None,
    exclude_status: str = "claimed",
    top_k: int = 5,
    exclude_id: str | None = None,
) -> list[dict]:
    """
    Search for similar vectors in Qdrant.

    Args:
        query_vector: 512-dim embedding to match against.
        report_type: Optional filter — only match this report_type.
        exclude_status: Exclude points with this status (default: 'claimed').
        top_k: Number of results to return.
        exclude_id: Optional point ID to exclude (avoid self-matching).

    Returns:
        List of dicts: { report_id, score, ...payload }
    """
    # Build filter conditions
    must_conditions = []
    must_not_conditions = []

    if report_type:
        must_conditions.append(
            models.FieldCondition(
                key="report_type",
                match=models.MatchValue(value=report_type),
            )
        )

    if exclude_status:
        must_not_conditions.append(
            models.FieldCondition(
                key="status",
                match=models.MatchValue(value=exclude_status),
            )
        )

    # Exclude self
    if exclude_id:
        must_not_conditions.append(
            models.HasIdCondition(has_id=[exclude_id])
        )

    query_filter = models.Filter(
        must=must_conditions or None,
        must_not=must_not_conditions or None,
    )

    results = await _client.search(
        collection_name=COLLECTION_NAME,
        query_vector=query_vector,
        query_filter=query_filter,
        limit=top_k,
    )

    return [
        {
            "report_id": str(hit.id),
            "score": round(hit.score, 4),
            **(hit.payload or {}),
        }
        for hit in results
    ]


async def update_payload(report_id: str, payload_update: dict) -> None:
    """
    Update specific payload fields for a Qdrant point.

    Args:
        report_id: UUID string identifying the point.
        payload_update: Dict of fields to update (e.g. {"status": "claimed"}).
    """
    await _client.set_payload(
        collection_name=COLLECTION_NAME,
        points=[report_id],
        payload=payload_update,
    )
    logger.debug("Updated payload for point %s: %s", report_id, payload_update)
