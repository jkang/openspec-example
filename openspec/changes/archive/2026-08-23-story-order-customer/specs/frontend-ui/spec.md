## ADDED Requirements

### Requirement: C 端我的订单视图
系统 SHALL 提供 C 端「我的订单」视图：header 提供「我的订单」入口（与购物车并列）；订单列表展示订单号、状态（中文映射）、实付金额、商品摘要；点击「查看详情」展开订单详情（金额明细、优惠券、商品快照）与状态轨迹（待支付→已支付→已发货→已完成；已取消单独标注）。所有视觉遵循极简规范。
- **Priority**: P0
- **Rationale**: 买家需要持续追踪订单状态，形成「下单→支付→发货→可见」闭环（R-CUS-003/004/005）。

#### Scenario: 我的订单入口与列表渲染
- @e2e
- **GIVEN** 当前用户存在多个不同状态订单
- **WHEN** 买家点击 header「我的订单」
- **THEN** 展示订单列表（订单号/状态中文/实付金额/商品摘要），按创建倒序
- **AND** 页面任意元素无圆角、无阴影，边框为 1px 实线

#### Scenario: 订单详情与状态轨迹
- @e2e
- **GIVEN** 买家位于我的订单列表
- **WHEN** 买家点击某订单「查看详情」
- **THEN** 展开详情：商品总额/优惠券/折扣/实付 + 商品明细
- **AND** 状态轨迹高亮当前状态（待支付→已支付→已发货→已完成）

#### Scenario: 结算成功弹窗跳转查看
- @e2e
- **GIVEN** 买家完成支付（订单已支付）
- **WHEN** 买家在结算成功弹窗点击「查看订单」
- **THEN** 跳转我的订单视图，该订单显示「已支付」

## Governance Mapping

- **Bounded Context**: Shared / Cross（`domain_model.html` 映射表：`bc-shared → cap-ui`，Cross-Context）
- **Capability Taxonomy**: `frontend-ui`（复用既有横切支撑映射，无新增 taxonomy）
- **Process Alignment**: `L1-06` 履约与完成（C 端订单状态可见）
- **Service Blueprint**: `SB-STAGE-06`（成功回流）、`SB-CUSTOMER-06`（查看订单状态）
- **实现版本**: Frontend（C 端我的订单视图）
