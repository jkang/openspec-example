# Catalog Management Specification

## Overview

商品目录管理能力，涵盖商品的查询、上架与库存管理。商品是电商系统的核心资源，所有交易流程均以商品数据为基础。

## Requirements

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
