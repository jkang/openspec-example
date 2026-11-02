# Test Design: <Story / Epic 名称>

<!--
需求侧测试设计（req-sdd 漏斗第 6 步，MUST）。
输入：已确认 story.md（业务面 E2E 验收）+ storymap.md + idea.md + docs/TESTING_STRATEGY.md。
输出：分层测试用例 + 追溯矩阵，作为 /req:handoff 与开发侧 spec-design（BDD 打标签）的输入。
本阶段只做"测试设计"，不写测试代码、不生成 specs/design/tasks。
-->

> Story Key: `story-<epic-key>-<功能>` | 关联 Storymap: `epics/<epic-key>/storymap.md`
> 关联 Story: `epics/<epic-key>/stories/<story-key>/story.md`
> 分层依据: `docs/TESTING_STRATEGY.md` | 产出后需用户确认（HITL）

## 1. 范围与输入 (Scope & Inputs)
<!-- 列出本次测试设计覆盖的 Story 与 E2E 场景范围；未覆盖项必须显式说明。 -->

- 覆盖 Story：
- 覆盖 E2E 场景：
- 未覆盖 / 依赖其他 Story：

## 2. 分层策略 (Testing Pyramid)
<!-- 遵循 docs/TESTING_STRATEGY.md：@unit ~70% / @api ~20% / @e2e ~10%。 -->

| 层 | 标签 | 占比目标 | 适用场景 | 执行载体 |
| --- | --- | --- | --- | --- |
| 单元 | `@unit` | ~70% | 领域规则 / 状态机 / 金额积分计算 / 边界 | `node:test` / `pytest` |
| 接口 | `@api` | ~20% | 鉴权 / 参数校验 / HTTP 语义 / 持久化边界 | HTTP 测试客户端 |
| 端到端 | `@e2e` | ~10% | 核心交易主链路 / 跨端 / UI 反馈 | Cucumber + Playwright |

## 3. 测试用例清单 (Test Cases)

| Case ID | 层 | 关联 Story | 关联 Scenario | 类型 | Given / When / Then 摘要 | 预期 |
| --- | --- | --- | --- | --- | --- | --- |
| TC-001 | `@unit` | story-<epic-key>-<功能> | 场景名 | 正常/异常/边界 |  |  |

## 4. 追溯矩阵 (Traceability Matrix，强制)

<!--
每个 Story 的每个 E2E 场景必须映射到 ≥1 个分层用例。
存在 ❌ 未覆盖项时必须补设计用例，或显式标注风险并说明理由。
-->

| Story | E2E Scenario | Case ID | 层 | 覆盖状态 |
| --- | --- | --- | --- | --- |
| story-<epic-key>-<功能> |  | TC-001 | `@unit` | ✅ 覆盖 / ❌ 未覆盖 |

## 5. E2E 场景与步骤命名空间 (E2E Naming)
<!-- 遵循 TESTING_STRATEGY：步骤按 Story 分文件、文本带领域/角色前缀、测试后门统一前缀，避免 ambiguous。 -->

- 步骤文件：`e2e-tests/steps/<story-key>.js`
- 领域前缀 / 角色：
- 测试后门步骤前缀：`测试后门 …`
- 潜在 ambiguous 风险与规避：

## 6. 覆盖缺口与风险 (Gaps & Risks)
<!-- 显式列出未覆盖场景、不可自动化的手工验收项、依赖前置数据的风险。 -->

| 缺口 / 风险 | 影响 | 处理方式（补用例 / 手工验收 / 风险接受） |
| --- | --- | --- |
|  |  |  |

## 7. HITL 确认 (Sign-off)

- [ ] 分层符合测试金字塔（无底层逻辑推给 E2E）
- [ ] 追溯矩阵覆盖全部 Story E2E 场景
- [ ] 覆盖缺口已补用例或显式风险接受
- [ ] 用户确认，可进入 `/req:handoff`
