# frontend-ui Specification (Delta)

> 增量文件：追加于主 specs `openspec/specs/frontend-ui/spec.md`（本 change 对既有能力的增量修改）。治理归属：`bc-shared → cap-ui`（Cross-Context 横切支撑）。

## ADDED Requirements

### Requirement: B 端订单管理「渠道」标识列

系统 SHALL 在 B 端订单管理列表新增「渠道」标识列（story-miniprogram-order-channel / `order-management` capability 消费，对齐原型 `miniprogram-channel-admin.html` 订单管理视图）：

- 每单显示渠道标识徽标：`MINIPROGRAM` → `border-electric text-electric`「小程序」；`WEB` → `border-border text-muted-foreground`「网页」。
- 页眉说明：「渠道标识仅展示 · 不改变订单流程（Q7）」。
- 存量订单（channel 缺省）展示「网页」。

- **Priority**: P1
- **Rationale**: 运营一眼识别订单来源（research 访谈 2）；MVP 仅标识列展示（Q7，不做筛选）。

#### Scenario: 订单列表渠道标识列渲染
- @e2e
- **GIVEN** 运营已进入 B 端订单管理，列表含小程序单与网页单
- **WHEN** 运营查看订单列表
- **THEN** 小程序单显示「小程序」徽标（electric 色）、网页单显示「网页」徽标（muted 色）

## Governance Mapping

- **Bounded Context**: Shared / Cross（`bc-shared → cap-ui`，Cross-Context）
- **Capability Taxonomy**: `frontend-ui`（复用既有横切支撑映射，无新增 taxonomy）
- **Process Alignment**: `L1-06` 履约与完成（B 端订单管理视图）
- **Service Blueprint**: `SB-OPS-*`（B 端订单管理界面）
- **实现版本**: Frontend（Vue B 端运营后台）
