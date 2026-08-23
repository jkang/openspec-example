## MODIFIED Requirements

### Requirement: 商品列表查询
系统 SHALL 提供商品列表查询接口。返回的商品对象 SHALL 包含 `imageUrl` 字段以供前端展示。客户端可通过可选的 `name` 查询参数按名称模糊过滤商品；未提供 `name` 参数时，返回所有**有效（active）**商品。**已下架（deleted）的商品 SHALL NOT 出现在结果中。**
- **Priority**: P0 (Critical)
- **Rationale**: 商品浏览是电商核心入口；引入软删除后列表必须过滤已下架项，避免 C 端展示失效商品（对应 R-PRODUCT-005）。

#### Scenario: 获取所有商品（无过滤）
- @e2e
- **GIVEN** 系统中存在包含图片信息的商品数据，其中含一个 `deleted` 状态商品
- **WHEN** 用户请求 GET /api/products（不带 name 参数）
- **THEN** 返回状态码 200
- **AND** 返回商品数组 Product[]，其中每个商品均包含 `imageUrl` 字段
- **AND** 结果 SHALL NOT 包含任何 `status === 'deleted'` 的商品

#### Scenario: 按名称模糊搜索
- @api
- **GIVEN** 系统中存在商品数据
- **WHEN** 用户请求 GET /api/products?name=<keyword>
- **THEN** 返回状态码 200
- **AND** 返回商品数组 Product[]，仅包含名称匹配 <keyword> 商品（大小写不敏感的包含匹配）
- **AND** 结果 SHALL NOT 包含已下架（deleted）商品

#### Scenario: 搜索无结果
- @api
- **GIVEN** 系统中存在商品数据，但没有商品名称匹配 <keyword>
- **WHEN** 用户请求 GET /api/products?name=<keyword>
- **THEN** 返回状态码 200
- **AND** 返回空数组 Product[]

## ADDED Requirements

### Requirement: 商品修改
系统 SHALL 支持运营人员修改已有商品，可编辑字段为 `name`、`priceCents`、`stock`、`imageUrl`、`description`。修改时 SHALL 校验 `priceCents > 0` 与 `stock >= 0`，非法值拒绝修改。修改 SHALL 即时生效并同步反映在 C 端商品列表。
- **Priority**: P0 (Critical)
- **Rationale**: 运营需维护真实商品目录（改价/改库存/改图文），补齐「改」能力以满足 Phase 2 Exit Criteria ② 的增删改查（R-PRODUCT-001/002/003/007）。

#### Scenario: 修改商品价格与库存
- @api
- **GIVEN** 系统中存在商品「极简机械键盘」priceCents=29900、stock=99，状态 active
- **WHEN** 运营人员请求 PUT /api/products/:id，body 为 { priceCents: 27900, stock: 50 }
- **THEN** 返回状态码 200
- **AND** 返回更新后的商品，priceCents=27900、stock=50
- **AND** 随后 GET /api/products 返回该商品的最新值

#### Scenario: 修改为非法价格被拒绝
- @api
- **GIVEN** 系统存在商品 A
- **WHEN** 运营人员请求 PUT /api/products/A，body 为 { priceCents: 0 }
- **THEN** 返回状态码 400
- **AND** 返回错误码 `INVALID_PRICE`
- **AND** 商品 A 原值不变

#### Scenario: 修改为负库存被拒绝
- @api
- **GIVEN** 系统存在商品 A
- **WHEN** 运营人员请求 PUT /api/products/A，body 为 { stock: -1 }
- **THEN** 返回状态码 400
- **AND** 返回错误码 `INVALID_STOCK`
- **AND** 商品 A 原值不变

#### Scenario: 修改不存在的商品
- @api
- **WHEN** 运营人员请求 PUT /api/products/<不存在的id>
- **THEN** 返回状态码 404
- **AND** 返回错误码 `PRODUCT_NOT_FOUND`

### Requirement: 商品删除（软删除）
系统 SHALL 支持运营人员下架（删除）商品。删除 SHALL 为软删除：将商品 `status` 置为 `deleted`，而非物理移除。已删除商品 SHALL NOT 出现在商品列表/搜索中，但历史订单中基于商品快照的引用 SHALL 不受影响。
- **Priority**: P0 (Critical)
- **Rationale**: 软删除（下架语义）解耦"移除目录可见性"与"保留历史可追溯"，避免破坏订单/库存审计（R-PRODUCT-004/005/006）。

#### Scenario: 删除商品后从列表移除
- @api
- **GIVEN** 系统存在商品「桌面收纳架」，status=active
- **WHEN** 运营人员请求 DELETE /api/products/:id
- **THEN** 返回状态码 200
- **AND** 该商品 status 变为 `deleted`
- **AND** 随后 GET /api/products 的结果不再包含该商品

#### Scenario: 删除不存在的商品
- @api
- **WHEN** 运营人员请求 DELETE /api/products/<不存在的id>
- **THEN** 返回状态码 404
- **AND** 返回错误码 `PRODUCT_NOT_FOUND`

#### Scenario: 重复删除已下架商品
- @api
- **GIVEN** 商品「桌面收纳架」status 已为 `deleted`
- **WHEN** 运营人员再次请求 DELETE /api/products/:id
- **THEN** 返回状态码 404
- **AND** 返回错误码 `PRODUCT_NOT_FOUND`

## Governance Mapping

- **Bounded Context**: Catalog Context（`domain_model.html` BC → Capability 映射表：`bc-catalog → cap-catalog`）
- **Capability Taxonomy**: `catalog-management`（复用既有映射，无新增 taxonomy）
- **Process Alignment**: `L3-01` 识别候选券（商品元数据为可选券前置条件之一，本次不改变）；`L1-01` 触达与发现、`L1-02` 评估与决策（商品列表/搜索仅展示 active，改/删影响 C 端元数据）
- **Service Blueprint**: `SB-STAGE-01`（触达与发现）、`SB-STAGE-02`（选购与加购）、`SB-CUSTOMER-01`（商品展示）、`SB-OPS-01/02/04`（运营商品管理：修改/删除）、`SB-BACKSTAGE-01/04/06`（商品状态与软删除持久化）
- **实现版本**: Node.js（后端 API）＋ Frontend（B 端商品管理界面）
