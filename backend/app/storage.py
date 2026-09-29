from pathlib import Path
from typing import Protocol
from .db import DATA, uid


class FileStorage(Protocol):
    def put(self, content: bytes) -> str: ...
    def get(self, key: str) -> bytes: ...


class LocalStorage:
    """Immutable blobs. Logical names and folders belong to the database."""

    def __init__(self, root: Path):
        self.root = root.resolve()
        self.root.mkdir(parents=True, exist_ok=True)

    def put(self, content: bytes) -> str:
        key = uid()
        (self.root / key).write_bytes(content)
        return key

    def get(self, key: str) -> bytes:
        if not key.isalnum():
            raise ValueError("Ongeldige opslagcode")
        return (self.root / key).read_bytes()


storage: FileStorage = LocalStorage(DATA / "blobs")
