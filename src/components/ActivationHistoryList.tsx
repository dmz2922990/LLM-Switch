import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { ActivationLog, Profile } from "../types";
import { api } from "../api";
import { IconCheck, IconX } from "./icons";

interface Props {
  profiles: Profile[];
}

function formatLogDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ActivationHistoryList({ profiles }: Props) {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<ActivationLog[]>([]);

  const loadLogs = () => {
    api.activation.listLog().then(setLogs).catch(() => {});
  };

  useEffect(() => {
    loadLogs();
  }, []);

  if (logs.length === 0) {
    return <p className="empty-text" style={{ padding: "12px 20px" }}>{t("activation.noRecords")}</p>;
  }

  return (
    <div style={{ padding: "4px 20px 16px" }}>
      {logs.map((log) => {
        const profileName = profiles.find((p) => p.id === log.profile_id)?.name ?? log.profile_id;
        return (
          <div key={log.id} className="activation-log-item">
            <span style={{ color: log.status === "success" ? "var(--link)" : "var(--danger)" }}>
              {log.status === "success" ? <IconCheck size={12} /> : <IconX size={12} />}
            </span>{" "}
            {formatLogDate(log.activated_at)} — {profileName}
            {log.error_message && (
              <span style={{ color: "var(--danger)" }}> ({log.error_message})</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
