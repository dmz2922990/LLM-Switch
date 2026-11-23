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

  useEffect(() => {
    api.activation.listLog().then(setLogs).catch(() => {});
  }, []);

  if (logs.length === 0) {
    return <p className="empty-text">{t("activation.noRecords")}</p>;
  }

  return (
    <div className="log-list">
      {logs.map((log) => {
        const profileName = profiles.find((p) => p.id === log.profile_id)?.name ?? log.profile_id;
        const ok = log.status === "success";
        return (
          <div key={log.id} className="log-row">
            <span className={`log-status ${ok ? "is-ok" : "is-err"}`}>
              {ok ? <IconCheck size={11} /> : <IconX size={11} />}
            </span>
            <div className="log-content">
              <div className="log-primary">
                <span className="log-entity">{profileName}</span>
                <span className="log-time-inline">{formatLogDate(log.activated_at)}</span>
              </div>
              {log.error_message && (
                <div className="log-meta">
                  <span className="log-error">{log.error_message}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
