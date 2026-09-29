# Verification

## Automated checks

Run from the repository root:

```powershell
./.venv/Scripts/python.exe -m pytest -q
```

The backend tests create a separate temporary data directory and select the offline AI provider in their environment. They never modify the working demo database or call Codex.

Workflow coverage includes unauthorized project/file/AI access, customer read versus edit permissions, owner/admin state changes and audit records, pending invitations, one approval, membership removal, private conversation isolation, sharing, folder cycles, ZIP structure, trash restore, immutable versions, all three generated Office packages, stale edit rejection, agent limits, chart export and insertion, email verification, password reset, session revocation, origin checks and preserving the last administrator.

Run frontend checks from `frontend/`:

```powershell
npm run typecheck
npm run build
npm run format:check
```

Use `npm run format` to apply the shared formatter. The backend uses Ruff formatting; install Ruff in the virtual environment and run `ruff format backend` when changing Python code.

## Browser checklist

- Log in as the owner. Verify both sample projects are listed.
- Log in as the member. Verify only Noordlicht is visible and its state cannot be changed.
- Log in as Noor. Verify the empty customer/project lists and denied direct file downloads.
- Request an invitation, confirm pending access is denied, approve once and confirm access.
- Send a team message and view it from another member account.
- Ask a project question, confirm the conversation starts private, then share it explicitly.
- Open each Office preview. Ask a question in the file assistant.
- Open Excel chart details, export PNG and create a draft with that chart.
- Review and save a draft, then verify its native file download and version history.
- Upload a replacement version while an edit proposal is open. Apply must fail with a version conflict.
- Rename/move a folder, delete/restore it, and inspect the downloaded ZIP.
- Check desktop and narrow screen widths for overflow and reachable actions.

## Opt-in live Codex check

```powershell
./.venv/Scripts/python.exe scripts/smoke-codex.py
```

This uses the host Codex login, consumes usage and creates its entire sample workspace in a temporary directory. It verifies a known-answer file-scoped chat, native package generation and Apply for all three types, and Dutch correction edits. It never writes to the working database. For another model, change the model environment defaults before running it.

## Verification record, 29 September 2026

The backend suite has 22 passing tests. New coverage verifies admin-only persistent model settings, separate Codex model routing, subprocess restrictions, sheet/column chart selection and native-byte Office imports for all three types, immutable versions and stale checkout conflicts. Desktop launches are mocked in those tests. Live checks passed with Codex CLI 0.159.0 and `gpt-6.1-sol` at high reasoning effort for scoped chat, DOCX/PPTX/XLSX generation/Apply and Dutch correction edits.

TypeScript, Prettier, Ruff and the Next.js production build passed. Windows helper start/stop/restart was verified with healthy services. Browser checks exercised the administrator settings, model fields, successful real Codex connection check and the worksheet/column chart controls without page or modal overflow at the tested desktop width. Earlier checks exercised login, project navigation, Excel preview, charts and document Apply. Actual native Office applications, SMTP delivery and SharePoint remain work-PC/company acceptance checks. The content/package tests do not prove Office visual fidelity.
