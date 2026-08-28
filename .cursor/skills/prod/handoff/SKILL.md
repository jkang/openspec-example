---
name: handoff
description: 需求侧 → 开发侧交接。读取已确认的 story.md（业务面），在开发侧 openspec/changes/<name>/ 创建 change 并【合成 proposal.md】，登记 epic 队列，回填需求侧交接状态。开发侧从 proposal 起步，随后按 capability 拆分生成行为规格 specs。使用场景：需求侧 Story 已确认，准备交给开发时。
allowed-tools: Bash(openspec:*)
license: MIT
compatibility: 需求侧工作流 (req-sdd) → 开发侧 (spec-driven)
metadata:
  author: sdd-team
  version: "2.0"
---

本技能是需求侧与开发侧的**交接边界**。开发侧**不重复** explore / 需求拆分 / prototype / story 输出（均已前移到需求侧），从 **proposal** 起步。

## 输入

- `openspec-requirements/epics/<epic-key>/stories/<story-key>/story.md`（已确认，业务面冻结交付物）

## 步骤

1. **读 Story**：读需求侧 `story.md`，确认已通过 HITL。若缺失或未确认，停止交接并回退。
2. **创建开发侧 change**：
   ```bash
   openspec new change "<name>"
   ```
   `<name>` 为 kebab-case（如 `story-order-customer`）。
3. **合成 proposal.md**（在开发侧 change 内）：从 Story 业务面与关联 idea 映射：
   - **Why** ← Story 用户场景 / 使用动机
   - **What Changes** ← Story 范围（In/Out of Scope）
   - **Capabilities** ← idea 的**候选 Capabilities**（按 capability 列出，新增 taxonomy 保留标注）
   - **Process Alignment** ← 治理映射的 L1/L2/L3 节点
   - **Service Blueprint Alignment** ← 治理映射的 SB-STAGE-*/SB-<LANE>-* 节点
   - **Impact** ← idea 的架构影响分析
   - 在 proposal 中链接需求侧 `story.md` 作为业务评审依据。
4. **开发侧 story 阶段跳过**：业务评审已在需求侧完成（story.md 等价于开发侧 story.md），开发侧不再生成 story.md。
5. **登记 Epic 队列（若属 Epic）**：更新 `openspec/epic-<key>.story-list.json`，将对应 Story 置为 `in_progress` 并记录 `changeName`。
6. **回填需求侧状态**：在需求侧 `story.md` 的「交接状态」勾选"已交接"并记录 `changeName`；同步更新对应 `storymap.md`。
7. **进入开发侧流程**：从 `proposal` 起步 → 按 capability 拆分生成行为规格 `specs/`（Story-specs，h3/h4 格式）→ design → tasks → apply → verify。

## 分层 Sync 提示

- 每个 change 归档前只做 **Spec Sync**（`/opsx:sync`，delta specs → `openspec/specs/`）。
- **Baseline Sync**（`/opsx:baseline/sync` 回流 `docs/baseline/*.html`）在 **Epic 全部 Story 归档后**统一执行。

## Epic 归档提示

- 若本次交接的是该 Epic 的**最后一个 Story**（`epic-*.story-list.json` 中该 Epic 全部 done），提示执行 **需求侧 Epic 归档**：将 `openspec-requirements/epics/<epic-key>/` 整个目录移入 `openspec-requirements/archive/YYYY-MM-DD-<epic-key>/`（保留交付记录），随后触发 Baseline Sync + Roadmap 更新。

## 交接契约

- Story.md 是需求侧唯一冻结交付物（业务面）。
- 行为规格（Story-specs）由开发侧在 proposal 之后按 capability 拆分生成，需求侧不生成 specs/。
- 开发侧从 proposal 起步；若发现需求缺口，回关 `openspec-requirements` 的 `research/explore/storymap/story` skill。
- 涉及 UI 的 Story 若无已确认的 Epic 整体原型，禁止交接。

## Guardrails

- 只做交接 + 合成开发侧 proposal，不写业务代码、不生成 specs/design/tasks。
- 不重复需求侧已完成的 explore/prototype/story 输出。
- 交接时记录双向状态（开发侧 changeName ↔ 需求侧 story.md），确保可追溯。
