## MODIFIED Requirements

### Requirement: 订单总价计算
订单总价 MUST 等于所有条目 priceCents * quantity 之和，并扣除所选优惠券的折扣金额（discountCents）。
- **Priority**: P0 (Critical)
- **Rationale**: 正确的价格计算是交易的基础，使用分（cents）为单位避免浮点精度问题。集成优惠券后，最终支付总价需反映减免结果。

#### Scenario: 成功应用优惠券后的总价计算
- **GIVEN** 订单总价（未打折）为 10000 分
- **AND** 用户应用了一张“满 100 减 20”（即减 2000 分）的优惠券
- **WHEN** 计算最终支付总价
- **THEN** 总价（totalCents）应为 8000 分
- **AND** 订单应记录折扣金额（discountCents）为 2000 分

### Requirement: 结算时支持优惠券 ID
`checkout` 接口 SHALL 接收可选的 `couponId` 参数，并在后端重新执行校验逻辑。
- **Priority**: P0
- **Rationale**: 确保结算时的优惠计算是经过后端权威验证的。
