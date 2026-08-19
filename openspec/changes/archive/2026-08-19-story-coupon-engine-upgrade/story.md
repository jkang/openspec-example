# Story: 智能结算引擎升级 (story-coupon-engine-upgrade)

## 用户场景
- **目标用户**: 电商买家与后台运营人员。
- **使用动机**: 买家希望下单时能自动享受最大优惠，无需手动比对多张券；运营人员希望通过设置折扣率（如9折）来灵活开展促销活动。
- **关键目标**: 实现下单链路的自动化最优优惠计算，确保财务结算精准且提升买家体验。

## 范围
### In Scope
- 折扣券 (PERCENTAGE) 的结算算法。
- 订单结算时的智能最优券推荐（单张使用，不叠加）。
- 订单持久化实付金额 (`actualPaidCents`) 和优惠券 ID (`couponId`)。
- C 端结算页面的优惠展示与确认。

### Out of Scope
- 退款时的优惠券回滚与金额分摊（已移至 Roadmap Phase 3）。
- 优惠券的自动领取逻辑。
- 多券叠加使用。

## 原型参考 (Prototype Reference)
- **原型链接**: [coupon-management.html](file:///Users/superkkk/MyCoding/OpenSpec-practice/openspec/changes/story-coupon-engine-upgrade/prototypes/coupon-management.html)
- **关键交互点**:
  - 页面加载后自动计算并高亮“当前最优”优惠券。
  - 用户可手动切换其他可用券，结算金额实时刷新。
  - 结算栏清晰展示：原价、优惠减免（- ¥XXX）、实际支付金额。

## 业务规则
| 规则ID | 规则描述 | 触发条件 | 期望结果 | 备注 |
| --- | --- | --- | --- | --- |
| R-COUPON-001 | 优惠不可叠加 | 用户持有并尝试应用多张优惠券 | 系统仅应用一张优惠券，且推荐金额最大者 | 核心硬性约束 |
| R-COUPON-002 | 折扣计算精确性 | 应用 PERCENTAGE 类型的折扣券 | 折扣金额 = 订单总额 * (1 - 折扣率/100)，结果向下取整至 cent | 使用 `priceCents` 确保无精度丢失 |
| R-COUPON-003 | 最优券自动推荐 | 进入结算页且用户持有可用券 | 系统自动选取减免金额最大的券并默认选中 | 若减免金额相同，则按过期时间或 ID 排序选取 |
| R-ORDER-001 | 财务字段持久化 | 订单创建成功 | 数据库记录实付金额 `actualPaidCents` 和 `couponId` | 为后续退款提供依据 |

## 验收标准 (E2E 用户旅程)

### 旅程 1：智能结算与最优推荐
#### 场景：系统自动推荐减免额最高的折扣券
- @e2e
- **GIVEN** 用户购物车内有 ¥15,548.00 的商品
- **GIVEN** 用户持有一张“满 1000 减 100”的满减券和一张“9折”折扣券
- **WHEN** 用户进入结算确认页面
- **THEN** 系统应自动计算：满减券减 ¥100，9折券减 ¥1,554.80
- **THEN** 系统应自动选中“9折券”，并展示实际支付金额为 ¥13,993.20
- **THEN** 结算页应显示“已自动选择最优方案”提示

#### 场景：用户手动切换优惠券
- @e2e
- **GIVEN** 承接上述“9折券”已自动选中的状态
- **WHEN** 用户点击手动切换为“满 1000 减 100”券
- **THEN** 实际支付金额应实时刷新为 ¥15,448.00
- **THEN** “当前最优”标记应消失，但用户仍可继续操作

## 关联规格入口
- [ ] [proposal.md](file:///Users/superkkk/MyCoding/OpenSpec-practice/openspec/changes/story-coupon-engine-upgrade/proposal.md)
- [ ] specs/coupon-management/spec.md
- [ ] specs/order-management/spec.md
