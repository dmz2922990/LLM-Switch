import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";

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
    <div style={{ padding: "16px 20px", textAlign: "center" }}>
      <p className="dialog-sub" style={{ marginBottom: 12 }}>
        {appVersion ? `v${appVersion}` : ""}
      </p>
      <p className="dialog-sub" style={{ marginBottom: 16, lineHeight: 1.6 }}>
        {t("about.description")}
      </p>
      <div className="about-tags">
        {(t("about.tags", { returnObjects: true }) as string[]).map((tag: string) => (
          <span key={tag} className="about-tag">{tag}</span>
        ))}
      </div>
      <a
        href="#"
        onClick={(e) => { e.preventDefault(); invoke("open_github"); }}
        className="about-link"
      >
        https://github.com/dmz2922990/LLM-Switch
      </a>

      <div className="about-divider">
        {updateStatus.state === "idle" && (
          <button className="btn btn--ghost btn--sm" onClick={onCheckUpdate}>
            {t("updater.checkUpdate")}
          </button>
        )}
        {updateStatus.state === "checking" && (
          <p className="dialog-sub">{t("updater.checking")}</p>
        )}
        {updateStatus.state === "upToDate" && (
          <p className="dialog-sub">{t("updater.upToDate")}</p>
        )}
        {updateStatus.state === "available" && (
          <div>
            <p style={{ fontSize: "var(--fs-base)", marginBottom: 8 }}>
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
          <div>
            <div className="progress">
              <div className="progress-fill" style={{ width: `${updateStatus.percent}%` }} />
            </div>
            <p className="dialog-sub">{t("updater.downloading", { percent: updateStatus.percent })}</p>
          </div>
        )}
        {updateStatus.state === "downloadComplete" && (
          <p className="dialog-sub">{t("updater.downloadComplete")}</p>
        )}
        {updateStatus.state === "failed" && (
          <p className="status-text status-text--err">{updateStatus.message}</p>
        )}
      </div>
    </div>
  );
}
