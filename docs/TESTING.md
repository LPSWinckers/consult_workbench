# Verification

## Automated checks

Run from the repository root:

```powershell
./.venv/Scripts/python.exe -m pytest -q
```

The backend tests create a separate temporary data directory and remove the OpenAI key from their environment. They never modify the working demo database or call a paid API.

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

## Live OpenAI check

After configuring an API key, confirm settings show OpenAI configured. Ask a fact question with a known answer in `Projectbrief.docx`, then ask a follow-up. Test a file-scoped question to ensure other file contents are excluded. Run Dutch language review on a deliberately misspelled sample document, inspect the proposed corrections and apply them. Generate Word, Excel and PowerPoint drafts and inspect them in Office when available.

Record the model, prompts, source versions and observed outcomes. Availability or language quality cannot be established by the offline test suite.

## Initial verification record

Next.js production build and TypeScript checks passed. All 16 backend workflow tests passed, including file-scoped chat history, all three targeted Office edit types, folder ZIP downloads and source-version conflicts. Browser checks exercised login, project navigation, Excel content preview and interactive chart generation. Live OpenAI, SMTP and Microsoft 365 checks remain pending service credentials and company access.
