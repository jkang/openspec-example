---
name: "Verify"
description: "Run local verification gates for an OpenSpec change and write verify.md evidence"
allowed-tools: Bash(*)
category: "Workflow"
tags: ["workflow", "verification", "harness"]
---

Run local verification gates for an OpenSpec change, and write evidence to `verify.md` under the change root

**Store selection:** If the user names a store (a store is a standalone OpenSpec repo registered on this machine) or the work lives in one, run `openspec store list --json` to discover registered store ids, then pass `--store <id>` on the commands that read or write specs and changes (`new change`, `status`, `instructions`, `list`, `show`, `validate`, `archive`, `doctor`, `context`, `view`). Other commands do not take the flag. Hints printed by commands already carry the flag; keep it on follow-ups. Without a store, commands act on the nearest local `openspec/` root

**Input**: Optionally specify a change name (e.g., `/opsx:verify coupon-engine-upgrade`). If omitted, infer from context or prompt the user to select from `openspec list --json`

**Hard Gates**
- Schema validate must pass
- Node tests must pass
- Python tests must pass
- Frontend build must pass

**Soft Gates**
- E2E cucumber should pass, but failure does not block by default

**Steps**

1. **Select the change**
   - If a name is provided, use it
   - Otherwise run `openspec list --json` and prompt the user if ambiguous

2. **Resolve change root**
   ```bash
   openspec status --change "<name>" --json
   ```
   Use `changeRoot` as the base path for evidence files

3. **Ensure verify.md exists**
   - Evidence path: `<changeRoot>/verify.md`
   - If missing, create it with the template below
   - If present, update in place and append a new run section for this verification

   Template
   ```md
   ## Purpose
   为 <change-name> 的 apply 提供可审计的本地验证证据，避免在 sync 或归档前仍存在编译失败或核心链路缺陷

   ## Scope
   - 变更模块: <modules>
   - 风险关键目标: <key-goals>

   ## Gates
   ### Hard Gates
   - Schema validate: PENDING
   - Node test: PENDING
   - Python test: PENDING
   - Frontend build: PENDING

   ### Soft Gates
   - E2E cucumber: PENDING

   ## Evidence Index
   - 关联测试文件: <paths>
   - 关键断言: <assertions>
   ```

4. **Run hard gates**
   - Schema validate
     ```bash
     openspec validate --change "<name>"
     ```
   - Node test
     ```bash
     ./init.sh node:test
     ```
   - Python test
     ```bash
     ./init.sh python:test
     ```
   - Frontend build
     ```bash
     ./init.sh vue:build
     ```

   If any hard gate fails
   - Mark the corresponding item as FAIL in verify.md
   - Stop and report the failing command output

5. **Run soft gates**
   - E2E cucumber
     ```bash
     ./init.sh e2e:run
     ```
   If it fails
   - Mark as FAIL and record a short failure summary
   - Continue unless the user asks to treat E2E as hard gate for this change

6. **Finalize**
   - Update verify.md to mark PASS or FAIL for each gate
   - Report a compact summary including the verify.md path and the gate results

**Output**

```
## Verify Summary

Change: <change-name>
Evidence: <changeRoot>/verify.md

Hard Gates:
- Schema validate: PASS
- Node test: PASS
- Python test: PASS
- Frontend build: PASS

Soft Gates:
- E2E cucumber: FAIL
```
