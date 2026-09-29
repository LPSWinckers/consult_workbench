"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUp,
  ChevronRight,
  Download,
  FolderPlus,
  Upload,
  Trash2,
  RotateCcw,
  Pencil,
  FolderInput,
  Sparkles,
  Check,
  History,
  BarChart3,
} from "lucide-react";
import { OfficeControls } from "./office-controls";
import { api, Modal, Field, FileIcon, Empty, date } from "./ui";
import type { Agent, ChartData, Preview, ProjectFile, Proposal, Run } from "./types";

type Version = { number: number; created_at: string; user_name: string };

function FileChat({ file, run, busy }: { file: ProjectFile; run: Run; busy: boolean }) {
  const [cid, setCid] = useState("");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<{ question: string; answer: string }[]>([]);
  const kind = file.name.split(".").pop();
  const suggestions =
    kind === "xlsx"
      ? [
          "Leg de gegevens en formules in dit bestand uit",
          "Welke inzichten volgen uit deze gegevens?",
        ]
      : kind === "pptx"
        ? [
            "Beoordeel de verhaallijn van deze presentatie",
            "Stel verbeteringen voor de dia-inhoud voor",
          ]
        : ["Vat dit document samen", "Beoordeel spelling, samenstelling en consistentie"];
  async function ask(text: string) {
    let id = cid;
    if (!id) {
      id = (
        await api<{ id: string }>(`/projects/${file.project_id}/conversations`, "POST", {
          title: `Bestand · ${file.name}`,
        })
      ).id;
      setCid(id);
    }
    const result = await api<{ answer: string }>(`/conversations/${id}/ask`, "POST", {
      question: text,
      file_id: file.id,
    });
    setMessages((m) => [...m, { question: text, answer: result.answer }]);
    setQuestion("");
  }
  return (
    <aside className="file-ai-sidebar">
      <header>
        <Sparkles size={18} />
        <h3>Bestandsassistent</h3>
      </header>
      <p className="muted small-text">
        Privégesprek met dit bestand en de klant- en projectcontext. Terug te vinden in project
        AI-chat.
      </p>
      <div className="file-chat-scroll">
        {!messages.length &&
          suggestions.map((text) => (
            <button
              className="file-suggestion"
              key={text}
              disabled={busy}
              onClick={() => run(() => ask(text))}
            >
              {text}
            </button>
          ))}
        {messages.map((m, i) => (
          <div key={i}>
            <p className="file-question">{m.question}</p>
            <p className="prewrap">{m.answer}</p>
          </div>
        ))}
      </div>
      <form
        className="chat-composer"
        onSubmit={(e) => {
          e.preventDefault();
          if (question.trim()) run(() => ask(question));
        }}
      >
        <input
          aria-label="Vraag over bestand"
          placeholder="Vraag over dit bestand…"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button
          className="primary square"
          disabled={busy || !question.trim()}
          aria-label="Bestandsvraag versturen"
        >
          <ArrowUp size={17} />
        </button>
      </form>
    </aside>
  );
}

export function Chart({ data }: { data: ChartData }) {
  const [selected, setSelected] = useState<number | null>(null);
  const max = Math.max(...data.values.map(Math.abs), 1);
  return (
    <section className="chart">
      <header>
        <div>
          <span className="eyebrow">PROCESANALYSE</span>
          <h3>{data.title}</h3>
        </div>
        <a
          className="button secondary"
          href={`/api/files/${data.file_id}/chart.png?sheet=${encodeURIComponent(data.sheet)}&label_column=${data.label_column}&value_column=${data.value_column}`}
        >
          <Download size={15} /> PNG
        </a>
      </header>
      <div className="bars">
        {data.labels.map((label, i) => (
          <button
            key={i}
            className={`bar-column ${selected === i ? "selected" : ""}`}
            onClick={() => setSelected(selected === i ? null : i)}
            aria-label={`${label}: ${data.values[i]}`}
          >
            <span className="bar-value">{data.values[i].toLocaleString("nl-NL")}</span>
            <span className="bar-track">
              <span style={{ height: `${Math.max(3, (Math.abs(data.values[i]) / max) * 100)}%` }} />
            </span>
            <span className="bar-label">{label}</span>
          </button>
        ))}
      </div>
      <p className="muted">
        {selected !== null
          ? `${data.labels[selected]}: ${data.values[selected].toLocaleString("nl-NL")} · `
          : "Klik op een kolom voor details · "}
        Bron: {data.sheet}!{data.range} · versie {data.version}
      </p>
    </section>
  );
}

export function DocumentPreview({ preview }: { preview: Preview }) {
  return (
    <div className="document-preview">
      {preview.type === "docx" && (
        <div className="word-page">
          {preview.paragraphs?.map((p) =>
            p.style === "Title" ? (
              <h1 key={p.index}>{p.text}</h1>
            ) : p.style.startsWith("Heading") ? (
              <h3 key={p.index}>{p.text}</h3>
            ) : (
              <p key={p.index} title={`Alinea ${p.index}`}>
                {p.text || "\u00a0"}
              </p>
            ),
          )}
          {preview.tables?.map((table, i) => (
            <table key={i}>
              <tbody>
                {table.map((row, j) => (
                  <tr key={j}>
                    {row.map((cell, k) => (
                      <td key={k}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
        </div>
      )}
      {preview.type === "pptx" &&
        preview.slides?.map((slide) => (
          <div className="slide-preview" key={slide.index}>
            <span className="eyebrow">MERIDIAN CONSULTING · DIA {slide.index + 1}</span>
            {slide.shapes.map((shape, i) =>
              i === 1 ? (
                <h2 key={shape.index}>{shape.text}</h2>
              ) : (
                <p key={shape.index}>{shape.text}</p>
              ),
            )}
          </div>
        ))}
      {preview.type === "xlsx" &&
        preview.sheets?.map((sheet) => (
          <div key={sheet.name}>
            <h3>{sheet.name}</h3>
            <div className="table-scroll">
              <table className="sheet-table">
                <tbody>
                  {sheet.rows.map((row, i) => (
                    <tr key={i}>
                      <th>{i + 1}</th>
                      {row.map((value, j) =>
                        i === 0 ? (
                          <th key={j}>{String(value ?? "")}</th>
                        ) : (
                          <td key={j}>{String(value ?? "")}</td>
                        ),
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {sheet.truncated && (
              <p className="muted">Deze weergave is beperkt tot een deel van de werkmap.</p>
            )}
          </div>
        ))}
    </div>
  );
}

export function ProposalView({
  proposal,
  close,
  apply,
  busy,
}: {
  proposal: Proposal;
  close: () => void;
  apply: () => void;
  busy: boolean;
}) {
  const payload = proposal.payload;
  return (
    <Modal title="Voorstel beoordelen" close={close} wide>
      <div className="proposal-body">
        <div className="notice">
          <Sparkles size={20} />
          <div>
            <strong>{proposal.name}</strong>
            <p>{payload.summary}</p>
            {proposal.base_version && (
              <p>Gebaseerd op versie {proposal.base_version}. Het origineel blijft beschikbaar.</p>
            )}
          </div>
        </div>
        {payload.sections?.map((s, i) => (
          <div key={i}>
            <h3>{s.heading}</h3>
            <p className="prewrap">{s.body}</p>
          </div>
        ))}
        {payload.slides?.map((s, i) => (
          <div className="proposal-slide" key={i}>
            <span className="eyebrow">DIA {i + 1}</span>
            <h3>{s.title}</h3>
            <p className="prewrap">{s.body}</p>
            {s.notes && <small>Notities: {s.notes}</small>}
          </div>
        ))}
        {!!payload.rows?.length && (
          <div className="table-scroll">
            <table>
              <tbody>
                {payload.rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j}>{String(cell ?? "")}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {payload.edits?.map((edit, i) => (
          <div className="edit-preview" key={i}>
            <span className="eyebrow">
              {edit.paragraph != null
                ? `ALINEA ${edit.paragraph}`
                : edit.slide != null
                  ? `DIA ${Number(edit.slide) + 1} · VORM ${edit.shape}`
                  : `${edit.sheet}!${edit.cell}`}
            </span>
            <p className="prewrap">{String(edit.text ?? edit.value ?? "")}</p>
          </div>
        ))}
        {payload.chart && <Chart data={payload.chart} />}
        <p className="muted">
          Bronnen:{" "}
          {payload.sources.map((s) => `${s.name} v${s.version}`).join(", ") ||
            "Klant- en projectgegevens"}
        </p>
      </div>
      <footer className="modal-footer">
        <button className="secondary" onClick={close}>
          Annuleren
        </button>
        {(!proposal.base_version || !!payload.edits?.length) && (
          <>
            <a className="button secondary" href={`/api/proposals/${proposal.id}/download`}>
              <Download size={16} />
              Download concept
            </a>
            <button className="primary" disabled={busy} onClick={apply}>
              <Check size={16} />
              {proposal.base_version ? "Wijzigingen toepassen" : "Opslaan in project"}
            </button>
          </>
        )}
      </footer>
    </Modal>
  );
}

function ChartSelector({
  file,
  preview,
  busy,
  run,
  changed,
}: {
  file: ProjectFile;
  preview: Preview;
  busy: boolean;
  run: Run;
  changed: (chart: ChartData) => void;
}) {
  const [sheet, setSheet] = useState(preview.sheets?.[0]?.name || "");
  const [label, setLabel] = useState("0");
  const [value, setValue] = useState("1");
  const rows = preview.sheets?.find((s) => s.name === sheet)?.rows || [];
  const headers = rows[0] || [];
  return (
    <div className="chart-selector">
      <Field label="Werkblad">
        <select value={sheet} onChange={(e) => setSheet(e.target.value)}>
          {preview.sheets?.map((s) => (
            <option key={s.name}>{s.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Labels">
        <select value={label} onChange={(e) => setLabel(e.target.value)}>
          {headers.map((h, i) => (
            <option value={i} key={i}>
              {i + 1} · {String(h ?? "Kolom")}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Waarden">
        <select value={value} onChange={(e) => setValue(e.target.value)}>
          {headers.map((h, i) => (
            <option value={i} key={i}>
              {i + 1} · {String(h ?? "Kolom")}
            </option>
          ))}
        </select>
      </Field>
      <button
        className="secondary"
        disabled={busy}
        onClick={() =>
          run(async () =>
            changed(
              await api<ChartData>(
                `/files/${file.id}/chart?sheet=${encodeURIComponent(sheet)}&label_column=${label}&value_column=${value}`,
              ),
            ),
          )
        }
      >
        Grafiek bijwerken
      </button>
      <p className="muted">
        Maximaal 50 punten uit de eerste 200 rijen. Formules worden in Office berekend.
      </p>
    </div>
  );
}

export function FilesPanel({
  pid,
  run,
  busy,
  agents,
  onChanged,
}: {
  pid: string;
  run: Run;
  busy: boolean;
  agents: Agent[];
  onChanged: () => Promise<void>;
}) {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [folder, setFolder] = useState<string | null>(null);
  const [trash, setTrash] = useState(false);
  const [active, setActive] = useState<ProjectFile | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [chart, setChart] = useState<ChartData | null>(null);
  const [modal, setModal] = useState("");
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [type, setType] = useState("pptx");
  const [prompt, setPrompt] = useState("");
  const [agent, setAgent] = useState("");
  const [chartSource, setChartSource] = useState("");
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const versionInput = useRef<HTMLInputElement>(null);
  async function reload() {
    setFiles(await api<ProjectFile[]>(`/projects/${pid}/files`));
    await onChanged();
  }
  useEffect(() => {
    setFolder(null);
    setActive(null);
    run(async () => setFiles(await api<ProjectFile[]>(`/projects/${pid}/files`)));
  }, [pid]); // eslint-disable-line react-hooks/exhaustive-deps
  const visible = files.filter((f) =>
    trash
      ? f.deleted && (!f.parent_id || !files.find((p) => p.id === f.parent_id)?.deleted)
      : !f.deleted && f.parent_id === folder,
  );
  const breadcrumbs: ProjectFile[] = [];
  let parent = folder;
  while (parent) {
    const f = files.find((f) => f.id === parent);
    if (!f) break;
    breadcrumbs.unshift(f);
    parent = f.parent_id;
  }
  async function open(f: ProjectFile) {
    if (f.kind === "folder") {
      setFolder(f.id);
      return;
    }
    setPreview(null);
    setChart(null);
    setActive(f);
    const [p, v] = await Promise.all([
      api<Preview>(`/files/${f.id}/preview`),
      api<Version[]>(`/files/${f.id}/versions`),
    ]);
    setPreview(p);
    setVersions(v);
  }
  async function upload(file: File | undefined, version = false) {
    if (!file) return;
    const data = new FormData();
    data.append("file", file);
    data.append("parent_id", folder || "");
    if (version && active) {
      data.append("file_id", active.id);
      data.append("base_version", String(active.version));
    }
    await api(`/projects/${pid}/upload`, "POST", data);
    setActive(null);
    await reload();
  }
  function editModal(mode: string, f?: ProjectFile) {
    if (f) {
      setActive(f);
      setPreview(null);
    }
    setModal(mode);
    setName(f?.name || "");
    setTarget(f?.parent_id || folder || "");
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await run(async () => {
      if (modal === "folder")
        await api(`/projects/${pid}/folders`, "POST", { name, parent_id: folder });
      if (modal === "rename") await api(`/files/${active?.id}`, "PATCH", { name });
      if (modal === "move")
        await api(`/files/${active?.id}`, "PATCH", { parent_id: target || null });
      if (modal === "generate" || modal === "review") {
        const result = await api<Proposal>(`/projects/${pid}/proposals`, "POST", {
          prompt,
          type: modal === "review" ? active?.name.split(".").pop() : type,
          name: name || "Adviesdocument",
          file_id: modal === "review" ? active?.id : null,
          agent_id: agent || null,
          chart_file_id: chartSource || null,
          chart_sheet: chartSource === chart?.file_id ? chart.sheet : null,
          chart_label_column: chartSource === chart?.file_id ? chart.label_column : 0,
          chart_value_column: chartSource === chart?.file_id ? chart.value_column : 1,
        });
        setProposal(result);
      }
      setModal("");
      if (modal !== "review" && modal !== "generate") {
        setActive(null);
        await reload();
      }
    });
  }
  return (
    <>
      <div className="panel-toolbar">
        <div className="breadcrumbs">
          <button
            onClick={() => {
              setFolder(null);
              setTrash(false);
            }}
          >
            Projectbestanden
          </button>
          {breadcrumbs.map((f) => (
            <span key={f.id}>
              <ChevronRight size={14} />
              <button onClick={() => setFolder(f.id)}>{f.name}</button>
            </span>
          ))}
          {trash && <span>/ Prullenbak</span>}
        </div>
        <div className="actions">
          <button
            className="icon-button"
            aria-label={trash ? "Terug naar bestanden" : "Prullenbak"}
            onClick={() => setTrash(!trash)}
          >
            {trash ? <ArrowLeft size={18} /> : <Trash2 size={18} />}
          </button>
          <button className="secondary" onClick={() => editModal("folder")} disabled={trash}>
            <FolderPlus size={16} /> Nieuwe map
          </button>
          <button className="secondary" onClick={() => input.current?.click()} disabled={trash}>
            <Upload size={16} />
            Upload
          </button>
          <button
            className="primary"
            onClick={() => {
              setModal("generate");
              setName("");
              setPrompt("");
              setChartSource("");
              setAgent("");
            }}
            disabled={trash}
          >
            <Sparkles size={16} />
            Maak met AI
          </button>
        </div>
      </div>
      <input
        type="file"
        hidden
        ref={input}
        accept=".docx,.xlsx,.pptx"
        onChange={(e) => {
          run(() => upload(e.target.files?.[0]));
          e.target.value = "";
        }}
      />
      <input
        type="file"
        hidden
        ref={versionInput}
        accept=".docx,.xlsx,.pptx"
        onChange={(e) => {
          run(() => upload(e.target.files?.[0], true));
          e.target.value = "";
        }}
      />
      <div className="files-table">
        <div className="file-row file-heading">
          <span>Naam</span>
          <span>Type</span>
          <span>Versie</span>
          <span>Toegevoegd</span>
          <span />
        </div>
        {visible.map((f) => (
          <div className="file-row" key={f.id}>
            <button className="file-name" onClick={() => !trash && run(() => open(f))}>
              <FileIcon name={f.name} folder={f.kind === "folder"} />
              {f.name}
            </button>
            <span className="muted">
              {f.kind === "folder" ? "Map" : f.name.split(".").pop()?.toUpperCase()}
            </span>
            <span className="muted">{f.kind === "folder" ? "—" : `v${f.version}`}</span>
            <span className="muted">{date(f.created_at)}</span>
            <div className="row-actions">
              {trash ? (
                <button
                  title="Herstellen"
                  aria-label={`Herstel ${f.name}`}
                  onClick={() =>
                    run(async () => {
                      await api(`/files/${f.id}`, "PATCH", { deleted: false });
                      await reload();
                    })
                  }
                >
                  <RotateCcw size={16} />
                </button>
              ) : (
                <>
                  <button
                    title="Hernoemen"
                    aria-label={`Hernoem ${f.name}`}
                    onClick={() => editModal("rename", f)}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    title="Verplaatsen"
                    aria-label={`Verplaats ${f.name}`}
                    onClick={() => editModal("move", f)}
                  >
                    <FolderInput size={16} />
                  </button>
                  {
                    <a
                      title="Download"
                      aria-label={`Download ${f.name}`}
                      href={`/api/files/${f.id}/download`}
                    >
                      <Download size={16} />
                    </a>
                  }
                  <button
                    title="Verwijderen"
                    aria-label={`Verwijder ${f.name}`}
                    onClick={() =>
                      run(async () => {
                        await api(`/files/${f.id}`, "PATCH", { deleted: true });
                        await reload();
                      })
                    }
                  >
                    <Trash2 size={15} />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
        {!visible.length && (
          <Empty
            title={trash ? "Prullenbak is leeg" : "Een plek voor je projectkennis"}
            text="Upload een bestand of maak een document met AI."
          />
        )}
      </div>
      <p className="footnote">
        Lokale opslag · DOCX, XLSX en PPTX · maximaal 20 MB per bestand ·{" "}
        <a href={`/api/projects/${pid}/download`}>Download project als ZIP</a>
      </p>
      {active && !modal && !proposal && preview && (
        <Modal title={active.name} close={() => setActive(null)} wide>
          <div className="preview-tools">
            <span className="badge">Versie {active.version}</span>
            <a className="button secondary" href={`/api/files/${active.id}/download`}>
              <Download size={15} />
              Download
            </a>
            <button className="secondary" onClick={() => versionInput.current?.click()}>
              <Upload size={15} />
              Nieuwe versie
            </button>
            <button
              className="primary"
              onClick={() => {
                setModal("review");
                setPrompt(
                  "Controleer spelling, grammatica, samenstelling en consistente terminologie. Stel gerichte correcties voor.",
                );
                setChartSource("");
                setAgent("");
              }}
            >
              <Sparkles size={15} />
              AI review / bewerken
            </button>
            {preview.type === "xlsx" && (
              <button
                className="secondary"
                onClick={() =>
                  run(async () => setChart(await api<ChartData>(`/files/${active.id}/chart`)))
                }
              >
                <BarChart3 size={15} />
                Grafiek
              </button>
            )}
          </div>
          <OfficeControls
            key={active.id}
            file={active}
            busy={busy}
            run={run}
            refresh={async () => {
              const updated = await api<ProjectFile[]>(`/projects/${pid}/files`);
              setFiles(updated);
              const next = updated.find((f) => f.id === active.id);
              if (next) await open(next);
              await onChanged();
            }}
          />
          <p className="preview-note">
            Inhoudsweergave. Opmaak, afbeeldingen en formuleberekening worden hier niet volledig
            weergegeven. Download voor bewerking in Office.
          </p>
          {preview.type === "xlsx" && (
            <ChartSelector
              key={active.id}
              file={active}
              preview={preview}
              busy={busy}
              run={run}
              changed={setChart}
            />
          )}
          {chart && (
            <Chart
              key={`${chart.sheet}-${chart.label_column}-${chart.value_column}`}
              data={chart}
            />
          )}
          <div className="file-workspace">
            <DocumentPreview preview={preview} />
            <FileChat key={active.id} file={active} run={run} busy={busy} />
          </div>
          <div className="version-history">
            <h3>
              <History size={17} /> Versiegeschiedenis
            </h3>
            {versions.map((v) => (
              <a key={v.number} href={`/api/files/${active.id}/download?version=${v.number}`}>
                Versie {v.number}
                <span>
                  {v.user_name} · {date(v.created_at)}
                </span>
                <Download size={15} />
              </a>
            ))}
          </div>
        </Modal>
      )}
      {!!modal && (
        <Modal
          title={
            modal === "folder"
              ? "Nieuwe map"
              : modal === "rename"
                ? "Naam wijzigen"
                : modal === "move"
                  ? "Verplaatsen"
                  : modal === "review"
                    ? "Documentreview en bewerking"
                    : "Maak een document met AI"
          }
          close={() => setModal("")}
        >
          <form onSubmit={submit}>
            {["folder", "rename", "generate"].includes(modal) && (
              <Field label="Naam">
                <input
                  required
                  value={name}
                  placeholder="Bijvoorbeeld: Advies Noordlicht"
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
            )}
            {modal === "move" && (
              <Field label="Doelmap">
                <select value={target} onChange={(e) => setTarget(e.target.value)}>
                  <option value="">Projectmap</option>
                  {files
                    .filter((f) => f.kind === "folder" && !f.deleted && f.id !== active?.id)
                    .map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                </select>
              </Field>
            )}
            {modal === "generate" && (
              <Field label="Bestandstype">
                <select value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="pptx">PowerPoint presentatie</option>
                  <option value="docx">Word document</option>
                  <option value="xlsx">Excel werkmap</option>
                </select>
              </Field>
            )}
            {["generate", "review"].includes(modal) && (
              <>
                <Field label="Opdracht">
                  <textarea
                    required
                    rows={5}
                    placeholder="Beschrijf het doel, de doelgroep en de gewenste inhoud…"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                  />
                </Field>
                <Field label="Agent">
                  <select value={agent} onChange={(e) => setAgent(e.target.value)}>
                    <option value="">Standaard projectassistent</option>
                    {agents
                      .filter((a) => a.tools.includes(modal === "review" ? "review" : "documents"))
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                  </select>
                </Field>
                {modal === "generate" && (
                  <Field label="Excel-grafiek invoegen">
                    <select value={chartSource} onChange={(e) => setChartSource(e.target.value)}>
                      <option value="">Geen grafiek</option>
                      {files
                        .filter((f) => !f.deleted && f.name.endsWith(".xlsx"))
                        .map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                    </select>
                  </Field>
                )}
                <p className="muted">
                  Je beoordeelt eerst het voorstel. Er wordt nog niets opgeslagen of gewijzigd.
                </p>
              </>
            )}
            <footer className="modal-footer">
              <button type="button" className="secondary" onClick={() => setModal("")}>
                Annuleren
              </button>
              <button className="primary" disabled={busy}>
                {busy
                  ? "Even geduld…"
                  : ["generate", "review"].includes(modal)
                    ? "Voorstel maken"
                    : "Opslaan"}
              </button>
            </footer>
          </form>
        </Modal>
      )}
      {proposal && (
        <ProposalView
          proposal={proposal}
          close={() => {
            setProposal(null);
            setActive(null);
          }}
          busy={busy}
          apply={() =>
            run(async () => {
              await api(`/proposals/${proposal.id}/apply`, "POST", { parent_id: folder });
              setProposal(null);
              setActive(null);
              await reload();
            })
          }
        />
      )}
    </>
  );
}
