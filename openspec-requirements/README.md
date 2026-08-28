# openspec-requirements

**需求侧工作区** —— 产品经理（PM）专属，**仅用于大块 Epic 需求**。独立于 `openspec/`（开发侧），用于在开发介入前，把「产品规划 → 需求探索 → 需求拆分 → 原型 → Story」这条需求漏斗完整走完，产出可交给开发的**冻结交付物（Story，业务面）**。

> 与 `openspec/` 平级目录，二者互相隔离，避免干扰。
> **适用范围**：仅大块 Epic 需求走本工作区。Bug Fix / Tech Debt / 简单功能修改（如单个 UI 优化）**直走交付侧**，不走本流程。

## 需求漏斗

```
Product Planning  →  Epics  →  Explore (ideas)  →  Storymap (拆分)  →  Story (业务面交付物)  →  change (开发侧)
```

| 阶段 | 产物 | 目录 | 主导 |
| --- | --- | --- | --- |
| ① 产品规划 | `phase-plan.md`、`epic.md` | `planning/` | PM |
| ② 需求探索 | `idea.md` | `ideas/` | PM |
| ③ 需求拆分 | `storymap.md`（含覆盖对账） | `storymaps/` | PM |
| ④ 需求单元 | `story.md`（业务面冻结交付物） | `stories/` | PM |
| ⑤ 开发交付 | `openspec/changes/<name>/` | `openspec/` | Engineer（经 openspec-handoff） |

## 目录约定

- **`planning/`**：产品规划层。`phase-plan.md` 为阶段计划（**只引用** `docs/ROADMAP.md`，不扩范围）；`epics/<key>/epic.md` 为一个 Epic（目标/范围/Exit 标准）。
- **`ideas/`**：Explore 产物。业务/用户原始反馈 → 结构化 idea（含任务类型路由）。
- **`storymaps/`**：大需求拆分映射。**必须覆盖对账**（Epic 每个承诺项都有 Story 承接）；粒度取完整端到端功能。
- **`stories/`**：需求单元。每个子目录是一个 Story，交付物为 `story.md`（业务面：场景/规则/E2E/治理映射），以及 `prototypes/`（若涉及 UI）。

## 交接契约（story → 开发侧）

- **Story.md 是需求侧唯一冻结交付物（业务面）**。行为规格（Story-specs，按 capability 拆分的 specs）**不由需求侧生成**。
- 开发侧通过 `openspec-handoff` 读取 `story.md`，在 `openspec/changes/<name>/` 创建 change 并**合成 `proposal.md`**（Why/What/Capabilities/Alignment/Impact），开发侧**从 proposal 起步**，随后按 capability 拆分生成 specs → design → tasks → apply → verify → sync → archive。
- 开发侧**不再有** explore / 需求拆分 / prototype / story 输出（均已前移到需求侧）。
- 若开发中发现需求缺口，回关本工作区（`req-*` skill），不擅自改需求侧规划。
- UI 门禁：涉及 UI 的 Story，无已确认 prototype 禁止交接。

## 适用范围路由（关键）

| 需求类型 | 路径 |
| --- | --- |
| 大块 Epic（跨多能力、需拆分） | ✅ 走需求侧漏斗 → handoff |
| 简单功能修改（如单个 UI 优化） | ⛔ 直走交付侧 |
| Bug Fix | ⛔ 直走交付侧（精简规格） |
| Tech Debt / 重构 | ⛔ 直走交付侧（skip_specs 可选） |

## 治理约束（不因分离而减弱）

- 所有需求产品物必须引用治理基线：`docs/baseline/domain_model.html`（Bounded Context）、`docs/baseline/business_process.html`（L1/L2/L3）、`docs/baseline/service_blueprint.html`（SB-STAGE-*/SB-<LANE>-*）。
- 遵循 `docs/SOPS/SDD_WORKFLOW.md` 的 `req-sdd` 流程分支与 HITL 检查点。
- Schema 优先：`config.yaml`（`schema: req-sdd`）是制品格式与生成指令的唯一事实来源。
- `docs/ROADMAP.md` 是唯一权威；`planning/phase-plan.md` 只引用不扩范围。

## 跨工具一致性

- **skills / commands**：对 `req-*` skills / 命令的任何修改必须同步 `.trae/`、`.cursor/`、`.agents/` 三目录（与既有 openspec-* 一致）。
- **角色定义**：对团队角色（pm/engineer/lead）的修改必须同步 `.opencode/agents/`、`.cursor/agents/`、`.trae/skills/sdd-team/`、`.agents/skills/sdd-team/` 四目录（AGENTS.md 硬约束）。
