---
name: "Propose"
description: "Propose a new change by generating the initial proposal document"
allowed-tools: Bash(openspec:*)
category: "Workflow"
tags: ["workflow", "artifacts", "experimental"]
---

Propose a new change - create the change and generate the initial `proposal.md`.

**Planning boundary**: This workflow creates the initial planning artifact (`proposal.md`) only. Do not edit project code. After the proposal is complete, stop and let the user decide the next step based on the task type.

**适用范围**：本命令服务**直走交付侧任务**（Bug Fix / Tech Debt / 简单功能修改）。大块 Epic 需求走需求侧漏斗（`/req:research` 起），由 `/req:handoff` 合成 proposal 后从本提案起步。

**Epic/Story Queue Awareness**:
Before proposing a new change:
1. Check if any `openspec/epic-*.story-list.json` exists.
2. If a list exists, check for the first `planned` story.
3. If a planned story is found, suggest starting that specific story.
4. Once a story change is started, update its status to `in_progress` and record the `changeName` in the corresponding `.story-list.json`.

I'll create a change with the initial artifact:
- proposal.md (what & why - defines the scope and capabilities)

`<capability-path>` is the spec directory relative to `specs/` (for example, `user-auth` or `identity/user-auth`). Preserve an existing capability's full path and follow the project's established organization for new capabilities.

After generating the proposal, recommend the next command:
- **Bug Fix / Feature (with UI)**: `/opsx:prototype`
- **Tech Debt / Bug Fix (no UI)**: `/opsx:spec-design`
- **Epic**: 应走需求侧漏斗（`/req:research` 起），不直走本命令。

---

**Store selection:** If the user names a store (a store is a standalone OpenSpec repo registered on this machine) or the work lives in one, run `openspec store list --json` to discover registered store ids, then pass `--store <id>` on the commands that read or write specs and changes (`new change`, `status`, `instructions`, `list`, `show`, `validate`, `archive`, `doctor`, `context`, `schemas`, `view`). Once selected, treat `--store <id>` as sticky for the rest of the workflow. Every unscoped example of those commands below is shorthand: before running it, append the flag. For example, run `openspec status --change "<name>" --json --store "<id>"`, not the unscoped form shown below. Other commands do not take the flag. Hints printed by commands already carry the flag; keep it on follow-ups. Without a store, commands act on the nearest local `openspec/` root.

**Input**: The argument after `/opsx:propose` is the change name (kebab-case), OR a description of what the user wants to build.

**Steps**

1. **Understand the request and clarify material ambiguity**

   If no input is provided, ask the user (open-ended, no preset options):
   > "What change do you want to work on? Describe what you want to build or fix."

   From their description, derive a kebab-case name (e.g., "add user authentication" → `add-user-auth`).

   **IMPORTANT**: Do NOT proceed without understanding what the user wants to build.

   If the request contains ambiguity that would materially affect scope, externally observable behavior, compatibility, or acceptance criteria, ask the user before creating the change. For minor details, make a reasonable assumption and record it in the planning artifacts.

2. **Determine the workflow schema**

   Use the configured default schema unless the user explicitly requests a different workflow.

   **Use a different schema only if the user:**
   - Explicitly requests a specific schema by name → use `--schema <schema-name>`
   - Asks to "show workflows" or asks "what workflows" exist → resolve the authoritative root by running `openspec context --json` from the current working directory. If the user explicitly selected a registered store, use `openspec context --json --store "<store-id>"`. Then run `openspec schemas --json` with its working directory set to the returned `root.path` and let them choose. This preserves roots selected by a local `store:` pointer or the global `defaultStore`; when a registered store was explicitly selected, append `--store "<store-id>"` to `openspec schemas --json` as well. If context reports only `no_openspec_root`, run `openspec schemas --json` from the current working directory instead. Do not use this fallback for invalid or unavailable stores.

   Otherwise, omit `--schema` to preserve the configured default.

3. **Create the change directory**

   Choose one schema form below. If a registered store is selected, append `--store "<store-id>"` to that command and each later OpenSpec command shown below that accepts `--store`.

   Using the configured default:
   ```bash
   openspec new change "<name>"
   ```

   Using an explicitly requested schema:
   ```bash
   openspec new change "<name>" --schema "<schema-name>"
   ```
   This creates a scaffolded change in the planning home resolved by the CLI with `.openspec.yaml`.

4. **Get the artifact build order**
   ```bash
   openspec status --change "<name>" --json
   ```
   Parse the JSON to get `planningHome`, `changeRoot`, `artifactPaths`, and `actionContext`.

5. **Generate the Proposal**

   a. **Get instructions for `proposal`**:
      ```bash
      openspec instructions proposal --change "<name>" --json
      ```
   b. **Create `proposal.md`**:
      - 直接基于用户描述/当前需求创建提案（不依赖 `idea.md`）。
      - Re-read `docs/baseline/domain_model.html`, `docs/baseline/business_process.html`, `docs/baseline/service_blueprint.html`, and `.trae/skills/baseline/blueprint/SKILL.md` as the governance source of truth.
      - Follow the `template` and `instruction` from the JSON.
      - Ensure the proposal explicitly lists `Impacted Bounded Contexts`, aligns `Capabilities` to the `domain_model.html` mapping, and records `Process Alignment` node IDs.
      - Ensure the proposal includes `Service Blueprint Alignment`, explicitly citing impacted `SB-STAGE-*` and `SB-<LANE>-*` nodes and whether the change adds, modifies, or reuses existing blueprint structure.
      - If the proposal introduces an unmapped capability or changes a BC -> Capability relationship, mark it as `新增 taxonomy` and explain why.
      - Write the file to `resolvedOutputPath`.
      - Show brief progress: "Created proposal"

6. **Show final status and recommend next steps**
   ```bash
   openspec status --change "<name>"
   ```
   Summarize the created proposal and prompt the user for the next action based on the task type.

**Output**

After completing the proposal, summarize:
- Change name and location
- Artifacts created: `proposal.md`.
- Governance summary: impacted bounded contexts, capabilities, and whether a future Domain Model sync is likely required.
- Next step recommendation: "The initial proposal is ready. Based on the task type, you should now run `/opsx:prototype` (for UI features) or `/opsx:spec-design` (for technical tasks)."

**Guardrails**
- This workflow ONLY creates `proposal.md`. Do NOT proceed to generate prototypes, specs, designs, or tasks.
- 不创建 `ideas/idea.md`（探索已前移到需求侧 `openspec-requirements/`）。
- Ask about ambiguities that would materially change scope.
- If a change with that name already exists, ask if user wants to continue it or create a new one.
- Verify the proposal file exists after writing.
