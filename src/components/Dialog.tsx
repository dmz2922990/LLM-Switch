import { useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { IconX } from "./icons";

interface Props {
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  onClose?: () => void;
  size?: "sm" | "md" | "lg" | "settings";
  center?: boolean;
  hideHeader?: boolean;
}

export function Dialog({
  title,
  subtitle,
  children,
  actions,
  onClose,
  size = "md",
  center,
  hideHeader,
}: Props) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!onClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className={`dialog dialog--${size}`} onClick={(e) => e.stopPropagation()}>
        {!hideHeader && (title || onClose) && (
          <div className="dialog-header">
            <div className="dialog-header-text">
              {title && <h3 className="dialog-title">{title}</h3>}
              {subtitle && <p className="dialog-subtitle">{subtitle}</p>}
            </div>
            {onClose && (
              <button
                className="dialog-close"
                onClick={onClose}
                title={t("common.close")}
                aria-label={t("common.close")}
              >
                <IconX size={15} />
              </button>
            )}
          </div>
        )}
        <div className="dialog-body">{children}</div>
        {actions && (
          <div className={`dialog-actions${center ? " dialog-actions--center" : ""}`}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
