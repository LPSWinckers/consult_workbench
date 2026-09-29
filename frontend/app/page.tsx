"use client";
import { useCallback, useEffect, useState } from "react";
import {
  Compass,
  LayoutDashboard,
  Building2,
  FolderKanban,
  Bot,
  Settings2,
  LogOut,
  Search,
  Plus,
  ArrowUpRight,
  ArrowRight,
  Sparkles,
  ChevronRight,
  CalendarDays,
  Users,
  Download,
  Check,
  X,
  ShieldCheck,
  Clock3,
  FileText,
  MessageSquare,
  Folder,
  Lock,
  Pencil,
  Archive,
  Bell,
  RefreshCw,
} from "lucide-react";
import { AISettings } from "../components/ai-settings";
import { Auth } from "../components/auth";
import { api, Avatar, Badge, Busy, Empty, Field, Modal, date } from "../components/ui";
import { FilesPanel } from "../components/files";
import { AIChat, TeamChat } from "../components/chats";
import type {
  Agent,
  Company,
  Customer,
  Invitation,
  Project,
  ProjectDetail,
  ProjectFile,
  Settings,
  User,
} from "../components/types";

type Approval = Invitation & { project_id: string; project_name: string };
const navigation = [
  { id: "dashboard", label: "Overzicht", icon: LayoutDashboard },
  { id: "projects", label: "Projecten", icon: FolderKanban },
  { id: "customers", label: "Klanten", icon: Building2 },
  { id: "agents", label: "AI-agenten", icon: Bot },
];
const tabs = [
  { id: "overview", label: "Overzicht", icon: LayoutDashboard },
  { id: "files", label: "Bestanden", icon: Folder },
  { id: "team", label: "Teamchat", icon: MessageSquare },
  { id: "ai", label: "AI-assistent", icon: Sparkles },
  { id: "members", label: "Team & toegang", icon: Users },
];
const emptyCustomer = { name: "", industry: "", description: "", contacts: "", goals: "" };
const emptyProject = {
  name: "",
  customer_id: "",
  description: "",
  objectives: "",
  start_date: "",
  due_date: "",
};

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState("dashboard");
  const [projects, setProjects] = useState<Project[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [pid, setPid] = useState("");
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [tab, setTab] = useState("overview");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [showArchive, setShowArchive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState("");
  const [customerForm, setCustomerForm] = useState(emptyCustomer);
  const [projectForm, setProjectForm] = useState(emptyProject);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerAccess, setCustomerAccess] = useState<{
    can_manage: boolean;
    users: User[];
  } | null>(null);
  const [inviteUser, setInviteUser] = useState("");
  const [agentForm, setAgentForm] = useState({
    name: "",
    instructions: "",
    tools: ["chat"],
    file_ids: [] as string[],
  });
  const [companyForm, setCompanyForm] = useState<Company | null>(null);
  const run = useCallback(async (task: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await task();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Er ging iets mis");
    } finally {
      setBusy(false);
    }
  }, []);
  const reload = useCallback(async () => {
    const [p, c, u, s, a] = await Promise.all([
      api<Project[]>("/projects"),
      api<Customer[]>("/customers"),
      api<User[]>("/users"),
      api<Settings>("/settings"),
      api<Approval[]>("/approvals"),
    ]);
    setProjects(p);
    setCustomers(c);
    setUsers(u);
    setSettings(s);
    setCompanyForm(s.company);
    setApprovals(a);
  }, []);
  const reloadProject = useCallback(async () => {
    if (!pid) return;
    const [d, a, i, f] = await Promise.all([
      api<ProjectDetail>(`/projects/${pid}`),
      api<Agent[]>(`/projects/${pid}/agents`),
      api<Invitation[]>(`/projects/${pid}/invitations`),
      api<ProjectFile[]>(`/projects/${pid}/files`),
    ]);
    setDetail(d);
    setAgents(a);
    setInvitations(i);
    setProjectFiles(f);
  }, [pid]);
  useEffect(() => {
    api<User>("/me")
      .then(setUser)
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);
  useEffect(() => {
    if (user) run(reload);
  }, [user, reload, run]);
  useEffect(() => {
    if (pid && user) {
      setDetail(null);
      run(reloadProject);
    }
  }, [pid, user, reloadProject, run]);
  async function refresh() {
    await reload();
    await reloadProject();
  }
  function openProject(id: string, nextTab = "overview") {
    setPid(id);
    setView("project");
    setTab(nextTab);
    setSearch("");
  }
  function startProject() {
    setProjectForm({
      ...emptyProject,
      customer_id: selectedCustomer?.id || customers[0]?.id || "",
    });
    setModal("project");
  }
  async function selectCustomer(c: Customer) {
    setSelectedCustomer(c);
    setCustomerAccess(await api(`/customers/${c.id}/access`));
  }
  async function saveModal(e: React.FormEvent) {
    e.preventDefault();
    await run(async () => {
      if (modal === "customer") await api("/customers", "POST", customerForm);
      if (modal === "editCustomer" && selectedCustomer) {
        await api(`/customers/${selectedCustomer.id}`, "PATCH", customerForm);
        setSelectedCustomer({ ...selectedCustomer, ...customerForm });
      }
      if (modal === "project") {
        const result = await api<{ id: string }>("/projects", "POST", projectForm);
        openProject(result.id);
      }
      if (modal === "editProject") {
        const { customer_id, ...data } = projectForm;
        void customer_id;
        await api(`/projects/${pid}`, "PATCH", data);
      }
      if (modal === "invite")
        await api(`/projects/${pid}/invitations`, "POST", { user_id: inviteUser });
      if (modal === "agent") await api(`/projects/${pid}/agents`, "POST", agentForm);
      if (modal === "customerAccess") {
        await api(`/customers/${selectedCustomer?.id}/access`, "POST", { user_id: inviteUser });
        if (selectedCustomer) await selectCustomer(selectedCustomer);
      }
      setModal("");
      await refresh();
    });
  }
  if (!ready)
    return (
      <div className="loading">
        <Compass className="spin" size={32} />
        Werkruimte laden…
      </div>
    );
  if (!user) return <Auth onLogin={setUser} />;
  const activeProjects = projects.filter((p) => !p.archived);
  const filteredProjects = projects.filter(
    (p) =>
      Boolean(p.archived) === showArchive &&
      (!stateFilter || p.state === stateFilter) &&
      `${p.name} ${p.customer_name}`.toLowerCase().includes(search.toLowerCase()),
  );
  const currentTitle =
    view === "project"
      ? detail?.name || "Project"
      : view === "dashboard"
        ? "Overzicht"
        : view === "projects"
          ? "Projecten"
          : view === "customers"
            ? "Klanten"
            : view === "agents"
              ? "AI-agenten"
              : "Instellingen";
  const company = settings?.company;
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <Compass size={29} />
          <div>
            {company?.name?.replace(" Consulting", "").toLowerCase() || "meridian"}
            <span>CONSULTING</span>
          </div>
        </div>
        <span className="workspace-label">WERKRUIMTE</span>
        <nav>
          {navigation.map((n) => (
            <button
              key={n.id}
              className={
                view === n.id || (n.id === "projects" && view === "project") ? "active" : ""
              }
              onClick={() => {
                setView(n.id);
                setSearch("");
                setSelectedCustomer(null);
              }}
            >
              <n.icon size={19} />
              <span>{n.label}</span>
              {n.id === "projects" && <small>{activeProjects.length}</small>}
            </button>
          ))}
        </nav>
        <div className="sidebar-projects">
          <span className="workspace-label">MIJN PROJECTEN</span>
          {activeProjects.slice(0, 4).map((p) => (
            <button
              key={p.id}
              className={pid === p.id && view === "project" ? "selected" : ""}
              onClick={() => openProject(p.id)}
            >
              <i className={p.state === "In uitvoering" ? "green" : ""} />
              <span>{p.name}</span>
            </button>
          ))}
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-ai">
            <Sparkles size={20} />
            <strong>Advies met context</strong>
            <p>Je projectkennis, klaar voor de volgende stap.</p>
            <button
              onClick={() =>
                activeProjects[0] ? openProject(activeProjects[0].id, "ai") : setView("projects")
              }
            >
              Open je AI-assistent <ArrowUpRight size={15} />
            </button>
          </div>
          <button
            className={view === "settings" ? "settings-link active" : "settings-link"}
            onClick={() => setView("settings")}
          >
            <Settings2 size={18} />
            Instellingen
          </button>
          <div className="sidebar-user">
            <Avatar name={user.name} small />
            <div>
              <strong>{user.name}</strong>
              <span>{user.role === "admin" ? "Beheerder" : "Consultant"}</span>
            </div>
            <button
              aria-label="Uitloggen"
              onClick={() =>
                run(async () => {
                  await api("/auth/logout", "POST");
                  setUser(null);
                  setPid("");
                  setDetail(null);
                })
              }
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <div className="topbar-crumb">
            Werkruimte <ChevronRight size={14} />
            <strong>{currentTitle}</strong>
          </div>
          <div className="topbar-actions">
            <div className="search">
              <Search size={16} />
              <input
                aria-label="Zoek projecten of klanten"
                placeholder="Zoeken…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <span className="sample-tag">Sampleomgeving</span>
            <div className="mobile-controls">
              <button
                className="icon-button"
                aria-label="Instellingen openen"
                onClick={() => setView("settings")}
              >
                <Settings2 size={18} />
              </button>
              <button
                className="icon-button"
                aria-label="Uitloggen op mobiel"
                onClick={() =>
                  run(async () => {
                    await api("/auth/logout", "POST");
                    setUser(null);
                    setPid("");
                    setDetail(null);
                  })
                }
              >
                <LogOut size={18} />
              </button>
            </div>
            <button
              className="icon-button"
              aria-label="Vernieuwen"
              disabled={busy}
              onClick={() => run(refresh)}
            >
              <RefreshCw size={18} className={busy ? "spin" : ""} />
            </button>
            <button
              className="icon-button notification"
              aria-label="Open goedkeuringen"
              onClick={() => setView("dashboard")}
            >
              <Bell size={19} />
              {approvals.length > 0 && <i />}
            </button>
            <Avatar name={user.name} small />
          </div>
        </header>
        {error && (
          <div className="error-banner" role="alert">
            <span>{error}</span>
            <button aria-label="Melding sluiten" onClick={() => setError("")}>
              <X size={17} />
            </button>
          </div>
        )}
        <main className="workspace-main">
          {view === "dashboard" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">JOUW WERKRUIMTE</span>
                  <h1>
                    Goedendag, {user.name.split(" ")[0]}
                    <span className="heading-dot">.</span>
                  </h1>
                  <p>Een helder overzicht. Ruimte voor het volgende inzicht.</p>
                </div>
                <button className="primary" onClick={startProject} disabled={!customers.length}>
                  <Plus size={17} />
                  Nieuw project
                </button>
              </div>
              <div className="dashboard-stats">
                <div className="stat-card">
                  <FolderKanban size={20} />
                  <span>Actieve projecten</span>
                  <strong>
                    {
                      activeProjects.filter((p) => !["Afgerond", "Geannuleerd"].includes(p.state))
                        .length
                    }
                  </strong>
                  <small>Projecten waar jij toegang toe hebt</small>
                </div>
                <div className="stat-card">
                  <Building2 size={20} />
                  <span>Klanten</span>
                  <strong>{customers.length}</strong>
                  <small>Jouw toegankelijke klantrelaties</small>
                </div>
                <div className="stat-card">
                  <ShieldCheck size={20} />
                  <span>Te beoordelen</span>
                  <strong>{approvals.length}</strong>
                  <small>Uitnodigingen die op je wachten</small>
                </div>
              </div>
              <div className="dashboard-grid">
                <section>
                  <div className="section-heading">
                    <h2>Verder met je projecten</h2>
                    <button onClick={() => setView("projects")}>
                      Alle projecten <ArrowRight size={15} />
                    </button>
                  </div>
                  <div className="project-card-grid">
                    {activeProjects.slice(0, 4).map((p) => (
                      <ProjectCard key={p.id} project={p} open={() => openProject(p.id)} />
                    ))}
                  </div>
                  {!activeProjects.length && (
                    <Empty
                      title="Je eerste project begint hier"
                      text="Maak een klant en project, of vraag een collega om een uitnodiging."
                    />
                  )}
                  <div className="ai-banner">
                    <div className="sparkle-mark">
                      <Sparkles size={25} />
                    </div>
                    <div>
                      <span className="eyebrow">VAN PROJECTKENNIS NAAR INZICHT</span>
                      <h3>Een denkpartner voor je volgende stap.</h3>
                      <p>Gebruik klantinformatie en bestanden om je advies verder te brengen.</p>
                    </div>
                    <button
                      className="secondary"
                      onClick={() =>
                        activeProjects[0]
                          ? openProject(activeProjects[0].id, "ai")
                          : setView("projects")
                      }
                    >
                      Start een gesprek <ArrowUpRight size={16} />
                    </button>
                  </div>
                </section>
                <aside className="dashboard-aside">
                  <section className="card">
                    <div className="section-heading">
                      <h3>Op de planning</h3>
                      <CalendarDays size={18} />
                    </div>
                    {activeProjects
                      .filter((p) => p.due_date)
                      .sort((a, b) => a.due_date.localeCompare(b.due_date))
                      .slice(0, 4)
                      .map((p) => (
                        <button className="deadline" key={p.id} onClick={() => openProject(p.id)}>
                          <span className="date-tile">
                            {new Date(p.due_date).getDate()}
                            <small>
                              {new Date(p.due_date).toLocaleDateString("nl-NL", { month: "short" })}
                            </small>
                          </span>
                          <span>
                            <strong>{p.name}</strong>
                            <small>Doeldatum · {p.customer_name}</small>
                          </span>
                          <ChevronRight size={15} />
                        </button>
                      ))}
                    {!activeProjects.some((p) => p.due_date) && (
                      <p className="muted">Nog geen doeldatums vastgelegd.</p>
                    )}
                  </section>
                  <section className="card">
                    <div className="section-heading">
                      <h3>Goedkeuringen</h3>
                      <ShieldCheck size={18} />
                    </div>
                    {approvals.map((a) => (
                      <div className="approval" key={a.id}>
                        <strong>{a.user_name}</strong>
                        <p>{a.project_name}</p>
                        <div className="actions">
                          <button
                            className="secondary"
                            disabled={busy}
                            onClick={() =>
                              run(async () => {
                                await api(`/invitations/${a.id}/decision`, "POST", {
                                  state: "approved",
                                });
                                await refresh();
                              })
                            }
                          >
                            <Check size={14} />
                            Goedkeuren
                          </button>
                          <button
                            className="icon-button"
                            aria-label={`Wijs uitnodiging voor ${a.user_name} af`}
                            onClick={() =>
                              run(async () => {
                                await api(`/invitations/${a.id}/decision`, "POST", {
                                  state: "rejected",
                                });
                                await refresh();
                              })
                            }
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {!approvals.length && (
                      <div className="all-clear">
                        <Check size={21} />
                        <p>Alles bijgewerkt</p>
                        <small>Geen open uitnodigingen voor jou.</small>
                      </div>
                    )}
                  </section>
                </aside>
              </div>
            </>
          )}
          {view === "projects" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">SAMEN AAN HET WERK</span>
                  <h1>Projecten</h1>
                  <p>Van eerste vraag tot onderbouwd advies.</p>
                </div>
                <button className="primary" disabled={!customers.length} onClick={startProject}>
                  <Plus size={17} />
                  Nieuw project
                </button>
              </div>
              <div className="list-filters">
                <div className="segmented">
                  <button
                    className={!showArchive ? "selected" : ""}
                    onClick={() => setShowArchive(false)}
                  >
                    Projecten
                  </button>
                  <button
                    className={showArchive ? "selected" : ""}
                    onClick={() => setShowArchive(true)}
                  >
                    Archief
                  </button>
                </div>
                <select
                  aria-label="Filter op projectstatus"
                  value={stateFilter}
                  onChange={(e) => setStateFilter(e.target.value)}
                >
                  <option value="">Alle statussen</option>
                  {[
                    "Concept",
                    "Gepland",
                    "In uitvoering",
                    "In review",
                    "On hold",
                    "Afgerond",
                    "Geannuleerd",
                  ].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="project-card-grid three">
                {filteredProjects.map((p) => (
                  <ProjectCard key={p.id} project={p} open={() => openProject(p.id)} />
                ))}
              </div>
              {!filteredProjects.length && (
                <Empty
                  title="Geen projecten gevonden"
                  text="Maak een project of pas je filters aan."
                />
              )}
            </>
          )}
          {view === "customers" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">DE BASIS VAN JE ADVIES</span>
                  <h1>{selectedCustomer ? selectedCustomer.name : "Klanten"}</h1>
                  <p>
                    {selectedCustomer
                      ? selectedCustomer.industry
                      : "Klantkennis die je projecten verder helpt."}
                  </p>
                </div>
                <button
                  className="primary"
                  onClick={() => {
                    setCustomerForm(emptyCustomer);
                    setModal("customer");
                  }}
                >
                  <Plus size={17} />
                  Nieuwe klant
                </button>
              </div>
              {selectedCustomer ? (
                <>
                  <button className="text-button" onClick={() => setSelectedCustomer(null)}>
                    ← Alle klanten
                  </button>
                  <div className="customer-detail-grid">
                    <section className="card">
                      <div className="section-heading">
                        <h2>Klantprofiel</h2>
                        {customerAccess?.can_manage && (
                          <button
                            onClick={() => {
                              setCustomerForm(selectedCustomer);
                              setModal("editCustomer");
                            }}
                          >
                            <Pencil size={15} />
                            Bewerken
                          </button>
                        )}
                      </div>
                      <h3>Achtergrond</h3>
                      <p className="prewrap">
                        {selectedCustomer.description || "Nog niet ingevuld"}
                      </p>
                      <h3>Contactpersonen</h3>
                      <p className="prewrap">{selectedCustomer.contacts || "Nog niet ingevuld"}</p>
                      <h3>Doelen</h3>
                      <p className="prewrap">{selectedCustomer.goals || "Nog niet ingevuld"}</p>
                    </section>
                    <section>
                      <div className="section-heading">
                        <h2>Projecten</h2>
                        {customerAccess?.can_manage && (
                          <button onClick={startProject}>
                            <Plus size={16} />
                            Nieuw project
                          </button>
                        )}
                      </div>
                      {projects
                        .filter((p) => p.customer_id === selectedCustomer.id)
                        .map((p) => (
                          <ProjectCard key={p.id} project={p} open={() => openProject(p.id)} />
                        ))}
                      <div className="card access-card">
                        <div className="section-heading">
                          <h3>Directe klanttoegang</h3>
                          {user.role === "admin" && (
                            <button
                              onClick={() => {
                                setInviteUser("");
                                setModal("customerAccess");
                              }}
                            >
                              <Plus size={15} />
                              Toevoegen
                            </button>
                          )}
                        </div>
                        {customerAccess?.users.map((u) => (
                          <div className="member-mini" key={u.id}>
                            <Avatar name={u.name} small />
                            <span>{u.name}</span>
                          </div>
                        ))}
                        <p className="muted small-text">
                          Projectleden kunnen het klantprofiel lezen. Andere klantprojecten blijven
                          afgeschermd.
                        </p>
                      </div>
                    </section>
                  </div>
                </>
              ) : (
                <div className="customer-grid">
                  {customers
                    .filter((c) =>
                      `${c.name} ${c.industry}`.toLowerCase().includes(search.toLowerCase()),
                    )
                    .map((c) => (
                      <button
                        className="customer-card"
                        key={c.id}
                        onClick={() => run(() => selectCustomer(c))}
                      >
                        <div className="customer-symbol">
                          <Building2 size={25} />
                        </div>
                        <span className="eyebrow">{c.industry || "KLANT"}</span>
                        <h2>{c.name}</h2>
                        <p>{c.description || "Vul het klantprofiel aan."}</p>
                        <footer>
                          {projects.filter((p) => p.customer_id === c.id && !p.archived).length}{" "}
                          toegankelijke projecten
                          <ArrowUpRight size={19} />
                        </footer>
                      </button>
                    ))}
                  {!customers.length && (
                    <Empty
                      title="Maak je eerste klant"
                      text="Leg de achtergrond en doelen vast om AI de juiste context te geven."
                    />
                  )}
                </div>
              )}
            </>
          )}
          {view === "project" && detail && (
            <>
              <div className="project-heading">
                <button className="text-button" onClick={() => setView("projects")}>
                  Projecten <ChevronRight size={13} />
                  {detail.customer.name}
                </button>
                <div className="page-heading">
                  <div>
                    <h1>{detail.name}</h1>
                    <p>{detail.description}</p>
                  </div>
                  <div className="actions">
                    <a className="button secondary" href={`/api/projects/${pid}/download`}>
                      <Download size={16} />
                      Download ZIP
                    </a>
                    <button
                      className="primary"
                      onClick={() => {
                        setInviteUser("");
                        setModal("invite");
                      }}
                    >
                      <Users size={16} />
                      Collega uitnodigen
                    </button>
                  </div>
                </div>
                <div className="project-meta">
                  <Badge state={detail.state} />
                  <span>
                    <CalendarDays size={15} />
                    {date(detail.start_date)} – {date(detail.due_date)}
                  </span>
                  <span>
                    <Users size={15} />
                    {detail.members.length} teamleden
                  </span>
                  {detail.archived === 1 && (
                    <span>
                      <Archive size={15} />
                      Gearchiveerd
                    </span>
                  )}
                </div>
              </div>
              <div className="project-tabs">
                {tabs.map((t) => (
                  <button
                    key={t.id}
                    className={tab === t.id ? "active" : ""}
                    onClick={() => setTab(t.id)}
                  >
                    <t.icon size={16} />
                    {t.label}
                  </button>
                ))}
              </div>
              {tab === "overview" && (
                <div className="project-overview-grid">
                  <div>
                    <section className="card">
                      <div className="section-heading">
                        <h2>Projectbrief</h2>
                        {detail.can_manage && (
                          <button
                            onClick={() => {
                              setProjectForm({
                                name: detail.name,
                                customer_id: detail.customer_id,
                                description: detail.description,
                                objectives: detail.objectives,
                                start_date: detail.start_date,
                                due_date: detail.due_date,
                              });
                              setModal("editProject");
                            }}
                          >
                            <Pencil size={15} />
                            Bewerken
                          </button>
                        )}
                      </div>
                      <h3>Doelstellingen</h3>
                      <p className="prewrap">
                        {detail.objectives || "Nog geen doelstellingen vastgelegd."}
                      </p>
                      <div className="context-box">
                        <Building2 size={20} />
                        <div>
                          <strong>{detail.customer.name}</strong>
                          <p>{detail.customer.description}</p>
                        </div>
                      </div>
                    </section>
                    <section className="card activity-card">
                      <h2>Projectactiviteit</h2>
                      {detail.activity.map((a) => (
                        <div className="activity" key={a.id}>
                          <span className="activity-dot" />
                          <div>
                            <strong>{a.action}</strong>
                            <p>
                              {a.user_name} · {date(a.created_at)}
                            </p>
                            {a.details && <small>{a.details}</small>}
                          </div>
                        </div>
                      ))}
                    </section>
                  </div>
                  <aside>
                    <section className="card">
                      <h3>Projectstatus</h3>
                      {detail.can_manage ? (
                        <select
                          aria-label="Projectstatus wijzigen"
                          value={detail.state}
                          disabled={busy}
                          onChange={(e) =>
                            run(async () => {
                              await api(`/projects/${pid}`, "PATCH", { state: e.target.value });
                              await refresh();
                            })
                          }
                        >
                          {detail.states.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      ) : (
                        <Badge state={detail.state} />
                      )}
                      <p className="muted small-text">
                        Alleen de projecteigenaar en beheerders wijzigen de status.
                      </p>
                      {detail.can_manage && (
                        <button
                          className="secondary full"
                          onClick={() =>
                            run(async () => {
                              await api(`/projects/${pid}`, "PATCH", {
                                archived: !detail.archived,
                              });
                              await refresh();
                            })
                          }
                        >
                          <Archive size={15} />
                          {detail.archived ? "Terugzetten uit archief" : "Project archiveren"}
                        </button>
                      )}
                    </section>
                    <section className="card">
                      <div className="section-heading">
                        <h3>Je projectteam</h3>
                        <button onClick={() => setTab("members")}>
                          <ArrowUpRight size={17} />
                        </button>
                      </div>
                      {detail.members.map((u) => (
                        <div className="member-mini" key={u.id}>
                          <Avatar name={u.name} small />
                          <div>
                            <strong>{u.name}</strong>
                            <small>
                              {u.id === detail.owner_id ? "Projecteigenaar" : "Consultant"}
                            </small>
                          </div>
                        </div>
                      ))}
                    </section>
                    <div className="project-ai-card">
                      <Sparkles size={24} />
                      <h3>Je project als context</h3>
                      <p>Vraag je assistent om mee te denken met je volgende stap.</p>
                      <button className="secondary full" onClick={() => setTab("ai")}>
                        Open AI-assistent <ArrowUpRight size={15} />
                      </button>
                    </div>
                  </aside>
                </div>
              )}
              {tab === "files" && (
                <FilesPanel
                  pid={pid}
                  run={run}
                  busy={busy}
                  agents={agents}
                  onChanged={reloadProject}
                />
              )}
              {tab === "team" && <TeamChat pid={pid} user={user} run={run} busy={busy} />}
              {tab === "ai" && (
                <AIChat
                  pid={pid}
                  user={user}
                  run={run}
                  busy={busy}
                  agents={agents}
                  mode={settings?.ai_mode || "demo"}
                />
              )}
              {tab === "members" && (
                <div className="members-grid">
                  <section className="card">
                    <h2>Projectleden</h2>
                    {detail.members.map((u) => (
                      <div className="member-row" key={u.id}>
                        <Avatar name={u.name} />
                        <div>
                          <strong>{u.name}</strong>
                          <small>{u.email}</small>
                        </div>
                        <span className="badge">
                          {u.id === detail.owner_id ? "Eigenaar" : "Lid"}
                        </span>
                        {detail.can_manage && u.id !== detail.owner_id && (
                          <button
                            className="icon-button"
                            aria-label={`Verwijder ${u.name} uit project`}
                            onClick={() =>
                              run(async () => {
                                await api(`/projects/${pid}/members/${u.id}`, "DELETE");
                                await refresh();
                              })
                            }
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </section>
                  <section className="card">
                    <div className="section-heading">
                      <h2>Uitnodigingen</h2>
                      <button
                        onClick={() => {
                          setInviteUser("");
                          setModal("invite");
                        }}
                      >
                        <Plus size={16} />
                        Aanvragen
                      </button>
                    </div>
                    <p className="muted">
                      Eén goedkeuring van de eigenaar of een beheerder geeft toegang.
                    </p>
                    {invitations.map((i) => (
                      <div className="invitation-row" key={i.id}>
                        <strong>{i.user_name}</strong>
                        <p>Aangevraagd door {i.requester_name}</p>
                        <span className="badge">
                          {i.state === "pending"
                            ? "Wacht op goedkeuring"
                            : i.state === "approved"
                              ? "Goedgekeurd"
                              : "Afgewezen"}
                        </span>
                        {i.state === "pending" && detail.can_manage && (
                          <div className="actions">
                            <button
                              className="primary"
                              onClick={() =>
                                run(async () => {
                                  await api(`/invitations/${i.id}/decision`, "POST", {
                                    state: "approved",
                                  });
                                  await refresh();
                                })
                              }
                            >
                              <Check size={15} />
                              Goedkeuren
                            </button>
                            <button
                              className="secondary"
                              onClick={() =>
                                run(async () => {
                                  await api(`/invitations/${i.id}/decision`, "POST", {
                                    state: "rejected",
                                  });
                                  await refresh();
                                })
                              }
                            >
                              Afwijzen
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    {!invitations.length && (
                      <Empty
                        title="Geen uitnodigingen"
                        text="Vraag toegang aan voor een collega."
                      />
                    )}
                  </section>
                </div>
              )}
            </>
          )}
          {view === "project" && !detail && (
            <div className="loading">
              <Compass size={25} className="spin" />
              Project laden…
            </div>
          )}
          {view === "agents" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">JOUW EXPERTISE, HERBRUIKBAAR</span>
                  <h1>AI-agenten</h1>
                  <p>Geef je assistent een rol, instructies en de juiste bronnen.</p>
                </div>
                <button
                  className="primary"
                  disabled={!pid}
                  onClick={() => {
                    setAgentForm({ name: "", instructions: "", tools: ["chat"], file_ids: [] });
                    setModal("agent");
                  }}
                >
                  <Plus size={17} />
                  Nieuwe agent
                </button>
              </div>
              <div className="list-filters">
                <Field label="Project">
                  <select value={pid} onChange={(e) => setPid(e.target.value)}>
                    <option value="">Selecteer een project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="agent-grid">
                {pid &&
                  agents.map((a) => (
                    <section className="agent-card" key={a.id}>
                      <div className="agent-mark">
                        <Bot size={25} />
                      </div>
                      <h2>{a.name}</h2>
                      <p>{a.instructions}</p>
                      <div className="tool-tags">
                        {a.tools.map((t) => (
                          <span key={t}>
                            {
                              {
                                chat: "Chat",
                                documents: "Documenten",
                                review: "Review",
                                charts: "Grafieken",
                              }[t]
                            }
                          </span>
                        ))}
                      </div>
                      <small className="muted">
                        {a.file_ids.length
                          ? `${a.file_ids.length} geselecteerde bronnen`
                          : "Alle beschikbare projectbestanden"}
                      </small>
                      <footer>
                        <button className="text-button" onClick={() => openProject(pid, "ai")}>
                          Gebruik in chat <ArrowUpRight size={16} />
                        </button>
                        {detail?.can_manage && (
                          <button
                            className="icon-button"
                            aria-label={`Verwijder agent ${a.name}`}
                            onClick={() =>
                              run(async () => {
                                await api(`/projects/${pid}/agents/${a.id}`, "DELETE");
                                await reloadProject();
                              })
                            }
                          >
                            <X size={16} />
                          </button>
                        )}
                      </footer>
                    </section>
                  ))}
              </div>
              {(!pid || !agents.length) && (
                <Empty
                  title={pid ? "Maak je eerste agent" : "Selecteer een project"}
                  text="Agenten gebruiken alleen de context van het geselecteerde project."
                />
              )}
            </>
          )}
          {view === "settings" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">DE BASIS VAN JE WERKRUIMTE</span>
                  <h1>Instellingen</h1>
                  <p>Bedrijfsstijl, gebruikers en verbindingen.</p>
                </div>
              </div>
              <div className="settings-grid">
                <section className="card">
                  <h2>Bedrijfsstijl</h2>
                  {companyForm && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        run(async () => {
                          await api("/settings/company", "PUT", companyForm);
                          await reload();
                        });
                      }}
                    >
                      <Field label="Bedrijfsnaam">
                        <input
                          value={companyForm.name}
                          disabled={user.role !== "admin"}
                          required
                          onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                        />
                      </Field>
                      <div className="form-grid">
                        <Field label="Hoofdkleur">
                          <input
                            type="color"
                            value={companyForm.primary}
                            disabled={user.role !== "admin"}
                            onChange={(e) =>
                              setCompanyForm({ ...companyForm, primary: e.target.value })
                            }
                          />
                        </Field>
                        <Field label="Accentkleur">
                          <input
                            type="color"
                            value={companyForm.accent}
                            disabled={user.role !== "admin"}
                            onChange={(e) =>
                              setCompanyForm({ ...companyForm, accent: e.target.value })
                            }
                          />
                        </Field>
                      </div>
                      <Field label="Lettertype voor documenten">
                        <input
                          value={companyForm.font}
                          disabled={user.role !== "admin"}
                          required
                          onChange={(e) => setCompanyForm({ ...companyForm, font: e.target.value })}
                        />
                      </Field>
                      <Field label="Tagline">
                        <input
                          value={companyForm.tagline}
                          disabled={user.role !== "admin"}
                          onChange={(e) =>
                            setCompanyForm({ ...companyForm, tagline: e.target.value })
                          }
                        />
                      </Field>
                      <Field label="Standaard projectmappen · één per regel">
                        <textarea
                          rows={7}
                          value={companyForm.folders.join("\n")}
                          disabled={user.role !== "admin"}
                          onChange={(e) =>
                            setCompanyForm({ ...companyForm, folders: e.target.value.split("\n") })
                          }
                        />
                      </Field>
                      <p className="muted">
                        Nieuwe documenten gebruiken deze stijl. De mapstructuur geldt voor nieuwe
                        projecten.
                      </p>
                      {user.role === "admin" && (
                        <button className="primary" disabled={busy}>
                          <Busy busy={busy}>Instellingen opslaan</Busy>
                        </button>
                      )}
                    </form>
                  )}
                </section>
                <div>
                  {settings && (
                    <AISettings
                      settings={settings}
                      admin={user.role === "admin"}
                      busy={busy}
                      run={run}
                      reload={reload}
                    />
                  )}
                  <section className="card">
                    <h2>Verbindingen</h2>
                    <div className="connection">
                      <Sparkles size={22} />
                      <div>
                        <strong>Codex</strong>
                        <p>
                          {settings?.ai_mode === "codex"
                            ? "Lokale Codex-login · modellen instelbaar door de beheerder"
                            : "Offline demonstratie · geen model aangeroepen"}
                        </p>
                      </div>
                      <span className="badge">
                        {settings?.ai_mode === "codex" ? "Codex" : "Demo"}
                      </span>
                    </div>
                    <div className="connection">
                      <Folder size={22} />
                      <div>
                        <strong>Bestandsopslag</strong>
                        <p>Lokale opslag op deze PC, met versiegeschiedenis.</p>
                      </div>
                    </div>
                    <div className="connection">
                      <Building2 size={22} />
                      <div>
                        <strong>Microsoft 365 / SharePoint</strong>
                        <p>
                          {settings?.office_desktop_enabled
                            ? "Desktop Office ingeschakeld. Bewerk bestanden en importeer ze als nieuwe versie. SharePoint-sync vereist tenantconfiguratie."
                            : "Schakel OFFICE_DESKTOP_ENABLED in op de werk-PC voor volledige bewerking in Office. SharePoint-sync volgt na tenantconfiguratie."}
                        </p>
                      </div>
                      <span className="badge">
                        {settings?.office_desktop_enabled ? "Desktop" : "Werk-PC"}
                      </span>
                    </div>
                  </section>
                  <section className="card">
                    <h2>Bedrijfsgebruikers</h2>
                    {users.map((u) => (
                      <div className="member-row" key={u.id}>
                        <Avatar name={u.name} small />
                        <div>
                          <strong>{u.name}</strong>
                          <small>{u.email}</small>
                        </div>
                        {user.role === "admin" ? (
                          <select
                            aria-label={`Rol voor ${u.name}`}
                            value={u.role}
                            onChange={(e) =>
                              run(async () => {
                                await api(`/users/${u.id}/role`, "PATCH", { role: e.target.value });
                                setUser(await api<User>("/me"));
                                await reload();
                              })
                            }
                          >
                            <option value="admin">Beheerder</option>
                            <option value="consultant">Consultant</option>
                          </select>
                        ) : (
                          <span className="badge">
                            {u.role === "admin" ? "Beheerder" : "Consultant"}
                          </span>
                        )}
                      </div>
                    ))}
                  </section>
                </div>
              </div>
            </>
          )}
          <footer className="workspace-footer">
            <span>MERIDIAN CONSULTING</span>
            <span>
              Sampledata · Lokale PoC ·{" "}
              {settings?.ai_mode === "codex" ? "Codex · lokale login" : "AI in demonstratiemodus"}
            </span>
          </footer>
        </main>
      </div>
      {!!modal && (
        <Modal
          title={
            {
              customer: "Nieuwe klant",
              editCustomer: "Klantprofiel bewerken",
              project: "Nieuw project",
              editProject: "Projectbrief bewerken",
              invite: "Collega uitnodigen",
              agent: "Nieuwe AI-agent",
              customerAccess: "Klanttoegang verlenen",
            }[modal] || "Bewerken"
          }
          close={() => setModal("")}
        >
          <form onSubmit={saveModal}>
            {["customer", "editCustomer"].includes(modal) && (
              <>
                <Field label="Klantnaam">
                  <input
                    required
                    value={customerForm.name}
                    onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                  />
                </Field>
                <Field label="Sector">
                  <input
                    value={customerForm.industry}
                    onChange={(e) => setCustomerForm({ ...customerForm, industry: e.target.value })}
                  />
                </Field>
                <Field label="Achtergrond">
                  <textarea
                    rows={4}
                    value={customerForm.description}
                    onChange={(e) =>
                      setCustomerForm({ ...customerForm, description: e.target.value })
                    }
                  />
                </Field>
                <Field label="Contactpersonen">
                  <textarea
                    rows={2}
                    value={customerForm.contacts}
                    onChange={(e) => setCustomerForm({ ...customerForm, contacts: e.target.value })}
                  />
                </Field>
                <Field label="Doelen">
                  <textarea
                    rows={3}
                    value={customerForm.goals}
                    onChange={(e) => setCustomerForm({ ...customerForm, goals: e.target.value })}
                  />
                </Field>
              </>
            )}
            {["project", "editProject"].includes(modal) && (
              <>
                {modal === "project" && (
                  <Field label="Klant">
                    <select
                      required
                      value={projectForm.customer_id}
                      onChange={(e) =>
                        setProjectForm({ ...projectForm, customer_id: e.target.value })
                      }
                    >
                      <option value="">Selecteer een klant</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
                <Field label="Projectnaam">
                  <input
                    required
                    value={projectForm.name}
                    onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                  />
                </Field>
                <Field label="Scope / omschrijving">
                  <textarea
                    rows={3}
                    value={projectForm.description}
                    onChange={(e) =>
                      setProjectForm({ ...projectForm, description: e.target.value })
                    }
                  />
                </Field>
                <Field label="Doelstellingen">
                  <textarea
                    rows={3}
                    value={projectForm.objectives}
                    onChange={(e) => setProjectForm({ ...projectForm, objectives: e.target.value })}
                  />
                </Field>
                <div className="form-grid">
                  <Field label="Startdatum">
                    <input
                      type="date"
                      value={projectForm.start_date}
                      onChange={(e) =>
                        setProjectForm({ ...projectForm, start_date: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Doeldatum">
                    <input
                      type="date"
                      value={projectForm.due_date}
                      onChange={(e) => setProjectForm({ ...projectForm, due_date: e.target.value })}
                    />
                  </Field>
                </div>
                {modal === "project" && (
                  <p className="muted">
                    Jij wordt projecteigenaar. De standaardmappen worden automatisch aangemaakt.
                  </p>
                )}
              </>
            )}
            {["invite", "customerAccess"].includes(modal) && (
              <>
                <Field label="Collega">
                  <select
                    required
                    value={inviteUser}
                    onChange={(e) => setInviteUser(e.target.value)}
                  >
                    <option value="">Selecteer een collega</option>
                    {users
                      .filter(
                        (u) => modal !== "invite" || !detail?.members.some((m) => m.id === u.id),
                      )
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} · {u.email}
                        </option>
                      ))}
                  </select>
                </Field>
                <div className="notice">
                  <Lock size={18} />
                  <p>
                    {modal === "invite"
                      ? "De collega krijgt pas toegang na goedkeuring door de projecteigenaar of één beheerder."
                      : "Directe klanttoegang geeft toegang tot het profiel en het maken van projecten. Toegang tot bestaande projecten blijft apart geregeld."}
                  </p>
                </div>
              </>
            )}
            {modal === "agent" && (
              <>
                <Field label="Agentnaam">
                  <input
                    required
                    value={agentForm.name}
                    onChange={(e) => setAgentForm({ ...agentForm, name: e.target.value })}
                  />
                </Field>
                <Field label="Instructies">
                  <textarea
                    rows={5}
                    required
                    placeholder="Wat is de rol van deze agent? Hoe moet deze antwoorden?"
                    value={agentForm.instructions}
                    onChange={(e) => setAgentForm({ ...agentForm, instructions: e.target.value })}
                  />
                </Field>
                <div className="field">
                  <span>Toegestane functies</span>
                  {[
                    { id: "chat", name: "Projectchat" },
                    { id: "documents", name: "Documenten maken" },
                    { id: "review", name: "Documentreview" },
                    { id: "charts", name: "Grafieken" },
                  ].map((t) => (
                    <label className="checkbox" key={t.id}>
                      <input
                        type="checkbox"
                        checked={agentForm.tools.includes(t.id)}
                        onChange={(e) =>
                          setAgentForm({
                            ...agentForm,
                            tools: e.target.checked
                              ? [...agentForm.tools, t.id]
                              : agentForm.tools.filter((x) => x !== t.id),
                          })
                        }
                      />
                      {t.name}
                    </label>
                  ))}
                </div>
                <div className="field">
                  <span>Referentiebestanden · leeg betekent alle projectbestanden</span>
                  {projectFiles
                    .filter((f) => f.kind === "file" && !f.deleted)
                    .map((f) => (
                      <label className="checkbox" key={f.id}>
                        <input
                          type="checkbox"
                          checked={agentForm.file_ids.includes(f.id)}
                          onChange={(e) =>
                            setAgentForm({
                              ...agentForm,
                              file_ids: e.target.checked
                                ? [...agentForm.file_ids, f.id]
                                : agentForm.file_ids.filter((x) => x !== f.id),
                            })
                          }
                        />
                        {f.name}
                      </label>
                    ))}
                </div>
              </>
            )}
            <footer className="modal-footer">
              <button className="secondary" type="button" onClick={() => setModal("")}>
                Annuleren
              </button>
              <button className="primary" disabled={busy}>
                <Busy busy={busy}>{modal === "invite" ? "Uitnodiging aanvragen" : "Opslaan"}</Busy>
              </button>
            </footer>
          </form>
        </Modal>
      )}
    </div>
  );
}

function ProjectCard({ project, open }: { project: Project; open: () => void }) {
  return (
    <button className="project-card" onClick={open}>
      <div className="project-card-top">
        <div className="project-symbol">
          <FolderKanban size={20} />
        </div>
        <Badge state={project.state} />
        <ArrowUpRight size={17} className="card-arrow" />
      </div>
      <span className="eyebrow">{project.customer_name}</span>
      <h3>{project.name}</h3>
      <p>{project.description}</p>
      <footer>
        <span>
          <CalendarDays size={14} />
          {date(project.due_date)}
        </span>
        <span>
          <Avatar name={project.owner_name || "Projecteigenaar"} small />
          {project.owner_name?.split(" ")[0] || "Eigenaar"}
        </span>
      </footer>
    </button>
  );
}
