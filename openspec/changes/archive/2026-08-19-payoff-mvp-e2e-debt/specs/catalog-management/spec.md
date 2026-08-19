## MODIFIED Requirements

### Requirement: 商品列表查询

系统 SHALL 提供商品列表查询接口。返回的商品对象 SHALL 包含 `imageUrl` 字段以供前端展示。客户端可通过可选的 `name` 查询参数按名称模糊过滤商品；未提供 `name` 参数时，返回所有可用商品。

**Priority**: P0 (Critical)

**Rationale**: 确保前端能够获取并展示商品的视觉信息，这是提升专业感的基础。商品浏览是电商系统的核心入口功能，用户必须能够查看可购买的商品。

@e2e
#### Scenario: 获取所有商品（无过滤）

- **GIVEN** 系统中存在包含图片信息的商品数据
- **WHEN** 用户请求 GET /api/products（不带 name 参数）
- **THEN** 返回状态码 200
- **AND** 返回商品数组 Product[]，其中每个商品均包含 `imageUrl` 字段

@api
#### Scenario: 按名称模糊搜索

Given 系统中存在商品数据
When 用户请求 GET /api/products?name=<keyword>
Then 返回状态码 200
And 返回商品数组 Product[]，仅包含名称匹配 <keyword> 的商品（大小写不敏感的包含匹配）

@api
#### Scenario: 搜索无结果

Given 系统中存在商品数据，但没有商品名称匹配 <keyword>
When 用户请求 GET /api/products?name=<keyword>
Then 返回状态码 200
And 返回空数组 Product[]
