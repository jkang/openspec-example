# frontend-ui Specification (Delta)

> 增量文件：追加于主 specs `openspec/specs/frontend-ui/spec.md`（本 change 对既有能力的增量修改）。治理归属：`bc-shared → cap-ui`。技术形态：决策 B（独立小程序原生工程，接续 browse/checkout Story）。

## ADDED Requirements

### Requirement: 小程序我的订单 UI（列表 + 状态轨迹）

系统 SHALL 在小程序原生工程提供**订单追踪旅程**（story-miniprogram-shopping-orders）：

- **我的订单**（`pages/orders`）：列表卡片（`#订单号` mono / 状态徽标 / 商品摘要 / 等宽 primary 金额），按会话 userId 归属（`GET /api/orders`，Web 下单与小程序下单同列表，同库同账，R-MO-001/002）。
- **状态轨迹**：展开订单展示金额明细 + 状态步骤（待支付 → 已支付 → 已发货 → 已完成；已取消独立标注，R-MO-003/004）。
- **C 端不展示渠道概念（Q3，R-MO-006）**：列表/详情不显示 channel（B 端 6.1 才展示来源）。
- 未登录访问引导登录（R-MO-005）。

- **Priority**: P1
- **Rationale**: 买家支付后微信内安心追踪订单（research 访谈 1/3）；同源账户 Web/小程序同列表（访谈 2 王老板同账诉求）。

#### Scenario: 我的订单会话归属 + 状态推进
- @e2e
- **GIVEN** 买家微信登录且存在已支付订单（channel=MINIPROGRAM）
- **WHEN** 请求我的订单 API
- **THEN** 列表返回该订单（金额/状态一致）
- **WHEN** B 端对该订单执行发货
- **THEN** 再次请求 → 状态 SHIPPED（已发货）

## Governance Mapping

- **Bounded Context**: Shared / Cross（`bc-shared → cap-ui`）
- **Capability Taxonomy**: `frontend-ui`（复用既有横切支撑映射，无新增 taxonomy）
- **Process Alignment**: `L1-06` 履约与完成（C 端订单状态可见）
- **Service Blueprint**: `SB-STAGE-06`（我的订单入口）、`SB-CUSTOMER-06`（小程序我的订单 UI）、`SB-BACKSTAGE-04/06`（订单 API 消费）
- **实现版本**: 小程序原生工程（决策 B；后端零改动）
