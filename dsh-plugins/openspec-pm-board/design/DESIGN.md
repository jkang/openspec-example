# PM 工作台 · DSH 插件设计方案（v0.1 · 待确认）

> 目标读者：用户（PM 本人）
> 事实时点：2026-11-04；仓库 `OpenSpec-practice` @ `460696e`
> 配套取证：仓库数据模型见 [`inputs-repo.md`](inputs-repo.md)（867 行，含当前真实快照与 §8 JSON 数据契约）；DSH 机制取证见 [`inputs-dsh.md`](inputs-dsh.md)（面板/路由/会话/打包契约）
> 状态：**仅设计，未开工**。你确认 §12 的 6 个决策后，我再进入实现。

---

## 0. 结论先行

1. **能，单独做一个侧边栏插件是正确形态。** 新增独立 bundle `@local/dsh-openspec-pm-board`，侧边栏第 12 个入口「PM 工作台」（id `openspec-pm-board`，order 21，紧跟 SDD 团队），点开是 PM 专属主区面板。它与现有「SDD 团队」面板是**两类东西**：团队面板是静态角色目录，PM 工作台是**实时项目进展 + 待办追踪**，独立版本、独立生命周期、互不拖累。
2. **数据必须是活的，不能像 sdd-team 那样预生成静态 JSON。** 做法：Host 半身注册同源只读路由 `POST /openspec-pm-board/api`，现读仓库 → 复用现有交付看板聚合器（`scripts/generate_delivery_board.py` 的扫描函数：纯扫描 **33.6ms**、含解释器整进程 **0.12–0.19s**）→ 输出 `PmBoardSnapshot` JSON → 面板 fetch + 手动/自动刷新。交付看板 HTML 的生成路径**不动**。
3. **不重造看板，做 PM 视角重组。** 交付看板已有「路线图阶段 / 需求漏斗 / 交付看板 / 业务基线」；PM 看板把它们重组为 **4 个 PM 专区 + 1 条行动队列**：待我确认（HITL 收件箱）、Epic 漏斗、Story Spec 待办、业务知识资产 Review，外加「AI 在做 / 阻塞 / 数据健康」信号。
4. **看板是行动入口，不是只读报表。** 每个待办都带一个「用 PM Agent 继续」按钮：`startSession(<repo 对应 workspaceId>, { agentPreset: 'sdd-pm', prompt, whenDraftExists: 'append' })`——新开会话、预填好当前 Epic/阶段/待收口问题的提示词，**由你敲回车才开始**，打开后自动切到对话面板；看板本身**不写任何文件**。
5. **今天打开就能看到的真实内容**（见 §11）：Phase 9 会员与复购 7/9；Epic `epic-miniprogram-membership-points`：research ✅ 已确认（2026-10-20），**explore 是当前唯一 PM 待启动项**，其后 5 段全被它阻塞；0 个已拆 Story（ROADMAP 有 3 条 draft）；3 份业务基线已 57 天未更新 + 4 条漂移候选（`error-handling` 状态过期、流程基线缺应收支流、capability 18 vs 19、ROADMAP 归档计数 31 vs 38）；45 条归档、近 7 天 0 交付、0 份 review/test-design 记录。
6. **状态可信度必须显式化。** 工作流没有持久化「等待确认」和「AI 正在做」两个状态，推导置信度只能做到 high/medium/low；UI 用角标 + 虚线表达「推断」，绝不假装确定。补齐 durable 标记是可选的 P2（改模板 + 三目录同步，见 §9 选项 B）。
7. **MVP ≈ 3 天**：P0 技术验证 0.5d → P1 扫描器与规则 0.5–1d → P2 面板 UI 1d → P3 联调验收 0.5–1d。建议 P0 先跑通「路由 → 扫描器 → 面板 fetch」再投 UI。

---

## 1. 需求拆解与边界

你的原话拆成 6 个可验证需求点：

| # | 你的诉求（原话） | 设计回答 | 在方案中的位置 |
| :-- | :--- | :--- | :--- |
| N1 | 「能把 PM Agent 单独再做一个侧边栏插件吗」 | 能。独立 bundle + 独立 `sidebar.panellist` 入口 + 独立 `main` 面板；不挤进 SDD 团队面板 | §2、§7 |
| N2 | 「根据实际项目的进展，delivery dashboard 中产品规划和需求分析相关的看板」 | 直接复用交付看板的数据源与扫描器，但按 PM 视角重组（阶段进度 / Epic 漏斗 / Story / 资产） | §3、§4 |
| N3 | 「看看自己要分析的 Epic 和要准备好的 story spec」 | Epic 漏斗阶段灯 + 每阶段下一步；Story 粒度 23 字段就绪表（story.md / test-design MUST / 覆盖对账 / 交接 / change / 门禁） | §4.2、§4.3 |
| N4 | 「要 review 的业务知识资产」 | 4 类资产（3 份 baseline HTML + design-system + PRODUCT/ROADMAP）新鲜度 + 漂移候选 + 复核动作 | §4.4 |
| N5 | 「相当于为 PM 做一个任务追踪看板」 | 左侧「我的行动队列」按「待确认 / 待启动 / AI 在做 / 阻塞」分组，右侧看板钻取 | §5 |
| N6 | 「展示任务的状态，哪些是 AI 在做，哪些是在等待自己确认」 | 9 态状态模型 + owner（AI/PM/Lead）+ 置信度；「AI 在做」= 低置信推断 + P1 的 live 会话活动 | §4.1、§4.5 |

**In Scope（本设计）**
- 只读聚合 + 行动入口（一键开 PM 会话）。
- 数据：ROADMAP、需求侧 Epic 漏斗/STATUS、Story/交接/开发侧只读、业务基线、数据健康。
- 单仓库（本 repo），desktop profile。

**Out of Scope**
- 面板内直接修改工件/状态（写回）。所有修改都通过 PM Agent 会话完成（写入口唯一）。
- Jira/Linear、通知推送、跨仓库汇总。
- 修改交付看板 HTML 生成路径（只复用其扫描函数）。
- 补齐 HITL durable 标记（工作流改动，属可选 P2，见 §9）。   ← 若你选 Option B 才进范围

---

## 2. 形态选择：为什么单独一个 bundle

| 方案 | 形态 | 优点 | 缺点 | 结论 |
| :--- | :--- | :--- | :--- | :--- |
| **A（推荐）** | 新 bundle `@local/dsh-openspec-pm-board` + 新侧边栏入口 + 新 `main` 面板 | 独立安装/版本/回滚；Host 半身故障不影响 SDD 团队面板；可只给 PM 装；符合「单独再做」 | 多一个 bundle 要维护；侧边栏多一个图标 | ✅ |
| B | 在现有 `@local/dsh-openspec-sdd-team` 里加第二个入口 + Host 半身 | 安装一次即可 | 静态团队目录与实时看板耦合；sdd-team 从纯 Client 变成带 Host 路由；回滚粒度差 | ✗ |
| C | 不新增入口，做 SDD 团队面板里的子视图 | 侧边栏不增 | 不符合「单独侧边栏插件」诉求；每次先点团队再切视图 | ✗ |

**A 的具体约定**
- sidebar：`id: 'openspec-pm-board'`、`order: 21`（现有：plugins 0 / schedules 10 / daily-todo 12 / sdd-team 20 / agent-roster 29 / blog-writer·grilling·fde-toolkit 30 / invoice 40 / proposal-studio·interview-eval 50）。图标用「看板/清单」glyph，与 SDD 团队的「组织架构」glyph 区分。**`sidebar.panellist` 的 `id` 必须等于 `main` 的 `key`**，否则点击会抛 `layout.selectPanel: main panel not registered`。
- main：`key: 'openspec-pm-board'`；`sidebar.panellist` 与 `main` 同 id。
- 与已装插件的关系：**不重复注册 PM preset**，直接复用 `sdd-team` 已注册的 `sdd-pm`；live「AI 在做」用同一 id 过滤（`projectionValues.agentPreset === 'sdd-pm'`）。若该 bundle 被卸载，点击会由 Workspace 弹 `createFailed` toast（非静默），见 §7.6。
- 面板全局可见（profile 级），但绑定一个仓库根 `repoRoot`（Config，默认本仓库）；非本仓库工作区打开时显示「仓库路径未配置/不可达」的启动器降级态。

---

## 3. 数据来源与「活数据」策略

### 3.1 看板区块 ← 唯一事实来源（再对齐现有交付看板）

| 设计区 | 数据来源（SoT） | 现状（实测） |
| :--- | :--- | :--- |
| 阶段进度 | `docs/ROADMAP.md` 阶段标题 + front-matter `updated_at` | Phase 1–7 done / 8 future / 9 current = 7/9 |
| PM 待启动 Epic | ROADMAP 当前阶段 In Scope + `openspec-requirements/epics/*/` 目录比对 | 1 个活跃 Epic；Phase 9 draft Story 3 条 |
| Epic 漏斗 | `epics/<key>/STATUS.md` 阶段单元格 + 制品存在性 + sign-off 段落 | research ✅ / explore ⬜ / 其余 5 段 ⬜ |
| Story Spec | `STATUS.md` Story 表 → `story.md` → `test-design.md` → `openspec/changes/` → archive → `story-list.json` | 0 已拆；历史 17 Story 全 done |
| 业务知识资产 | `docs/baseline/{service_blueprint,business_process,domain_model}.html` 的 `Last Updated` + `design-system/` mtime + `PRODUCT.md`/`ROADMAP.md` front-matter + `docs/governance/reviews/` | 3 HTML = 2026-09-08（57 天）；design-system 65 天；reviews 空 |
| AI 在做 | 文件层无心跳（低置信推断：mtime/git dirty/STATUS 词表）+ 客户端 hooks 提供的 live DSH 会话 | 今天文件层无线索；live 会话由 `useSessions`/`useSessionStatus` 实时提供 |
| 数据健康 | STATUS↔ROADMAP 矛盾、未归档 story-list、legacy idea 池、口径差 | 4 条漂移 + 5 条数据卫生问题 |

### 3.2 活数据路线（关键决策）

**路线 A（推荐）：Host 路由 + Python 扫描器子进程**

```
┌─────────────────────────── DSH Web UI ───────────────────────────┐
│ client.js  PM 工作台面板                                          │
│   fetch POST /openspec-pm-board/api {op:'snapshot'}  ← 同源、只读          │
└───────────────────────────────┬──────────────────────────────────┘
                                │ x-dsh-openspec-pm-board: 1
┌───────────────────────────────▼──────────────────────────────────┐
│ index.js（Host 半身）                                             │
│   ctx.inject(['webServer']) → webServer.register({kind:'exact',     │
│        path:'/openspec-pm-board/api'})                              │
│   op = ping | snapshot(缓存 TTL) | refresh(强制重扫)               │
│   child_process.execFile(python3, [<plugin>/scripts/pm_board_scan.py,   │
│        '--root', config.repoRoot, '--json'])                       │
│   timeout 8–15s；缓存 5–15s + in-flight 合并；失败 → 上次缓存 + 黄条  │
└───────────────────────────────┬──────────────────────────────────┘
                                │ 只读
┌───────────────────────────────▼──────────────────────────────────┐
│ scripts/pm_board_scan.py（插件自带，纯标准库）                      │
│   import 并复用仓库 scripts/generate_delivery_board.py 的           │
│   scan_roadmap / scan_epics / scan_active_changes / scan_verify /   │
│   scan_archives / scan_baseline（ROOT/TODAY 注入）                  │
│   + 新增 scan_story_tracking / scan_hitl / scan_asset_review /      │
│   scan_data_hygiene / scan_board_state（规则 R01–R18）              │
│   输出 PmBoardSnapshot JSON（inputs-repo.md §8）                    │
└──────────────────────────────────────────────────────────────────┘
```

- **为什么不用「预生成静态 JSON」**（sdd-team 的方式）：项目进展每天变，静态数据会过期；PM 看板的核心价值就是「现在轮到我做什么」。
- **为什么复用现有扫描器**：交付看板是团队唯一聚合口径；复制一份逻辑必然漂移。实测纯扫描 33.6ms / 整进程 0.12–0.19s，子进程开销可接受。插件内自带 `pm_board_scan.py` 并以 `importlib` 载入仓库脚本的 `scan_*` 函数（注入 `ROOT`/`TODAY`），**不修改仓库任何现有脚本**（零项目文件改动）。若更愿意把脚本放进仓库，备选是给 `generate_delivery_board.py` 加约 10 行 `--json` 模式（见 §12 Q3）。
- **为什么新增逻辑放在插件里**：PM 专属状态（HITL 可见性、Story 追踪、资产漂移、数据卫生）不属于交付看板职责；放插件里可独立迭代。
- **缓存与降级**：Host 内存缓存 5–15s（`generatedAt` 仍每次刷新）、同一时刻只跑一个子进程（in-flight promise 合并）；扫描失败时返回上次缓存 + `warnings`，无缓存则 `{ok:false, error, detail}` → 面板进入启动器降级态。面板挂载即拉取；「刷新」强制重扫；自动轮询 30–60s（仅面板挂载时，卸载即清 timer + abort）。
- **安全性**：只读（**调用扫描器/生成器时绝不传 `--out`**，这是唯一写边界）；同源标记头 `x-dsh-openspec-pm-board: 1`（缺头 403；`OPTIONS` 204 且不回 ACAO，天然挡跨站）；子进程参数固定、不经 shell、不拼接前端输入；`cwd=repoRoot`、`timeout` + `maxBuffer`；`repoRoot` 只来自插件 config、不来自请求体；不联网。

### 3.3 数据现实（会影响 UI 设计的三点）

1. **需求侧目前只有 1 个活跃 Epic、0 个 Story**：看板必须把「下一步动作」做成一等公民，而不是等看板里有大量卡片；空状态要说明「为什么空、下一步是什么」。
2. **历史数据口径脏**（`部分 done`/`all-handoff`/`planned` 混用；storymap 状态列不可信；26/38 归档 verify 才是四项全 PASS，且 0 FAIL）：看板不能把「未执行」当失败，历史 Epic 按「已归档」豁免 test-design 缺失。
3. **漂移就是价值**：4 条资产漂移 + 5 条数据卫生问题在交付看板里看不到，PM 看板应直接把它们变成「待 PM 复核」条目——这正是「要 review 的业务知识资产」的具体落点。

---

## 4. PM 任务模型与状态语义

### 4.1 状态模型（9 态 + 兜底）

| 看板状态 | key | 含义（对 PM） | 判定来源 | 置信度 |
| :--- | :--- | :--- | :--- | :--- |
| AI 正在做 | `aiInProgress` | 某阶段/产物正在被 AI 生成，PM 等 | 无心跳；低置信推断（STATUS 词表/mtime/git dirty）；live 会话为实测事实（hooks） | 文件推断 low / live 高 |
| 产出已就绪 · 等待 PM 确认 | `waitingConfirm` | 产物在，HITL 未发生 | 产物存在 + sign-off 未勾 + 下游缺失 | high（research/idea/arch/test-design）/ medium（prototype/storymap） |
| PM 待启动 | `pmTodo` | 轮到 PM：跑下一个 `/req:` 阶段或补规划 | 前序 done/confirmed/na + 本阶段无产物 | high |
| 已确认 | `confirmed` | HITL 已过，等下一步 | sign-off 已勾 / STATUS 说明含确认字样 | high/medium |
| 已交接开发 | `handoffDone` | Story 已交开发侧 | story 交接勾选 + changeName + story-list | high |
| 开发中 | `devInProgress` | 开发侧 change 活跃 | `openspec/changes/<name>/` 阶段推断 + verify/review | high |
| 已完成 | `done` | Story/Epic/change 闭环 | archive + verify + story-list | high |
| 不适用 | `na` | 显式跳过（如无 UI 的 prototype） | **只认显式 `n/a`/no-op，不推断** | high |
| 阻塞 / 告警 | `blocked` / `warning` | 门禁失败、MUST 缺失、状态矛盾、孤儿队列 | R12–R16 | high/medium |
| （兜底）未知 | `unknown` | 解析失败/数据源缺失 | sourceHealth | — |

> 完整 18 条确定性规则（R01–R18）、优先级与"推不准"的三种情形见 [`inputs-repo.md` §2](inputs-repo.md)。核心原则：**规则可复算、每条状态带 `statusBecause`（规则 id + 证据路径）与置信度**，UI 必须展示不确定性。

### 4.2 工作对象与看板映射

| 对象 | 看板中的呈现 | Owner | 行动 |
| :--- | :--- | :--- | :--- |
| Phase / 阶段进度 | 顶部阶段条（9 段：done/current/future）+ 7/9 | PM（+用户裁定） | 「更新路线图」会话 |
| Epic（需求侧工作单元） | Epic 漏斗卡：7 阶段灯 + 当前阶段 + 下一步 | PM 主导 | 「继续 explore/prototype/…」会话 |
| 阶段产物（research/idea/prototype/arch/storymap/stories/test-design） | 阶段灯 + 产物路径 + HITL 可见性角标 | PM | 确认 / 产出 会话 |
| Story（业务面冻结物） | Story 表：就绪度、MUST 缺失、交接、change、门禁 | PM 产出 → lead 交接 | 「补 story.md / 补 test-design / handoff 自查」会话 |
| 开发侧 change / verify / review | 只读列（EPIC 详情展开 / Story 行） | lead/engineer/qa | 只读；异常转「找 lead 处理」 |
| 业务知识资产（4 类） | 资产卡：新鲜度、内容计数、漂移候选、review 记录 | PM | 「发起资产复核 / baseline sync」会话 |
| HITL 确认点（17 个） | 「待我确认」队列 + 对应行角标 | 用户 | 「带 checklist 开会话」 |
| 数据健康 | 「数据健康」区（告警列表） | PM/lead | 「修数据」会话 |

### 4.3 「AI 在做 vs 等我确认」怎么落地（你 N6 的核心）

- **等自己确认**：`waitingConfirm` 类条目（产物已存在但 sign-off 未确认）× HITL 检查点映射（17 个检查点，见 inputs-repo §3）；看板给「确认清单」并一键开会话引导核对。
- **AI 在做**（两层，均已取证可实现）：
  - 文件层：`aiInProgress` 低置信推断 + 明确角标「推断·无实时心跳」；
  - Live 层（建议进 MVP）：main slot 标准 props **`useSessions` / `useSessionStatus`** 是 observable（Cordis snapshot → React 重渲染，**不需要轮询**）。可拿每条会话的 `id / displayTitle / running / updatedAt / cwd / origin / projectionValues`；状态含 `{running, pendingInteraction, completionUnread}`，`pendingInteraction.kind ∈ approval | question | plan-review`。
  - **过滤 PM Agent 会话**：`origin !== 'subagent' && cwd === repoRoot && projectionValues.agentPreset === 'sdd-pm'`（`agentPreset` 是既有 wire 投影）。
  - **「等待自己确认」有实时信号**：PM 会话 `pendingInteraction` 非空 = AI 已停下等人 → 直接进「待我确认」队列（附会话标题/跳转）；`completionUnread` = 刚跑完待看。
  - 设计原则：文件层宁可说「推断/未知」；live 层只陈述 hook 事实，不谎报。
- **我该做什么**：`pmTodo` + `blocked` + `warnings` 汇总为「我的行动队列」，按优先级排序（阻塞 > 等确认 > 待启动 > 资产复核 > 数据健康）。

### 4.4 「业务知识资产 review」的具体定义

| 动作 | 触发 | 产物/判据 | 看板呈现 |
| :--- | :--- | :--- | :--- |
| A. Baseline Sync（Epic 级） | Epic 全部 Story 归档后 `/opsx:baseline/sync` | 三份 baseline HTML `Last Updated` 变化，或显式 no-op（今天无落盘记录） | 资产行「上次同步」+「期望在最近归档后复核」 |
| B. Design System 一致性 | 新 UI Epic 原型前 / baseline sync | `docs/baseline/design-system/`（无日期，只能 mtime） | 资产行「65 天未变更」+ 复核入口 |
| C. 产品专家评审（ROADMAP 现状评估） | 阶段收尾 | `ROADMAP.md` 现状评估表（无日期/签署） | 资产行「与 Phase 9 新价值承诺是否一致待评」 |
| D. 治理评审归档 | reviewer `/opsx:review epic:<key>` | `docs/governance/reviews/*.md`（今天 0 份） | 资产行「0 份评审记录」+ 发起评审入口 |

漂移候选（今天即显示，证据见 inputs-repo §5.4）：
- D1 `service_blueprint.html` 把 `error-handling` 标「规划中」，但主规格已存在；
- D2 `business_process.html` 全文 0 处「应收」，Phase 7 未回流；
- D3 `domain_model.html` 18 个 `cap-*` vs `openspec/specs/` 19 个目录（口径待确认，不自动判错）；
- D4 `ROADMAP.md` 称 31 个变更已归档，实际 38 个 change 目录（+7 story-list）。

---

## 5. 信息架构与交互

### 5.1 主面板线框（1440 宽）

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ PM 工作台                                            phase 9 · 会员与复购   7/9 ▕███░░▏   │
│ OpenSpec-practice · 数据 2026-11-04 13:41:00 · commit 460696e · 工作区干净   [刷新] [PM 会话] │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│ 阶段 ▕ Phase1…7 已完成 ▏ Phase 8 未来 · Phase 9 当前                                      │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                        │
│ │ 待我确认  │ │ PM 待启动 │ │ AI 在做   │ │ 阻塞/告警 │ │ 资产待复核│   ← KPI 可点击筛选    │
│ │ 0        │ │ 1        │ │ 0（推断） │ │ 3        │ │ 4 漂移    │                        │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘                        │
├───────────────────────────────────────────┬──────────────────────────────────────────────┤
│ 我的行动队列（可滚动）                     │ 看板（Tab）                                   │
│ ┌ 待我确认（0）                         │ [Epic 漏斗] [Story Spec] [业务知识资产] [数据健康] │
│ │ 暂无：当前无"产出已就绪待确认"条目     │ ┌──────────────────────────────────────────┐ │
│ ├ PM 待启动（1）                        │ │ Epic epic-miniprogram-membership-points   │ │
│ │ ● epic-…membership-points             │ │ 阶段  research✅  explore⬜  prototype⬜   │ │
│ │   下一步：/req:explore 产出 idea.md    │ │       arch⬜(OPT) storymap⬜ stories⬜     │ │
│ │   [用 PM Agent 继续] [详情]           │ │       test-design⬜(MUST)                 │ │
│ ├ 阻塞 / 告警（3）                      │ │ 当前：explore（PM 待启动）                │ │
│ │ ⚠ STATUS 说明与 ROADMAP 矛盾（stale）  │ │ 下一步：/req:explore → idea.md            │ │
│ │ ⚠ 未归档 story-list（sales-dashboard）│ │ 待收口：10 个 research 待定问题 (Q3…)     │ │
│ │ ⚠ review/test-design 记录为 0         │ │ [继续 explore] [查看 research.md 路径]    │ │
│ ├ 资产待复核（4）                       │ ├──────────────────────────────────────────┤ │
│ │ ● service_blueprint（57 天·D1）       │ │ ROADMAP draft Story（3）未拆分：           │ │
│ │ ● business_process（57 天·D2）        │ │ P0 story-…earning / P0 story-…redeem      │ │
│ │ ● domain_model（57 天·D3）            │ │ P1 story-…rules-ledger                    │ │
│ │ ● design-system（65 天）              │ └──────────────────────────────────────────┘ │
│ └ 数据健康（5）                        │                                              │
│   [刷新] [用 PM Agent 处理数据问题]     │  ── 开发侧只读：最近归档 3 条 + 门禁 ──       │
└───────────────────────────────────────────┴──────────────────────────────────────────────┘
│ 只读看板 · 所有修改通过 PM Agent 会话完成 · 数据来源：ROADMAP / openspec-requirements /   │
│ openspec/changes(只读) / docs/baseline / verify.md                                        │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 交互约定

- **左队列 = 行动**：按「阻塞 → 待确认 → 待启动 → 资产复核 → 数据健康」排序；每条卡片 = 标题 + 一句 why + owner/置信度角标 + 主按钮。点击卡片 → 右看板定位到对应行并展开证据（路径/规则 id/原文片段）。
- **右看板 = 钻取**：
  - Epic 漏斗：7 阶段灯（颜色 + 置信度点），点阶段展开：状态原因、产物路径、HITL 可见性、下一步命令、相关告警。
  - Story Spec：表格（Story / 优先级 / 来源 / story.md / test-design(MUST) / 覆盖对账 / 交接 / change 阶段 / 门禁 / 下一步）。空状态 = ROADMAP draft 3 条「未拆分」。
  - 业务知识资产：4 类资产卡（3 baseline + design-system）+ 规划层（PRODUCT/ROADMAP）+ 评审目录；每卡显示更新值/来源（html-meta | mtime）、年龄、计数、漂移候选（D1–D4）、复核入口。
  - 数据健康：`warnings[]`（STATUS 矛盾、孤儿 story-list、legacy idea 池、口径差）+ `sourceHealth` 表（每数据源 ok/issues/计数）。
- **一键开会话（唯一写入口）**：每个行动按钮都走 `uiWorkspace.startSession(workspaceId, { agentPreset: 'sdd-pm', prompt, whenDraftExists })`——只预填、不自动发送。
  - `workspaceId` 必须**显式**取「`path === repoRoot` 的工作区」（`useWorkspaces`）；找不到则按钮禁用 + 提示「先把 OpenSpec-practice 注册为工作区」，避免开到别的项目。
  - `whenDraftExists`：继续某 Epic 用 `'append'`（不吞用户草稿）；「新开 PM 会话」可用 `'replace'`。
  - 成功后会经 `replaceMain(...,'reveal')` → `layout.selectPanel(null)` **自动切到对话面板**（看板从主区消失是预期行为）；失败（preset 不存在/创建被拒）由 Workspace 弹 `createFailed` toast，当前选择不变。
- **刷新**：挂载即拉；手动「刷新」强制重扫；自动轮询 30–60s（仅面板挂载时，卸载即清 timer + abort）。显示 `generatedAt` / commit / dirty。会话实时状态走 hooks，不参与轮询。
- **降级**：路由不可用（Host 未重启、路径不可达、扫描器失败）→ 面板变「启动器模式」：一段说明 + [用 PM Agent 直接分析项目进展] + 数据源路径列表；不白屏、不抛栈。
- **可访问性**：键盘可达、`aria-current` 标注当前项、状态不只靠颜色（角标/文字/图标三重编码）。

---

## 6. 数据契约（面板 ↔ Host）

顶层形状直接采用 [`inputs-repo.md` §8.1](inputs-repo.md) 的 `PmBoardSnapshot`（schemaVersion / generatedAt / generator / repo / sourceHealth / summary / boards / phases / epics / stories / assets / governance / archives / warnings）。补充：

```ts
// P1 客户端侧（不来自 host JSON）：live 活动
interface LiveActivity {
  available: boolean;              // useSessions 是否可用
  activeSessions: Array<{ id: string; title: string; running: boolean; lastActivityAt?: string; presetMatched?: boolean }>;
  note: string;                    // 例如「会话列表不含 preset 字段，按标题推断」
}
```

API 约定（`POST /openspec-pm-board/api`，头 `x-dsh-openspec-pm-board: 1`，只读；响应统一 `{ok:true,data}` / `{ok:false,error,detail?}`，业务失败仍 HTTP 200）：

| op | 请求 | 响应 |
| :--- | :--- | :--- |
| `ping` | `{}` | `{version, api, repoRoot, python: {ok, path}, generator: {ok}}` |
| `snapshot` | `{force?: boolean}` | `{snapshot: PmBoardSnapshot, cache: {hit, generatedAt, ageMs}}` |
| `refresh` | `{}` | 同 snapshot，强制重扫（绕过缓存） |

方法/范围：`OPTIONS` → 204（不回 ACAO）；非 POST → 405；缺标记头 → 403；体过大 → 413；非 JSON → 400；未知 op → 200 `{ok:false,error}`。扫描器部分失败返回 `ok:true` + `warnings[]` + `generator.mode:'degraded'`（不整体失败）。同一 `(kind,path)` 重复注册会抛错（插件只注册一次）。快照缓存 5–15s；`summary.counts` 必须与 boards 计数一致。

**数据契约的既有实现参考**：`PmBoardSnapshot` 的 item/asset/story 字段、golden-case 当前快照见 inputs-repo §8.2–§8.4。

---

## 7. 技术架构

### 7.1 包结构

```
dsh-plugins/openspec-pm-board/
├── package.json            # name @local/dsh-openspec-pm-board；dsh.bundle.patch + dsh.client
├── cordis.patch.yml        # 1 行：插入本插件，config.repoRoot 等
├── index.js                # Host：/openspec-pm-board/api 路由 + 扫描器子进程 + 缓存 + Config
├── client.js               # Client：侧边栏图标 + 主面板（vanilla React，无构建）
├── scripts/
│   └── pm_board_scan.py    # 只读扫描器（纯标准库；复用仓库 generate_delivery_board.py）
├── locale/{zh,en}.json     # 插件管理页展示元数据
├── icon.svg                # 看板/清单 glyph（原创）
└── README.md
```

**项目侧文件改动：0 个**（扫描器在插件内，import 仓库脚本的扫描函数；交付看板 HTML 生成路径不动）。

### 7.2 Host 半身（index.js）

- **服务注入**：`ctx.inject(['webServer'], webCtx => webCtx.effect(() => webCtx.webServer.register({ kind:'exact', path:'/openspec-pm-board/api', handler }), '...'))`；`webServer` 缺席时该子 fiber 保持 inactive，插件不崩。
- **Config（不声明 schema）**：本机所有 local plugin 都不 `export const Config`；Cordis 在无 schema 时把 patch 的 `config` 原样传给 `apply(ctx, config)`。因此 `config: { repoRoot: "/Users/superkkk/MyCoding/OpenSpec-practice", cacheTtlMs: 15000, timeoutMs: 15000 }` + `apply(ctx, config)` 即可，**不必** import `@deepseek-ai/schemastery`（本地插件解析不到 harness 依赖）。
- **路由 handler**：Node 原生 `IncomingMessage/ServerResponse`；POST-only + 标记头校验 + op 白名单；自己 `try/catch`（handler 抛错会变裸 400）。响应信封 `{ok:true,data}` / `{ok:false,error,detail?}`。
- **扫描子进程**：`execFile(python, [path.join(PLUGIN_DIR,'scripts','pm_board_scan.py'), '--root', config.repoRoot, '--json'], { cwd: config.repoRoot, timeout, maxBuffer: 8MB, env: {...process.env, NO_COLOR:'1', PYTHONIOENCODING:'utf-8'} })`。python 解析顺序 `['/usr/bin/python3','/opt/homebrew/bin/python3','/usr/local/bin/python3']`（实测 `/usr/bin/python3` 3.9.6 可用），`ping` 时缓存结果。stdout 取「最后一行 JSON」；**绝不传 `--out`**。
- **缓存/并发**：内存 `{snapshot, at}` + 模块级 `inflight` Promise；缓存 5–15s；`refresh` 强制重扫。
- **不 import 任何 `@deepseek-ai/*` 包**（只用 Node 内置），规避 profile 版本 skew（与本机 invoice-organizer / daily-todo 同款约束）。

### 7.3 Client 半身（client.js）

- `window.__ModuleLoader__.load({ id, factory(require) })`；`inject: ['slots','locale','uiWorkspace']`。
- `sidebar.panellist`：`{ id:'openspec-pm-board', order:21, label:()=>t('panel'), locale }` + 原创图标（SVG，`currentColor`）。
- `main`：`{ key:'openspec-pm-board', locale }`；组件 = 面板（hooks：`useState/useEffect/useMemo`；fetch + 轮询 + abort）。**live 会话直接用 slot 标准 props** `useSessions(selector)` / `useSessionStatus(selector)`（observable，无需注入 `sessions` 服务、无需轮询）。
- 样式：组件内 `<style>`，**只用 `--dsw-alias-*` 主题 token**，无 literal UI 色；中文为主、en 字典补齐；无 emoji 装饰。
- 动作：`uiWorkspace.startSession(workspaceId, {agentPreset:'sdd-pm', prompt, whenDraftExists:'append'})`；`workspaceId` 必须来自 `path === repoRoot`（找不到则按钮禁用）；工作区未就绪或启动抛错时把提示词复制到剪贴板并 toast（preset 缺失时 Workspace 另弹 `createFailed`）。
- P1：用 main slot 的标准 props（`useSessions` / `useSessionStatus`）渲染「AI 活动」；失败不影响主看板。

### 7.4 扫描器（scripts/pm_board_scan.py）

- CLI：`--root <repoRoot> --json [--days N]`（**不提供 `--out`**；Host 只传 `--root/--json/--days`）；确定性输出（除 `generatedAt`/`parsedAt`/git 状态）。
- 复用：`import generate_delivery_board as gb` → 设 `gb.ROOT = root`、`gb.TODAY = today` → 调 `scan_roadmap / scan_epics / scan_active_changes / scan_verify / scan_archives / scan_baseline`。
- 新增（签名见 inputs-repo 附录 B）：`scan_story_tracking`（23 字段）、`scan_hitl`（sign-off/waiver/不可见清单）、`scan_asset_review`（新鲜度/计数/漂移候选）、`scan_data_hygiene`（G11–G14）、`scan_board_state`（规则引擎 R01–R18 + boards/summary）。需要修正既有扫描器的三个已知缺陷（`部分 done` 误判、规划中 Epic 解析不到、PHASE_NAMES 过期）——**在插件内实现替代函数，不回改仓库脚本**。
- 降级：单源失败 → `sourceHealth.issues` + 相关 item `unknown`，`generator.mode='degraded'`，不整体失败。
- 单测：golden case = 今天快照（inputs-repo §6/§8.4）；用 `--json` 输出与预期 diff（时间/commit 字段除外）。

### 7.5 「PM Agent 继续」提示词模板（示例）

```
你是 SDD 产品经理（PM）。仓库：<repoRoot>。当前阶段：Phase 9 · 会员与复购。
Epic：epic-miniprogram-membership-points（目录：openspec-requirements/epics/<key>/）。
看板状态：explore = PM 待启动（research 已确认 2026-10-20）。
请先读 STATUS.md、research.md、docs/SOPS/SDD_WORKFLOW.md 与 config.yaml，然后按 /req:explore 的规范产出 idea.md；
进入前先收口 research 中 10 个待定项：Q3/Q4-附/Q5/Q6/Q7/Q9/Q10/Q11/Q12/Q13。
硬约束：B/C 双端、真实数据、治理映射（domain_model/business_process/service_blueprint）；产出后暂停并给我 HITL 确认清单，
不要擅自进入 prototype。完成后回报：产出路径 + 覆盖对账 + 待我确认项。
```

其他模板：资产复核（baseline sync 判定 + 漂移候选 D1–D4）、Story 补齐（story.md/test-design）、数据健康修复（STATUS 矛盾/未归档 story-list）、阶段推进（prototype/storymap）。模板只拼接「对象 id/阶段/期望产物」，不拼接自由文本。

### 7.6 依赖与降级

| 依赖 | 缺失时 |
| :--- | :--- |
| `webServer` 服务 | 插件 inactive（无路由）；面板显示降级启动器 |
| `repoRoot` 路径不可达 | `ping` 返回错误；面板显示「路径未配置」+ 说明 |
| `python3` 缺失/扫描超时 | `ping` 标 `python.ok=false`；`snapshot` 返回 lastGood 或错误；面板黄条 + 重试按钮（会话区块仍可用） |
| `sdd-pm` preset（来自 sdd-team bundle） | 点击由 Workspace 弹 `createFailed` toast（`agent-preset/not-found`），选择不变；面板给「复制提示词」兜底 |
| slot 标准 props 缺失（旧版本） | 「AI 活动」显示「不可用」，其余看板不受影响 |

---

## 8. 与现有交付看板 / 现有插件的关系

- **交付看板 HTML（`docs/governance/delivery_board.html`）保持原样**：它是团队/CI 视图；PM 看板复用其扫描函数与数据口径，增加 PM 语义。两者会长期共存。
- **SDD 团队面板（`@local/dsh-openspec-sdd-team`）保持原样**：角色目录 + 一键开会话；PM 工作台是另一个入口，不修改它。
- **daily-todo / interview-eval 的既有模式**：同源 HTTP 路由 + 面板 fetch + 无 @deepseek-ai import + Host 改动需重启 / Client 改动只刷新——本插件沿用（见 inputs-dsh 取证）。
- **`.opencode/agents/pm.md` 不改**：本插件不改变 PM 角色定义。

---

## 9. 状态保真度：两个可选升级（不阻塞 MVP）

| 选项 | 内容 | 成本 | 风险 | 建议 |
| :--- | :--- | :--- | :--- | :--- |
| **A（MVP 采用）** | 纯推导；状态带置信度；prototype/storymap 的等待确认标 medium；AI 在做标 low | 0（零工作流改动） | 永远答不了"确认过没有" | ✅ 先上线 |
| **B（可选 P2）** | 加 4 个记录行：STATUS 加 `HITL 确认` 列（prototype/storymap/story）、story.md 加验收确认行、统一 4 个 sign-off 格式、baseline HTML 加 `Synced:` meta | 中：模板 + 约 10 个 skill + 6 个 command，**必须 `.trae/.cursor/.agents` 三目录同步**（AGENTS.md 硬约束；v6 漏斗 63 文件为范式） | 低-中（新增列不改流程） | 等你用 1–2 周看板后再决定 |
| C（不推荐） | 每 Epic `board-state.json` 机器可读清单 | 高 | 高（双状态源漂移，违反"STATUS.md 唯一状态源"） | ✗ |

---

## 10. 执行计划（确认后开工）

| 阶段 | 内容 | 可演示验收 | 预计 |
| :--- | :--- | :--- | :--- |
| **P0 技术验证** | ① `webServer` 路由注册 + 同源 fetch 打通（缺头 403 / 非 POST 405）② python 子进程跑通（0.12–0.19s，无 `--out` 写盘）③ 扫描器 golden case 对齐今天快照（Phase 9 / 1 Epic / research done / explore todo / 45 归档 / D1–D4）④ main slot 标准 hooks 拿到 live 会话 + `projectionValues.agentPreset` 过滤 ⑤ `startSession(workspaceId, {agentPreset:'sdd-pm', prompt, whenDraftExists:'append'})` 预填不自动发送 ⑥ 侧边栏 + 主面板注册、降级态 | 6 项全绿；面板显示真实快照；断路由不白屏 | 0.5 天 |
| **P1 数据与规则** | 扫描器完整规则 R01–R18 + Story 23 字段 + 资产 review + 数据健康 + sourceHealth + 单测 golden | JSON 与 inputs-repo §6/§8.4 一致；改 STATUS 后 `refresh` 反映变化 | 0.5–1 天 |
| **P2 面板 UI** | 头部/阶段条/KPI/行动队列/4 看板/钻取/置信度角标/一键会话/空态与降级/中英文/图标/元数据 | 1440 宽与窄屏可用；无 literal 色；无 slot crash | 1 天 |
| **P3 联调验收** | 安装 desktop profile、重启验证、真实仓库回归、独立审计（Agent Teams）、README | §11 验收 7 条全过；`git status` 无新增改动（除插件目录） | 0.5–1 天 |

**团队分工（Agent Teams，互不重叠）**
- Lead：架构、Host（路由/子进程/缓存/Config）、扫描器集成、安装与最终验收；
- data-teammate：扫描器规则与单测（`scripts/pm_board_scan.py`）；
- ui-teammate：`client.js` 面板 + locale + 图标；
- auditor：独立只读审计（JS/YAML/契约/安全检查），复用上次 sdd-team 的审计口径。

---

## 11. 验收标准（定义"做完了"）

1. 重启 DSH 后左侧边栏出现「PM 工作台」，点击打开面板不白屏、无 console slot crash。
2. 面板显示的 `generatedAt` / commit 与仓库一致；当前阶段 Phase 9、7/9、活跃 Epic 1、归档 45 与交付看板摘要**逐项一致**（同源口径）。
3. Epic 漏斗显示 `research ✅ 已确认 / explore ⬜ PM 待启动 / 其余 5 段未开始`；「我的行动队列」给出唯一最高优先动作：`/req:explore`，并列出 research 的 10 个待定项入口。
4. 「业务知识资产」显示 3 份 baseline 的 57 天年龄与漂移候选 D1–D4；「数据健康」显示 5 条数据卫生告警（含 STATUS↔ROADMAP 矛盾）。
5. 手工修改 `STATUS.md` 任意阶段单元格 → 点「刷新」→ 面板状态随之变化（活数据证明）。
6. 点「用 PM Agent 继续」→ 新会话打开、preset 为 sdd-pm、提示词已预填、**未自动发送**；工作区未就绪时按钮禁用并可把提示词复制到剪贴板；preset 缺失时由 Workspace 弹创建失败 toast。
7. 只读证明：使用面板前后 `git status --porcelain` 无新增改动（除插件目录自身）；Host 扫描失败时面板进入降级启动器而非报错堆栈。
8. 实时信号：在本面板起一个 PM 会话并让它向用户提问/请求审批 →「待我确认」实时出现该会话（`pendingInteraction`），回答/关闭后消失；不刷新页面即可（observable hook）。
9. 安装后按 inputs-dsh §9.4 复核：live `sidebar.panellist` 出现 occupant `openspec-pm-board`（order 21）、`main` 出现同名 key、`curl`/页面 fetch `ping` 返回 `{ok:true}`。

---

## 12. 需要你确认的 6 个决策（确认后我开工）

| # | 决策 | 选项（推荐加粗） | 影响 |
| :-- | :--- | :--- | :--- |
| Q1 | 插件形态 | **A. 独立 bundle + 独立侧边栏入口** / B. 并入 SDD 团队 bundle / C. 子视图 | 安装与回滚粒度、侧边栏图标数量 |
| Q2 | 数据策略 | **A. Host 只读路由 + Python 扫描器（实时）** / B. 预生成静态 JSON（快照，会过期） | "实际进展"是否实时 |
| Q3 | 项目文件改动 | **A. 零改动（扫描器放插件内，import 复用现有 `scan_*` 函数）** / B. 给仓库 `generate_delivery_board.py` 加约 10 行 `--json` 模式，PM 专属逻辑仍放插件内 / C. 在仓库 `scripts/` 新增完整 `generate_pm_board.py` | 仓库整洁度 vs 脚本归属；A 最干净，B 最省扫描代码 |
| Q4 | 状态保真度 | **A. 纯推导 + 置信度角标（不改工作流）** / B. 同时加 durable HITL 标记（改动模板 + 三目录同步） | 首屏"等确认"的可信度 vs 工作流改动成本 |
| Q5 | 面板能力边界 | **A. 只读 + 一键开会话（写入口唯一）** / B. 面板内直接"确认/标记"（写回工件） | 风险与复杂度 |
| Q6 | MVP 范围 / 入口 | **A. 4 区 + 行动队列 + 一键会话 + live 会话活动（P0–P3 约 3 天）**；入口 `openspec-pm-board` order 21「PM 工作台」 / B. 先做「待我确认 + Epic 漏斗」2 区，live 留 P1 / C. 只做静态 2 区 + 无会话动作 | 首版交付时间与风险 |

**默认执行项（你只回"按推荐来"即可）**：Q1=A、Q2=A、Q3=A、Q4=A、Q5=A、Q6=A（含 live 会话）、入口 id `openspec-pm-board` order 21「PM 工作台」、复用 `sdd-pm` preset、数据只读、扫描器绝不传 `--out`、安装到 desktop profile 后重启一次。

---

## 13. 风险与降级

| 风险 | 影响 | 对策 |
| :--- | :--- | :--- |
| 无 durable HITL/心跳（工作流缺口） | "等确认/AI 在做"只能推断 | 置信度角标 + `statusBecause` tooltip + 明确"推断"标签；P2 可选 Option B |
| 需求侧当前数据很少（1 Epic / 0 Story） | 看板显空 | 空态讲清"下一步 + 为什么空"；把 ROADMAP draft Story 展示为"未拆分" |
| 历史数据口径脏 | 误报 | 历史 Epic 豁免 v6 MUST；`未执行 ≠ FAIL`；数据健康区显式列出 |
| 扫描器与交付看板逻辑漂移 | 两处口径不一致 | 复用同一批扫描函数；golden case 对照；PM 专属逻辑隔离在插件 |
| Host 半身改动需重启 DSH | 首次体验中断 | 安装后一次性提示；Client 改动只需刷新；路由未起时面板降级启动器 |
| 契约细节踩坑 | 面板不显示/点击报错 | 已取证：`panellist.id == main.key`；重复 `(kind,path)` 注册抛错；必须显式传 workspaceId；`whenDraftExists` 不吞草稿；`--out` 是唯一写边界 |
| 侧边栏已有 11 个入口 | 拥挤 | order 21 紧邻 SDD 团队、图标语义清晰；后续可评估折叠分组 |
| repoRoot 配置/多工作区 | 面板指向错误仓库 | Config 显式路径 + `ping` 校验 + 面板显示当前 repoRoot；会话按钮只开在 `path === repoRoot` 的工作区 |
| 只读路由安全 | 本机数据暴露 | 仅本地回环、同源标记头、只读、无用户输入拼接、无网络 |
| preset 依赖（sdd-team bundle） | 动作按钮失效 | Workspace 弹 `createFailed` toast；工作区未就绪/抛错时复制提示词兜底；README 写明依赖 |

---

## 附录 A：今天打开看板会看到的 7 行（实测快照）

1. **[PM 待启动 · 最高优先]** `epic-miniprogram-membership-points` → explore：`/req:explore` 产出 `idea.md`；4 个已裁定、10 个待定项要收口。
2. **[被阻塞 5 段]** prototype → arch(OPT) → storymap → story ×N → test-design(MUST)。
3. **[存量告警]** STATUS 说明"待 Phase 9 登记 ROADMAP"已过期（2026-10-28 已登记）。
4. **[Story]** ROADMAP draft 3 条（P0/P0/P1）未拆分，`missingMust: story.md + test-design.md`。
5. **[开发侧]** 0 活跃 change、0 开发中、0 待评审；最近归档 2026-09-08（57 天无新交付）。
6. **[资产]** 3 份 baseline 57 天、design-system 65 天、PRODUCT 66 天；漂移 D1–D4；reviews 0 份。
7. **[数据卫生]** 未归档 story-list ×1、legacy idea 池 ×1、review/test-design 记录 ×0。

## 附录 B：证据文件

- [`inputs-repo.md`](inputs-repo.md)：PM 工作对象、18 条状态规则、17 个 HITL 检查点、Story 23 字段、资产 review 模型、当前快照、JSON 数据契约、跨工具同步义务。
- [`inputs-dsh.md`](inputs-dsh.md)：DSH 路由/面板/会话/打包机制取证（P0 技术验证依据）。
