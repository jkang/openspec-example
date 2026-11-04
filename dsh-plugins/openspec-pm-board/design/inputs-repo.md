# inputs-repo.md · PM 工作台（openspec-pm-board）仓库侧输入与数据模型

> 读者：Lead（宿主 API / 扫描器设计）、UI 分析师、插件实现者
> 事实时点：**2026-11-04 13:41（Asia/Shanghai）**；仓库 HEAD `460696e`（2026-11-02，"chore(learning-sdd): 移除过时可视化文件"）
> 取证方法：只读仓库 + 直接调用现有聚合器 `scripts/generate_delivery_board.py` 的扫描函数（714 行、纯标准库）实测，不依赖对话记忆；关键数字均已复算。
> 本文边界：只回答「项目里真实存在什么数据、语义是什么、能确定性推导出什么状态、宿主该吐什么 JSON」。**不设计 UI/插件机制**（由 UI 分析师 + Lead 负责）。

---

## 0. 结论速览（给 Lead 的 6 条）

1. PM 的工作对象是**「1 个活跃 Epic 的 7 阶段漏斗 + 3 份业务基线 HTML（+ design-system）+ 1 条规划层」**，全部在 `openspec-requirements/` 与 `docs/` 里，天然可扫；开发侧 change/specs 对 PM **只读**。
2. 今天（快照）PM 的真实待办只有 **1 件**：Epic `epic-miniprogram-membership-points` 的 research 已于 2026-10-20 确认，**下一步是 `/req:explore` 产出 `idea.md`**（还有 10 个待澄清项要在 explore 收敛）。
3. 现有交付看板（`docs/governance/delivery_board.html`，2026-11-02 12:12:34 刷新）只聚合了「阶段/漏斗/归档/门禁」的表面计数，**没有「等待 PM 确认 / PM 待启动 / 阻塞」三种语义**，也没有 per-Story 追踪——这正是 PM 工作台要补的部分，且**不需要改任何工作流文件**（纯推导）。
4. 状态推导的最大缺口是：**工作流没有持久化「HITL 已确认」和「AI 正在做」两个状态**。research/idea/test-design/arch-impact 有 sign-off 段落可解析；**prototype、storymap 完全没有持久确认痕迹**；「AI 正在做」在任何文件里都没有心跳（只能靠文件/目录存在性 + mtime 推测，置信度低）。
5. 仓库自身存在 **一批可被看板直接暴露的漂移**：`STATUS.md` 里 explore 行说"待 Phase 9 登记 ROADMAP"，而 ROADMAP 已于 2026-10-28（commit `b67bfab`）登记；`business_process.html` 完全没吸收 Phase 7 的应收支流；`service_blueprint.html` 仍把 `error-handling` 标为「规划中」但主规格已存在；ROADMAP 称"31 个变更已归档"而实际 38 个 change 目录；`openspec/epic-sales-dashboard.story-list.json` 早已全 done 却未按 SOP 归档。
6. 跨工具同步是**硬约束**：任何 skills/commands 改动必须同步 `.trae/`、`.cursor/`、`.agents/` 三处（今天 req 侧 8 个 command + 11 个 prod skill 的 md5 完全一致）；角色文件同步 `.opencode/agents/` + `.cursor/agents/`。若 PM 看板要新增「确认标记」之类的工作流文件改动，必须走这套同步（v6 漏斗那次提交一次改了 63 个文件，就是范式）。

---

## 1. PM 的工作对象清单（work-item taxonomy）

### 1.1 总表

> 「生命周期/状态承载」列 = 该对象的状态**今天实际写在哪里**（不是应该写在哪里）。

| # | 工作对象 | 它代表什么 | 权威来源（SoT） | 负责人 | 生命周期 / 状态承载 |
| :-- | :--- | :--- | :--- | :--- | :--- |
| W1 | **路线图阶段 Phase** | 产品滚动路线的阶段边界（In/Out of Scope、Exit Criteria、Explore Guardrails） | `docs/ROADMAP.md`（front-matter `updated_at: 2026-10-20`；当前阶段标题在 `:56`） | PM 维护（`product-planning` skill）、**用户裁定**（`docs/ROADMAP.md:58` 明确"由用户 2026-10-20 裁定启动"） | `future → current → done`，由**标题文案**承载：`📍 当前阶段` / `✅ 已完成` / `🚀 未来…（未启动）`（`scripts/generate_delivery_board.py:62-80` 按文案解析） |
| W2 | **Phase 内的 Epic 规划条目** | 一个阶段内的 Epic（一句话描述），需求侧只能消费、不得扩范围 | 当前阶段 In Scope 段（`docs/ROADMAP.md:64-70`）、`代表性 Epic/Story 拆分（draft）` 表（`:99-105`）、未来阶段 `代表性 Epic`（`:208`） | PM 起草 + 用户裁定 | 无独立 id 登记表；**靠文本**：In Scope bullet / draft 表行 / `代表性 Epic: \`key\``。是否已"进漏斗"只能与 `openspec-requirements/epics/<key>/` 目录比对 |
| W3 | **需求侧 Epic 工作单元** | 一个 Epic 的全部需求产物内聚目录，PM 的主战场 | `openspec-requirements/epics/<epic-key>/`，状态源 `STATUS.md`（SOP `docs/SOPS/SDD_WORKFLOW.md:307-312` 明确"唯一状态源"；模板 `openspec-requirements/templates/STATUS.md`） | PM（各阶段 skill 更新）+ lead（开发侧归档后回填 done/archived） | `active → all-handoff → all-done → archived`，承载于 `STATUS.md`「Epic 生命周期」4 个 checkbox（模板 `:27-32`；活跃实例 `epics/epic-miniprogram-membership-points/STATUS.md:26-31`） |
| W4 | **research 制品** | 需求调研（只收集，含内嵌访谈原始记录） | `epics/<epic-key>/research.md`（`req-sdd.yaml:17-32`；模板 `templates/research.md`） | PM（`research` skill） | 阶段单元格 `⬜/researching/✅ done` + 文末 `## HITL 确认` checkbox（模板 `:71-74`；实例 `research.md:385-391`） |
| W5 | **idea 制品** | 探索转化：To-Be Process/Journey + 候选 Capabilities + 任务类型路由 | `epics/<epic-key>/idea.md`（`req-sdd.yaml:34-56`） | PM（`explore` skill） | 阶段单元格 + 文末 `## 11. 确认结论 (User Confirmation)` checkbox（模板 `:103-107`；历史实例填写不一致，见 §2.1） |
| W6 | **prototype 制品（Epic 整体）** | 涉及 UI 的 Epic 在拆分前的一次性整体原型（UI 逻辑唯一事实来源） | `epics/<epic-key>/prototypes/*.html`（分支 A）或 `prototypes/working/`（分支 B）（`req-sdd.yaml:125-145`） | PM（`prototype` skill） | 阶段单元格（可记 `n/a` 表示不涉及 UI）；**文件本身无确认标记** |
| W7 | **architecture-impact 制品（OPT）** | 架构影响预估（BC/Capability/四层/数据/渠道/API/安全/非功能） | `epics/<epic-key>/architecture-impact.md`（`req-sdd.yaml:195-218`，`optional: true`） | PM（`arch-impact` skill） | 阶段单元格 `⬜/done/n/a` + 文末 `## 11. HITL 确认 (Sign-off)` 4 个 checkbox（模板 `:66-71`） |
| W8 | **storymap 制品** | 需求拆分 + **覆盖对账**（每个 Epic 承诺项 ≥1 Story 承接） | `epics/<epic-key>/storymap.md`（`req-sdd.yaml:220-236`；模板 `templates/storymap.md`） | PM（`storymap` skill） | 阶段单元格；内部「Story 拆分明细」有 `状态(注1)` 列（模板 `:30-31`，注释说明"仅记录初始 ready，后续由 lead 回填"——**实际从未回填**，见 §2.1） |
| W9 | **story 制品（业务面冻结交付物）** | 交给开发的业务面契约：用户场景 + 业务规则 + E2E 验收（Given/When/Then）+ 治理映射 | `epics/<epic-key>/stories/<story-key>/story.md`（`req-sdd.yaml:260-284`；模板 `templates/story.md`） | PM（`story` skill）；**HITL 确认后冻结** | 文末 `## 交接状态 (Handoff Status)` 两个 checkbox：`[ ] 待开发交接` / `[ ] 已交接 (changeName: …)`（模板 `:81-85`）；实例全部已勾（17/17） |
| W10 | **test-design 制品（MUST）** | 分层测试设计（@unit/@api/@e2e + 追溯矩阵），**handoff 强制前置** | `epics/<epic-key>/stories/<story-key>/test-design.md` 或 Epic 统一 `epics/<epic-key>/test-design.md`（`req-sdd.yaml:286-305`） | PM 主导、QA 提供分层规范（`.opencode/agents/pm.md:23`；`lead.md:24`） | 阶段单元格（v6 新增）；文末 `## 7. HITL 确认 (Sign-off)` 4 个 checkbox（模板 `:62-67`）；**至今 0 份产出**（见 §6） |
| W11 | **Epic 队列** | 跨 change 编排：登记 Story↔changeName 与交付进度 | `openspec/epic-<key>.story-list.json`（SOP `:305-338`；Schema 示例在 `:313-332`） | lead / `handoff` skill 创建；`archive-change` skill 更新 | `planned → in_progress → done`；全部 done 后**应归档**为 `openspec/changes/archive/YYYY-MM-DD-epic-<key>.story-list.json`（SOP `:337-338`） |
| W12 | **开发侧 change** | proposal →（prototype）→ specs → design → tasks → verify → review → sync → archive | `openspec/changes/<name>/`（`openspec/schemas/spec-driven.yaml:4-167`；archive 在 `openspec/changes/archive/YYYY-MM-DD-<name>/`） | lead / engineer / qa / reviewer；**PM 只读** | 无显式 phase 字段，靠制品存在性：有 `tasks.md`=开发中，有 `proposal/design`=设计中，无 proposal=探索（`generate_delivery_board.py:208-224`）；`.openspec.yaml` 有 `created` 日期 |
| W13 | **verify 门禁证据** | Hard Gates（schema/node/python/frontend build）+ Soft Gates（E2E cucumber、覆盖完整性） | `<changeRoot>/verify.md`（`verify` skill；模板 `openspec/templates/verify.md`） | qa | 值：`PENDING/PASS/FAIL`、`通过（72 场景 / 382 步）`；解析器兼容列表式与表格式（`generate_delivery_board.py:236-277`） |
| W14 | **技术评审记录** | reviewer 五维审计：P0–P3、修复计划、风险接受 | change 级 `review.md`；Epic/全仓级 `docs/governance/reviews/YYYY-MM-DD-<scope>.md`（SOP `:243-259`） | reviewer；P0/P1 由用户裁决 | Verdict + P0/P1 门禁（禁止 sync/archive）；**今天 0 份**（38 个归档 change 均无 `review.md`；`docs/governance/reviews/` 只有 `.gitkeep`） |
| W15 | **需求侧 Epic 归档** | Epic 完整交付记录（research/idea/prototypes/storymap/stories） | `openspec-requirements/archive/YYYY-MM-DD-<epic-key>/`（SOP `:78-83`） | lead 确认后执行 | 目录存在即 archived；`STATUS.md`「archived」checkbox + mtime/提交日期 |
| W16 | **业务知识资产（4 类）** | 系统的认知沉淀，PM 的「业务评审」客体 | ①`docs/baseline/service_blueprint.html` ②`business_process.html` ③`domain_model.html` ④`docs/baseline/design-system/`（README + guidelines + src tokens）（AGENTS.md `:36-38`；`config.yaml:21-36`） | PM + baseline skills（blueprint/process-flow/domain-model/render）；**Baseline Sync 由 lead 触发** | `Last Updated: YYYY-MM-DD`（三份 HTML 内嵌，解析点见 §5.2）；design-system **无日期**（只能 mtime）；capability 状态「已落地/规划中/横切支撑」 |
| W17 | **规划层维护产物** | 产品定位与路线图的滚动更新 | `docs/PRODUCT.md`（front-matter `updated_at: 2026-08-30`）、`docs/ROADMAP.md`（`:4`） | PM（`product-vision` / `product-planning` skill） | front-matter `updated_at` + 正文"最后刷新时间"（ROADMAP `:16`）；**无审批人/确认记录** |
| W18 | **治理评审 / 产品现状评估** | 产品专家评审结论、技术评审归档 | ① ROADMAP「现状评估 (Product Expert Review)」表（`:34-52`，5 行价值承诺）② `docs/governance/reviews/`（空）③ `docs/governance/delivery_board.html`（生成物） | PM（①）、reviewer（②）、lead（③） | ① 只有 ✅/差距文案，无日期/签署；② 目录空；③ 生成时间戳在 HTML 头部 |
| W19 | **想法池（legacy）** | 交付侧零星 idea（早期版本遗留） | 期望路径 `openspec/changes/ideas/idea.md`（`generate_delivery_board.py:187-194`）——**实际不存在**；真实躺着一份 legacy `openspec/idea.md`（优惠券想法，无状态/无 owner） | 无明确 owner | 无状态；建议看板显式标 `n/a（路径不存在）` 而不是静默 0 |
| W20 | **验收证据** | `/opsx:acceptance` 的产品验收计划与证据 | `.acceptances/<change-name>/<ts>-<slug>/result.json` + `assets/`（`.agents/commands/opsx/acceptance.md`） | lead + acceptance-runner + qa 复核 | **仓库无 `.acceptances/` 目录**（首轮会自动创建并 gitignore）；对 PM 看板属"未执行证据"，当前不参与 PM 状态 |

### 1.2 三处「spec」语义必须分清（否则看板会把 PM 的活和开发的活混在一起）

| 术语 | 谁产出 | 在哪 | 内容 | 对 PM 看板的意义 |
| :--- | :--- | :--- | :--- | :--- |
| **story.md（需求侧交付物）** | PM | `openspec-requirements/epics/<epic>/stories/<story>/story.md` | 纯业务面：用户场景/业务规则/E2E 验收（映射 L1/L2 + `SB-STAGE-*`/`SB-CUSTOMER-*`）/治理映射；**不含行为规格**（`openspec-requirements/README.md:63-69`、`config.yaml:73-81`、`req-sdd.yaml:260-284`） | PM 看板的「Story spec 就绪」= story.md 存在且已确认 |
| **test-design.md（需求侧测试设计）** | PM（QA 规范） | 同目录 `test-design.md`（或 Epic 统一） | 分层用例清单 + 追溯矩阵 + E2E 命名空间；**只做设计不写测试代码**（`req-sdd.yaml:286-305`） | 「可交接」的必要条件（MUST），看板必须单列缺失项 |
| **specs/（开发侧行为规格）** | 开发侧（engineer/lead） | `openspec/changes/<change>/specs/<capability>/spec.md` → Spec Sync 合并到 `openspec/specs/<capability>/spec.md` | Gherkin 行为规格 + `@unit/@api/@e2e` 标签 + 治理/蓝图锚点（`openspec/schemas/spec-driven.yaml:57-104`） | **不是 PM 的工作对象**；只在 handoff 后作为「开发已启动」的证明出现 |

补充：当前 `openspec/specs/` 有 **19 个主规格目录**，`domain_model.html` 有 **18 个 `cap-*` capability 节点**、**8 个 `bc-*` Bounded Context**（实测：`grep -o "id: 'bc-..."`、`grep -o "cap-..."`）。两个口径相差 1（主规格多出 `data-persistence` 等目录，其 capability 归属需人工确认），**需要治理口径确认**——这本身是 PM 资产评审的一个候选发现（见 §5.4）。

### 1.3 对象关系（文字版，供宿主建图谱）

```
ROADMAP Phase (W1)
  └─ Phase.InScope Epic 条目 (W2)  ──登记/建目录──▶  需求侧 Epic (W3)
        └─ 漏斗 7 阶段：research(W4) → idea(W5) → prototype(W6) → arch-impact(W7, OPT)
                                              → storymap(W8) → story(W9) → test-design(W10, MUST)
        └─ handoff ──▶ Epic 队列 story-list.json (W11) + 开发侧 change (W12)
                                                      ├─ verify.md (W13)
                                                      ├─ review.md (W14)
                                                      └─ archive/ (W12 开发归档)
        全部 Story done ──▶ 需求侧 Epic archive (W15) ──▶ Baseline Sync ──▶ 知识资产 (W16) / ROADMAP 更新 (W17)
```

---

## 2. 状态推导矩阵

### 2.1 制品里真实出现的状态值（词表 + 实例证据）

| 载体 | 出现过的值（原文） | 证据 |
| :--- | :--- | :--- |
| `STATUS.md` 阶段单元格 | `✅ done`、`⬜`、`🔄 部分 done`、`✅ all done`、`✅ all-handoff`、`n/a`（模板约定） | 活跃：`epics/epic-miniprogram-membership-points/STATUS.md:10-16`（`✅ done` + 6×`⬜`）；归档：`archive/2026-08-31-epic-stock-insight/STATUS.md`（`🔄 部分 done`）、`archive/2026-09-08-epic-miniprogram-channel/STATUS.md`（`✅ all-handoff`）、`archive/2026-08-30-epic-sales-dashboard/STATUS.md`（`✅ all done`）；模板 `templates/STATUS.md:10-16` 约定 `researching/exploring/...`、`done`、`n/a` |
| `STATUS.md` Story 行 | `ready`（模板）、`handoff`（SOP 定义）、`dev-in-progress`（SOP 定义）、`done` | 模板 `:22-23`、`docs/SOPS/SDD_WORKFLOW.md:309`；实际只见 `done`（17 个归档 Story）与 `—`（活跃 Epic `:22`="待 storymap 产出"） |
| `STATUS.md`「开发侧归档」列 | `✅（2026-09-08）`、`✅`（无日期）、`⬜`（漏填） | 归档 AR/channel/shopping 带日期；account-system 无日期；**sales-dashboard 全 `⬜` 但同表状态为 done**（`archive/2026-08-30-epic-sales-dashboard/STATUS.md`）→ 不可信列 |
| `STATUS.md` 生命周期 | 4 个 checkbox（active/all-handoff/all-done/archived） | 模板 `:27-32`；活跃实例只勾 active；归档实例 4 项全勾 |
| `storymap.md` 状态列 | `ready`、`handoff（changeName: …）`、`planned`（3 种写法并存） | 6 份归档 storymap 实测：AR/channel/shopping/stock = 全部 `ready`；sales-dashboard = `handoff（change: …）`；account-system = 3×`planned` + 1×`handoff（changeName: …）`；模板 `:30-31` + 注1 `:66` 说明"仅初始 ready，后续由 lead 回填" |
| `story.md` 交接状态 | `[x] 待开发交接 (openspec-handoff)`、`[x] 已交接 (changeName: \`...\` 记录于 openspec/epic-<key>.story-list.json)` | 模板 `:81-85`；17 个归档 story 全部已勾且带 changeName |
| `story-list.json` | `status: planned/in_progress/done`、`changeName`、`priority`、`updatedAt` | 活跃文件 `openspec/epic-sales-dashboard.story-list.json`（2/2 done，**未按 SOP 归档**）；7 份归档文件全部 done（`openspec/changes/archive/*.story-list.json`），共 22 个 Story 条目 |
| ROADMAP 阶段 | `📍 当前阶段`、`✅ 已完成`、`🚀 未来…（未启动）` | `docs/ROADMAP.md:56/113/166/191/203`；解析器 `generate_delivery_board.py:62-80` |
| 开发侧 change | 无状态字段；phase 由制品推断（explore/design/coding） | `generate_delivery_board.py:208-224`；`.openspec.yaml` 只有 `schema` + `created` |
| verify 门禁 | `PASS/FAIL`、`通过（72 场景 / 382 步）`、`未执行` | `verify` skill 模板；实例 `openspec/changes/archive/2026-09-08-story-ar-dashboard/verify.md`（Hard Gates 4 项 PASS + E2E `72 scenarios / 382 steps`） |
| review | `Verdict` + `P0–P3` + `Risk Acceptance` | SOP `:243-259`；`.agents/commands/opsx/review.md`；**仓库 0 份实例** |
| 业务基线 | `Last Updated: 2026-09-08`、capability `已落地/规划中/横切支撑` | `service_blueprint.html:475`、`business_process.html:837`、`domain_model.html:503`；`service_blueprint.html:1113-1120`、`:1197-1203`、图例 `:496` |
| 规划层 | front-matter `updated_at: 2026-10-20`、正文 `最后刷新时间: 2026-10-20` | `ROADMAP.md:4`、`:16`；PRODUCT.md `:4` = `2026-08-30` |

### 2.2 看板标准状态（9 态 + 1 兜底）

| 看板状态 | key | 语义（对 PM 的意义） | 决定性来源 |
| :--- | :--- | :--- | :--- |
| AI 正在做 | `ai-in-progress` | 某阶段制品正在被生成/改写，PM 无需动作但要等 | **无持久心跳**，仅启发式（见 R18） |
| 产出已就绪 · 等待 PM 确认 | `waiting-confirm` | 阶段制品已存在、HITL 还没发生 | 制品存在 + sign-off 未勾 / 下游制品缺失 |
| PM 待启动（等 PM 行动） | `pm-todo` | 轮到 PM 干活（跑下一个 `/req:` 阶段，或补规划） | 前序阶段 confirmed/done + 本阶段无制品 |
| 已确认 | `confirmed` | HITL 已过，等下一步启动 | sign-off 已勾 / STATUS 说明列含确认字样 |
| 已交接开发 | `handoff-done` | Story 已交给开发侧（change 已建或即将建） | story 交接状态 + story-list `in_progress`/changeName |
| 开发中 | `dev-in-progress` | change 在开发侧活跃（设计中/开发中/验证中） | `openspec/changes/<name>/` 存在 + 制品阶段 |
| 已完成 | `done` | Story/Epic/change 闭环 | 归档目录 + verify（+ story-list done） |
| 不适用 | `na` | 该阶段显式跳过（如无 UI 的 prototype、无架构影响的 arch no-op） | **只接受显式 n/a / no-op 文本，不推断** |
| 阻塞 | `blocked` | 有阻断项（门禁失败、MUST 产物缺失、规划依据缺失、状态自相矛盾） | 见 R12–R16 |
| （兜底）未知 | `unknown` | 数据源缺失/解析失败，看板必须标灰并进 `sourceHealth` | 解析异常 |

### 2.3 确定性规则集（R01–R18，含置信度）

> 记号：`E` = `openspec-requirements/epics/<epic-key>/`；`cell(stage)` = STATUS.md 阶段表单元格；`art(stage)` = 制品存在性；`sig(stage)` = 该阶段 sign-off 段落状态。
> 制品映射（与 `generate_delivery_board.py:150-163` 一致）：research=`research.md`、explore=`idea.md`、prototype=`prototypes/`（含 `working/`）、arch=`architecture-impact.md`、storymap=`storymap.md`、stories=`stories/*/story.md`、test-design=`stories/*/test-design.md` 或 `E/test-design.md`。

| ID | 规则（if → then） | 产出状态 | 置信度 | 备注 / 歧义 |
| :-- | :--- | :--- | :--- | :--- |
| R01 | `cell(stage)` 含 `n/a`（词边界） → | `na` | **高** | 只认显式 n/a；`arch` 的 no-op 若写在 `architecture-impact.md` 里也视为 done 而非 n/a |
| R02 | `cell(stage)` 严格匹配 `^\s*(✅\|✓)\s*(all\s+)done\b` 或 `^done$`（大小写不敏感） → | `done` | **高** | 该阶段状态以 STATUS 为权威（SOP `:307-312`） |
| R03 | `cell(stage)` 含 `部分 done`/`partial`/`🔄` → | `in-progress`（AI 正在做）或 `waiting-confirm`（若有制品且签名未勾） | **中** | 现有解析器把"部分 done"误判为 done（`generate_delivery_board.py:168-170` 只查 `done` 子串）——**必须重写** |
| R04 | `art(stage)` 存在 且 `cell(stage)` 未 done 且 `art(next_stage)` 不存在 且 `sig(stage)` 未勾（该阶段有 sign-off 段落时） → | `waiting-confirm` | **高**（research/idea/arch/test-design，有 sign-off 段）；**中**（story：story.md 无 sign-off，只有交接勾选） | 最核心的"等 PM 确认"判定 |
| R05 | `art(stage)` 存在 且 `sig(stage)` **已勾** 且 `art(next_stage)` 不存在 → | `confirmed`（已确认，PM 尚未启动下一步） | **高**（有 sign-off 段）；**中**（靠 STATUS 说明列自由文本，如 `并经 HITL 确认`，见 `research.md:10` 的写法） | 与 R04 的差别只在签名段是否已勾 |
| R06 | 前序阶段 ∈ {done, confirmed, na} 且 `art(stage)` 不存在 且 `cell(stage)` 为空/`⬜` → | `pm-todo`（PM 待启动） | **高** | 活跃 Epic 的 explore 今天即此态 |
| R07 | Epic 目录不存在，但该 Epic key 出现在 ROADMAP 当前阶段 In Scope/draft 表 → | `pm-todo`（PM 待启动：先跑 research 建目录） | **中** | 需要把 ROADMAP 文本里的 Epic key 抽出来（当前 ROADMAP 只在 draft 表里写 key，`:103-105`） |
| R08 | Story `交接状态` 已勾「已交接」且 `changeName` 非空 且 该 change 既不在活跃目录也不在 archive → | `handoff-done`（交接完成、开发未开始/未建目录） | **高** | 现存 17/17 均能对上 archive |
| R09 | `openspec/changes/<changeName>/` 存在（活跃）且无 `tasks.md`，有 `proposal.md`/`design.md` → | `dev-in-progress` + `devPhase=design` | **高** | change 名匹配 story changeName；匹配不上一律降级为 `unknown` 并告警 |
| R10 | 活跃 change 有 `tasks.md` → | `dev-in-progress` + `devPhase=coding`；有 `verify.md` 且 Hard Gates 全 PASS → `devPhase=verified` | **高** | `generate_delivery_board.py:214-222` 的现有推断可复用，但需补 verify/review 阶段 |
| R11 | `openspec/changes/archive/<YYYY-MM-DD>-<changeName>/` 存在 → | `done` | **高** | 归档日期可直接作为完成日期 |
| R12 | Story 状态 `handoff/dev-in-progress` 且 `test-design.md` 缺失 → | `blocked`（需求侧 MUST 前置缺失，禁止 handoff/交接不成立） | **高** | v6 前历史 Epic 全部如此；**历史 Epic 不得显示为阻塞**，规则应限定"仅对 active Epic"（见 §5.4 兼容性） |
| R13 | change 的 `verify.md` 任一 Hard Gate = FAIL → | `blocked`（禁止 sync/archive） | **高** | 今天 0 例 FAIL（38 个归档 verify.md 实测无 `FAIL`）；但注意 26/38 才算"4 项 Hard Gate 全 PASS"，其余 12 个是旧格式/未记录（见 §6.5）——**不能把"未执行"误判为阻塞** |
| R14 | `openspec/epic-<key>.story-list.json` 中 Story 为 `in_progress` 但其 change 已归档（孤儿）→ | `blocked`（状态漂移，需对账修复） | **高** | `archive-change` skill：`SKILL.md:153` 要求原子化更新；`qa.md:38` 有孤儿检测职责 |
| R15 | Epic 目录存在但 Epic key 不在 ROADMAP（规划依据缺失）→ | `blocked`（规划层门禁） | **中** | 历史实例：`research.md:18-29` 记录过"调研时 ROADMAP 无 Phase 9"的缺口，2026-10-20 已闭环；这类只能靠文本匹配判 |
| R16 | `STATUS.md` 的说明与 ROADMAP 矛盾（例：说明写"待 Phase 9 登记 ROADMAP 后启动"，但 ROADMAP 已登记）→ | `warning`（不阻塞，但看板必须标） | **中** | 今天真实存在（`STATUS.md:11` vs `ROADMAP.md:56-58`） |
| R17 | 阶段制品存在但无任何 sign-off 段可查（prototype/storymap）且下游制品不存在 → | `waiting-confirm`（标 `confidence=medium`） | **中** | 无法区分"等确认"与"确认了但还没开干"（见 §2.5） |
| R18 | "AI 正在做"：`art(stage)` 不存在但 `cell(stage)` 含 `researching/exploring/prototyping/arching/splitting/storying/test-designing`（模板允许值）→ `ai-in-progress`；或 `art(stage)` 存在但未提交（`git status --porcelain E/` 非空）且 mtime < 24h → `ai-in-progress` | `ai-in-progress` | **低** | 模板允许这些值（`templates/STATUS.md:10-16`），但**历史从未有人写过**；无 git 权限时只能靠 mtime，必须标"推测" |

### 2.4 规则优先级（避免一条记录多状态打架）

```
1) R01 n/a 显式         → 直接定
2) R12–R16 阻塞/告警     → 先报阻塞，再报其他（阻塞是 PM 第一优先）
3) R18 AI 正在做         → 仅在无制品时作为"进行中"提示（置信度低，可覆盖为 pm-todo 的副标签）
4) R04/R05/R17 确认相关   → 制品存在时的确认态判定
5) R02/R03 单元格 done    → 完成态
6) R06/R07 PM 待启动      → 无制品时的行动态
7) R08–R11 交付侧         → Story/change 维度
8) 其余 → unknown + sourceHealth
```

### 2.5 明确「推不准」的三种情形（必须让 UI 显式表达不确定性）

1. **prototype / storymap 的「等待确认 vs 已确认」不可区分**：两者没有 sign-off 段落。原型文件存在 + storymap 不存在，可能是"等 PM 看原型"，也可能是"PM 已口头确认、准备开拆分"。置信度封顶 `medium`。
2. **「AI 正在做」没有心跳**：没有任何文件记录"某阶段进行中"；STATUS 模板虽允许 `researching` 等值，但 6 份历史 STATUS 与 1 份活跃 STATUS 从未使用。只能靠 mtime/git dirty 做弱推测，**必须标 low 且 UI 用虚线/问号**。
3. **HITL 被"授权跳过"的情况不可机器判定**：历史出现 `lead 已授权跳过 HITL`（stock-insight 的 stage 说明）、`用户已授权全程自主`（AR/shopping 的 stage 说明、verify.md）——这类是"未确认但被允许"，语义上既非 `waiting-confirm` 也非 `confirmed`。建议看板新增副标签 `hitl-waived`（置信度 low，靠关键词 `授权|跳过 HITL|全程自主` 命中），不要归入 `confirmed`。

---

## 3. HITL 检查点映射

### 3.1 检查点总表

| # | 检查点（来源） | 决策人 | 看板应挂在哪一行 | 今天文件里的可检测信号 | 是否可见 |
| :-- | :--- | :--- | :--- | :--- | :--- |
| H1 | **research 确认**（SOP `:57`；`pm.md:36`；research skill step 7） | 用户（经 lead 呈报） | Epic × research 阶段行 | `research.md` 文末 `## HITL 确认` checkpoint（调研实例 `:385-391` 4 项已勾；模板 `:71-74`） | ✅ 可见（中-高） |
| H2 | **explore/idea 确认**（SOP `:58`；`pm.md:50`） | 用户 | Epic × explore 阶段行 | `idea.md` 文末 `## 11. 确认结论` 的 `[ ] 已与用户确认…`（模板 `:103-107`）——**填写/勾选不一致**：6 份归档 idea 中 AR/channel 勾 `[x]`，account/sales/stock/shopping 仍 `[ ]` | ◐ 部分可见（中） |
| H3 | **prototype 确认（Epic 整体）**（SOP `:59`；`pm.md:56`） | 用户 | Epic × prototype 阶段行 | **无任何持久标记**（只有 `prototypes/*.html` 文件存在） | ❌ 不可见 |
| H4 | **arch-impact 确认**（SOP `:60`；模板 `architecture-impact.md:66-71`） | 用户 | Epic × arch 阶段行 | `architecture-impact.md` 文末 `## 11. HITL 确认 (Sign-off)` 4 checkbox | ✅ 可见（文件存在时；今天无实例） |
| H5 | **storymap 确认（覆盖对账）**（SOP `:61`；`pm.md:63`） | 用户 | Epic × storymap 阶段行 | **无 sign-off 段落**；只能看文件存在 + 覆盖对账表是否有 ❌ | ❌ 不可见（覆盖对账可部分机器校验：❌ 计数） |
| H6 | **story 验收标准确认**（SOP `:62`；`pm.md:70-71`） | 用户 | Story 行 | `story.md` 无 sign-off 段；间接证据 = `交接状态` 已勾（隐含"确认后才可能交接"） | ◐ 部分可见（中-低） |
| H7 | **test-design 确认（MUST）**（SOP `:63`；`pm.md:87`；模板 `:62-67`） | 用户 | Story 行 / test-design 阶段行 | `test-design.md` §7 4 个 checkbox | ✅ 可见（文件存在时；今天无实例） |
| H8 | **handoff 放行**（SOP `:65-76`；`lead.md:27`；handoff skill） | lead（对用户负责）；前置=story+test-design 均确认 | Story 行 → `已交接开发` | `story.md` 交接状态 + `story-list.json`（changeName/in_progress）+ `STATUS.md` Story 行=handoff | ✅ 可见（高） |
| H9 | **Epic 队列登记**（SOP `:74`） | lead / handoff skill | Epic 行 | `openspec/epic-<key>.story-list.json` 创建 + `planned → in_progress` | ✅ 可见（高） |
| H10 | **开发侧原型确认**（直走任务 `/opsx:prototype`，SOP `:193-199`） | 用户 | （不在 PM 主看板；可作为"开发侧产物"副行） | 无持久标记（同 H3） | ❌ 不可见 |
| H11 | **verify 门禁通过**（verify skill；`qa.md:28-34`） | qa 执行、PM 只读关注 | change 行 / Story 行门禁列 | `verify.md` Hard/Soft Gates 值 | ✅ 可见（高） |
| H12 | **review P0/P1 风险裁决**（SOP `:243-259`；`lead.md:30`） | 用户（修复/风险接受/回退） | change 行 / Epic 收尾行 | `review.md` 的 Verdict + Risk Acceptance（P1 接受需记录接受人/期限/复审触发） | ❌ 今天不可见（0 份 review.md；`docs/governance/reviews/` 空） |
| H13 | **acceptance 计划确认**（acceptance command；`lead.md:29`） | 用户（计划冻结） | change 行 | `.acceptances/<change>/…/result.json` 的 `plan[]`（首轮才创建，整个目录不存在） | ❌ 不可见 |
| H14 | **Epic 归档放行**（SOP `:78-83`；`lead.md:40`） | lead 确认 + 用户 | Epic 行 | `openspec-requirements/archive/YYYY-MM-DD-<key>/` 存在 + STATUS archived checkbox | ✅ 可见（高） |
| H15 | **Baseline Sync 确认**（SOP `:270-291`；`AGENTS.md:28` 列为 HITL） | 用户（确认回流结果） | 资产行 / Epic 收尾行 | **只有三份 HTML 的 `Last Updated` 日期变化**；无 sync 记录、无 no-op 记录 | ◐ 弱可见（只能看日期是否跳动） |
| H16 | **Roadmap 更新确认**（SOP `:81`；`product-planning` skill Guardrails） | 用户 | Phase 行 | `ROADMAP.md` front-matter `updated_at` + 正文日期 | ◐ 弱可见（无审批人） |
| H17 | **Phase 启动裁定**（`ROADMAP.md:58`"由用户 2026-10-20 裁定启动"） | 用户 | Phase 行 | 仅 ROADMAP 正文一句话 + `research.md` Q1「已裁定」行（`:250`） | ◐ 弱可见（自由文本） |

### 3.2 当前"不可见"的检查点 + 最便宜的持久 marker（不改流程范围）

> 原则：**先加"记录行"，不引入新阶段/新门禁**；任何模板/skill 改动都要付 §7.3 的跨工具同步成本。

| 检查点 | 最便宜 marker（建议） | 成本 | 影响面 |
| :--- | :--- | :--- | :--- |
| H3 prototype | 在 `STATUS.md` 阶段表新增一列 `HITL 确认`（值：`⬜` / `2026-10-20 ✅` / `n/a`）。**只加列，不改表意**；7 个 prod skill 里只需 `prototype` 写这一格 | 低 | `templates/STATUS.md` + 7×(skill+command) 三目录同步 + 活跃 Epic STATUS |
| H5 storymap | 同上（复用同一列） | 低（与 H3 同批） | 同上 |
| H3/H5 零改动替代 | 看板侧只展示 `产出已就绪 · 待确认(推断)` 并附"无 durable 记录"角标——**零改动、零风险**，但永远无法回答"确认过没有" | 0 | 无 |
| H6 story | 在 `story.md` 的 `## 交接状态` 前插一行 `- [x] 验收标准已确认（YYYY-MM-DD，HITL）`（模板 `:81-85` 处） | 低 | `templates/story.md` + `handoff`/`story` skill 三目录 |
| H12 review | 直接用 SOP 已定义的 `review.md` + `docs/governance/reviews/`，不新增文件类型；只需在 reviewer 输出模板里固定 `Verdict: PASS/WARN/FAIL` 行首格式 | 0（已有规范，只是没执行） | `.opencode/agents/reviewer.md` + review command |
| H15 baseline sync | 在三份 baseline HTML 的 header meta 里增加 `Synced: 2026-11-04 (epic-<key>, no-op)` 一行；`blueprint`/`process-flow`/`domain-model` skill 各加一句"更新 meta" | 中 | 3 baseline skill（三目录）+ 3 HTML + SOP 8.2 一句话 |
| H16 ROADMAP | ROADMAP front-matter 增 `confirmed_by` / `confirmed_at` 两字段 | 低 | ROADMAP 模板无人管（单文件）+ product-planning skill 三目录 |
| H2/H4/H7 | 已存在 sign-off 段，只需**统一格式**（固定 `- [x] 已确认 (YYYY-MM-DD)` 一行），让解析器可靠 | 低 | 对应 4 个模板 + 4 个 skill 三目录 |
| H18（方案 C 专属，非现有检查点） | 若采用方案 C（§7.2），在 `epics/<key>/board-state.json` 里写 `hitl: {stage: {confirmed: bool, at: date, by: string}}` | 中-高 | 7 个 stage skill + archive skill + 模板（新文件类型） |

### 3.3 检测实现建议（给宿主扫描器）

- **sign-off 解析**：只认 `- [x]` / `- [ ]` 行 + 其前缀标题（`## HITL 确认`、`## 11. 确认结论`、`## 7. HITL 确认 (Sign-off)`、`## 11. HITL 确认 (Sign-off)`），不解析自然语言。
- **waiver 关键词**：`授权跳过 HITL` / `已授权全程自主` / `lead 已授权`（出现在 stage 说明列或 verify.md 结论段）→ 打 `hitl-waived` 副标签，不视为 confirmed。
- **兜底**：sign-off 段存在但 0 个 checkbox → 视为"无 sign-off 结构"，降级到 medium 推断，并写入 `warnings[]`。

---

## 4. Story spec 追踪模型

### 4.1 端到端链路与写入者

```
ROADMAP draft 表（docs/ROADMAP.md:101-105）
   └─ /req:storymap → storymap.md 拆分明细（状态列=ready，§4.4 证明其不可信）
        └─ /req:story → stories/<story-key>/story.md（业务面冻结；交接状态 checkbox）
             └─ /req:test-design → test-design.md（MUST；§7 sign-off）
                  └─ /req:handoff → openspec/changes/<changeName>/ + proposal.md + epic-<key>.story-list.json(in_progress)
                       └─ 开发侧 apply → verify.md（Hard/Soft Gates）→ review.md（可选/门禁）
                            └─ /opsx:archive → openspec/changes/archive/YYYY-MM-DD-<changeName>/
                                 └─ 回填：story.md 已交接✅、STATUS.md Story=done+归档✅、story-list.json done
                                      └─ 全 done → story-list.json 归档 + 需求侧 Epic 归档 + Baseline Sync + Roadmap 更新
```

### 4.2 看板每个 Story 行应显示的字段（23 字段，含来源）

| 字段 | 类型 | 来源（文件/解析点） | 置信度 |
| :--- | :--- | :--- | :--- |
| `storyId` | string | `STATUS.md` Story 表第 1 列；storymap 拆分明细第 1 列；story.md `Story Key:` 行 | 高 |
| `epicKey` | string | 目录名 `epics/<epic-key>/` | 高 |
| `title` | string | storymap 第 2 列「标题」；story.md `# Story:` 行 | 高 |
| `source` | enum | `roadmap-draft`（仅存在于 ROADMAP draft 表）/ `storymap`（已拆分）/ `status`（已进 STATUS 表） | 高 |
| `priority` | string | storymap 第 7 列；story.md 头部 `优先级:`；story-list.json `priority` | 高 |
| `dependsOn` | string[] | storymap 第 6 列「依赖」；story.md 头部 `依赖:` | 高 |
| `stage` | enum | 由 §2 规则推导 | 中-高 |
| `storyArtifact` | bool | `stories/<story-key>/story.md` 存在 | 高 |
| `testDesignArtifact` | bool | `stories/<story-key>/test-design.md` 或 `epics/<key>/test-design.md` 存在 | 高 |
| `testDesignSignoff` | bool\|null | test-design.md §7 checkbox 全勾 | 高 |
| `storyConfirm` | bool\|null | story.md 无 sign-off → `null`（未知）；交接 checkbox 已勾 → 视作隐式确认 | 低 |
| `coverage` | object | storymap「覆盖对账」表中该 Story 承接的行数 / 是否有 ❌ | 中（表格解析） |
| `handoffStatus` | enum | `ready/handoff/dev-in-progress/done`（STATUS Story 行；SOP `:309`） | 高 |
| `changeName` | string\|null | STATUS Story 行第 3 列；story-list.json；story.md 交接状态行内反引号 | 高 |
| `changeExists` | bool | `openspec/changes/<changeName>/`（活跃） | 高 |
| `changePhase` | enum | 制品推断：`none/proposal/specs/design/tasks/verify/review/synced` | 高 |
| `gateResult` | object | `verify.md` 解析（schema/node/python/frontend/e2e/conclusion） | 高 |
| `reviewResult` | object\|null | `review.md`（Verdict + P0/P1 计数）——今天恒 `null` | 高 |
| `devArchiveDate` | string\|null | `openspec/changes/archive/` 下同名目录的日期前缀 | 高 |
| `epicStoryListStatus` | enum | story-list.json 中该 Story 的 `status` | 高 |
| `missingMust` | string[] | 见 §4.3 | 高 |
| `nextAction` | object | 见 §4.3（含 command + 是否 HITL） | 中-高 |
| `evidence` | EvidenceRef[] | 上述每一项的原始路径 + 行号/正则 | — |

### 4.3 readiness / 缺失计算（确定性）

```text
requiredForHandoff = [story.md, test-design.md]              // req-sdd.yaml:332-343 handoff.requires
uiGate             = (epic 涉及 UI) ? prototypes/*.html ≥1 : n/a
blocking           = missing(requiredForHandoff) 或 (uiGate 命中且无原型) 或 (storyConfirm==false 且未 waiver)
ready              = storyArtifact && testDesignArtifact && uiGateOK && 无 open-blocker
nextAction         = ready ? "req:handoff" : missing 的第一项对应命令
```

- 「Epic 是否涉及 UI」**无显式字段**：可用 `prototypes/` 是否存在 + ROADMAP In Scope 文本里的 UI 关键词（页面/小程序/后台/看板）做推断，置信度 **中**。历史 6 个 Epic 全部有原型，推断可用。
- `test-design.md` 是 v6（2026-11-02 提交 `f8c98b4`）才加入的 MUST，**历史 17/17 Story 都没有**——看板必须区分"历史豁免"（Epic 已归档）与"当前缺失"（活跃 Epic），否则会把 7 个已完成 Epic 全标红。

### 4.4 历史审计（为什么不能信 storymap 状态列）

- 17 份归档 `story.md`：**17/17** 勾选「已交接」且带 `changeName`（`re.search('## 交接状态')` 实测）。
- 6 份归档 `storymap.md` 的状态列写法：`ready`×11、`planned`×3、`handoff（…）`×3（共 17 行 = 17 个 Story）；**即使 Epic 已归档、Story 已 done，状态仍停在 ready/planned**。原因见模板注1（`templates/storymap.md:66`）："仅记录初始 ready，后续由 lead 回填"——实际未回填。
- 结论：**权威 Story 状态链 = `STATUS.md` Story 表 → `story-list.json` → `openspec/changes/archive/`**；`storymap.md` 状态列只能作为"拆分时快照"，看板不得用它推导。
- 7 份归档 `story-list.json`（20 Story）+ 1 份未归档 `openspec/epic-sales-dashboard.story-list.json`（2 Story，全 done）共 **22 条** Story 记录；其中 `epic-advanced-coupon-system`（2）与 `epic-order-lifecycle`（3）只有开发侧记录、无需求侧归档目录 → 说明「story-list 是需求侧产物、但历史上有 5 个 Story 的需求侧记录缺失（v5 之前先做交付侧）」这一历史口径差异。

---

## 5. 业务知识资产 review 模型

### 5.1 "review 业务知识资产"在本项目 = 4 件具体动作

| 动作 | 指令/执行者 | 产物 | 是否可检测 |
| :--- | :--- | :--- | :--- |
| **A. Baseline Sync（Epic 级）** | `/opsx:baseline/sync`（lead 触发；blueprint/process-flow/domain-model/render 四技能） | 回写三份 baseline HTML 或显式 no-op 记录 | 只可检测 `Last Updated` 是否变化；**no-op 记录不落盘**（skill 要求"输出结构化同步摘要"，但仓库无存放处） |
| **B. Design System 一致性评审** | prototype 前置 + baseline sync 的一部分（`brand-design-system` 工具 / `design-system` 制品，`req-sdd.yaml:147-167`） | `docs/baseline/design-system/`（README + Guidelines + src tokens + App.tsx 参考实现） | 只能看目录 mtime；无版本、无 `Last Updated` |
| **C. 产品专家评审（Product Expert Review）** | PM（`product-vision`/`product-planning` skill；ROADMAP 维护动作） | `docs/ROADMAP.md` 的「现状评估」表（`:34-52`）：5 条价值承诺 × 现状 × 差距 | 可检测表存在与行内容；**无评审日期/签署** |
| **D. 治理评审归档** | reviewer `/opsx:review epic:<key>`（SOP `:251`） | `docs/governance/reviews/YYYY-MM-DD-<scope>.md` | 目录存在但**空**（仅 `.gitkeep`）→ 0 份 |

另有两类"资产级评审输入"散在流程里，PM 看板应把它们聚合到资产行：
- 每个叙事性产物的 `Sync Assessment` 预判（`storymap.md` / `story.md` / `idea.md` 的治理映射段；开发侧 `design.md` 的 `Service Blueprint Sync Assessment` / `Domain Model Sync Assessment`，SOP `:221-224`）；
- 覆盖对账（storymap）+ 追溯矩阵（test-design）这两张"业务完整性表"。

### 5.2 资产清单与可检测元数据（实测）

| 资产 | 路径 | 最后更新（来源） | 内容计数（实测） | 新鲜度/漂移判据 |
| :--- | :--- | :--- | :--- | :--- |
| 服务蓝图 | `docs/baseline/service_blueprint.html` | `Last Updated: 2026-09-08`（`:475`；提交 `2619ab4` 2026-09-08） | 6 个旅程阶段 · 3 条泳道 · 3 项跨阶段支撑（`scan_baseline`）；`SB-STAGE-01..06`、`SB-LANE-*`、18 个 `SB-<LANE>-<NN>`（blueprint skill `:55-80/223-232` 的最小结构要求） | 距快照 **57 天**；能力状态词频：`已落地` 15 次 / `横切支撑` 1 次 / `规划中` 3 次（其中仅 1 处是真正的 capability 节点 = `error-handling`，位置 `:1113-1120`；映射表行 `:1197-1203`；另 1 处是图例 `:496`）→ 与主规格存在性矛盾（§5.4-D1） |
| 业务流程 | `docs/baseline/business_process.html` | `Last Updated: 2026-09-08`（`:837`；但最后提交是 `69c98be` = **Epic 6.1** Baseline Sync） | 4 个分层章节 · 19 个流程节点引用（`scan_baseline`）= L1-01..07、L2-01..06、L3-01..06 | 距快照 57 天；**0 处 `应收`/`receivable` 关键词** → Phase 7 未回流（§5.4-D2） |
| 领域模型 | `docs/baseline/domain_model.html` | `Last Updated: 2026-09-08`（`:503`；提交 `2619ab4` Phase 7） | **8 个 Bounded Context**（bc-cart/catalog/channel/coupon/data-insights/order/shared/user）+ **18 个 `cap-*`**；需求侧 `research.md:54` 引用"现有 18 个 capability taxonomy"与其一致 | 距快照 57 天；与 `openspec/specs/` 19 个目录口径差 1（§5.4-D3） |
| 设计系统 | `docs/baseline/design-system/`（README/guidelines/src） | **无日期字段**；mtime 全部 2026-08-31（提交 `2936182` 2026-08-30 "apply new design system"） | README 26 行 + Guidelines 202 行 + `src/index.css` 2.4KB（三层 token：primitive/semantic/component）+ `src/App.tsx` 43KB 参考实现 | 距快照 **65 天**（按 mtime）；只能 mtime 兜底；无版本号（Guidelines 写 `Version 1.0 · 2024`，与仓库时间线不符） |
| 产品定位 | `docs/PRODUCT.md` | front-matter `updated_at: 2026-08-30`（`:4`） | 5 节：电梯演讲/核心理念/目标非目标/用户画像/AI 决策准则 | 距快照 66 天；无评审记录 |
| 路线图 | `docs/ROADMAP.md` | front-matter `updated_at: 2026-10-20`（`:4`）+ 正文 `最后刷新时间: 2026-10-20`（`:16`）；**最后提交 2026-10-28（`b67bfab` 登记 Phase 9）** | 9 个阶段（7 done / 1 future / 1 current）；现状评估 5 行；Phase 9 draft Story 3 行 | 距快照 15 天；**计数漂移**：`:29` 称"31 个变更已归档"，实际 `openspec/changes/archive/` 有 **38 个 change 目录 + 7 个 story-list 文件 = 45 项**（§5.4-D4） |
| 治理评审目录 | `docs/governance/reviews/` | 无（`.gitkeep` 2026-10-28 创建） | 0 份 | 从未使用 |
| 交付看板（生成物） | `docs/governance/delivery_board.html` | 头部"最后刷新 **2026-11-02 12:12:34**" | 当前输出：阶段 9 · 7/9 完成 · 规划中 **0** · 探索中 **1** · 设计中 0 · 开发中 0 · 已归档近 7 天 0 | 可作为 PM 看板的"对照基线"，但它缺 PM 语义（§6.7） |

### 5.3 每类资产「review 完成」的判据 + 可检测性

| 资产 | 完成判据 | 今天的可检测信号 | 可检测性 |
| :--- | :--- | :--- | :--- |
| Service Blueprint | 最近一次 Epic 收尾的 Baseline Sync 已判定（Sync 或显式 no-op），且 `SB-*` 结构与 capability 状态与 `openspec/specs/`+`domain_model` 一致 | `Last Updated` 与最近 Epic 归档日期比较；`规划中` 能力的 spec 存在性反查 | 中（no-op 无记录 → 无法证明"判定过"） |
| Business Process | L1/L2/L3 覆盖了 Epic 带来的新价值节点；`Last Updated` ≥ 最近 Epic 归档日 | 关键词反查（如 `应收`）+ 节点 id 存在性 | 中 |
| Domain Model | BC/Capability 映射与 `openspec/specs/`、最新 proposal 的"新增 taxonomy"一致 | BC/cap 计数 + 新增 capability 是否出现在 HTML | 中-高 |
| Design System | 新 UI 交付未引入硬编码色/圆角/阴影（前端规范门禁已覆盖），且 tokens 未被绕过 | 只能靠 `/opsx:verify` 的静态自检与 E2E；资产自身无变更记录 | 低 |
| PRODUCT / ROADMAP | 阶段边界、In/Out of Scope、Exit Criteria 与已交付事实一致，且 draft Story 与 storymap 收敛 | 文本比对（ROADMAP draft 表 vs `storymap.md` 拆分明细） | 中 |
| 治理评审 | `docs/governance/reviews/` 有与 Epic 数匹配的评审记录 | 目录文件数 = 0 | 高（就是空） |

### 5.4 今天已存在的 4 个漂移证据（看板可直接暴露为"资产待复核"）

- **D1（蓝图 capability 状态过期）**：`service_blueprint.html:1113-1120` 把 `error-handling` 标为「规划中」，理由写"当前 `openspec/specs/` 下还没有主规格目录"；但 `openspec/specs/error-handling/spec.md` 已存在且含 2 条 Requirement。→ 资产行应给 `drift: capability-status-stale (error-handling)`。
- **D2（流程基线漏了应收支流）**：`business_process.html` 全文 `应收`/`receivable` 命中 **0**；而 `service_blueprint.html` 命中 `应收`/`receivable` 各 1 处、`domain_model.html` 命中 6/3 处（Phase 7 已回流）。Phase 7 的 Story `story-ar-dashboard` 宣称"L1-07 经营分析（只读支流：应收看板，与销售/库存看板并列）"，但 L1-07 的文本（`business_process.html:900-910`）只写了销售+库存。→ `drift: process-baseline-missing-branch (accounts-receivable)`。
- **D3（capability 口径差 1）**：`domain_model.html` 18 个 `cap-*` vs `openspec/specs/` 19 个目录（多出 `data-persistence` 等目录，其 capability 归属需人工确认）。→ `drift: capability-count-mismatch (18 vs 19)`，需人工确认口径而非自动判错。
- **D4（规划层计数与事实不符）**：`ROADMAP.md:29` "共 31 个变更已归档"；实际 38 个 change 目录（+7 story-list）。→ `drift: roadmap-count-stale (31 vs 38)`。同类还有交付看板脚本兜底表 `PHASE_NAMES` 与 ROADMAP 阶段名不一致：脚本 `:31-39` 把 Phase 6 写成"回款与应收账款闭环"、Phase 7 写成"运营效率增强"，而 ROADMAP `:166/:191` 是 Phase 6=微信小程序渠道、Phase 7=回款与应收账款、Phase 8=运营效率增强（该表只在 ROADMAP 标题解析失败时兜底，故今天未暴露，但属定时炸弹）。

### 5.5 看板每个资产行应显示的字段

`assetId / title / kind / path / updatedAt(值+来源 html-meta|mtime) / ageDays / expectedAfterEpic(last archived epic key+date) / freshness(fresh|aging|stale|unknown) / contentCounts{} / capabilityStateCounts{landed,planned,crossStage} / driftCandidates[{code,severity,evidence,fixHint}] / reviewStatus(none|recorded) / lastReviewPath / nextAction(如"执行 /opsx:baseline/sync 或记录显式 no-op") / links(openPath)`。

---

## 6. 当前真实快照（2026-11-04 13:41 +08:00）

> 本节全部为实测值（`git log` + 现有扫描器函数 + 文件读取）。

### 6.1 规划层

| 项 | 值 |
| :--- | :--- |
| 当前阶段 | **Phase 9 · 会员与复购**（`ROADMAP.md:56`，用户 2026-10-20 裁定） |
| 阶段进度 | 9 个阶段：Phase 1–7 `done`、Phase 8 `future`（运营效率增强）、Phase 9 `current` → **7/9 完成**（扫描器实测） |
| 最新刷新 | ROADMAP `updated_at 2026-10-20`（提交 2026-10-28）；PRODUCT `2026-08-30` |
| Phase 9 In Scope | Epic 9.1 `epic-miniprogram-membership-points`（积分获取/账户/C 端抵现/B 端规则与审计，`ROADMAP.md:66-70`） |
| Phase 9 Out of Scope | 会员等级与权益、积分换券/换实物、退款、真实微信支付、多租户（`:72-78`） |
| Exit Criteria | 6 条可度量（`:82-87`），含"现结 PAID/账期 Receipt 计发""同源不分裂""两条计发路径 E2E 覆盖并映射 `SB-STAGE-*`" |
| draft Story | 3 条（`:101-105`）：`story-points-account-earning`(P0) / `story-miniprogram-points-center-redeem`(P0) / `story-points-admin-rules-ledger`(P1) |
| 未来阶段 | Phase 8 运营效率增强（`epic-operation-tools`，未启动），Phase 9 优先（`:203-209`） |

### 6.2 活跃 Epic × 阶段表（PM 工作台首屏核心）

Epic：`epic-miniprogram-membership-points`（目录建立于 2026-10-28 提交；`research.md` mtime 2026-10-28，`STATUS.md` mtime 2026-11-02）

| 阶段 | STATUS 单元格（原文） | 制品存在性 | 推导状态（按 §2.3） | 下一个 PM 动作 |
| :--- | :--- | :--- | :--- | :--- |
| research | `✅ done`（`STATUS.md:10`；说明含"2026-10-20 产出 research.md 并经 HITL 确认"+ Q1/Q2/Q4/Q8 裁定） | `research.md` ✅（391 行，含 13 个 Q + 4 条已裁定） | **done / confirmed**（sign-off 段 `:385-391` 全勾） | 无 |
| explore | `⬜`（`:11`，说明**已过期**："待 Phase 9 登记 ROADMAP 后启动（research 已确认可进入）"——ROADMAP 已于 2026-10-28 登记） | `idea.md` ❌ | **pm-todo（PM 待启动，最高优先）** + `warning: stale-status-note` | **执行 `/req:explore` 产出 `idea.md`**，并在其中收敛剩余 10 个待定项 |
| prototype | `⬜` | ❌ | `pm-todo`（被 explore 阻塞） | explore 确认后执行（涉及小程序/Web UI，按 STATUS 说明需做） |
| arch | `⬜`（OPT） | ❌ | `pm-todo`（被 prototype 阻塞，可 no-op 跳过） | 原型确认后 `/req:arch`（OPT） |
| storymap | `⬜` | ❌ | `pm-todo` | arch 后 `/req:storymap`（须覆盖对账 6 条 Exit Criteria + B/C 双端承诺） |
| stories | `⬜` | `stories/` 不存在；STATUS Story 表只有一行"待 storymap 产出"（`:22`） | `pm-todo` | storymap 后逐 Story `/req:story` |
| test-design | `⬜`（MUST） | ❌ | `pm-todo` | 每个 Story 确认后、handoff 前 |

Epic 生命周期：仅 `active` 勾选（`:28`）；`all-handoff/all-done/archived` 未勾。Epic 备注（`:35`）"ROADMAP 登记方式未裁定前不具备 handoff 条件"——**已验证过期**（Q1=A 已裁定，`research.md:250/374`）。

**research 已裁定 / 待定清单（PM 在 explore 要收的口）**：
- 已裁定：Q1=A 新增 Phase 9；Q2=A 纯复购激励；Q4=C 现结 PAID / 账期 Receipt 后计发；Q8=A 等级 Out of Scope（`research.md:250/261/282/320`）。
- 待定（10 项）：Q3 计发基数与比例、Q4-附 部分回款口径、Q5 兑换方式、Q6 与券叠加/上限、Q7 有效期与过期、Q9 C 端触点范围（仅小程序 vs 双端）、Q10 B 端权限与手工调整规则、Q11 渠道是否影响计发、Q12 存量是否追溯、Q13 数据与治理归属（BC/Capability）（`research.md:263-369`，结论 `:383`）。

### 6.3 Story / 需求侧归档 / 交付侧

| 项 | 值（实测） |
| :--- | :--- |
| 活跃 Epic 的 Story | **0 个已拆**（storymap 未产出）；ROADMAP draft 3 个（见 6.1） |
| 历史 Story | 需求侧归档 6 个 Epic ×17 个 story.md，全部 `done` + 已交接（changeName 全部可对上开发归档） |
| 历史 Epic（需求侧归档） | 6 个：account-system(08-29)、epic-sales-dashboard(08-30)、epic-stock-insight(08-31)、epic-accounts-receivable(09-08)、epic-miniprogram-channel(09-08)、epic-miniprogram-shopping(09-08) |
| 开发侧活跃 change | **0 个**（`openspec/changes/` 下只有 `archive/`） |
| 开发侧归档 | **38 个 change 目录 + 7 个 `*.story-list.json` = 45 个条目**；最晚 2026-09-08；`verify.md` 38/38 存在 |
| 技术评审 | `review.md` **0 份**；`docs/governance/reviews/` 空 |
| test-design / architecture-impact | **0 份**（v6 双制品从未被真实跑过；只在 `templates/` + 3 目录 skill 中存在） |
| Epic 队列 | 7 份归档 story-list（20 Story，全 done）+ 1 份**未归档**的 `openspec/epic-sales-dashboard.story-list.json`（2 Story 全 done）→ 数据卫生问题 |
| 遗留 idea 池 | `openspec/changes/ideas/idea.md` 不存在；legacy `openspec/idea.md`（优惠券想法）存在但无状态 |

### 6.4 业务知识资产

| 资产 | Last Updated / mtime | 计数 | 新鲜度 | 待复核信号 |
| :--- | :--- | :--- | :--- | :--- |
| service_blueprint.html | 2026-09-08 | 6 阶段 / 3 泳道 / 3 跨阶段支撑 | aging（57 天） | D1 `error-handling` 规划中但主规格已存在 |
| business_process.html | 2026-09-08（最后提交 6.1） | 4 章节 / 19 节点（L1×7, L2×6, L3×6） | aging（57 天） | D2 无应收支流 |
| domain_model.html | 2026-09-08 | 8 BC / 18 cap | aging（57 天） | D3 与 19 个主规格目录口径差 1 |
| design-system/ | 无日期，mtime 2026-08-31 | tokens（三层）+ Guidelines 202 行 + 参考实现 | stale（65 天，无版本记录） | 无变更记录/无 review 记录 |
| PRODUCT.md | 2026-08-30 | 5 节 | stale（66 天） | 与 Phase 9 的新价值承诺（复购）是否一致未复评 |
| ROADMAP.md | 2026-10-20（提交 10-28） | 9 阶段 / 5 行现状评估 / 3 draft Story | fresh（15 天） | D4 归档计数 31 vs 38；STATUS 说明与之矛盾 |
| governance/reviews/ | 无 | 0 | empty | 从未产出治理评审 |

### 6.5 门禁与交付质量（PM 只读关注）

- 最近归档的门禁样例：`2026-09-08-story-ar-dashboard/verify.md` → Hard Gates 4×PASS（Node 282 tests/51 suites），E2E `72 scenarios / 382 steps`，Coverage FULL；结论段明确"Epic 3 Story 完成 → 下一步 Spec Sync ×3 → story-list 归档 → 需求侧归档 → Baseline Sync → Roadmap → 看板"。
- 38 个归档 change 的 `verify.md` 全部存在；按现有解析器 `scan_verify` 实测：**26/38 的 4 项 Hard Gate 全 PASS**，12 个老 change（多为 2026-08-21 之前）是旧格式/未记录（`未执行`），**0 个 FAIL**。这本身是 PM 看板的一个数据陷阱：`未执行` 不等于失败，必须与 `FAIL` 区分展示。E2E 场景数从 65（Phase 6）到 72（Phase 7），当前 `e2e-tests/features/` 16 个 feature 文件。
- `review.md` 门禁（SOP `:253-255`）在历史上**从未执行**（0 份），因此"P0/P1 裁决"这个 HITL 目前在文件层不可见。

### 6.6 如果今天就把 PM 看板做出来，首屏应显示的 7 行

1. **[PM 待启动 · 最高优先]** Epic `epic-miniprogram-membership-points` → explore：执行 `/req:explore` 产出 `idea.md`；进入前已知 4 个裁定、10 个待定项要收口。
2. **[等 PM 解锁]** 该 Epic 后续 5 个阶段（prototype → arch(OPT) → storymap → story ×N → test-design ×N）全部依赖 explore 产出，当前均 `pm-todo`。
3. **[存量提醒]** 该 Epic research 的 stage 说明与 ROADMAP 状态矛盾（"待 Phase 9 登记" vs 已于 2026-10-28 登记）——需顺手修 `STATUS.md`，否则看板会持续告警。
4. **[Story 视角]** 3 个 ROADMAP draft Story（P0/P0/P1）尚无 storymap 与 story.md，全部 `未就绪`；每 Story `missingMust: [story.md, test-design.md]`，且 Epic 级还缺 `storymap.md`。
5. **[开发侧]** 当前 0 活跃 change、0 开发中、0 待评审；最近归档 2026-09-08，已 57 天无新交付。
6. **[业务知识资产]** 3 份 baseline HTML 已 57 天、design-system/PRODUCT 已 65–66 天未更新，其中 4 个漂移候选（D1/D2/D3/D4）待 PM 复核；`docs/governance/reviews/` 为空。
7. **[数据卫生]** 1 份未归档 story-list（sales-dashboard）、1 个 legacy idea 池、0 份 review/test-design —— 看板需要"数据质量"分区而不是假装没有。

### 6.7 与现有交付看板输出的差异（实测对照）

| 维度 | `docs/governance/delivery_board.html`（2026-11-02 12:12:34） | PM 工作台需要 |
| :--- | :--- | :--- |
| 视角 | 交付团队全景（阶段/漏斗/Kanban/门禁/基线） | **PM 行动视角**：我要做什么、等谁确认、什么阻塞 |
| 规划中 | **0**（`scan_roadmap.planned` 只解析"未来阶段"块里的 `**Epic N` 表格行，ROADMAP Phase 8 写的是"代表性 Epic: `epic-operation-tools`"，正则不匹配，见脚本 `:132-136`） | 应显示：Phase 8 待启动 1 个 + Phase 9 已在需求侧 1 个（不重复计入）+ draft Story 3 条 |
| 探索中 | 1（=活跃 Epic 计数） | 应拆成"等待确认/已确认/待启动"三态 |
| 需求漏斗 | 7 个阶段灯（pending/active/done） | 需要 9 态 + 置信度 + 下一步动作 + HITL 可见性角标 |
| Story | 无 Story 粒度 | 每个 Story 一行（§4.2 的 23 字段） |
| 业务基线 | 只显示 `Last Updated` + 计数 | 需新鲜度/漂移候选/复核动作 |
| 质量门禁 | 最近 7 天归档（今天 0 条 → 表格不渲染） | 需按 change/Story 全历史可查 + review 缺口提示 |
| 数据质量 | 无 | 需 `warnings[]`（STATUS 矛盾、故事列表孤儿、口径差） |

---

## 7. 缺口与设计建议

### 7.1 缺口清单（均带证据）

| ID | 缺口 | 证据 | 影响 |
| :--- | :--- | :--- | :--- |
| G1 | **没有持久化"等待 PM 确认"状态** | prototype/storymap 无 sign-off；idea sign-off 填写不一致（6 份中 2 勾 4 未勾） | 看板核心状态只能启发式，置信度封顶 medium |
| G2 | **没有"AI 正在做"心跳** | 无任何 in-progress 字段；`templates/STATUS.md:10-16` 允许 `researching` 等值但从未被写入 | 无法可靠显示"AI 正在做" |
| G3 | **没有阶段时间戳** | STATUS 无 `开始/完成时间` 列；只能靠文件 mtime/git | 无法算阶段周期、无法判断"卡住多久" |
| G4 | **STATUS 词表不统一** | `done` / `all done` / `all-handoff` / `部分 done` / `n/a` 混用；现有解析器"含 done 即 done"会误判 `部分 done` | 状态误报 |
| G5 | **storymap 状态列不可信** | 归档后仍 `ready/planned`（§4.4） | 不能用它推导 Story 状态 |
| G6 | **scanner 的「规划中 Epic」解析不到 Phase 9/8** | `generate_delivery_board.py:132-136` 正则只匹配 `**Epic <编号>`；ROADMAP `:208` 与 `:101-105` 均不匹配 → 今天显示 0 | 规划视图缺失 |
| G7 | **scanner 兜底阶段名过期** | `generate_delivery_board.py:31-39` Phase 6/7/8 名称与 ROADMAP 相反 | 解析失败时展示错误名称 |
| G8 | **无 Baseline Sync 记录（含 no-op）** | 三份 HTML 只有 `Last Updated`；skill 要求输出结构化摘要但无存放处 | 无法证明"判定过 no-op"（§5.3 可检测性中） |
| G9 | **治理评审从未产出** | 0 份 `review.md`；`docs/governance/reviews/` 空 | review 门禁（P0/P1 裁决）对看板不可见 |
| G10 | **test-design / architecture-impact 从未被真实执行** | 0 份产出，v6 制品 2026-11-02 才加入（commit `f8c98b4`，63 文件） | v6 漏斗的后两段对看板是"纸面门禁"；模板/解析需按规范而非按历史样本写 |
| G11 | **规划层与需求侧状态不一致** | `STATUS.md:11` vs `ROADMAP.md:56-58`；`STATUS.md:35` 备注过期 | 看板会同时展示矛盾信息 |
| G12 | **归档计数漂移** | `ROADMAP.md:29` 31 个 vs 实际 38 个 change 目录 | 规划层数字不可信 |
| G13 | **story-list 未按 SOP 归档** | `openspec/epic-sales-dashboard.story-list.json` 全 done 仍在活跃位置 | 活跃 Epic 计数虚高 |
| G14 | **legacy 想法池路径不符** | 期望 `openspec/changes/ideas/idea.md`，实际 `openspec/idea.md` | 想法池永远显示 0 |
| G15 | **Epic ↔ Phase 无机器可读映射** | ROADMAP 文本里 Epic 以反引号出现（`:103-105`/`:208`），无 id/表结构；story.md/storymap 只有 `Epic Key`，无 `Phase` | 看板无法自动把 Epic 归到阶段（只能靠文本/人工） |
| G16 | **capability 口径差 1** | 18 个 `cap-*` vs 19 个主规格目录 | 资产评审出现假阳性风险 |
| G17 | **HITL 被授权跳过的语义无载体** | stock-insight：`lead 已授权跳过 HITL`；AR/shopping：`用户授权全程自主` | 看板不能把这些误判为"未确认" |
| G18 | **无 per-Story 的"确认时间/确认人"** | story.md 只有交接 checkbox | 无法回溯"谁在什么时候确认的验收标准" |

### 7.2 三个方案（按成本/风险排序）

**方案 A（推荐先做）：纯推导，零工作流改动**
- 范围：只读文件 + 现有扫描器扩展；状态全部来自 §2.3 规则，置信度字段显式暴露；UI 对 medium/low 用角标/虚线区分。
- 成本：**低**（1 个扫描器模块 + 1 个 JSON schema；不改 skills/commands/templates）。
- 风险：**低**（不产生新状态源）；但永远无法回答"确认过没有/AI 在不在做"。
- 适合：1 周内出可用首屏；与现有 `generate_delivery_board.py` 并存（PM 看板 = 同源扫描器 + 更多语义）。

**方案 B（低成本补齐关键缺口）：加"记录行"，不加阶段/门禁**
- 范围（只做 4 件事）：
  1. `templates/STATUS.md` 阶段表加一列 `HITL 确认`（值 `⬜ / YYYY-MM-DD ✅ / n/a`），`prototype`/`storymap`/`story` 三个 skill 各写一格（覆盖 G1/G18）；
  2. `story.md` 交接状态前加 `- [x] 验收标准已确认（YYYY-MM-DD）`；
  3. 统一 4 个 sign-off 段格式为固定一行 `- [x] 已确认 (YYYY-MM-DD)`（research/idea/test-design/arch-impact，覆盖 G1 的解析稳定性）；
  4. 三份 baseline HTML 头部 meta 增 `Synced: <date> (<epic>, sync|no-op)`（覆盖 G8）。
- 成本：**中**（模板 + 约 10 个 skill + 6 个 command；必须三目录同步，见 §7.3）。
- 风险：**低-中**（仅新增列/新增行，不改变流程顺序与门禁语义；但会动到 7 份现存 STATUS 的兼容性（1 活跃 + 6 归档）——解析器需容错旧表头）。
- 收益：把"等待确认""已确认""AI 是否在做"从 medium 提到 high，并让 Baseline Sync 可审计。

**方案 C（机器可读状态清单）：新增 `board-state.json`**
- 范围：每个活跃 Epic 目录新增 `board-state.json`（或全仓 `docs/governance/pm-state.json`），由 7 个 stage skill + handoff + archive skill 原子写入 `{stage: {state, at, by, artifact, hitl:{confirmed,at,by}}, stories: {...}}`；看板优先读 manifest，缺失时回退方案 A 推导。
- 成本：**高**（8+ skill 改 + 模板 + 原子化纪律 + 三目录同步 + 历史迁移空文件）。
- 风险：**高**（新状态源会与 STATUS.md 漂移，需在 `archive-change`/`qa` 增加对账；违反"STATUS.md 是唯一状态源"的现行定义，需升级 SOP）。
- 收益：最高保真（可做时间线/周期/审计），也是将来宿主 API 最稳的形态。
- 建议：**若 PM 看板要长期做**，可在方案 B 落地并稳定 1 个月后再评估 C；现阶段不推荐。

**推荐组合：A 先上线 + 只挑选 B 中的 3/4 两小项**（统一 sign-off 格式 + baseline `Synced:` meta），因为这两项不改流程语义、却直接决定首屏两个核心列（"等待确认""资产新鲜度"）的可信度。prototype/storymap 确认（G1 主缺口）先以 `推断 + 无记录角标` 呈现，等 PM 使用反馈再决定是否加列。

### 7.3 跨工具同步义务（Lead 必须遵守的硬约束）

1. **skills / commands 改一处 = 改三处**：`.trae/`、`.cursor/`、`.agents/`（`AGENTS.md:8-13`；`openspec-requirements/README.md:89-92`）。
   - 今天 req 侧 8 个 command（`research/explore/prototype/arch/storymap/story/test-design/handoff`）与 11 个 prod skill 的 **md5 三处完全一致**（本会话实测）；改动后必须保持这类字节级一致，否则工具间行为漂移。
   - 新增制品（如 `test-design`）的范式：v6 提交 `f8c98b4` 一次新增 3 目录 ×（1 command + 1 skill）+ 角色文件 + 单份模板/配置/SOP + 脚本，共 **63 个文件**——照此执行。
2. **角色定义改一处 = 改两处**：`.opencode/agents/*.md`（权威）+ `.cursor/agents/*.md`（格式适配，body 一致、frontmatter 不同；`AGENTS.md:27`）。今天 6 个角色两处 body 一致（仅头部格式差异）。
3. **单份共享文件**（无镜像，改前要看影响面）：`openspec-requirements/templates/*`、`openspec-requirements/schemas/req-sdd.yaml`、`openspec-requirements/config.yaml`、`docs/SOPS/SDD_WORKFLOW.md`、`AGENTS.md`、`scripts/generate_delivery_board.py`。
4. **`openspec/config.yaml` 与 `openspec/schemas/spec-driven.yaml`** 是开发侧事实源（PM 看板本轮只读，不应改）。
5. **commit 纪律**：上述同步必须同一次提交完成（历史范式：`f8c98b4` 单提交覆盖全部镜像）；不要出现"先改 `.agents` 再补 `.trae`"的中间态。

---

## 8. 数据契约草案（宿主扫描器 → PM 看板）

> 目标：一个纯确定性、可缓存、可 diff 的 JSON；看板只做展示。字段命名用 camelCase（现有 Python 扫描器内部是 snake_case，输出层转换）。
> 生成器约定：只读仓库、`--root` 参数、`--out` 可选；同样输入 → 同样输出（除 `generatedAt`）；单源解析失败降级为 `sourceHealth` 条目而不是整体失败。

### 8.1 顶层 TypeScript 形状

```ts
// ===== 顶层快照 =====
interface PmBoardSnapshot {
  schemaVersion: 1;
  generatedAt: string;                 // ISO8601 +08:00
  generator: { name: 'pm-board-scanner'; version: string; mode: 'full' | 'degraded' };
  repo: { root: string; gitCommit: string; gitCommitDate: string; gitBranch: string | null; dirty: boolean };
  sourceHealth: SourceHealth[];
  summary: BoardSummary;
  boards: Record<BoardKey, BoardColumn>;
  phases: PhaseItem[];
  epics: EpicItem[];
  stories: StoryItem[];
  assets: KnowledgeAsset[];
  governance: GovernanceBlock;
  archives: ArchiveBlock;
  warnings: BoardWarning[];
}

type BoardKey =
  | 'pmTodo'          // PM 待启动
  | 'aiInProgress'    // AI 正在做（低置信度）
  | 'waitingConfirm'  // 产出已就绪 · 等待 PM 确认
  | 'confirmed'       // 已确认
  | 'handoffDone'     // 已交接开发
  | 'devInProgress'   // 开发中
  | 'done'            // 已完成
  | 'na'              // 不适用
  | 'blocked';        // 阻塞

interface BoardSummary {
  counts: Record<BoardKey, number>;
  pmActionCount: number;                  // = pmTodo + waitingConfirm
  blockedCount: number;
  activeEpicKey: string | null;
  currentPhase: { no: number; name: string; status: 'current' | 'done' | 'future' } | null;
  phaseProgress: { done: number; total: number; percent: number };
  activeChanges: number;
  archivedChanges: number;
  stories: { total: number; ready: number; missingMust: number; inDev: number; done: number };
  assets: { total: number; fresh: number; aging: number; stale: number; driftCandidates: number };
  hitl: { waitingConfirm: number; confirmed: number; invisible: number }; // invisible = 无 durable trace
}

interface BoardColumn {
  key: BoardKey;
  title: string;                          // 中文标题（看板直接渲染）
  order: number;
  count: number;
  items: BoardItem[];
}

interface SourceHealth {
  id: string;                             // 'roadmap' | 'requirements-epics' | 'epic-status' | 'story-list' | 'changes' | 'archive' | 'verify' | 'review' | 'baseline' | 'design-system' | 'governance'
  path: string;
  ok: boolean;
  parsedAt: string;
  issues: string[];                       // 解析告警（缺表头/正则未命中/文件缺失）
  counts?: Record<string, number>;
}
```

### 8.2 Item 与横切字段

```ts
type ItemKind = 'phase' | 'epic' | 'stage' | 'story' | 'change' | 'asset' | 'governance-review' | 'planning-doc';

interface BoardItem {
  id: string;                             // 稳定 id：`epic:<key>` / `story:<id>` / `asset:<file>` / `stage:<epic>:<stage>`
  kind: ItemKind;
  title: string;
  subtitle?: string;
  owner: 'pm' | 'lead' | 'engineer' | 'qa' | 'reviewer' | 'ai' | 'user';
  status: BoardKey;
  statusConfidence: 'high' | 'medium' | 'low';
  statusBecause: string[];                // 命中的规则 id + 证据摘要
  hitlWaived?: boolean;                   // '授权跳过 HITL' 语义（G17）
  nextAction?: ActionRef;
  blockers: Blocker[];
  evidence: EvidenceRef[];
  links: { openPath: string; commandPath?: string };
  tags: string[];                         // 'prototype' | 'must' | 'ui-gate' | 'pre-v6' ...
  meta?: Record<string, unknown>;         // 按 kind 扩展（见下）
}

interface ActionRef {
  id: string;                             // 'req:explore' | 'req:prototype' | 'req:arch' | 'req:storymap' | 'req:story'
                                          // | 'req:test-design' | 'req:handoff' | 'opsx:verify' | 'opsx:review'
                                          // | 'opsx:baseline/sync' | 'opsx:planning:product-planning' | 'opsx:governance:delivery-board'
                                          // | 'manual:fix-status-note' | 'manual:review-asset'
  label: string;                          // 中文可执行动作
  command?: string;                       // 推荐命令（可含 <epic-key>/<story-key> 占位）
  requiresHitl: boolean;
  blockedBy: string[];                    // blocker ids
  etaMinutes?: number;
}

interface Blocker {
  id: string;
  code: string;                           // 'MISSING_MUST_ARTIFACT' | 'VERIFY_GATE_FAILED' | 'STORY_LIST_ORPHAN'
                                          // | 'PLANNING_BASIS_MISSING' | 'STATUS_ROADMAP_CONFLICT' | 'REVIEW_P0_OPEN'
  severity: 'blocker' | 'warning';
  message: string;
  evidence: EvidenceRef[];
}

interface EvidenceRef {
  path: string;                           // 仓库相对路径
  kind: 'artifact' | 'status-cell' | 'status-table-row' | 'signoff-checkbox' | 'archive-dir'
      | 'json-field' | 'html-meta' | 'git' | 'mtime';
  locator?: string;                       // 'line:11' | 'section:## HITL 确认' | 'regex:...'
  value?: string;                         // 原始值（如 '⬜' / '✅ done' / '2026-09-08'）
}
```

### 8.3 各实体形状

```ts
interface PhaseItem {                     // W1/W2
  no: number;
  name: string;
  status: 'done' | 'current' | 'future';
  evidence: EvidenceRef[];                // ROADMAP 标题行 + front-matter
  plannedEpics: { key: string; title: string; registered: boolean; enteredRequirements: boolean }[];
  draftStories: { storyId: string; title: string; priority: 'P0'|'P1'|'P2' }[];
  exitCriteria: string[];                 // 文本（PM 评审用）
  inScope: string[];
  outOfScope: string[];
  links: { openPath: 'docs/ROADMAP.md' };
}

interface EpicItem {                      // W3
  key: string;
  title: string;
  dir: string;                            // 'openspec-requirements/epics/<key>'
  phaseNo: number | null;                 // 由 ROADMAP 文本匹配（G15，可能 null）
  lifecycle: {
    active: boolean; allHandoff: boolean; allDone: boolean; archived: boolean;
    source: 'status-checkboxes';
  };
  status: 'planned' | 'active' | 'all-handoff' | 'all-done' | 'archived';
  stages: StageState[];                   // 固定 7 项，顺序固定
  storyStats: { total: number; ready: number; handoff: number; inDev: number; done: number; missingMust: number };
  nextAction?: ActionRef;
  blockers: Blocker[];
  evidence: EvidenceRef[];
  meta: { statsmtime?: string; lastArtifactMtime?: string };
}

interface StageState {                    // W4–W10
  stage: 'research'|'explore'|'prototype'|'arch'|'storymap'|'stories'|'test-design';
  label: string;                          // 中文
  status: BoardKey;                       // done | na | waiting-confirm | confirmed | pm-todo | ai-in-progress | blocked
  confidence: 'high' | 'medium' | 'low';
  ruleIds: string[];                      // 命中的 R01..R18
  cellRaw?: string;                       // STATUS 原始单元格（'⬜' / '✅ done' / 'n/a' / '🔄 部分 done'）
  artifacts: string[];                    // 存在的制品路径
  required: boolean;                      // research/explore/storymap/story/test-design = true；prototype(UI)/arch = 条件
  hitl: HitlSignal;
  nextAction?: ActionRef;
}

interface HitlSignal {
  checkpointId: string;                   // 'H1'..'H17'
  visible: boolean;                       // 文件里是否有 durable trace
  tracePath?: string;
  traceKind: 'checkbox' | 'free-text' | 'none';
  confirmed?: boolean;
  confirmedAt?: string;
  waived?: boolean;
  waiverEvidence?: EvidenceRef;
}

interface StoryItem {                     // W9–W11
  id: string;                             // 'story-<...>'（= 需求侧 Story ID）
  epicKey: string;
  title: string;
  priority: 'P0' | 'P1' | 'P2' | null;
  dependsOn: string[];
  source: 'roadmap-draft' | 'storymap' | 'status-table';
  status: BoardKey;                       // pm-todo | waiting-confirm | confirmed | handoff-done | dev-in-progress | done | blocked
  confidence: 'high' | 'medium' | 'low';
  artifacts: { story: boolean; testDesign: boolean; prototypeGate: 'ok' | 'missing' | 'n/a' };
  hitl: { storyConfirm: HitlSignal; testDesignConfirm: HitlSignal };
  handoff: {
    status: 'ready' | 'handoff' | 'dev-in-progress' | 'done' | null;
    changeName: string | null;
    changeExists: boolean;
    changePhase: 'none' | 'proposal' | 'specs' | 'design' | 'tasks' | 'verify' | 'review' | 'synced';
    devArchiveDate: string | null;
    storyListStatus: 'planned' | 'in_progress' | 'done' | null;
  };
  gates: GateResult | null;
  review: { verdict: 'PASS'|'WARN'|'FAIL' | null; p0: number; p1: number; path: string | null };
  readiness: { ready: boolean; missingMust: string[]; missingOptional: string[] };
  nextAction?: ActionRef;
  blockers: Blocker[];
  evidence: EvidenceRef[];
}

interface GateResult {                    // W13，直接沿用现有扫描器字段
  schema: string; node: string; python: string; frontend: string; e2e: string;
  conclusion: string; allPass: boolean;
}

interface KnowledgeAsset {                // W16/W17
  id: 'service-blueprint' | 'business-process' | 'domain-model' | 'design-system' | 'product' | 'roadmap';
  title: string;
  kind: 'baseline-html' | 'design-system' | 'planning-md';
  path: string;
  updatedAt: string | null;
  updatedAtSource: 'html-meta' | 'frontmatter' | 'mtime' | 'none';
  ageDays: number | null;
  freshness: 'fresh' | 'aging' | 'stale' | 'unknown';
  lastEpicSynced: { epicKey: string; date: string } | null;  // 能对上才算（今天只能靠日期推断）
  contentCounts: Record<string, number>;                     // stages/lanes/crossCards/nodes/bcs/caps/...
  capabilityStates?: { landed: number; planned: number; crossStage: number };
  review: { status: 'none' | 'recorded'; lastPath: string | null; lastAt: string | null };
  driftCandidates: DriftCandidate[];
  nextAction?: ActionRef;
  evidence: EvidenceRef[];
}

interface DriftCandidate {
  code: string;                           // 'capability-status-stale' | 'process-baseline-missing-branch'
                                          // | 'capability-count-mismatch' | 'roadmap-count-stale' | 'signoff-inconsistent'
  severity: 'high' | 'medium' | 'low';
  message: string;
  evidence: EvidenceRef[];
  fixHint: string;                        // 建议动作（通常是 /opsx:baseline/sync 或人工复核）
}

interface GovernanceBlock {
  reviews: { path: string; scope: 'change'|'epic'|'repo'; date: string; verdict: string; p0: number; p1: number }[];
  reviewCoverage: { changesArchived: number; changesWithReview: number; epics: number; epicsWithReview: number };
  acceptedRisks: { path: string; p1Accepted: number; acceptedBy?: string; deadline?: string }[];
}

interface ArchiveBlock {
  requirementsEpics: { key: string; archivedAt: string; stories: number }[];
  changes: { name: string; type: 'epic'|'story'|'bugfix'|'feature'|'other'; date: string; gates: GateResult | null }[];
  storyLists: { file: string; epicKey: string; stories: number; allDone: boolean; archived: boolean }[];
  totals: { requirementsEpics: number; changes: number; storyLists: number; recentDays: number; recentCount: number };
}

interface BoardWarning {
  code: string;                           // 'STATUS_ROADMAP_CONFLICT' | 'ORPHAN_STORY_LIST' | 'LEGACY_IDEA_PATH'
                                          // | 'SCANNER_REGEX_MISS' | 'MISSING_REVIEWS' | 'SIGNOFF_UNPARSEABLE'
  severity: 'blocker' | 'warning' | 'info';
  message: string;
  itemId?: string;
  evidence: EvidenceRef[];
}
```

### 8.4 当前快照的样例（节选，可直接作为扫描器 golden case）

> 为控制篇幅 `boards.*.items` 只保留代表项；`summary.counts` 与 `stories/assets` 是全量推导值。`stories.total = 3` 指 ROADMAP 的 3 条 draft Story（尚未经 storymap 拆分）。

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-11-04T13:41:03+08:00",
  "generator": { "name": "pm-board-scanner", "version": "0.1.0", "mode": "full" },
  "repo": { "root": "/Users/superkkk/MyCoding/OpenSpec-practice", "gitCommit": "460696e", "gitCommitDate": "2026-11-02", "gitBranch": "main", "dirty": false },
  "summary": {
    "counts": { "pmTodo": 7, "aiInProgress": 0, "waitingConfirm": 0, "confirmed": 1, "handoffDone": 0, "devInProgress": 0, "done": 0, "na": 0, "blocked": 1 },
    "pmActionCount": 7,
    "blockedCount": 1,
    "activeEpicKey": "epic-miniprogram-membership-points",
    "currentPhase": { "no": 9, "name": "会员与复购", "status": "current" },
    "phaseProgress": { "done": 7, "total": 9, "percent": 78 },
    "activeChanges": 0,
    "archivedChanges": 38,
    "stories": { "total": 3, "ready": 0, "missingMust": 3, "inDev": 0, "done": 0 },
    "assets": { "total": 6, "fresh": 1, "aging": 3, "stale": 2, "driftCandidates": 4 },
    "hitl": { "waitingConfirm": 0, "confirmed": 1, "invisible": 2 }
  },
  "boards": {
    "pmTodo": {
      "key": "pmTodo", "title": "PM 待启动", "order": 1, "count": 7,
      "items": [
        {
          "id": "stage:epic-miniprogram-membership-points:explore",
          "kind": "stage", "title": "探索（idea.md）", "owner": "pm",
          "status": "pmTodo", "statusConfidence": "high",
          "statusBecause": ["R06: research 已 confirmed 且 idea.md 不存在", "R16: STATUS 说明与 ROADMAP 冲突（警告）"],
          "nextAction": {
            "id": "req:explore", "label": "执行 /req:explore 产出 idea.md，并收敛 10 个待定项（Q3/Q4-附/Q5/Q6/Q7/Q9/Q10/Q11/Q12/Q13）",
            "command": "/req:explore", "requiresHitl": true, "blockedBy": []
          },
          "blockers": [],
          "evidence": [
            { "path": "openspec-requirements/epics/epic-miniprogram-membership-points/STATUS.md", "kind": "status-cell", "locator": "line:11", "value": "⬜" },
            { "path": "docs/ROADMAP.md", "kind": "artifact", "locator": "line:56-58", "value": "Phase 9 已登记（2026-10-28 提交 b67bfab）" }
          ],
          "links": { "openPath": "openspec-requirements/epics/epic-miniprogram-membership-points/" },
          "tags": ["blocking-first-step"],
          "meta": { "stage": "explore", "unresolvedQuestions": 10 }
        }
      ]
    },
    "blocked": {
      "key": "blocked", "title": "阻塞", "order": 9, "count": 1,
      "items": [
        {
          "id": "epic:epic-miniprogram-membership-points",
          "kind": "epic", "title": "epic-miniprogram-membership-points", "owner": "pm",
          "status": "blocked", "statusConfidence": "medium",
          "statusBecause": ["R16: STATUS.explore 说明称待 Phase 9 登记，但 ROADMAP 已登记"],
          "blockers": [
            { "id": "b1", "code": "STATUS_ROADMAP_CONFLICT", "severity": "warning",
              "message": "STATUS.md:11 与 docs/ROADMAP.md:56-58 状态矛盾；不阻塞执行但会导致看板自相矛盾，建议修正 STATUS 说明",
              "evidence": [{ "path": "openspec-requirements/epics/epic-miniprogram-membership-points/STATUS.md", "kind": "status-cell", "locator": "line:11" }] }
          ],
          "nextAction": { "id": "manual:fix-status-note", "label": "修正 STATUS.md explore 行说明（去掉已过期的规划门禁理由）", "requiresHitl": false, "blockedBy": [] },
          "evidence": [], "links": { "openPath": "openspec-requirements/epics/epic-miniprogram-membership-points/STATUS.md" }, "tags": ["data-hygiene"],
          "meta": {}
        }
      ]
    }
  },
  "warnings": [
    { "code": "ORPHAN_STORY_LIST", "severity": "warning", "message": "openspec/epic-sales-dashboard.story-list.json 全部 done 但未按 SOP 归档到 archive/", "evidence": [{ "path": "openspec/epic-sales-dashboard.story-list.json", "kind": "json-field", "locator": "stories[*].status" }] },
    { "code": "LEGACY_IDEA_PATH", "severity": "info", "message": "openspec/changes/ideas/idea.md 不存在；legacy openspec/idea.md 无状态无 owner", "evidence": [{ "path": "openspec/idea.md", "kind": "artifact" }] },
    { "code": "MISSING_REVIEWS", "severity": "warning", "message": "38 个归档 change 均无 review.md；docs/governance/reviews/ 为空（review 门禁从未执行）", "evidence": [{ "path": "docs/governance/reviews/", "kind": "artifact" }] },
    { "code": "SCANNER_REGEX_MISS", "severity": "warning", "message": "现有交付看板脚本 planned Epic 正则未命中 Phase 8/9（generate_delivery_board.py:132-136）", "evidence": [{ "path": "scripts/generate_delivery_board.py", "kind": "artifact", "locator": "line:132-136" }] }
  ]
}
```

### 8.5 生成/API 约定（给宿主实现）

1. **纯推导 + 可复制**：所有字段都能从文件现值重算；`statusBecause` 必须能追到规则 id + 证据路径，UI 用它做 tooltip。
2. **降级策略**：单个源失败（文件缺失/正则不命中）→ 该源条目进 `sourceHealth.issues`，相关 item 状态降为 `unknown`，**不阻断整份快照**；`generator.mode = degraded`。
3. **排序（UI 需要稳定）**：`boards` 按 `order`；`items` 默认按 `owner=pm` 优先 → `blocked` 优先 → `nextAction.etaMinutes` → `id` 字典序；`epics` 按 Phase 倒序；`stories` 按 `priority(P0>P1>P2>null)` 再按 id。
4. **时间**：`generatedAt` 用本地时区 ISO8601；`ageDays` 以 `generatedAt` 日期 - `updatedAt`；**不要**把"今天"写死在扫描器里（便于 golden test）。
5. **计数**：`summary.counts` 必须等于各 board `count` 之和（含 `unknown` 时另设 `unclassified`，避免数据对不上）。
6. **与现有看板共存**：可直接复用 `generate_delivery_board.py` 的 `scan_roadmap/scan_epics/scan_active_changes/scan_verify/scan_archives/scan_baseline` 作为底层，新增：`scan_story_tracking`（§4.2）、`scan_hitl`（§3）、`scan_asset_review`（§5.5）、`scan_data_hygiene`（§7.1 G11-G14）。**不要修改** `docs/governance/delivery_board.html` 的生成路径（那是既有 CI/人看的视图）。
7. **宿主 API 建议**：`getSnapshot()` 返回上文对象；`getItem(id)` 返回单项 + `evidence` 原文切片（限 200 行）；`openPath` 直接映射到仓库文件（看板侧点击跳转）。快照可缓存 30–60s（文件级 mtime 失效即重扫）。
8. **安全**：只读、不执行仓库内脚本（扫描器自身除外）、不写入被扫描目录；`.gitignore` 由用户控制（本会话观察：工作区仅 `.gitignore` 有未提交修改，与 PM 看板无关）。

---

## 附录 A · 证据索引（关键路径清单）

| 主题 | 路径:行 |
| :--- | :--- |
| 团队角色 / 跨工具同步 / HITL 总则 | `AGENTS.md:8-13`、`:19-29`；`openspec-requirements/README.md:89-92` |
| 需求漏斗 7 阶段 | `docs/SOPS/SDD_WORKFLOW.md:26-63`；`openspec-requirements/README.md:8-35`；`schemas/req-sdd.yaml:3` |
| 交接边界 / Epic 归档 / 分层 Sync | `docs/SOPS/SDD_WORKFLOW.md:65-83`、`:261-301`；`AGENTS.md:56-58` |
| 唯一状态源 STATUS.md（阶段/Story/生命周期） | `docs/SOPS/SDD_WORKFLOW.md:307-312`；`templates/STATUS.md:8-34`；活跃实例 `epics/epic-miniprogram-membership-points/STATUS.md:8-35` |
| Epic 队列 JSON 规范 | `docs/SOPS/SDD_WORKFLOW.md:313-338`；`openspec/epic-sales-dashboard.story-list.json` |
| 需求侧 Schema（v6，7 制品 + handoff.requires） | `openspec-requirements/schemas/req-sdd.yaml:17-343`（handoff `:332-343`） |
| 需求侧规则（每阶段 must） | `openspec-requirements/config.yaml:38-95` |
| 各制品模板（含 sign-off 段） | `templates/{research,idea,storymap,story,architecture-impact,test-design}.md` |
| 活跃 Epic 现状与 13 个待澄清项 | `epics/epic-miniprogram-membership-points/research.md:4-29`、`:239-369`、`:371-391` |
| 当前规划（Phase 9 / draft Stories） | `docs/ROADMAP.md:56-109`、`:34-52`、`:191-214` |
| 交付看板聚合现状 | `scripts/generate_delivery_board.py:52-340`；`.agents/skills/prod/delivery-board/SKILL.md:21-32`；`docs/governance/delivery_board.html`（刷新 2026-11-02 12:12:34） |
| 交付侧制品/门禁/归档规则 | `openspec/schemas/spec-driven.yaml:4-167`；`.agents/skills/opsx/verify/SKILL.md`；`.agents/skills/opsx/archive-change/SKILL.md:120-170` |
| 技术评审门禁 | `docs/SOPS/SDD_WORKFLOW.md:243-259`；`.opencode/agents/reviewer.md`；`.agents/commands/opsx/review.md` |
| 业务基线治理（3 HTML + 最小结构 + capability 状态） | `.agents/skills/baseline/blueprint/SKILL.md:55-96`、`:120-152`、`:223-232`；`domain-model/SKILL.md`；`process-flow/SKILL.md`；`render/SKILL.md` |
| 基线元数据解析点 | `docs/baseline/service_blueprint.html:475`；`business_process.html:837`；`domain_model.html:503` |
| 设计系统权威 | `docs/baseline/design-system/README.md:1-26`；`guidelines/Guidelines.md:1-80`；`src/index.css` |
| 治理评审目录（空） | `docs/governance/reviews/.gitkeep` |
| v6 漏斗落地提交（63 文件跨工具同步范式） | `git show --stat f8c98b4`（2026-11-02） |
| Phase 9 登记提交 | `git log -- docs/ROADMAP.md` → `b67bfab`（2026-10-28） |

## 附录 B · 建议新增的扫描函数签名（给宿主，Python 可直译 TS）

```python
def scan_story_tracking(root) -> list[dict]        # §4.2 逐 Story 23 字段
def scan_hitl(root) -> dict                        # §3 sign-off / waiver / 不可见清单
def scan_asset_review(root) -> list[dict]          # §5.5 资产行 + driftCandidates
def scan_data_hygiene(root) -> list[dict]          # §7.1 G11-G14 → warnings[]
def scan_board_state(root) -> dict                 # 顶层 boards/summary（规则引擎 §2.3）
```

规则实现顺序（决定谁覆盖谁）：`n/a → blocked/warnings → ai-in-progress(低置信度) → waiting-confirm/confirmed → done → pm-todo → 交付侧 → unknown`，与 §2.4 一致。
