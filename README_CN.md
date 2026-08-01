# LLM Switch

[English](README.md)

> **在一个简洁的「仪表盘」式界面中管理多个 Claude Code 配置。**
> 切换配置、监控用量、远程同步——一个原生桌面应用全部搞定。

**LLM Switch** 是一款面向开发者的桌面应用，用于管理多个 Claude Code 配置文件。告别手动编辑 `~/.claude/settings.json`——通过可视化卡片面板，即可创建、切换、监控和同步你的配置，兼具原生性能与精致的暗/亮双主题界面。

![亮色模式](https://github.com/user-attachments/assets/bf997cb7-d797-4005-a671-1100291ce1f3)
*亮色主题 — 档案仪表盘*

![暗色模式](https://github.com/user-attachments/assets/a64363d9-8296-486a-8dbd-d2a0f4c66afb)
*暗色主题 — 仪器风仪表盘*

---

## ✨ 核心亮点

- **🃏 卡片网格仪表盘** — 两列响应式档案卡片，悬停显现操作：切换、同步、设置、复制、重命名、删除；点击卡片即选中。
- **🌗 暗/亮双主题** — 一键切换并跟随系统偏好，内置代码编辑器同步换肤。
- **⚡ 用量一览** — 卡片直接展示 5h / Weekly 配额进度条与重置时间；DeepSeek 账户余额直观显示。
- **🖥️ 远程同步** — 一键将档案通过 SSH/SFTP 推送到任意数量的主机；可精细选择同步哪些配置字段。
- **🔐 安全默认** — 密码使用 AES-256-GCM 静态加密存储。

## 🚀 安装

从 [GitHub Releases](https://github.com/dmz2922990/LLM-Switch/releases) 下载对应平台的最新版本：

| 平台 | 文件 |
|------|------|
| macOS (Apple Silicon) | `LLM.Switch_*_aarch64.dmg` |
| macOS (Intel) | `LLM.Switch_*_x64.dmg` |
| Windows | `LLM.Switch_*_x64-setup.exe` |
| Linux | `LLM.Switch_*_amd64.AppImage` |

> **macOS 注意事项：** 应用未经过 Apple Developer 签名，macOS Gatekeeper 可能会阻止运行。安装后请执行：
>
> ```bash
> xattr -cr /Applications/LLM\ Switch.app
> ```

## 🧭 功能详解

### 配置管理
- **多档案** — 每个档案对应一份独立的 `~/.claude/settings.json`
- **一键切换** — 激活任一档案作为当前 Claude Code 使用的配置
- **复制 / 重命名 / 删除** — 均带确认弹窗，操作安全
- **排序调整** — 卡片右上角 ▲▼ 箭头调整顺序

### 配置编辑
- **快速设置** — 无需触碰 JSON，直接修改 Base URL、Auth Token 与模型名（Opus / Sonnet / Haiku）
- **完整 JSON 编辑器** — 基于 Monaco，支持语法高亮、格式化和校验
- **Ctrl/Cmd+S 保存** — 带即时视觉反馈

### 用量监控
- **Claude / Kimi / 智谱配额** — 5h 与 Weekly 用量条，含重置时间
- **DeepSeek 余额** — 卡片直接显示账户余额
- 每 5 分钟自动刷新，也可手动刷新

### 远程同步
- **SSH/SFTP 推送** — 同时同步到一台或多台主机
- **同步范围** — 自定义选择要传输的顶层配置字段（某档案缺失的字段会被安全忽略）
- **主机管理** — 加密存储主机凭据，支持连接测试
- **同步历史** — 查看历史同步记录，含源/目标哈希对比

### 全局设置
- 三个标签页：**主机管理**、**远程同步**、**关于**
- 应用内直接检查更新

## 🛠 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19, TypeScript, Vite 8 |
| 后端 | Tauri 2 (Rust) |
| 数据库 | SQLite (sqlx) |
| SSH | ssh2 crate |
| 加密 | aes-gcm (AES-256-GCM) |
| 编辑器 | Monaco Editor |

## 🧑‍💻 开发

### 环境要求

- Node.js >= 18
- Rust >= 1.70
- [Tauri 2](https://tauri.app/start/prerequisites/) 平台相关依赖

### 常用命令

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run tauri:dev

# 生产构建
npm run tauri:build
```

## 📄 许可证

MIT
