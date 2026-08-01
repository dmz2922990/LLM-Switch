import logoUrl from "../img/transparent-logo.png";
import { useTranslation } from "react-i18next";
import { changeLanguage, getCurrentLanguage } from "../i18n";
import { ThemeToggle } from "./ThemeToggle";

interface Props {
  onOpenGlobalSettings: () => void;
}

export function TopBar({ onOpenGlobalSettings }: Props) {
  const { t } = useTranslation();
  const currentLang = getCurrentLanguage();

  return (
    <div className="topbar">
      <div className="topbar-left">
        <img src={logoUrl} alt="" className="logo" />
        <span className="topbar-title">LLM Switch</span>
        <button className="btn btn--ghost btn--sm" onClick={onOpenGlobalSettings}>
          {t("common.settings")}
        </button>
      </div>
      <div className="topbar-right">
        <div className="topbar-group">
          <ThemeToggle />
          <select
            value={currentLang}
            onChange={(e) => changeLanguage(e.target.value)}
            className="lang-select"
          >
            <option value="zh-CN">中文</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>
    </div>
  );
}
