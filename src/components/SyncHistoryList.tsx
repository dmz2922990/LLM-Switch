import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { Host, Profile, SyncHistory } from "../types";
import { api } from "../api";
import { IconCheck, IconX } from "./icons";

const PAGE_SIZE = 4;

function formatSyncDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function SyncHistoryList({ profiles, hosts }: { profiles: Profile[]; hosts: Host[] }) {
  const { t } = useTranslation();
  const [history, setHistory] = useState<SyncHistory[]>([]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    api.sync.history().then((h) => {
      if (!cancelled) setHistory(h);
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (history.length === 0) {
    return <p className="empty-text" style={{ padding: "16px 20px" }}>{t("sync.noRecords")}</p>;
  }

  const pageItems = history.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div style={{ padding: "4px 20px 16px" }}>
      {pageItems.map((h) => {
        const hostName = hosts.find((x) => x.id === h.host_id)?.name ?? "Unknown";
        const profileName = profiles.find((p) => p.id === h.profile_id)?.name ?? "Unknown";
        const src = h.source_hash ?? t("sync.hashNA");
        const tgt = h.target_hash ?? t("sync.hashNA");
        return (
          <div key={h.id} className="sync-history-item">
            <span style={{ color: h.status === "success" ? "var(--link)" : "var(--danger)" }}>
              {h.status === "success" ? <IconCheck size={12} /> : <IconX size={12} />}
            </span>{" "}
            {formatSyncDate(h.synced_at)} - {hostName} - {profileName} -{" "}
            {src} → {tgt}
            {h.error_message && (
              <span style={{ color: "var(--danger)" }}> ({h.error_message})</span>
            )}
          </div>
        );
      })}
      {history.length > PAGE_SIZE && (
        <div className="pagination">
          <button
            className="btn btn--ghost btn--sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            {t("sync.prevPage")}
          </button>
          <span className="pagination-info">
            {page} / {Math.ceil(history.length / PAGE_SIZE)}
          </span>
          <button
            className="btn btn--ghost btn--sm"
            disabled={page * PAGE_SIZE >= history.length}
            onClick={() => setPage((p) => p + 1)}
          >
            {t("sync.nextPage")}
          </button>
        </div>
      )}
    </div>
  );
}
