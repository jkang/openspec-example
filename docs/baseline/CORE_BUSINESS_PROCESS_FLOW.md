# Core Business Process Flow 基线

## Purpose
描述跨角色、跨模块的核心业务流程与状态流转逻辑。

## 核心流程定义

### 1. 交易订单流转图 (Order Lifecycle)
```mermaid
graph TD
    A[购物车结算] --> B{有无优惠?}
    B -->|有| C[应用最优券]
    B -->|无| D[直接计算总价]
    C --> E[生成 PENDING 订单]
    D --> E[生成 PENDING 订单]
    E --> F[模拟支付确认]
    F --> G[状态变更为 PAID]
    G --> H[扣减商品库存]
```

### 2. 优惠券生命周期 (Coupon Lifecycle)
- **Draft**: 后台创建，尚未生效
- **Active**: 已发布，用户可领取
- **Used**: 用户已核销，关联具体订单
- **Expired**: 超过有效期，不可使用

---
*Last Updated: 2026-08-19*
