## Why

管理 Claude Code 的 `settings.json` 配置文件在多个 LLM API 提供商（如 Anthropic、OpenAI、自定义端点）之间切换时，需要手动编辑 JSON 并逐台复制到远程机器，既繁琐又容易出错。需要一个专用工具来简化配置切换、编辑和远程同步操作。

## What Changes

- 引入一个 CLI 工具，用于管理多个 Claude Code `settings.json` 配置档案（profile）
- 支持创建、切换、重命名、复制和删除 API 配置档案
- 提供工具内置的 settings.json 内容编辑功能
- 支持通过 SSH/SCP 一键同步配置档案到远程主机
- 提供远程主机连接管理功能，支持安全存储凭据
- 支持列出和预览当前活跃的配置档案

## Capabilities

### New Capabilities

- `settings-profile`: 配置档案管理 — 创建、列出、切换、重命名、复制、删除配置档案，以及显示当前活跃档案
- `settings-editor`: 配置编辑 — 通过交互式或 CLI 方式查看和修改某个档案的 settings.json 内容
- `remote-sync`: 远程同步 — 通过 SSH/SCP 将配置档案推送到一台或多台远程主机，支持一键同步
- `host-connection`: 主机连接管理 — 添加、列出、删除远程主机条目，管理连接信息（地址、端口、用户名、加密存储的密码/密钥）

### Modified Capabilities

（无 — 这是一个全新项目）

## Impact

- **新项目**: 这是一个独立的 CLI 工具，不影响现有代码
- **依赖**: 需要 SSH/SCP 库（如 Node.js 的 `ssh2` 或 Python 的 `paramiko`），以及本地存储层用于管理档案和凭据
- **安全**: 凭据存储必须使用加密，密码绝不能明文存储
- **平台**: 主要目标平台为 macOS/Linux，Windows 支持为可选项
