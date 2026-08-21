# Idea: B 端极简运营后台 (story-coupon-admin-panel)

> 来源：Epic `advanced-coupon-system` 拆分出的 Story 2。Epic 级探索结论见 `openspec/changes/ideas/idea.md`，本文件仅记录该 Story 的scoped 探索结论。

## 1. 澄清业务意图

结算引擎升级（Story 1）已让 C 端具备 FLAT / PERCENTAGE 券的计算与最优推荐能力，但运营侧仍没有任何入口去创建券规则和把券发到用户手上。当前可用券数据只能依赖预设种子数据，营销能力无法真实落地。

本 Story 的业务意图：为运营提供一个**极简** B 端后台，完成两件事：
- **券规则配置**：定义优惠券名称、类型（FLAT / PERCENTAGE）、折扣值 / 金额、使用门槛（minSpendCents）与有效期。
- **手动单人发券**：将已配置的券发放给指定 userId（Epic 探索已确认：仅单人发放，不做批量）。

## 2. Roadmap Alignment

- 对齐 Epic `advanced-coupon-system`（完善优惠券结算与运营落地）的第二个拆分项。
- 退款逻辑已明确移至 Roadmap 下一阶段（Phase 3 - 订单生命周期与支付），不在本 Story 范围。
- 本 Story 交付后，优惠券链路形成“运营配置 → 发放 → C 端结算核销”的完整闭环。

## 3. 业务设计思路

- **复用既有生命周期**：券的创建/发布对应 Domain Model 中 Coupon 状态机的 `DRAFT → ACTIVE (CouponPublished)`；后台不产生新的状态语义，只提供触发入口。
- **全场通用**：适用范围保持 Epic 结论，不做商品级 / 品类级适用范围配置。
- **发放即归属**：发券动作建立 Coupon 与 userId 的持有关系，该关系是结算时“识别候选券”（L3-01）的输入来源。
- **极简 UI**：遵循 `docs/FRONTEND.md` 极简约束（无圆角、slate 色系、真实数据），以单文件 HTML 原型先行确认视觉与交互。

## 4. 任务类型与后续策略

- **任务类型**：Story（含 UI 变更）
- **策略**：
  - 必须走 `/opsx:prototype` 生成 B 端后台交互原型，经 HITL 确认后再进入 `/opsx:Story` 业务评审。
  - 修改 `specs/coupon-management`（新增券规则配置与单人发放需求）与 `specs/frontend-ui`（新增 B 端后台页面规范）。
  - 实现覆盖 Node.js / Python / Frontend 三端。

## 5. 需求拆分建议

1. **券规则配置**：创建券（名称、类型、值、门槛、有效期），创建后即生效（ACTIVE），可被发放与推荐。
2. **手动单人发券**：输入 userId + 选择券，建立持有关系；重复发放与非法 userId 需有明确反馈。
3. **后台入口与列表**：极简列表展示已配置券（类型、值、门槛、有效期、已发放量），作为配置与发放的入口页。

## 6. 架构影响分析

- **Bounded Context**：主影响 `Coupon Context`（券定义与发放归属）；`frontend-ui` 属 Shared / Cross 横切支撑。无新增 BC → Capability 映射。
- **后端**：Node.js / Python 各自新增 admin 端点（券规则创建、列表、单人发放），落在 Service → Domain → Repo 四层结构内，不改动结算引擎逻辑。
- **领域模型**：发放动作补充 Coupon 的用户归属语义，后续 `/opsx:sync` 时需评估是否在 `domain_model.html` 的 Coupon 聚合与 SB-OPS-03 节点回流该语义。
- **服务蓝图**：主要命中 `SB-OPS-03`（运营配置活动获得实际支撑）与 `SB-BACKSTAGE-03`（新增券定义持久化与发放接口活动），不改变阶段与泳道结构。

## 7. 确认结论

- [x] 批量发放 vs 单人发放 → Epic 探索已确认：**仅手动单人发放**。
- [x] 折扣券是否设最高减免上限 → Epic 探索已确认：**暂不设置**，比例由后台配置。
- [x] 适用范围 → **全场通用**，不做商品级配置。
- [x] Story 范围边界 → 仅“规则配置 + 单人发券 + 入口列表”，不含数据报表与券的停用/删除。
