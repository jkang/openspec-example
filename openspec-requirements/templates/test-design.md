# Test Design: <Story / Epic 名称>

> Story Key: `story-<epic-key>-<功能>` | 关联 Storymap: `epics/<epic-key>/storymap.md`
> 关联 Story: `epics/<epic-key>/stories/<story-key>/story.md`
> 分层依据: `docs/TESTING_STRATEGY.md` | 产出后需用户确认（HITL）

## 1. 范围与输入

- 覆盖 Story：
- 覆盖 E2E 场景：
- 未覆盖 / 依赖其他 Story：

## 2. 分层策略

| 层 | 标签 | 占比目标 | 适用场景 | 执行载体 |
| --- | --- | --- | --- | --- |
| 单元 | `@unit` | ~70% | 领域规则 / 状态机 / 金额积分计算 / 边界 | `node:test` / `pytest` |
| 接口 | `@api` | ~20% | 鉴权 / 参数校验 / HTTP 语义 / 持久化边界 | HTTP 测试客户端 |
| 端到端 | `@e2e` | ~10% | 核心交易主链路 / 跨端 / UI 反馈 | Cucumber + Playwright |

## 3. 测试用例清单

| Case ID | 层 | 关联 Story | 关联 Scenario | 类型 | Given / When / Then 摘要 | 预期 |
| --- | --- | --- | --- | --- | --- | --- |
| TC-001 | `@unit` | story-<epic-key>-<功能> | 场景名 | 正常/异常/边界 |  |  |

## 4. 追溯矩阵（强制）

| Story | E2E Scenario | Case ID | 层 | 覆盖状态 |
| --- | --- | --- | --- | --- |
| story-<epic-key>-<功能> |  | TC-001 | `@unit` | ✅ 覆盖 / ❌ 未覆盖 |

## 5. E2E 场景与步骤命名空间

- 步骤文件：`e2e-tests/steps/<story-key>.js`
- 领域前缀 / 角色：
- 测试后门步骤前缀：`测试后门 …`
- 潜在 ambiguous 风险与规避：

## 6. 覆盖缺口与风险

| 缺口 / 风险 | 影响 | 处理方式（补用例 / 手工验收 / 风险接受） |
| --- | --- | --- |
|  |  |  |

## 7. HITL 确认

- [ ] 分层符合测试金字塔（无底层逻辑推给 E2E）
- [ ] 追溯矩阵覆盖全部 Story E2E 场景
- [ ] 覆盖缺口已补用例或显式风险接受
- [ ] 用户确认，可进入 `/req:handoff`
