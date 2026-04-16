from fastapi import APIRouter, Depends, Query
from mission_control.repositories.link_repo import LinkRepoAsyncSQLite
from mission_control.repositories.brief_repo import BriefRepoAsyncSQLite
from mission_control.api.deps import get_link_repository, get_brief_service
from mission_control.api.schemas import LinkResponse, SearchResult, GraphData, GraphNode, GraphEdge
from mission_control.services.brief_service import BriefService
from mission_control.usecases.detect_links import DetectLinksUseCase

router = APIRouter(tags=["search"])


@router.get("/api/links", response_model=list[LinkResponse])
async def get_links(
    path: str = Query(...),
    link_repo: LinkRepoAsyncSQLite = Depends(get_link_repository),
):
    links = await link_repo.find_links(path)
    return [
        LinkResponse(
            id=l.id,
            source_path=l.source_path,
            target_path=l.target_path,
            link_type=l.link_type.value if hasattr(l.link_type, "value") else l.link_type,
            score=l.score,
            matched_tags=l.matched_tags,
        )
        for l in links
    ]


@router.put("/api/links/{id}/confirm", response_model=LinkResponse)
async def confirm_link(
    id: str,
    link_repo: LinkRepoAsyncSQLite = Depends(get_link_repository),
):
    link = await link_repo.confirm_link(id)
    return LinkResponse(
        id=link.id,
        source_path=link.source_path,
        target_path=link.target_path,
        link_type=link.link_type.value if hasattr(link.link_type, "value") else link.link_type,
        score=link.score,
        matched_tags=link.matched_tags,
    )


@router.put("/api/links/{id}/dismiss")
async def dismiss_link(
    id: str,
    link_repo: LinkRepoAsyncSQLite = Depends(get_link_repository),
):
    await link_repo.dismiss_link(id)
    return {"status": "dismissed"}


@router.get("/api/search", response_model=list[SearchResult])
async def search(
    q: str = Query(...),
    brief_service: BriefService = Depends(get_brief_service),
):
    briefs = await brief_service.search(q)
    return [
        SearchResult(
            id=b.id,
            title=b.title,
            folder_path=b.folder_path,
            status=b.status.value if hasattr(b.status, "value") else b.status,
            score=1.0,
        )
        for b in briefs
    ]


@router.get("/api/graph", response_model=GraphData)
async def get_dependency_graph(
    sprint: str | None = None,
    brief_service: BriefService = Depends(get_brief_service),
    link_repo: LinkRepoAsyncSQLite = Depends(get_link_repository),
):
    briefs = await brief_service.list(None)
    if sprint:
        briefs = [b for b in briefs if b.sprint_name == sprint]

    nodes = [
        GraphNode(
            id=b.id,
            title=b.title,
            path=b.folder_path,
            status=b.status.value if hasattr(b.status, "value") else b.status,
        )
        for b in briefs
    ]

    links = await link_repo.get_all_links()
    links = [
        l for l in links if any(b.folder_path in [l.source_path, l.target_path] for b in briefs)
    ]

    edges = [
        GraphEdge(
            source=l.source_path,
            target=l.target_path,
            score=l.score,
        )
        for l in links
    ]

    return GraphData(nodes=nodes, edges=edges)


@router.post("/api/links/detect")
async def detect_links(
    brief_service: BriefService = Depends(get_brief_service),
    link_repo: LinkRepoAsyncSQLite = Depends(get_link_repository),
):
    use_case = DetectLinksUseCase(brief_service.repository, link_repo)
    result = await use_case.execute()
    return result
