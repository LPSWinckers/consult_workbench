"""Opt-in live Codex check. Uses temporary sample data and the host's Codex login.

Run: .venv/Scripts/python.exe scripts/smoke-codex.py
This consumes Codex usage; it never writes to the working project database.
"""

import os
from pathlib import Path
import sys
import tempfile

root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root / "backend"))
with tempfile.TemporaryDirectory(prefix="meridian-live-") as directory:
    os.environ.update(DATA_DIR=directory, DEMO_MODE="true", SEED_DEMO="true", AI_PROVIDER="codex")
    from fastapi.testclient import TestClient
    from app.main import app
    from app.documents import extract, generate

    with TestClient(app) as client:
        login = client.post(
            "/api/auth/login",
            json={"email": "eigenaar@meridian.demo", "password": "MeridianDemo!2026"},
        )
        login.raise_for_status()
        files = client.get("/api/projects/project-ai/files").json()
        fid = next(f["id"] for f in files if f["name"] == "Projectbrief.docx")
        cid = client.post("/api/projects/project-ai/conversations", json={}).json()["id"]
        answer = client.post(
            f"/api/conversations/{cid}/ask",
            json={
                "question": "Wat is de naam van de klant? Antwoord in één zin en noem de bron.",
                "file_id": fid,
            },
        )
        answer.raise_for_status()
        assert "Noordlicht" in answer.json()["answer"]
        assert [s["id"] for s in answer.json()["sources"]] == [fid]
        print("PASS: authorized file chat with known-answer check", flush=True)
        for kind in ("docx", "pptx", "xlsx"):
            proposal = client.post(
                "/api/projects/project-ai/proposals",
                json={
                    "type": kind,
                    "name": "Live controle " + kind,
                    "prompt": "Maak een kort projectadvies met de doelen en een voorgestelde pilot. Gebruik geen verzonnen meetresultaten. Maximaal drie dia's of drie secties of vijf rijen.",
                },
            )
            proposal.raise_for_status()
            prid = proposal.json()["id"]
            content = client.get(f"/api/proposals/{prid}/download")
            content.raise_for_status()
            assert extract("Controle." + kind, content.content)["text"]
            applied = client.post(f"/api/proposals/{prid}/apply", json={})
            applied.raise_for_status()
            print("PASS: " + kind + " structured generation, native package and apply", flush=True)
        company = client.get("/api/settings").json()["company"]
        content = generate(
            {
                "type": "docx",
                "title": "Taalcontrole",
                "sections": [
                    {"heading": "Pilot", "body": "Wij werkdt aan een AI projekct voor de klant."}
                ],
            },
            company,
        )
        upload = client.post(
            "/api/projects/project-ai/upload", files={"file": ("Taalcontrole.docx", content)}
        )
        upload.raise_for_status()
        fid = upload.json()["id"]
        proposal = client.post(
            "/api/projects/project-ai/proposals",
            json={
                "type": "docx",
                "file_id": fid,
                "prompt": "Corrigeer uitsluitend de spelling en grammatica in de zin met werkdt en projekct.",
            },
        )
        proposal.raise_for_status()
        assert proposal.json()["payload"]["edits"]
        client.post(f"/api/proposals/{proposal.json()['id']}/apply", json={}).raise_for_status()
        text = client.get(f"/api/files/{fid}/preview").json()["text"]
        assert "werkdt" not in text and "projekct" not in text
        print("PASS: Dutch corrections reviewed as indexed edits and applied", flush=True)
