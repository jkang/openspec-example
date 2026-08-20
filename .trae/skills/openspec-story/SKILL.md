---
name: openspec-story
description: Generate a business-facing story document with E2E acceptance criteria. This is the bridge between prototype/proposal and technical specs.
allowed-tools: Bash(openspec:*)
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
---

Generate a business-facing `story.md` for a change.

**Planning boundary**: This workflow creates the business story only. Do not edit project code. After the story is generated, you **MUST** stop and ask for human verification (HITL).

I'll create the story artifact:
- story.md (Business Review & E2E Acceptance Criteria)

---

**Store selection:** If a registered store was selected during `/opsx:propose`, continue using it by appending `--store <id>` to every OpenSpec command.

**Input**: The change name (kebab-case).

**Steps**

1. **Verify pre-requisites**
   
   Ensure `proposal.md` exists.
   If the task type is Tech Debt, advise the user to skip `/opsx:story` unless they explicitly want a business review document.
   Check if the change involves UI (from `ideas/idea.md` or `prototype.html`).
   **Mandatory Rule**: If UI is involved, `prototype.html` MUST exist and have been approved before running this.

2. **Generate the Story**
   
   a. **Get instructions for `story`**:
      ```bash
      openspec instructions story --change "<name>" --json
      ```
   b. **Create `story.md`**:
      - Read `proposal.md`, `ideas/idea.md`, and `prototype.html` (if any) for context.
      - Re-read `docs/baseline/service_blueprint.html` and `.trae/skills/baseline/openspec-baseline-story-map/SERVICE_BLUEPRINT_STANDARD.md`.
      - Extract E2E journeys and business rules. Ensure E2E journeys are mapped to **L1/L2 Process Nodes** (refer to `docs/baseline/business_process.html`) and the corresponding `SB-STAGE-*` / `SB-CUSTOMER-*` nodes.
      - Follow the `template` and `instruction` to generate the Markdown.
      - Write the file to `resolvedOutputPath` (usually `story.md`).
      - Show progress: "Generated business story at story.md"

3. **Mandatory HITL Verification**
   
   Invoke the `AskUserQuestion` tool to create a hard break for business review:
   - **Question**: "业务 Story 已生成。请评审 E2E 验收标准与业务规则是否准确。"
   - **Options**:
     - "Approved": "验收标准确认无误，进入模块规格设计"
     - "Request Changes": "Story 需要调整，我将在输入框提供反馈"

4. **Summarize and Recommend Next Step**
   
   After approval, recommend the next step:
   - Run `/opsx:spec-design` to generate modular specs, technical design, and tasks.

**Output**

Summarize the story generation and highlight the key E2E journeys.

**Guardrails**
- This workflow ONLY creates `story.md`. Do NOT proceed to generate modular specs or tasks.
- You MUST stop for HITL after generation.
- If UI is involved but `prototype.html` is missing, advise the user to run `/opsx:prototype` first.
