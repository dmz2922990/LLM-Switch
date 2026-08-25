# Claude Code Workflow 工具使用指南

> **注意**：Workflow 工具是 Claude Code 的内部功能，Anthropic 尚未公开官方文档。本指南基于 Claude Code 运行时注入的工具定义整理。

---

## 1. 概述

Workflow 是一个多智能体编排工具，使用类 JavaScript DSL 实现确定性控制流（循环、条件、扇出）。支持并行派生子智能体、阶段管理和结构化的复杂多步骤任务。

### 适用场景

- 需要确定性控制流的多步骤编排
- 需要并行子智能体工作的任务（如扫描多个文件、多维度审查）
- 单个上下文窗口无法承载的大规模操作（迁移、审计、广域扫描）

### 不适用场景

- 简单任务 — 直接使用 `Agent` 工具
- 用户未明确选择多智能体编排的任务
- 不需要 `Workflow` 级别规模的任务

---

## 2. 脚本结构

每个脚本**必须**以 `meta` 导出开头（纯字面量，不允许计算值）：

```javascript
export const meta = {
  name: 'my-workflow',           // 必填：工作流标识符
  description: '一句话描述',      // 必填
  phases: [                       // 可选：进度显示分组
    { title: 'Scan', detail: '扫描问题' },
    { title: 'Fix', detail: '修复问题' },
  ],
}

// 脚本主体从这里开始
phase('Scan')
const results = await agent('在代码库中查找问题')
```

### `meta` 字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| `name` | 是 | 工作流标识符 |
| `description` | 是 | 一句话描述，显示在权限确认对话框中 |
| `phases` | 否 | `{ title, detail, model? }` 数组，用于进度显示分组 |
| `whenToUse` | 否 | 显示在工作流列表中的使用说明 |

---

## 3. 核心 API

### `agent(prompt, opts?)`

派生一个子智能体并返回其结果。

```javascript
// 基本用法 — 返回字符串
const result = await agent('查找代码库中所有 TODO 注释')

// 带结构化输出 schema
const bugs = await agent('查找 bug', {
  schema: {
    type: 'object',
    properties: {
      findings: { type: 'array', items: { type: 'object' } }
    }
  }
})

// 带选项
const result = await agent('审查代码', {
  label: 'review:auth',        // 显示标签覆盖
  phase: 'Review',             // 分配到进度分组
  model: 'haiku',              // 模型覆盖（sonnet, opus, haiku）
  isolation: 'worktree',       // 在隔离的 git worktree 中运行（有额外开销！）
  agentType: 'Explore',        // 使用自定义子智能体类型
})
```

**选项说明：**

| 选项 | 类型 | 说明 |
|------|------|------|
| `label` | string | 显示标签覆盖 |
| `phase` | string | 分配到进度分组（必须与 `meta.phases` 的 title 匹配） |
| `schema` | object | JSON Schema，用于强制结构化输出 |
| `model` | string | 模型覆盖（`sonnet`、`opus`、`haiku`） |
| `isolation` | string | `'worktree'` — 在隔离的 git worktree 中运行（每个 agent 约 200-500ms 额外开销） |
| `agentType` | string | 自定义子智能体类型，来自 `.claude/agents/` |

---

### `parallel(thunks)`

**屏障模式**：并发运行所有 thunk，等待全部完成后返回。

```javascript
const results = await parallel([
  () => agent('任务 A'),
  () => agent('任务 B'),
  () => agent('任务 C'),
])
// results = [resultA, resultB, resultC] — 失败项返回 null
```

仅在确实需要**所有结果同时可用**时使用（去重、合并、跨项上下文）。

---

### `pipeline(items, stage1, stage2, ...)`

**流式模式**：每个 item 独立流过所有阶段，阶段间无屏障。

```javascript
const results = await pipeline(
  [item1, item2, item3],
  item => agent(`处理: ${item.name}`, { phase: 'Process' }),
  result => agent(`验证: ${result.id}`, { phase: 'Verify' }),
)
// Item A 可以在第 2 阶段时，Item B 还在第 1 阶段
// 实际耗时 = 最慢的单条链路，而非每阶段最慢之和
```

每个阶段回调接收 `(prevResult, originalItem, index)` 参数。

**默认使用 `pipeline()`。** 仅在确实需要屏障时才使用 `parallel()`。

---

### `phase(title)`

开始新的进度阶段。后续的 `agent()` 调用归入该阶段分组。

```javascript
phase('Scan')
// 此处的 agent() 调用显示在 "Scan" 进度分组下

phase('Verify')
// 此处的 agent() 调用显示在 "Verify" 进度分组下
```

---

### `log(message)`

向用户输出进度信息（显示在进度树上方的叙述行）。

```javascript
log(`发现 ${bugs.length} 个问题，正在验证...`)
```

---

### `workflow(nameOrRef, args?)`

内联调用另一个 workflow 作为子步骤。

```javascript
// 按名称（来自 .claude/workflows/）
const result = await workflow('my-other-workflow', { key: 'value' })

// 按脚本路径
const result = await workflow({ scriptPath: '.claude/workflows/scan.js' })
```

---

### `args`

通过 `Workflow` 的 `args` 输入传入的参数值。

```javascript
// 调用方式：Workflow({ scriptPath: '...', args: { question: '...' } })
// 在脚本中使用：
const question = args.question
```

---

### `budget`

Token 预算控制，用于动态扩展。

```javascript
budget.total       // number | null — 总 token 目标（未设置时为 null）
budget.spent()     // number — 本轮已消耗的 token 数
budget.remaining() // number — max(0, total - spent())，未设置目标时为 Infinity

// 循环直到预算耗尽模式
const bugs = []
while (budget.total && budget.remaining() > 50000) {
  const result = await agent('查找 bug', { schema: BUG_SCHEMA })
  bugs.push(...result.bugs)
  log(`已发现 ${bugs.length} 个，剩余 ${Math.round(budget.remaining() / 1000)}k token`)
}
```

---

## 4. 常见模式

### 扫描 + 验证流水线

```javascript
export const meta = {
  name: 'review-changes',
  description: '多维度审查变更文件，逐一验证发现',
  phases: [{ title: 'Review' }, { title: 'Verify' }],
}

const DIMENSIONS = [
  { key: 'bugs', prompt: '查找正确性 bug' },
  { key: 'perf', prompt: '查找性能问题' },
]

const results = await pipeline(
  DIMENSIONS,
  d => agent(d.prompt, { label: `review:${d.key}`, phase: 'Review', schema: FINDINGS_SCHEMA }),
  review => parallel(review.findings.map(f => () =>
    agent(`验证: ${f.title}`, { label: `verify:${f.file}`, phase: 'Verify', schema: VERDICT_SCHEMA })
      .then(v => ({ ...f, verdict: v }))
  ))
)

const confirmed = results.flat().filter(Boolean).filter(f => f.verdict?.isReal)
return { confirmed }
```

### 循环累积到目标数量

```javascript
const bugs = []
while (bugs.length < 10) {
  const result = await agent('在代码库中查找 bug', { schema: BUGS_SCHEMA })
  bugs.push(...result.bugs)
  log(`${bugs.length}/10 已发现`)
}
```

### 对抗性验证（N 票制）

```javascript
const votes = await parallel(Array.from({ length: 3 }, () => () =>
  agent(`尝试反驳: ${claim}。不确定时默认 refuted=true`, { schema: VERDICT })
))
const survives = votes.filter(Boolean).filter(v => !v.refuted).length >= 2
```

### 屏障去重

```javascript
// 当你需要所有结果后才能继续时（真正的屏障使用场景）
const all = await parallel(DIMENSIONS.map(d => () =>
  agent(d.prompt, { schema: FINDINGS_SCHEMA })
))
const deduped = dedupeByFileAndLine(all.filter(Boolean).flatMap(r => r.findings))
const verified = await parallel(deduped.map(f => () =>
  agent(verifyPrompt(f), { schema: VERDICT_SCHEMA })
))
```

---

## 5. 限制与约束

| 约束项 | 值 |
|--------|------|
| 每个 workflow 的并发 agent 数 | min(16, CPU 核心数 - 2) |
| 每个 workflow 生命周期的总 agent 数 | 1000 |
| 脚本最大长度 | 524,288 字符 |
| `delaySeconds`（ScheduleWakeup） | 限制在 [60, 3600] |

### 脚本中不可用的 API

- `Date.now()` / `Math.random()` / 无参 `new Date()` — 调用会抛出异常（会破坏恢复机制）
- 无文件系统或 Node.js API 访问权限
- 标准 JS 内置对象可用：`JSON`、`Math`、`Array` 等

---

## 6. 工作流文件位置

```
.claude/workflows/
  my-workflow.js       # 项目级工作流
```

全局路径：`~/.claude/workflows/`

---

## 7. 调用方式

### 通过工具调用

```javascript
// 内联脚本
Workflow({ script: "..." })

// 引用脚本文件
Workflow({ scriptPath: ".claude/workflows/my-workflow.js" })

// 带参数调用
Workflow({ scriptPath: "...", args: { question: "..." } })

// 按注册名称调用
Workflow({ name: "my-workflow" })

// 从上次运行恢复
Workflow({ scriptPath: "...", resumeFromRunId: "wf_abc123" })
```

### 通过 CLI

```bash
/workflows          # 查看正在运行的 workflow
```

---

## 8. 最佳实践

1. **默认使用 `pipeline()`** — 仅在确实需要所有前序结果同时可用时才使用 `parallel()`（屏障）
2. **在 `pipeline()`/`parallel()` 中使用 `opts.phase`** — 避免进度显示竞争
3. **仅在 agent 并行修改文件时使用 `opts.isolation: 'worktree'`** — 每个 agent 有约 200-500ms 设置开销
4. **简单任务设置 `opts.model: 'haiku'`** — 节省 token 预算
5. **进入预算循环前先检查 `budget.total`** — 未设置目标时 `remaining()` 返回 `Infinity`
6. **使用 `log()` 输出进度** — 避免静默截断，让用户了解进展
7. **用 `.filter(Boolean)` 过滤结果** — 失败的 agent 在结果数组中返回 `null`

---

## 9. 相关官方资源

| 资源 | 链接 |
|------|------|
| 常见工作流 | https://docs.anthropic.com/en/docs/claude-code/common-workflows |
| 自定义子智能体 | https://docs.anthropic.com/en/docs/claude-code/sub-agents |
| CLI 参考 | https://docs.anthropic.com/en/docs/claude-code/cli-reference |
| Agent SDK 概览 | https://code.claude.com/docs/en/agent-sdk/overview |
| GitHub 仓库 | https://github.com/anthropics/claude-code |
