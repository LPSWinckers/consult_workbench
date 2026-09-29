"""Office working copies. Paths are derived from database IDs, never client paths."""

import hashlib
import os
from pathlib import Path

from .db import DATA


def enabled():
    return os.getenv("OFFICE_DESKTOP_ENABLED", "false").lower() == "true"


def path(checkout):
    root = (DATA / "office").resolve()
    target = (root / checkout["id"] / checkout["name"]).resolve()
    if not target.is_relative_to(root):
        raise ValueError("Ongeldig Office-pad")
    return target


def digest(content):
    return hashlib.sha256(content).hexdigest()


def launch(target: Path):
    if os.name != "nt":
        raise OSError("Desktop Office requires Windows")
    os.startfile(str(target))
