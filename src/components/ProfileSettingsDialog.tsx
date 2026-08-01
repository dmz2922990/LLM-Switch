import { useTranslation } from "react-i18next";
import type { Profile } from "../types";
import { Dialog } from "./Dialog";
import { SettingsEditor } from "./SettingsEditor";

interface Props {
  profile: Profile;
  onClose: () => void;
  onSaved: () => void;
}

export function ProfileSettingsDialog({ profile, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  return (
    <Dialog title={`${t("common.settings")} — ${profile.name}`} size="lg" onClose={onClose}>
      <SettingsEditor profile={profile} onSaved={onSaved} />
    </Dialog>
  );
}
