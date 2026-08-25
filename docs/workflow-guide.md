# Claude Code Workflow Tool Guide

> **Note**: Workflow tool is an internal feature of Claude Code, not yet officially documented by Anthropic. This guide is based on the tool definition injected into the Claude Code runtime.

---

## 1. Overview

Workflow is a multi-agent orchestration tool that uses a JavaScript-like DSL for deterministic control flow (loops, conditionals, fan-out). It supports spawning subagents in parallel, managing phases, and structuring complex multi-step tasks.

### When to Use

- Multi-step orchestration where control flow should be deterministic
- Tasks requiring parallel subagent work (e.g., scanning multiple files, multi-dimensional reviews)
- Large-scale operations that a single context window can't handle (migrations, audits, broad sweeps)

### When NOT to Use

- Simple tasks — use the `Agent` tool directly
- Tasks the user hasn't explicitly opted into multi-agent orchestration for
- Tasks that don't need `Workflow`-level scale

---

## 2. Script Structure

Every script **MUST** begin with a `meta` export (pure literal, no computed values):

```javascript
export const meta = {
  name: 'my-workflow',           // Required: workflow identifier
  description: 'One-line description', // Required
  phases: [                       // Optional: progress display groups
    { title: 'Scan', detail: 'Scanning for issues' },
    { title: 'Fix', detail: 'Fixing issues' },
  ],
}

// Script body starts here
phase('Scan')
const results = await agent('Find issues in the codebase')
```

### Required `meta` Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Workflow identifier |
| `description` | Yes | One-line description shown in permission dialog |
| `phases` | No | Array of `{ title, detail, model? }` for progress display |
| `whenToUse` | No | Shown in the workflow list |

---

## 3. Core APIs

### `agent(prompt, opts?)`

Spawn a subagent and return its result.

```javascript
// Basic usage — returns string
const result = await agent('Find all TODO comments in the codebase')

// With structured output schema
const bugs = await agent('Find bugs', {
  schema: {
    type: 'object',
    properties: {
      findings: { type: 'array', items: { type: 'object' } }
    }
  }
})

// With options
const result = await agent('Review code', {
  label: 'review:auth',        // Display label override
  phase: 'Review',             // Assign to progress group
  model: 'haiku',              // Model override (sonnet, opus, haiku)
  isolation: 'worktree',       // Run in isolated git worktree (expensive!)
  agentType: 'Explore',        // Use custom subagent type
})
```

**Options:**

| Option | Type | Description |
|--------|------|-------------|
| `label` | string | Display label override |
| `phase` | string | Assign to a progress group (must match `meta.phases` title) |
| `schema` | object | JSON Schema for structured output |
| `model` | string | Model override (`sonnet`, `opus`, `haiku`) |
| `isolation` | string | `'worktree'` — runs in isolated git worktree (~200-500ms overhead per agent) |
| `agentType` | string | Custom subagent type from `.claude/agents/` |

---

### `parallel(thunks)`

**Barrier pattern**: Runs all thunks concurrently, awaits ALL before returning.

```javascript
const results = await parallel([
  () => agent('Task A'),
  () => agent('Task B'),
  () => agent('Task C'),
])
// results = [resultA, resultB, resultC] — null for failed items
```

Use when you genuinely need ALL results together (dedup, merge, cross-item context).

---

### `pipeline(items, stage1, stage2, ...)`

**Streaming pattern**: Each item flows through all stages independently, NO barrier between stages.

```javascript
const results = await pipeline(
  [item1, item2, item3],
  item => agent(`Process: ${item.name}`, { phase: 'Process' }),
  result => agent(`Verify: ${result.id}`, { phase: 'Verify' }),
)
// Item A can be in stage 2 while Item B is still in stage 1
// Wall-clock = slowest single-item chain, not sum-of-slowest-per-stage
```

Each stage callback receives `(prevResult, originalItem, index)`.

**Default to `pipeline()`.** Only use `parallel()` when you genuinely need a barrier.

---

### `phase(title)`

Start a new progress phase. Subsequent `agent()` calls are grouped under this title.

```javascript
phase('Scan')
// agent() calls here appear under "Scan" in progress display

phase('Verify')
// agent() calls here appear under "Verify"
```

---

### `log(message)`

Emit a progress message to the user (shown as narrator line above progress tree).

```javascript
log(`Found ${bugs.length} issues, verifying...`)
```

---

### `workflow(nameOrRef, args?)`

Run another workflow inline as a sub-step.

```javascript
// By name (from .claude/workflows/)
const result = await workflow('my-other-workflow', { key: 'value' })

// By script path
const result = await workflow({ scriptPath: '.claude/workflows/scan.js' })
```

---

### `args`

The value passed as `Workflow`'s `args` input.

```javascript
// Invoke: Workflow({ scriptPath: '...', args: { question: '...' } })
// In script:
const question = args.question
```

---

### `budget`

Token budget control for dynamic scaling.

```javascript
budget.total      // number | null — total token target (null if not set)
budget.spent()    // number — tokens spent this turn
budget.remaining() // number — max(0, total - spent()), or Infinity if no target

// Loop-until-budget pattern
const bugs = []
while (budget.total && budget.remaining() > 50000) {
  const result = await agent('Find bugs', { schema: BUG_SCHEMA })
  bugs.push(...result.bugs)
  log(`${bugs.length} found, ${Math.round(budget.remaining() / 1000)}k remaining`)
}
```

---

## 4. Common Patterns

### Scan + Verify Pipeline

```javascript
export const meta = {
  name: 'review-changes',
  description: 'Review changed files across dimensions, verify each finding',
  phases: [{ title: 'Review' }, { title: 'Verify' }],
}

const DIMENSIONS = [
  { key: 'bugs', prompt: 'Find correctness bugs' },
  { key: 'perf', prompt: 'Find performance issues' },
]

const results = await pipeline(
  DIMENSIONS,
  d => agent(d.prompt, { label: `review:${d.key}`, phase: 'Review', schema: FINDINGS_SCHEMA }),
  review => parallel(review.findings.map(f => () =>
    agent(`Verify: ${f.title}`, { label: `verify:${f.file}`, phase: 'Verify', schema: VERDICT_SCHEMA })
      .then(v => ({ ...f, verdict: v }))
  ))
)

const confirmed = results.flat().filter(Boolean).filter(f => f.verdict?.isReal)
return { confirmed }
```

### Loop-Until-Count

```javascript
const bugs = []
while (bugs.length < 10) {
  const result = await agent('Find bugs in this codebase.', { schema: BUGS_SCHEMA })
  bugs.push(...result.bugs)
  log(`${bugs.length}/10 found`)
}
```

### Adversarial Verify (N-vote)

```javascript
const votes = await parallel(Array.from({ length: 3 }, () => () =>
  agent(`Try to refute: ${claim}. Default to refuted=true if uncertain.`, { schema: VERDICT })
))
const survives = votes.filter(Boolean).filter(v => !v.refuted).length >= 2
```

### Barrier for Dedup

```javascript
// When you NEED all results before proceeding (genuine barrier use case)
const all = await parallel(DIMENSIONS.map(d => () =>
  agent(d.prompt, { schema: FINDINGS_SCHEMA })
))
const deduped = dedupeByFileAndLine(all.filter(Boolean).flatMap(r => r.findings))
const verified = await parallel(deduped.map(f => () =>
  agent(verifyPrompt(f), { schema: VERDICT_SCHEMA })
))
```

---

## 5. Limits & Constraints

| Constraint | Value |
|------------|-------|
| Concurrent agents per workflow | min(16, CPU cores - 2) |
| Total agents per workflow lifetime | 1000 |
| Script max length | 524,288 characters |
| `delaySeconds` (ScheduleWakeup) | Clamped to [60, 3600] |

### Unavailable APIs in Scripts

- `Date.now()` / `Math.random()` / argless `new Date()` — these throw (would break resume)
- No filesystem or Node.js API access
- Standard JS built-ins available: `JSON`, `Math`, `Array`, etc.

---

## 6. Workflow File Location

```
.claude/workflows/
  my-workflow.js       # Project-level workflow
```

Or global: `~/.claude/workflows/`

---

## 7. Invocation Methods

### Via Tool Call

```javascript
// Inline script
Workflow({ script: "..." })

// Reference script file
Workflow({ scriptPath: ".claude/workflows/my-workflow.js" })

// With arguments
Workflow({ scriptPath: "...", args: { question: "..." } })

// By registered name
Workflow({ name: "my-workflow" })

// Resume from previous run
Workflow({ scriptPath: "...", resumeFromRunId: "wf_abc123" })
```

### Via CLI

```bash
/workflows          # View running workflows
```

---

## 8. Best Practices

1. **Default to `pipeline()`** — only use `parallel()` (barrier) when you genuinely need ALL prior-stage results together
2. **Use `opts.phase`** inside `pipeline()`/`parallel()` to avoid progress display races
3. **Use `opts.isolation: 'worktree'`** ONLY when agents mutate files in parallel — it has ~200-500ms setup overhead per agent
4. **Set `opts.model: 'haiku'`** for simple tasks to save budget
5. **Guard on `budget.total`** before entering budget loops — `remaining()` returns `Infinity` when no target is set
6. **Use `log()`** to communicate progress instead of silent truncation
7. **Filter with `.filter(Boolean)`** — failed agents return `null` in result arrays

---

## 9. Related Official Resources

| Resource | URL |
|----------|-----|
| Common Workflows | https://docs.anthropic.com/en/docs/claude-code/common-workflows |
| Custom Subagents | https://docs.anthropic.com/en/docs/claude-code/sub-agents |
| CLI Reference | https://docs.anthropic.com/en/docs/claude-code/cli-reference |
| Agent SDK Overview | https://code.claude.com/docs/en/agent-sdk/overview |
| GitHub Repo | https://github.com/anthropics/claude-code |
