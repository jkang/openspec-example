# Design: story-miniprogram-wechat-login

> 关联 proposal：`openspec/changes/story-miniprogram-wechat-login/proposal.md`
> 关联需求侧：story.md（R-WX-001~011 + E2E 旅程 1/2/3/4）/ 原型 `miniprogram-wechat-login.html`（Epic 整体，已确认）
> 关联 specs：`specs/wechat-auth/spec.md`（新增 taxonomy 主 spec）、`specs/frontend-ui/spec.md`（增量）
> 依赖底座：Story 1 `story-miniprogram-channel-config`（渠道启用状态 + appid/appsecret 配置，已开发未归档）——`ChannelConfigRepo` / `GET|PUT /api/admin/channel/miniprogram`、`requireRole` 门禁、用户/会话体系（Phase 4）、`data/channel-config.json`

## Context (上下文)

本 change 交付 **微信授权登录与同源账户打通**（Epic 6.1 P0）：`User.openid` 字段（Q1 方案 A）、微信授权登录 API（code → code2session 换 openid → 命中/未命中）、手机号绑定（微信组件取号 / 撞号提示登录既有账号，Q2）、会话复用 user-session + 来源渠道标记（Q7 供 order-channel 消费）、渠道停用拒绝登录（Q5 联动 Story 1）、mock 微信网关（Q6）。

**关键约束**：Node.js 零第三方依赖（微信网关以 mock 模块内聚，不引入 SDK）；appsecret 读取自 Story 1 的渠道配置（服务端持有，严禁下发前端）；Python 不对齐；mock 网关仅 `NODE_ENV=test` 生效（对齐 `/api/__test/*` 后门模式）；小程序登录 UI 技术栈未锁定，本 change 以「可交互原型 + 登录/绑定 API + Vue B 端关联」交付（Q8），原生工程化随 6.2/lead-engineer 评估。

## Domain Boundary Impact (领域边界影响)

- **User Context（扩展）**：新增 `wechat-auth` capability（`bc-user → cap-wechat-auth` 边，Baseline Sync 落位）；`User` Aggregate 增加 `openid` 字段（登录因子，可空；单小程序一对一，Q1）。
- **Channel Context（新增，只读消费）**：渠道启用状态（Story 1）作为微信登录门禁来源（CHANNEL_DISABLED）。
- **user-session（只读复用）**：会话创建/校验/销毁复用既有能力（SessionRepo.create / findByToken / delete，R-SES-001~006）；wechat-auth 登录调用既有会话创建，不新增会话类型；**会话对象增加来源渠道标记**（`channel: 'MINIPROGRAM'`，供 Story 3 order-channel 消费——服务端判定，不信任客户端）。
- **account-management（只读消费）**：`assertPhoneFormat` / `assertPasswordRule` / `hashPassword` / `verifyPassword` / `assertUserEnabled` 等既有领域函数被复用（撞号登录校验既有账号走既有登录语义）；手机号唯一约束（R-REG-002）衔接撞号处理。
- **Shared / Cross（修改）**：`frontend-ui` 小程序登录入口 UI。

## Process Delta (流程影响)

- 交易主流程（L1-01~L1-06）**零改动**；L2/L3 交易规则节点**零改动**。
- **L1-01 触达与发现（非交易新增触点）**：小程序登录触点（微信授权登录入口），渠道启用才可用。
- **L2-01 进入结算（身份前置）**：小程序用户未登录时先微信授权登录/绑定（身份前置消费新登录因子），撞号场景引导既有账号登录。
- 本 change 为**账户打通支流**，不修改任何 L2/L3 交易进入/退出条件。

## Service Blueprint Sync Assessment (服务蓝图同步评估)

- **Needs Sync: No**（本 change 级；Epic 级需 Sync——理由如下）
- **触发项（Epic 级 Yes，理由写清）**：分层 Sync 机制（Baseline Sync 在 Epic `epic-miniprogram-channel` 全部 Story 归档后统一执行）。本 change 为 Epic 的 P0 Story 之一，单 Story 不触发基线回写，但 Epic 完整交付后 `service_blueprint.html` 需要更新：
  1. **SB-STAGE-01**（用户进入）：新增小程序触点 + 微信授权登录入口（Story 1 提供可用性配置，本 change 提供登录动作）。
  2. **SB-CUSTOMER-01**（登录/注册触点）：扩展「微信授权登录 + 手机号绑定 + 撞号引导既有账号登录」动作与 capability 分布（新增 `wechat-auth` 支撑节点）。
  3. **SB-BACKSTAGE-***：微信网关对接（code2session / 手机号组件）为后台支撑活动（mock 网关测试策略标注）。
- **计划更新部位**：`docs/baseline/service_blueprint.html` 的 SB-STAGE-01、SB-CUSTOMER-01、SB-BACKSTAGE-*。
- **Evidence Source**：proposal.md「Service Blueprint Alignment」、story.md 旅程映射、specs Governance Mapping。

## Domain Model Sync Assessment (领域模型同步评估)

- **Needs Sync: No**（本 change 级；Epic 级需 Sync——理由如下）
- **触发项（Epic 级 Yes，理由写清）**：分层 Sync 机制（Epic 全部 Story 归档后统一执行）。本 change 为 Epic 的 P0 Story 之一，单 Story 不触发基线回写，但 Epic 完整交付后 `domain_model.html` 需要更新：
  1. **User Aggregate 扩展 `openid` 字段**：`user` 节点（行 753 meta）补充 openid（登录因子）；invariant 补充「openid 单小程序唯一可空」。
  2. **新增 capability taxonomy `wechat-auth`**：mappingGraph 增加节点 `cap-wechat-auth` + 边 `bc-user → cap-wechat-auth`（Governs，规则含"微信授权登录因子：code2session 换 openid、手机号绑定（撞号提示登录）、复用会话 + 渠道来源"）。
  3. **Channel Context BC + `miniprogram-channel` capability**（Story 1 声明，本 Story 消费其启用状态，同 Epic 统一回流）。
  4. **Order Aggregate 扩展 `channel` 字段**（Story 3 落位）。
- **计划更新部位**：`docs/baseline/domain_model.html` 的 mappingGraph nodes/edges、aggregate 字段与 invariant、policies。
- **Evidence Source**：proposal.md「Impacted Bounded Contexts」、story.md「治理映射对齐 - Sync Assessment: Yes」、specs Governance Mapping。

## 关键设计决策

1. **openid 关联模型（Q1 方案 A）**：`User.openid` 可空字段（单小程序一对一），不做独立映射表；同一 openid 只归属一个 User（唯一索引语义，代码层 findByOpenid 校验 + 撞号防重复绑定）。
2. **mock 微信网关（Q6）**：新建 `src/services/wechatGateway.js`——`exchangeCodeForOpenid(code, config)`：`NODE_ENV=test` 且开启 mock 时查固定映射表（`code_demo_001 → openid_demo_001` 等），生产环境抛「真实微信网关未接入（资质后置 +X）」；手机号组件 `fetchPhoneByCode(code)` 同理 mock。映射表常量便于 E2E 断言。
3. **绑定撞号（Q2）**：绑定流程若 openid 未命中且需手机号：
   - `POST /api/auth/wechat/bind` 入参 `{ code, phone }`（或带 openid 直绑）：手机号**未注册** → 建新 User（phone+openid）→ 复用 register 的自动登录会话逻辑（含 channel=MINIPROGRAM）。
   - 手机号**已注册** → 返回 `PHONE_EXISTS_NEED_LOGIN`（不合并）；客户端展示既有账号登录表单 → 调既有 `POST /api/auth/login`（复用手机号+密码校验/防枚举）→ 前端拿到登录成功后再调 `POST /api/auth/wechat/bind-openid`（将 openid 写入该 User，防越权：需携带既有账号会话凭证 + 目标 openid 校验绑定者身份）。
4. **会话来源标记（Q7）**：会话对象增加 `channel` 字段（默认 `'WEB'`；wechat-auth 登录/绑定创建的会话 → `'MINIPROGRAM'`）；`SessionRepo.create` 增加可选参数 `channel`（既有调用不传则 WEB，兼容存量）。Story 3 下单时从会话解析 channel 写 `Order.channel`。
5. **渠道门禁（Q5）**：微信登录/绑定 API 入口先读渠道配置（`ChannelConfigRepo.getConfig().enabled`）：false → `CHANNEL_DISABLED`；仅 `MINIPROGRAM` 来源流程需校验（网页登录不受渠道状态影响）。
6. **路由语义**：
   - `POST /api/auth/wechat/login`：body `{ code }` → 渠道门禁 → code2session 换 openid → 命中：会话（MINIPROGRAM）登录成功；未命中：`WECHAT_BIND_REQUIRED`。
   - `POST /api/auth/wechat/bind`：body `{ code, phone? }`（未命中 openid 的绑定路径，取号走 mock/手动）→ 建号或撞号引导。
   - `POST /api/auth/wechat/bind-openid`：body `{ openid }` + 既有账号会话 → 校验后写入 User.openid（撞号场景完成绑定）。
   - 复用既有 `requireSession` / `AuthService` 基建。
7. **Python 不对齐**：无认证能力，以 Node.js 为权威实现。

## 目录结构变更（Node.js）

```
ecommerce/ecommerce-mini/
├── src/
│   ├── domain/types.js               # [MOD] User 增加 openid 字段；Session 增加 channel 字段（默认 WEB）
│   ├── repo/memoryRepo.js            # [MOD] UserRepo.findByOpenid；SessionRepo.create(userId, channel?) 保存 channel；UserRepo.save 支持 openid
│   ├── repo/fileRepo.js              # [MOD] UserFileRepo.findByOpenid；SessionFileRepo.create 保存 channel
│   ├── services/wechatGateway.js     # [NEW] mock 微信网关（code2session / 手机号组件，NODE_ENV=test）
│   ├── services/auth.js              # [MOD] 复用既有登录/注册领域函数；暴露 findByOpenid 辅助（或 WechatAuthService 内聚）
│   └── http/server.js                # [MOD] 新增 /api/auth/wechat/* 路由 + 渠道门禁 + mock 网关装配
ecommerce/ecommerce-mini/data/users.json / sessions.json   # 运行时结构扩展（存量兼容：无 openid/channel 字段视为空/WEB）
```

## 待归档测试

- 单元：mock 网关映射、openid 唯一/绑定规则、撞号分支、会话 channel 默认 WEB、toPublicUser 不泄露 openid 外新敏感字段（openid 非敏感）。
- API：老客户直连 / 新号绑定 / 撞号 403 语义 / 停用拒绝 / 禁用失效 / 会话 channel 断言 / 防越权 bind-openid。
- E2E：复用既有 account_*.feature 基建 + 新建 `miniprogram_wechat_login.feature`。
