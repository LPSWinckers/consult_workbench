# Architecture

## Request flow

```text
Browser
  -> Next.js :3000
     -> /api proxy -> FastAPI :8000
        -> authorization -> SQLite metadata
        -> LocalStorage -> immutable Office blobs
        -> context extraction -> OpenAI Responses API
        -> structured proposal -> document writer -> new version
```

The browser sends an HttpOnly session cookie to the same origin. Next.js proxies `/api/*` to the configured backend. Direct API documentation is exposed on localhost for development. Both services bind to loopback by default.

## Modules

| Module                          | Responsibility                                                                                 |
| ------------------------------- | ---------------------------------------------------------------------------------------------- |
| `frontend/app/page.tsx`         | Workspace navigation, dashboard, customers, project overview, invitations, agents and settings |
| `frontend/components/auth.tsx`  | Login, signup, verification and password reset flows                                           |
| `frontend/components/files.tsx` | File browser, previews, file chat, charts and proposal review                                  |
| `frontend/components/chats.tsx` | Team chat and private/shared project AI conversations                                          |
| `frontend/components/ui.tsx`    | API client and shared UI elements                                                              |
| `frontend/components/types.ts`  | Client data contracts                                                                          |
| `backend/app/main.py`           | API routes, input validation, authorization, context composition and workflow transactions     |
| `backend/app/db.py`             | SQLite schema, transactions, IDs, password hashing, timestamps and audit events                |
| `backend/app/storage.py`        | Storage protocol and local immutable blob adapter                                              |
| `backend/app/documents.py`      | Office validation, extraction, generation, targeted edits and PNG charts                       |
| `backend/app/ai.py`             | OpenAI adapter, structured draft schema and labelled demo mode                                 |

The API is synchronous for AI processing in this pilot. FastAPI runs synchronous handlers in its thread pool. Production deployment should move generation and indexing into a job queue.

## Persistence

SQLite stores accounts, sessions, email tokens, customer access, projects, membership, invitations, file metadata, immutable-version references, team messages, conversations, agents, proposals and company settings. Foreign keys are enabled for every connection. The database is initialized on startup; incremental migrations must be introduced before changing existing columns.

Files have persistent IDs independent of names and folders. Parent IDs form the logical tree. Blob keys are random identifiers, never user-provided paths. Each version points to an immutable blob. Soft-deleted folders include their descendants in trash. Restoring checks active name conflicts.

Apply uses `BEGIN IMMEDIATE`, checks proposal ownership and current versions, creates the new blob/version and marks the proposal applied. Replacement uploads use a conditional version update. Failed transactions can leave unreferenced blobs; garbage collection is a roadmap item, not a reason to delete original versions.

`FileStorage` is the content read/write interface. A SharePoint implementation will also require remote IDs, OAuth tokens, version/eTag mapping, upload sessions and synchronization. Replacing this adapter alone will not complete the Microsoft integration.

## Authentication

Passwords use salted scrypt. Session identifiers are cryptographically random, expire after 24 hours and are stored server-side. Cookies are HttpOnly and SameSite=Lax. Set `COOKIE_SECURE=true` when using HTTPS. Reset tokens expire after an hour and are consumed once; resetting a password revokes existing sessions.

Local demo mode exposes development verification/reset links intentionally. SMTP sends real messages when configured. Turn demo mode off before using real accounts. Authentication requests have a process-local IP rate limit. Origin checks reject browser mutations from unexpected origins. Persistent throttling, stronger session management and an invitation-only company registration policy are needed for production.

## AI and document changes

The backend owns the API key. Requests use `store=False`. Both model names are configurable. A model proposes data, not executable scripts. Pydantic structured outputs describe headings, paragraphs, slide text, notes, tabular rows and targeted edits. Native Python libraries perform those operations.

Permissions are checked before context assembly and again after the external AI call. A file-specific question narrows context to one file. Agent reference limits are intersected with that choice. Model-supplied text never grants access to another resource.

File extraction and context composition are rebuilt per request. Historical assistant messages are excluded from future model context if their recorded sources changed, disappeared or lie outside the current reference selection. Existing conversation history remains visible to its owner or explicitly shared project members.

## API inspection

Run the backend and inspect `/docs` or `/openapi.json` for the current route definitions. The UI uses JSON API calls plus multipart uploads and authenticated downloads. Errors follow FastAPI's `detail` format.

## Personal-PC tradeoffs

Local storage and SQLite avoid external infrastructure for the sample-data pilot. There is no SharePoint connection, embedded Office editor or Office add-in in this implementation. The client does not calculate spreadsheet formulas or render Office layouts. Its previews are designed to inspect content and support AI review.
