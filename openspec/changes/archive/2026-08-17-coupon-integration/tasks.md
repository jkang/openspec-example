## 1. Domain & Data Setup (Backend)

- [x] 1.1 在 Node.js 和 Python 中新增 `Coupon` 领域实体 (id, name, type, value, threshold, status) - 全部
- [x] 1.2 在 `Order` 实体中增加 `discountCents` 和 `couponId` 字段 - 全部
- [x] 1.3 初始化 Mock 优惠券数据（如：FLAT10, 满 5000 减 1000）- 全部

## 2. Core Service Logic (Node.js)

- [x] 2.1 在 Node.js `OrderService` 中注入优惠券校验逻辑 - Node.js
- [x] 2.2 实现优惠券门槛、有效期及 `UNUSED` status 校验 - Node.js
- [x] 2.3 在 `checkout` 过程中应用优惠券并计算最终金额 - Node.js
- [x] 2.4 实现核销逻辑，订单成功后将优惠券状态设为 `USED` - Node.js

## 3. Core Service Logic (Python)

- [x] 3.1 在 Python `OrderService` 中注入优惠券校验逻辑 - Python
- [x] 3.2 实现与 Node.js 对等的优惠券校验与金额计算逻辑 - Python
- [x] 3.3 在 `create_order` 流程中处理优惠券状态更新 - Python

## 4. API & Frontend Integration

- [x] 4.1 修改 `POST /api/checkout` 接口以接收可选的 `couponId` - 全部
- [x] 4.2 更新 Vue 前端 `App.vue` 中的 `checkout` 调用，发送 `selectedCouponId` - Frontend
- [x] 4.3 确保前端金额展示逻辑与后端 Mock 数据同步 - Frontend

## 5. Verification & Testing

- [x] 5.1 验证“未达门槛”场景：结算应返回错误并提示 - 全部
- [x] 5.2 验证“成功核销”场景：订单创建后，优惠券不可再次使用 - 全部
- [x] 5.3 跨端 E2E 验证：确保 Node.js 和 Python 后端均能正确处理前端请求 - 全部
