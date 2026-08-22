## Purpose
为 2026-08-19-story-coupon-engine-upgrade 的 apply 提供可审计的本地验证证据。

> **历史豁免说明**：本变更归档时 `verify.md` 门禁尚未引入（SOP v2.0 后期新增）。此处为追溯补录——以当前仓库全量测试基线作为替代证据（该变更涉及代码仍存在于仓库并通过回归）。

## Scope
- 变更模块: 智能结算引擎升级（PERCENTAGE 折扣券 + 最优推荐）
- 风险关键目标: 详见 tasks.md 与 design.md 的验收项

## Hard Gates
- Schema validate: PASS（`openspec validate --specs` 当前全量 10/10 通过，覆盖本变更涉及的 capability）
- Node test (./init.sh node:test): PASS（当前基线 23 passed, 0 failed，追溯于 2026-08-22）
- Python test (./init.sh python:test): PASS（当前基线 12 passed，追溯于 2026-08-22）
- Frontend build (./init.sh vue:build): PASS（当前基线构建成功，追溯于 2026-08-22）

## Soft Gates
- E2E cucumber (./init.sh e2e:run): PASS（当前基线 6 scenarios / 25 steps 全通过，追溯于 2026-08-22）
- 说明：以上为全量回归基线；本变更的历史专测证据未留存，由当前基线替代。

## Evidence Index
- 关联测试文件
  - ecommerce/ecommerce-mini/__tests__/unit.spec.js + ecommerce/ecommerce-mini-python/tests/
- 关键断言: 以 `openspec/specs/` 对应 capability 的 @unit/@api/@e2e 场景为验收契约（当前全部通过）
