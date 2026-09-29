"use client";
import { useEffect, useState } from "react";
import { ArrowRight, Compass, Check, Mail, Sparkles } from "lucide-react";
import { api, Field, Busy } from "./ui";
import type { User } from "./types";

export function Auth({ onLogin }: { onLogin: (user: User) => void }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("admin@meridian.demo");
  const [password, setPassword] = useState("MeridianDemo!2026");
  const [name, setName] = useState("");
  const [token, setToken] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [demo, setDemo] = useState(false);
  useEffect(() => {
    api<{ ai: string }>("/health")
      .then((x) => setDemo(x.ai === "demo"))
      .catch(() => setError("Start de Python-backend om in te loggen."));
    const params = new URLSearchParams(window.location.search);
    if (params.get("verify")) {
      api<{ message: string }>("/auth/verify", "POST", { token: params.get("verify") })
        .then((x) => setNotice(x.message))
        .catch((e) => setError(e.message));
      window.history.replaceState({}, "", "/");
    }
    if (params.get("reset")) {
      setToken(params.get("reset")!);
      setMode("reset");
      setPassword("");
    }
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    setLink(null);
    try {
      if (mode === "login") onLogin(await api<User>("/auth/login", "POST", { email, password }));
      else {
        const result = await api<{ message: string; development_link?: string }>(
          `/auth/${mode === "signup" ? "register" : mode}`,
          "POST",
          { email, password, name, token },
        );
        setNotice(result.message);
        setLink(result.development_link || null);
        if (mode === "reset") {
          setMode("login");
          window.history.replaceState({}, "", "/");
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Er ging iets mis");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-layout">
      <aside className="auth-story">
        <div className="brand">
          <Compass size={30} />
          <div>
            meridian<span>CONSULTING</span>
          </div>
        </div>
        <div className="story-content">
          <span className="eyebrow light">DE CONSULTANTWERKRUIMTE</span>
          <h1>
            Goed advies begint
            <br />
            met samen werken.
          </h1>
          <p>
            Je klant, je team en je kennis.
            <br />
            Eén plek om ideeën verder te brengen.
          </p>
          <div className="story-card">
            <Sparkles size={22} />
            <div>
              <strong>AI met de juiste context</strong>
              <p>Van projectbrief tot presentatie, met jouw kennis als uitgangspunt.</p>
            </div>
          </div>
        </div>
        <footer>
          Van inzicht naar impact <span>Meridian Consulting</span>
        </footer>
      </aside>
      <section className="auth-form">
        <div>
          <span className="eyebrow">WELKOM BIJ MERIDIAN</span>
          <h2>
            {mode === "signup"
              ? "Maak je account"
              : mode === "forgot"
                ? "Wachtwoord herstellen"
                : mode === "reset"
                  ? "Nieuw wachtwoord"
                  : "Jouw werkruimte staat klaar"}
          </h2>
          <p className="muted">
            {mode === "login"
              ? "Log in en werk verder aan je projecten."
              : "Gebruik je e-mailadres om verder te gaan."}
          </p>
          <form onSubmit={submit}>
            {mode === "signup" && (
              <Field label="Naam">
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </Field>
            )}
            {mode !== "reset" && (
              <Field label="E-mailadres">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </Field>
            )}
            {mode !== "forgot" && (
              <Field label="Wachtwoord">
                <input
                  type="password"
                  minLength={10}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
              </Field>
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            {notice && (
              <p className="success">
                <Check size={16} />
                {notice}
              </p>
            )}
            {link && (
              <a className="dev-link" href={link}>
                <Mail size={16} /> Open lokale ontwikkellink. Er is geen e-mail verstuurd.
              </a>
            )}
            <button className="primary full" disabled={busy}>
              <Busy busy={busy}>
                {mode === "login"
                  ? "Inloggen"
                  : mode === "signup"
                    ? "Account aanmaken"
                    : mode === "reset"
                      ? "Wachtwoord opslaan"
                      : "Herstellink aanvragen"}
                <ArrowRight size={17} />
              </Busy>
            </button>
          </form>
          <div className="auth-links">
            <button
              onClick={() => {
                setMode(mode === "signup" ? "login" : "signup");
                setPassword("");
                setError("");
              }}
            >
              {mode === "signup" ? "Ik heb al een account" : "Account aanmaken"}
            </button>
            <button
              onClick={() => {
                setMode("forgot");
                setError("");
              }}
            >
              Wachtwoord vergeten?
            </button>
          </div>
          {demo && (
            <div className="demo-credentials">
              <span className="eyebrow">LOKALE DEMO · SAMPLEDATA</span>
              <p>
                Probeer ook <code>eigenaar@meridian.demo</code>,{" "}
                <code>consultant@meridian.demo</code> of <code>nieuw@meridian.demo</code>.
              </p>
              <p>
                Wachtwoord: <code>MeridianDemo!2026</code>
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
