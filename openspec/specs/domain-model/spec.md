# Domain Model Specification

## Purpose

核心业务实体定义，不依赖任何外部框架。本规范定义商品、用户、购物车、订单等领域模型的结构与约束，作为所有上层能力的数据基础。

## Requirements

### Requirement: 商品实体定义

系统 SHALL 定义商品实体，包含唯一标识、名称、价格、库存以及商品图片链接。

**Priority**: P0 (Critical)

**Rationale**: 商品图片是现代电商展示的核心要素，必须在领域模型层级进行支持。

#### Scenario: 创建有效商品

- **GIVEN** 需要创建新商品
- **WHEN** 提供商品信息 { id, name, priceCents, stock, imageUrl }
- **THEN** 商品实体创建成功
- **AND** id 格式为 prod_xxxx
- **AND** priceCents >= 0
- **AND** stock >= 0
- **AND** imageUrl 必须是有效的 URL 字符串

---

### Requirement: 用户实体定义

系统 SHALL 定义用户实体，包含唯一标识、邮箱和名称。

**Priority**: P1 (High)

**Rationale**: 用户是订单和购物车的所有者，是身份识别的基础。

#### Scenario: 创建有效用户

Given 需要创建新用户
When 提供用户信息 { id, email, name }
Then 用户实体创建成功
And id 格式为 user_xxxx

---

### Requirement: 购物车实体定义

系统 SHALL 定义购物车实体，关联用户和购物车条目列表。

**Priority**: P0 (Critical)

**Rationale**: 购物车是用户选择商品的临时存储，是下单流程的前置依赖。

#### Scenario: 创建购物车

Given 用户需要购物
When 创建购物车
Then 购物车包含 userId 和 items 数组
And 每个条目包含 { id, productId, quantity }

---

### Requirement: 订单实体定义

系统 SHALL 定义订单实体，包含唯一标识、用户关联、状态、总价、折扣金额、实付金额、已应用的优惠券 ID 和订单条目。

**Priority**: P0 (Critical)

**Rationale**: 订单是交易的核心单据，必须完整记录财务信息。

#### Scenario: 创建有效订单

- @unit
- **GIVEN** 需要创建订单
- **WHEN** 提供订单信息 { id, userId, status, totalCents, discountCents, actualPaidCents, couponId, items }
- **THEN** 订单实体创建成功
- **AND** id 格式为 order_xxxx
- **AND** status 为 PENDING_PAYMENT 或 PAID
- **AND** totalCents >= 0
- **AND** actualPaidCents = totalCents - discountCents
- **AND** actualPaidCents >= 0

---

### Requirement: 优惠券实体定义
系统 SHALL 定义优惠券实体，包含唯一标识、名称、类型、数值、使用门槛和状态。
- **Priority**: P0
- **Rationale**: 为营销结算提供数据基础。

#### Scenario: 创建有效折扣券
- @unit
- **GIVEN** 需要创建 PERCENTAGE 类型的优惠券
- **WHEN** 提供信息 { id, name, type: 'PERCENTAGE', value: 9, minSpendCents: 10000, status: 'UNUSED' }
- **THEN** 实体创建成功
- **AND** value 表示折扣比例 (如 9 表示 9 折)
- **AND** minSpendCents 表示使用门槛 (分)

---

### Requirement: 订单条目实体定义

系统 SHALL 定义订单条目实体，记录下单时的商品快照信息。

**Priority**: P1 (High)

**Rationale**: 订单条目保存下单时刻的价格快照，确保历史订单数据不受商品价格变动影响。

#### Scenario: 创建订单条目

Given 需要记录订单商品信息
When 提供条目信息 { productId, priceCents, quantity }
Then 条目记录商品 ID、下单时单价和购买数量

## Governance Mapping

- **Bounded Context**: Shared / Cross（`domain_model.html` BC → Capability 映射表：`bc-shared → cap-domain`）
- **Capability Taxonomy**: `domain-model`（复用既有映射，无新增 taxonomy）
- **Process Alignment**: 横切支撑：共享领域对象结构定义（覆盖全部 L1-L3 节点）
- **Service Blueprint**: 横切支撑：全部 SB-STAGE-*（共享领域模型）
- **实现版本**: Node.js / Python（共享类型与领域定义）
