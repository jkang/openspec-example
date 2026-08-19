# 从意图驱动到规划先行：OpenSpec v2.0 的治理变革

OpenSpec（[Fission-AI/OpenSpec](https://github.com/Fission-AI/OpenSpec)）在演进过程中，从 v1.8.0 的“指令驱动”进化到了 v2.0 的“**治理驱动**”。升级到 v2.0 后，AI 不仅仅是一个执行者，更成为了一个**具备产品感边界的协作伙伴**。

## 一、变革核心：Planning Layer (规划层)

v2.0 最显著的变化是引入了显式的**规划层**。在旧版本中，AI 经常会给出超出项目阶段或偏离产品定位的建议。v2.0 通过 `docs/PRODUCT_SENSE.md` 和 `docs/ROADMAP.md` 划定了护栏。

### 1. Product Sense: 赋予 AI 产品灵魂
通过 `/opsx:product-sense`，我们定义了 **Product Elevator Pitch**。AI 现在知道：
- **目标用户是谁**（例如：贸易型中小企业）。
- **痛点是什么**（例如：订单、库存、回款脱节）。
- **产品竞争优势在哪**（例如：1天跑通主流程的极简系统）。

### 2. Rolling Roadmap: 动态的阶段边界
通过 `/opsx:product-planning`，我们维护一个**月度滚动计划**。AI 会感知：
- **当前 Baseline**：已经做到了什么。
- **当前阶段目标**：本月 In-Scope 是什么，Out-of-Scope 是什么。
- **未来预测**：+1 个月、+2 个月的演进方向。

## 二、变革二：Explore 升级——强制的规划对齐

在 v2.0 中，`/opsx:explore` 升级为 **6 步法探索**，其中新增了关键步骤：**Roadmap Alignment (规划对齐)**。

- AI 在产生任何 Idea 之前，必须先查阅 `docs/ROADMAP.md`。
- `idea.md` 中必须包含一段“与当前阶段目标对齐说明”。
- **禁止项**：AI 不得建议处于 Out-of-Scope 或非当前阶段的功能。

## 三、变革三：全链路 HITL (人机协同) 增强

v2.0 强化了人类在关键节点的控制力，尤其是在 UI/UX 层面：
- **强制原型验证**：`/opsx:prototype` 成为 Story 类型任务的必须环节（或强制检查点）。
- **视觉护栏**：通过 `docs/FRONTEND.md` 将“无圆角、无阴影、slate 色系”等硬约束注入 AI 指令，实现视觉层面的自动化治理。

## 四、指令集演进 (v2.0)

| 指令 | 作用 | v2.0 变化 |
| :--- | :--- | :--- |
| `/opsx:product-sense` | 定义产品感 | **新增**。确立业务基调。 |
| `/opsx:product-planning` | 维护路线图 | **新增**。确立时间与空间边界。 |
| `/opsx:explore` | 深度探索 | **升级**。强制 Roadmap 对齐校验。 |
| `/opsx:spec-design` | 规格与设计 | **解耦**。支持跳过原型直入设计（技术债场景）。 |
| `/opsx:update` | 智能修订 | **强化**。保持全链路 artifacts 强一致性。 |

## 五、升级指南

升级到 v2.0 不仅仅是工具的更新，更是**协作契约**的升级：

1.  **初始化规划层**：执行 `/opsx:product-sense` 和 `/opsx:product-planning` 补齐文档。
2.  **更新 Config**：在 `openspec/config.yaml` 中注入规划层文档引用。
3.  **同步三端**：确保 `.trae/`、`.cursor/` 和 `.agents/` 目录下的规则同步刷新。

v2.0 的目标是让 AI 成为一个**懂业务、守边界、高保真**的专业伙伴，彻底告别“需求漂移”时代。

---

_本文基于对 [OpenSpec](https://github.com/Fission-AI/OpenSpec) 的演进分析。实践验证见 [OpenSpec Practise v2.0](https://github.com/ForceInjection/OpenSpec-practise/releases/tag/v2.0)。_
