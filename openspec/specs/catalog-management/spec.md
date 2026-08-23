# Catalog Management Specification

## Purpose

商品目录管理能力，涵盖商品的查询、上架、修改、删除与库存管理。商品是电商系统的核心资源，所有交易流程均以商品数据为基础。

## Requirements

### Requirement: 商品列表查询

系统 SHALL 提供商品列表查询接口。返回的商品对象 SHALL 包含 `imageUrl` 字段以供前端展示。客户端可通过可选的 `name` 查询参数按名称模糊过滤商品；可通过可选 `categoryId` 查询参数按分类过滤商品；未提供参数时，返回所有**有效（active）**商品。**已下架（deleted）的商品 SHALL NOT 出现在结果中。**

**Priority**: P0 (Critical)

**Rationale**: 确保前端能够获取并展示商品的视觉信息，这是提升专业感的基础。商品浏览是电商系统的核心入口功能，用户必须能够查看可购买的商品。引入软删除后列表必须过滤已下架项，避免 C 端展示失效商品；引入分类后列表支持按 `categoryId` 过滤。

@e2e
#### Scenario: 获取所有商品（无过滤）

- **GIVEN** 系统中存在包含图片信息的商品数据，其中含一个 `deleted` 状态商品
- **WHEN** 用户请求 GET /api/products（不带 name 参数）
- **THEN** 返回状态码 200
- **AND** 返回商品数组 Product[]，其中每个商品均包含 `imageUrl` 字段
- **AND** 结果 SHALL NOT 包含任何 `status === 'deleted'` 的商品

@api
#### Scenario: 按名称模糊搜索

Given 系统中存在商品数据
When 用户请求 GET /api/products?name=<keyword>
Then 返回状态码 200
And 返回商品数组 Product[]，仅包含名称匹配 <keyword> 的商品（大小写不敏感的包含匹配）
And 结果 SHALL NOT 包含已下架（deleted）商品

@api
#### Scenario: 搜索无结果

Given 系统中存在商品数据，但没有商品名称匹配 <keyword>
When 用户请求 GET /api/products?name=<keyword>
Then 返回状态码 200
And 返回空数组 Product[]

@api
#### Scenario: 按分类过滤商品

Given 系统存在分类「键鼠外设」，其下有商品「极简机械键盘」「无线办公鼠标」
When 用户请求 GET /api/products?categoryId=cat-keyboard
Then 返回状态码 200
And 仅返回 categoryId 为 cat-keyboard 且 active 的商品

@api
#### Scenario: 分类与名称搜索组合

Given 「桌面收纳」分类下存在「桌面收纳架」「铝合金笔记本支架」
When 用户请求 GET /api/products?categoryId=cat-desk&name=支架
Then 仅返回「桌面收纳」分类下名称含「支架」的 active 商品

---

### Requirement: 商品列表按价格排序

系统 SHALL 支持通过可选的 `sort` 查询参数对商品列表按价格排序。`sort=price_asc` 表示价格升序，`sort=price_desc` 表示价格降序；未提供 `sort` 参数时保持自然顺序。

**Priority**: P1 (High)

**Rationale**: 价格排序是商品浏览的常见需求，与名称搜索组合可满足"按价格找商品"的典型场景。

#### Scenario: 按价格升序排序

Given 系统中存在多个不同价格的商品
When 用户请求 GET /api/products?sort=price_asc
Then 返回状态码 200
And 返回商品数组 Product[]，按 priceCents 升序排列

#### Scenario: 按价格降序排序

Given 系统中存在多个不同价格的商品
When 用户请求 GET /api/products?sort=price_desc
Then 返回状态码 200
And 返回商品数组 Product[]，按 priceCents 降序排列

#### Scenario: 搜索与排序组合

Given 系统中存在名称和价格各异的商品
When 用户请求 GET /api/products?name=<keyword>&sort=price_asc
Then 返回状态码 200
And 返回名称匹配 <keyword> 的商品数组，按 priceCents 升序排列

#### Scenario: 无效排序参数

Given 系统中存在商品数据
When 用户请求 GET /api/products?sort=invalid
Then 返回状态码 200
And 返回商品数组 Product[]，保持自然顺序（忽略无效的 sort 值）

---

### Requirement: 商品上架

系统 SHALL 支持商品上架功能，接收包含图片链接的商品信息并创建新商品记录。

**Priority**: P1 (High)

**Rationale**: 完善商品管理闭环，支持从源头录入图片信息。便于测试数据初始化和演示。

#### Scenario: 上架新商品

- **GIVEN** 管理员需要添加带图片的商品
- **WHEN** 发送 POST /api/products 携带商品信息 { name, priceCents, stock, imageUrl }
- **THEN** 返回状态码 201
- **AND** 返回包含 `imageUrl` 的商品对象 Product

#### Scenario: 自动生成商品 ID

Given 上架请求未提供商品 ID
When 系统处理商品创建
Then 系统 SHALL 自动生成格式为 prod_xxxx 的唯一标识

---

### Requirement: 商品修改

系统 SHALL 支持运营人员修改已有商品，可编辑字段为 `name`、`priceCents`、`stock`、`imageUrl`、`description`。修改时 SHALL 校验 `priceCents > 0` 与 `stock >= 0`，非法值拒绝修改。修改 SHALL 即时生效并同步反映在 C 端商品列表。

**Priority**: P0 (Critical)

**Rationale**: 运营需维护真实商品目录（改价/改库存/改图文），补齐「改」能力以满足 Phase 2 Exit Criteria ② 的增删改查。

#### Scenario: 修改商品价格与库存

- **GIVEN** 系统中存在商品「极简机械键盘」priceCents=29900、stock=99，状态 active
- **WHEN** 运营人员请求 PUT /api/products/:id，body 为 { priceCents: 27900, stock: 50 }
- **THEN** 返回状态码 200
- **AND** 返回更新后的商品，priceCents=27900、stock=50
- **AND** 随后 GET /api/products 返回该商品的最新值

#### Scenario: 修改为非法价格被拒绝

- **GIVEN** 系统存在商品 A
- **WHEN** 运营人员请求 PUT /api/products/A，body 为 { priceCents: 0 }
- **THEN** 返回状态码 400
- **AND** 返回错误码 `INVALID_PRICE`
- **AND** 商品 A 原值不变

#### Scenario: 修改为负库存被拒绝

- **GIVEN** 系统存在商品 A
- **WHEN** 运营人员请求 PUT /api/products/A，body 为 { stock: -1 }
- **THEN** 返回状态码 400
- **AND** 返回错误码 `INVALID_STOCK`
- **AND** 商品 A 原值不变

#### Scenario: 修改不存在的商品

- **WHEN** 运营人员请求 PUT /api/products/<不存在的id>
- **THEN** 返回状态码 404
- **AND** 返回错误码 `PRODUCT_NOT_FOUND`

---

### Requirement: 商品删除（软删除）

系统 SHALL 支持运营人员下架（删除）商品。删除 SHALL 为软删除：将商品 `status` 置为 `deleted`，而非物理移除。已删除商品 SHALL NOT 出现在商品列表/搜索中，但历史订单中基于商品快照的引用 SHALL 不受影响。

**Priority**: P0 (Critical)

**Rationale**: 软删除（下架语义）解耦"移除目录可见性"与"保留历史可追溯"，避免破坏订单/库存审计。

#### Scenario: 删除商品后从列表移除

- **GIVEN** 系统存在商品「桌面收纳架」，status=active
- **WHEN** 运营人员请求 DELETE /api/products/:id
- **THEN** 返回状态码 200
- **AND** 该商品 status 变为 `deleted`
- **AND** 随后 GET /api/products 的结果不再包含该商品

#### Scenario: 删除不存在的商品

- **WHEN** 运营人员请求 DELETE /api/products/<不存在的id>
- **THEN** 返回状态码 404
- **AND** 返回错误码 `PRODUCT_NOT_FOUND`

#### Scenario: 重复删除已下架商品

- **GIVEN** 商品「桌面收纳架」status 已为 `deleted`
- **WHEN** 运营人员再次请求 DELETE /api/products/:id
- **THEN** 返回状态码 404
- **AND** 返回错误码 `PRODUCT_NOT_FOUND`

---

### Requirement: 库存扣减

库存扣减后 MUST NOT 为负数。系统 SHALL 提供原子性库存扣减操作。

**Priority**: P0 (Critical)

**Rationale**: 库存为负会导致超卖，影响业务准确性和用户体验。

#### Scenario: 库存充足时扣减

Given 商品库存为 5
When 扣减 3 个库存
Then 库存变为 2
And 操作成功

#### Scenario: 库存不足时扣减

Given 商品库存为 5
When 尝试扣减 6 个库存
Then 抛出 OUT_OF_STOCK 错误
And 库存保持不变

---

### Requirement: 分类管理（CRUD + 软删除）

系统 SHALL 支持运营人员维护商品分类：分类字段为 `name`（必填）与 `sortOrder`（排序号）。系统 SHALL 支持新增、编辑、删除分类。删除 SHALL 为软删除（`status=deleted`），删除后该分类下所有商品的 `categoryId` SHALL 置空（变为未分类）。同名分类 SHALL 被拒绝。

**Priority**: P0

**Rationale**: 分类是商品目录的组织维度，软删除保留可追溯并避免破坏商品关联。

#### Scenario: 新增分类

- @api
- **GIVEN** 运营人员进入分类管理
- **WHEN** 提交 POST /api/categories { name: "键鼠外设", sortOrder: 1 }
- **THEN** 返回状态码 201
- **AND** 返回 status=active 的分类对象
- **AND** 该分类出现在 GET /api/categories 结果中

#### Scenario: 同名分类被拒绝

- @api
- **GIVEN** 已存在分类「键鼠外设」（active）
- **WHEN** 提交 POST /api/categories { name: "键鼠外设" }
- **THEN** 返回状态码 409
- **AND** 返回错误码 `CATEGORY_NAME_EXISTS`

#### Scenario: 编辑分类

- @api
- **WHEN** 提交 PUT /api/categories/:id { name: "键鼠周边", sortOrder: 2 }
- **THEN** 返回状态码 200
- **AND** 返回更新后的分类对象

#### Scenario: 删除分类（软删除 + 商品置空）

- @api
- **GIVEN** 分类「音频设备」下存在商品「桌面拾音氛围灯」（categoryId=cat-audio）
- **WHEN** 提交 DELETE /api/categories/cat-audio
- **THEN** 返回状态码 200
- **AND** 该分类 status 变为 deleted，从 GET /api/categories 消失
- **AND** 「桌面拾音氛围灯」的 categoryId 变为 null（未分类），仍可正常查询

#### Scenario: 删除不存在分类

- @api
- **WHEN** 提交 DELETE /api/categories/<不存在的id>
- **THEN** 返回状态码 404
- **AND** 返回错误码 `CATEGORY_NOT_FOUND`

---

### Requirement: 商品挂分类

系统 SHALL 支持商品关联分类：商品对象包含可选 `categoryId` 字段（null 表示未分类）。商品新增/修改时 SHALL 支持设置 `categoryId`（可空）；设置的分类必须存在（active），否则拒绝。

**Priority**: P1

**Rationale**: 分类必须落到商品上才有业务价值；未分类商品兼容存量数据。

#### Scenario: 商品设置分类

- @api
- **GIVEN** 系统存在 active 分类「键鼠外设」
- **WHEN** 修改商品（PUT /api/products/:id）携带 { categoryId: "cat-keyboard" }
- **THEN** 返回状态码 200
- **AND** 该商品 categoryId 变为 cat-keyboard

#### Scenario: 商品设置为未分类

- @api
- **WHEN** 修改商品携带 { categoryId: null }
- **THEN** 返回状态码 200
- **AND** 该商品 categoryId 为 null

#### Scenario: 引用不存在的分类被拒绝

- @api
- **WHEN** 修改商品携带 { categoryId: "cat-nope" }
- **THEN** 返回状态码 400
- **AND** 返回错误码 `CATEGORY_NOT_FOUND`

## Governance Mapping

- **Bounded Context**: Catalog Context（`domain_model.html` BC → Capability 映射表：`bc-catalog → cap-catalog`）
- **Capability Taxonomy**: `catalog-management`（复用既有映射，无新增 taxonomy）
- **Process Alignment**: L1-01 触达与发现（C 端分类浏览/筛选）；L1-02 评估与决策（商品元数据含分类）
- **Service Blueprint**: SB-STAGE-01（触达与发现）、SB-STAGE-02（选购与加购）、SB-CUSTOMER-01/02、SB-OPS-01/02/04（运营商品与分类管理）、SB-BACKSTAGE-01/04/06（商品/分类持久化）
- **实现版本**: Node.js（后端 API）＋ Frontend（商品展示 + B 端商品/分类管理界面）
