from fastapi import APIRouter, Depends, HTTPException
from mission_control.services.folder_service import FolderService
from mission_control.api.deps import get_folder_service
from mission_control.api.schemas import FolderCreate, FolderUpdate, FolderResponse

router = APIRouter(prefix="/api/folders", tags=["folders"])


@router.get("", response_model=FolderResponse)
async def get_folder_tree(
    service: FolderService = Depends(get_folder_service),
):
    tree = service.get_folder_tree()
    return FolderResponse(**tree)


@router.post("", response_model=FolderResponse)
async def create_folder(
    data: FolderCreate,
    service: FolderService = Depends(get_folder_service),
):
    folder = service.create_folder(data.parent_path or "", data.name)
    return FolderResponse(type="folder", children=[], **folder)


@router.put("/{path:path}")
async def update_folder(
    path: str,
    data: FolderUpdate,
    service: FolderService = Depends(get_folder_service),
):
    if data.name:
        target = "/".join(path.rsplit("/", 1)[:-1]) + "/" + data.name
        result = service.move_folder(path, target)
        return result
    return {"status": "updated"}


@router.delete("/{path:path}")
async def delete_folder(
    path: str,
    service: FolderService = Depends(get_folder_service),
):
    success = service.delete_folder(path)
    if not success:
        raise HTTPException(status_code=404, detail="Folder not found")
    return {"status": "deleted"}


@router.put("/{path:path}/move")
async def move_folder(
    path: str,
    target: str,
    service: FolderService = Depends(get_folder_service),
):
    try:
        result = service.move_folder(path, target)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
