# Proposal: 小程序渠道配置（B 端）（story-miniprogram-channel-config）

> 来源：需求侧 handoff（`/req:handoff`），业务评审依据：`openspec-requirements/epics/epic-miniprogram-channel/stories/story-miniprogram-channel-config/story.md`（已 HITL 确认，用户授权全程自主）。
> Epic：`epic-miniprogram-channel`（Phase 6 Epic 6.1 · P0，依赖链根）；本提案由需求侧 story.md + idea.md 合成，开发侧不重复探索/评审。

## Why (背景原因)

贸易型中小企业的买家活跃于微信，网页下单门槛高致订单流失。把"生意搬进微信"的第一步是渠道必须先"立起来、可看见、能停用"：运营要能安全录入微信凭证（appsecret 敏感）、随时关停渠道；老板要能确认渠道真实可用再让客户使用（避免资质未办成误导下单）。本变更交付 **B 端小程序渠道配置**（appid / appsecret 脱敏 / 商户号纯预留 / 启用状态），作为 Epic 6.1 依赖链根（wechat-login / order-channel 的渠道底座）。

## What Changes (变更内容)

- **渠道配置 API（后端，Node.js 权威实现，新增）**：
  - `GET /api/admin/channel/miniprogram`（读，返回脱敏配置：appid / `appsecretConfigured` / 商户号 / 启用状态）。
  - `PUT /api/admin/channel/miniprogram`（写，保存 appid / appsecret / 商户号 / 启用状态）。
  - **AppSecret 脱敏回显（R-CHN-004，Q4）**：保存后不读回明文，仅返回掩码（前 4 + 掩码 + 后 4）+ `configured=true`。
  - **商户号纯配置预留（R-CHN-005，Q3）**：不校验资质、不参与支付、不接真实回调。
  - 落盘 `data/channel-config.json`（R-CHN-006），保存即时生效。
- **权限门禁（R-CHN-001~003）**：写操作仅 `role=运营`（扩展 R-ADM 门禁家族，复用 `requireRole('运营')` 白名单基建）；`role=老板` 只读（GET）；`客户/客服/未登录` 401/403。
- **启用状态生命周期（R-CHN-007~009，Q5）**：渠道停用 → 小程序登录入口隐藏 + 新微信登录拒绝 `CHANNEL_DISABLED`；**既有会话不受影响**；未配置默认停用。
- **B 端渠道配置视图（Vue）**：对齐原型 `miniprogram-channel-admin.html`——渠道配置表单（AppID / AppSecret 脱敏「重新配置」/ 商户号 / 启用开关）+ 角色区分（运营可写 / 老板只读「纯只读 · 无配置入口」）+ 保存即时生效反馈。

### Out of Scope（本 change 不实现）

- 微信授权登录 / 手机号绑定（story-miniprogram-wechat-login）。
- 订单渠道标识（story-miniprogram-order-channel）。
- 真实微信支付（商户资质/证书/回调，交付后 +X 评估；商户号仅字段预留）。
- unionid / 开放平台绑定（Q10 不引入）；多小程序/多商户支持。

## Capabilities (系统能力)

### New Capabilities

- **`miniprogram-channel`（新增 taxonomy）**：B 端小程序渠道配置——AppID / AppSecret（脱敏回显）/ 商户号（纯预留）/ 启用状态；写权限仅运营（扩展 R-ADM 门禁家族）；落盘即时生效；停用拒绝新登录。
  - **理由（新增标注）**：ROADMAP Phase 6 Guardrails 明确"新增 `Channel Context`（B 端渠道配置）BC 与 `miniprogram-channel` capability"；`docs/baseline/domain_model.html` 当前无此 capability（bc-* 清单含 cart/catalog/coupon/data-insights/order/shared/user，无 channel）——需在 Epic 归档后 Baseline Sync 时落位 `bc-channel → cap-miniprogram-channel`。

### Modified Capabilities

- **`frontend-ui`（修改，横切支撑）**：`bc-shared → cap-ui`——B 端「小程序渠道」配置视图（运营可写表单 + 老板只读态 + 启用开关 + AppSecret 脱敏交互），复用 ZAPP 暗黑令牌。更新 `specs/frontend-ui/spec.md`。

### 只读消费（不修改语义）

- `user-admin` / `order-management`（R-ADM 门禁基建复用，无语义变化）。

## Impacted Bounded Contexts

- **`Channel Context`（新增）**：`miniprogram-channel` capability taxonomy（`bc-channel → cap-miniprogram-channel` Governs 边，Baseline Sync 时落位 domain_model）。
- **`Shared / Cross`（修改）**：`frontend-ui` 渠道配置视图。
- 其余 BC 只读复用（权限门禁基建），无交易语义改动。

## Process Alignment (流程对齐)

| 流程节点 | 关联说明 |
| --- | --- |
| `L1-01 触达与发现` | 渠道启用状态决定小程序触点的可用性（新增触点配置） |
| `L2-01 进入结算` | 登录前置：渠道停用阻断新登录入口（门禁联动，本 change 提供状态） |

## Service Blueprint Alignment (服务蓝图对齐)

| 蓝图节点 | 动作类型 | 说明 |
| --- | --- | --- |
| `SB-STAGE-01` | MOD | 小程序触点可用性由渠道启用状态控制 |
| `SB-CUSTOMER-01` | MOD | 微信登录入口可用性联动渠道状态 |
| `SB-OPS-*` | NEW | B 端渠道配置后台活动节点（新增落位，Baseline Sync 时确认，参照 account-system SB-BACKSTAGE-07 先例） |
| `SB-BACKSTAGE-*` | NEW | 渠道配置数据存储为后台支撑活动 |

## Impact (影响面)

- **后端服务（Node.js）**：新增渠道配置路由 `GET/PUT /api/admin/channel/miniprogram`；新建 `ChannelConfigRepo`（`data/channel-config.json` 文件持久化，对齐既有 fileRepo/memoryRepo 双模式）；AppSecret 脱敏（写入不回显明文）；复用 `requireRole('运营')` 门禁与既有用户/会话底座。**零第三方依赖**（不引入微信 SDK——网关对接属 wechat-login change）。
- **Python 后端**：**不对齐**——Python 端仅覆盖 catalog/cart/order/coupon（无 auth/admin 能力），渠道配置以 Node.js 为权威实现（差异在 Baseline Sync/测试策略中显式记录）。
- **前端 UI（Vue）**：App.vue 新增「小程序渠道」配置视图（运营/老板角色区分渲染）；ZAPP 令牌、无圆角无阴影、真实中文数据。
- **数据模型**：新增独立配置持久化文件 `channel-config.json`；无实体/聚合变更。
- **跨域/同步**：无新增跨域；配置写入即时生效。
- **测试影响**：新增 E2E 旅程（运营配置脱敏启用 / 老板只读 / 停用 CHANNEL_DISABLED / 未配置默认停用）。

## 需求侧回链

- story.md：`openspec-requirements/epics/epic-miniprogram-channel/stories/story-miniprogram-channel-config/story.md`
