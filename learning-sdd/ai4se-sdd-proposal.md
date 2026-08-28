# SDD 端到端提案：需求工程与开发闭环的一体化流程

> **提案目的**：给内部 AI4SE Council 一套可落地的完整方案，把产品规划、需求调研、交互原型、需求分析与规格驱动开发（SDD）接成**端到端可追溯闭环**，支持研发流程逐步达到 L3（Human in the Loop）到 L4（Human on the Loop）的成熟度。
> **演进**：由 `ai4se-lightweight-sdd-proposal.md`（轻量版）演进而来——引入**需求侧/交付侧两级解耦**，补齐需求工程链路。
> **开源参考**：[openspec-example](https://github.com/jkang/openspec-example.git)

---

## 📋 目录
1. [核心挑战：断链的需求工程与孤立的 SDD](#1-核心挑战断链的需求工程与孤立的-sdd)
2. [方案全貌：端到端可追溯闭环](#2-方案全貌端到端可追溯闭环)
3. [核心设计与取舍](#3-核心设计与取舍)
4. [推荐脚手架配置与目录组织](#4-推荐脚手架配置与目录组织)
5. [落地指引：如何在其他业务项目中启用](#5-落地指引如何在其他业务项目中启用)
6. [延伸思考：L3/L4 成熟度定义与落地建议](#6-延伸思考l3l4-成熟度定义与落地建议)
7. [开源资源与参考](#7-开源资源与参考)

---

## 1. 核心挑战：断链的需求工程与孤立的 SDD

现在很多团队说 SDD，实际落地主要集中在 **Coding 阶段**：
- AI 根据 spec、design、tasks 生成代码。
- Verify 保障实现质量。
- L4 的讨论也往往集中在"代码实现能否自治"。

> **痛点直击**：Coding 阶段之前的信息准备，往往还是割裂的。

- **输入不稳定**：产品规划和路线图在上游单独管理，研发拿到的往往是压缩后的结果。
- **分析无落点**：需求分析散落在会议、IM 对话和 Jira 卡片里，缺少稳定、可追溯的链路。
- **知识严重割裂**：业务文档说 A，代码实现逻辑是 B。这种"知识漂移"导致系统最终沦为黑盒。
- **高昂返工成本**：很多返工源于原型未确认、边界不清晰，导致 Spec 从一开始就偏离了真实意图。

**本提案核心：把 SDD 往前接到 Planning、Research、Prototype 和 Analysis，让端到端流程不断链。**

---

## 2. 方案全貌：端到端可追溯闭环

### 2.1 四层架构定义

| 层级 | 核心工件 | 作用 |
| :--- | :--- | :--- |
| **Planning Baseline** | `PRODUCT_SENSE.md`, `ROADMAP.md` | 提供方向、范围和优先级边界；**ROADMAP 按阶段组织，每阶段条目即 Epic（一句话描述），一阶段可含多 Epic** |
| **Business Baseline** | `domain_model.html`, `business_process.html`, `service_blueprint.html` | 提供稳定的业务边界与流程参照 |
| **Requirements 需求侧** | `research.md`, `idea.md`, `storymap.md`, `prototypes/*.html`, `story.md` | 需求调研 → 探索 → 拆分 → 原型 → Story（业务面冻结交付物），PM 主导，**仅大块 Epic** |
| **Working Loop 交付侧** | `proposal.md`, `specs/`, `design.md`, `tasks.md`, `verify.md` | 确保实现遵循契约，并将认知沉淀回基线，Engineer 主导 |

### 2.2 Working Loop（端到端大循环）

> 图例：节点标注 `command · skill · 产物`。需求侧命令空间 `/req:`，交付侧 `/opsx:`，规划层 `/opsx:planning:`。`+HITL` = 需人工确认（Human in the Loop 门禁），粗粒度阶段尤其需要。

```mermaid
flowchart TD
    %% ===== 基线层 =====
    A([规划基线<br/>/opsx:planning:product-sense<br/>/opsx:planning:product-planning<br/>PRODUCT_SENSE / ROADMAP])
    B([业务基线<br/>/opsx:baseline/sync<br/>domain_model / business_process / service_blueprint])

    %% ===== 适用范围路由 =====
    R{适用范围路由<br/>任务类型?}

    %% ===== 需求侧 =====
    subgraph ReqSide [需求侧 · 仅大块 Epic · PM 主导]
        direction TB
        P1[需求调研 +HITL<br/>/req:research · skill: research<br/>→ research.md（针对单个 Epic 收集需求）]
        P2[探索 +HITL<br/>/req:explore · skill: explore<br/>→ idea.md（业务设计：<br/>To-Be Process / To-Be Journey /<br/>产品设计思路）<br/>+ 识别候选 Capabilities<br/>（对齐 domain_model BC→Capability）]
        P4{涉及 UI?}
        P5[原型设计（Epic 整体）+HITL<br/>/req:prototype · skill: prototype<br/>→ prototypes/*.html]
        P3[需求拆分 +HITL<br/>/req:storymap · skill: storymap<br/>→ storymap.md（覆盖对账·端到端粒度）]
        P6[Story 交付物 +HITL<br/>/req:story · skill: story<br/>→ story.md（业务面）]
    end

    %% ===== 交接边界 =====
    subgraph Handoff [交接边界]
        H1[handoff<br/>/req:handoff · skill: handoff<br/>→ 合成开发侧 proposal.md]
    end

    %% ===== 交付侧 =====
    subgraph DevSide [交付侧 · Engineer 主导]
        direction TB
        D1[提案<br/>/opsx:propose · skill: propose<br/>→ proposal.md（handoff 合成 或 直走）]
        D2[行为规格<br/>/opsx:spec-design · skill: spec-design<br/>→ specs/*.md（Story-specs·按 capability·h3/h4）]
        D3[设计<br/>/opsx:spec-design · skill: spec-design<br/>→ design.md + tasks.md]
        D4[实施与验证 +HITL<br/>/opsx:apply · skill: apply-change<br/>→ 代码 + verify.md<br/>/opsx:verify · skill: verify]
    end

    %% ===== 收尾层 =====
    K1[Spec Sync · change 级<br/>/opsx:sync · skill: sync-specs<br/>→ delta specs 合并入 openspec/specs]
    L([变更归档<br/>/opsx:archive · skill: archive-change<br/>→ 归档 + epic 队列更新])
    K2[Baseline Sync +HITL · Epic 级<br/>/opsx:baseline/sync · skill: baseline/*<br/>→ 统一回流 docs/baseline + ROADMAP]
    M[周期回顾<br/>/opsx:planning:product-planning · skill: product-planning<br/>→ 更新 ROADMAP]

    %% ===== 流程连接 =====
    A ==> B
    B ==> R

    R -- 大块 Epic --> P1
    R -- Bug Fix / Tech Debt / 简单功能 --> D1

    P1 ==> P2
    P2 ==> P4
    P4 -- 是 --> P5
    P4 -- 否 --> P3
    P5 --> P3
    P3 ==> P6
    P6 ==> H1
    H1 ==> D1

    D1 ==> D2
    D2 ==> D3
    D3 ==> D4
    D4 ==> K1
    K1 ==> L

    L -- 该 Epic 还有下一个 Story --> P6
    L -- 该 Epic 全部 Story 已完成 --> K2
    K2 -.-> B
    K2 ==> M
    M -.-> A

    %% ===== 样式定义 =====
    classDef baseline fill:#bbdefb,stroke:#0d47a1,stroke-width:2px,color:#0d47a1
    classDef logic fill:#fff3e0,stroke:#e65100,stroke-width:2px,color:#e65100
    classDef decision fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,color:#1b5e20
    classDef impl fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px,color:#4a148c
    classDef archive fill:#f5f5f5,stroke:#9e9e9e,stroke-width:2px,color:#616161

    class A,B baseline
    class R,P4 decision
    class P1,P2,P3,P5,P6,H1,K1,K2 logic
    class D1 logic
    class D2,D3,D4 impl
    class L,M archive

    style ReqSide fill:#e8f5e9,stroke:#2e7d32,stroke-dasharray: 5 5
    style Handoff fill:#fff8e1,stroke:#f57f17,stroke-dasharray: 5 5
    style DevSide fill:#f3e5f5,stroke:#7b1fa2,stroke-dasharray: 5 5
```

### 2.3 节点 × 命令 × Skill × 产物 对照表

| 节点 | 环节 | 命令 | Skill | 产物 | 主导 | HITL |
| --- | --- | --- | --- | --- | --- | --- |
| A | 规划基线（起点即含 roadmap·每阶段多 Epic） | `/opsx:planning:product-sense` / `product-planning` | `product-sense` / `product-planning` | `PRODUCT_SENSE.md` / `ROADMAP.md` | PM | — |
| B | 业务基线 | `/opsx:baseline/sync` | `blueprint` / `domain-model` / `process-flow` / `render` | baseline 三件套 html | PM/Lead | — |
| R | 适用范围路由 | 决策点 | — | 分流：Epic→需求侧；其余→交付侧 | Lead | — |
| P1 | 需求调研 | `/req:research` | `research` | `research.md`（单 Epic） | PM | ✅ |
| P2 | 探索 | `/req:explore` | `explore` | `idea.md`（To-Be Process/Journey + 候选 Capabilities） | PM | ✅ |
| P4 | UI 决策 | 决策点 | — | — | PM | — |
| P5 | 原型设计（Epic 整体） | `/req:prototype` | `prototype` | `prototypes/*.html` | PM | ✅ |
| P3 | 需求拆分 | `/req:storymap` | `storymap` | `storymap.md`（覆盖对账） | PM | ✅ |
| P6 | Story 交付 | `/req:story` | `story` | `story.md`（业务面） | PM | ✅ |
| H1 | 交接 | `/req:handoff` | `handoff` | 合成开发侧 `proposal.md` | Lead/PM | — |
| D1 | 提案 | `/opsx:propose` | `propose` | `proposal.md` | Engineer | — |
| D2 | 行为规格 | `/opsx:spec-design` | `spec-design` | `specs/*.md`（Story-specs） | Engineer | — |
| D3 | 设计 | `/opsx:spec-design` | `spec-design` | `design.md` + `tasks.md` | Engineer | — |
| D4 | 实施与验证 | `/opsx:apply` → `/opsx:verify` | `apply-change` / `verify` | 代码 + `verify.md` | Engineer | ✅ |
| K1 | Spec Sync（change 级） | `/opsx:sync` | `sync-specs` | delta→`openspec/specs` | Lead | — |
| L | 归档 | `/opsx:archive` | `archive-change` | 归档 + epic 队列更新 | Lead | — |
| K2 | Baseline Sync（Epic 级） | `/opsx:baseline/sync` | `blueprint` / `domain-model` / `process-flow` / `render` | 统一回流 `docs/baseline/*.html` | Lead | ✅ |
| M | 周期回顾 | `/opsx:planning:product-planning` | `product-planning` | 更新 `ROADMAP.md` | PM | — |

---

## 3. 核心设计与取舍

### 3.1 需求侧 / 交付侧两级解耦
- **需求侧**（`openspec-requirements/`，PM 主导，**仅大块 Epic**）：规划在起点已有（ROADMAP 每阶段多 Epic），需求侧直接针对单个 Epic 做**调研 → 探索 → 原型 → 拆分 → Story**。
- **交付侧**（`openspec/changes/`，Engineer 主导）：从 `proposal` 起步（handoff 合成 或直走），按 capability 拆分行为规格 specs（Story-specs），不再重复需求侧阶段。

### 3.2 适用范围路由
- **大块 Epic** → 需求侧漏斗 → `/req:handoff` → 交付侧。
- **Bug Fix / Tech Debt / 简单功能修改** → 直走交付侧（`/opsx:propose` 起），不走需求漏斗。

### 3.3 需求漏斗各环节

| 环节 | skill | 产物 | 要点 |
| --- | --- | --- | --- |
| 需求调研 | `research` | `research.md` | 针对单个 Epic：背景/干系人/原始反馈/约束/疑问 |
| 探索 | `explore` | `idea.md` | 调研 → 产品设计思路；**含 To-Be Process / To-Be Journey 业务设计**；**识别候选 Capabilities**（对齐 domain_model） |
| 原型（Epic 整体） | `prototype` | `prototypes/*.html` | 拆分**前**对 Epic 整体做一次；HITL 确认 |
| 需求拆分 | `storymap` | `storymap.md` | **覆盖对账**（Epic 每承诺项必有 Story 承接）；粒度=完整端到端功能 |
| Story 交付 | `story` | `story.md` | 业务面冻结交付物（场景/规则/E2E/治理映射），交给 handoff |

### 3.4 交接边界（handoff）
- 读取 `story.md`（业务面）→ 开发侧 `openspec new change` → **合成 `proposal.md`**（Capabilities ← idea 候选 capabilities；Process/Blueprint Alignment ← 治理映射）→ 开发侧从 proposal 起步。
- 需求侧不生成 specs/；行为规格由开发侧按 capability 拆分生成。

### 3.5 分层 Sync（关键取舍）
- **Spec Sync（change 级）**：每个 Story 归档前，delta specs 合并入 `openspec/specs/`（保证后续 Story 依赖最新 specs）。
- **Baseline Sync（Epic 级）**：**Epic 所有 Story 归档后**，统一回流 `docs/baseline/*.html` + Roadmap 判定。理由：避免单个 Story 中间态污染 baseline、避免反复改写、Roadmap 完成判定需 Epic Exit Criteria 全达成。

### 3.6 命名约定
- **skill 按域子目录组织**：`prod/`（产品/需求侧）、`opsx/`（交付侧）、`baseline/`（业务基线）。
- **需求侧 skill 名**不带前缀：`research` / `explore` / `prototype` / `storymap` / `story` / `handoff`（+ 产品侧 `product-sense` / `product-planning` / `delivery-board`）。
- **交付侧 skill 名**去 `openspec-` 前缀：`propose` / `spec-design` / `apply-change` / `verify` / `sync-specs` / `archive-change` / `update-change` / `explore` / `prototype` / `story`。
- **baseline skill 去 `openspec-baseline-` 前缀**：`blueprint` / `domain-model` / `process-flow` / `render`（独立域，不与 prod/opsx 混用）。
- 命令用**命名空间子目录**：需求侧 `/req:`（`.trae/commands/req/`），交付侧 `/opsx:`（`.trae/commands/opsx/`，含 `planning/`、`governance/`、`baseline/` 子目录）。

### 3.7 Lightweight 原则（保留）
降低落地门槛、提升 AI 执行效能、在"混乱"与"过度治理"间寻找平衡。

---

## 4. 推荐脚手架配置与目录组织

### 4.1 目录组织全景图

```text
├── .agents/                 # [基础] 跨工具通用的 Agent 技能定义
│   └── skills/              # [基础] Skill 按域子目录组织（三目录同步）
│       ├── prod/            #   产品/需求侧 skill（research/explore/prototype/storymap/story/handoff + product-sense/product-planning/delivery-board）
│       ├── opsx/            #   交付侧 skill（propose/spec-design/apply-change/verify/sync-specs/archive-change/update-change/explore/prototype/story）
│       └── baseline/        #   业务基线 skill（blueprint/domain-model/process-flow/render）
├── .cursor/                 # [基础] Cursor IDE 的 SDD 规则与门禁指令（skills/ 同 .agents 结构）
├── .trae/                   # [基础] Trae IDE 的 SDD 规则与门禁指令（skills/ 同 .agents 结构）
│   └── commands/
│       ├── req/             # [基础] 需求侧命令空间 /req:*
│       │   ├── research.md  # /req:research
│       │   ├── explore.md   # /req:explore
│       │   ├── prototype.md # /req:prototype
│       │   ├── storymap.md  # /req:storymap
│       │   ├── story.md     # /req:story
│       │   └── handoff.md   # /req:handoff
│       └── opsx/            # [基础] 交付侧命令空间 /opsx:*（含 planning/、governance/、baseline/ 子目录）
├── openspec/                # [基础] SDD 交付侧引擎工作区
│   ├── config.yaml
│   ├── specs/               # 主规格说明书（基线沉淀区）
│   └── changes/             # 变更管理流（proposal/specs/design/tasks/verify）
├── openspec-requirements/   # [基础+业务] 需求侧工作区
│   ├── config.yaml          # schema: req-sdd
│   ├── schemas/req-sdd.yaml # 需求侧 schema（research→explore→prototype→storymap→story→handoff）
│   ├── templates/           # research/idea/storymap/story/prototype 模板
│   ├── research/            # research.md（按 Epic）
│   ├── ideas/               # idea.md
│   ├── prototypes/          # prototypes/*.html（Epic 整体）
│   ├── storymaps/           # storymap.md（按 Epic）
│   └── stories/             # story.md（按 Story）
├── docs/                    # [业务] 项目治理与基线文档区
│   ├── SOPS/SDD_WORKFLOW.md
│   ├── PRODUCT_SENSE.md     # [业务] 产品定位与决策准则
│   ├── ROADMAP.md           # [业务] 阶段目标（每阶段条目即 Epic）
│   ├── FRONTEND.md / ARCHITECTURE.md / TESTING_STRATEGY.md / QUALITY_SCORE.md
│   └── baseline/            # domain_model / business_process / service_blueprint
└── init.sh                  # [业务] 统一的工程环境启动与测试入口脚本
```

### 4.2 基础脚手架部分（直接复用）
- **护栏与指令集**: `.trae/commands/`、`.cursor/`、`.agents/` 下的 `/opsx:*` 与 `/req:*` 指令。
- **流程定义**: `docs/SOPS/SDD_WORKFLOW.md`。
- **产物模板**: 需求侧 `openspec-requirements/templates/`，交付侧 `openspec/templates/`。

---

## 5. 落地指引：如何在其他业务项目中启用

### 5.1 第一步：引入基础引擎与初始化结构
1. **执行迁移脚本**：将 `.trae/`, `.cursor/`, `.agents/`, `openspec/`, `openspec-requirements/` 基础配置以及 `docs/` 模板拷贝至目标项目。
2. **重构 Config**：修改 `openspec/config.yaml` 与 `openspec-requirements/config.yaml` 中的项目背景。

### 5.2 第二步：初始化业务基线
1. **录入规划**：修改 `docs/PRODUCT_SENSE.md` 与 `docs/ROADMAP.md`（**每阶段条目即 Epic**）。
2. **重构规范**：按需修改 `docs/ARCHITECTURE.md` 和 `docs/FRONTEND.md`。
3. **初始化基线 HTML**：在 `docs/baseline/` 录入真实边界与流程。

### 5.3 第三步：执行首个 Epic 闭环（需求侧）
1. **需求调研**：`/req:research` 产出 `research.md`（HITL）。
2. **探索**：`/req:explore` 产出 `idea.md`（含 To-Be 设计 + 候选 Capabilities，HITL）。
3. **原型**：`/req:prototype` 对 Epic 整体做原型（HITL）。
4. **拆分**：`/req:storymap` 产出 storymap（覆盖对账，HITL）。
5. **Story**：`/req:story` 产出 `story.md`（HITL）。

### 5.4 第四步：交接与交付侧闭环
1. **交接**：`/req:handoff` 合成开发侧 proposal。
2. **规格驱动**：`/opsx:spec-design` → `/opsx:apply` → `/opsx:verify`。
3. **Spec Sync（change 级）**：`/opsx:sync` 合并 delta→主规格。
4. **归档**：`/opsx:archive`；循环下一个 Story 或进入 Epic 收尾。
5. **Baseline Sync（Epic 级）**：`/opsx:baseline/sync` 统一回流基线；`/opsx:planning:product-planning` 更新 ROADMAP。

---

## 6. 延伸思考：L3/L4 成熟度定义与落地建议

### 6.1 L3：Human in the Loop
- **特点**：人工确认是关键门禁，AI 不能跳过确认断点。
- **基础门禁**：需求调研确认、探索确认、原型确认、Story 验收确认、Verify 结果确认、Baseline Sync 确认。

### 6.2 L4：Human on the Loop
- **特点**：AI 在明确护栏（Baseline、门禁策略）内自治，人负责监督与异常裁决。
- **核心支撑**：稳定的 Baseline、明确的任务分类、可视化的运行看板。

### 6.3 阶段性落地建议
1. **统一最小制品**：不追求文档量，追求"需求不返工、输出稳定"。
2. **站稳 Story 层**：先落实"业务评审门禁"，解决需求跳步问题。
3. **分层 Sync 驱动基线**：change 级保 specs 连续，Epic 级保 baseline 稳定。

---

> **核心总结**：先建立一条 AI 和团队都能稳定执行的 **最小知识闭环**——需求侧从调研到 Story 业务面冻结，交付侧从 proposal 到归档，中间用 handoff 与分层 Sync 咬合，让需求资产随开发自然沉淀。

---

## 7. 开源资源与参考

- **OpenSpec 示例项目**: [https://github.com/jkang/openspec-example.git](https://github.com/jkang/openspec-example.git)
- **SDD 工作流 SOP**: 参考本代码库 `docs/SOPS/SDD_WORKFLOW.md`
- **需求侧工作区**: 参考本代码库 `openspec-requirements/`
- **流程讨论稿**: `learning-sdd/ai4se-lightweight-sdd-flow-v2-draft.md`
