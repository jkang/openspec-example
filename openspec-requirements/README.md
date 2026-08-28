# openspec-requirements

**需求侧工作区** —— 产品经理（PM）专属，**仅用于大块 Epic 需求**。独立于 `openspec/`（开发侧），用于在开发介入前，把「需求调研 → 需求探索 → 原型（Epic 整体）→ 需求拆分 → Story」这条需求漏斗完整走完，产出可交给开发的**冻结交付物（Story，业务面）**。

> 与 `openspec/` 平级目录，二者互相隔离，避免干扰。
> **适用范围**：仅大块 Epic 需求走本工作区。Bug Fix / Tech Debt / 简单功能修改（如单个 UI 优化）**直走交付侧**，不走本流程。

## 需求漏斗（v3）

```
docs/ROADMAP.md（唯一权威，阶段条目即 Epic）
  → ① research（调研，只收集）
  → ② explore（探索，转化：To-Be Process / To-Be Journey / 候选 Capabilities，产出 idea.md）
  → ③ prototype（Epic 整体原型，拆分前一次完成）
  → ④ storymap（拆分 + 覆盖对账）
  → ⑤ story（业务面冻结交付物）
  → /req:handoff → 开发侧 openspec/changes/<name>/（合成 proposal.md 后从 proposal 起步）
```

| 阶段 | 产物 | 目录 | 主导 | 命令 |
| --- | --- | --- | --- | --- |
| ① 需求调研 | `research/<epic-key>.md`（只收集：背景/对象/原始需求/约束线索/待澄清/结论） | `research/` | PM | `/req:research` |
| ② 需求探索 | `ideas/<idea-key>.md`（业务意图 + To-Be Process/Journey + 候选 Capabilities + 任务类型路由） | `ideas/` | PM | `/req:explore` |
| ③ 原型（Epic 整体） | `prototypes/<epic-key>/*.html`（拆分前一次完成，UI 门禁需 HITL 确认） | `prototypes/` | PM | `/req:prototype` |
| ④ 需求拆分 | `storymaps/<epic-key>/storymap.md`（含覆盖对账：承诺项 + 候选 Capability 逐项承接） | `storymaps/` | PM | `/req:storymap` |
| ⑤ 需求单元 | `stories/<story-key>/story.md`（业务面冻结交付物） | `stories/` | PM | `/req:story` |
| ⑥ 开发交接 | `openspec/changes/<name>/`（合成 proposal.md） | `openspec/` | Engineer（经 `/req:handoff`） | `/req:handoff` |

## 目录约定

- **`research/`**：需求调研层（漏斗第 1 步）。每个文件对应 **ROADMAP 的一个阶段条目（即 Epic）**，只负责**收集**（Epic 背景 / 调研对象 / 原始需求信息 / 业务约束线索 / 疑问待澄清项 / 调研结论），不做产品设计转化。
- **`ideas/`**：Explore 产物（漏斗第 2 步）。基于已确认的 research，把调研信息**转化**为产品设计思路（澄清业务意图 / To-Be Process / To-Be Journey / 产品设计思路 / 任务类型 / 候选 Capabilities / 治理映射 / 拆分建议 / 架构影响）。
- **`prototypes/`**：Epic 整体原型（漏斗第 3 步）。**在 storymap 拆分之前**针对 Epic 整体一次完成，路径 `prototypes/<epic-key>/`；严格遵循 `docs/FRONTEND.md`（无圆角、slate 色系、真实业务数据、全中文）；产出后必须用户 HITL 确认。
- **`storymaps/`**：大需求拆分映射（漏斗第 4 步）。**必须覆盖对账**（Epic 每个承诺项 + 每个候选 Capability 都有 Story 承接）；粒度取完整端到端功能。
- **`stories/`**：需求单元（漏斗第 5 步）。每个子目录是一个 Story，交付物为 `story.md`（业务面：场景/范围/规则/E2E/治理映射/交接状态）。**业务面纯净，不含行为规格**。

## 交接契约（story → 开发侧）

- **Story.md 是需求侧唯一冻结交付物（业务面）**。行为规格（Story-specs，按 capability 拆分的 specs）**不由需求侧生成**。
- 开发侧通过 `/req:handoff`（skill: handoff）读取 `story.md`，在 `openspec/changes/<name>/` 创建 change 并**合成 `proposal.md`**（Why/What/Capabilities/Alignment/Impact），开发侧**从 proposal 起步**，随后按 capability 拆分生成 specs → design → tasks → apply → verify → sync → archive。
- 开发侧**不再有** explore / 需求拆分 / prototype / story 输出（均已前移到需求侧）。
- 若开发中发现需求缺口，回关本工作区（`req-*` skill），不擅自改需求侧规划。
- UI 门禁：涉及 UI 的 Story，无已确认的 Epic 整体原型（`prototypes/<epic-key>/*.html`）禁止交接。
- 分层 Sync：每个 change 只做 Spec Sync（`/opsx:sync`，change 级）；Baseline Sync（`/opsx:baseline/sync`）在 Epic 全部 Story 归档后统一执行。

## 适用范围路由（关键）

| 需求类型 | 路径 |
| --- | --- |
| 大块 Epic（跨多能力、需拆分） | ✅ 走需求侧漏斗 → `/req:handoff` |
| 简单功能修改（如单个 UI 优化） | ⛔ 直走交付侧 |
| Bug Fix | ⛔ 直走交付侧（精简规格） |
| Tech Debt / 重构 | ⛔ 直走交付侧（skip_specs 可选） |

## 治理约束（不因分离而减弱）

- 所有需求产品物必须引用治理基线：`docs/baseline/domain_model.html`（Bounded Context → Capability 映射）、`docs/baseline/business_process.html`（L1/L2/L3）、`docs/baseline/service_blueprint.html`（SB-STAGE-*/SB-<LANE>-*）。
- **规划不在需求侧**：`docs/ROADMAP.md` 是唯一权威（按阶段组织，每阶段条目即 Epic）；需求侧只**消费**其 Epic 条目，不再产出 roadmap / planning 制品。
- 遵循 `docs/SOPS/SDD_WORKFLOW.md` 的 `req-sdd` 流程分支与 HITL 检查点。
- Schema 优先：`config.yaml`（`schema: req-sdd`）是制品格式与生成指令的唯一事实来源；制品模板见 `templates/`。

## 跨工具一致性

- **skills / commands**：对 `req-*` skills / 命令的任何修改必须同步 `.trae/`、`.cursor/`、`.agents/` 三目录（与既有 openspec-* 一致）。
- **角色定义**：对团队角色（pm/engineer/lead）的修改必须同步 `.opencode/agents/`、`.cursor/agents/`、`.trae/skills/sdd-team/`、`.agents/skills/sdd-team/` 四目录（AGENTS.md 硬约束）。
