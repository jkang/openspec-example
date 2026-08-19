# Domain Model 基线 (Event-Storming 视角)

## Purpose
基于 DDD 与 Event-Storming 描述系统领域模型，包括关键事件、命令、策略与上下文关系。

## 1. Event Storming 全景

### 关键 Domain Events (领域事件)
- `ProductCreated`: 商品已创建
- `ItemAddedToCart`: 商品已加入购物车
- `CouponApplied`: 优惠券已应用
- `OrderPlaced`: 订单已提交
- `PaymentConfirmed`: 支付已确认

### 核心 Commands (指令)
- `CreateProduct`: 创建商品
- `AddToCart`: 加入购物车
- `ApplyCoupon`: 使用优惠券
- `PlaceOrder`: 提交订单

## 2. Bounded Contexts (限额上下文)

- **Catalog (商品目录)**: 负责商品信息与库存状态。
- **Cart (购物车)**: 负责用户挑选过程的临时存储。
- **Order (订单)**: 交易核心，负责状态流转与财务结算。
- **Coupon (优惠券)**: 营销引擎，负责规则校验与减免计算。

## 3. 核心 Aggregate 与 Entity

### Order Aggregate
- **Root Entity**: Order (id, status, actualPaidCents)
- **Entities**: OrderItem (productId, priceCents, quantity)
- **Value Objects**: Price (amount, currency)

### Catalog Aggregate
- **Root Entity**: Product (id, name, priceCents, stock)

---
*Last Updated: 2026-08-19*
