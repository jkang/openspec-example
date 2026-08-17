# Idea: 结算时支持使用优惠券

## 1. 业务意图 (Business Intent)
支持用户在结算流程中使用优惠券进行金额抵扣，提升用户体验和转化。

### 核心业务规则
- **优惠券类型**：仅支持“固定金额减免”（例如：满 100 减 20）。
- **使用限制**：
    - **门槛校验**：订单商品总额必须达到优惠券指定的门槛金额（threshold）才可以使用。
    - **排他性**：每笔订单仅限使用一张优惠券，不支持叠加。
- **核销时机**：
    - 用户点击“完成结算”时，系统验证优惠券有效性并锁定。
    - 订单创建成功后，该优惠券状态标记为“已使用”。
    - 若结算流程失败（如库存不足），优惠券应释放回“未使用”状态。

## 2. 业务设计思路 (Business Design)
- **校验逻辑**：采用“后端为准”的校验原则。前端负责实时展示优惠效果，后端在 `checkout` 时进行二次强制校验。
- **状态管理**：优惠券实体需要包含 `status` 字段（UNUSED, USED）。
- **价格模型**：所有金额计算均以“分”为单位（cents），确保计算精度。

## 3. 需求拆分建议 (Requirement Splitting)
1. **基础数据模型**：在 Node.js 和 Python 后端增加 `Coupon` 实体及 Mock 数据（如：`FLAT10`, `threshold: 5000, value: 1000`）。
2. **结算逻辑增强**：修改 `OrderService.checkout` 接口，接收 `couponId`，执行校验并计算 `discountCents`。
3. **前端交互集成**：在 Vue 前端的结算请求中携带选中的优惠券 ID。

## 4. 架构影响 (Architectural Impact)
- **Domain**: 
    - `Coupon`: `{ id, name, type: 'FIXED', valueCents, thresholdCents, status }`
    - `Order`: 增加 `couponId`, `discountCents`, `finalTotalCents`
- **Service**: `OrderService` 需注入 `CouponService` 或直接访问 `CouponRepo`。
- **API**: `POST /api/checkout` 增加可选参数 `couponId`。

## 5. 关键目标 (Key Goals)
- [ ] 后端支持满减优惠券的合规性检查
- [ ] 订单详情中正确记录折扣金额
- [ ] 前后端全链路打通优惠券核销流程
