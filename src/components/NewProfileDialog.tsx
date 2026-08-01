import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api";
import { Dialog } from "./Dialog";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export function NewProfileDialog({ onClose, onCreated }: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      setError("");
      await api.profile.create(name.trim());
      onCreated();
      onClose();
    } catch (e: any) {
      setError(e.toString());
    }
  };

  return (
    <Dialog
      title={t("sidebar.newProfile")}
      size="sm"
      onClose={onClose}
      actions={
        <>
          <button className="btn btn--ghost" onClick={onClose}>{t("common.cancel")}</button>
          <button className="btn btn--primary" onClick={handleCreate} disabled={!name.trim()}>
            {t("common.confirm")}
          </button>
        </>
      }
    >
      <div className="form-group">
        <label>{t("sidebar.profileName")}</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          autoFocus
        />
      </div>
      {error && <p className="field-error">{error}</p>}
    </Dialog>
  );
}
