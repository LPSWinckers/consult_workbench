# Decisions

## 001: Build a local personal-PC PoC first

The developer has no current access to the company Office environment. Use sample data, SQLite and local immutable blobs to implement and verify the consulting workflow now. Preserve the later Next.js/Python/OpenAI architecture. Validate Microsoft integration separately when company access becomes available.

## 002: Open Office alongside the application

The project owner accepts opening Office in a separate window or tab. The intended company integration uses SharePoint for working files and an Office task-pane add-in for project-aware AI. Full Office editing is supplied by Office itself.

Microsoft's documented Cloud Storage Partner Program embedding route has provider eligibility requirements beyond end-user licensing. A single-company internal pilot should not assume it qualifies. See the [Microsoft integration requirements](https://learn.microsoft.com/en-us/microsoft-365/cloud-storage-partner-program/online/overview) and [Office add-in overview](https://learn.microsoft.com/en-us/office/dev/add-ins/overview/office-add-ins).

## 003: One authoritative working file with immutable versions

Local blobs represent file versions while SQLite holds the logical folder tree. Later, SharePoint will become the working-file authority. We will avoid a design with competing local and remote originals. Optimistic concurrency prevents overwriting a newer version.

## 004: Separate team discussion from AI conversations

Team chat is shared. AI chat starts private, with explicit sharing controlled by the creator. Sharing gives read-only access to other project members. Admin roles do not override private conversation ownership.

## 005: Use structured document operations

Models propose constrained data. Python writers generate or modify native Office files. This allows preview, validation and version checks before writes. It also makes the limits explicit: rich formatting within edited text blocks may be simplified; native Office validation remains required.

## 006: Use the Responses API with configurable models

The official documentation recommends Responses for new applications. Model selection can change independently of the application workflow. `OPENAI_MODEL` defaults to `gpt-6.1-sol`; document proposals use `OPENAI_COMPLEX_MODEL`, defaulting to `gpt-6-astra`. Requests set `store=False`.

Official references checked during planning and implementation:

- [Responses migration guidance](https://developers.openai.com/api/docs/guides/migrate-to-responses)
- [Model catalog](https://developers.openai.com/api/docs/models)
- [Text generation](https://developers.openai.com/api/docs/guides/text)
- [File input limitations](https://developers.openai.com/api/docs/guides/file-inputs)

No verified DevDay 2026 release bundle was established. Model defaults depend on account availability and must be evaluated against the project's own prompts rather than treating an event name as an implementation requirement.
