# frontend-ui Specification (Delta)

> 增量文件：追加于主 specs `openspec/specs/frontend-ui/spec.md`（本 change 对既有能力的增量修改）。治理归属：`bc-shared → cap-ui`。技术形态：决策 B（独立小程序原生工程，接续 browse Story）。

## ADDED Requirements

### Requirement: 小程序购物车 + 结算 + 模拟支付 UI

系统 SHALL 在小程序原生工程提供**成交旅程**（story-miniprogram-shopping-checkout）：

- **购物车**（`pages/cart`）：行内商品（缩略占位/名称/单价）+ 数量 +/−（下限 1，移除）→ 合计（件数/金额）；按会话 userId 归属（与 Web 同库）。
- **结算**（`pages/checkout`）：商品总额 / 自动最优券（优惠让利）/ 应付金额 + 「提交订单」。
- **提交订单（R-MC-005/006）**：绑定会话 userId；`Order.channel` 由会话来源自动继承 = MINIPROGRAM（服务端判定，UI 不传渠道、不暴露渠道概念）。
- **模拟支付（R-MC-007）**：`POST /api/payments/{id}` → PAID（库存扣减、幂等）；成功态（订单号/金额 + 引导我的订单）。
- 售罄库存下单被拒（OUT_OF_STOCK，R-MC 既有语义）。

- **Priority**: P0
- **Rationale**: 买家微信内一气呵成成交（research 访谈 1）；后端 100% 复用；channel=MINIPROGRAM 会话继承已由服务端落地（6.1 Q7）。

#### Scenario: 最优券结算并下单 channel=MINIPROGRAM
- @e2e
- **GIVEN** 小程序渠道已启用，买家微信登录（会话 channel=MINIPROGRAM），购物车含 ¥178.00 且存在可用券
- **WHEN** 小程序提交订单
- **THEN** 订单创建成功，自动选择实际支付最低的最优券，应付金额含优惠
- **AND** 订单 `channel = 'MINIPROGRAM'`（服务端按会话来源判定，小程序未传渠道）

#### Scenario: 模拟支付成功（库存扣减）
- @api
- **GIVEN** 小程序订单处于 PENDING_PAYMENT（channel=MINIPROGRAM）
- **WHEN** 发起模拟支付
- **THEN** 订单 PAID、库存扣减；重复支付幂等

## Governance Mapping

- **Bounded Context**: Shared / Cross（`bc-shared → cap-ui`）
- **Capability Taxonomy**: `frontend-ui`（复用既有横切支撑映射，无新增 taxonomy）
- **Process Alignment**: `L1-03` 加购与准备（购物车）；`L1-04` 下单结算；`L1-05` 支付确认
- **Service Blueprint**: `SB-STAGE-03/04/05`（结算/下单/支付）、`SB-CUSTOMER-03/04/05`（小程序购物车/结算/支付 UI）、`SB-BACKSTAGE-04/05`（API 消费）
- **实现版本**: 小程序原生工程（决策 B；后端零改动）
