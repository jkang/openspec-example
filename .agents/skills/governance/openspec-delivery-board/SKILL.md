---
name: openspec-delivery-board
description: Generate a visual delivery board HTML showing the system's current status (Planning, Exploring, Designing, Coding, Archived). Invoke when users or PMs need to see project progress and baseline health.
allowed-tools: Read, Write, SearchCodebase, Grep, LS, RunCommand
license: MIT
metadata:
  author: openspec
  version: "1.0"
---

# openspec-delivery-board

**Description:** This skill generates a comprehensive `docs/governance/delivery_board.html` dashboard by aggregating data from ROADMAP, active changes, archives, and verification reports.

## The Workflow

1. **Scan Workspace Status**:
   - Read `docs/ROADMAP.md` for next month's planning items.
   - Scan `openspec/changes/` for active changes and their current phase (Exploring/Designing/Coding).
   - Scan `openspec/changes/archive/` for recently completed work.
   - Scan `verify.md` in active and archived changes for gate health.
2. **Determine Column Placement**:
   - **Planning**: Items from ROADMAP `未来 +1 个月`.
   - **Exploring**: Changes/ideas still in the discovery phase (e.g., `idea.md` exists but no `proposal.md`).
   - **Designing**: Changes with `proposal.md` or `design.md` but not yet fully implementing.
   - **Coding**: Changes with `tasks.md` and active implementation/verification evidence.
   - **Archived**: Recently archived changes (last 7 days by default).
3. **Collect Health Metrics**:
   - Check `Baseline / Last Updated` markers in `service_blueprint.html`, `domain_model.html`, and `business_process.html`.
   - Aggregate test pass rates from `verify.md`.
   - Check for coverage artifacts (if available).
4. **Generate HTML Dashboard**:
   - Use the internal generator script `scripts/generate_delivery_board.py`.
   - Ensure the output `docs/governance/delivery_board.html` follows the standard slate-based governance design.
5. **Notify User**:
   - Provide the file path and link to the generated dashboard.

## HTML Template Structure

- **Header**: Contains `title` (Delivery Board), `subtitle`, and `Last Refreshed` timestamp.
- **Metrics Row**: Displays summary counts for `Planning`, `Active Changes`, `Archived (7d)`, and `Quality Signal`.
- **Baseline Links**: A row of cards linking to `service_blueprint.html`, `business_process.html`, and `domain_model.html` with their update status.
- **Kanban Board**: A flex-row container with columns for:
  - `01. Planning (Next Month)`: High-level roadmap items.
  - `02. Exploring`: Ideas and early proposals.
  - `03. Designing`: Proposals and technical designs.
  - `04. Coding & Verifying`: Active implementation and test evidence.
  - `05. Archived (Last 7d)`: Recently completed work.
- **Archived History**: A section for older archived items with a "View More" toggle.
- **Footer**: Framework version and methodology info.

## Guardrails

- **Single Source of Truth**: Data MUST be pulled from the codebase/artifacts, not inferred from conversation.
- **Privacy**: Do not include sensitive API keys or credentials if accidentally found in logs.
- **Modern UI**: Follow the "slate-50 background, slate-900 emphasis, no-rounded" visual style.
- **Container Width**: The main page container must be forced to **85%** of the screen width.
- **No Decoration**: Strictly no rounded corners (`border-radius: 0`) and no shadows (`box-shadow: none`).
- **Jinja Safety**: When generating inline styles in HTML templates using Jinja variables, use the `{{ 'style="..."' }}` pattern to avoid IDE errors.
