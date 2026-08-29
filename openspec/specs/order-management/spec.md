# Order Management Specification

## Purpose

订单管理能力，涵盖订单的创建、查询与总价计算。订单是交易的核心单据，订单创建过程协调购物车、库存扣减与价格计算。

## Requirements

### Requirement: 订单创建

系统 SHALL 支持从用户购物车结算生成订单，过程中校验库存充足、计算金额与折扣，**但不扣减库存、不核销优惠券**（扣减与核销在支付成功时执行）。订单归属 `userId` SHALL 从请求会话凭证解析（`Authorization: Bearer <sessionToken>`），**SHALL NOT 信任客户端自报的 `userId`**；无有效会话 SHALL 返回 401，未登录不可下单。

**Priority**: P0 (Critical)

**Rationale**: 订单创建是交易的核心流程，涉及多模块协调（Cart -> Catalog -> Order）。库存与券的占用时机为"支付成功"，避免未支付订单长期占着库存。归属收口（R-SES-007）要求 `Order.userId = 当前登录用户`，替代 `user_dev` 占位。

#### Scenario: 成功创建订单
- @api
- **GIVEN** 已登录用户（持有有效会话凭证）购物车中有商品（库存充足）
- **AND** 用户持有可用优惠券
- **WHEN** 携带会话凭证发送 POST /api/orders（或通过结算接口触发）
- **THEN** 返回状态码 201
- **AND** 返回新创建的订单 Order，状态为 PENDING_PAYMENT
- **AND** `Order.userId` 等于当前会话用户（替代 `user_dev` 占位）
- **AND** 订单含正确金额（totalCents / discountCents / actualPaidCents）与优惠券绑定
- **AND** 购物车被清空
- **AND** 商品库存 SHALL NOT 变化（未扣减）
- **AND** 优惠券 SHALL NOT 被核销（仍为未使用）

#### Scenario: 创建订单时购物车为空
- @api
- **GIVEN** 已登录用户购物车为空
- **WHEN** 携带会话凭证发送 POST /api/orders
- **THEN** 返回状态码 400
- **AND** 返回错误码 CART_EMPTY

#### Scenario: 创建订单时库存不足
- @api
- **GIVEN** 已登录用户购物车中有商品
- **AND** 商品库存不足
- **WHEN** 携带会话凭证发送 POST /api/orders
- **THEN** 返回状态码 409
- **AND** 返回错误码 OUT_OF_STOCK

#### Scenario: 幂等性创建订单
- @api
- **GIVEN** 已登录用户携带 Idempotency-Key 请求头
- **WHEN** 重复发送相同的 POST /api/orders 请求
- **THEN** 返回相同的订单信息
- **AND** 不重复创建订单

### Requirement: 订单取消

系统 SHALL 支持取消订单，但仅限 `PENDING_PAYMENT` 状态。取消后订单进入 `CANCELLED` 终态；因下单未扣库存/未核销券，取消时 SHALL 无库存与券的变化。已支付（PAID）及之后状态的订单 SHALL NOT 可取消。

**Priority**: P1

**Rationale**: 取消是订单生命周期闭环的必要动作；语义与"下单不扣、支付才扣"一致。

#### Scenario: 取消待支付订单
- **GIVEN** 订单状态为 PENDING_PAYMENT
- **WHEN** 执行取消操作
- **THEN** 订单状态变为 CANCELLED（终态）
- **AND** 库存与优惠券均无变化（未扣/未核销）

#### Scenario: 已支付订单不可取消
- **GIVEN** 订单状态为 PAID（或更后续状态）
- **WHEN** 尝试取消
- **THEN** 拒绝，返回错误码 `ORDER_NOT_CANCELLABLE`
- **AND** 订单状态不变

---

### Requirement: 订单查询

系统 SHALL 支持根据 ID 查询订单详情。

**Priority**: P1 (High)

**Rationale**: 用户需要能够查看已创建订单的状态 and 详细信息。

#### Scenario: 查询存在的订单
- **GIVEN** 订单 ID 存在
- **WHEN** 发送 GET /api/orders/:id
- **THEN** 返回状态码 200
- **AND** 返回订单详情 Order

#### Scenario: 查询不存在的订单
- **GIVEN** 订单 ID 不存在
- **WHEN** 发送 GET /api/orders/:id
- **THEN** 返回状态码 404
- **AND** 返回错误码 NOT_FOUND

---

### Requirement: 订单总价计算

订单总价 MUST 等于所有条目 priceCents * quantity 之和，并扣除所选优惠券的折扣金额（discountCents）。系统 SHALL 持久化实付金额（actualPaidCents）。

**Priority**: P0 (Critical)

**Rationale**: 正确的价格计算是交易的基础，持久化实付金额为财务对账和后续退款提供依据。

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
- @unit
- **GIVEN** 订单总价（未打折）为 10000 分
- **AND** 用户应用了一张“9折”的优惠券
- **WHEN** 计算最终支付总价
- **THEN** 订单总价（totalCents）应为 10000 分
- **AND** 折扣金额（discountCents）应为 1000 分
- **AND** 实付金额（actualPaidCents）应为 9000 分

---

### Requirement: 结算时支持优惠券 ID

`checkout` 接口 SHALL 接收可选的 `couponId` 参数。如果未提供，系统 SHALL 尝试自动应用最优券。结算必须依赖后端最新的购物车状态，前端 SHALL 在结算前确保本地数据已同步。

- **Priority**: P0
- **Rationale**: 确保结算时的优惠计算是经过后端权威验证的，并支持自动推荐。

#### Scenario: 结算时携带有效优惠券 ID
- @api
- **GIVEN** 用户购物车中有商品且已与后端同步
- **AND** 优惠券 ID 有效且满足门槛
- **WHEN** 发送 POST /api/checkout 携带 { userId, couponId }
- **THEN** 结算成功并返回应用折扣后的订单，且订单记录该 `couponId`
- **AND** 结算使用的商品清单必须与后端购物车存储完全一致

#### Scenario: 结算时不携带优惠券 ID 但有可用券
- @api
- **GIVEN** 用户购物车中有商品
- **AND** 用户持有可用的“9折”优惠券
- **WHEN** 发送 POST /api/checkout 仅携带 { userId }
- **THEN** 系统自动应用“9折”券并完成结算
- **AND** 返回的订单中包含已应用的 `couponId` 和计算后的 `actualPaidCents`

---

### Requirement: B 端订单列表查询

系统 SHALL 提供 B 端订单列表接口 `GET /api/admin/orders`：支持可选 `status` 参数按状态过滤（缺省返回全部状态），支持可选 `keyword` 参数按订单号或用户 ID 模糊搜索。返回订单摘要列表（订单号、用户 ID、状态、实付金额、商品条目）。

**Priority**: P0

**Rationale**: 运营需要在一个后台查看全部订单并按状态处理，是订单管理闭环的入口。

#### Scenario: 获取全部订单
- @api
- **GIVEN** 系统存在多个不同状态的订单
- **WHEN** 运营人员请求 GET /api/admin/orders
- **THEN** 返回状态码 200
- **AND** 返回全部订单摘要（订单号/用户/状态/实付金额/商品条目）

#### Scenario: 按状态过滤订单
- @api
- **GIVEN** 系统存在 PENDING_PAYMENT 与 PAID 等状态订单
- **WHEN** 运营人员请求 GET /api/admin/orders?status=PAID
- **THEN** 仅返回状态为 PAID 的订单

#### Scenario: 按关键词搜索订单
- @api
- **WHEN** 运营人员请求 GET /api/admin/orders?keyword=<订单号片段或用户ID>
- **THEN** 仅返回订单号或用户 ID 匹配该关键词的订单

---

### Requirement: B 端订单发货

系统 SHALL 支持运营人员对订单执行发货：`POST /api/admin/orders/:id/ship`。仅 `PAID` 状态的订单 SHALL 可发货，发货后状态变为 `SHIPPED`；其他状态发货 SHALL 被拒绝。

**Priority**: P0

**Rationale**: 发货是履约闭环的关键动作，状态机约束防止误操作。

#### Scenario: 发货已支付订单
- @api
- **GIVEN** 订单状态为 PAID
- **WHEN** 运营人员请求 POST /api/admin/orders/:id/ship
- **THEN** 返回状态码 200
- **AND** 订单状态变为 SHIPPED

#### Scenario: 非 PAID 订单发货被拒绝
- @api
- **GIVEN** 订单状态为 PENDING_PAYMENT（或 SHIPPED/COMPLETED）
- **WHEN** 运营人员请求 POST /api/admin/orders/:id/ship
- **THEN** 返回状态码 400
- **AND** 返回错误码 `ORDER_STATUS_INVALID`
- **AND** 订单状态不变

#### Scenario: 发货不存在的订单
- @api
- **WHEN** 运营人员请求 POST /api/admin/orders/<不存在的id>/ship
- **THEN** 返回状态码 404
- **AND** 返回错误码 `ORDER_NOT_FOUND`

---

### Requirement: B 端订单取消

系统 SHALL 支持运营人员取消订单：`POST /api/admin/orders/:id/cancel`。仅 `PENDING_PAYMENT` 状态的订单 SHALL 可取消，取消后进入 `CANCELLED` 终态（未扣库存/未核销券，无释放动作）；其他状态 SHALL 被拒绝。

**Priority**: P0

**Rationale**: 取消是生命周期闭环的必要动作；语义与"支付才扣库存"一致。

#### Scenario: 取消待支付订单
- @api
- **GIVEN** 订单状态为 PENDING_PAYMENT
- **WHEN** 运营人员请求 POST /api/admin/orders/:id/cancel
- **THEN** 返回状态码 200
- **AND** 订单状态变为 CANCELLED（终态）

#### Scenario: 已支付订单不可取消
- @api
- **GIVEN** 订单状态为 PAID（或更后续状态）
- **WHEN** 运营人员请求 POST /api/admin/orders/:id/cancel
- **THEN** 返回状态码 400
- **AND** 返回错误码 `ORDER_NOT_CANCELLABLE`
- **AND** 订单状态不变

---

### Requirement: 按用户查询订单列表

系统 SHALL 提供「我的订单」查询接口 `GET /api/orders`：归属 `userId` 从请求会话凭证（`Authorization: Bearer <sessionToken>`）解析，**SHALL NOT 信任客户端 `?userId=` 参数**；返回该用户的全部订单（按创建时间倒序），其他用户的订单 SHALL NOT 出现在结果中。无有效会话 SHALL 返回 401 引导登录。

**Priority**: P0

**Rationale**: C 端买家需要查看自己的全部订单与状态，订单归属隔离是基本约束（R-SES-003）；归属主体改为会话解析，防止客户端自报他人 `userId` 越权查询。

#### Scenario: 查询当前用户订单
- @api
- **GIVEN** 已登录用户（会话 userId = user_1001）存在 2 个订单，user_1002 存在 1 个订单
- **WHEN** 携带会话凭证请求 GET /api/orders
- **THEN** 返回状态码 200
- **AND** 仅返回 user_1001 的 2 个订单，按创建时间倒序

#### Scenario: 无订单用户返回空数组
- @api
- **WHEN** 已登录（会话 userId 无订单）请求 GET /api/orders
- **THEN** 返回状态码 200
- **AND** 返回空数组

#### Scenario: 订单归属隔离
- @api
- **GIVEN** user_1001 的订单存在，请求方会话 userId = user_1002
- **WHEN** 携带 user_1002 会话凭证请求 GET /api/orders（即使附带 `?userId=user_1001`）
- **THEN** 返回结果 SHALL NOT 包含 user_1001 的订单

### Requirement: 未登录访问受保护订单接口拦截

系统 SHALL 在未登录（无有效会话凭证）访问受保护订单能力时拦截并引导登录：「我的订单」（`GET /api/orders`）与下单（`POST /api/orders`、`POST /api/checkout`）返回 `401 UNAUTHORIZED`「请先登录」；前端 SHALL 整页跳转登录页并携带回跳目标，登录成功后回到原页面（R-SES-004）。

- **Priority**: P0
- **Rationale**: 未登录不可查看我的订单 / 下单是账户体系硬性业务限制（idea.md §1）；拦截与回跳对齐 Q-4 默认方案（R-SES-004）。

#### Scenario: 未登录请求我的订单返回 401
- @api
- **GIVEN** 请求未携带会话凭证
- **WHEN** 请求 GET /api/orders
- **THEN** 返回状态码 401，错误码 `UNAUTHORIZED`
- **AND** 不返回任何订单数据

#### Scenario: 未登录提交订单返回 401
- @api
- **GIVEN** 请求未携带会话凭证
- **WHEN** 请求 POST /api/orders（或 POST /api/checkout）
- **THEN** 返回状态码 401，错误码 `UNAUTHORIZED`
- **AND** 不创建订单

#### Scenario: 未登录访问我的订单被引导登录并回跳
- @e2e
- **GIVEN** 浏览器无任何会话凭证（未登录）
- **WHEN** 直接访问「我的订单」页面
- **THEN** 系统拦截并跳转登录页（携带回跳目标）
- **AND** 登录成功后回到「我的订单」页面

## Governance Mapping

- **Bounded Context**: Order Context（`domain_model.html` BC → Capability 映射表：`bc-order → cap-order`）
- **Capability Taxonomy**: `order-management`（复用既有映射，无新增 taxonomy）
- **Process Alignment**: L1-04 下单结算；L1-06 履约与完成（发货/查看）；L2-05 提交订单；L3-04 订单绑定与占用（取消释放语义）
- **Service Blueprint**: SB-STAGE-04（提交订单）、SB-STAGE-06（履约与完成）、SB-CUSTOMER-04/06、SB-OPS-04/06（运营查看/发货/取消）、SB-BACKSTAGE-04（admin + 按用户查询接口）
- **实现版本**: Node.js / Python（后端 API）＋ Frontend（B 端订单管理 + C 端我的订单）
