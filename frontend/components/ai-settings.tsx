"use client";
import { useEffect, useState } from "react";
import { api, Field } from "./ui";
import type { Settings, Run } from "./types";

export function AISettings({
  settings,
  admin,
  busy,
  run,
  reload,
}: {
  settings: Settings;
  admin: boolean;
  busy: boolean;
  run: Run;
  reload: () => Promise<void>;
}) {
  const [form, setForm] = useState(settings.ai);
  const [message, setMessage] = useState("");
  useEffect(() => setForm(settings.ai), [settings.ai]);
  return (
    <section className="card">
      <h2>Codex en modellen</h2>
      <p className="muted">
        Codex gebruikt de login op de PC waar de backend draait. Een API-sleutel is niet nodig.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            await api("/settings/ai", "PUT", form);
            await reload();
            setMessage("AI-instellingen opgeslagen.");
          });
        }}
      >
        <Field label="AI-provider">
          <select
            disabled={!admin}
            value={form.provider}
            onChange={(e) => setForm({ ...form, provider: e.target.value })}
          >
            <option value="codex">Codex · echte AI</option>
            <option value="demo">Offline demonstratie</option>
          </select>
        </Field>
        <datalist id="codex-models">
          {settings.models.map((model) => (
            <option key={model} value={model} />
          ))}
        </datalist>
        <Field label="Model voor project- en bestandschat">
          <input
            required
            list="codex-models"
            disabled={!admin}
            value={form.chat_model}
            onChange={(e) => setForm({ ...form, chat_model: e.target.value })}
          />
        </Field>
        <Field label="Model voor documenten en taalcontrole">
          <input
            required
            list="codex-models"
            disabled={!admin}
            value={form.document_model}
            onChange={(e) => setForm({ ...form, document_model: e.target.value })}
          />
        </Field>
        <Field label="Redeneerniveau">
          <select
            disabled={!admin}
            value={form.reasoning_effort}
            onChange={(e) => setForm({ ...form, reasoning_effort: e.target.value })}
          >
            <option value="low">Laag</option>
            <option value="medium">Gemiddeld</option>
            <option value="high">Hoog</option>
            <option value="xhigh">Extra hoog</option>
          </select>
        </Field>
        <p className="muted">
          Suggesties komen uit de lokale Codex-catalogus. Je kunt ook een modelnaam invullen.
          Toegang en ondersteunde redeneerniveaus hangen af van je account. Aanvragen kunnen enkele
          minuten duren.
        </p>
        {admin && (
          <div className="preview-tools">
            <button className="primary" disabled={busy}>
              Modellen opslaan
            </button>
            <button
              type="button"
              className="secondary"
              disabled={busy || settings.ai.provider !== "codex"}
              onClick={() =>
                run(async () => {
                  setMessage("Verbinding testen…");
                  const result = await api<{ message: string }>("/settings/ai/check", "POST");
                  setMessage(result.message);
                })
              }
            >
              Opgeslagen chatmodel testen
            </button>
          </div>
        )}
        {message && <p role="status">{message}</p>}
      </form>
    </section>
  );
}
