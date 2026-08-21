## MODIFIED Requirements

### Requirement: 购物车商品添加

系统 SHALL 支持将商品添加到用户购物车，并返回更新后的购物车状态。

**Priority**: P0 (Critical)

**Rationale**: 购物车是电商下单流程的核心环节，用户必须能够将商品加入购物车。

@e2e
#### Scenario: 添加商品到购物车

Given 用户已登录且商品存在
When 发送 POST /api/cart/items 携带 { productId, quantity }
Then 返回状态码 200
And 返回更新后的购物车 Cart

@unit
#### Scenario: 添加已存在商品时数量累加

Given 购物车中已存在某商品，数量为 2
When 再次添加该商品，数量为 3
Then 该商品在购物车中的数量变为 5

@api
#### Scenario: 添加不存在的商品

Given 商品 ID 在系统中不存在
When 尝试将该商品添加到购物车
Then 抛出 PRODUCT_NOT_FOUND 错误
