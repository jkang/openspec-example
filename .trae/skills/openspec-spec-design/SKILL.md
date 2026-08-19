---
name: openspec-spec-design
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
   If the task type requires a prototype (Feature/UI Bug Fix), ensure `prototype.html` exists and was approved.

2. **Generate Specs, Design, and Tasks**
   
   Use a todo list to track progress through the artifacts: `specs` -> `design` -> `tasks`.

   a. **For each artifact (specs, design, tasks)**:
      - Get instructions:
        ```bash
        openspec instructions <artifact-id> --change "<name>" --json
        ```
      - Read dependencies (e.g., `proposal.md`, `prototype.html`, and preceding artifacts) for context.
      - Follow the `template` and `instruction` to generate the artifact.
      - If `skip_specs: true` is set in `.openspec.yaml`, skip `specs`.
      - Write the file to `resolvedOutputPath`.
      - Show progress: "Created <artifact-id>"

3. **Final Status Check**
   
   ```bash
   openspec status --change "<name>"
   ```
   Verify all artifacts needed for implementation are ready.

**Output**

Summarize the created artifacts and announce that the planning phase is complete.
Prompt: "Planning is complete. When you are ready, run `/opsx:apply` to start implementation."

**Guardrails**
- This workflow ONLY creates `specs`, `design`, and `tasks`. Do NOT proceed to implementation.
- Always read the approved prototype (if any) before creating specs.
- Ensure `tasks.md` contains E2E validation steps.
