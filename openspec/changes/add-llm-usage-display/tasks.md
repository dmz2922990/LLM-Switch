## 1. 后端数据模型与依赖

- [x] 1.1 在 `Cargo.toml` 添加 `reqwest` 依赖（带 `json` feature）
- [x] 1.2 创建 `src-tauri/src/models/usage.rs`，定义 `QuotaInfo`（label, percentage, next_reset_time）和 `UsageInfo`（provider_name, quotas）结构体
- [x] 1.3 在 `src-tauri/src/models/mod.rs` 中注册 usage 模块

## 2. 后端供应商服务

- [x] 2.1 创建 `src-tauri/src/services/usage_service.rs`，定义 Provider 关键字匹配和 ProviderError 类型
- [x] 2.2 实现 PROVIDERS 常量匹配：通过 URL 关键字匹配供应商
- [x] 2.3 实现 `fetch_zhipu_usage`：keyword = `bigmodel.cn`，调用 `https://open.bigmodel.cn/api/monitor/usage/quota/limit`，解析 JSON 提取 unit=3 和 unit=6 的 percentage + nextResetTime
- [x] 2.4 实现 `get_usage(url: &str, token: &str) -> Result<Option<UsageInfo>, ProviderError>` 公共 async 函数，集成供应商匹配与查询流程
- [x] 2.5 在 `src-tauri/src/services/mod.rs` 中注册 usage_service 模块

## 3. 后端 Tauri 命令

- [x] 3.1 在 `src-tauri/src/commands/mod.rs` 添加 `get_usage_info` async 命令，接收 base_url 和 auth_token，调用 usage_service::get_usage，失败时返回 None
- [x] 3.2 在 `src-tauri/src/lib.rs` 注册 `get_usage_info` 命令

## 4. 前端类型与 API

- [x] 4.1 在 `src/types.ts` 添加 `QuotaInfo` 和 `UsageInfo` 接口
- [x] 4.2 在 `src/api.ts` 添加 `usage.get(baseUrl, authToken)` 调用

## 5. 前端用量展示组件

- [x] 5.1 创建 `src/components/UsageDisplay.tsx`：接收 profile props，根据 ANTHROPIC_BASE_URL 判断是否展示
- [x] 5.2 实现进度条渲染：两条进度条（5h Token / Weekly Token），颜色编码（0-70% 绿、70-90% 黄、90-100% 红）
- [x] 5.3 实现刷新按钮：点击手动触发 getUsageInfo
- [x] 5.4 实现自动定时刷新：useEffect + setInterval（5分钟间隔），profile 切换时清除并重新查询
- [x] 5.5 实现悬停 tooltip：显示下次刷新时间（如 "下次刷新: 14:32:00"）

## 6. 前端集成与样式

- [x] 6.1 在 `src/App.tsx` 标签栏右侧嵌入 UsageDisplay 组件，传入 selectedProfile
- [x] 6.2 在 `src/styles/index.css` 添加用量展示相关样式（进度条、颜色、tooltip、紧凑布局）
- [x] 6.3 在 `src/i18n/locales/zh-CN.json` 和 `en.json` 添加中英文 i18n 字符串

## 7. 验证

- [ ] 7.1 使用含 `bigmodel.cn` 的 Base URL profile 验证用量数据正确获取和展示
- [ ] 7.2 使用非智普 profile 验证用量区域隐藏
- [ ] 7.3 验证手动刷新、自动刷新、tooltip 显示正常
- [ ] 7.4 验证 profile 切换时用量数据正确清除和重新加载
