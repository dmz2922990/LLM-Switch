import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Host, Profile } from "../types";
import { Dialog } from "./Dialog";

interface Props {
  profile: Profile;
  hosts: Host[];
  onClose: () => void;
  onSynced: (hostId: string) => void;
}

export function SyncHostDialog({ profile, hosts, onClose, onSynced }: Props) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string>(hosts.find((h) => h.is_default)?.id ?? hosts[0]?.id ?? "");

  return (
    <Dialog
      title={t("syncHost.title")}
      size="sm"
      onClose={onClose}
      actions={
        <>
          <button className="btn btn--ghost" onClick={onClose}>{t("common.cancel")}</button>
          <button className="btn btn--primary" onClick={() => selected && onSynced(selected)} disabled={!selected}>
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
              type="radio"
              name="sync-host"
              checked={selected === h.id}
              onChange={() => setSelected(h.id)}
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
