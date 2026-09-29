"""Local Codex text generation. The model receives data, never filesystem tools."""

import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import threading

from pydantic import BaseModel

from .db import database

CAPACITY = threading.BoundedSemaphore(2)


def configuration():
    defaults = {
        "provider": os.getenv("AI_PROVIDER", "codex"),
        "chat_model": os.getenv("CODEX_MODEL", "gpt-6.1-sol"),
        "document_model": os.getenv("CODEX_DOCUMENT_MODEL", "gpt-6.1-sol"),
        "reasoning_effort": "high",
    }
    with database() as c:
        row = c.execute("SELECT value FROM settings WHERE key='ai'").fetchone()
    return {**defaults, **(json.loads(row["value"]) if row else {})}


def binary():
    configured = os.getenv("CODEX_BINARY")
    executable = configured or shutil.which("codex.exe") or shutil.which("codex")
    if not executable:
        raise ValueError("Installeer Codex CLI en voer codex login uit op deze PC.")
    # Execute a native binary directly, never an npm .cmd shim or shell string.
    if Path(executable).suffix.lower() in {".cmd", ".bat", ".ps1"}:
        raise ValueError("Stel CODEX_BINARY in op het native codex.exe-bestand.")
    return executable


def available_models():
    """Codex's own cached catalog, with editable slugs for newly released models."""
    path = Path(os.getenv("CODEX_HOME", str(Path.home() / ".codex"))) / "models_cache.json"
    try:
        models = json.loads(path.read_text(encoding="utf-8")).get("models", [])
        return sorted({m["slug"] for m in models if isinstance(m.get("slug"), str)})
    except (OSError, ValueError, TypeError, KeyError):
        return []


def strict_schema(model):
    schema = model.model_json_schema()

    def visit(node):
        if isinstance(node, dict):
            if node.get("type") == "object":
                node["additionalProperties"] = False
                node["required"] = list(node.get("properties", {}))
            for value in node.values():
                visit(value)
        elif isinstance(node, list):
            for value in node:
                visit(value)

    visit(schema)
    return schema


def generate(prompt: str, output: type[BaseModel], document=False):
    config = configuration()
    if not CAPACITY.acquire(blocking=False):
        raise ValueError("Codex verwerkt al twee aanvragen. Probeer het zo opnieuw.")
    try:
        with tempfile.TemporaryDirectory(prefix="meridian-codex-") as directory:
            root = Path(directory)
            schema = root / "schema.json"
            result = root / "result.json"
            schema.write_text(json.dumps(strict_schema(output)), encoding="utf-8")
            args = [
                binary(),
                "exec",
                "--ephemeral",
                "--skip-git-repo-check",
                "--ignore-user-config",
                "--ignore-rules",
                "--sandbox",
                "read-only",
                "--model",
                config["document_model" if document else "chat_model"],
                "--config",
                f'model_reasoning_effort="{config["reasoning_effort"]}"',
                "--config",
                "project_doc_max_bytes=0",
                "--config",
                'web_search="disabled"',
                "--config",
                "tools.view_image=false",
                "--disable",
                "shell_tool",
                "--disable",
                "unified_exec",
                "--disable",
                "apps",
                "--disable",
                "multi_agent",
                "--disable",
                "js_repl",
                "--disable",
                "apply_patch_freeform",
                "--output-schema",
                str(schema),
                "--output-last-message",
                str(result),
                "-",
            ]
            try:
                completed = subprocess.run(
                    args,
                    input=prompt,
                    text=True,
                    encoding="utf-8",
                    errors="replace",
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    cwd=root,
                    timeout=180,
                    creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
                )
            except subprocess.TimeoutExpired as exc:
                raise ValueError(
                    "Codex reageerde niet binnen drie minuten. Probeer opnieuw."
                ) from exc
            except OSError as exc:
                raise ValueError(
                    "Codex kon niet starten. Controleer CODEX_BINARY en codex login."
                ) from exc
            if completed.returncode:
                # CLI output can contain private prompts or credentials. Keep it out of HTTP errors.
                raise ValueError(
                    "Codex-aanvraag mislukt. Controleer login, modeltoegang en gebruikslimieten."
                )
            if not result.exists() or result.stat().st_size > 1_000_000:
                raise ValueError("Codex leverde geen geldig voorstel.")
            try:
                return output.model_validate_json(result.read_text(encoding="utf-8"))
            except ValueError as exc:
                raise ValueError("Codex leverde geen geldig gestructureerd antwoord.") from exc
    finally:
        CAPACITY.release()


class Answer(BaseModel):
    answer: str
