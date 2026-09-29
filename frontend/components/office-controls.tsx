"use client";
import { useEffect, useState } from "react";
import { api } from "./ui";
import type { ProjectFile, Run } from "./types";

export function OfficeControls({
  file,
  busy,
  run,
  refresh,
}: {
  file: ProjectFile;
  busy: boolean;
  run: Run;
  refresh: () => Promise<void>;
}) {
  const [status, setStatus] = useState<{
    enabled: boolean;
    checked_out: boolean;
    base_version: number | null;
  } | null>(null);
  const [message, setMessage] = useState("");
  const load = async () => setStatus(await api(`/files/${file.id}/office`));
  useEffect(() => {
    let live = true;
    api<typeof status>(`/files/${file.id}/office`)
      .then((s) => {
        if (live) setStatus(s);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [file.id]);
  if (!status?.enabled) return null;
  return (
    <div className="office-controls">
      <div className="preview-tools">
        <button
          className="secondary"
          disabled={busy}
          onClick={() =>
            run(async () => {
              const result = await api<{ message: string }>(
                `/files/${file.id}/office/open`,
                "POST",
              );
              setMessage(result.message);
              await load();
            })
          }
        >
          Bewerken in Office
        </button>
        {status.checked_out && (
          <>
            <button
              className="primary"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const result = await api<{ message: string }>(
                    `/files/${file.id}/office/import`,
                    "POST",
                  );
                  setMessage(result.message);
                  await refresh();
                  await load();
                })
              }
            >
              Office-wijzigingen als versie opslaan
            </button>
            <a className="button secondary" href={`/api/files/${file.id}/office/download`}>
              Download werkkopie
            </a>
          </>
        )}
      </div>
      <p className="muted">
        Office opent op de werk-PC waar de server draait. Sla het bestand op en sluit Office voordat
        je wijzigingen importeert. Een nieuwere projectversie blokkeert import.
      </p>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
