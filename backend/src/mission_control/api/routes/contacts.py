from typing import Optional
from fastapi import APIRouter, Depends, HTTPException

from mission_control.services.contact_service import ContactService, get_contact_service
from mission_control.api.schemas import (
    ContactCreate,
    ContactUpdate,
    ContactResponse,
    JiraImportRequest,
    SlackImportRequest,
)

router = APIRouter(prefix="/api/contacts", tags=["contacts"])


@router.get("", response_model=list[ContactResponse])
async def list_contacts(service: ContactService = Depends(get_contact_service)):
    contacts = await service.list()
    return [
        ContactResponse(
            id=c.id,
            name=c.name,
            email=c.email,
            role=c.role,
            jira_account=c.jira_account,
            slack_id=c.slack_id,
            avatar_url=c.avatar_url,
            created_at=c.created_at,
        )
        for c in contacts
    ]


@router.post("", response_model=ContactResponse, status_code=201)
async def create_contact(
    data: ContactCreate,
    service: ContactService = Depends(get_contact_service),
):
    contact = await service.create(
        name=data.name,
        email=data.email,
        role=data.role,
        jira_account=data.jira_account,
        slack_id=data.slack_id,
        avatar_url=data.avatar_url,
    )
    return ContactResponse(
        id=contact.id,
        name=contact.name,
        email=contact.email,
        role=contact.role,
        jira_account=contact.jira_account,
        slack_id=contact.slack_id,
        avatar_url=contact.avatar_url,
        created_at=contact.created_at,
    )


@router.put("/{contact_id}", response_model=ContactResponse)
async def update_contact(
    contact_id: str,
    data: ContactUpdate,
    service: ContactService = Depends(get_contact_service),
):
    update_data = data.model_dump(exclude_unset=True)
    contact = await service.update(contact_id, update_data)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return ContactResponse(
        id=contact.id,
        name=contact.name,
        email=contact.email,
        role=contact.role,
        jira_account=contact.jira_account,
        slack_id=contact.slack_id,
        avatar_url=contact.avatar_url,
        created_at=contact.created_at,
    )


@router.delete("/{contact_id}")
async def delete_contact(
    contact_id: str,
    service: ContactService = Depends(get_contact_service),
):
    success = await service.delete(contact_id)
    if not success:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"status": "deleted"}


@router.post("/import/jira", response_model=list[ContactResponse])
async def import_from_jira(
    data: JiraImportRequest,
    service: ContactService = Depends(get_contact_service),
):
    contacts = await service.import_from_jira(data.contacts)
    return [
        ContactResponse(
            id=c.id,
            name=c.name,
            email=c.email,
            role=c.role,
            jira_account=c.jira_account,
            slack_id=c.slack_id,
            avatar_url=c.avatar_url,
            created_at=c.created_at,
        )
        for c in contacts
    ]


@router.post("/import/slack", response_model=list[ContactResponse])
async def import_from_slack(
    data: SlackImportRequest,
    service: ContactService = Depends(get_contact_service),
):
    contacts = await service.import_from_slack(data.members)
    return [
        ContactResponse(
            id=c.id,
            name=c.name,
            email=c.email,
            role=c.role,
            jira_account=c.jira_account,
            slack_id=c.slack_id,
            avatar_url=c.avatar_url,
            created_at=c.created_at,
        )
        for c in contacts
    ]
