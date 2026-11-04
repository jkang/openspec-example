# PM 工作台 · DSH 插件（`@local/dsh-openspec-pm-board`）

把 OpenSpec-practice 的 **产品规划 + 需求分析进展** 做成一个 PM 专属的 DSH 侧边栏工作台：
只读聚合仓库事实，告诉你「现在轮到我做什么、AI 在做什么、什么在等我确认、哪些业务知识资产该复核了」，
每个待办都能一键以 PM Agent 继续（预填提示词，不自动发送）。

设计依据：[`design/DESIGN.md`](design/DESIGN.md)（方案）· [`design/inputs-repo.md`](design/inputs-repo.md)（仓库数据模型/契约）· [`design/inputs-dsh.md`](design/inputs-dsh.md)（DSH 机制取证）。

## 它贡献什么

1. **左侧边栏入口**：`PM 工作台`（id `openspec-pm-board`，order 21，紧邻「SDD 团队」）。
2. **主区面板**：
   - 头部：当前阶段 + 9 阶段进度（今日 7/9）+ 数据时间 / commit / 工作区状态 + 刷新；
   - KPI 行：待我确认 / PM 待启动 / AI 在做 / 阻塞告警 / 资产待复核；
   - 左「我的行动队列」：阻塞 → 待确认 → 待启动 → 资产复核 → 数据健康；
   - 右 4 个 Tab：**Epic 漏斗**（7 阶段灯 + 置信度 + 下一步）、**Story Spec 待办**（就绪度 / MUST 缺失 / 交接与门禁）、**业务知识资产**（新鲜度 + 漂移候选 D1–D4 + 复核入口）、**数据健康**（warnings + sourceHealth）；
   - 实时「AI 在做」：用 slot 标准 hook `useSessions` / `useSessionStatus` 过滤 `agentPreset === 'sdd-pm'` 的会话；有 `pendingInteraction`（approval / question / plan-review）的会话直接进「待我确认」；
   - 一键行动：`uiWorkspace.startSession(workspaceId, { agentPreset: 'sdd-pm', prompt, whenDraftExists: 'append' })`——预填提示词、不自动发送；成功后自动切到对话面板。
3. **Host 只读同源路由** `POST /openspec-pm-board/api`（`ping` / `snapshot` / `refresh`）。
4. **Host 工具 `pm_board`**：会话里让 PM Agent 直接读同一份看板摘要（`ping` / `snapshot`）。

> 看板**完全不写仓库**：面板只读；所有修改通过 PM Agent 会话完成。扫描器也绝不传 `--out`。

## 数据从哪来（全部仓库事实，只读）

| 看板 | 唯一事实来源 |
| :--- | :--- |
| 阶段进度 / 规划 | `docs/ROADMAP.md` + `docs/PRODUCT.md` |
| Epic 漏斗 / HITL | `openspec-requirements/epics/*/STATUS.md` + 各阶段制品（research/idea/prototypes/architecture-impact/storymap/stories/test-design）+ sign-off 段 |
| Story spec | `ROADMAP` draft → `storymap.md` → `stories/<key>/story.md` → `test-design.md` → `/req:handoff` → `openspec/changes/` → `archive/` → `epic-*.story-list.json` |
| 业务知识资产 | `docs/baseline/{service_blueprint,business_process,domain_model}.html` 的 `Last Updated` + `design-system/` mtime + ROADMAP/PRODUCT front-matter + `docs/governance/reviews/` |
| 数据健康 | STATUS↔ROADMAP 矛盾、未归档 story-list、legacy 想法池、归档计数漂移等 |

**聚合逻辑复用交付看板生成器** `scripts/generate_delivery_board.py` 的 `scan_*` 函数（插件内 `scripts/pm_board_scan.py` 通过 `importlib` 载入并注入 `ROOT`/`TODAY`），仓库现有脚本与 `docs/governance/delivery_board.html` 生成路径**零改动**。

**状态有置信度**：工作流目前没有持久化「等待 PM 确认」与「AI 正在做」（prototype/storymap 无 sign-off 段），文件推导会标 `high / medium / low`，UI 用角标表达「推断」；实时会话状态来自 hooks，是事实而非推断。

## 目录结构

```
dsh-plugins/openspec-pm-board/
├── package.json            # bundle patch + client 模块 + 展示元数据导出
├── cordis.patch.yml        # 插入本插件（config.repoRoot / cacheTtlMs / timeoutMs）
├── index.js                # Host：同源只读路由 + python 扫描器子进程 + 缓存 + pm_board 工具
├── client.js               # Client：侧边栏图标 + 主区看板（无构建、无 JSX、只 require('react')）
├── scripts/
│   ├── pm_board_scan.py    # 只读扫描器（纯标准库，输出 PmBoardSnapshot JSON）
│   └── test_pm_board_scan.py
├── test/host-api.test.mjs  # Host 路由/缓存/降级单元测试（不需要 DSH 运行时）
├── locale/{zh,en}.json     # 插件管理页展示元数据
├── icon.svg                # 原创图标
├── API.md                  # Host ↔ Client 契约
└── design/                 # 设计文档 + 取证（不作为运行时依赖）
```

## 安装（当前 profile：desktop）

```
plugin_manager  action: install_bundle  target: /Users/superkkk/MyCoding/OpenSpec-practice/dsh-plugins/openspec-pm-board
```

- **Host 侧改动需要重启 DeepSeek Harness** 一次（`cordis.patch.yml` / `index.js` 的组合在启动时生成）；Client 侧（`client.js` / `locale`）改动刷新页面即可。
- 安装后自检：会话里调用工具 `pm_board`（`action: ping` / `action: snapshot`），或在面板里点「刷新」。路由不可用时面板会进入启动器降级态（不白屏）。

## 验证

```bash
# Host 路由/缓存/降级（不需要 DSH）
node dsh-plugins/openspec-pm-board/test/host-api.test.mjs

# 扫描器 golden case（今天：Phase 9 / 1 个活跃 Epic / research done + explore 待启动 / 45 归档 / D1–D4 漂移）
cd dsh-plugins/openspec-pm-board && python3 -m unittest scripts/test_pm_board_scan.py
cd dsh-plugins/openspec-pm-board && python3 scripts/pm_board_scan.py --root /Users/superkkk/MyCoding/OpenSpec-practice --json | head -c 400
```

安装后（重启完）在 DSH 里核对：
- `cordis_inspect_query` client `Slots.listSubTree`：`sidebar.panellist` 出现 occupant `openspec-pm-board`（order 21），`main` 出现同名 key；
- host `Config.listConfigs`：出现 `include:openspec-pm-board`；
- 会话里调用 `pm_board` 工具能返回摘要——证明 Host 半身与扫描器真的在跑。

## 依赖与边界

- 需要本机 `python3`（macOS 自带 `/usr/bin/python3` 即可）；扫描器纯标准库。
- 「一键继续」复用 `@local/dsh-openspec-sdd-team` 注册的 `sdd-pm` preset；按钮只在 `path === repoRoot` 的工作区已就绪时可点（否则禁用并提示）。preset 缺失/会话创建失败时由 Workspace 弹 `createFailed` toast；若工作区未就绪或启动抛错，面板会把提示词**复制到剪贴板**并 toast（不静默、不落到别的项目）。
- 换仓库：只改 `cordis.patch.yml` 的 `config.repoRoot`（不需要改代码）。
- 看板是 profile 全局的，但只绑定一个 repoRoot：面板始终读这个仓库；会话按钮只在「路径等于 repoRoot」的工作区打开（找不到就禁用）。在其他项目工作时，需要先在该项目的工作区里，或把 `repoRoot` 改成对应仓库。
- 面板只读；状态推断的置信度与已知缺口见设计文档 §9（可选 P2：给 STATUS/基线加 durable 标记，需要 `.trae`/`.cursor`/`.agents` 三目录同步）。
- 归档窗口由 `cordis.patch.yml` 的 `config.archiveDays`（默认 30）控制；扫描器默认 7，Host 会显式传 30。
- 卸载：`plugin_manager action: remove_bundle target: @local/dsh-openspec-pm-board`。
