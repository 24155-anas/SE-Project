"""
Vercel Blob Service — uploads images and returns public URLs.
"""

import uuid

import httpx

from backend.config import settings

BLOB_API_URL = "https://blob.vercel-storage.com"


async def upload_image(image_bytes: bytes, content_type: str) -> str:
    """
    Upload an image to Vercel Blob storage.

    Args:
        image_bytes: Raw image bytes.
        content_type: MIME type (e.g. 'image/jpeg', 'image/png').

    Returns:
        Public URL of the uploaded image.
    """
    # Generate a unique filename to prevent URL guessing
    ext = "jpg" if "jpeg" in content_type else content_type.split("/")[-1]
    filename = f"milaap/{uuid.uuid4().hex}.{ext}"

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.put(
            f"{BLOB_API_URL}/{filename}",
            content=image_bytes,
            headers={
                "Authorization": f"Bearer {settings.VERCEL_BLOB_READ_WRITE_TOKEN}",
                "x-content-type": content_type,
                "x-api-version": "7",
            },
        )
        response.raise_for_status()
        data = response.json()

    return data["url"]
