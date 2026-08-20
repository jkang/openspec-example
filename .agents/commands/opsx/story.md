# `/opsx:story`

Generate a business-facing story document for the current change.

## Usage

```bash
/opsx:story <change-name>
```

## Description

This command generates a `story.md` file that captures the end-to-end user journeys and business rules. It is designed for business review before moving into technical specification and design.

- **Prerequisites**: `proposal.md` must exist. If the change involves UI, `prototype.html` must be generated and confirmed first. Tech Debt changes typically skip this step.
- **Output**: `story.md` in the change directory.
- **Workflow**: This is used for Stories and Bug Fixes that require business review. Tech Debt typically skips this.

## Skill

This command is powered by the `openspec-story` skill.
