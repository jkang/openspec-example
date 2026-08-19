## MODIFIED Requirements

### Requirement: 购物车商品添加

系统 SHALL 支持将商品添加到用户购物车，并返回更新后的购物车状态。前端 MUST 严格同步后端返回的状态，禁止在接口失败时模拟本地成功。

#### Scenario: 添加商品到购物车
- **GIVEN** 用户已登录且商品存在
- **WHEN** 发送 POST /api/cart/items 携带 { userId, productId, quantity }
- **THEN** 返回状态码 200
- **AND** 返回更新后的购物车 Cart
- **AND** 前端必须等待该响应并更新本地状态，若响应失败则必须撤销本地尝试

### Requirement: 购物车商品移除

系统 SHALL 支持从购物车中移除指定商品条目。

#### Scenario: 移除购物车商品
- **GIVEN** 购物车中存在商品条目
- **WHEN** 发送 POST /api/cart/remove 携带 { userId, productId } (或等价同步接口)
- **THEN** 该条目从购物车中移除
- **AND** 系统返回更新后的购物车状态
