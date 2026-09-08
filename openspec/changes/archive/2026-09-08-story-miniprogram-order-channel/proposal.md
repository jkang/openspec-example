# Proposal: 订单渠道标识（channel）（story-miniprogram-order-channel）

> 来源：需求侧 handoff（`/req:handoff`），业务评审依据：`openspec-requirements/epics/epic-miniprogram-channel/stories/story-miniprogram-order-channel/story.md`（已 HITL 确认，用户授权全程自主）。
> Epic：`epic-miniprogram-channel`（Phase 6 Epic 6.1 · P1，依赖 `story-miniprogram-wechat-login` MINIPROGRAM 会话底座 + `story-miniprogram-channel-config` 渠道启用）；本提案由需求侧 story.md + idea.md 合成，开发侧不重复探索/评审。

## Why (背景原因)

微信小程序与网页共享同一订单池后，客户打电话问单时运营需要**一眼看出这单是微信里下的还是网页下的**（微信客户可回原聊天、网页客户走电话/客服）；但处理动作（发货/取消/查询）必须完全一致。本变更交付 **订单渠道来源记录与 B 端展示**：`Order.channel` 从会话来源继承写入（防客户端伪造），B 端订单列表展示渠道标识列，处理流程与网页单一致。

## What Changes (变更内容)

- **`Order.channel` 字段（R-ORDCH-001）**：`'WEB'`（默认）| `'MINIPROGRAM'`；创建时写入的不可变属性；存量订单缺省视为 WEB（兼容迁移）。
- **渠道写入口径（R-ORDCH-002，Q7）**：下单时从**会话来源**继承——wechat-auth（Story 2）创建的 MINIPROGRAM 会话下单 → `channel=MINIPROGRAM`；网页登录会话 → `WEB`。**服务端判定，不信任客户端传参（防伪造，R-ORDCH-006 验证场景）**。
- **B 端订单管理渠道标识列（R-ORDCH-003）**：列表新增「渠道」列（小程序 / 网页徽标），**仅展示**（不做筛选/统计，Q7）。
- **处理流程一致（R-ORDCH-004）**：小程序订单发货/取消/查询与网页单完全一致（不因渠道分流）。
- **渠道不变性（R-ORDCH-005）**：channel 随订单全生命周期保持，不随状态流转变化。

### Out of Scope（本 change 不实现）

- 渠道配置读写（story-miniprogram-channel-config）；微信授权登录/手机号绑定（story-miniprogram-wechat-login）。
- 按渠道筛选/统计/报表（MVP 不做，Q7；可视后续增补）。
- 小程序购物旅程 UI 与下单链路（Epic 6.2 消费 channel 语义）；C 端展示渠道来源。

## Capabilities (系统能力)

### New Capabilities

- 无新增 taxonomy（`wechat-auth` / `miniprogram-channel` 已由 Story 1/2 建立）。

### Modified Capabilities

- **`order-management`（修改，Order Context）**：`Order` Aggregate 增加 `channel` 字段（会话来源继承写入）+ B 端订单列表渠道标识展示；复用 `openspec/specs/order-management/spec.md` 路径。更新 `specs/order-management/spec.md`（追加 Requirement）。
- **`frontend-ui`（修改，横切支撑）**：`bc-shared → cap-ui`——B 端订单管理列表「渠道」标识列渲染；更新 `specs/frontend-ui/spec.md`。

### 只读消费（不修改语义）

- `wechat-auth`（会话来源渠道标记，Story 2 底座）、`user-session`（会话渠道来源解析）。

## Impacted Bounded Contexts

- **`Order Context`（修改）**：`Order.channel` 字段 + B 端标识展示（`bc-order → cap-order` 既有 Governs 边行 965，行为增量）。
- **`User Context` / `Channel Context`（只读消费）**：会话来源渠道判定来源。
- **`Shared / Cross`（修改）**：`frontend-ui` 渠道标识列。

## Process Alignment (流程对齐)

| 流程节点 | 关联说明 |
| --- | --- |
| `L1-04 下单结算` | 订单渠道来源写入（会话继承，服务端判定） |
| `L1-06 履约与完成` | B 端订单管理渠道标识展示；发货/取消流程不受渠道影响 |

## Service Blueprint Alignment (服务蓝图对齐)

| 蓝图节点 | 动作类型 | 说明 |
| --- | --- | --- |
| `SB-STAGE-04` | MOD | 提交订单：Order.channel 写入 |
| `SB-CUSTOMER-04` | MOD | 下单归属：渠道标识随订单落库 |
| `SB-OPS-*` | MOD | B 端订单列表渠道标识列展示 |
| `SB-CUSTOMER-06` / `SB-BACKSTAGE-04` | MOD | 订单回读展示渠道来源 |

## Impact (影响面)

- **后端服务（Node.js）**：`Order` 模型增 `channel` 字段（types.js / order 服务 / 持久化 JSON，存量兼容缺省 WEB）；下单链路从会话解析渠道来源（wechat-auth 会话 → MINIPROGRAM）；B 端订单列表响应携带 `channel`；无新路由（复用 `GET /api/admin/orders` 与下单 API）。**零第三方依赖**。
- **Python 后端**：**不对齐**（无订单渠道能力场景——Python 覆盖既有 catalog/cart/order/coupon 冒烟范围，以 Node.js 为权威实现）。
- **前端 UI（Vue）**：B 端订单管理列表新增「渠道」列（小程序 electric 徽标 / 网页 muted 徽标）；ZAPP 令牌、无圆角无阴影、真实中文数据。
- **数据模型**：`Order` + `channel`（默认 WEB）；`orders.json` 结构扩展（存量兼容）。
- **跨域/同步**：无新增跨域。
- **测试影响**：新增 E2E 旅程（MINIPROGRAM 会话下单带标识 / WEB 默认 / B 端列表展示 / 小程序订单发货一致 / 存量兼容 / 防伪造传参）。

## 需求侧回链

- story.md：`openspec-requirements/epics/epic-miniprogram-channel/stories/story-miniprogram-order-channel/story.md`
