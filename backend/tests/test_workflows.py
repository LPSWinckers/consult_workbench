import io
import zipfile
from urllib.parse import urlparse, parse_qs

from app import ai
from app.documents import generate, extract


def new_project(client, name="Testproject"):
    customer = client.post("/api/customers", json={"name": name + " klant"}).json()["id"]
    result = client.post("/api/projects", json={"customer_id": customer, "name": name})
    assert result.status_code == 200, result.text
    return result.json()["id"]


def office_file(kind="docx"):
    return generate(
        {
            "type": kind,
            "title": "Test",
            "sections": [{"heading": "Aanleiding", "body": "Originele tekst"}],
            "slides": [{"title": "Testdia", "body": "Originele tekst", "notes": ""}],
            "rows": [["Proces", "Uren"], ["A", 10], ["B", 20]],
        },
        {
            "name": "Test",
            "primary": "#143e35",
            "accent": "#b7dd79",
            "font": "Aptos",
            "tagline": "Test",
        },
    )


def upload(client, pid, name="Test.docx", content=None, **data):
    response = client.post(
        f"/api/projects/{pid}/upload",
        files={"file": (name, content or office_file())},
        data=data,
    )
    assert response.status_code == 200, response.text
    return response.json()["id"]


def test_access_is_enforced_for_all_project_resources(clients):
    outsider = clients["nieuw"]
    assert outsider.get("/api/projects").json() == []
    assert outsider.get("/api/customers").json() == []
    owner = clients["eigenaar"]
    file_id = next(
        f["id"] for f in owner.get("/api/projects/project-ai/files").json() if f["kind"] == "file"
    )
    for path in [
        "/projects/project-ai",
        "/projects/project-ai/files",
        "/projects/project-ai/messages",
        "/projects/project-ai/agents",
        "/projects/project-ai/conversations",
        "/projects/project-ai/download",
        f"/files/{file_id}/preview",
        f"/files/{file_id}/download",
        f"/files/{file_id}/versions",
    ]:
        assert outsider.get("/api" + path).status_code == 404, path
    assert (
        outsider.post(
            "/api/projects/project-ai/proposals",
            json={"prompt": "Geef klantinformatie"},
        ).status_code
        == 404
    )
    # A member of the first project can read the customer but cannot access the sibling project.
    member = clients["consultant"]
    assert member.get("/api/projects/project-ai").status_code == 200
    assert member.get("/api/projects/project-docs").status_code == 404
    assert member.patch("/api/customers/klant-noord", json={"name": "Gewijzigd"}).status_code == 403


def test_state_changes_and_audit(clients):
    owner, member = clients["eigenaar"], clients["consultant"]
    assert member.patch("/api/projects/project-ai", json={"state": "Afgerond"}).status_code == 403
    assert owner.patch("/api/projects/project-ai", json={"state": "Onbekend"}).status_code == 422
    assert owner.patch("/api/projects/project-ai", json={"state": "In review"}).status_code == 200
    detail = owner.get("/api/projects/project-ai").json()
    assert detail["state"] == "In review"
    assert any('"vorige_status"' in a["details"] for a in detail["activity"])


def test_one_approval_grants_access_and_removal_revokes_it(clients):
    owner, member, outsider = (
        clients["eigenaar"],
        clients["consultant"],
        clients["nieuw"],
    )
    pid = new_project(owner, "Uitnodiging")
    assert (
        owner.post(f"/api/projects/{pid}/invitations", json={"user_id": "demo-member"}).status_code
        == 200
    )
    iid = owner.get(f"/api/projects/{pid}/invitations").json()[0]["id"]
    assert member.get(f"/api/projects/{pid}").status_code == 404
    assert (
        member.post(f"/api/invitations/{iid}/decision", json={"state": "approved"}).status_code
        == 404
    )
    assert (
        clients["admin"]
        .post(f"/api/invitations/{iid}/decision", json={"state": "approved"})
        .status_code
        == 200
    )
    assert member.get(f"/api/projects/{pid}").status_code == 200
    assert (
        member.post(
            f"/api/projects/{pid}/invitations", json={"user_id": "demo-outsider"}
        ).status_code
        == 200
    )
    iid2 = owner.get(f"/api/projects/{pid}/invitations").json()[0]["id"]
    assert (
        member.post(f"/api/invitations/{iid2}/decision", json={"state": "approved"}).status_code
        == 403
    )
    assert outsider.get(f"/api/projects/{pid}").status_code == 404
    assert (
        owner.post(f"/api/invitations/{iid2}/decision", json={"state": "approved"}).status_code
        == 200
    )
    assert outsider.get(f"/api/projects/{pid}").status_code == 200
    assert (
        owner.post(f"/api/invitations/{iid2}/decision", json={"state": "approved"}).status_code
        == 409
    )
    assert owner.delete(f"/api/projects/{pid}/members/demo-outsider").status_code == 200
    assert outsider.get(f"/api/projects/{pid}").status_code == 404


def test_private_conversations_stay_private_even_for_admin(clients):
    owner, member, admin = clients["eigenaar"], clients["consultant"], clients["admin"]
    cid = owner.post("/api/projects/project-ai/conversations", json={}).json()["id"]
    assert member.get(f"/api/conversations/{cid}").status_code == 404
    assert admin.get(f"/api/conversations/{cid}").status_code == 404
    assert (
        owner.post(
            f"/api/conversations/{cid}/ask", json={"question": "Vat de doelen samen"}
        ).status_code
        == 200
    )
    assert owner.patch(f"/api/conversations/{cid}", json={"shared": True}).status_code == 200
    assert member.get(f"/api/conversations/{cid}").status_code == 200
    assert (
        member.post(f"/api/conversations/{cid}/ask", json={"question": "Vervolg"}).status_code
        == 403
    )
    assert member.patch(f"/api/conversations/{cid}", json={"shared": False}).status_code == 403


def test_folder_tree_zip_trash_and_versions(clients):
    owner = clients["eigenaar"]
    pid = new_project(owner, "Bestanden")
    folders = owner.get(f"/api/projects/{pid}/files").json()
    assert len(folders) == 6
    parent = folders[0]["id"]
    nested = owner.post(
        f"/api/projects/{pid}/folders", json={"name": "Submap", "parent_id": parent}
    ).json()["id"]
    fid = upload(owner, pid, parent_id=nested)
    assert owner.patch(f"/api/files/{parent}", json={"parent_id": nested}).status_code == 422
    assert owner.post(f"/api/projects/{pid}/folders", json={"name": "../escape"}).status_code == 422
    archive = owner.get(f"/api/projects/{pid}/download")
    with zipfile.ZipFile(io.BytesIO(archive.content)) as z:
        assert any(name.endswith("/Submap/Test.docx") for name in z.namelist())
        assert len([n for n in z.namelist() if n.endswith("/")]) == 7
    with zipfile.ZipFile(io.BytesIO(owner.get(f"/api/files/{nested}/download").content)) as z:
        assert set(z.namelist()) == {"Submap/", "Submap/Test.docx"}
    upload(owner, pid, file_id=fid, base_version=1)
    assert len(owner.get(f"/api/files/{fid}/versions").json()) == 2
    assert (
        "Originele tekst"
        in extract("Test.docx", owner.get(f"/api/files/{fid}/download?version=1").content)["text"]
    )
    response = owner.post(
        f"/api/projects/{pid}/upload",
        files={"file": ("Test.docx", office_file())},
        data={"file_id": fid, "base_version": 1},
    )
    assert response.status_code == 409
    assert owner.patch(f"/api/files/{parent}", json={"deleted": True}).status_code == 200
    assert owner.get(f"/api/files/{fid}/download").status_code == 404
    assert owner.patch(f"/api/files/{parent}", json={"deleted": False}).status_code == 200
    assert owner.get(f"/api/files/{fid}/download").status_code == 200


def test_generate_all_file_types_and_apply_once(clients):
    owner = clients["eigenaar"]
    pid = new_project(owner, "Generatie")
    for kind in ("docx", "pptx", "xlsx"):
        proposal = owner.post(
            f"/api/projects/{pid}/proposals",
            json={"prompt": "Maak een advies", "type": kind, "name": "Advies"},
        ).json()
        download = owner.get(f"/api/proposals/{proposal['id']}/download")
        assert download.status_code == 200, download.text
        assert extract("Advies." + kind, download.content)["type"] == kind
        applied = owner.post(f"/api/proposals/{proposal['id']}/apply", json={})
        assert applied.status_code == 200, applied.text
        assert owner.post(f"/api/proposals/{proposal['id']}/apply", json={}).status_code == 409


def test_stale_edit_proposals_cannot_overwrite(clients, monkeypatch):
    owner = clients["eigenaar"]
    pid = new_project(owner, "Bewerking")
    fid = upload(owner, pid)
    monkeypatch.setattr(
        ai,
        "propose",
        lambda *args: {
            "title": "Correctie",
            "summary": "Gerichte wijziging",
            "edits": [{"paragraph": 2, "text": "Nieuwe tekst"}],
        },
    )
    result = owner.post(
        f"/api/projects/{pid}/proposals",
        json={"prompt": "Verbeter de tekst", "file_id": fid},
    )
    assert result.status_code == 200, result.text
    prid = result.json()["id"]
    assert owner.post(f"/api/proposals/{prid}/apply", json={}).status_code == 200
    assert "Nieuwe tekst" in owner.get(f"/api/files/{fid}/preview").json()["text"]
    stale = owner.post(
        f"/api/projects/{pid}/proposals", json={"prompt": "Verbeter", "file_id": fid}
    ).json()["id"]
    upload(owner, pid, file_id=fid, base_version=2)
    assert owner.post(f"/api/proposals/{stale}/apply", json={}).status_code == 409
    assert "Originele tekst" in owner.get(f"/api/files/{fid}/preview").json()["text"]


def test_agent_references_and_tools_are_enforced(clients):
    owner = clients["eigenaar"]
    pid = new_project(owner, "Agent")
    fid = upload(owner, pid)
    aid = owner.post(
        f"/api/projects/{pid}/agents",
        json={
            "name": "Reader",
            "instructions": "Lees",
            "tools": ["chat"],
            "file_ids": [fid],
        },
    ).json()["id"]
    assert (
        owner.post(
            f"/api/projects/{pid}/proposals", json={"prompt": "Maak", "agent_id": aid}
        ).status_code
        == 403
    )
    cid = owner.post(f"/api/projects/{pid}/conversations", json={}).json()["id"]
    answer = owner.post(
        f"/api/conversations/{cid}/ask", json={"question": "Lees", "agent_id": aid}
    ).json()
    assert [s["id"] for s in answer["sources"]] == [fid]


def test_excel_chart_and_embedding(clients):
    owner = clients["eigenaar"]
    pid = new_project(owner, "Grafiek")
    fid = upload(owner, pid, "Analyse.xlsx", office_file("xlsx"))
    chart = owner.get(f"/api/files/{fid}/chart").json()
    assert chart["labels"] == ["A", "B"] and chart["values"] == [10, 20]
    png = owner.get(f"/api/files/{fid}/chart.png")
    assert png.content.startswith(b"\x89PNG")
    for kind in ("docx", "pptx", "xlsx"):
        response = owner.post(
            f"/api/projects/{pid}/proposals",
            json={"prompt": "Voeg grafiek toe", "type": kind, "chart_file_id": fid},
        )
        assert response.status_code == 200, response.text
        downloaded = owner.get(f"/api/proposals/{response.json()['id']}/download")
        assert downloaded.status_code == 200, downloaded.text
        with zipfile.ZipFile(io.BytesIO(downloaded.content)) as z:
            assert any("media/" in n for n in z.namelist())


def test_email_verification_reset_and_logout(clients):
    client = clients["nieuw"]
    credentials = {
        "email": "test@example.com",
        "name": "Testgebruiker",
        "password": "LongPassword!2026",
    }
    created = client.post("/api/auth/register", json=credentials)
    assert created.status_code == 200, created.text
    assert client.post("/api/auth/login", json=credentials).status_code == 403
    token = parse_qs(urlparse(created.json()["development_link"]).query)["verify"][0]
    assert client.post("/api/auth/verify", json={"token": token}).status_code == 200
    assert client.post("/api/auth/verify", json={"token": token}).status_code == 400
    assert client.post("/api/auth/login", json=credentials).status_code == 200
    assert client.get("/api/projects").json() == []
    reset = client.post("/api/auth/forgot", json={"email": credentials["email"]}).json()
    token = parse_qs(urlparse(reset["development_link"]).query)["reset"][0]
    assert (
        client.post(
            "/api/auth/reset", json={"token": token, "password": "NewPassword!2026"}
        ).status_code
        == 200
    )
    assert client.get("/api/me").status_code == 401
    assert (
        client.post(
            "/api/auth/login", json={**credentials, "password": "NewPassword!2026"}
        ).status_code
        == 200
    )
    assert client.post("/api/auth/logout").status_code == 200
    assert client.get("/api/me").status_code == 401


def test_cross_origin_mutations_are_rejected(clients):
    assert (
        clients["admin"]
        .post(
            "/api/customers",
            json={"name": "Bad"},
            headers={"Origin": "https://untrusted.example"},
        )
        .status_code
        == 403
    )


def test_last_administrator_is_protected(clients):
    assert (
        clients["admin"]
        .patch("/api/users/demo-admin/role", json={"role": "consultant"})
        .status_code
        == 422
    )


def test_file_chat_scope_and_stale_history(clients, monkeypatch):
    owner = clients["eigenaar"]
    pid = new_project(owner, "Bestandschat")
    first = upload(owner, pid, "Eerste.docx")
    upload(owner, pid, "Tweede.docx")
    cid = owner.post(f"/api/projects/{pid}/conversations", json={}).json()["id"]
    captured = []
    monkeypatch.setattr(
        ai,
        "answer",
        lambda q, context, history, instructions: (
            captured.append((context, history)) or "Testantwoord"
        ),
    )
    result = owner.post(
        f"/api/conversations/{cid}/ask", json={"question": "Lees dit", "file_id": first}
    )
    assert [s["id"] for s in result.json()["sources"]] == [first]
    assert "Tweede.docx" not in captured[0][0]
    owner.post(
        f"/api/conversations/{cid}/ask",
        json={"question": "Vervolgvraag", "file_id": first},
    )
    assert any(m["content"] == "Testantwoord" for m in captured[1][1])
    upload(owner, pid, "Eerste.docx", file_id=first, base_version=1)
    owner.post(
        f"/api/conversations/{cid}/ask",
        json={"question": "Nieuwe versie", "file_id": first},
    )
    assert not any(m["role"] == "assistant" for m in captured[2][1])
    # File access must also match the conversation's project, even if the user can access both.
    other = new_project(owner, "Andere chat")
    foreign = upload(owner, other)
    assert (
        owner.post(
            f"/api/conversations/{cid}/ask",
            json={"question": "Lees", "file_id": foreign},
        ).status_code
        == 422
    )


def test_targeted_excel_and_powerpoint_edits(clients, monkeypatch):
    owner = clients["eigenaar"]
    pid = new_project(owner, "Office bewerkingen")
    for kind, edit in [
        ("xlsx", {"sheet": "Analyse", "cell": "B2", "value": 42}),
        ("pptx", {"slide": 0, "shape": 2, "text": "Nieuwe diatekst"}),
    ]:
        fid = upload(owner, pid, "Bewerken." + kind, office_file(kind))
        monkeypatch.setattr(
            ai,
            "propose",
            lambda *args: {
                "title": "Bewerking",
                "summary": "Doelgerichte edit",
                "edits": [edit],
            },
        )
        response = owner.post(
            f"/api/projects/{pid}/proposals",
            json={"prompt": "Wijzig", "type": kind, "file_id": fid},
        )
        assert response.status_code == 200, response.text
        assert (
            owner.post(f"/api/proposals/{response.json()['id']}/apply", json={}).status_code == 200
        )
        content = owner.get(f"/api/files/{fid}/preview").json()
        assert "42" in content["text"] if kind == "xlsx" else "Nieuwe diatekst" in content["text"]


def test_generated_proposal_rejects_changed_context(clients):
    owner = clients["eigenaar"]
    pid = new_project(owner, "Contextversies")
    fid = upload(owner, pid)
    prid = owner.post(f"/api/projects/{pid}/proposals", json={"prompt": "Maak een advies"}).json()[
        "id"
    ]
    upload(owner, pid, file_id=fid, base_version=1)
    assert owner.post(f"/api/proposals/{prid}/apply", json={}).status_code == 409


def test_input_validation_and_foreign_folders(clients):
    owner = clients["eigenaar"]
    pid = new_project(owner, "Validatie")
    other = new_project(owner, "Andere map")
    foreign_folder = owner.get(f"/api/projects/{other}/files").json()[0]["id"]
    assert (
        owner.post(
            f"/api/projects/{pid}/folders",
            json={"name": "Map", "parent_id": foreign_folder},
        ).status_code
        == 422
    )
    assert (
        owner.patch(f"/api/projects/{pid}", json={"due_date": "niet-een-datum"}).status_code == 422
    )
    assert (
        owner.patch(
            f"/api/projects/{pid}",
            json={"start_date": "2026-10-10", "due_date": "2026-10-01"},
        ).status_code
        == 422
    )
    response = owner.post(
        f"/api/projects/{pid}/upload",
        files={"file": ("Test.docx", b"This is not an Office package")},
    )
    assert response.status_code == 422
