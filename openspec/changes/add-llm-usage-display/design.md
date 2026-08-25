## Context

LLM-Switch 是一个 Tauri v2 桌面应用，管理 Claude Code 的多配置文件（profiles）。每个 profile 存储 `ANTHROPIC_BASE_URL` 和 `ANTHROPIC_AUTH_TOKEN` 等 env 变量。当前没有任何 API 用量查询或展示功能。

后端使用 Rust，前端使用 React + TypeScript。现有的 Tauri 命令模式为：`commands/mod.rs` 定义 `#[tauri::command]` 函数，调用 `services/` 下的服务模块。前端通过 `api.ts` 的 `invoke` 封装调用后端。

## Goals / Non-Goals

**Goals:**
- 在主界面标签栏旁展示 Token 用量摘要，不新增独立标签页
- 根据 profile 的 Base URL 自动识别供应商（首期仅 ZhiPu）
- 仅展示 Token 5小时限额和周限额的百分比进度条
- 支持手动刷新和自动定时刷新，悬停显示下次刷新时间
- 后端设计可扩展，便于后续添加新供应商

**Non-Goals:**
- 不展示 MCP 用量、详细模型用量明细、账户级别等额外信息
- 不做用量数据本地持久化
- 不添加独立标签页，用量信息作为内嵌摘要展示

## Decisions

### D1: 用量展示位置 — header 区域内嵌，不新增标签页

用量信息放在标签栏右侧，作为紧凑的摘要卡片展示，包含两条进度条和刷新按钮。

**选择理由**: 用量是高频查看信息，应始终可见而非隐藏在标签页中。内嵌在 header 可以在任何标签页下都看到用量状态，减少用户操作步骤。

**备选方案**: 新增第四个"Usage"标签页 → 需要切换才能查看，不符合高频查看需求。

### D2: 后端 HTTP 客户端 — 使用 reqwest

在 `Cargo.toml` 添加 `reqwest` 依赖（带 `json` feature），用于调用供应商用量 API。

**选择理由**: reqwest 是 Rust 生态最成熟的 HTTP 客户端，与 tokio 运行时天然集成（项目已依赖 tokio）。

**备选方案**: 使用 Tauri 内置的 HTTP 插件 → 引入额外插件依赖，灵活性不如直接使用 reqwest。

### D3: 供应商识别 — 后端 trait + 关键字匹配

定义 `Provider` trait，每个供应商实现该 trait。通过 URL 关键字匹配确定供应商：

```rust
trait Provider: Send + Sync {
    fn keyword(&self) -> &str;
    fn fetch_usage(&self, token: &str) -> Result<UsageData, ProviderError>;
}
```

`ProviderRegistry` 持有所有供应商实例，根据 URL 返回匹配的 Provider。

**选择理由**: trait 模式让新增供应商只需实现 trait 并注册，无需修改已有代码。符合开闭原则。

### D4: 数据流 — 前端轮询 + Tauri 命令

- 新增 Tauri 命令 `get_usage_info(base_url: String, auth_token: String) -> Result<Option<UsageInfo>, String>`
- 前端用 `setInterval`（5分钟间隔）定时调用该命令
- 命令内部：识别供应商 → 调用供应商 API → 解析返回数据 → 返回 `UsageInfo` 结构体

**选择理由**: 简单直接，利用前端已有的 React 状态管理模式。无需引入 WebSocket 或 Tauri 事件机制。

### D5: 数据模型

```rust
struct UsageInfo {
    provider_name: String,
    quotas: Vec<QuotaInfo>,
}

struct QuotaInfo {
    label: String,        // "5h Token" / "Weekly Token"
    percentage: f64,      // 0-100
    next_reset_time: i64, // unix timestamp ms
}
```

前端对应 TypeScript 类型：

```typescript
interface UsageInfo {
  providerName: string;
  quotas: QuotaInfo[];
}

interface QuotaInfo {
  label: string;
  percentage: number;
  nextResetTime: number;
}
```

### D6: 文件组织

**后端新增文件**:
- `src-tauri/src/services/usage_service.rs` — Provider trait、ProviderRegistry、各供应商实现、Tauri 命令调用入口
- `src-tauri/src/models/usage.rs` — UsageInfo / QuotaInfo 数据结构

**前端新增/修改文件**:
- `src/components/UsageDisplay.tsx` — 用量展示组件（进度条 + 刷新 + tooltip）
- `src/types.ts` — 添加 UsageInfo / QuotaInfo 类型
- `src/api.ts` — 添加 `getUsageInfo` 调用
- `src/App.tsx` — 在 header 区域嵌入 UsageDisplay 组件
- `src/i18n/index.ts` — 添加用量相关 i18n 字符串
- `src/styles/index.css` — 添加用量展示样式

## Risks / Trade-offs

- **[API 限流风险]** → 频繁调用供应商 API 可能触发限流。缓解：5分钟刷新间隔，且仅在供应商匹配时才请求。
- **[网络超时]** → 查询 API 可能因网络问题超时。缓解：设置 5 秒请求超时，静默失败不阻塞 UI。
- **[reqwest 编译体积]** → 新增 reqwest 依赖会增加二进制体积。缓解：reqwest 是轻量依赖，影响有限。
