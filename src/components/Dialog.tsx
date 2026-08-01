import type { ReactNode } from "react";

interface Props {
  title?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  onClose?: () => void;
  size?: "sm" | "md" | "lg";
  center?: boolean;
}

export function Dialog({ title, children, actions, onClose, size = "md", center }: Props) {
  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className={`dialog dialog--${size}`} onClick={(e) => e.stopPropagation()}>
        {title && <h3 className="dialog-title">{title}</h3>}
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
