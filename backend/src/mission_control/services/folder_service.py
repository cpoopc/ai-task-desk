from pathlib import Path
from typing import Optional
from mission_control.adapters.filesystem import FileSystemAdapter


class FolderService:
    def __init__(self, filesystem: FileSystemAdapter):
        self.fs = filesystem

    def get_folder_tree(self) -> dict:
        root = self.fs.root_path
        if not root.exists():
            return {"name": root.name, "path": str(root), "type": "folder", "children": []}

        return self._build_tree(root)

    def _build_tree(self, path: Path) -> dict:
        if path.is_file():
            return {
                "name": path.name,
                "path": str(path.relative_to(self.fs.root_path)),
                "type": "file",
            }

        children = []
        for item in sorted(path.iterdir()):
            if item.name in self.fs.SKIP_PATTERNS:
                continue
            if item.is_dir():
                children.append(self._build_tree(item))

        return {
            "name": path.name,
            "path": str(path.relative_to(self.fs.root_path)),
            "type": "folder",
            "children": children,
        }

    def create_folder(self, path: str, name: str) -> dict:
        full_path = self.fs.root_path / path / name
        full_path.mkdir(parents=True, exist_ok=True)
        return {"name": name, "path": str(full_path.relative_to(self.fs.root_path))}

    def delete_folder(self, path: str) -> bool:
        full_path = self.fs.root_path / path
        if full_path.exists() and full_path.is_dir():
            import shutil

            shutil.rmtree(full_path)
            return True
        return False

    def move_folder(self, path: str, target: str) -> dict:
        full_path = self.fs.root_path / path
        target_path = self.fs.root_path / target

        if not full_path.exists():
            raise ValueError(f"Path {path} does not exist")

        if target_path.exists():
            raise ValueError(f"Target {target} already exists")

        target_path.parent.mkdir(parents=True, exist_ok=True)
        full_path.rename(target_path)

        return {"name": target_path.name, "path": str(target_path.relative_to(self.fs.root_path))}
