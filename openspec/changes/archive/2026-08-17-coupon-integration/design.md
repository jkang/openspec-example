## Context

目前电商系统在结算时仅支持基础的商品总额计算。为了提升营销能力，需要在 Node.js 和 Python 后端引入优惠券核销逻辑，并与 Vue 前端打通。系统采用分层架构，所有金额计算均以“分”为单位。

## Goals / Non-Goals

**Goals:**
- 实现“固定金额减免”类型的优惠券核销逻辑。
- 确保后端对优惠券门槛、有效期和状态的强制校验。
- 在订单中持久化折扣金额和所选优惠券 ID。
- 实现结算失败时的优惠券回滚机制。

**Non-Goals:**
- 不支持百分比折扣、免邮券等复杂类型（本阶段仅限 FIXED）。
- 不支持多券叠加使用。
- 不涉及优惠券的后台管理界面（如新增、编辑券模板）。

## Decisions

### 1. 优惠券校验逻辑的权威位置
- **决策**: 后端 `OrderService` 在 `checkout` 时执行权威校验。
- **理由**: 前端 UI 的计算仅用于交互优化，不能作为安全凭据。后端必须基于数据库/内存中的真实优惠券数据重新计算。
- **替代方案**: 在前端计算并直接传递折扣金额（不安全，易受篡改）。

### 2. 优惠券状态锁定与核销
- **决策**: 采用“两步式”核销。在 `OrderService.createOrder` 过程中进行校验并记录，随订单保存原子化完成状态更新。
- **理由**: 确保优惠券的使用与订单创建的事务一致性。
- **替代方案**: 先核销优惠券再创建订单（若订单创建失败，需复杂的回滚逻辑）。

### 3. 数据模型扩展
- **决策**: 在 `Order` 领域模型中增加 `discountCents` 和 `couponId` 字段。
- **理由**: 审计需求要求能够追溯订单的折扣来源和具体减免金额。

## 架构图

```text
[Frontend: App.vue]
      │
      │ 1. POST /api/checkout { userId, couponId }
      ▼
[API Layer: server.js / server.py]
      │
      │ 2. 调用 checkout(userId, couponId)
      ▼
[Service Layer: OrderService] ◄────注入──── [CouponService / Repo]
      │                                       │
      │ 3. verify(couponId, totalAmount) ─────┘
      │ 4. 计算 discountCents
      │ 5. 创建 Order { ..., discountCents, couponId }
      ▼
[Repository Layer: OrderRepo / CouponRepo]
      │
      │ 6. 保存 Order 并更新 Coupon 状态为 USED
      ▼
[Success Response]
```

## Risks / Trade-offs

- **[Risk]** 后端 Mock 数据与前端硬编码数据不一致。 → **Mitigation**: 在 `design.md` 中明确 Mock 数据规格，并在任务清单中要求同步更新。
- **[Risk]** 并发请求导致同一张券被多次使用。 → **Mitigation**: 后端在 `USED` 状态检查时增加原子性判断（在内存 Repo 中使用简单的状态检查）。
