# openspec-requirements

**需求侧工作区** —— 产品经理（PM）专属，**仅用于大块 Epic 需求**。独立于 `openspec/`（开发侧），用于在开发介入前，把「需求调研 → 需求探索 → 原型（Epic 整体）→ 需求拆分 → Story」这条需求漏斗完整走完，产出可交给开发的**冻结交付物（Story，业务面）**。

> 与 `openspec/` 平级目录，二者互相隔离，避免干扰。
> **适用范围**：仅大块 Epic 需求走本工作区。Bug Fix / Tech Debt / 简单功能修改（如单个 UI 优化）**直走交付侧**，不走本流程。

## 需求漏斗（v5 · 以 Epic 为工作单元）

```
docs/ROADMAP.md（唯一权威，阶段条目即 Epic）
  → ① research（调研，只收集，据结果识别 Epic 并创建 epics/<epic-key>/）
  → ② explore（探索，转化：To-Be Process / To-Be Journey / 候选 Capabilities，产出 idea.md）
       └─ 可选分析增强（tools/）: OSM 度量 / Process L1/L2 可视化 / Journey 可视化 → analysis/
  → ③ prototype（Epic 整体原型，拆分前一次完成）
       ├─ 前置（产品级）: brand-design-system → docs/baseline/design-system/
       ├─ 分支 A: Vue3+Tailwind HTML 原型（简单 UI）
       └─ 分支 B: 可工作原型（复杂业务，prototype-generator）→ prototypes/working/
  → ④ storymap（拆分 + 覆盖对账；可选 story-map-generator 可视化 → analysis/storymap/）
  → ⑤ story（业务面冻结交付物；可选 story-narrative-generator 详述 → analysis/narrative/）
  → /req:handoff → 开发侧 openspec/changes/<name>/（合成 proposal.md 后从 proposal 起步）
  → Epic 全部 Story 完成 → 归档 archive/YYYY-MM-DD-<epic-key>/
```

| 阶段 | 产物 | 目录 | 主导 | 命令 |
| --- | --- | --- | --- | --- |
| ① 需求调研 | `epics/<epic-key>/research.md`（只收集，含访谈原始记录；**先调研→识别 Epic→创建目录**） | `epics/<epic-key>/` | PM | `/req:research` |
| ② 需求探索 | `epics/<epic-key>/idea.md`（业务意图 + To-Be Process/Journey + 候选 Capabilities） | `epics/<epic-key>/` | PM | `/req:explore` |
| ②′ 探索分析（可选） | `epics/<epic-key>/analysis/{osm,process,journey}/`（OSM / Process L1/L2 / Journey 可视化） | `epics/<epic-key>/analysis/` | PM | `/req:explore` |
| ③ 原型（Epic 整体） | 分支 A：`epics/<epic-key>/prototypes/*.html`；分支 B（复杂业务）：`epics/<epic-key>/prototypes/working/`（可工作原型） | `epics/<epic-key>/prototypes/` | PM | `/req:prototype` |
| ③′ Design System（产品级，可选） | `docs/baseline/design-system/`（三层 tokens + 组件规格） | `docs/baseline/design-system/` | PM | `/req:prototype` |
| ④ 需求拆分 | `epics/<epic-key>/storymap.md`（含覆盖对账：承诺项 + 候选 Capability 逐项承接） | `epics/<epic-key>/` | PM | `/req:storymap` |
| ⑤ 需求单元 | `epics/<epic-key>/stories/<story-key>/story.md`（业务面冻结交付物） | `epics/<epic-key>/stories/` | PM | `/req:story` |
| ⑥ 开发交接 | `openspec/changes/<name>/`（合成 proposal.md） | `openspec/` | Engineer（经 `/req:handoff`） | `/req:handoff` |
| ⑦ Epic 归档 | `archive/YYYY-MM-DD-<epic-key>/`（整个 Epic 目录归档） | `archive/` | Lead | `/req:handoff` 末 Story 提示 |

## 需求分析工具箱 (Analysis Toolbox)

`openspec-requirements/tools/` 内置 8 个 AI4PM 需求工程工具（自包含，来自 AI4PM 技能库裁剪适配），为需求漏斗各阶段提供**可选增强**：结构化分析与可视化产物。所有分析制品均为 **optional**，缺省不影响原漏斗 HITL 门禁；工具详情与调用契约见 `tools/README.md`。

| 工具 | 阶段 | 作用 | 产物落位 |
| --- | --- | --- | --- |
| `osm-map-generator` | explore | Epic 目标-策略-度量（Exit Criteria 度量锚点） | `analysis/osm/` |
| `business-process-deep-analyzer` | explore | To-Be Process L1/L2 + 痛点热力 | `analysis/process/` |
| `journey-map-generator` | explore | To-Be Journey 可视化 | `analysis/journey/` |
| `blueprint-map-generator` | baseline/blueprint | 服务蓝图 YAML→HTML 渲染管线（增强 baseline skill） | `docs/baseline/` |
| `brand-design-system` | prototype 前置 | 产品 design system（三层 tokens + 组件规格） | `docs/baseline/design-system/` |
| `prototype-generator` | prototype | 复杂业务 → 可工作原型（前后端一体化） | `prototypes/working/` |
| `story-map-generator` | storymap | 4 层用户故事地图可视化 | `analysis/storymap/` |
| `story-narrative-generator` | story | 故事详述（角色画像/AC/交互逻辑） | `analysis/narrative/<story-key>/` |

**环境依赖**：Python 3 + `jinja2` + `pyyaml`（编译引擎）；Node.js ≥ 18（`brand-design-system` tokens 脚本）。

## 目录约定（以 Epic 为单元）

- **`epics/<epic-key>/`**：一个 Epic 一个目录，该 Epic 的**全部需求产物内聚于此**（research.md / idea.md / analysis/ / prototypes/ / storymap.md / stories/）。Epic key 由 `research` 阶段据调研结果识别（对齐 ROADMAP 阶段条目）。
- **`epics/<epic-key>/analysis/`**：可选分析制品（OSM/Process/Journey/Storymap 可视化 + Narrative 详述），由 `tools/` 生成。
- **`tools/`**：需求分析工具箱（8 个 AI4PM 工具，自包含单份拷贝，三目录 skills 引用之）。
- **`archive/YYYY-MM-DD-<epic-key>/`**：已完成的 Epic 归档区（对齐开发侧 `openspec/changes/archive/` 模式）。Epic 所有 Story 完成交接且开发侧全部归档后，整个 `epics/<epic-key>/` 目录移入此处，保留完整交付记录，禁止删除。
- **`templates/`**：需求侧制品模板（research/idea/prototype/storymap/story）。
- **`schemas/req-sdd.yaml`**：需求侧 schema（版本 v5：research→explore→prototype→storymap→story→handoff + 7 个 optional 分析制品）。

## 交接契约（story → 开发侧）

- **Story.md 是需求侧唯一冻结交付物（业务面）**。行为规格（Story-specs，按 capability 拆分的 specs）**不由需求侧生成**。
- 开发侧通过 `/req:handoff`（skill: handoff）读取 `epics/<epic-key>/stories/<story-key>/story.md`，在 `openspec/changes/<name>/` 创建 change 并**合成 `proposal.md`**（Why/What/Capabilities/Alignment/Impact），开发侧**从 proposal 起步**，随后按 capability 拆分生成 specs → design → tasks → apply → verify → sync → archive。
- 开发侧**不再有** explore / 需求拆分 / prototype / story 输出（均已前移到需求侧）。
- 若开发中发现需求缺口，回关本工作区（`research/explore/storymap/story` skill），不擅自改需求侧规划。
- UI 门禁：涉及 UI 的 Story，无已确认的 Epic 整体原型（`epics/<epic-key>/prototypes/*.html`）禁止交接。
- 分层 Sync：每个 change 只做 Spec Sync（`/opsx:sync`，change 级）；Baseline Sync（`/opsx:baseline/sync`）在 Epic 全部 Story 归档后统一执行。
- **Epic 归档**：末 Story 交接时 `/req:handoff` 提示，`lead` 确认后将 `epics/<epic-key>/` 归档至 `archive/YYYY-MM-DD-<epic-key>/`，随后 Baseline Sync + Roadmap 更新。

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

- **skills / commands**：对 `/req:` 命名空间下的 skills / 命令的任何修改必须同步 `.trae/`、`.cursor/`、`.agents/` 三目录（与既有 `/opsx:` 一致）。
- **角色定义**：对团队角色（pm/engineer/lead）的修改必须同步 `.opencode/agents/`、`.cursor/agents/` 两处（AGENTS.md 硬约束）。
