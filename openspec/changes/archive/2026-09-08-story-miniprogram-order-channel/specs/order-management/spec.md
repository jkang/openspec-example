# order-management Specification (Delta)

> 增量文件：追加于主 specs `openspec/specs/order-management/spec.md`（本 change 对既有能力的增量修改）。治理归属：`bc-order → cap-order`（既有 Governs 边行 965）。本 delta **只追加** `Order.channel` 渠道来源字段行为，不重复声明既有订单状态机/流程。

## ADDED Requirements

### Requirement: 订单渠道来源（channel，会话继承写入）

系统 SHALL 为订单记录渠道来源（R-ORDCH-001/002，Q7）：

- `Order.channel` 字段：`'WEB'`（默认）| `'MINIPROGRAM'`；创建时写入的不可变属性（R-ORDCH-005），不随状态流转变化。
- **渠道写入口径（R-ORDCH-002）**：下单时从**会话来源**继承——微信授权登录（wechat-auth）创建的会话（来源 `MINIPROGRAM`）下单 → `channel=MINIPROGRAM`；其余（网页登录）会话下单 → `channel=WEB`。**服务端按会话解析判定，不信任客户端传参（防伪造）**。
- **存量兼容**：升级前创建的存量订单（无 `channel` 字段）视为 `WEB`（迁移语义），不破坏既有数据。
- 渠道不影响订单状态机与发货/取消流程（R-ORDCH-004：同一状态机，不因渠道分流）。

- **Priority**: P1
- **Rationale**: 客户电话询单时运营需一眼识别订单来源（微信 vs 网页，research 访谈 2）；Q7 已确认会话来源继承（防客户端伪造）+ 仅标识展示。

#### Scenario: MINIPROGRAM 会话下单带渠道标识
- @e2e
- **GIVEN** 买家王倩已通过微信授权登录（会话来源 MINIPROGRAM），购物车含无线办公鼠标 × 1
- **WHEN** 王倩提交订单（携带其会话凭证）
- **THEN** 订单创建成功，`Order.channel = 'MINIPROGRAM'`（服务端按会话来源判定）

#### Scenario: WEB 会话下单默认渠道
- @e2e
- **GIVEN** 买家林晓明通过网页登录（会话来源 WEB）
- **WHEN** 林晓明提交订单
- **THEN** 订单创建成功，`Order.channel = 'WEB'`（默认值）

#### Scenario: 客户端伪造渠道传参不被信任
- @api
- **GIVEN** 网页登录会话（来源 WEB）买家发起下单
- **WHEN** 请求体恶意携带 `channel=MINIPROGRAM`
- **THEN** 系统忽略客户端传参，订单 `channel` 仍按会话来源判定为 `'WEB'`（防伪造，Q7）

### Requirement: B 端订单管理渠道标识展示

系统 SHALL 在 B 端订单管理列表展示订单渠道来源（R-ORDCH-003，Q7）：

- 列表每单显示渠道标识（`WEB` → 「网页」；`MINIPROGRAM` → 「小程序」）。
- **仅展示**：MVP 不做按渠道筛选/统计（Q7）。
- 订单查询/详情/发货/取消流程与网页单完全一致（R-ORDCH-004）。
- 存量订单（无 channel）展示为「网页」。

- **Priority**: P1
- **Rationale**: 运营一眼识别订单来源（research 访谈 2）；MVP 保持极简（仅标识列，不做筛选）。

#### Scenario: 运营查看订单列表可见渠道来源
- @e2e
- **GIVEN** 系统中同时存在小程序单（王倩：无线办公鼠标）与网页单（陈晓芸：高清显示器）
- **WHEN** 运营进入 B 端「订单管理」
- **THEN** 列表每单展示渠道标识：小程序单显示「小程序」、网页单显示「网页」
- **AND** 金额与状态正确（渠道不影响既有列）

## Governance Mapping

- **Bounded Context**: `Order Context`（既有 `bc-order → cap-order` Governs 边；`Order` Aggregate 字段扩展）
- **Capability Taxonomy**: `order-management`（修改，复用 `openspec/specs/order-management/spec.md` 路径）
- **Process Alignment**: `L1-04` 下单结算（订单渠道来源写入）；`L1-06` 履约与完成（B 端订单管理渠道标识展示；发货/取消流程不受渠道影响）
- **Service Blueprint**: `SB-STAGE-04`（提交订单：Order.channel 写入）、`SB-CUSTOMER-04`（下单归属：渠道标识随订单落库）、`SB-OPS-*`（B 端订单列表渠道标识列）、`SB-CUSTOMER-06` / `SB-BACKSTAGE-04`（订单回读展示渠道来源）
- **实现版本**: Node.js（后端权威实现，Python 不对齐）；Frontend（Vue B 端订单列表渠道标识列）
