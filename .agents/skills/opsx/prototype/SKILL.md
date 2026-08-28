---
name: prototype
description: Generate an interactive UI/UX prototype for the change. This is the second step for Feature tasks or Bug Fixes with UI changes.
allowed-tools: Bash(openspec:*)
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.9.0"
---

Generate an interactive UI/UX prototype for a change.

**Planning boundary**: This workflow creates the interactive prototype only. Do not edit project code. After the prototype is generated, you **MUST** stop and ask for human verification (HITL).

I'll create the prototype artifact:
- prototypes/<capability-path>.html (interactive UI/UX validation)

---

**Store selection:** If a registered store was selected during `/opsx:propose`, continue using it by appending `--store <id>` to every OpenSpec command.

**Input**: The change name (kebab-case).

**Steps**

1. **Verify pre-requisites**
   
   Ensure `proposal.md` exists and contains the defined capabilities.
   若为 handoff 场景，原型已在需求侧完成（`/req:prototype`），不重复制作；若为直走交付侧且涉及 UI，继续本流程。

2. **Generate the Prototype**
   
   a. **Get instructions for `prototype`**:
      ```bash
      openspec instructions prototype --change "<name>" --json
      ```
   b. **Create `prototype.html`**:
      - Read `proposal.md` for context.
      - Invoke the `prototype` skill (if applicable) or follow the schema instructions to generate the HTML.
      - Write the file to `resolvedOutputPath` (e.g., `prototypes/<capability-path>.html`).
      - Show progress: "Generated UI prototype at <path>"

3. **Mandatory HITL Verification**
   
   Invoke the `AskUserQuestion` tool to create a hard break for human review:
   - **Question**: "UI 原型已生成。请务必点击预览并验证交互逻辑是否符合预期。"
   - **Options**:
     - "Approved": "确认无误，进入后续的规范与设计阶段"
     - "Request Changes": "原型需要调整，我将在输入框提供反馈"

4. **Summarize and Recommend Next Step**
   
   After approval, recommend the next step:
   - Run `/opsx:Story` to generate the business acceptance criteria.

**Output**

Summarize the prototype generation and provide the preview link if available.

**Guardrails**
- This workflow ONLY creates `prototype.html`. Do NOT proceed to generate specs, designs, or tasks.
- You MUST stop for HITL after generation.
- If the task type in `idea.md` is Tech Debt or non-UI Bug Fix, advise the user to skip this and run `/opsx:spec-design` instead.
