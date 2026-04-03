# LLM Switch

[中文文档](README_CN.md)

A desktop application for managing multiple Claude Code configuration profiles, with remote sync support via SSH/SFTP.

Built with **Tauri 2** + **React 19** + **Rust**.

## Features

- **Profile Management** — Create, rename, copy, and switch between multiple Claude Code (`~/.claude/settings.json`) configuration profiles
- **Quick Edit** — One-click editing of Base URL, Auth Token, and model names (Opus/Sonnet/Haiku)
- **JSON Editor** — Full Monaco editor with syntax highlighting, formatting, and validation
- **Remote Sync** — Push configuration to remote hosts via SSH/SFTP
- **Host Manager** — Manage remote hosts with connection testing
- **AES-256-GCM Encryption** — Passwords are encrypted at rest
- **Multi-language** — Chinese / English UI with one-click switching
- **System Tray** — Minimize to tray

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 8 |
| Backend | Tauri 2 (Rust) |
| Database | SQLite (sqlx) |
| SSH | ssh2 crate |
| Encryption | aes-gcm (AES-256-GCM) |
| Editor | Monaco Editor |

## Installation

Download the latest release from [GitHub Releases](https://github.com/dmz2922990/LLM-Switch/releases).

### macOS Notice

Since the app is not signed with an Apple Developer certificate, macOS Gatekeeper may block it. Run the following command after installing:

```bash
xattr -cr /Applications/LLM\ Switch.app
```

## Getting Started

### Prerequisites

- Node.js >= 18
- Rust >= 1.70
- Platform-specific dependencies for [Tauri 2](https://tauri.app/start/prerequisites/)

### Install & Run

```bash
# Install dependencies
npm install

# Start dev server
npm run tauri:dev

# Build for production
npm run tauri:build
```

## Project Structure

```
LLM-switch/
├── src/                          # Frontend (React)
│   ├── App.tsx                   # Main app with tab routing
│   ├── api.ts                    # Tauri invoke API wrapper
│   ├── types.ts                  # TypeScript type definitions
│   ├── i18n/                     # Internationalization
│   │   ├── index.ts
│   │   └── locales/
│   │       ├── zh-CN.json
│   │       └── en.json
│   ├── components/
│   │   ├── ProfileSidebar.tsx    # Profile list & management
│   │   ├── SettingsEditor.tsx    # JSON editor with quick settings
│   │   ├── HostManager.tsx       # Remote host CRUD
│   │   └── SyncPanel.tsx         # Sync to remote hosts
│   └── styles/
│       └── index.css
├── src-tauri/                    # Backend (Rust)
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── migrations/
│   │   └── 001_init.sql
│   └── src/
│       ├── main.rs
│       ├── lib.rs
│       ├── commands/mod.rs        # Tauri commands (17 APIs)
│       ├── db/mod.rs              # SQLite connection pool
│       ├── models/                # Data models
│       ├── services/
│       │   ├── crypto.rs          # AES-256-GCM encrypt/decrypt
│       │   ├── profile_service.rs # Profile CRUD
│       │   ├── host_service.rs    # Host CRUD + password encrypt
│       │   ├── sync_service.rs    # SSH/SFTP sync
│       │   └── sync_history_service.rs
│       └── tray.rs               # System tray
└── package.json
```

## License

MIT
