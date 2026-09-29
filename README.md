# Meridian Consulting

A Dutch consulting workspace built with Next.js and a Python FastAPI backend. The local PoC supports customers, projects, access controls, invitation approvals, team chat, private/shared AI conversations, configurable agents, Office file versions, document proposals and Excel charts.

The prototype uses local Codex login and works with sample data. On a licensed Windows work PC, it can open native Office files and import saved changes as immutable versions. SharePoint synchronization and the Office add-in remain the next phase.

## Start on Windows

Requirements: Node.js 20.9 or later, Python 3.12, and PowerShell. Run commands from this repository's root.

```powershell
./scripts/setup.ps1
./scripts/start.ps1
```

Open [http://localhost:3000](http://localhost:3000). The API documentation is available at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

Stop servers started by the helper with:

```powershell
./scripts/stop.ps1
```

Alternatively, run the backend and frontend in two terminals:

```powershell
cd backend
../.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

```powershell
cd frontend
npm run dev
```

The helpers bind to localhost. Logs, SQLite data and file blobs are stored in `data/`, which is excluded from version control. Back up that entire directory together while the backend is stopped.

## Demo accounts

All sample accounts use `MeridianDemo!2026`.

| Email                      | Role and access                                             |
| -------------------------- | ----------------------------------------------------------- |
| `admin@meridian.demo`      | Company administrator, company-wide customer/project access |
| `eigenaar@meridian.demo`   | Owner of both sample projects, direct customer access       |
| `consultant@meridian.demo` | Member of the Noordlicht project only                       |
| `nieuw@meridian.demo`      | No customer/project access, useful for testing invitations  |

Sample accounts and documents are created only in demo mode when the database has no users. Restarting the backend preserves changes.

New accounts require email verification. In local demo mode, signup and password recovery show an explicit development link instead of sending mail. Configure SMTP to test actual email delivery. Registration alone grants no access to existing customers or projects.

## Enable Codex and choose models

Install native Codex CLI and run `codex login` on the PC running the backend. No API key is required. Copy `backend/.env.example` to `backend/.env` and set `CODEX_BINARY` if the native executable is not on PATH. The default provider is Codex; offline examples must be explicitly selected.

Administrators can change chat and document/review models under **Instellingen**, save them and test the saved chat model. Both initially use `gpt-6.1-sol`. See [Codex configuration](docs/CODEX.md) for account, model access and subprocess restrictions.

For full native Office editing, set `OFFICE_DESKTOP_ENABLED=true` on your licensed Windows work PC. Open a file in Office, save and close it, then import it as a new project version. See [work-PC setup](docs/WORK_PC.md) for conflict handling and company acceptance checks.

## Try the PoC

1. Log in as the owner and open **AI-strategie & implementatie**.
2. Open **Bestanden**, then **04 Analyse**, then `Procesanalyse.xlsx`.
3. View the spreadsheet, open its chart and ask a question in the file assistant.
4. Use **Maak met AI** to prepare a PowerPoint proposal and optionally insert the Excel chart.
5. Review the proposal, then save it in the project. Download the resulting `.pptx`.
6. Request an invitation for Noor from **Team & toegang**. Approve it once as the owner or administrator.
7. Log in as `nieuw@meridian.demo` and confirm the approved project becomes accessible.

## Development

```powershell
./.venv/Scripts/python.exe -m pytest -q
cd frontend
npm run typecheck
npm run build
npm run format:check
```

Backend dependencies are locked in `backend/requirements.lock.txt`; frontend dependencies use `frontend/package-lock.json`. See [docs/TESTING.md](docs/TESTING.md) for verification details.

## Documentation

- [AGENTS.md](AGENTS.md): development instructions. [AGENT.md](AGENT.md) points to the same source.
- [Product specification](docs/SPEC.md): agreed behavior and authorization rules.
- [Architecture](docs/ARCHITECTURE.md): modules, database, storage and AI design.
- [Decisions](docs/DECISIONS.md): why local storage, versioning and Office integration were chosen.
- [Roadmap](docs/ROADMAP.md): current limitations and the path to Microsoft 365.
- [Codex](docs/CODEX.md): local login, models and request boundaries.
- [Work-PC pilot](docs/WORK_PC.md): licensed Office setup and version import.
- [Testing](docs/TESTING.md): automated checks and manual pilot scenarios.

This PoC uses sample data. Full manual Office functionality is provided by the optional native desktop workflow; the browser previews are content views. They do not render full Office layouts or calculate Excel formulas.
