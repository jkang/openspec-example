---
name: "Delivery Board"
description: "Generate a visual project delivery status board"
allowed-tools: Bash(opsx:*)
category: "Governance"
tags: ["governance", "dashboard", "delivery", "visibility"]
---

# opsx:delivery-board

**Description:** Use this command to generate `docs/governance/delivery_board.html`. It provides a high-level view of project progress across Planning, Exploring, Designing, Coding, and Archived states.

## The Workflow

1. **Scan Data Sources**:
   - `docs/ROADMAP.md` (Planning)
   - `openspec-requirements/epics/` (Exploring · 需求侧活跃 Epic)
   - `openspec-requirements/archive/` (Explored · 已完成 Epic)
   - `openspec/changes/` (Designing/Coding)
   - `openspec/changes/archive/` (Archived)
2. **Execute Generator**:
   - Runs the background generation logic to parse artifacts and verify test status.
3. **Review Results**:
   - Check the generated dashboard at `docs/governance/delivery_board.html`.

## Output

A beautiful, interactive HTML dashboard showing:
- Active change pipeline
- Baseline document freshness
- Test gate pass rates
- Quick links to all core artifacts
