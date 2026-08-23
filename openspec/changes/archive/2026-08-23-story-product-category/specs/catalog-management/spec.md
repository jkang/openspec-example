## MODIFIED Requirements

### Requirement: 商品列表查询
系统 SHALL 提供商品列表查询接口。返回的商品对象 SHALL 包含 `imageUrl` 字段以供前端展示。客户端可通过可选的 `name` 查询参数按名称模糊过滤商品；可通过可选 `categoryId` 参数按分类过滤商品；未提供参数时，返回所有**有效（active）**商品。**已下架（deleted）的商品 SHALL NOT 出现在结果中。**
- **Priority**: P0 (Critical)
- **Rationale**: 商品浏览是电商核心入口；引入分类后列表必须支持按 `categoryId` 过滤，配合名称过滤满足"按品类找商品"（R-CAT-006）。

#### Scenario: 获取所有商品（无过滤）
- @e2e
- **GIVEN** 系统中存在包含图片信息的商品数据，其中含一个 `deleted` 状态商品
- **WHEN** 用户请求 GET /api/products（不带 name/categoryId 参数）
- **THEN** 返回状态码 200
- **AND** 返回商品数组 Product[]，其中每个商品均包含 `imageUrl` 字段
- **AND** 结果 SHALL NOT 包含任何 `status === 'deleted'` 的商品

#### Scenario: 按名称模糊搜索
- @api
- **GIVEN** 系统中存在商品数据
- **WHEN** 用户请求 GET /api/products?name=<keyword>
- **THEN** 返回状态码 200
- **AND** 返回商品数组 Product[]，仅包含名称匹配 <keyword> 的商品（大小写不敏感的包含匹配）
- **AND** 结果 SHALL NOT 包含已下架（deleted）商品

#### Scenario: 搜索无结果
- @api
- **GIVEN** 系统中存在商品数据，但没有商品名称匹配 <keyword>
- **WHEN** 用户请求 GET /api/products?name=<keyword>
- **THEN** 返回状态码 200
- **AND** 返回空数组 Product[]

#### Scenario: 按分类过滤商品
- @api
- **GIVEN** 系统存在分类「键鼠外设」，其下有商品「极简机械键盘」「无线办公鼠标」
- **WHEN** 用户请求 GET /api/products?categoryId=cat-keyboard
- **THEN** 返回状态码 200
- **AND** 仅返回 categoryId 为 cat-keyboard 且 active 的商品

#### Scenario: 分类与名称搜索组合
- @api
- **GIVEN** 「桌面收纳」分类下存在「桌面收纳架」「铝合金笔记本支架」
- **WHEN** 用户请求 GET /api/products?categoryId=cat-desk&name=支架
- **THEN** 仅返回「桌面收纳」分类下名称含「支架」的 active 商品

## ADDED Requirements

### Requirement: 分类管理（CRUD + 软删除）
系统 SHALL 支持运营人员维护商品分类：分类字段为 `name`（必填）与 `sortOrder`（排序号）。系统 SHALL 支持新增、编辑、删除分类。删除 SHALL 为软删除（`status=deleted`），删除后该分类下所有商品的 `categoryId` SHALL 置空（变为未分类）。同名分类 SHALL 被拒绝。
- **Priority**: P0
- **Rationale**: 分类是商品目录的组织维度，软删除保留可追溯并避免破坏商品关联（R-CAT-001~004）。

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

### Requirement: 商品挂分类
系统 SHALL 支持商品关联分类：商品对象包含可选 `categoryId` 字段（null 表示未分类）。商品新增/修改时 SHALL 支持设置 `categoryId`（可空）；设置的分类必须存在（active），否则拒绝。
- **Priority**: P1
- **Rationale**: 分类必须落到商品上才有业务价值；未分类商品兼容存量数据（R-CAT-005）。

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
- **Process Alignment**: `L1-01` 触达与发现（C 端分类浏览/筛选）、`L1-02` 评估与决策（商品元数据含分类）
- **Service Blueprint**: `SB-STAGE-01`（分类浏览入口）、`SB-CUSTOMER-01`（商品栅格 + 分类筛选条）、`SB-OPS-01`（运营分类管理）、`SB-BACKSTAGE-01`（分类持久化接口）
- **实现版本**: Node.js（后端 API）＋ Frontend（B 端分类管理 + C 端筛选条）
