# PM 工作台 · Host ↔ Client 契约（v0.1，实现以此为准）

本插件的三个半身共用一份快照：**Host 只负责「跑只读扫描器 + 包信封 + 缓存」，Client 只负责展示与行动入口**。
扫描器的字段契约见 [design/inputs-repo.md §8](design/inputs-repo.md)（`PmBoardSnapshot`）；本文只固定**路由/op/响应/常量**。

## 常量（两侧必须一致）

| 常量 | 值 |
| --- | --- |
| `API_PATH` | `/openspec-pm-board/api` |
| `API_HEADER` | `x-dsh-openspec-pm-board`（值恒为 `"1"`，缺失 → 403） |
| `PANEL_ID` | `openspec-pm-board`（= `sidebar.panellist` 的 `id` = `main` 的 `key`） |
| `SIDEBAR_ORDER` | `21` |
| `PLUGIN_VERSION` | `0.1.0` |
| `API_VERSION` | `1` |
| 扫描器 | `<plugin>/scripts/pm_board_scan.py --root <repoRoot> --json --days <archiveDays>`（Host 默认传 30） |

## 路由：`POST /openspec-pm-board/api`

请求头：`content-type: application/json`、`x-dsh-openspec-pm-board: 1`。
请求体：`{ "op": "<op>", ...payload }`（上限 64KB）。
响应：成功 `{ "ok": true, "data": {...} }`；业务失败 `{ "ok": false, "error": "人话错误", "detail"?: {...} }`。

| 情形 | HTTP | body |
| --- | --- | --- |
| `OPTIONS` 预检 | 204 | 空（**不带任何 CORS 放行头**） |
| 非 POST | 405 | `{ok:false,error:'只接受 POST 请求'}` |
| 缺标记头 | 403 | `{ok:false,error:'缺少同源标记头'}` |
| 体过大 | 413 | `{ok:false,error:'请求体过大'}` |
| 非 JSON | 400 | `{ok:false,error:'请求体不是合法 JSON'}` |
| 未知 op | 200 | `{ok:false,error:'未知 op "x"'}` |
| 业务/内部异常 | 200 | `{ok:false,error,detail?}` |

## ops

### `ping`

`{}` →

```json
{ "ok": true, "data": {
  "version": "0.1.0",
  "api": 1,
  "panelId": "openspec-pm-board",
  "repoRoot": "/Users/superkkk/MyCoding/OpenSpec-practice",
  "repoExists": true,
  "python": { "ok": true, "path": "/usr/bin/python3" },
  "scanner": { "ok": true, "path": "…/scripts/pm_board_scan.py" }
} }
```

- `python`：按 `/usr/bin/python3` → `/opt/homebrew/bin/python3` → `/usr/local/bin/python3` 探测，命中即缓存。
- `scanner`：脚本文件存在性检查（不跑扫描）。
- 面板启动先 `ping`，失败即进入**启动器降级态**（不白屏）。

### `snapshot`

`{ "force"?: boolean }` →

```json
{ "ok": true, "data": {
  "snapshot": { "…PmBoardSnapshot…": "见 design/inputs-repo.md §8" },
  "meta": { "cacheHit": true, "ageMs": 4211, "durationMs": 186 }
} }
```

- Host 内存缓存 5–15s；同一时刻只允许一个扫描子进程（in-flight promise 合并）。扫描器固定带 `--days <config.archiveDays>`（默认 30）；**绝不传 `--out`**（唯一写边界）。
- 扫描器部分数据源失败 → 仍 `ok:true`，`snapshot.generator.mode = "degraded"` 且 `snapshot.warnings[]` 有记录；整体失败（python 缺失/超时/非 0 退出/非 JSON）→ `{ok:false,error,detail}`，面板显示黄条 + 上次数据（若有）。
- 扫描器 stdout 取**最后一行 JSON**；stderr 只进 `detail.stderrTail`（截断 2KB）。

### `refresh`

`{}` → 同 `snapshot`，语义上强制重扫（绕过缓存）。

## 快照最小字段（扫描器必须输出；详细形状见 inputs-repo §8）

```
PmBoardSnapshot {
  schemaVersion, generatedAt, generator{name,version,mode}, repo{root,gitCommit,gitCommitDate,gitBranch,dirty},
  sourceHealth[], summary{counts,pmActionCount,blockedCount,activeEpicKey,currentPhase,phaseProgress,
    activeChanges,archivedChanges,stories,assets,hitl},
  boards{pmTodo,aiInProgress,waitingConfirm,confirmed,handoffDone,devInProgress,done,na,blocked,unknown},
  phases[], epics[], stories[], assets[], governance{reviews,count}, archives{recent,recentCount,historyCount,lastDate},
  warnings[]
}
```

`boards.*` 每一项：`{key,title,order,count,items[]}`；`items[]`：`{id,kind,title,subtitle?,owner,status,statusConfidence,statusBecause[],hitlWaived?,nextAction?,evidence[],links{openPath}}`。
`nextAction`：`{label, kind:'session'|'command'|'info', agentPreset?, prompt?, command?, enabled}`。
`epics[].stages[]`：`{key,title,status,confidence,artifact,artifactPath,note?,hitl{visible,waived},nextAction?}`。
`assets[]`：`{assetId,title,kind,path,updatedAt,updatedSource,ageDays,freshness,contentCounts,driftCandidates[{code,severity,message,evidence}],reviewStatus,nextAction?}`。

## Client 端约定

- 取数封装照 daily-todo：`AbortController` 分级超时（`ping` 4s、`snapshot` 15s）、同源标记头、`credentials:'same-origin'`、只认 `{ok:true,data}` 信封；卸载/切面板 abort。
- 面板挂载：`ping` → `snapshot`；手动「刷新」= `refresh`；自动轮询 30–60s（仅挂载时；卸载清 timer + abort）。
- 一键行动：`uiWorkspace.startSession(workspaceId, { agentPreset:'sdd-pm', prompt, whenDraftExists:'append' })`；`workspaceId` 必须来自 `useWorkspaces` 中 `path === snapshot.repo.root` 的工作区，找不到则按钮禁用 + 提示。成功会自动切到对话面板；失败由 Workspace 弹 toast。
- 实时状态：用 slot 标准 props `useSessions` / `useSessionStatus`（observable，不轮询）；按 `origin !== 'subagent' && cwd === snapshot.repo.root && projectionValues.agentPreset === 'sdd-pm'` 过滤；`pendingInteraction` 非空 → 「待我确认」实时项。
- 样式只用 `--dsw-alias-*` / `--dsw-specific-*` 主题 token；不 import 任何 `@deepseek-ai/*`；不写 DOM；不访问非本插件路由。

## Host 工具（给 Agent 用，同一套实现）

工具名 `pm_board`，action：`ping` / `snapshot`（只读；`snapshot` 可带 `debug:true` 在结构化返回值里附完整快照，默认只回摘要以控制上下文）。返回中文摘要文本（阶段进度、活跃 Epic 与当前阶段、优先行动、待办计数、资产漂移、数据健康）；结构化快照同时放在工具返回值里供调试。该工具与路由共用**同一个** collect 函数，用于会话内查询 / 安装后自检。
