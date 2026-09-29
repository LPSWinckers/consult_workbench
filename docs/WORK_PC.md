# Work-PC pilot

## Setup

1. Clone the repository, install Node.js and Python, then run `scripts/setup.ps1`.
2. Install native Codex CLI and run `codex login` under the Windows account that will run the backend.
3. Copy `backend/.env.example` to `backend/.env`. Set `CODEX_BINARY` if needed and set `OFFICE_DESKTOP_ENABLED=true` after installing licensed Word, Excel and PowerPoint.
4. Run `scripts/start.ps1`. Open `http://localhost:3000`, log in with a sample account and test Codex under **Instellingen**.

The app remains bound to localhost. Office launches on the machine running the backend, even if a browser is on another computer. Use the same interactive Windows desktop for this pilot. A Windows service or remote shared server cannot supply each consultant with their own desktop editor through this workflow.

## Full Office editing

Open a project file, select **Bewerken in Office**, and use the native application. The backend creates a personal working copy under `data/office/<checkout-id>/`. It opens that copy through Windows' file association. Manual editing preserves the native package and gives access to the normal Office functions supported by the installed application.

Save and close Office, then select **Office-wijzigingen als versie opslaan** in the file preview. The app validates the package and stores its exact bytes as a new immutable version. Repeated import without changes creates no extra version. Original versions remain downloadable.

Working copies are separate for each application user. App authorization is checked when opening, downloading and importing them. The Windows account running the backend can still read local files directly; app accounts do not provide operating-system isolation.

If a colleague saves a newer project version, import returns a conflict and preserves your working copy. Use **Download werkkopie**, compare it with the current project file in Office, and deliberately upload the resolved file as a new version. Reopening a stale checkout also fails to avoid replacing your edits. No automatic merge or live coauthoring is implied.

The browser content preview supports file chat and AI proposals. It does not render complete Office layouts or recalculate workbook formulas. AI proposals still require review and Apply. Editing text through Python may simplify formatting in the replaced text block; native manual editing avoids that conversion.

## SharePoint and add-ins

Desktop licensing alone does not configure a SharePoint connection. Tenant ID, app registration, approved permissions and a project-to-library mapping are still needed. There is no background SharePoint synchronization or deployed Office task-pane add-in in this PoC. These remain explicit follow-up work in `ROADMAP.md`.

## Company acceptance checks

- Open, edit, save and import a sample file in each Office application. Confirm formatting, formulas, notes and existing embedded charts survive the native round trip.
- Try the same file from two app accounts and confirm the second save produces a conflict.
- Confirm Codex login/model access under the actual backend Windows account.
- Configure SMTP and test verification/reset against a company test inbox.
- Keep company customer data out of the pilot until its access, storage and AI account policies have been agreed.
