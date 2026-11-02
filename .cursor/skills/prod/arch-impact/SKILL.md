---
name: arch-impact
description: 需求侧架构影响分析（OPT）。在原型之后、需求拆分之前，评估 Epic 对 Bounded Context / Capability / 四层架构 / 数据 / 渠道 / API / 安全 / 非功能的影响，产出 architecture-impact.md，供 storymap 覆盖对账与 handoff 合成 proposal 引用。使用场景：Epic 需要提前识别架构风险与影响面时。
allowed-tools: Bash(git:*)
license: MIT
compatibility: 需求侧工作流 (req-sdd)
metadata:
  author: sdd-team
  version: "1.0"
---

架构影响分析是需求漏斗的 **OPT 步骤**，位于原型之后、需求拆分（storymap）之前。它把 `idea.md` 中的"架构影响"从内联一节升级为**可独立确认的制品**，让架构风险在拆分与交接前被看见。

**适用范围**: 仅大块 Epic 需求。直走交付侧任务（Bug Fix / Tech Debt / 简单功能）不走本步骤——架构影响仍在 `proposal.md` 的 Impact 章节内联表达。

## 产物

- `openspec-requirements/epics/<epic-key>/architecture-impact.md`

## 输入

- 已确认的 `epics/<epic-key>/idea.md`（To-Be Process / Journey / 候选 Capabilities）
- `epics/<epic-key>/research.md`
- `epics/<epic-key>/prototypes/*.html`（若涉及 UI）
- `docs/ARCHITECTURE.md`（四层架构）、`docs/FRONTEND.md`（UI 规范）、`docs/TESTING_STRATEGY.md`
- 治理基线：`docs/baseline/domain_model.html`、`business_process.html`、`service_blueprint.html`

## 评估维度（按需裁剪，不得漏项）

1. **Bounded Context / Capability**：受影响 BC 与 capability；新增 taxonomy 显式标注（对齐 `domain_model.html`）。
2. **四层架构**：`HTTP → Service → Domain → Repo` 的影响点；是否破坏分层单向依赖；Node / Python 双端一致性。
3. **数据与存储**：新增字段/实体、迁移与兼容、FileStore/MemoryRepo 双实现、旧数据兼容。
4. **渠道同源**：Web 与小程序是否共用账户/API/数据；是否产生渠道分裂。
5. **API 契约**：新增/变更端点、状态码语义、向后兼容、客户端不可信字段。
6. **安全与权限**：服务端鉴权/授权、对象级授权（IDOR）、输入输出校验、测试后门隔离。
7. **非功能**：性能（请求内同步 IO / 全量读写）、可观测性（审计）、并发/幂等。
8. **迁移与演进**：对旧客户端/旧数据的兼容路径；是否需要分阶段交付。

## 步骤

1. **读上下文**：读 `idea.md`、`research.md`、`prototypes/*.html`（若 UI）与治理基线。
2. **应用规则**：读 `openspec-requirements/config.yaml` 的 `rules.arch`。
3. **逐维评估**：按上方维度识别影响点，引用真实节点 ID（`bc-*` / `cap-*` / `L1/L2/L3` / `SB-*`）。
4. **下结论**：给出影响等级（高/中/低）、关键风险、对 storymap 拆分的输入、对 handoff proposal Impact 的结论。
5. **生成 architecture-impact.md**：按 `openspec-requirements/templates/architecture-impact.md` 产出。
6. **HITL**：产出后暂停确认；确认后才可进入 `/req:storymap`。

## 无影响时（显式 no-op）

- 若确认本次 Epic 无实质架构影响，必须显式记录"无需架构变更"及理由（如纯配置/文案/展示层调整），不得静默跳过。

## 明确不做的事

- ❌ 不写代码、不生成 `specs/` / `design.md` / `tasks.md`
- ❌ 不替代开发侧 `spec-design` 的 `design.md`（本制品是需求侧影响预判，不是技术设计）
- ❌ 不覆盖直走交付侧任务的架构分析（内联 proposal）

## Guardrails

- 只写需求侧架构分析制品，不写代码。
- 治理映射必须引用真实 `docs/baseline/*.html` 节点；无证据不写结论。
- 真实业务数据、全中文，拒绝空洞占位符。
- 产出后必须 HITL 确认；**未确认不得进入 storymap（强制门禁）**。
