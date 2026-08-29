---
name: spec-design
description: Generate behavioral specifications, technical design, and implementation tasks. This is the final step of the planning phase.
allowed-tools: Bash(openspec:*)
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.9.0"
---

Generate `specs`, `design`, and `tasks` for a change.

**Planning boundary**: This workflow creates planning artifacts only. Do not edit project code. After the artifacts are complete, stop and wait for the user to start implementation with `/opsx:apply`.

I'll create the following artifacts:
- specs/<capability-path>/spec.md (behavioral contract)
- design.md (technical architecture and decisions)
- tasks.md (detailed implementation checklist)

---

**Store selection:** If a registered store was selected during `/opsx:propose`, continue using it by appending `--store <id>` to every OpenSpec command.

**Input**: The change name (kebab-case).

**Steps**

1. **Verify pre-requisites**
   
   Ensure `proposal.md` exists. 
   If the task type requires a prototype (Story/UI Bug Fix), ensure `prototype.html` exists and was approved.
   若为 handoff 场景，参考 proposal 中链接的需求侧 `story.md` 的 E2E 验收标准（开发侧不单独生成 story.md）。
   Re-read `docs/baseline/domain_model.html`, `docs/baseline/business_process.html`, `docs/baseline/service_blueprint.html`, and `.trae/skills/baseline/blueprint/SKILL.md` before drafting artifacts.

2. **Generate Specs, Design, and Tasks**
   
   Use a todo list to track progress through the artifacts: `specs` -> `design` -> `tasks`.

   a. **For each artifact (specs, design, tasks)**:
      - Get instructions:
        ```bash
        openspec instructions <artifact-id> --change "<name>" --json
        ```
      - Read dependencies (e.g., `proposal.md`, `prototype.html`, and preceding artifacts) for context.
      - Ensure every `specs/<capability-path>/spec.md` includes `Governance Mapping`, references the owning `Bounded Context`, and cites the related **L3 Process Nodes**.
      - Ensure every `specs/<capability-path>/spec.md` cites the related `SB-STAGE-*` and `SB-<LANE>-*` nodes.
      - Ensure `design.md` includes `Service Blueprint Sync Assessment`, with an explicit `Needs Sync: Yes/No` decision for `docs/baseline/service_blueprint.html`.
      - Ensure `design.md` includes both `Domain Boundary Impact` and `Domain Model Sync Assessment`, with an explicit `Needs Sync: Yes/No` decision for `docs/baseline/domain_model.html`.
      - Follow the `template` and `instruction` to generate the artifact.
      - If `skip_specs: true` is set in `.openspec.yaml`, skip `specs`.
      - Write the file to `resolvedOutputPath`.
      - Show progress: "Created <artifact-id>"

3. **E2E 覆盖审查 (Coverage Review) — 强制步骤**

   在生成 tasks 后、定稿前，**必须**执行 E2E 覆盖审查，确保完整使用流程被 E2E 覆盖（防止 smoke/e2e 与功能演进脱节）：

   a. **读取现有 E2E 资产**：列出 `e2e-tests/features/*.feature`（尤其 `smoke.feature`）与 `docs/TESTING_STRATEGY.md`。

   b. **识别本 change 影响的用户旅程**：基于 proposal/specs 列出受影响的 C 端/B 端可观察流程。核心交易主链路为：**注册/登录 → 选购 → 加购 → 优惠券 → 结算 → 支付 → 订单可见/履约**。

   c. **三问审查（逐项回答并记录）**:
      - ① **smoke 主链路完整性**：`smoke.feature` 是否以一体化场景覆盖核心交易主链路？若 smoke 仅剩局部/页面加载级场景，必须补强任务。
      - ② **新增功能覆盖**：本 change 新增/修改的交互是否已有对应 `@e2e` 场景？缺失则补。
      - ③ **既有场景回归风险**：本 change 是否改变行为导致既有 @e2e 场景失效或语义漂移？若影响，列入适配/更新任务。

   d. **缺口落盘**：任何覆盖缺口（①②③）必须转化为 `tasks.md` 中的显式任务（如「补强 smoke 主链路场景」「新增 X 的 E2E 旅程」），并标注所属实现版本。

4. **Final Status Check**
   
   ```bash
   openspec status --change "<name>"
   ```
   Verify all artifacts needed for implementation are ready.

**Output**

Summarize the created artifacts and announce that the planning phase is complete.
Include a short governance recap: impacted bounded contexts, capability taxonomy alignment, and the Domain Model sync assessment.
Prompt: "Planning is complete. When you are ready, run `/opsx:apply` to start implementation."

**Guardrails**
- This workflow ONLY creates `specs`, `design`, and `tasks`. Do NOT proceed to implementation.
- Always read the approved `prototype.html` (if any) and the linked requirements-side `story.md` (if handoff) before creating specs.
- Ensure `tasks.md` contains E2E validation steps.
- **E2E 覆盖审查（强制）**: 每个影响用户可观察流程的 change，必须执行 E2E 覆盖审查（含 smoke 主链路完整性），并将覆盖缺口写入 `tasks.md`；严禁在 smoke/完整旅程未覆盖的情况下进入 apply。
