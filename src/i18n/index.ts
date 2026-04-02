import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zhCN from './locales/zh-CN.json';
import en from './locales/en.json';

const LANGUAGE_KEY = 'llm-switch-language';

const resources = {
  'zh-CN': { translation: zhCN },
  'en': { translation: en },
};

const savedLanguage = localStorage.getItem(LANGUAGE_KEY);

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLanguage || 'zh-CN',
    fallbackLng: 'zh-CN',
    interpolation: {
      escapeValue: false,
    },
  });

export const changeLanguage = (lng: string) => {
  i18n.changeLanguage(lng);
  localStorage.setItem(LANGUAGE_KEY, lng);

  // Update tray menu labels
  const t = i18n.getFixedT(lng);
  import("@tauri-apps/api/core").then(({ invoke }) => {
    invoke("update_tray_labels", {
      openWindow: t("tray.openWindow"),
      about: t("tray.about"),
      quit: t("tray.quit"),
    }).catch(() => {});
  });
};

export const getCurrentLanguage = () => i18n.language;

export default i18n;
