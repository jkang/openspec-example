# Idea: <思想/需求名称>

## 1. 澄清业务意图 (Clarify Business Intent)
<!--
在此记录业务的目的、范围以及具体的业务规则。
- 目标用户是谁？
- 核心业务价值是什么？
- 有哪些硬性业务限制（如：门槛金额、有效期、每人限领一次等）？
- B 端视角：后台怎么配置？生命周期如何？谁有权限？
-->

## 2. 业务设计思路 (Business Design Approach)
<!--
从业务视角描述逻辑流转和用户体验。
- 用户如何触发该功能？
- 核心交互流程是怎样的？
- 如何通过视觉或交互提升用户价值？
-->

## 3. 任务类型与后续策略 (Task Type & Workflow Strategy)
<!--
必须与用户确认本次任务的类型，以决定后续流程：
[ ] Epic (大块需求，跨多能力/需拆分)：走需求侧漏斗 → storymap 拆分 → Story → openspec-handoff。
[ ] Feature (具体功能，独立可交付)：若为简单功能修改（如单个 UI 优化）→ 直走交付侧；若为大块复杂功能 → 走需求侧漏斗。
[ ] Bug Fix (缺陷修复)：⚠️ 直走交付侧，不走需求侧漏斗（开发侧跳过原型除非有UI变更，精简规格）。
[ ] Tech Debt (技术债/重构)：⚠️ 直走交付侧，不走需求侧漏斗（跳过原型，无外部行为变更可 skip_specs）。

确认的类型：[在此填写类型]
后续策略说明：[简述后续执行路径；Bug Fix / Tech Debt / 简单功能 → 直走交付侧]
-->

## 4. 需求拆分建议 (Requirement Splitting)
<!--
如果需求较为复杂，建议在此进行分阶段 / 拆分 storymap。
- Phase 1: 核心链路 (P0)
- Phase 2: 体验优化 (P1)
- Phase 3: 异常边界 (P2)
-->

## 5. 治理映射对齐 (Governance Mapping)
<!--
必须参考 docs/baseline/domain_model.html 识别受影响的边界与能力，
并参考 docs/baseline/business_process.html 与 docs/baseline/service_blueprint.html 识别受影响的流程节点与服务蓝图节点。
- Impacted Bounded Contexts: [例如：Order Context, Coupon Context]
- Candidate Capabilities: [例如：order-management, coupon-management]
- Impacted Process Nodes: [例如：L1-04 下单结算, L2-03 选择优惠方案]
- Impacted Service Blueprint Nodes: [例如：SB-STAGE-03, SB-CUSTOMER-03, SB-BACKSTAGE-03]
- Potential Domain Model Sync Triggers: [...]
- Potential Service Blueprint Sync Triggers: [...]
- Preliminary Sync Assessment: [Yes/No + 原因]
-->

## 6. 架构影响分析 (Architectural Impact & Ideas)
<!--
识别对现有系统架构的影响。
- 涉及哪些后端服务 (Node.js / Python)？
- 前端 UI 需要做哪些调整 (Vue)？
- 数据模型有哪些变化？
- 是否涉及跨域 (CORS) 或数据同步问题？
-->

## 7. 确认结论 (User Confirmation)
<!--
记录与用户达成共识的最终结论。
在此处明确方案是否可以进入下一步（storymap 拆分 或 直接 story-specs）。
-->
