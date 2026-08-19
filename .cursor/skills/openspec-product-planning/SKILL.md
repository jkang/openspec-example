---
name: openspec-product-planning
description: Maintain the Product Roadmap, including rolling plans for the next 1, 2, and X months. Use this to define phase boundaries and exploration guardrails.
allowed-tools: Read, Write, SearchCodebase, Grep, LS
license: MIT
compatibility: General
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.9.0"
---

# openspec-product-planning

**Description:** Use this skill to update `docs/ROADMAP.md`. It provides the temporal and structural context for the SDD workflow, ensuring that `/opsx:explore` stays within the defined phase boundaries.

## The Workflow

1. **Review Current Baseline**:
   - Identify what has been fully implemented and verified (e.g., archived changes, completed specs).
2. **Define Current Phase**:
   - **Target**: What is the primary focus right now?
   - **In Scope**: Specific features or modules to be built.
   - **Out of Scope**: Explicit exclusions.
   - **Exit Criteria**: Measurable conditions to complete the phase.
   - **Explore Guardrails**: Constraints for AI exploration in this phase.
3. **Rolling Plan (+1, +2, +X Months)**:
   - Forecast targets and scope for the next two months and beyond.
   - Identify representative Epics for future phases.
4. **Update Documentation**:
   - Read the existing `docs/ROADMAP.md`.
   - Update the "Last Refreshed" date.
   - Refine the baseline and rolling plan sections.

## Output Format

The output must be the updated `docs/ROADMAP.md` file, following the structure:

- `# 产品路线图 (Product Roadmap)`
- `## 📅 当前状态与滚动计划 (Rolling Plan)`
- `### 🏆 当前 Baseline (已完成能力)`
- `### 📍 当前阶段 (Current Phase)`
- `## 🛣️ 滚动规划 (Future Plan)`
  - `### 🚀 未来 +1 个月`
  - `### 🚀 未来 +2 个月`
  - `### 🚀 未来 +X 个月`

## Guardrails

- **Rolling Refresh**: This document should be updated at least monthly or whenever an Epic is completed/archived.
- **Strict Boundaries**: The "Out of Scope" and "Explore Guardrails" sections are hard constraints for `/opsx:explore`.
- **HITL**: Confirm the "Current Phase" and "Exit Criteria" with the user.
