# 规划先行，治理驱动：OpenSpec v2.0 完整工作流实践

OpenSpec v2.0 引入了**规划层 (Planning Layer)**，将产品感定义与路线图规划置于所有开发动作之前。本文通过一个真实案例「商品搜索与价格排序」，演示 v2.0 的完整工作流（规划 -> 意图 -> Explore -> Propose -> 原型 -> Spec-Design -> Apply -> Sync -> Archive）的端到端实践。

## 一、阶段 0：规划层 (Planning Layer)

在 v2.0 中，任何需求探索都必须基于已确立的规划上下文。

1.  **Product Sense (/opsx:product-sense)**：
    - 我们定义了项目的 **Elevator Pitch**。目标用户是 50-300 人的贸易型中小企业，核心痛点是订单、库存、回款的数字化闭环。这为后续所有需求提供了“业务灵魂”。
2.  **Product Planning (/opsx:product-planning)**：
    - 确立了 **ROADMAP.md**。当前处于 `Phase 2 - 运营闭环与营销增强`。
    - **In-Scope**：包含搜索、排序、优惠券等基础能力。
    - **Out-of-Scope**：排除复杂的支付网关集成与多级分销。

## 二、实践案例：add-product-search (v2.0)

### 2.1 Explore：带护栏的深度探索

执行 `/opsx:explore`。在 v2.0 中，AI 自动执行 **Roadmap Alignment**：
- **校验**：搜索与排序属于 Phase 2 的 In-Scope 范围。
- **产出**：`idea.md` 中显式记录了与路线图的对齐说明。

### 2.2 Propose：基于规划的提案

执行 `/opsx:propose`。AI 生成 `proposal.md`，其业务价值（Rationale）直接继承自 `PRODUCT_SENSE.md` 中的痛点分析。

### 2.3 Prototype：强制的 UI 验收

执行 `/opsx:prototype`。生成可交互原型后，AI 会停下来请求 **HITL (人机协同) 确认**。
- PM 审查原型，确保其符合 `docs/FRONTEND.md` 的极简风格（Slate 色系、无圆角）。
- 确认搜索结果的展示逻辑和排序切换的交互。

### 2.4 Spec-Design：规格与设计的解耦生成

执行 `/opsx:spec-design`。一口气生成 `spec.md`、`design.md` 和 `tasks.md`。
- **v2.0 优化**：对于技术债任务，此步骤可配置为跳过 `specs`；但对于本例，AI 严格按 BDD 标签生成场景。
- **业务基线同步**：在 `spec-design` 阶段，AI 会初步分析领域模型，为后续 `sync` 回流 [domain_model.html](file:///Users/superkkk/MyCoding/OpenSpec-practice/docs/baseline/domain_model.html) 做准备。

### 2.5 Apply：治理驱动的实现

执行 `/opsx:apply`。AI 逐项完成任务，并受到 `config.yaml` 中定义的质量门禁约束。

### 2.6 Sync & Archive：路线图与基线的回馈

归档前执行 `/opsx:sync` 合并规格：
- **v2.0 联动**：执行 `sync` 不仅会合并规格，还会自动将 `story.md` 和 `design.md` 中的认知回写到 `docs/baseline/` 下的 4 份基线文档，并刷新 HTML 视图。
- **Roadmap 刷新**：归档成功后，AI 会提醒用户运行 `/opsx:product-planning` 来刷新 `ROADMAP.md` 的当前 Baseline，标志着该功能已正式进入系统基线。

## 三、实践总结：v2.0 的价值

对比 v1.8.0，v2.0 工作流带来了三个核心提升：

1.  **意图对齐**：通过规划层，避免了 AI 产生“偏离业务重心”的无效探索。
2.  **视觉统一**：通过前端规范的硬注入，确保所有原型从第一天起就符合品牌调性。
3.  **确定性验收**：强制的原型 HITL 检查点，确保了 PM 在代码编写前拥有最终否决权。

v2.0 让 SDD 从一个“工具流”演进为一个“**管理流**”，实现了从产品构想到代码落地的全程受控。
