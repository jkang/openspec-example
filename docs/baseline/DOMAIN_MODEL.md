# Domain Model 基线 (Event-Storming 视角)

## Purpose
基于 DDD 与 Event-Storming 描述系统领域模型，包括关键事件、命令、策略与上下文关系。

## 1. Event Storming 全景

### 关键 Domain Events (领域事件)
- `ProductCreated`: 商品已创建
- `ProductSearched`: 执行了商品搜索
- `ItemAddedToCart`: 商品已加入购物车
- `CartValidated`: 购物车用户一致性校验通过
- `CouponApplied`: 优惠券已应用（含满减与折扣类型）
- `OrderPlaced`: 订单已提交
- `PaymentConfirmed`: 模拟支付已确认

### 核心 Commands (指令)
- `SearchProduct`: 搜索商品
- `AddToCart`: 加入购物车
- `ApplyBestCoupon`: 自动应用最优优惠券
- `PlaceOrder`: 提交订单结算

## 2. Bounded Contexts (限额上下文)

- **Catalog (商品目录)**: 负责商品元数据、搜索索引与库存原子操作。
- **Cart (购物车)**: 负责用户选购状态，需保证与 Session 用户一致。
- **Order (订单)**: 交易核心，负责订单生命周期、财务精度计算 (`priceCents`)。
- **Coupon (优惠券)**: 营销引擎，支持 `FLAT` (满减) 与 `PERCENTAGE` (折扣) 策略。

## 3. 核心 Aggregate 与 Entity

### Order Aggregate
- **Root Entity**: Order (id, status, totalCents, actualPaidCents, couponId)
- **Entities**: OrderItem (productId, priceCents, quantity)
- **Value Objects**: FinancialPrecision (含浮点数补偿逻辑)

### Coupon Aggregate
- **Root Entity**: Coupon (id, type: FLAT/PERCENTAGE, value, minSpendCents)

### Catalog Aggregate
- **Root Entity**: Product (id, name, priceCents, stock)

---
*Last Updated: 2026-08-19*
