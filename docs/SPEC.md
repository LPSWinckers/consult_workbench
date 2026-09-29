# Product specification

## Agreed scope

One consulting company, 1–8 pilot users, Dutch interface and Dutch document assistance, sample data. Frontend: Next.js. Backend: Python. AI provider: OpenAI API. The company has Microsoft 365 and SharePoint, but development currently happens on a personal PC without Office access.

The company is fictional Meridian Consulting. It has a sample visual identity and configurable name, document colors, font, tagline and folder template.

## Authorization

Company administrators have company-wide customer/project access and manage company settings and account roles. An administrator cannot remove the last administrator role.

Consultants see a customer only through direct customer access or membership of a project belonging to that customer. Direct customer access permits editing the profile and creating projects. Project membership permits reading its parent customer profile, but does not grant direct customer editing or access to sibling projects. Administrators grant direct customer access.

Creating a customer grants its creator direct access. Creating a project makes its creator the owner and a member. Project owners and administrators can edit the project brief, change its state, archive it and remove members. The owner cannot be removed.

All project members can request invitations for verified company accounts. An invitation grants no access while pending. One approval by either the project owner or a company administrator grants membership. The decision is final for that invitation; a rejected invitation can be requested again. Removing membership immediately prevents subsequent project reads and AI actions. An administrator's global access is governed by their company role.

The company user directory contains verified colleagues' names and emails to support invitations. This directory does not expose their customer/project data.

Every file, version, download, chart, conversation, agent and proposal request is checked by the backend. Inaccessible resources return 404. Authorized users attempting owner-only actions receive 403.

## Customer and project information

Customers have a name, industry, background, contact information and goals. Projects have a customer, name, scope, objectives, owner, start date and target completion date. Empty dates are allowed; a completion date cannot precede the start date.

Project states:

| Dutch label   | Meaning                   |
| ------------- | ------------------------- |
| Concept       | Initial setup             |
| Gepland       | Ready to start            |
| In uitvoering | Work underway             |
| In review     | Deliverables under review |
| On hold       | Temporarily paused        |
| Afgerond      | Work finished             |
| Geannuleerd   | Stopped before completion |

The owner and administrators can select any state. Changes record previous and new state, actor and timestamp. State changes do not modify files or editing permissions. Archiving is separate from state and affects overview visibility.

## Standard folders

New projects copy the current company folder template. Changes to that template affect new projects only.

```text
01 Brief en planning/
02 Klantinformatie/
03 Onderzoek/
04 Analyse/
05 Opleveringen/
06 Vergaderingen/
```

Members can create nested folders, upload, rename and move files, delete files/folders and restore them from trash. Names are unique within a live folder. A folder cannot move into its own descendants. Files retain their extension when renamed. Both project and individual folder ZIP downloads preserve logical folder structure, including empty folders, and omit trash.

Allowed uploads: `.docx`, `.pptx`, `.xlsx`, up to 20 MB. Macro-enabled packages are rejected. A replacement upload increments the version only if its base version is current. Old versions remain downloadable. Restoring a folder restores its descendants, subject to name conflicts.

## Collaboration

Team chat is shared among project members and persists in the database. The initial client polls for messages every five seconds. It supports plain text rather than attachments or mentions.

AI conversations start private. Only their creator can share or make them private again. Shared conversations are read-only to other project members; they can start their own conversation. Company administrators do not bypass private conversation ownership. File-assistant conversations also appear in project AI chat.

## AI behavior

The backend assembles customer/project information and current, live project files after permission checks. Agents can narrow reference files and define instructions and enabled functions. Empty reference selection means all available project files.

Agent functions are the implemented chat, document generation, document review and chart functions. They are not arbitrary user-written code or autonomous external integrations. The server enforces function permissions and reference boundaries.

Project chat uses the project context. File chat uses customer/project details and the selected file. Recent history can be reused only when its recorded file sources remain current and within the selected context. Source badges show the context files and versions, not a guarantee that every model statement is correct. The model is instructed to cite file locations and disclose missing information.

Context is bounded for the small PoC: at most 70,000 characters of project context, up to 14,000 characters from each file, and up to 40,000 extra characters from the editing target. Truncation is disclosed on context sources. This is direct text extraction, not a vector search service. Spreadsheet context includes cell coordinates and formulas; extracted slide text excludes embedded images, charts and diagrams.

Without a configured key, demo mode returns explicit offline examples. It never claims a real spelling review happened. With a key, OpenAI errors surface as errors, with no silent demo fallback.

## Document tools

New Word documents contain styled headings and body text. New presentations use company colors, fonts, tagline and slide notes. New Excel files contain formatted tabular data. The deterministic document writers turn structured AI drafts into native Office files.

Editing uses indexed paragraph replacements for Word, slide/text-shape replacements for PowerPoint, and sheet/cell writes for Excel. Unrelated content stays in the original package; rich formatting within changed paragraphs or text shapes may be simplified. Users review all changes before Apply. Review can cover Dutch spelling, grammar, structure and consistent terminology.

An AI proposal is private to its creator. Apply checks that target and recorded context versions remain current, then writes a new version in a transaction. Repeated Apply is rejected. Generated files can be downloaded as concepts before saving.

Charts use labels in Excel column A and numeric values in column B, with a header row. Up to 50 points from the first 200 displayed rows are supported. Interactive chart details work in the browser. PNG exports can be embedded into generated Word, PowerPoint and Excel files. Source workbook, sheet, range and version are recorded. Formula-derived values are not calculated locally.

## Explicit boundaries

Full manual Office functionality belongs to the later Office integration. Current previews are content views. SharePoint sync, Office add-in deployment, customer-level reference uploads, arbitrary chart-range selection, user-supplied PowerPoint masters, custom agent workflow builders and interactive objects inside Office files remain roadmap items.
