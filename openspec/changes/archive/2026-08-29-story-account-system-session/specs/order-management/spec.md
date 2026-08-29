## Purpose

扩展 `order-management` capability（既有主规格 `openspec/specs/order-management/spec.md`）覆盖**归属收口**：订单创建与「我的订单」查询的归属 `userId` 从**请求会话凭证**解析（替代调用方自报 `userId` 与 `user_dev` 占位），未登录访问受保护订单接口被拦截并引导登录。story.md 业务规则 R-SES-003/004/007 为本增量规格的行为契约。

## MODIFIED Requirements

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

## ADDED Requirements

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

- **Bounded Context**: `Order Context`（`domain_model.html` BC → Capability 映射表：`bc-order → cap-order`；本变更扩展归属语义）
- **Capability Taxonomy**: `order-management`（**既有 capability 扩展（MODIFIED）**：归属查询与下单绑定改造，无新增 taxonomy）
- **Process Alignment**: `L1-04 下单结算`（订单绑定当前会话 userId，替代 user_dev）；`L1-06 履约与完成`（我的订单按会话 userId 归属查询）；`L2-01 进入结算`（结算前会话校验）
- **Service Blueprint**: `SB-STAGE-04`（提交订单归属）、`SB-STAGE-06`（成功回流·我的订单入口）、`SB-CUSTOMER-04/06`（下单归属/我的订单查看）、`SB-BACKSTAGE-04`（`GET /api/orders?userId=` 归属查询改造）
- **实现版本**: Node.js（后端归属改造）＋ Frontend（我的订单登录拦截回跳）＋ E2E（用户旅程）
