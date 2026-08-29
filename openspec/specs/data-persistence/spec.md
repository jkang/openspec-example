# data-persistence Specification

## Purpose
承载系统**数据持久化**横切能力：运行链路（`npm start` / `init.sh node:start`）默认以 JSON 文件存储（FileStore）落盘全部业务数据，服务重启后数据可恢复；`NODE_ENV=test` 下使用内存仓储保证测试隔离。本能力是对既有 specs（catalog/coupon/order/user-session）中零散持久化承诺的统一支撑契约，修复「规范已承诺文件持久化、运行链路却纯内存未落盘」的缺陷。

## Requirements

### Requirement: 运行链路默认文件持久化

系统 SHALL 在运行链路（非 `NODE_ENV=test`）默认启用基于文件的 JSON 持久化（FileStore）；`NODE_ENV=test` 时 SHALL 使用内存仓储以保证测试隔离。显式存储选择（如 `STORAGE=memory|file` 环境变量）优先级 SHALL 高于默认规则。开发服务器（`npm start`）与生产服务器（`npm run start:prod`）SHALL 共享同一套路由与服务逻辑，仅存储后端不同。

- **Priority**: P0
- **Rationale**: ROADMAP 承诺「JSON 文件持久化真实数据落地」，但主链路（`server.js` + `memoryRepo`）纯内存导致用户操作不落盘、重启即清零；文件持久化未接线属于规范与实现漂移（Bug Fix）。

#### Scenario: 运行链路写操作落盘 JSON 文件
- @api
- **GIVEN** 以运行链路（非 test 环境）启动后端（FileStore 存储）
- **WHEN** 执行注册用户、下单并完成支付
- **THEN** `data/` 目录中 `users.json`、`orders.json` 等文件包含对应记录
- **AND** 会话凭证已写入 `sessions.json`

#### Scenario: 测试环境强制内存隔离
- @api
- **GIVEN** `NODE_ENV=test` 启动后端
- **WHEN** 执行任意写操作
- **THEN** 数据仅驻留进程内存 Map
- **AND** `data/` 目录不发生任何写入

### Requirement: 持久化数据覆盖全部业务域

系统 SHALL 对以下 8 类业务数据提供文件持久化：商品（products）、分类（categories）、优惠券（coupons）、优惠券发放（issuances）、订单（orders）、购物车（carts，按归属用户键控）、用户（users）、会话（sessions）。任一写操作完成后，对应存储 SHALL 同步反映最新状态。

- **Priority**: P0
- **Rationale**: ROADMAP 承诺的持久化范围是全部业务数据（products/categories/coupons/orders/carts/users/sessions），缺一即破坏「真实数据落地」。

#### Scenario: 新增商品后商品文件持久化
- @api
- **GIVEN** 运行链路启动且存储为文件模式
- **WHEN** 运营新增商品（`POST /api/products`）
- **THEN** `products.json` 包含该商品完整记录

#### Scenario: 购物车按用户归属持久化
- @api
- **GIVEN** 买家 A 登录并向购物车加购商品
- **WHEN** 读取 `carts.json`
- **THEN** 记录以买家 A 的 `userId` 为键控且包含加购条目

### Requirement: 服务重启后数据可恢复

系统 SHALL 在服务进程重启（同一 `data/` 目录）后恢复全部已持久化数据：用户可凭既有会话凭证继续访问（登录态不丢失），订单/购物车/商品/券数据 SHALL 保持重启前状态，归属关系不改变。

- **Priority**: P0
- **Rationale**: 「持久化」的本质语义是跨进程生命周期保留；重启即失的数据等同于无持久化（本 Bug Fix 的验收核心）。

#### Scenario: 重启后会话与订单可恢复
- @api
- **GIVEN** 买家已注册、登录并完成下单支付（会话凭证 + 订单已写入文件存储）
- **WHEN** 后端进程停止并再次启动（同一 `data/` 目录，文件存储模式）
- **THEN** 以原会话凭证访问「我的订单」仍返回该订单
- **AND** 以原凭证访问需登录接口校验通过

#### Scenario: 重启后注册用户仍可登录
- @api
- **GIVEN** 买家已注册（用户记录已写入 `users.json`）
- **WHEN** 后端进程重启后，以原手机号与密码请求登录
- **THEN** 登录成功，返回新的会话凭证

#### Scenario: 重启后登录态保持（端到端）
- @e2e
- **GIVEN** 前端已登录买家并存在历史订单
- **WHEN** 后端服务进程重启后刷新页面/重新请求我的订单
- **THEN** 登录态保持，历史订单可见
- **AND** 订单状态与重启前一致

### Requirement: 文件存储初始化与数据一致性

系统 SHALL 在首次启动时自动初始化缺失的数据文件（含 `users.json`、`sessions.json`、`issuances.json`）；读取损坏或格式不符的文件时 SHALL 安全降级（不崩溃），并以空数据或种子数据启动。每次写操作 SHALL 将完整数据集同步写回文件，保证文件与内存状态一致。

- **Priority**: P1
- **Rationale**: 当前 `data/` 目录缺 `users.json`/`sessions.json`/`issuances.json`，首次运行需自动创建；写一致性是文件存储的基本正确性保证。

#### Scenario: 首次启动自动初始化缺失数据文件
- @api
- **GIVEN** `data/` 目录不存在或缺少 `sessions.json`
- **WHEN** 以文件存储模式启动后端
- **THEN** 启动成功，缺失数据文件被自动创建（空数据集）
- **AND** 不抛出异常

#### Scenario: 写操作后文件与内存状态一致
- @api
- **GIVEN** 文件存储模式下商品列表含 3 条记录
- **WHEN** 新增第 4 个商品
- **THEN** 再次启动读取 `products.json` 含 4 条记录
