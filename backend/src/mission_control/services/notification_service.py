from __future__ import annotations
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional

import aiosmtplib
import httpx
from email.message import EmailMessage

from mission_control.config import get_settings

logger = logging.getLogger(__name__)


class NotificationService:
    def __init__(self):
        settings = get_settings()
        self._notifications: dict[str, dict] = {}
        self._email_enabled = bool(settings.smtp_host)
        self._slack_enabled = bool(settings.slack_webhook_url)
        self._slack_webhook_url = settings.slack_webhook_url
        self._smtp_host = settings.smtp_host
        self._smtp_port = settings.smtp_port
        self._smtp_username = settings.smtp_username
        self._smtp_password = settings.smtp_password
        self._email_from = settings.email_from

    async def send_notification(
        self,
        user_id: str,
        title: str,
        message: str,
        notification_type: str = "info",
    ) -> dict:
        notification_id = str(uuid.uuid4())
        notification = {
            "id": notification_id,
            "user_id": user_id,
            "title": title,
            "message": message,
            "notification_type": notification_type,
            "is_read": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        self._notifications[notification_id] = notification
        return notification

    async def send_email(self, to: str, subject: str, body: str) -> bool:
        if not self._email_enabled:
            logger.warning("Email not configured. Set smtp_host in settings.")
            return False
        try:
            email = EmailMessage()
            email["From"] = self._email_from or self._smtp_username
            email["To"] = to
            email["Subject"] = subject
            email.set_content(body)
            await aiosmtplib.send(
                email,
                hostname=self._smtp_host,
                port=self._smtp_port or 587,
                username=self._smtp_username,
                password=self._smtp_password,
                start_tls=True,
            )
            logger.info(f"Email sent to {to}: {subject}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            return False

    async def send_slack(self, webhook_url: str, message: str) -> bool:
        if not self._slack_enabled and not webhook_url:
            logger.warning("Slack webhook not configured.")
            return False
        url = webhook_url or self._slack_webhook_url
        try:
            async with httpx.AsyncClient() as client:
                await client.post(url, json={"text": message})
            logger.info(f"Slack message sent: {message}")
            return True
        except Exception as e:
            logger.error(f"Failed to send Slack message: {e}")
            return False

    async def get_user_notifications(self, user_id: str, unread_only: bool = False) -> list[dict]:
        notifications = [n for n in self._notifications.values() if n["user_id"] == user_id]
        if unread_only:
            notifications = [n for n in notifications if not n["is_read"]]
        return sorted(notifications, key=lambda x: x["created_at"], reverse=True)

    async def mark_as_read(self, notification_id: str) -> bool:
        if notification_id in self._notifications:
            self._notifications[notification_id]["is_read"] = True
            return True
        return False

    async def mark_all_read(self, user_id: str) -> int:
        count = 0
        for n in self._notifications.values():
            if n["user_id"] == user_id and not n["is_read"]:
                n["is_read"] = True
                count += 1
        return count


_notification_service: Optional[NotificationService] = None


def get_notification_service() -> NotificationService:
    global _notification_service
    if _notification_service is None:
        _notification_service = NotificationService()
    return _notification_service
