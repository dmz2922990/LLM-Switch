import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Host, Profile } from "../types";
import { Dialog } from "./Dialog";

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
        {hosts.map((h) => (
          <label key={h.id} className="host-check-row host-check-label">
            <input
              type="checkbox"
              checked={selected.has(h.id)}
              onChange={() => toggle(h.id)}
            />
            {h.name} ({h.address}:{h.port})
            {h.is_default && <span className="default-badge">{t("sync.defaultHost")}</span>}
          </label>
        ))}
      </div>
      <p className="scope-hint" style={{ marginTop: 10 }}>
        {t("sync.scopeHint")} · {profile.name}
      </p>
    </Dialog>
  );
}
