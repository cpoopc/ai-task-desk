from __future__ import annotations
import uuid
from datetime import datetime, timezone
from typing import Optional

from mission_control.domain.models import Contact


class ContactService:
    def __init__(self):
        self._contacts: dict[str, Contact] = {}

    async def list(self) -> list[Contact]:
        return list(self._contacts.values())

    async def get(self, contact_id: str) -> Optional[Contact]:
        return self._contacts.get(contact_id)

    async def create(self, name: str, email: str, role: str = "member", **kwargs) -> Contact:
        contact = Contact(
            id=str(uuid.uuid4()),
            name=name,
            email=email,
            role=role,
            jira_account=kwargs.get("jira_account"),
            slack_id=kwargs.get("slack_id"),
            avatar_url=kwargs.get("avatar_url"),
            created_at=datetime.now(timezone.utc),
        )
        self._contacts[contact.id] = contact
        return contact

    async def update(self, contact_id: str, data: dict) -> Optional[Contact]:
        contact = self._contacts.get(contact_id)
        if not contact:
            return None
        for key, value in data.items():
            if value is not None and hasattr(contact, key):
                setattr(contact, key, value)
        return contact

    async def delete(self, contact_id: str) -> bool:
        if contact_id in self._contacts:
            del self._contacts[contact_id]
            return True
        return False

    async def import_from_jira(self, contacts: list[dict]) -> list[Contact]:
        imported = []
        for item in contacts:
            contact = await self.create(
                name=item.get("displayName", item.get("name", "")),
                email=item.get("emailAddress", item.get("email", "")),
                role="member",
                jira_account=item.get("accountId"),
                avatar_url=item.get("avatarUrl"),
            )
            imported.append(contact)
        return imported

    async def import_from_slack(self, members: list[dict]) -> list[Contact]:
        imported = []
        for member in members:
            contact = await self.create(
                name=member.get("real_name", member.get("name", "")),
                email=member.get("email", ""),
                role="external",
                slack_id=member.get("id"),
                avatar_url=member.get("image_192"),
            )
            imported.append(contact)
        return imported


_contact_service: Optional[ContactService] = None


def get_contact_service() -> ContactService:
    global _contact_service
    if _contact_service is None:
        _contact_service = ContactService()
    return _contact_service
