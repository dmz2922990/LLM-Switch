import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Host, Profile } from "../types";
import { Dialog } from "./Dialog";
import { IconCheck } from "./icons";

interface Props {
  profile: Profile;
  hosts: Host[];
  onClose: () => void;
  onSynced: (hostIds: string[]) => void;
}

export function SyncHostDialog({ profile, hosts, onClose, onSynced }: Props) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Set<string>>(() => {
    const def = hosts.find((h) => h.is_default)?.id;
    return def ? new Set([def]) : new Set<string>();
  });

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Dialog
      title={t("syncHost.title")}
      subtitle={profile.name}
      size="sm"
      onClose={onClose}
      actions={
        <>
          <button className="btn btn--ghost" onClick={onClose}>{t("common.cancel")}</button>
          <button
            className="btn btn--primary"
            onClick={() => selected.size > 0 && onSynced(Array.from(selected))}
            disabled={selected.size === 0}
          >
            {t("common.sync")}
          </button>
        </>
      }
    >
      <p className="dialog-sub" style={{ marginBottom: 12 }}>
        {t("syncHost.desc")}
      </p>
      <div className="host-check-list">
        {hosts.map((h) => {
          const isChecked = selected.has(h.id);
          return (
            <button
              type="button"
              key={h.id}
              className={`host-check-card${isChecked ? " is-checked" : ""}`}
              onClick={() => toggle(h.id)}
            >
              <span className={`host-checkbox${isChecked ? " is-checked" : ""}`}>
                {isChecked ? <IconCheck size={11} /> : null}
              </span>
              <span className="host-check-info">
                <span className="host-check-name">
                  {h.name}
                  {h.is_default && <span className="default-badge">{t("sync.defaultHost")}</span>}
                </span>
                <span className="host-check-addr">{h.address}:{h.port}</span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="scope-hint" style={{ marginTop: 12 }}>
        {t("sync.scopeHint")}
      </p>
    </Dialog>
  );
}
