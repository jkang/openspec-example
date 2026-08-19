## MODIFIED Requirements

### Requirement: 结算时支持优惠券 ID
`checkout` 接口 SHALL 接收可选的 `couponId` 参数。如果未提供，系统 SHALL 尝试自动应用最优券。结算必须依赖后端最新的购物车状态，前端 SHALL 在结算前确保本地数据已同步。

#### Scenario: 结算时携带有效优惠券 ID
- @api
- **GIVEN** 用户购物车中有商品且已与后端同步
- **AND** 优惠券 ID 有效且满足门槛
- **WHEN** 发送 POST /api/checkout 携带 { userId, couponId }
- **THEN** 结算成功并返回应用折扣后的订单，且订单记录该 `couponId`
- **AND** 结算使用的商品清单必须与后端购物车存储完全一致
