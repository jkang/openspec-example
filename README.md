# OpenSpec Practise: SDD 端到端演练场与脚手架

本项目是一个基于 **规格驱动开发 (Spec-Driven Development, SDD)** 的端到端研发实践库，为产品经理与研发团队提供一套衔接 **产品规划 → 需求调研 → 探索 → 原型 → 需求拆分 → Story 业务面 → 开发交付** 的 **完整 SDD 脚手架**（需求侧 `openspec-requirements/` + 交付侧 `openspec/` 两级解耦）。

我们通过 AI4SE（AI for Software Engineering）的实践，将研发流程从 L3 (Human in the Loop) 推向 L4 (Human on the Loop)，解决需求断链与知识漂移的痛点。

---

> **📌 版本演进**：本仓库保留了三代 SDD 脚手架，可按 tag 检出对照 ——
> [`v1.0-minimal-delivery` 极简交付](https://github.com/jkang/openspec-example/tree/v1.0-minimal-delivery) ·
> [`v2.0-lightweight-sdd` 轻量版](https://github.com/jkang/openspec-example/tree/v2.0-lightweight-sdd) ·
> [`v3.0-full-sdd` 完整版](https://github.com/jkang/openspec-example/tree/v3.0-full-sdd)
>
> 两两差异：[极简 → 轻量](https://github.com/jkang/openspec-example/compare/v1.0-minimal-delivery...v2.0-lightweight-sdd) ·
> [轻量 → 完整](https://github.com/jkang/openspec-example/compare/v2.0-lightweight-sdd...v3.0-full-sdd)
> ｜完整说明见 **[VERSIONS.md](VERSIONS.md)**

---

## 📋 目录
1. [核心价值：为什么需要端到端 SDD？](#1-核心价值为什么需要端到端-sdd)
2. [方案全貌：四层架构与治理闭环](#2-方案全貌四层架构与治理闭环)
3. [快速启动与示例项目实践](#3-快速启动与示例项目实践)
4. [落地指引：如何迁移与扩展到新项目](#4-落地指引如何迁移与扩展到新项目)
5. [成熟度定义：L3 与 L4](#5-成熟度定义l3-与-l4)
6. [目录导航与资源](#6-目录导航与资源)
7. [版本、分支与 Tag](#7-版本分支与-tag)

---

## 1. 核心价值：为什么需要端到端 SDD？

在 AI 编程时代，最大的痛点不再是“写代码”，而是 **“需求工程的断链”**：
- **输入不稳定**：产品规划与研发执行脱节。
- **分析无落点**：业务规则散落在会议和聊天记录中，导致“知识漂移”。
- **高昂返工成本**：原型未确认即进入开发，导致 Spec 偏离真实意图。
- **规模化失控**：多 Epic/Story 并行时缺乏统一需求漏斗与覆盖对账。

**核心目标**：
- **消除幻觉**：通过结构化的规格约束 AI，防止代码偏离业务逻辑。
- **快速验证**：利用 `/req:prototype` 对 Epic 整体生成可交互原型，在写代码前完成验收。
- **知识沉淀**：让业务资产随开发自然沉淀回 **业务基线 (Baseline)**，拒绝一次性文档。
- **两级解耦**：需求侧（PM 主导，仅 Epic）与交付侧（Engineer 主导，从 proposal 起步）隔离，各司其职。

---

## 2. 方案全貌：四层架构与治理闭环

我们定义了四层架构，确保从宏观规划到微观执行的端到端可追溯性：

| 层级 | 核心工件 | 作用 |
| :--- | :--- | :--- |
| **Planning Baseline** | `PRODUCT.md`, `ROADMAP.md` | 提供方向、范围和优先级边界（ROADMAP 按阶段组织，每阶段条目即 Epic） |
| **Business Baseline** | `domain_model.html`, `business_process.html`, `service_blueprint.html`, `design-system/` | 提供稳定的业务边界、流程参照 (L1/L2/L3) 与唯一 UI 设计系统 |
| **Requirements 需求侧** | `epics/<epic-key>/`（research/idea/analysis/prototypes/storymap/stories + `STATUS.md`） | 需求漏斗：调研 → 探索 → 原型 → 拆分 → Story（业务面冻结交付物），PM 主导，仅 Epic |
| **Working Loop 交付侧** | `proposal.md`, `specs/`, `design.md`, `tasks.md`, `verify.md` | 确保实现遵循契约，并将认知沉淀回基线，Engineer 主导 |

> `docs/governance/delivery_board.html` 是上述四层的只读聚合视图，由 `python3 scripts/generate_delivery_board.py` 生成，不是新的规划源。

### 🔄 Working Loop (端到端大循环)
流程遵循：`规划基线 -> 需求调研 (/req:research，识别 Epic) -> 探索 (/req:explore) -> 原型 (/req:prototype，涉及 UI 时、Epic 整体) -> 拆分 (/req:storymap) -> Story (/req:story) -> 交接 (/req:handoff，合成 proposal) -> 规格与设计 (/opsx:spec-design) -> 实施 (/opsx:apply) -> 验证 (/opsx:verify) -> Spec Sync (/opsx:sync，change 级) -> 归档 (/opsx:archive) -> Epic 收尾 Baseline Sync (/opsx:baseline/sync，Epic 级)`。

- **大块 Epic**：走需求侧漏斗（`/req:` 命令空间），交付侧从 proposal 起步。
- **Bug Fix / Tech Debt / 简单功能**：直走交付侧（`/opsx:propose` 起），不走需求漏斗。

---

## 3. 快速启动与示例项目实践

本项目预置了一个完整的 **小型电商系统** 作为演练场，涵盖 Node.js、Python、Vue 3 与微信小程序实现。

### 🚀 快速启动
```bash
# 1. 环境初始化与查看帮助
./init.sh

# 2. 启动电商示例环境
./init.sh vue:start     # 启动 Vue 前端
./init.sh node:start    # 启动 Node.js 后端
./init.sh python:start  # 启动 Python 后端
./init.sh test:all      # 运行全站后端测试
./init.sh e2e:run       # 运行全局 Cucumber E2E（需先 e2e:install）
```

### 🤖 AI 入口：opencode / Trae / Cursor

| 工具 | 入口 | 使用方式 |
| :--- | :--- | :--- |
| **opencode（权威）** | `opencode` → `lead` agent | `lead` 自动调度 `pm` / `engineer` / `qa` / `reviewer`，按阶段加载 `.agents/skills/` 下对应 skill；无需记忆 slash command |
| **Trae** | `.trae/commands/` | 输入 `/req:*`、`/opsx:*` 指令 |
| **Cursor** | `.cursor/commands/` + `.cursor/agents/` | 输入 `/req:*`、`/opsx:*` 指令 |

> 角色定义以 `.opencode/agents/` 为权威，`.cursor/agents/` 为格式适配副本；`.agents/`、`.trae/`、`.cursor/` 下的 skills/commands 必须保持同步（见 `AGENTS.md`）。

### 🛠️ 指令地图（按阶段）

| 阶段 | opencode skill | Trae / Cursor 指令 | 说明 |
| :--- | :--- | :--- | :--- |
| 规划 | `product-vision` / `product-planning` | `/opsx:planning:product-vision` / `/opsx:planning:product-planning` | 维护 `PRODUCT.md` / `ROADMAP.md` |
| 需求调研 | `research` | `/req:research` | 产出 `research.md`，识别 Epic 并创建目录 |
| 需求探索 | `explore` | `/req:explore` | 产出 `idea.md` + To-Be + 候选 Capabilities |
| Epic 原型 | `prototype` | `/req:prototype` | **涉及 UI 时**，拆分前完成 Epic 整体原型 |
| 需求拆分 | `storymap` | `/req:storymap` | 覆盖对账，拆出 Story |
| Story | `story` | `/req:story` | 业务面冻结交付物 |
| 交接 | `handoff` | `/req:handoff` | 合成 proposal + 登记 Epic 队列 |
| 直走提案 | `propose` | `/opsx:propose` | Bug Fix / Tech Debt / 简单功能 |
| 直走原型 | `prototype` | `/opsx:prototype` | 涉及 UI 时 |
| 规格设计 | `spec-design` | `/opsx:spec-design` | 生成 specs / design / tasks |
| 实施 | `apply-change` | `/opsx:apply` | 按 `tasks.md` 实施 |
| 验证 | `verify` | `/opsx:verify` | 硬门禁 + E2E 证据写入 `verify.md` |
| 技术评审 | `reviewer` agent | `/opsx:review` | 五维审计，P0-P3 分级 + 修复计划写入 `review.md` |
| 计划修订 | `update-change` | `/opsx:update` | 先改规格/设计，再继续实施 |
| Spec Sync | `sync-specs` | `/opsx:sync` | change 级同步 |
| 归档 | `archive-change` | `/opsx:archive` | 更新 Epic 队列并归档 |
| Baseline Sync | `baseline/*` | `/opsx:baseline/sync` | Epic 全部 Story 归档后统一执行 |
| 交付看板 | `delivery-board` | `/opsx:governance:delivery-board` | 生成 `delivery_board.html` |

> 示例：先确认 `docs/ROADMAP.md` 已登记目标 Epic，再从 `/req:research` 开始。当前阶段与 Epic 以 `docs/ROADMAP.md` 为唯一权威。

---

## 4. 落地指引：如何迁移与扩展到新项目

> **迁移原则**：只迁移「SDD 引擎」，不要把本仓库的电商示例产物（specs / changes / epics / baseline / design-system）一起搬走。
>
> **迁移前必读**：[`docs/SOPS/SDD_WORKFLOW.md`](./docs/SOPS/SDD_WORKFLOW.md)、[`openspec-requirements/README.md`](./openspec-requirements/README.md)、[`.trae/skills/baseline/blueprint/SKILL.md`](./.trae/skills/baseline/blueprint/SKILL.md)。
>
> **可执行助手**：`./scripts/migrate-scaffold.sh <目标绝对路径>` 可完成「引擎复制 + 空目录初始化 + 项目级模板生成」；脚本不会替目标项目重写业务规则、AGENTS.md 与 `init.sh`，这些仍需按 4.3 / 4.4 完成。

### 4.1 第一步：分清「引擎」与「示例」

| 类别 | 路径 | 迁移动作 |
| :--- | :--- | :--- |
| **引擎：opencode 入口** | `.opencode/agents/`、`.opencode/skills/`、`.opencode/commands/`（可选教学命令）、`opencode.jsonc` | 复制；`opencode.jsonc` 的 `default_agent` 保持 `lead` |
| **引擎：跨工具镜像** | `.agents/skills/`、`.agents/commands/`、`.trae/`、`.cursor/` | 复制；三个目录的 skills/commands 必须保持同步（AGENTS.md 硬约束） |
| **引擎：交付侧** | `openspec/config.yaml`、`openspec/schemas/`、`openspec/templates/` | 只复制配置、Schema、模板 |
| **引擎：需求侧** | `openspec-requirements/config.yaml`、`schemas/`、`templates/`、`tools/`、`README.md` | 只复制配置、Schema、模板、工具箱 |
| **引擎：治理与收尾** | `docs/SOPS/SDD_WORKFLOW.md`、`scripts/generate_delivery_board.py`、`scripts/migrate-scaffold.sh` | 复制；SOP 中的命令入口与项目示例需按目标项目调整 |
| **按需：Harness** | `init.sh`、`e2e-tests/` | 按目标项目改写测试入口后再复制/启用 |
| **示例：不要复制** | `openspec/specs/*`、`openspec/changes/archive/*`、`openspec/idea.md`、`openspec/epic-*.story-list.json` | 目标项目保持空目录 |
| **示例：不要复制** | `openspec-requirements/epics/*`、`openspec-requirements/archive/*` | 目标项目保持空目录 |
| **示例：不要复制** | `docs/PRODUCT.md`、`docs/ROADMAP.md`、`docs/FRONTEND.md`、`docs/ARCHITECTURE.md`、`docs/TESTING_STRATEGY.md`、`docs/QUALITY_SCORE.md` | 按目标项目重写，不要直接沿用电商内容 |
| **示例：不要复制** | `docs/baseline/*.html`、`docs/baseline/design-system/`、`docs/governance/delivery_board.html` | 用 baseline / design-system / delivery-board 技能重新生成 |
| **示例：不要复制** | `ecommerce/`、`outputs/`、`learning-sdd/` | 与本项目业务无关 |

### 4.2 第二步：复制与初始化目录

推荐直接使用迁移脚本（会先检查目标目录，避免覆盖已有脚手架）：

```bash
# 目标目录需已存在；--force 才会合并到已存在的脚手架目录
./scripts/migrate-scaffold.sh /path/to/new-project

# 已存在同名目录、确认要合并时（--force 会覆盖同名文件，请先备份/提交）
./scripts/migrate-scaffold.sh /path/to/new-project --force
```

迁移后目标项目至少应存在：

```text
.opencode/agents/lead.md
.opencode/commands/
.agents/skills/
.agents/commands/
.trae/commands/
.cursor/commands/
opencode.jsonc
AGENTS.md
openspec/config.yaml
openspec/schemas/spec-driven.yaml
openspec/templates/
openspec-requirements/config.yaml
openspec-requirements/schemas/req-sdd.yaml
openspec-requirements/templates/
openspec-requirements/tools/
docs/SOPS/SDD_WORKFLOW.md
scripts/generate_delivery_board.py
```

并保持以下目录为空：

```text
openspec/specs/
openspec/changes/            # 仅保留 archive/
openspec-requirements/epics/
openspec-requirements/archive/
```

> 手工迁移时，同样只复制上表的「引擎」文件；不要用 `cp -r openspec/`、`cp -r openspec-requirements/`、`cp -r docs/` 整目录拷贝，否则会把本仓库的电商规格、归档 Epic 与 baseline 一并带入。

### 4.3 第三步：重写项目级配置（不是只改项目名）

以下文件必须按目标项目重写，不能保留电商默认值：

1. **`openspec/config.yaml`**
   - `context`：项目名、治理文档路径、技术栈。
   - `planning`：`PRODUCT.md` / `ROADMAP.md` / 三个 baseline 路径。
   - `rules.proposal` / `specs` / `design` / `tasks`：治理映射、Gherkin 标签、E2E 入口。
   - `rules.prototype`：目标项目 design system 的 UI 约束，不要保留 ZAPP / slate 示例。
2. **`openspec-requirements/config.yaml`**
   - `context` / `planning` / `rules`：需求漏斗、工具箱映射、原型 UI 约束。
   - 与 `openspec/config.yaml` 的 UI、测试与治理口径保持一致。
3. **`opencode.jsonc`**
   - `default_agent` 保持 `lead`；按需保留或删除 MCP 配置。
4. **`AGENTS.md`**
   - 角色表、权限、`/req:` `/opsx:` 路由、`init.sh` 测试入口、目录结构。
5. **`init.sh`（或目标项目自有 Harness）**
   - 模块路径、端口、测试命令；若没有多模块，改写 `openspec/config.yaml` 的 `rules.tasks` 测试入口。
6. **`docs/SOPS/SDD_WORKFLOW.md`**
   - 命令入口（`/req:` / `/opsx:` / opencode skill）、示例路径与门禁命令按目标项目调整。

> **硬约束**：两个 `config.yaml` 的 `rules` 是 AI 的实际护栏。只改项目名、保留电商规则，会直接污染新项目的规格、原型与验证口径。

### 4.4 第四步：初始化规划与业务基线

1. **`docs/PRODUCT.md`**：产品定位、价值主张、AI 决策准则。
2. **`docs/ROADMAP.md`**：按阶段组织，**每阶段条目即 Epic**（需求侧唯一权威入口）。
3. **`docs/baseline/`**：用 baseline 技能录入真实内容，不要复制电商 HTML。
   - `domain_model.html`：Bounded Context → Capability 映射。
   - `business_process.html`：L1 / L2 / L3 流程节点。
   - `service_blueprint.html`：`SB-STAGE-*` / `SB-<LANE>-*` 稳定锚点。
4. **`docs/baseline/design-system/`**：首个涉及 UI 的 Epic 前，调用 `brand-design-system`（`openspec-requirements/tools/`）生成；它是唯一 UI 事实来源。
5. **`docs/governance/delivery_board.html`**：运行 `python3 scripts/generate_delivery_board.py` 生成，不要手工编辑。
6. **环境依赖**：Python 3 + `jinja2` + `pyyaml`（分析工具编译引擎）；Node.js ≥ 18（`brand-design-system` / 原型工具）。

### 4.5 第五步：跑通首个 Epic 闭环

**前置**：`docs/ROADMAP.md` 中已有目标 Epic 条目。

**需求侧（仅大块 Epic）**：

```text
/req:research → /req:explore →（涉及 UI）/req:prototype → /req:storymap → /req:story → /req:handoff
```

- 每个阶段产物完成后必须经过 HITL 确认。
- `research` 负责识别 Epic 并创建 `epics/<epic-key>/`；`storymap` 必须做覆盖对账。
- `/req:handoff` 的动作：创建 `openspec/changes/<name>/`、**合成 `proposal.md`**、登记 `openspec/epic-<key>.story-list.json`、回填 `story.md` / `storymap.md` / `STATUS.md`。
- **UI 门禁**：涉及 UI 的 Epic 没有已确认的 Epic 整体原型，禁止交接。

**交付侧**：

```text
直走任务：/opsx:propose →（涉及 UI）/opsx:prototype → /opsx:spec-design
handoff 任务：从已合成 proposal 起步 → /opsx:spec-design
```

- 实施前：`openspec validate "<name>"`，并初始化 `openspec/changes/<name>/verify.md`。
- 实施：`/opsx:apply`；计划变化先走 `/opsx:update`。
- 验证：`/opsx:verify`（目标项目定义的硬门禁全部 PASS；示例项目为 Node / Python / Frontend）；目标 Harness 的 E2E 为软门禁（示例项目为 `./init.sh e2e:run`），失败需在 `verify.md` 记录摘要。
- 回流：`/opsx:sync`（change 级 Spec Sync）。
- 归档：`/opsx:archive`（更新 `epic-*.story-list.json`，Epic 队列收尾）。

**Epic 收尾**（全部 Story 已归档后）：

```text
story-list.json 归档 → lead 回填 STATUS.md（all-done）→ epics/<key>/ 移入 archive/YYYY-MM-DD-<key>/
→ /opsx:baseline/sync（含显式 No-op 判定）→ /opsx:planning:product-planning（Roadmap 更新）
→ 重新生成 docs/governance/delivery_board.html
```

### 4.6 第六步：扩展指引（新增能力时改哪里）

| 扩展点 | 必改文件 | 同步检查 |
| :--- | :--- | :--- |
| 新增 skill / command | `.agents/skills/`、`.agents/commands/` + `.trae/` + `.cursor/`；opencode 侧按需同步 `.opencode/commands/` 或在 `.opencode/agents/` / skill 中引用 | 三目录 `diff -rq`；更新 `AGENTS.md` / SOP |
| 新增 opencode 角色 | `.opencode/agents/<role>.md` + `.cursor/agents/<role>.md` + `AGENTS.md` | `mode` / `temperature` / 权限 |
| 新增需求分析工具 | `openspec-requirements/tools/<tool>/` + `tools/README.md` + `req-sdd.yaml` 的 `analysis.tool_map` + 对应阶段 skill | 产物落位 `epics/<key>/analysis/` |
| 新增 capability / Bounded Context | `docs/baseline/domain_model.html` + `openspec/config.yaml` 的规则 + 相关 spec | Baseline Sync 判定 |
| 新增流程 / 旅程 / 蓝图节点 | `business_process.html` / `service_blueprint.html`（经 baseline 技能） | `L1-L3` / `SB-*` 锚点真实可引用 |
| 新增 design token | `docs/baseline/design-system/` + `docs/FRONTEND.md` + 两个 config 的 `rules.prototype` | 浏览器验证视觉约束 |
| 新增 Epic / Story | `docs/ROADMAP.md`（Epic 条目）+ 需求侧漏斗 | 不直接在 `openspec/changes/` 里规划 Epic |

### 4.7 第七步：迁移自检清单

- [ ] `.opencode/agents/lead.md` 存在，`opencode.jsonc` 的 `default_agent` 为 `lead`。
- [ ] `.trae/` / `.cursor/` / `.agents/` 的 skills / commands 已同步（`diff -rq`）。
- [ ] 两个 `config.yaml` 已重写：无电商 / ZAPP / slate / Node / Python 示例残留。
- [ ] `openspec/specs/`、`openspec/changes/`（除 `archive/`）、`openspec-requirements/epics/`、`archive/` 为空。
- [ ] `docs/PRODUCT.md` 与 `docs/ROADMAP.md` 已重写，ROADMAP 每阶段条目即 Epic。
- [ ] baseline HTML 锚点真实：`SB-STAGE-*` / `L1-L3` / Bounded Context → Capability。
- [ ] `docs/baseline/design-system/` 已生成，或明确标记为「首个 UI Epic 前生成」。
- [ ] `python3 scripts/generate_delivery_board.py` 可运行。
- [ ] `./init.sh`（或目标 Harness）的测试入口可用。
- [ ] Trae / Cursor 能调用 `/req:*` `/opsx:*`；opencode 能由 `lead` 加载对应 skill。

---

## 5. 成熟度定义：L3 与 L4

- **L3：Human in the Loop**
  - **特点**：人工确认是关键门禁，AI 不能跳过确认断点。
  - **核心**：需求调研确认、探索确认、原型确认、Story 验收确认、Verify 结果确认、Baseline Sync 确认。
- **L4：Human on the Loop**
  - **特点**：AI 在明确护栏（Baseline、门禁策略）内自治，人负责监督与异常裁决。
  - **核心**：稳定的 Baseline、自动化的质量看板、任务自治。

---

## 6. 目录导航与资源

### 📂 目录结构
```text
├── .opencode/           # opencode 权威入口（4 角色 agents + meta skills + 教学命令）
├── .agents/ / .trae/ / .cursor/  # 跨工具 skills / commands 镜像（必须保持同步）
├── AGENTS.md            # Agent 引导入口（角色、协作契约、路由）
├── opencode.jsonc       # opencode 配置（default_agent=lead）
├── openspec/            # SDD 交付侧引擎工作区
│   ├── config.yaml
│   ├── schemas/         # spec-driven schema（交付侧唯一事实来源）
│   ├── templates/       # proposal / spec / design / tasks / verify 模板
│   ├── specs/           # 主规格说明书 (基线沉淀区)
│   └── changes/         # 活跃变更闭环区 (活跃迭代 + archive)
├── openspec-requirements/  # 需求侧工作区（以 Epic 为工作单元）
│   ├── config.yaml
│   ├── schemas/         # req-sdd v5（需求侧唯一事实来源）
│   ├── templates/       # research / idea / prototype / storymap / story / STATUS 模板
│   ├── tools/           # 8 个可选需求分析工具（OSM / Process / Journey / 原型 / Design System 等）
│   ├── epics/           # 活跃 Epic（research/idea/analysis/prototypes/storymap/stories/STATUS.md）
│   └── archive/         # 已完成 Epic 归档
├── docs/                # 治理与基线文档
│   ├── SOPS/            # SDD 工作流 SOP
│   ├── governance/      # delivery_board.html（生成）
│   ├── baseline/        # Domain Model / Process Flow / Service Blueprint / Design System
│   ├── PRODUCT.md       # 产品定位与价值主张
│   └── ROADMAP.md       # 迭代路线图（每阶段条目即 Epic）
├── ecommerce/           # 示例系统实现 (Node.js / Python / Vue / 微信小程序)
├── e2e-tests/           # Cucumber BDD 全链路测试
├── scripts/             # 脚手架迁移与交付看板生成
└── init.sh              # 统一工程入口
```

### 📚 学习资源
- [SDD 完整版提案](./learning-sdd/ai4se-sdd-proposal.md)
- [版本演进导航 (VERSIONS.md)](./VERSIONS.md)
- [SDD 工作流 SOP](./docs/SOPS/SDD_WORKFLOW.md)
- [需求侧工作区说明](./openspec-requirements/README.md)
- [需求分析工具箱](./openspec-requirements/tools/README.md)
- [Service Blueprint 标准](./.trae/skills/baseline/blueprint/SKILL.md)
- [前端治理规范](./docs/FRONTEND.md) · [后端架构指南](./docs/ARCHITECTURE.md) · [测试策略](./docs/TESTING_STRATEGY.md) · [质量标准](./docs/QUALITY_SCORE.md)

---

## 7. 版本、分支与 Tag

本仓库保留了三代 SDD 脚手架：用 **Tag 冻结版本快照**，用 **分支承载当前开发线与只读快照**。

### 🏷️ 版本 Tag（按时间递进）

| Tag | 日期 | 定位 | 相对上一代新增 |
| :--- | :--- | :--- | :--- |
| [`v1.0-minimal-delivery`](https://github.com/jkang/openspec-example/tree/v1.0-minimal-delivery) | 2026-08-17 | **极简交付** — OpenSpec 原生单 Change 管线 | 三件最小扩展：跨工具脚手架（`.trae` / `.cursor` / `.agents`）、仓库内 Schema 与模板、原型能力 |
| [`v2.0-lightweight-sdd`](https://github.com/jkang/openspec-example/tree/v2.0-lightweight-sdd) | 2026-08-28 | **轻量版** — 单条知识闭环的最小集 | 规划层（Product / ROADMAP）、业务基线（Blueprint / Process / Domain）、Story、Harness / E2E |
| [`v3.0-full-sdd`](https://github.com/jkang/openspec-example/tree/v3.0-full-sdd) | 2026-09-18 | **完整版** — 复杂业务端到端 | 需求侧 / 交付侧两级解耦（`openspec-requirements/`）、需求工程链路、分层 Sync、4 角色协同 |

**看演进（两两对比）**：
[极简 → 轻量](https://github.com/jkang/openspec-example/compare/v1.0-minimal-delivery...v2.0-lightweight-sdd) ·
[轻量 → 完整](https://github.com/jkang/openspec-example/compare/v2.0-lightweight-sdd...v3.0-full-sdd) ·
[极简 → 完整](https://github.com/jkang/openspec-example/compare/v1.0-minimal-delivery...v3.0-full-sdd)

### 🌿 分支

| 分支 | 内容 | 用途 |
| :--- | :--- | :--- |
| `main` | **v3 完整版**（最新） | 默认分支，承载版本导航 |
| `full-sdd` | 与 `main` 同源 | v3 开发线别名 |
| `release/v1-minimal` | = tag `v1.0-minimal-delivery` | v1 只读快照 |
| `release/v2-lightweight` | = tag `v2.0-lightweight-sdd` | v2 只读快照 |
| `release/v3-full` | = tag `v3.0-full-sdd` | v3 只读快照 |

### 📥 检出任意版本

```bash
# 用 Tag 检出（推荐）
git clone -b v1.0-minimal-delivery https://github.com/jkang/openspec-example.git
git clone -b v2.0-lightweight-sdd  https://github.com/jkang/openspec-example.git
git clone -b v3.0-full-sdd         https://github.com/jkang/openspec-example.git

# 用只读分支检出
git clone -b release/v2-lightweight https://github.com/jkang/openspec-example.git
```

> 各版本的完整说明、运行方式与提案文档索引见 **[VERSIONS.md](VERSIONS.md)**。

---

## 🔗 链接
- [OpenSpec 官方文档](https://github.com/Fission-AI/OpenSpec)
- [CHANGELOG](./CHANGELOG.md)
