"use client";
import { X, ArrowUpRight, Folder, FileText, Presentation, Sheet, Loader2 } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

export async function api<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    credentials: "same-origin",
    headers: body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "De server is niet bereikbaar" }));
    throw new Error(
      typeof error.detail === "string" ? error.detail : "Controleer de ingevulde gegevens",
    );
  }
  return response.json();
}
export function Modal({
  title,
  children,
  close,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
  wide?: boolean;
}) {
  const panel = useRef<HTMLElement>(null);
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLElement>("button,input,select,textarea,a[href]")?.focus();
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
      }
      if (event.key === "Tab") {
        const items = Array.from(
          panel.current?.querySelectorAll<HTMLElement>(
            "button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href]",
          ) || [],
        );
        const first = items[0],
          last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        }
        if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", keydown);
      previous?.focus();
    };
  }, []);
  return (
    <div className="modal-backdrop" onClick={close}>
      <section
        ref={panel}
        className={`modal ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <h2>{title}</h2>
          <button className="icon-button" aria-label="Sluiten" onClick={close}>
            <X size={20} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export function Badge({ state }: { state: string }) {
  return (
    <span
      className={`badge ${state === "In uitvoering" ? "active" : state === "Afgerond" ? "complete" : state === "In review" ? "review" : ""}`}
    >
      <i />
      {state}
    </span>
  );
}
export function Avatar({ name, small = false }: { name: string; small?: boolean }) {
  return (
    <span className={`avatar ${small ? "small" : ""}`}>
      {name
        .split(" ")
        .filter(Boolean)
        .map((x) => x[0])
        .slice(0, 2)
        .join("")}
    </span>
  );
}
export function FileIcon({ name, folder = false }: { name: string; folder?: boolean }) {
  return folder ? (
    <Folder size={20} className="folder-icon" />
  ) : name.endsWith(".xlsx") ? (
    <Sheet size={20} className="excel-icon" />
  ) : name.endsWith(".pptx") ? (
    <Presentation size={20} className="ppt-icon" />
  ) : (
    <FileText size={20} className="word-icon" />
  );
}
export function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty">
      <ArrowUpRight size={26} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
export function Busy({ busy, children }: { busy: boolean; children: ReactNode }) {
  return busy ? (
    <>
      <Loader2 size={16} className="spin" /> Even geduld…
    </>
  ) : (
    children
  );
}
export const date = (value: string) =>
  value
    ? new Date(value).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })
    : "Geen datum";
