# Lessons Learned

## 2026-08-26: Windows 加载失败连修 4 版未中根因（v2.1.2–v2.1.5）

**错误**：用户报告"Profile 加载失败"，我连续 4 轮聚焦启动时序竞态（block_on / try_state / db-ready 事件 / 轮询重试），均未命中。真正根因是 migration 007 的 UPDATE 引用了 008 才创建的 `time1_start`/`time1_end` 列，SQL prepare 阶段即失败，`init_pool` 永远 Err，pool 永不 managed。

**为什么漏掉**：
1. 看到 migration 文件时只检查了"幂等性"（CREATE IF NOT EXISTS / INSERT OR IGNORE / duplicate 容错），没有逐句验证**跨文件列依赖顺序**。
2. 没有实际复现启动路径——用 sqlite3 模拟老库跑一遍 migration 5 分钟就能复现，却拖到第 5 版。
3. 症状（"加载失败/重试"）与时序竞态表面吻合，形成了错误的问题框架。

**规律**：
- "初始化永远失败"类问题，先怀疑**确定性失败路径**（SQL/配置/权限），再怀疑竞态。竞态是概率性的，用户说"一直失败"就该排除竞态。
- 排查 migration bug 时，必须用 sqlite3 在真实老库结构上逐个执行验证，重点检查语句引用的列/表是否在**该语句执行时点**已存在。
- 连续两轮修复未解决问题时，立即停下重新审视问题框架，而非继续在同一框架内加补丁。

**How to apply**：任何"启动即失败/永远失败"的 bug，先复现完整启动链（本地模拟数据目录 + 逐步执行 init），确认每步成功，再谈其它。
