# OpenSpec Practise: 产品经理的 SDD 演练场

本项目基于 [openspec-practice](https://github.com/Fission-AI/openspec-practice) 进行二次开发与增强。我们在原有的基础上，针对 **需求分析 (Requirement Analysis)** 阶段引入了专门的 AI Skills 与指令集，使其更贴合产品经理的实际工作流。

---

## 🚀 为什么 PM 需要学习 SDD？

在 AI 编程时代，PM 的核心竞争力正在从“写 PRD”转向“定义规格”。
- **消除幻觉**：通过结构化的规格约束 AI，防止代码实现偏离业务逻辑。
- **快速验证**：利用 `/opsx:propose` 瞬间生成可交互原型，在写代码前完成 UI/UX 验收。
- **单一事实来源**：`openspec/specs` 目录下始终保持最新的业务逻辑描述，彻底解决文档与代码脱节的问题。
- **确定性交付**：通过 Gherkin (Given/When/Then) 场景定义，确保每个需求都有对应的自动化测试闭环。

## 🛠️ 核心增强：需求分析 Skills & Commands

本项目不仅是一个代码演示，更是一个 **AI 协作技能库**。我们特别加强了需求分析环节：
- **`opsx:product-sense` (产品感定义)**：确立 Elevator Pitch，明确用户、痛点与竞争优势，防止产品方向漂移。
- **`opsx:product-planning` (滚动路线图)**：维护月度滚动计划，划定 In-Scope/Out-of-Scope 边界，为 AI 探索提供护栏。
- **`opsx:explore` (需求深度探索)**：升级为“6 步法探索”，强制执行 **规划对齐 (Roadmap Alignment)**，确保每一个 Idea 都长在路线图上。
- **`opsx:prototype` (UI 原型验证)**：引入强制的 HITL (人机协同) 检查点，确保 UI 逻辑在进入开发前已获得人类验收。

---

## 🔄 需求到代码的完整实践 (SDD Flow)

本项目由 OpenSpec (v2.0) 框架进行治理。

### 🚀 快速启动

```bash
./init.sh              # 查看帮助菜单
/opsx:product-sense    # (AI) 明确产品感
/opsx:product-planning # (AI) 制定路线图
/opsx:explore          # (AI) 探索需求并对齐路线图
```

### 📖 SDD 工作流 v2.0

我们采用 **规格驱动开发 (Spec-Driven Development)**，将流程分为“规划层”与“交付层”：

1.  **规划层 (Planning Layer)**：通过 `/opsx:product-sense` 和 `/opsx:product-planning` 划定护栏。
2.  **探索阶段 (Explore)**：使用 `/opsx:explore` 深入思考并对齐路线图。
3.  **提案阶段 (Propose)**：使用 `/opsx:propose` 创建变更。
4.  **原型阶段 (Prototype)**：使用 `/opsx:prototype` 验证 UI。
5.46→5.  **设计阶段 (Spec-Design)**：生成 Specs 和技术设计。
47→6.  **交付阶段 (Apply)**：编写代码并完成 E2E 测试。
48→7.  **同步阶段 (Sync)**：执行 `/opsx:sync` 合并规格并**自动回流业务基线**。

---

## 📂 目录导航：你的控制台

| 目录 | 作用 | PM 关注点 |
| :--- | :--- | :--- |
| **`AGENTS.md`** | **AI 导航入口** | 强制约束 AI 的全局行为宪法，人类与 AI 协作的第一入口。 |
| **`init.sh`** | **全局启动器** | 屏蔽底层复杂度，一键启动多模块开发和测试环境。 |
| **`docs/`** | **全局治理与规划** | 包含 `ROADMAP.md` (滚动计划)、`PRODUCT_SENSE.md` (感性定义) 等系统事实与业务护栏。 |
| ├── `baseline/` | **业务基线治理** | **核心认知沉淀**。包含 Journey, Story Map, Process Flow 和 Event-Storming Domain Model 及其可视化 HTML。 |
| **`openspec/`** | **需求中心** | **核心入口**。在这里定义规则、查看历史变更、管理业务逻辑基线。 |
| ├── `specs/` | 业务事实来源 | 系统当前的所有功能规格。这是你与研发沟通的“标准语言”。 |
| ├── `changes/` | 变更工作区 | 正在进行的需求迭代。包含每个需求的提案、原型和任务清单。 |
| ├── `ideas/` | 创意孵化区 | 存储 `/opsx:explore` 产出的 `idea.md`，记录最初的业务构思。 |
| **`ecommerce/`** | **系统实现** | **验证场所**。查看同一套规格如何驱动 Node.js, Python 和 Vue 3 的多端实现。 |
| ├── `ecommerce-mini-frontend/` | 前端界面 | 验收 UI/UX 是否符合“现代扁平化”视觉规范。 |
| ├── `ecommerce-mini-python/` | 高性能后端 | 验证核心计价、核销逻辑的严谨性。 |
| **`learning-sdd/`** | **知识库** | **充电站**。包含 [入门工作坊手册](./learning-sdd/workshop-facilitation.html)、实战指南和 AI 协作流程分析。 |

---

## 🤝 角色分工：人机协作新范式

在 SDD 实践中，人与 AI 的职责发生了转变：

- **PM (Owner)**：负责 **“输入与验收”**。定义业务意图，审查 `proposal.md` 和 `spec.md`，验收可交互原型。
- **AI (Pilot)**：负责 **“生成与转换”**。基于 PM 意图生成文档、原型、代码和测试。
- **Dev (Guardian)**：负责 **“路径与门禁”**。审查 `design.md` 和 `tasks.md` 的技术可行性，确保测试 100% 通过。

---

## 🛠️ 快速开始：开启你的第一个需求之旅

### 1. 环境准备与启动

```bash
# 1. 启动项目环境 (Node.js/Python/Vue)
chmod +x init.sh
./init.sh              # 查看统一帮助菜单
./init.sh vue:start    # 示例：启动前端

# 2. 安装 OpenSpec 命令行工具 (CLI)
npm install -g @fission-ai/openspec@latest
```

> 💡 **概念澄清**：
> - **OpenSpec CLI**：通过上述命令安装的全局工具，是 SDD 流程的“**底层引擎**”，负责处理变更管理、逻辑解析等核心任务。
> - **Trae Commands**：位于项目 `.trae/` 目录下的 Markdown 文件，是 AI 的“**操作指南**”，告诉 AI 如何正确调用 CLI 来协助你完成工作。

> 💡 **提示**：本项目已预置 `.trae/`、`.cursor/` 及 `.claude/` 协作技能，**无需手动初始化**。若您在其他环境使用，可运行 `openspec init --tools trae` 重新生成。

### 2. 发起一个探索
在 Trae 或 Cursor 的 AI 侧边栏输入：
> `/opsx:explore "我想给电商系统加一个‘积分商城’，用户可以用消费积分兑换商品。请帮我分析现有架构并给出 5 步法方案。"`

### 3. 查看原型与规格
随后使用 `/opsx:propose`，你将在 `openspec/changes/` 目录下看到新生成的原型文件和规格说明。

---

## 📚 学习资源

- **实战手册**: [SDD 入门工作坊引导手册](./learning-sdd/workshop-facilitation.html) — 3 小时快速上手流程。
- **版本升级**: [从 v1.8.0 升级到 v2.0](./learning-sdd/openspec-v2.0-upgrade.md) — 深度解析规划层与治理变革。
- **流程实践**: [v2.0 完整工作流实战案例](./learning-sdd/openspec-v2.0-workflow-practice.md) — 以商品搜索为例演示全链路协作。
- **进阶指南**: [OpenSpec 综合手册](./learning-sdd/openspec-user-manual.md) — 深度理解 SDD 工程实践与实战案例。
- **复盘分析**: [AI 协作全流程深度复盘](./learning-sdd/openspec-ai-workflow-analysis.md) — 学习应用实例，如何使用这个框架通过提示实现需求。

---

## 🔗 链接

- [OpenSpec 官方文档](https://github.com/Fission-AI/OpenSpec)
- [CHANGELOG](./CHANGELOG.md)
