# Story 叙事方法

## 用途

把已拆分的 Story 深化为可执行、可验收的业务叙事。叙事**内嵌在 `story.md`**，不新建独立文件。

## 五段结构

1. **核心描述**：As a / I want / So that，一句话说清角色-动作-价值。
2. **角色画像**：该 Story 涉及的角色、目标、痛点与使用情境（承接 research / problem-definition）。
3. **交互逻辑**：正常流 / 边界流 / 异常流；关键 UI 行为与系统反馈。
4. **验收标准**：Given/When/Then，覆盖主流程与关键异常。
5. **业务价值**：对业务指标或 Exit Criteria 的贡献（承接 opportunity / OSM）。

## 硬规则

1. Story 是需求侧**业务面冻结交付物**，不写行为规格 specs、不写技术设计。
2. 业务规则必须可执行、可验证，拒绝「合理处理」「友好提示」等空话。
3. AC 必须映射 L1/L2 与 `SB-STAGE-*` / `SB-LANE-*`。
4. UI 相关 Story 必须引用已确认的 Epic 整体原型，不新造 Story 级原型作为 SSOT。
5. 独立 HTML 叙事（`story-narrative-generator`）为 optional，仅作审查辅助。

## 完成判据

- 五段齐全；
- 每条业务规则都有触发条件与期望结果；
- 每个 E2E 场景都能落到测试设计。
