import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import logoUrl from "../img/transparent-logo.png";
import { IconExternalLink } from "./icons";

export interface UpdateStatus {
  state: "idle" | "checking" | "upToDate" | "available" | "downloading" | "downloadComplete" | "failed";
  version?: string;
  percent?: number;
  message?: string;
}

interface Props {
  updateStatus: UpdateStatus;
  appVersion: string;
  onCheckUpdate: () => void;
  onDownloadInstall: () => void;
  onGoToDownload: () => void;
}

export function AboutPanel({ updateStatus, appVersion, onCheckUpdate, onDownloadInstall, onGoToDownload }: Props) {
  const { t } = useTranslation();

  return (
    <div className="about-panel">
      <div className="about-hero">
        <img src={logoUrl} alt="" className="about-logo" />
        <h4 className="about-name">LLM Switch</h4>
        {appVersion && <span className="about-version">v{appVersion}</span>}
        <p className="about-desc">{t("about.description")}</p>
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); invoke("open_github"); }}
          className="about-link-btn"
        >
          <span>GitHub · dmz2922990/LLM-Switch</span>
          <IconExternalLink size={12} />
        </a>
      </div>

      <div className="about-update-card">
        {updateStatus.state === "idle" && (
          <button className="btn btn--ghost btn--sm" onClick={onCheckUpdate}>
            {t("updater.checkUpdate")}
          </button>
        )}
        {updateStatus.state === "checking" && (
          <p className="dialog-sub">{t("updater.checking")}</p>
        )}
        {updateStatus.state === "upToDate" && (
          <p className="status-text status-text--ok">{t("updater.upToDate")}</p>
        )}
        {updateStatus.state === "available" && (
          <div>
            <p style={{ fontSize: "var(--fs-base)", marginBottom: 10 }}>
              {t("updater.newVersion", { version: updateStatus.version })}
            </p>
            <div className="action-row" style={{ justifyContent: "center" }}>
              <button className="btn btn--primary btn--sm" onClick={onDownloadInstall}>
                {t("updater.downloadAndRestart")}
              </button>
              <button className="btn btn--ghost btn--sm" onClick={onGoToDownload}>
                {t("updater.goToDownload")}
              </button>
            </div>
          </div>
        )}
        {updateStatus.state === "downloading" && (
          <div style={{ width: "100%", maxWidth: 280, margin: "0 auto" }}>
            <div className="progress">
              <div className="progress-fill" style={{ width: `${updateStatus.percent}%` }} />
            </div>
            <p className="dialog-sub">{t("updater.downloading", { percent: updateStatus.percent })}</p>
          </div>
        )}
        {updateStatus.state === "downloadComplete" && (
          <p className="status-text status-text--ok">{t("updater.downloadComplete")}</p>
        )}
        {updateStatus.state === "failed" && (
          <p className="status-text status-text--err">{updateStatus.message}</p>
        )}
      </div>
    </div>
  );
}
