## MODIFIED Requirements

### Requirement: 订单总价计算
订单总价 MUST 等于所有条目 priceCents * quantity 之和，并扣除所选优惠券的折扣金额（discountCents）。
- **Priority**: P0 (Critical)
- **Rationale**: 正确的价格计算是交易的基础，使用分（cents）为单位避免浮点精度问题。集成优惠券后，最终支付总价需反映减免结果。

#### Scenario: 计算单个商品订单总价
- **GIVEN** 订单包含 1 个条目
- **AND** 条目单价为 100 分，数量为 2
- **WHEN** 计算订单总价
- **THEN** 总价为 200 分

#### Scenario: 计算多个商品订单总价
- **GIVEN** 订单包含 2 个条目
- **AND** 条目 1 单价 100 分，数量 2
- **AND** 条目 2 单价 50 分，数量 1
- **WHEN** 计算订单总价
- **THEN** 总价为 250 分

#### Scenario: 成功应用优惠券后的总价计算
- **GIVEN** 订单总价（未打折）为 10000 分
- **AND** 用户应用了一张“减 2000 分”的优惠券
- **WHEN** 计算最终支付总价
- **THEN** 总价（totalCents）应为 8000 分
- **AND** 订单应记录折扣金额（discountCents）为 2000 分
