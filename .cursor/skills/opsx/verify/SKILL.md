---
name: verify
description: Run local verification gates for an OpenSpec change and write verify.md evidence. Use when implementation is complete or paused, to confirm hard gates (schema validate, node test, python test, frontend build) and soft gates (E2E cucumber) before sync/archive.
allowed-tools: Bash(*)
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
---

# verify

运行 OpenSpec 变更的本地验证门禁，并将证据写入变更目录下的 `verify.md`。

**Input**: 可选变更名（如 `/opsx:verify coupon-engine-upgrade`）。省略时从对话上下文推断，或运行 `openspec list --json` 让用户选择。

**工具降级路径（浏览器 UI 验证不可用时）**：
- 首选：Chrome DevTools / webapp-testing 验证前端视觉与交互（FRONTEND.md §6 自检）。
- 降级：若 MCP 浏览器实例不可用/被占用，先 `--isolated` 重试；仍不可用时按 `docs/FRONTEND.md` 静态自检清单（无圆角 `border-radius:0`、无阴影 `box-shadow:none`、slate 色系、真实中文数据、无占位符）审查，并在 verify.md 中记录"静态自检"而非"浏览器验证"。

## 门禁定义

- **Hard Gates（硬门禁，任一 FAIL 即拦截）**:
  1. Schema validate 通过
  2. Node 测试通过
  3. Python 测试通过
  4. 前端构建通过
- **Soft Gates（软门禁）**:
  - E2E cucumber 应通过；失败不阻塞（默认），但必须在 verify.md 记录失败摘要。
  - **E2E 覆盖完整性审查（软门禁）**: 对照本 change 的 proposal/specs，审查 `e2e-tests/features/` 是否覆盖受影响的用户旅程——核心交易主链路（注册/登录→选购→加购→优惠券→结算→支付→订单可见/履约）是否在 `smoke.feature` 或完整旅程场景中覆盖；缺口须记录到 verify.md 并列入技术债/后续任务，不得静默放行。

## Steps

1. **选择变更**
   - 提供了名称则使用；否则 `openspec list --json`，歧义时询问用户。

2. **解析变更根目录**
   ```bash
   openspec status --change "<name>" --json
   ```
   使用 `changeRoot` 作为证据文件的基础路径。

3. **确保 verify.md 存在**
   - 证据路径: `<changeRoot>/verify.md`
   - 缺失则用下方模板创建；存在则在原文件基础上追加本次验证运行记录。

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

4. **运行硬门禁**
   ```bash
   openspec validate "<name>"
   ./init.sh node:test
   ./init.sh python:test
   ./init.sh vue:build
   ```
   任一失败: 在 verify.md 标记对应项为 FAIL，停止并报告失败命令输出。

5. **运行软门禁**
   ```bash
   ./init.sh e2e:run
   ```
   失败: 标记 FAIL 并记录简短失败摘要；除非用户要求本次视为硬门禁，否则继续。

6. **E2E 覆盖完整性审查**
   - 列出 `e2e-tests/features/*.feature`，对照本 change 的 proposal/specs 确认受影响旅程已有对应 `@e2e` 场景。
   - 确认 `smoke.feature`（或等价完整旅程场景）仍覆盖核心交易主链路（注册/登录→选购→加购→优惠券→结算→支付→订单可见）。
   - 审查结论写入 verify.md：`Coverage: FULL`（无缺口）或 `Coverage: GAP`（列出缺口 + 处理建议）。

7. **定稿**
   - 更新 verify.md，逐项标记 PASS / FAIL。
   - 输出紧凑摘要，包含 verify.md 路径与门禁结果。

## 测试分层约束（对齐 docs/TESTING_STRATEGY.md）

- 单元测试 (@unit, ~70%) 与 API 测试 (@api, ~20%) 在各自后端项目的 `__tests__/` 或 `tests/` 目录。
- E2E (@e2e, ~10%) 在全局 `e2e-tests/features/` 与 `e2e-tests/steps/`（Cucumber + Playwright）。
- 严禁将底层业务逻辑推卸给 @e2e 层（测试金字塔防腐）。

## 输出

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

## Guardrails

- 任何 Hard Gate FAIL 必须停止并报告，不得放行进入 sync/archive。
- 所有结果必须落盘 verify.md，作为可审计证据（"代码即规范"的质量底线）。
- 跨工具一致性: 修改本 Skill 规则时，必须同步更新 `.trae/`、`.cursor/`、`.agents/` 三目录下的对应入口。
