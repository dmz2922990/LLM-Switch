## Why

用户在使用不同 LLM 供应商时，无法直观了解当前 Token 配额使用情况。需要在 LLM-Switch 中添加 Token 用量展示功能，仅显示 **Token 5小时限额** 和 **Token 周限额** 的使用百分比及重置时间，帮助用户把握用量节奏。首期实现智普（BigModel），后续扩展至其他供应商。

## What Changes

- 新增用量查询后端服务：根据当前 profile 的 Base URL 和 Auth Token，自动识别供应商并调用其用量查询 API
- 新增供应商识别机制：通过 URL 关键字匹配（如 `bigmodel.cn` → 智普）确定当前供应商
- 新增前端用量展示 UI：在主界面添加用量标签页，仅展示 **Token 5小时限额**（unit=3）和 **Token 周限额**（unit=6）的使用百分比及重置时间
- 新增定时刷新机制：支持手动刷新和自动定时查询用量，鼠标悬停时显示下次刷新时间

## Capabilities

### New Capabilities
- `provider-usage`: 供应商 API 用量查询能力，包含供应商识别、用量数据获取、用量信息展示三个子能力

### Modified Capabilities
（无现有规格需要修改）

## Impact

- **后端 (Rust/Tauri)**: 新增 HTTP 客户端依赖（reqwest），新增 provider 识别模块和用量查询服务，新增 Tauri 命令
- **前端 (React/TS)**: 新增 UsagePanel 组件作为第四个标签页，新增用量相关类型定义和 i18n 字符串
- **API 调用**: 需要使用 profile 中已有的 `ANTHROPIC_BASE_URL` 和 `ANTHROPIC_AUTH_TOKEN` 发起 HTTP 请求到各供应商的用量查询端点
- **数据库**: 无需新增表或迁移，用量数据为实时查询，不做本地持久化
