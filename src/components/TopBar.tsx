import logoUrl from "../img/transparent-logo.png";
import { useTranslation } from "react-i18next";
import { changeLanguage, getCurrentLanguage } from "../i18n";
import { ThemeToggle } from "./ThemeToggle";
import { IconGlobe, IconPlus, IconSettings } from "./icons";

interface Props {
  activeProfileName?: string | null;
  onNewProfile: () => void;
  onOpenGlobalSettings: () => void;
}

export function TopBar({ activeProfileName, onNewProfile, onOpenGlobalSettings }: Props) {
  const { t } = useTranslation();
  const currentLang = getCurrentLanguage();
  const isZh = currentLang.startsWith("zh");

  const toggleLanguage = () => {
    changeLanguage(isZh ? "en" : "zh-CN");
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="topbar-brand">
          <img src={logoUrl} alt="" className="logo" />
          <span className="topbar-title">LLM Switch</span>
        </div>
        {activeProfileName && (
          <div className="topbar-active-pill" title={`${t("sidebar.active")}: ${activeProfileName}`}>
            <span className="status-dot status-dot--active" />
            <span className="topbar-active-name">{activeProfileName}</span>
          </div>
        )}
      </div>

      <div className="topbar-right">
        <button className="btn btn--primary btn--sm topbar-cta" onClick={onNewProfile}>
          <IconPlus size={14} />
          <span>{t("sidebar.newProfile")}</span>
        </button>

        <button className="btn btn--ghost btn--sm topbar-btn" onClick={onOpenGlobalSettings}>
          <IconSettings size={14} />
          <span>{t("common.settings")}</span>
        </button>

        <div className="topbar-divider" />

        <div className="topbar-utils">
          <ThemeToggle />
          <button
            className="topbar-lang-btn"
            onClick={toggleLanguage}
            title={t("sidebar.language")}
            aria-label={t("sidebar.language")}
          >
            <IconGlobe size={13} />
            <span>{isZh ? "中文" : "EN"}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
