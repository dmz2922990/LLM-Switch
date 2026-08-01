# LLM Switch

[中文文档](README_CN.md)

> **Manage multiple Claude Code profiles in one clean, instrument-style dashboard.**
> Switch configs, monitor usage, and sync to remote hosts — all in a fast native desktop app.

**LLM Switch** is a desktop application for developers who run multiple Claude Code configuration profiles. Instead of editing `~/.claude/settings.json` by hand, you get a visual dashboard to create, switch, monitor, and sync your configs — with native performance and a polished dark/light UI.

![Light mode](https://github.com/user-attachments/assets/bf997cb7-d797-4005-a671-1100291ce1f3)
*Light theme — profile dashboard*

![Dark mode](https://github.com/user-attachments/assets/a64363d9-8296-486a-8dbd-d2a0f4c66afb)
*Dark theme — instrument-style dashboard*

---

## ✨ Highlights

- **🃏 Profile Card Dashboard** — A two-column grid of profile cards. Hover to reveal actions: switch, sync, settings, copy, rename, delete. Click to select.
- **🌗 Dark / Light Themes** — One-click toggle that follows your system preference, with the built-in code editor syncing automatically.
- **⚡ Usage at a Glance** — Quota bars (5h / Weekly) with reset times right on each card. Balance display for DeepSeek accounts.
- **🖥️ Remote Sync** — Push a profile to any number of hosts over SSH/SFTP with one click. Granular sync scope — choose exactly which config keys to transfer.
- **🔐 Secure by Default** — Passwords are encrypted at rest with AES-256-GCM.

## 🚀 Installation

Download the latest release for your platform from [GitHub Releases](https://github.com/dmz2922990/LLM-Switch/releases):

| Platform | File |
|----------|------|
| macOS (Apple Silicon) | `LLM.Switch_*_aarch64.dmg` |
| macOS (Intel) | `LLM.Switch_*_x64.dmg` |
| Windows | `LLM.Switch_*_x64-setup.exe` |
| Linux | `LLM.Switch_*_amd64.AppImage` |

> **macOS notice:** The app is not signed with an Apple Developer certificate, so Gatekeeper may block it. After installing, run:
>
> ```bash
> xattr -cr /Applications/LLM\ Switch.app
> ```

## 🧭 Features

### Profile Management
- **Multiple profiles** — each with its own `~/.claude/settings.json`
- **Quick switch** — activate any profile as your current Claude Code config
- **Copy / Rename / Delete** with confirmation dialogs
- **Drag-free ordering** via the ▲▼ arrows on each card

### Config Editing
- **Quick settings** — edit Base URL, Auth Token, and model names (Opus / Sonnet / Haiku) without touching JSON
- **Full JSON editor** — Monaco-based with syntax highlighting, formatting, and validation
- **Ctrl/Cmd+S** to save, with visual feedback

### Usage Monitoring
- **Claude / Kimi / ZhiPu quotas** — 5h and Weekly usage bars with reset times
- **DeepSeek balance** — account balance shown directly on the card
- Auto-refresh every 5 minutes, manual refresh on demand

### Remote Sync
- **SSH/SFTP push** to one or multiple hosts at once
- **Sync scope** — choose which top-level keys to transfer (fields missing on a profile are safely ignored)
- **Host manager** — store hosts with encrypted credentials, test connections
- **Sync history** — review past syncs with source/target hash comparison

### Global Settings
- Three tabs: **Hosts**, **Remote Sync**, **About**
- Check for updates from inside the app

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 8 |
| Backend | Tauri 2 (Rust) |
| Database | SQLite (sqlx) |
| SSH | ssh2 crate |
| Encryption | aes-gcm (AES-256-GCM) |
| Editor | Monaco Editor |

## 🧑‍💻 Development

### Prerequisites

- Node.js >= 18
- Rust >= 1.70
- Platform-specific dependencies for [Tauri 2](https://tauri.app/start/prerequisites/)

### Commands

```bash
# Install dependencies
npm install

# Start dev server
npm run tauri:dev

# Build for production
npm run tauri:build
```

## 📄 License

MIT
