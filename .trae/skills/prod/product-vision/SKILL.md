---
name: product-sense
description: Define or refine the Product Sense, including the Elevator Pitch, Key Goals, Non-goals, and Product Principles. Use this to establish the business foundation for the project.
allowed-tools: Read, Write, SearchCodebase, Grep
license: MIT
compatibility: General
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.9.0"
---

# product-sense

**Description:** Use this skill to define or update the `docs/PRODUCT_SENSE.md` file. This establishes the high-level business intent and product vision that guides all subsequent SDD phases.

## The Workflow

1. **Clarify the Elevator Pitch**:
   - **Target Users**: Who are they?
   - **Pain Points**: What specific problems are they facing?
   - **Product & Type**: What is the product and its category?
   - **Solution**: How does it solve the problems?
   - **Competitive Advantage**: Why is it better than alternatives?
2. **Define Key Goals & Non-goals**:
   - What must the product achieve?
   - What is explicitly out of scope?
3. **Establish Product Principles**:
   - What are the core values or UI/UX constraints (e.g., minimalist, slate-themed, no rounded corners)?
4. **Update Documentation**:
   - Read the existing `docs/PRODUCT_SENSE.md`.
   - Update the sections based on the discussion.
   - Ensure the language is professional and business-oriented.

## Output Format

The output must be the updated `docs/PRODUCT_SENSE.md` file, following the structure:

- `# 产品感与业务导向 (Product Sense)`
- `## 1. Product Elevator Pitch`
- `## 2. 核心产品理念`
- `## 3. 关键目标与非目标`
- `## 4. 目标用户画像 (User Personas)`
- `## 5. AI 决策准则`

## Guardrails

- **No Fluff**: Avoid generic marketing speak. Use concrete business terms.
- **Consistency**: Ensure terminology matches the rest of the project (e.g., "SME", "Operational Completeness").
- **HITL**: Always ask the user for confirmation after presenting the drafted Elevator Pitch.
