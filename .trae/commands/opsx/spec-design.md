---
name: "Spec-Design"
description: "Generate specs, technical design, and implementation tasks"
allowed-tools: Bash(openspec:*)
category: "Workflow"
tags: ["workflow", "specs", "design", "tasks"]
---

Generate behavioral specifications, technical design, and implementation tasks for a change.

**Planning boundary**: This workflow creates planning artifacts only. Do not edit project code.

I'll create the following artifacts:
- specs/<capability-path>/spec.md
- design.md
- tasks.md

---

**Store selection:** If a registered store was selected, continue using it by appending `--store <id>` to every OpenSpec command.

**Input**: The argument after `/opsx:spec-design` is the change name (kebab-case).

**Steps**

1. **Verify pre-requisites**
   - Ensure `proposal.md` exists.
   - If UI-related, ensure approved `prototype.html` exists.
   - Re-read `docs/baseline/domain_model.html`, `docs/baseline/business_process.html`, `docs/baseline/service_blueprint.html`, and `docs/SOPS/SERVICE_BLUEPRINT_STANDARD.md` before drafting artifacts.

2. **Generate Specs, Design, and Tasks**
   - Loop through `specs`, `design`, and `tasks`.
   - Get instructions for each: `openspec instructions <artifact-id> --change "<name>" --json`
   - Ensure every capability spec includes `Governance Mapping`, references its owning `Bounded Context`, and cites the related `L3` process nodes.
   - Ensure every capability spec cites the related `SB-STAGE-*` and `SB-<LANE>-*` nodes.
   - Ensure `design.md` includes `Service Blueprint Sync Assessment`, with an explicit `Needs Sync: Yes/No` decision for `docs/baseline/service_blueprint.html`.
   - Ensure `design.md` includes both `Domain Boundary Impact` and `Domain Model Sync Assessment`, with an explicit `Needs Sync: Yes/No` decision for `docs/baseline/domain_model.html`.
   - Create the artifact following the template and instructions.
   - Show progress: "Created <artifact-id>."

3. **Final Status Check**
   - `openspec status --change "<name>"`
   - Confirm planning is complete.

**Output**
Summarize the results, include the governance recap and Domain Model sync assessment, then prompt for `/opsx:apply`.
