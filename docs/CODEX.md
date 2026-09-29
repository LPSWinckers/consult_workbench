# Codex integration

The prototype uses the native Codex CLI and the host PC's existing login. It does not use an OpenAI API key. Install Codex and run `codex login` as the same Windows user that starts the backend. Verify `codex login status` before opening the app. This integration was exercised with CLI version 0.159.0.

If Codex is not on PATH, set `CODEX_BINARY` in `backend/.env` to the native executable's absolute path. An npm `.cmd` launcher is rejected because the backend executes argument arrays without a shell. On this development PC, the native executable was installed under `AppData/Local/Programs/OpenAI/Codex/bin/codex.exe`.

## Admin settings

Administrators select the provider, chat model, document/review model and reasoning effort under **Instellingen**. Settings persist in SQLite and apply to subsequent requests. Existing responses and drafts retain their content. Model suggestions come from Codex's local `models_cache.json`; a custom model slug can be entered. The cached catalog does not establish account access.

Both defaults are `gpt-6.1-sol`. `CODEX_MODEL` and `CODEX_DOCUMENT_MODEL` set initial defaults until the administrator saves company settings. The connection test makes a real request using the saved chat model and consumes Codex usage. A document proposal tests the separately selected document model. Unsupported model names or reasoning levels produce an error rather than an offline response.

`AI_PROVIDER=demo` explicitly selects labelled offline examples. `DEMO_MODE` separately controls sample accounts and development email links. Turning demo accounts on does not force offline AI.

## Request boundary

The adapter follows the structured `codex exec` pattern inspected in `G:/t3code-main/apps/server/src/textGeneration/CodexTextGeneration.ts`. It creates a temporary directory, supplies only authorized project context on stdin, requests schema-constrained JSON and validates that JSON with Pydantic. Python document writers perform approved changes.

Each request is ephemeral and independent. History is assembled by the application's permission checks rather than resuming a host-wide Codex thread. Host user configuration and execution rules are ignored. Shell, unified execution, apps, multi-agent, JavaScript, local image tools and web search are disabled; the sandbox is read-only. The model has no reason to inspect the host's project files. Never replace these restrictions with a prompt-only instruction or enable a host MCP configuration for project chat.

Two concurrent requests are allowed, each with a three-minute timeout. CLI diagnostics can include prompts, so the API returns a bounded configuration error rather than raw stdout or stderr. Temporary request files are removed when the call finishes. Codex's own authentication and operational logs remain subject to the host's configuration and retention policy.

This local pilot uses the host account for requests from its application users. It is not a per-consultant Codex sign-in or a public subscription-sharing service. Decide the company account and usage policy before deploying beyond a trusted local pilot.

Official references: [Codex authentication](https://developers.openai.com/codex/auth), [configuration reference](https://developers.openai.com/codex/config-reference), [non-interactive mode](https://developers.openai.com/codex/noninteractive).
