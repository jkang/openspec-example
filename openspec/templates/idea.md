# Idea: <变更名称>

## 1. 澄清业务意图 (Clarify Business Intent)
<!-- 
在此记录业务的目的、范围以及具体的业务规则。
- 目标用户是谁？
- 核心业务价值是什么？
- 有哪些硬性业务限制（如：门槛金额、有效期、每人限领一次等）？
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
必须与用户确认本次任务的类型，以决定后续的 SDD 流程：
[ ] Epic (大块模糊需求)：需拆分为多个子 Feature，可能更新 Roadmap，暂不直接进入开发流程。
[ ] Feature (具体功能)：标准流程 (Proposal -> Prototype -> Specs -> Design -> Tasks)。
[ ] Bug Fix (缺陷修复)：跳过原型(除非有UI变更)，精简规格(仅限修复场景)，设计侧重根因分析。
[ ] Tech Debt (技术债/后端任务)：跳过原型，若无外部行为变更可 skip_specs，设计侧重架构/重构方案。

确认的类型：[在此填写类型]
后续策略说明：[在此简述后续需要执行/跳过的阶段]
-->

## 4. 需求拆分建议 (Requirement Splitting)
<!-- 
如果需求较为复杂，建议在此进行分阶段拆分。
- Phase 1: 核心链路 (P0)
- Phase 2: 体验优化 (P1)
- Phase 3: 异常边界 (P2)
-->

## 5. 架构影响分析 (Architectural Impact & Ideas)
<!-- 
识别对现有系统架构的影响。
- 涉及哪些后端服务 (Node.js / Python)？
- 前端 UI 需要做哪些调整 (Vue)？
- 数据模型有哪些变化？
- 是否涉及跨域 (CORS) 或数据同步问题？
-->

## 6. 确认结论 (User Confirmation)
<!-- 
记录与用户达成共识的最终结论。
在此处明确方案是否可以进入 Proposal 阶段。
-->
