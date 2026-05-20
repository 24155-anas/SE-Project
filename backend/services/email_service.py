"""
Email notification service using Resend.

Falls back gracefully if RESEND_API_KEY is not configured.
"""

import logging

from backend.config import settings

logger = logging.getLogger(__name__)


# Try to initialize Resend — skip if not configured
_resend_available = False
try:
    if settings.RESEND_API_KEY:
        import resend

        resend.api_key = settings.RESEND_API_KEY
        _resend_available = True
        logger.info("Resend email service initialized.")
    else:
        logger.warning("RESEND_API_KEY not set — email notifications disabled.")
except Exception as e:
    logger.warning("Could not initialize Resend: %s — email notifications disabled.", e)


async def send_match_notification(
    to_email: str,
    user_name: str,
    match_id: str,
    similarity_score: float,
    item_title: str,
    match_image_url: str,
):
    """Send email when a new match is found."""
    if not _resend_available:
        logger.info(
            "📧 [MOCK] Match notification → %s: '%s' matched (%.0f%%)",
            to_email,
            item_title,
            similarity_score * 100,
        )
        return

    try:
        import resend

        params = {
            "from": "Milaap <onboarding@resend.dev>",
            "to": [to_email],
            "subject": f"🔔 Match Found: {item_title}",
            "html": f"""
                <h2>Hi {user_name},</h2>
                <p>We found a potential match for your report!</p>
                <div style="background: #f5f5f5; padding: 20px; border-radius: 8px;">
                    <h3>{item_title}</h3>
                    <p><strong>Similarity:</strong> {similarity_score * 100:.1f}%</p>
                    {f'<img src="{match_image_url}" style="max-width: 400px; border-radius: 4px;" />' if match_image_url else ''}
                </div>
                <p><a href="http://localhost:8000/matches/{match_id}">View Match Details</a></p>
            """,
        }

        email = resend.Emails.send(params)
        logger.info("Match notification sent to %s: %s", to_email, email)
    except Exception as e:
        logger.error("Failed to send match notification to %s: %s", to_email, e)


async def send_verification_success(
    to_email: str,
    user_name: str,
    contact_email: str,
    item_title: str,
):
    """Send email after successful verification."""
    if not _resend_available:
        logger.info(
            "📧 [MOCK] Verification success → %s: '%s' verified, contact: %s",
            to_email,
            item_title,
            contact_email,
        )
        return

    try:
        import resend

        params = {
            "from": "Milaap <onboarding@resend.dev>",
            "to": [to_email],
            "subject": f"✅ Verification Successful: {item_title}",
            "html": f"""
                <h2>Congratulations {user_name}!</h2>
                <p>Your ownership has been verified.</p>
                <div style="background: #e8f5e9; padding: 20px; border-radius: 8px;">
                    <h3>{item_title}</h3>
                    <p><strong>Contact:</strong> <a href="mailto:{contact_email}">{contact_email}</a></p>
                </div>
                <p>Please coordinate with them to recover your item.</p>
            """,
        }

        email = resend.Emails.send(params)
        logger.info("Verification success email sent to %s", to_email)
    except Exception as e:
        logger.error("Failed to send verification email to %s: %s", to_email, e)
