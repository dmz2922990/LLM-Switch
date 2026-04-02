## Context

用户拥有多个 LLM API 提供商的 Claude Code 配置（`settings.json`），需要在不同配置之间快速切换、编辑，并同步到远程主机。当前手动管理这些文件既低效又容易出错。

本项目是一个跨平台桌面应用（Linux / macOS / Windows），使用 Tauri 框架（Rust 后端 + Web 前端）构建。

## Goals / Non-Goals

**Goals:**

- 提供直观的桌面 GUI，管理多个 Claude Code settings.json 配置档案
- 支持配置档案的增删改查、复制、一键切换
- 内置 JSON 编辑器，直接修改配置内容
- 管理远程主机连接信息，支持一键同步配置到远程主机
- 凭据安全加密存储
- 跨平台支持 Linux、macOS、Windows

**Non-Goals:**

- 不支持 Claude Code 本身的安装或版本管理
- 不提供 LLM API 的调用或代理功能
- 不支持移动端
- 不做配置文件的版本管理（Git 集成）

## Decisions

### D1: 应用框架 — Tauri v2 + React + TypeScript

**选择**: Tauri v2 作为桌面应用框架，React + TypeScript 构建前端 UI。

**替代方案**:
- Electron: 包体过大（100MB+），内存占用高
- Flutter Desktop: Dart 生态相对小众，Web 内容渲染不如 Web 前端灵活

**理由**: Tauri 包体小（~5-10MB），Rust 后端性能优秀且安全，前端用 React 生态成熟。Tauri v2 支持多窗口和系统托盘，适合工具类应用。

### D2: 数据存储 — 本地 SQLite + 加密凭据

**选择**: 使用 SQLite 存储配置档案和主机连接信息，密码字段使用 AES-256-GCM 加密。

**数据模型**:
- `profiles` 表: id, name, settings_json, is_active, created_at, updated_at
- `hosts` 表: id, name, address, port, username, encrypted_password, remote_path, created_at, updated_at
- `sync_history` 表: id, profile_id, host_id, synced_at, status

**替代方案**:
- JSON 文件存储: 不支持并发、查询能力弱
- 操作系统 Keychain: 跨平台兼容性复杂

**理由**: SQLite 是 Tauri 生态的天然选择（通过 `tauri-plugin-sql`），轻量且可靠。加密密钥由操作系统密钥管理器保管（macOS Keychain / Linux Secret Service / Windows Credential Manager），通过 `tauri-plugin-store` 或系统 API 获取。

### D3: SSH/SCP 同步 — Rust ssh2 crate

**选择**: 使用 Rust 的 `ssh2` crate 实现 SSH/SCP 文件传输。

**理由**: 纯 Rust 实现，与 Tauri 后端天然集成，避免依赖系统 OpenSSH。支持密码和密钥两种认证方式。

### D4: JSON 编辑器 — Monaco Editor

**选择**: 前端集成 Monaco Editor（VS Code 同款编辑器组件）。

**理由**: 原生 JSON 语法高亮、校验、自动补全，用户体验好。通过 `@monaco-editor/react` 轻量集成。

### D5: 应用架构

```
┌──────────────────────────────────────────┐
│              React Frontend               │
│  ┌─────────┐ ┌─────────┐ ┌────────────┐ │
│  │Profile   │ │Settings │ │Remote Sync │ │
│  │Manager   │ │Editor   │ │Panel       │ │
│  └────┬─────┘ └────┬────┘ └─────┬──────┘ │
│       └────────────┼────────────┘        │
│              Tauri IPC Bridge             │
├──────────────────────────────────────────┤
│              Rust Backend                 │
│  ┌─────────┐ ┌─────────┐ ┌────────────┐ │
│  │Profile   │ │JSON     │ │SSH/Sync    │ │
│  │Service   │ │Service  │ │Service     │ │
│  └────┬─────┘ └────┬────┘ └─────┬──────┘ │
│       └────────────┼────────────┘        │
│  ┌─────────┐ ┌─────────┐                 │
│  │SQLite DB │ │Crypto   │                 │
│  │(via sqlx)│ │(AES-256)│                 │
│  └─────────┘ └─────────┘                 │
└──────────────────────────────────────────┘
```

前端通过 Tauri IPC 调用 Rust 后端命令，后端负责所有文件操作、数据库访问和网络通信。

### D6: 系统托盘与后台运行

**选择**: 应用启动后驻留系统托盘，支持快速切换活跃配置。

**理由**: 配置切换是高频操作，托盘图标可提供右键菜单直接切换，无需每次打开主窗口。

## Risks / Trade-offs

- **[Tauri v2 稳定性]** → Tauri v2 已正式发布，但部分插件生态仍在完善。优先使用核心插件，减少第三方依赖。
- **[跨平台 SSH 兼容性]** → `ssh2` crate 在 Windows 上依赖 OpenSSL，可能增加构建复杂度。备选方案：通过 `russh` 纯 Rust SSH 实现替代。
- **[凭据安全]** → 加密密钥存储在操作系统密钥管理器中，若用户操作系统不支持（如无桌面环境的 Linux），需提供文件加密回退方案。
- **[settings.json 路径定位]** → Claude Code 的 settings.json 路径因平台不同而异（`~/.claude/settings.json`），需通过 Tauri 的平台 API 正确定位。

## Open Questions

- 是否需要支持 Claude Code 之外的其他 AI 工具的配置管理？（扩展性预留）
- 是否需要配置档案的导入/导出功能？（JSON 文件批量导入导出）
- 同步失败时是否需要自动重试机制？
