# Cart Management Specification

## Purpose

购物车管理能力，涵盖商品的添加、移除及数量限制规则。购物车是用户选购商品到下单结算之间的临时存储。

## Requirements

### Requirement: 购物车商品添加

系统 SHALL 支持将商品添加到用户购物车，并返回更新后的购物车状态。前端 MUST 严格同步后端返回的状态，禁止在接口失败时模拟本地成功。

**Priority**: P0 (Critical)

**Rationale**: 购物车是电商下单流程的核心环节，用户必须能够将商品加入购物车。

@e2e
#### Scenario: 添加商品到购物车
- **GIVEN** 用户已登录且商品存在
- **WHEN** 发送 POST /api/cart/items 携带 { userId, productId, quantity }
- **THEN** 返回状态码 200
- **AND** 返回更新后的购物车 Cart
- **AND** 前端必须等待该响应并更新本地状态，若响应失败则必须撤销本地尝试

@unit
#### Scenario: 添加已存在商品时数量累加
- **GIVEN** 购物车中已存在某商品，数量为 2
- **WHEN** 再次添加该商品，数量为 3
- **THEN** 该商品在购物车中的数量变为 5

@api
#### Scenario: 添加不存在的商品
- **GIVEN** 商品 ID 在系统中不存在
- **WHEN** 尝试将该商品添加到购物车
- **THEN** 抛出 PRODUCT_NOT_FOUND 错误

---

### Requirement: 购物车商品移除

系统 SHALL 支持从购物车中移除指定商品条目。

**Priority**: P1 (High)

**Rationale**: 用户需要能够调整购物车内容，移除不需要的商品。

#### Scenario: 移除购物车商品
- **GIVEN** 购物车中存在商品条目
- **WHEN** 发送 POST /api/cart/remove 携带 { userId, productId } (或等价同步接口)
- **THEN** 该条目从购物车中移除
- **AND** 系统返回更新后的购物车状态

---

### Requirement: 购物车数量限制

单个商品在购物车中数量 MUST NOT 超过 99。

**Priority**: P2 (Medium)

**Rationale**: 防止恶意刷单 and 异常数据，保护系统稳定性。

#### Scenario: 添加商品数量在限制内
- **GIVEN** 购物车中某商品数量为 0
- **WHEN** 添加该商品数量为 99
- **THEN** 添加成功

#### Scenario: 添加商品数量超出限制
- **GIVEN** 购物车中某商品数量为 0
- **WHEN** 尝试添加该商品数量为 100
- **THEN** 抛出 MAX_QUANTITY_EXCEEDED 错误
- **AND** 购物车保持不变

#### Scenario: 累加后数量超出限制
- **GIVEN** 购物车中某商品数量为 50
- **WHEN** 尝试再添加该商品数量为 50
- **THEN** 抛出 MAX_QUANTITY_EXCEEDED 错误
- **AND** 购物车中该商品数量保持 50

---

### Requirement: 购物车清空

系统 SHALL 提供清空整个购物车的功能，移除其中所有的商品项。

**Priority**: P1 (High)

**Rationale**: 结算完成后或用户主动要求时，需要一键清空购物车。

#### Scenario: 结算成功后自动清空
- **WHEN** 收到结算成功的信号时
- **THEN** 系统 MUST 移除该用户购物车中的所有商品项
