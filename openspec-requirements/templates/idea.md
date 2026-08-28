# Idea: <Epic/需求名称>

> 关联 Epic: `<epic-key>`（来自 `docs/ROADMAP.md`）
> 关联调研: `research/<epic-key>.md`
> 产出后需用户确认（HITL）

<!--
探索是需求漏斗的第 2 步：把调研信息【转化】为产品设计思路。
输入：research.md（需求调研收集的原始信息）；输出：本 idea.md（产品设计思路 + 业务设计 + 候选 Capabilities）。
-->

## 1. 澄清业务意图 (Clarify Business Intent)
<!--
在此记录业务的目的、范围以及具体的业务规则。
- 目标用户是谁？
- 核心业务价值是什么？
- 有哪些硬性业务限制（如：门槛金额、有效期、每人限领一次等）？
- B 端视角：后台怎么配置？生命周期如何？谁有权限？
-->

## 2. To-Be Process (目标流程)
<!--
描述目标业务流程（To-Be），基于调研现状问题的转化设计。
- 用文字/列表描述目标流程步骤（可引用 L1/L2 流程节点）
- 与现状（As-Is）的差异点在哪？
- 流程中涉及哪些角色？
-->

## 3. To-Be Journey (目标旅程)
<!--
描述目标用户体验旅程（To-Be）。
- 用户从触达到完成目标的关键旅程阶段
- 每个旅程阶段的用户动作 / 系统反应 / 情绪 / 触点
- 旅程中的关键交互与反馈
-->

## 4. 产品设计思路 (Business Design Approach)
<!--
从业务视角描述逻辑流转和用户体验。
- 用户如何触发该功能？
- 核心交互流程是怎样的？
- 如何通过视觉或交互提升用户价值？
-->

## 5. 任务类型与后续策略 (Task Type & Workflow Strategy)
<!--
必须与用户确认本次任务的类型，以决定后续流程：
[ ] Epic (大块需求，跨多能力/需拆分)：走需求侧漏斗 → 原型(Epic整体) → storymap 拆分 → Story → /req:handoff。
[ ] Feature (具体功能，独立可交付)：若为简单功能修改（如单个 UI 优化）→ 直走交付侧；若为大块复杂功能 → 走需求侧漏斗。
[ ] Bug Fix (缺陷修复)：⚠️ 直走交付侧，不走需求侧漏斗（开发侧跳过原型除非有UI变更，精简规格）。
[ ] Tech Debt (技术债/重构)：⚠️ 直走交付侧，不走需求侧漏斗（跳过原型，无外部行为变更可 skip_specs）。

确认的类型：[在此填写类型]
后续策略说明：[简述后续执行路径；Bug Fix / Tech Debt / 简单功能 → 直走交付侧]
-->

## 6. 候选 Capabilities (Candidate Capabilities)
<!--
必须参考 docs/baseline/domain_model.html 的 Bounded Context → Capability 映射。
这是 handoff 合成 proposal 的 Capabilities 契约与开发侧 specs/<capability>/ 落位的依据。
- 新增 Capability：每个新增路径使用烤串命名法（kebab-case），标注"新增 taxonomy"及理由
- 修改 Capability：复用 openspec/specs/ 下已有路径
- Impacted Bounded Contexts: [例如：Order Context, Coupon Context（新增需标注）]
-->

## 7. 治理映射对齐 (Governance Mapping)
<!--
并参考 docs/baseline/business_process.html 与 docs/baseline/service_blueprint.html 识别受影响的流程节点与服务蓝图节点。
- Impacted Process Nodes: [例如：L1-04 下单结算, L2-03 选择优惠方案]
- Impacted Service Blueprint Nodes: [例如：SB-STAGE-03, SB-CUSTOMER-03, SB-BACKSTAGE-03]
- Potential Domain Model Sync Triggers: [...]
- Potential Service Blueprint Sync Triggers: [...]
- Preliminary Sync Assessment: [Yes/No + 原因]
-->

## 8. 需求拆分建议 (Requirement Splitting)
<!--
如果需求较为复杂，建议在此进行分阶段 / 拆分 storymap。
- Phase 1: 核心链路 (P0)
- Phase 2: 体验优化 (P1)
- Phase 3: 异常边界 (P2)
-->

## 9. 架构影响分析 (Architectural Impact & Ideas)
<!--
识别对现有系统架构的影响。
- 涉及哪些后端服务 (Node.js / Python)？
- 前端 UI 需要做哪些调整 (Vue)？
- 数据模型有哪些变化？
- 是否涉及跨域 (CORS) 或数据同步问题？
-->

## 10. 确认结论 (User Confirmation)
<!--
记录与用户达成共识的最终结论。
在此处明确方案是否可以进入下一步（原型 prototype 或 直接 storymap 拆分）。
-->
