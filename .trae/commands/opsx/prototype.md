---
name: "Prototype"
description: "Generate an interactive UI/UX prototype for the change"
allowed-tools: Bash(openspec:*)
category: "Workflow"
tags: ["workflow", "ui", "prototype"]
---

This workflow creates an interactive HTML prototype for the change to validate UI/UX before technical implementation.

**HITL Checkpoint**: After generating the prototype, you MUST ask the user to review and confirm it before proceeding to `/opsx:spec-design`.

**Branching Logic**:
- **Story/Bug Fix (with UI)**: Generate prototype.
- **Tech Debt/Bug Fix (no UI)**: Skip this step.

---

**Store selection:** If a registered store was selected, continue using it by appending `--store <id>` to every OpenSpec command.

**Input**: The argument after `/opsx:prototype` is the change name (kebab-case).

**Steps**

1. **Verify pre-requisites**
   - Ensure `proposal.md` exists.
   - Read `ideas/idea.md` to confirm task type.

2. **Generate the Prototype**
   - Get instructions: `openspec instructions prototype --change "<name>" --json`
   - Create `prototype.html` following the instructions.
   - Show progress: "Generated UI prototype."

3. **Mandatory HITL Verification**
   - Use `AskUserQuestion` to confirm with the user.
   - Do NOT proceed to other artifacts.

4. **Summarize and Recommend Next Step**
   - Recommend `/opsx:spec-design`.

**Output**
Summarize the results and recommend the next action.
