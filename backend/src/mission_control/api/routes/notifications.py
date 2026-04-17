from typing import Optional
from fastapi import APIRouter, Depends, HTTPException

from mission_control.services.notification_service import (
    NotificationService,
    get_notification_service,
)
from mission_control.api.schemas import (
    NotificationResponse,
    SlackWebhookRequest,
)

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationResponse])
async def list_notifications(
    user_id: str = "default",
    unread_only: bool = False,
    service: NotificationService = Depends(get_notification_service),
):
    notifications = await service.get_user_notifications(user_id, unread_only)
    return [
        NotificationResponse(
            id=n["id"],
            user_id=n["user_id"],
            title=n["title"],
            message=n["message"],
            notification_type=n["notification_type"],
            is_read=n["is_read"],
            created_at=datetime.fromisoformat(n["created_at"]),
        )
        for n in notifications
    ]


from datetime import datetime


@router.put("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    service: NotificationService = Depends(get_notification_service),
):
    success = await service.mark_as_read(notification_id)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"status": "marked_read"}


@router.post("/webhook")
async def slack_webhook(
    data: SlackWebhookRequest,
    service: NotificationService = Depends(get_notification_service),
):
    success = await service.send_slack(data.webhook_url, data.message)
    return {"status": "sent" if success else "failed"}


@router.post("/send")
async def send_notification(
    user_id: str,
    title: str,
    message: str,
    notification_type: str = "info",
    service: NotificationService = Depends(get_notification_service),
):
    notification = await service.send_notification(user_id, title, message, notification_type)
    return notification


@router.put("/read-all")
async def mark_all_read(
    user_id: str = "default",
    service: NotificationService = Depends(get_notification_service),
):
    count = await service.mark_all_read(user_id)
    return {"marked_read": count}
