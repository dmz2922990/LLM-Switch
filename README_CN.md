# LLM Switch

[English](README.md)

一款用于管理多个 Claude Code 配置文件的桌面应用，支持通过 SSH/SFTP 远程同步。

基于 **Tauri 2** + **React 19** + **Rust** 构建。

## 功能特性

- **配置管理** — 创建、重命名、复制和切换多个 Claude Code（`~/.claude/settings.json`）配置文件
- **快速编辑** — 一键修改 Base URL、Auth Token 和模型名称（Opus/Sonnet/Haiku）
- **JSON 编辑器** — 基于 Monaco 的完整编辑器，支持语法高亮、格式化和校验
- **远程同步** — 通过 SSH/SFTP 将配置推送到远程主机
- **主机管理** — 管理远程主机，支持连接测试
- **AES-256-GCM 加密** — 密码静态加密存储
- **多语言** — 中文/英文界面一键切换
- **系统托盘** — 支持最小化到托盘

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19, TypeScript, Vite 8 |
| 后端 | Tauri 2 (Rust) |
| 数据库 | SQLite (sqlx) |
| SSH | ssh2 crate |
| 加密 | aes-gcm (AES-256-GCM) |
| 编辑器 | Monaco Editor |

## 安装

从 [GitHub Releases](https://github.com/dmz2922990/LLM-Switch/releases) 下载最新版本。

### macOS 注意事项

由于应用未经过 Apple Developer 签名，macOS 可能会阻止运行。安装后请执行以下命令：

```bash
xattr -cr /Applications/LLM\ Switch.app
```

## 快速开始

### 环境要求

- Node.js >= 18
- Rust >= 1.70
- [Tauri 2](https://tauri.app/start/prerequisites/) 平台相关依赖

### 安装与运行

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run tauri:dev

# 生产构建
npm run tauri:build
```

## 项目结构

```
LLM-switch/
├── src/                          # 前端 (React)
│   ├── App.tsx                   # 主应用，Tab 路由
│   ├── api.ts                    # Tauri invoke API 封装
│   ├── types.ts                  # TypeScript 类型定义
│   ├── i18n/                     # 国际化
│   │   ├── index.ts
│   │   └── locales/
│   │       ├── zh-CN.json
│   │       └── en.json
│   ├── components/
│   │   ├── ProfileSidebar.tsx    # 配置列表与管理
│   │   ├── SettingsEditor.tsx    # JSON 编辑器 + 快速设置
│   │   ├── HostManager.tsx       # 远程主机增删改查
│   │   └── SyncPanel.tsx         # 同步到远程主机
│   └── styles/
│       └── index.css
├── src-tauri/                    # 后端 (Rust)
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── migrations/
│   │   └── 001_init.sql
│   └── src/
│       ├── main.rs
│       ├── lib.rs
│       ├── commands/mod.rs        # Tauri 命令 (17 个 API)
│       ├── db/mod.rs              # SQLite 连接池
│       ├── models/                # 数据模型
│       ├── services/
│       │   ├── crypto.rs          # AES-256-GCM 加解密
│       │   ├── profile_service.rs # 配置文件增删改查
│       │   ├── host_service.rs    # 主机增删改查 + 密码加密
│       │   ├── sync_service.rs    # SSH/SFTP 同步
│       │   └── sync_history_service.rs
│       └── tray.rs               # 系统托盘
└── package.json
```

## 许可证

MIT
