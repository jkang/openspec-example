# product-query Specification

## Purpose
TBD - created by archiving change add-product-get-by-id. Update Purpose after archive.
## Requirements
### Requirement: 按 ID 查询单个商品

系统 SHALL 提供按商品 ID 查询单个商品详情的接口。返回的信息 SHALL 包含 `imageUrl`。客户端通过 GET 请求指定商品 ID，系统返回该商品的完整信息（id、name、priceCents、stock、imageUrl），若商品不存在则返回 404 错误。

**Priority**: P0

**Rationale**: 确保在查看商品详情时能够展示其对应的图片。RESTful API 的基本操作，前端商品详情页、购物车校验、订单创建等场景均需要此接口。

#### Scenario: 查询存在的商品

- **WHEN** 客户端发送 `GET /api/products/{id}`，且该 ID 对应的商品存在
- **THEN** 系统返回 200 状态码及该商品的完整 JSON 对象（id、name、priceCents, stock, imageUrl）

#### Scenario: 查询不存在的商品
- **WHEN** 客户端发送 `GET /api/products/{id}`，且该 ID 对应的商品不存在
- **THEN** 系统返回 404 状态码及错误信息 `{"code": "NOT_FOUND", "message": "Product not found"}`


## Governance Mapping

- **Bounded Context**: Catalog Context（`domain_model.html` BC → Capability 映射表：`bc-catalog → cap-prodquery`）
- **Capability Taxonomy**: `product-query`（复用既有映射，无新增 taxonomy）
- **Process Alignment**: L1-01 触达与发现；L1-02 评估与决策（搜索与详情查询支撑）
- **Service Blueprint**: SB-STAGE-01（触达与发现）、SB-STAGE-02（选购与加购）、SB-CUSTOMER-01/02
- **实现版本**: Node.js / Python（后端 API）＋ Frontend（商品详情）
