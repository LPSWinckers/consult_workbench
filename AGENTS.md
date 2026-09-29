# Development instructions

This repository implements the Meridian Consulting PoC for one company, 1–8 consultants, Dutch UI and sample data. The current application runs on a personal PC without Microsoft Office.

## Before changing code

- Read [docs/SPEC.md](docs/SPEC.md) when changing access, invitations, project states, collaboration or document behavior. It is the authoritative product specification.
- Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) when changing persistence, authentication, storage, API boundaries or AI context.
- Read [docs/ROADMAP.md](docs/ROADMAP.md) before adding Microsoft 365, Office add-ins, production hosting or features beyond the local PoC.
- Read [docs/TESTING.md](docs/TESTING.md) when adding or running checks. Report which checks actually ran.
- For Next.js changes, also follow `frontend/AGENTS.md` and the installed Next.js documentation it references.

## Rules that must survive every change

- Enforce authorization in Python before reading data or calling OpenAI. UI visibility is a convenience, not an access control.
- Retrieve AI context from the currently authorized project and current live file versions. Keep other projects and private conversations out of context.
- Keep private AI conversations private even from company administrators. Sharing is the conversation owner's decision.
- Save original file versions. Apply AI edits only after explicit review, with a current-version check in the same transaction as the write.
- Treat generated output as structured data. Document writers use allowlisted operations; model-generated code is never executed.
- Label offline examples as demonstrations. API failures must surface as failures instead of silently producing sample responses.
- Keep OpenAI and SMTP secrets on the backend, outside version control. Use sample data while Microsoft integration and production controls remain incomplete.
- Preserve Dutch product copy. Keep internal identifiers and development documentation in English.

## Completion

For permission, persistence or document changes, add meaningful workflow coverage and run the affected backend tests. For frontend changes, run type checking and a production build. Verify changed user flows in the browser when available. Update the specification or roadmap if behavior or limitations changed.

Use `AGENTS.md` as the instruction source of truth. `AGENT.md` is a compatibility pointer requested by the project owner.
