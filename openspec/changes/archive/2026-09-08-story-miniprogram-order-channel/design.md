# Design: story-miniprogram-order-channel

> 关联 proposal：`openspec/changes/story-miniprogram-order-channel/proposal.md`
> 关联需求侧：story.md（R-ORDCH-001~005 + E2E 旅程 1/2/3）/ 原型 `miniprogram-channel-admin.html`（订单管理「渠道」列，Epic 整体，已确认）
> 关联 specs：`specs/order-management/spec.md`（增量）、`specs/frontend-ui/spec.md`（增量）
> 依赖底座：Story 1（已归档）`miniprogram-channel` 渠道配置；Story 2（已归档）`wechat-auth`——会话带 `channel=MINIPROGRAM` 来源标记（`SessionRepo.create(userId, channel)`，R-WX-008）

## Context (上下文)

本 change 交付 **订单渠道来源（channel）**：`Order.channel` 字段（默认 WEB | MINIPROGRAM），下单从**会话来源继承**（服务端判定，防客户端伪造，Q7）；B 端订单管理列表展示「渠道」标识列（仅展示，不做筛选）；小程序订单发货/取消流程与网页单完全一致。本 change 是 Epic 6.1 末 Story，消费 Story 2 的会话 channel 标记。

**关键约束**：`Order` 为既有聚合（状态机/金额语义零改动）；channel 为创建时不可变属性；存量订单缺省 WEB（兼容）；Node.js 零第三方依赖；Python 不对齐（既有 order 冒烟——Node 权威实现 + 既有 Python 不做平行实现，差异显式记录）；前端 ZAPP 令牌对齐。

## Domain Boundary Impact (领域边界影响)

- **Order Context（修改）**：`Order` Aggregate 增加 `channel` 字段（`'WEB'` | `'MINIPROGRAM'`，默认 WEB）——沿用 `bc-order → cap-order` 既有 Governs 边（行 965），行为增量非新 taxonomy。
- **User Context（只读消费）**：会话 `channel` 来源（Story 2 wechat-auth 写入）被下单链路解析；`Session` 已扩展 channel（Story 2 完成）。
- **Channel Context / Shared（只读/修改）**：`frontend-ui` 横切支撑——订单列表渠道标识列。

## Process Delta (流程影响)

- 交易主流程状态机/金额语义**零改动**；仅下单创建时写入渠道来源属性 + B 端列表展示列。
- **L1-04 下单结算**：`Order.channel` 从会话来源解析写入（服务端判定）。
- **L1-06 履约与完成**：B 端订单列表渠道标识展示；发货/取消流程不受渠道影响。
- 不修改任何 L2/L3 规则节点进入/退出条件。

## Service Blueprint Sync Assessment (服务蓝图同步评估)

- **Needs Sync: No**（本 change 级；Epic 级需 Sync——理由如下）
- **触发项（Epic 级 Yes）**：分层 Sync 机制（Baseline Sync 在 Epic 全部 Story 归档后统一执行）。本 change 为 Epic 末 Story，Epic 完整交付后 `service_blueprint.html` 需更新：
  1. **SB-STAGE-04 / SB-CUSTOMER-04**（提交订单）：`Order.channel` 写入语义（会话来源）。
  2. **SB-OPS-***（B 端订单管理）：列表渠道标识列展示。
  3. **SB-CUSTOMER-06 / SB-BACKSTAGE-04**（订单回读）：渠道来源展示。
- **计划更新部位**：`docs/baseline/service_blueprint.html` 对应节点 activity/capability-desc。
- **Evidence Source**：proposal「Service Blueprint Alignment」、specs Governance Mapping。

## Domain Model Sync Assessment (领域模型同步评估)

- **Needs Sync: No**（本 change 级；Epic 级需 Sync——理由如下）
- **触发项（Epic 级 Yes）**：分层 Sync（Epic 全部 Story 归档后统一执行 `domain_model.html`）：
  1. **Order Aggregate 增加 `channel` 字段**（行 751 order 节点 meta 补充：status/totalCents/actualPaidCents/couponId/userId/**channel**；desc 补充渠道来源）。
  2. **Channel Context BC + `miniprogram-channel` capability**（Story 1 声明，Epic 级统一回流：bc-channel 节点 + cap-miniprogram-channel + Governs 边）。
  3. **User Context `wechat-auth` capability + User.openid**（Story 2 声明，Epic 级统一回流：cap-wechat-auth 节点 + Governs 边 + User 字段）。
  4. **Session 字段 channel**（Story 2 已扩展，Epic 级统一标注）。
- **计划更新部位**：`docs/baseline/domain_model.html` mappingGraph nodes/edges、aggregate meta/invariant、policies。
- **Evidence Source**：proposal「Impacted Bounded Contexts」、specs Governance Mapping。

## 关键设计决策

1. **会话渠道来源解析（Q7，服务端判定）**：HTTP 层下单路由（`POST /api/orders` 与 `POST /api/checkout`）用 `requireSession` 已解析用户；本 change 需额外读取会话对象的 `channel`——新增 `sessionRepo.findByToken` 已存在（`AuthService.getSessionUser` 内部用），为读取 channel 在路由侧直接 `sessionRepo.findByToken(token)` 取 `session.channel || 'WEB'`，传入 `orderService.createOrder(userId, couponId, channel)`。**不信任客户端 body.channel（防伪造）**。
2. **OrderService 扩展**：`createOrder(userId, couponId = null, channel = 'WEB')` / `checkout(userId, couponId, channel)`——订单对象增加 `channel`（缺省 WEB，存量兼容）；既有调用（支付/测试/内部）不传 → WEB。
3. **渠道不可变**：channel 仅在创建时写入；状态机流转（cancel/ship/complete）不动 channel（R-ORDCH-005）。
4. **B 端展示**：`GET /api/admin/orders` 响应已含完整 order 对象（含 channel）→ 前端直接渲染；存量无 channel → 视为 'WEB'（列表展示「网页」）。
5. **Python 不对齐**：Python 后端无渠道订单场景（覆盖既有冒烟），以 Node.js 权威实现。
6. **前端**：订单列表 thead 增加「渠道」列（`filteredAdminOrders` 行内渲染徽标：MINIPROGRAM → electric「小程序」/ WEB → muted「网页」）；colspan 由 6 → 7。

## 目录结构变更（Node.js）

```
ecommerce/ecommerce-mini/
├── src/domain/types.js               # [MOD] Order 增加 channel 字段（默认 WEB）
├── src/services/order.js             # [MOD] createOrder/checkout 增加 channel 参数，写入订单
├── src/http/server.js                # [MOD] POST /api/orders + /api/checkout：从会话解析 channel（防伪造）
ecommerce/ecommerce-mini/data/orders.json        # 运行时结构扩展（存量缺省 WEB 兼容）
ecommerce/ecommerce-mini-frontend/src/App.vue    # [MOD] 订单列表「渠道」标识列
```
