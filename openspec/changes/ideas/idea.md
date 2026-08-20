# 完善优惠券结算与运营落地探索 (idea.md)

## 1. 业务意图 (Business Intent)
将现有的单一满减优惠券系统升级为可实际运营的营销工具，支持折扣券、自动推荐最优惠算法及完整的退款闭环逻辑。

### 核心业务规则
- **新增优惠类型**: 支持 **折扣券 (PERCENTAGE)**，保留现有的固定金额减免 (FLAT)。
- **使用限制**: 同一订单 **仅限使用一张** 优惠券，严禁叠加使用。
- **智能推荐**: 结算系统需自动识别用户拥有的可用券，并 **推荐减免金额最高** 的最优券。
- **适用范围**: 现阶段保持 **全场通用**。
- **退款逻辑**: 暂不包含在本 Epic 中，已移入 Roadmap 下一阶段（Phase 3 - 订单生命周期与支付）。当前仅关注下单结算链路的正确性。
- **运营配置**: B 端管理后台需提供极简配置界面，支持定义规则（类型、数值、门槛）并手动发放给指定用户。

## 2. 业务设计思路 (Business Design Approach)

### C 端结算链路
1. **获取可用券**: 过滤出符合门槛 (minSpendCents) 且在有效期内的券。
2. **计算减免额**: 
   - FLAT: `min(orderTotal, discountValue)`
   - PERCENTAGE: `orderTotal * (discountPercentage / 100)` (结果需向下取整至 cent)
3. **最优选取**: 比较所有减免额，选取最大值。
4. **展示明细**: 结算页清晰展示：原价、优惠减免、实际应付。

### B 端管理链路
1. **规则定义**: 极简表单（优惠名称、类型选择、折扣值/金额、使用门槛）。
2. **发放动作**: 简单的“用户 ID + 优惠模板”关联操作。

## 3. 任务类型与策略 (Task Type & Strategy)
- **任务类型**: **Epic** (`epic-advanced-coupon-system`)
- **策略**: 涉及核心财务结算逻辑、B 端 UI 闭环及逆向交易流程（退款）。必须严格执行原型确认流程，确保 B 端配置界面符合“极简”审美。

## 4. 需求拆分 (Requirement Splitting)
1. **Story 1: 结算引擎升级**: 实现折扣券算法与“最优券”自动推荐逻辑。
2. **Story 2: B 端管理后台**: 实现极简的优惠券规则配置与手动发放功能。
3. **退款逻辑 (已移至 Roadmap 下一阶段)**: 后续将实现基于实付金额退款及优惠券回滚机制。

## 5. 架构影响与思路 (Architectural Impact & Ideas)
- **数据模型**: 需同步更新 [domain_model.html](file:///Users/superkkk/MyCoding/OpenSpec-practice/docs/baseline/domain_model.html) 中的 `Coupon Context` 状态、对象关系与 capability 映射，并在对应 capability spec 中补充约束：`type: 'FLAT' | 'PERCENTAGE'`, `value: number`, `status: 'UNUSED' | 'USED' | 'EXPIRED'`。
- **结算服务**: `SettlementService` 抽离核心计算逻辑，支持多策略计算。
- **订单追踪**: `Order` 实体必须持久化 `actualPaidCents` 和 `couponId`，用于退款校验。

## 6. 用户确认 (User Confirmation)
- [x] 折扣券计算是否需要设置“最高减免上限”？ -> 结论：暂不设置，折扣比例由后台配置。
- [x] B 端发放是否需要支持“批量发放”还是仅“单人发放”？ -> 结论：仅支持手动单人发放。

**结论**: 用户已确认核心逻辑。本项目被定义为 Epic，将拆分为三个 Story 分步实施。
