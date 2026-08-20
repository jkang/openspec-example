# OpenSpec Practise: 轻量级 SDD 演练场与脚手架

本项目是一个基于 **规格驱动开发 (Spec-Driven Development, SDD)** 的端到端研发实践库，旨在为产品经理与研发团队提供一套衔接产品规划、交互原型与需求分析的 **轻量级 SDD 脚手架**。

我们通过 AI4SE（AI for Software Engineering）的实践，将研发流程从 L3 (Human in the Loop) 推向 L4 (Human on the Loop)，解决需求断链与知识漂移的痛点。

---

## 📋 目录
1. [核心价值：为什么需要轻量级 SDD？](#1-核心价值为什么需要轻量级-sdd)
2. [方案全貌：四层架构与治理闭环](#2-方案全貌四层架构与治理闭环)
3. [快速启动与示例项目实践](#3-快速启动与示例项目实践)
4. [落地指引：如何迁移与扩展到新项目](#4-落地指引如何迁移与扩展到新项目)
5. [成熟度定义：L3 与 L4](#5-成熟度定义l3-与-l4)
6. [目录导航与资源](#6-目录导航与资源)

---

## 1. 核心价值：为什么需要轻量级 SDD？

在 AI 编程时代，最大的痛点不再是“写代码”，而是 **“需求工程的断链”**：
- **输入不稳定**：产品规划与研发执行脱节。
- **分析无落点**：业务规则散落在会议和聊天记录中，导致“知识漂移”。
- **高昂返工成本**：原型未确认即进入开发，导致 Spec 偏离真实意图。

**轻量级 SDD 的核心目标**：
- **消除幻觉**：通过结构化的规格约束 AI，防止代码偏离业务逻辑。
- **快速验证**：利用 `/opsx:prototype` 瞬间生成可交互原型，在写代码前完成验收。
- **知识沉淀**：让业务资产随开发自然沉淀回 **业务基线 (Baseline)**，拒绝一次性文档。

---

## 2. 方案全貌：四层架构与治理闭环

我们定义了四层架构，确保从宏观规划到微观执行的端到端可追溯性：

| 层级 | 核心工件 | 作用 |
| :--- | :--- | :--- |
| **Planning Baseline** | `PRODUCT_SENSE.md`, `ROADMAP.md` | 提供方向、范围和优先级边界 |
| **Business Baseline** | `domain_model.html`, `business_process.html` | 提供稳定的业务边界与流程参照 (L2/L3) |
| **Change-Level Analysis** | `idea.md`, `proposal.md`, `story.md`, `prototypes/` | 定义单次变更的目标、交互与验收标准 |
| **Working Loop** | `specs/`, `design.md`, `tasks.md`, `verify.md` | 确保实现遵循契约，并将认知沉淀回基线 |

### 🔄 Working Loop (端到端大循环)
流程遵循：`规划基线 -> 需求探索 (/opsx:explore) -> 方案提案 (/opsx:propose) -> 原型设计 (/opsx:prototype) -> 业务故事 (/opsx:story) -> 开发实现 -> 基线同步 (/opsx:sync) -> 归档 (/opsx:archive)`。

---

## 3. 快速启动与示例项目实践

本项目预置了一个完整的 **极简电商系统** 作为演练场，涵盖 Node.js、Python 和 Vue 3 实现。

### 🚀 快速启动
```bash
# 1. 环境初始化与查看帮助
./init.sh

# 2. 启动电商示例环境
./init.sh vue:start    # 启动 Vue 前端
./init.sh node:start   # 启动 Node.js 后端
```

### 🛠️ AI 指令实战
在 Trae 或 Cursor 的 AI 侧边栏输入以下指令开启 SDD 之旅：
- **明确方向**：`/opsx:product-sense` 确立产品灵魂。
- **需求探索**：`/opsx:explore "我想加一个积分商城功能，请分析影响范围"`。
- **发起变更**：`/opsx:propose <change-name>` 生成提案与原型。
- **同步回流**：`/opsx:sync` 将开发完成的逻辑自动合并回业务基线。

---

## 4. 落地指引：如何迁移与扩展到新项目

如果你希望在其他业务项目中启用这套脚手架，请遵循以下步骤：

### 5.1 第一步：引入基础引擎
1. 拷贝 `.trae/`, `.cursor/`, `.agents/` 以及 `openspec/config.yaml` 到目标项目。
2. 修改 `config.yaml` 中的项目名称与路径定位。
3. 执行 `mkdir -p docs/baseline openspec/changes` 初始化目录。

### 5.2 第二步：重写并初始化业务基线
1. **清空并重写** `PRODUCT_SENSE.md` 与 `ROADMAP.md`。
2. **初始化基线**：在 `docs/baseline/` 中录入当前系统真实的领域模型与流程。

### 5.3 第三步：执行首个 Change 闭环
通过 `/opsx:explore` 发起首次变更，并使用 `/opsx:sync` 验证基线回流能力。

---

## 5. 成熟度定义：L3 与 L4

- **L3：Human in the Loop**
  - **特点**：人工确认是关键门禁，AI 不能跳过确认断点。
  - **核心**：原型确认、验收标准确认、Spec 审查。
- **L4：Human on the Loop**
  - **特点**：AI 在明确护栏（Baseline、门禁策略）内自治，人负责监督与异常裁决。
  - **核心**：稳定的 Baseline、自动化的质量看板、任务自治。

---

## 6. 目录导航与资源

### 📂 目录结构
```text
├── .trae/ / .cursor/    # AI 指令与 SDD 规则集 (护栏)
├── openspec/            # SDD 引擎工作区
│   ├── specs/           # 主规格说明书 (基线沉淀区)
│   └── changes/         # 活跃变更闭环区 (活跃迭代)
├── docs/                # 治理与基线文档
│   ├── baseline/        # 核心业务基线 (Domain Model / Process Flow)
│   ├── PRODUCT_SENSE.md # 产品定位
│   └── ROADMAP.md       # 迭代路线图
├── ecommerce/           # 示例系统实现 (Node.js/Python/Vue)
└── init.sh              # 统一工程入口
```

### 📚 学习资源
- [入门工作坊手册](./learning-sdd/workshop-facilitation.html)
- [OpenSpec 综合手册](./learning-sdd/openspec-user-manual.md)
- [v2.0 升级解析](./learning-sdd/openspec-v2.0-upgrade.md)

---

## 🔗 链接
- [OpenSpec 官方文档](https://github.com/Fission-AI/OpenSpec)
- [CHANGELOG](./CHANGELOG.md)
