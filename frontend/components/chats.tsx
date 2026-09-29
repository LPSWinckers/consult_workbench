"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Plus,
  Lock,
  Users,
  Sparkles,
  FileText,
  MessageSquare,
  BarChart3,
} from "lucide-react";
import { api, Avatar, Empty } from "./ui";
import { Chart } from "./files";
import type { Agent, ChartData, ProjectFile, Run, Source, User } from "./types";

type Message = { id: string; user_id: string; user_name: string; body: string; created_at: string };
type Conversation = { id: string; title: string; user_id: string; shared: number };
type AIMessage = { id: string; role: string; body: string; sources: Source[] };
type ConversationDetail = Conversation & { messages: AIMessage[] };

export function TeamChat({
  pid,
  user,
  run,
  busy,
}: {
  pid: string;
  user: User;
  run: Run;
  busy: boolean;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let alive = true;
    async function load() {
      const data = await api<Message[]>(`/projects/${pid}/messages`);
      if (alive) setMessages(data);
    }
    run(load);
    const timer = setInterval(() => {
      load().catch(() => {});
    }, 5000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [pid]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);
  return (
    <section className="chat-panel">
      <header className="chat-header">
        <div>
          <h3>Het projectteam</h3>
          <p className="muted">Stem af, deel inzichten en houd elkaar op de hoogte.</p>
        </div>
        <span className="badge">
          <Users size={13} /> Gedeeld
        </span>
      </header>
      <div className="chat-scroll">
        {!messages.length && (
          <Empty title="Begin het gesprek" text="Alle projectleden kunnen deze berichten lezen." />
        )}
        {messages.map((m) => (
          <div className={`team-message ${m.user_id === user.id ? "own" : ""}`} key={m.id}>
            <Avatar name={m.user_name} small />
            <div>
              <div className="message-meta">
                <strong>{m.user_name}</strong>
                <time>
                  {new Date(m.created_at).toLocaleTimeString("nl-NL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </div>
              <p>{m.body}</p>
            </div>
          </div>
        ))}
        <div ref={end} />
      </div>
      <form
        className="chat-composer"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          run(async () => {
            await api(`/projects/${pid}/messages`, "POST", { body: text });
            setText("");
            setMessages(await api<Message[]>(`/projects/${pid}/messages`));
          });
        }}
      >
        <input
          aria-label="Bericht aan projectteam"
          placeholder="Schrijf een bericht aan je team…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          className="primary square"
          aria-label="Bericht versturen"
          disabled={busy || !text.trim()}
        >
          <ArrowUp size={18} />
        </button>
      </form>
    </section>
  );
}

export function AIChat({
  pid,
  user,
  run,
  busy,
  agents,
  mode,
}: {
  pid: string;
  user: User;
  run: Run;
  busy: boolean;
  agents: Agent[];
  mode: string;
}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [current, setCurrent] = useState<ConversationDetail | null>(null);
  const [question, setQuestion] = useState("");
  const [agent, setAgent] = useState("");
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [chart, setChart] = useState<ChartData | null>(null);
  const end = useRef<HTMLDivElement>(null);
  async function reload() {
    setConversations(await api<Conversation[]>(`/projects/${pid}/conversations`));
  }
  useEffect(() => {
    setCurrent(null);
    setChart(null);
    run(async () => {
      await reload();
      setFiles(await api<ProjectFile[]>(`/projects/${pid}/files`));
    });
  }, [pid]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [current?.messages.length]);
  async function ask(text = question) {
    let cid = current?.id;
    if (!cid) cid = (await api<{ id: string }>(`/projects/${pid}/conversations`, "POST", {})).id;
    await api(`/conversations/${cid}/ask`, "POST", { question: text, agent_id: agent || null });
    setQuestion("");
    setCurrent(await api<ConversationDetail>(`/conversations/${cid}`));
    await reload();
  }
  const readonly = current && current.user_id !== user.id;
  return (
    <div className="ai-layout">
      <aside className="conversation-list">
        <button
          className="secondary full"
          onClick={() => {
            setCurrent(null);
            setChart(null);
          }}
        >
          <Plus size={16} />
          Nieuw gesprek
        </button>
        <span className="eyebrow">GESPREKKEN</span>
        {conversations.map((c) => (
          <button
            key={c.id}
            className={current?.id === c.id ? "selected" : ""}
            onClick={() =>
              run(async () => {
                setCurrent(await api<ConversationDetail>(`/conversations/${c.id}`));
                setChart(null);
              })
            }
          >
            {c.shared ? <Users size={14} /> : <Lock size={14} />}
            <span>{c.title}</span>
          </button>
        ))}
        {!conversations.length && (
          <p className="muted small-text">Je gesprekken verschijnen hier.</p>
        )}
        <div className="privacy-note">
          <Lock size={15} />
          <p>Gesprekken beginnen privé. Jij bepaalt wat je met het team deelt.</p>
        </div>
      </aside>
      <section className="chat-panel ai-chat">
        <header className="chat-header">
          <div>
            <h3>
              <Sparkles size={18} /> Projectassistent
            </h3>
            <p className="muted">
              {mode === "demo"
                ? "Offline demonstratie · voorbeeldantwoorden"
                : mode === "openai"
                  ? "OpenAI · klant- en projectcontext"
                  : "Configureer een OpenAI API-sleutel"}
            </p>
          </div>
          <div className="actions">
            <select
              aria-label="Selecteer AI-agent"
              value={agent}
              onChange={(e) => setAgent(e.target.value)}
            >
              <option value="">Standaard assistent</option>
              {agents
                .filter((a) => a.tools.includes("chat"))
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </select>
            {current && current.user_id === user.id && (
              <button
                className="secondary"
                onClick={() =>
                  run(async () => {
                    await api(`/conversations/${current.id}`, "PATCH", { shared: !current.shared });
                    setCurrent(await api<ConversationDetail>(`/conversations/${current.id}`));
                    await reload();
                  })
                }
              >
                {current.shared ? <Users size={15} /> : <Lock size={15} />}
                {current.shared ? "Maak privé" : "Deel met team"}
              </button>
            )}
          </div>
        </header>
        <div className="chat-scroll">
          {!current?.messages.length && (
            <div className="ai-welcome">
              <div className="sparkle-mark">
                <Sparkles size={30} />
              </div>
              <span className="eyebrow">KENNIS WORDT ADVIES</span>
              <h2>Wat wil je verder brengen?</h2>
              <p>
                Stel een vraag. Je assistent gebruikt de informatie van
                <br />
                de klant, het project en de beschikbare bestanden.
              </p>
              <div className="suggestion-grid">
                {[
                  "Vat de projectdoelen en randvoorwaarden samen",
                  "Welke processen zijn geschikt voor een AI-pilot?",
                  "Welke informatie ontbreekt voor ons advies?",
                ].map((text) => (
                  <button key={text} onClick={() => run(() => ask(text))} disabled={busy}>
                    <MessageSquare size={16} />
                    {text}
                    <ArrowUp size={15} />
                  </button>
                ))}
              </div>
            </div>
          )}
          {current?.messages.map((m) => (
            <div className={`ai-message ${m.role}`} key={m.id}>
              <div className="message-avatar">
                {m.role === "assistant" ? (
                  <Sparkles size={18} />
                ) : (
                  <Avatar name={user.name} small />
                )}
              </div>
              <div>
                <strong>{m.role === "assistant" ? "Projectassistent" : "Vraag"}</strong>
                <p className="prewrap">{m.body}</p>
                {m.sources.length > 0 && (
                  <div className="source-list">
                    <span className="muted">Contextbestanden</span>
                    {m.sources.map((s) => (
                      <a key={s.id} href={`/api/files/${s.id}/download?version=${s.version}`}>
                        <FileText size={13} />
                        {s.name} · v{s.version}
                        {s.truncated ? " · ingekort" : ""}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {busy && (
            <p className="ai-thinking">
              <Sparkles size={16} className="spin" /> Even geduld…
            </p>
          )}
          {chart && <Chart data={chart} />}
          <div ref={end} />
        </div>
        <div className="chart-picker">
          <BarChart3 size={15} />
          <select
            aria-label="Toon Excel-grafiek in chat"
            value=""
            onChange={(e) => {
              if (e.target.value)
                run(async () => setChart(await api<ChartData>(`/files/${e.target.value}/chart`)));
            }}
          >
            <option value="">Toon een grafiek uit Excel…</option>
            {files
              .filter((f) => !f.deleted && f.name.endsWith(".xlsx"))
              .map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
          </select>
        </div>
        <form
          className="chat-composer"
          onSubmit={(e) => {
            e.preventDefault();
            if (question.trim()) run(() => ask());
          }}
        >
          <input
            aria-label="Vraag aan projectassistent"
            disabled={!!readonly}
            placeholder={
              readonly
                ? "Gedeeld gesprek is alleen-lezen. Begin een eigen gesprek."
                : "Vraag iets over je project…"
            }
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <button
            className="primary square"
            aria-label="Vraag versturen"
            disabled={busy || !!readonly || !question.trim()}
          >
            <ArrowUp size={18} />
          </button>
        </form>
      </section>
    </div>
  );
}
