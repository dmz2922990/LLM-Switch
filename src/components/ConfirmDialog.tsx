import { useTranslation } from "react-i18next";
import { Dialog } from "./Dialog";

interface Props {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: "primary" | "danger";
  confirmLabel?: string;
  title?: string;
}

export function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
  variant = "primary",
  confirmLabel,
  title,
}: Props) {
  const { t } = useTranslation();
  return (
    <Dialog
      title={title ?? t("common.confirm")}
      onClose={onCancel}
      size="sm"
      actions={
        <>
          <button className="btn btn--ghost btn--sm" onClick={onCancel}>
            {t("common.cancel")}
          </button>
          <button className={`btn btn--${variant} btn--sm`} onClick={onConfirm}>
            {confirmLabel ?? t("common.confirm")}
          </button>
        </>
      }
    >
      <p className="confirm-message">{message}</p>
    </Dialog>
  );
}
