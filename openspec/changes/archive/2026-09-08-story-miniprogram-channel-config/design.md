# Design: story-miniprogram-channel-config

> 关联 proposal：`openspec/changes/story-miniprogram-channel-config/proposal.md`
> 关联需求侧：story.md（R-CHN-001~009 + E2E 旅程 1/2/3）/ 原型 `miniprogram-channel-admin.html`（Epic 整体，已确认）
> 关联 specs：`specs/miniprogram-channel/spec.md`（新增 taxonomy 主 spec）、`specs/frontend-ui/spec.md`（增量）
> 依赖底座：既有 `requireRole` 门禁（R-ADM 家族）、用户/会话体系（Phase 4）、`FileRepo`/`memoryRepo` 双存储模式（fileRepo.js / memoryRepo.js）

## Context (上下文)

本 change 交付 **B 端小程序渠道配置**（Epic 6.1 依赖链根）：渠道配置 API（GET/PUT `/api/admin/channel/miniprogram`，AppSecret 脱敏、商户号纯预留、启用状态），写权限仅运营；落盘 `data/channel-config.json` 即时生效；停用后小程序新登录返回 `CHANNEL_DISABLED`（契约声明，实际登录门禁由 Story 2 wechat-auth 消费）。前端新增「小程序渠道」B 端配置视图（运营写 / 老板只读）。

**关键约束**：Node.js 零第三方依赖（不引入微信 SDK——网关对接属 wechat-login change，本 change 只做配置存储与脱敏）；Python 后端不对齐（无 auth/admin 能力，仅 catalog/cart/order/coupon 冒烟）；前端 ZAPP 暗黑令牌对齐确认原型；AppSecret 明文仅存服务端、读取只回掩码（Q4）。

## Domain Boundary Impact (领域边界影响)

- **新增 `Channel Context` BC（本 change 声明，Baseline Sync 落位）**：`miniprogram-channel` capability taxonomy——渠道配置（appid / appsecretConfigured / mchid / enabled）。ROADMAP Phase 6 Guardrails 明确新增；`domain_model.html` 现有 BC 清单（cart/catalog/coupon/data-insights/order/shared/user）无 channel——新增 `bc-channel` 节点与 `bc-channel → cap-miniprogram-channel` Governs 边。
- **User Context（复用，零语义改动）**：`requireRole` 门禁基建（R-ADM 家族）与用户/会话体系被消费；`role=老板` 只读（对齐 Epic 5.1 老板只读定位）。
- **Shared / Cross（修改）**：`frontend-ui` 横切支撑——B 端「小程序渠道」配置视图。
- **Order / Catalog / Coupon Context（零改动）**：本 change 不触达交易语义。

## Process Delta (流程影响)

- 交易主流程（L1-01~L1-06）**零改动**；L2/L3 交易规则节点**零改动**。
- **L1-01 触达与发现**（非交易修改）：渠道启用状态决定未来小程序触点的可用性（本 change 提供配置能力与状态存储，触点消费在 Story 2/6.2）。
- **L2-01 进入结算 / 登录前置**：渠道停用阻断新登录入口的**状态契约**由本 change 建立（`enabled=false` 语义 + 落盘），实际登录拒绝在 Story 2（wechat-auth）消费。
- 本 change 自身为**纯 B 端后台配置**，不修改任何 L2/L3 进入/退出条件。

## Service Blueprint Sync Assessment (服务蓝图同步评估)

- **Needs Sync: No**（本 change 级；Epic 级需 Sync——理由如下）
- **触发项（Epic 级 Yes，理由写清）**：分层 Sync 机制（change 级只做 Spec Sync `/opsx:sync`；Baseline Sync `/opsx:baseline/sync` 在 Epic `epic-miniprogram-channel` 全部 Story 归档后统一执行）。本 change 为 Epic 的 P0 Story 之一，单 Story 不触发基线回写，但该 Epic 完整交付后 `service_blueprint.html` 需要更新：
  1. **SB-STAGE-01**（用户进入）：新增小程序渠道触点 + 微信授权登录入口（本 change 提供触点可用性配置，Story 2 提供登录动作）。
  2. **SB-CUSTOMER-01**（登录/注册触点）：新增微信授权登录 + 手机号绑定动作。
  3. **SB-OPS-***（B 端运营泳道）：新增「小程序渠道配置」后台活动（配置 appid/appsecret/商户号/启用状态，仅运营；老板只读）。
  4. **SB-BACKSTAGE-***：渠道配置数据存储 + 微信网关对接为后台支撑活动。
- **计划更新部位**：`docs/baseline/service_blueprint.html` 的 SB-STAGE-01、SB-CUSTOMER-01、SB-OPS-*、SB-BACKSTAGE-*（具体落位参照 account-system `SB-BACKSTAGE-07` 先例）。
- **Evidence Source**：proposal.md「Service Blueprint Alignment」、story.md 旅程映射、specs 各能力 Governance Mapping。

## Domain Model Sync Assessment (领域模型同步评估)

- **Needs Sync: No**（本 change 级；Epic 级需 Sync——理由如下）
- **触发项（Epic 级 Yes，理由写清）**：分层 Sync 机制（Epic 全部 Story 归档后统一执行）。本 change 为 Epic 的 P0 Story 之一，单 Story 不触发基线回写，但该 Epic 完整交付后 `domain_model.html` 需要更新：
  1. **新增 `Channel Context` BC**：mappingGraph 增加节点 `bc-channel`（Bounded Context，B 端渠道配置边界）。
  2. **新增 capability taxonomy `miniprogram-channel`**：mappingGraph 增加节点 `cap-miniprogram-channel` + 边 `bc-channel → cap-miniprogram-channel`（Governs，规则含"B 端小程序渠道配置：appid/appsecret（脱敏）/商户号（纯预留）/启用状态；仅运营可写；停用拒绝新登录"）。
  3. **User Aggregate 扩展**（Story 2 落位）：新增 `openid` 字段（本 change 不触碰 User，Story 2 wechat-auth 负责）。
  4. **Order Aggregate 扩展**（Story 3 落位）：新增 `channel` 字段。
- **计划更新部位**：`docs/baseline/domain_model.html` 的 mappingGraph nodes/edges（bc-channel / cap-miniprogram-channel / 后续 wechat-auth）。
- **Evidence Source**：proposal.md「Impacted Bounded Contexts」、story.md「治理映射对齐 - Sync Assessment: Yes」、specs Governance Mapping。

## 关键设计决策

1. **脱敏存储与回显（Q4）**：AppSecret 明文写入时持久化到 `channel-config.json`（服务端私密），读取 API 只返回 `appsecretMasked`（前 4 + 掩码 + 后 4）+ `appsecretConfigured=true`；前端永不展示明文。`PUT` 语义 = 全量覆盖（secret 为空时不覆盖已存值，保留 configured 状态；非空则覆盖）。
2. **商户号纯预留（Q3）**：`mchid` 为可选字符串字段，不做资质/格式校验，不参与支付逻辑；仅在配置页标注"本期纯配置预留"。
3. **默认停用（R-CHN-009）**：首次启动/无配置记录时 `getChannelConfig()` 返回默认 `{ enabled: false, appsecretConfigured: false }`（空配置），防止未配置即开放。
4. **存储架构（对齐既有模式）**：新建 `ChannelConfigRepo`（内存 `channelConfig = null` 起步 + FileStore 落盘 `data/channel-config.json`），复刻 `StockConfigRepo`（Story 1 阈值配置）的 fileRepo/memoryRepo 双实现模式：`server.js` 启动按 `STORAGE` 环境变量选型（test 内存 / 默认文件）。
5. **门禁复用（R-CHN-001~003）**：`GET` 用 `requireRole('运营','老板')`（老板只读）；`PUT` 用 `requireRole('运营')`（仅运营）。对齐既有 `requireRole` 白名单中间件（R-ADM / R-DASH-006）。
6. **Python 不对齐**：Python 端无 auth/admin 能力（仅 catalog/cart/order/coupon 冒烟），渠道配置以 Node.js 为权威实现；差异在 Baseline Sync / 测试策略记录。

## 前端组件与状态

- **导航**：B 端左侧导航新增「小程序渠道」项（与「销售看板」「库存预警」「订单管理」并列），`viewMode === 'admin'` 且 `isOperator || isBoss` 可见。
- **视图**（对齐原型 `miniprogram-channel-admin.html`）：
  - 运营态：配置表单（AppID 输入 / AppSecret「已配置 → 掩码 + 重新配置」/ 商户号输入 / 启用开关）+「保存配置」→ 调 `PUT /api/admin/channel/miniprogram`，成功展示「已保存并即时生效」+「● 已启用/○ 已停用」徽标；停用态展示警示条（新微信登录将被拒绝）。
  - 老板态：只读展示启用状态与脱敏配置，「纯只读 · 无配置入口」。
- **数据流**：进入视图 `GET /api/admin/channel/miniprogram` → 渲染；保存 `PUT`（携带 appid/appsecret/mchid/enabled）。
- 复用 ZAPP 语义令牌（`--success` / `--accent` 徽标色）、`rounded-none`、无阴影、真实中文文案。

## 目录结构变更（Node.js）

```
ecommerce/ecommerce-mini/
├── src/
│   ├── domain/channel.js          # [NEW] 渠道配置领域逻辑（脱敏/默认值/校验，零依赖）
│   ├── repo/channelRepo.js        # [NEW] 渠道配置内存仓储（对齐 memoryRepo 模式）
│   └── http/server.js             # [MOD] 新增 GET/PUT /api/admin/channel/miniprogram 路由 + 门禁
ecommerce/ecommerce-mini/data/channel-config.json   # [NEW] 运行时落盘（gitignore 或种子）
ecommerce/ecommerce-mini-frontend/src/App.vue       # [MOD] B 端「小程序渠道」视图
```
