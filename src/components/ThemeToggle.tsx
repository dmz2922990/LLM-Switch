import { useTranslation } from "react-i18next";
import { toggleTheme, useTheme } from "../theme";
import { IconMoon, IconSun } from "./icons";

export function ThemeToggle() {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <button
      className="icon-btn"
      onClick={toggleTheme}
      title={t("common.themeToggle")}
      aria-label={t("common.themeToggle")}
    >
      {theme === "dark" ? <IconMoon size={14} /> : <IconSun size={14} />}
    </button>
  );
}
