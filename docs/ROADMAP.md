# Roadmap and limitations

## Implemented local PoC

- Dutch responsive workspace with sample branding and sample customers/projects.
- Email/password accounts, verification/reset links, SMTP configuration, logout and server-side sessions.
- Customer profiles and restricted project access.
- Project states, dates, archive and audit events.
- Invitation requests with one owner/admin approval.
- Persistent team chat and private/shared AI conversations.
- Project and file-specific AI context and configurable agents.
- Folder CRUD, uploads, soft deletion, versions and ZIP download.
- Content previews for Word, Excel and PowerPoint.
- Structured document generation and review/apply workflow.
- Company colors/fonts/tagline applied to generated presentations.
- Interactive Excel-derived bar charts, sheet/column selection, PNG export and chart insertion into generated Office files.
- Admin-configurable Codex chat/document models and explicit offline provider.
- Native Office working copies, exact-byte version imports and conflict recovery downloads.

## Needs a configured service to validate

Live Codex requests were checked using the host login: file-scoped question with a known answer, Word/PowerPoint/Excel generation and Apply, and Dutch spelling corrections through indexed edits. Admin model settings and connection testing are implemented. The ordinary automated suite uses explicit offline mode and never calls Codex. Other models require separate account-access and quality checks.

Real email verification and recovery require SMTP. Development links are intended only for local sample accounts. Configured SMTP paths need a delivery check against a test inbox.

Native Office visual fidelity and formula behavior need validation in Word, PowerPoint and Excel. Local tests confirm valid packages and targeted content edits; they do not prove all Office features survive every possible edit.

## Microsoft 365 phase

1. Get company administrator approval and register the application's Microsoft identity.
2. Agree on delegated access, tenant restrictions and least-privilege SharePoint permissions.
3. Map each customer/project to its SharePoint location, and align app memberships with actual SharePoint access.
4. Implement token handling, remote file IDs, eTags, versions, sync and upload sessions. Establish one working-file authority.
5. Open project files in Office and preserve their project identity.
6. Implement and deploy the task-pane add-in for Word, Excel and PowerPoint.
7. Verify selected-text/range/slide operations supported by each Office API and client version.
8. Prove the full open, context, edit, save and sync path in all three applications.

This phase needs real tenant and Office access. The current UI exposes optional desktop Office editing and marks SharePoint as requiring tenant configuration. It does not present a fake SharePoint connection.

## Product extensions

- Customer-level reference file library shared across explicitly authorized projects.
- Uploaded PowerPoint master templates, company logo assets and better slide layout choices.
- Agent editing, reusable company agents and a workflow builder.
- Chart ranges beyond the bounded content preview and reliable formula recalculation. Sheet/column selection is implemented.
- Interactive content add-ins for Excel and PowerPoint; static fallback for exports and Word.
- Rich document diff, per-correction acceptance and higher-fidelity preview rendering.
- Team-chat attachments, mentions and real-time delivery.
- Background generation/indexing jobs and progress reporting.
- Project ownership transfer and customer-access revocation UI.

## Before using real customer data or hosting publicly

Introduce proper database migrations, a production database, encrypted storage and backups, company-only registration, persistent rate limiting, HTTPS cookies, centralized session management, file malware scanning, access/audit monitoring, retention policies and queued AI jobs. Review Codex account and data handling and the company's confidentiality requirements with the actual deployment configuration.

These are deployment tasks. They are not prerequisites for trying the local sample-data demo.
