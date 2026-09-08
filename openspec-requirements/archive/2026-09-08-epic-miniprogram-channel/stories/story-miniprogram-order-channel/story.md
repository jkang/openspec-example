# Story: 订单渠道标识（channel）

<!--
Story 是需求侧唯一冻结交付物（业务面）。
开发侧通过 /req:handoff（skill: handoff）以本 Story 为输入，在 openspec/changes/<name>/ 合成 proposal.md，
随后在开发侧按 capability 拆分生成行为规格 specs（Story-specs）。
需求侧不生成 specs/，行为规格一律由开发侧在 proposal 之后产出。
-->

> Story Key: `story-miniprogram-order-channel` | 优先级: P1 | 依赖: story-miniprogram-wechat-login（MINIPROGRAM 渠道来源会话底座）；story-miniprogram-channel-config（渠道启用）
> 关联 Storymap: `epics/epic-miniprogram-channel/storymap.md`
> 关联 Idea: `epics/epic-miniprogram-channel/idea.md`
> 关联原型（Epic 整体）: `epics/epic-miniprogram-channel/prototypes/miniprogram-channel-admin.html`（订单管理「渠道」列，已 HITL 确认）

## 用户场景 (User Scenario)

- **目标用户（B 端）**：运营（订单处理负责人，陈晓芸）。买家在微信小程序（未来 Epic 6.2 购物旅程）或网页下单后，订单都会进入同一个订单池。
- **使用动机**：客户打电话来问单时，运营需要**一眼看出这单是微信里下的还是网页下的**——不同渠道的客户沟通语境不同（微信客户可回原聊天、网页客户走电话/客服）；但处理动作（发货/取消/查询）必须完全一致，不能因渠道搞两套流程。
- **关键目标**：`Order` 记录渠道来源（`channel`，默认 WEB；小程序来源会话下单 → MINIPROGRAM）；B 端订单管理列表展示「渠道」标识列；发货/取消流程与网页单完全一致。
- **B 端视角**：
  - 后台怎么配置？—— 无新增配置；渠道来源由系统按**会话来源**自动判定（Q7），运营无需干预。
  - 生命周期如何？—— channel 为订单创建时写入的不可变属性，随订单全生命周期存在，不随状态流转变化。
  - 谁有权限？—— B 端订单列表沿用既有订单管理权限门禁（仅运营/客服按既有规则；渠道标识展示不引入新权限面）。

## 范围 (Scope)

### In Scope
- `Order` 增加 `channel` 字段：`'WEB'`（默认）| `'MINIPROGRAM'`。
- 渠道写入口径（Q7）：下单时从**会话来源**继承——wechat-auth（story-miniprogram-wechat-login）创建的会话（来源 MINIPROGRAM）下单 → `channel=MINIPROGRAM`；网页登录会话下单 → `channel=WEB`。**服务端判定，不信任客户端传参（防伪造）**。
- B 端订单管理列表新增「渠道」标识列（展示 WEB / MINIPROGRAM），**仅展示**（MVP 不做按渠道筛选/统计，Q7）。
- 订单查询/详情/发货/取消等处理流程与网页单**完全一致**（渠道不影响状态机与操作路径）。
- 历史订单兼容：存量订单（无 channel 字段）默认视为 `WEB`（迁移语义），不破坏既有数据。

### Out of Scope
- 渠道配置读写（story-miniprogram-channel-config）。
- 微信授权登录/手机号绑定（story-miniprogram-wechat-login）。
- 按渠道筛选/统计/报表（MVP 不做，Q7；可视后续 Epic 增补）。
- 小程序购物旅程 UI 与下单链路（Epic 6.2 消费本 Story 的 channel 语义）。
- C 端展示渠道来源（C 端无需感知渠道，订单页不显示 channel）。

## 原型参考 (Prototype Reference)

- 原型链接：`epics/epic-miniprogram-channel/prototypes/miniprogram-channel-admin.html`（「订单管理」视图）
- 关键交互点：
  - B 端「订单管理」视图新增「渠道」列（订单号 / 买家 / 商品 / 金额 / **渠道** / 状态）。
  - 渠道徽标：MINIPROGRAM → `border-electric text-electric`「小程序」；WEB → `border-border text-muted-foreground`「网页」。
  - 页眉说明：「渠道标识仅展示 · 不改变订单流程（Q7）」。
  - 真实订单数据演示：王倩（小程序单：无线办公鼠标）、林晓明（小程序单：极简机械键盘）、陈晓芸（网页单：高清显示器）等。

## 业务规则 (Business Rules)

| 规则ID | 规则描述 | 触发条件 | 期望结果 | 备注 |
| --- | --- | --- | --- | --- |
| R-ORDCH-001 | `Order` 增加 `channel` 字段（`'WEB'` 默认 | `'MINIPROGRAM'`） | 创建订单 | 订单携带渠道来源 | 存量订单缺省视为 WEB（兼容迁移） |
| R-ORDCH-002 | 渠道来源从**会话来源**继承，服务端判定 | 下单请求携带会话凭证 | wechat-auth（来源 MINIPROGRAM）会话 → `channel=MINIPROGRAM`；其余会话 → `channel=WEB` | Q7：不信任客户端传参（防伪造） |
| R-ORDCH-003 | B 端订单管理列表展示「渠道」标识列 | 运营/客服查看订单列表 | 每单显示渠道标识（小程序 / 网页） | 仅展示，不做筛选/统计（Q7） |
| R-ORDCH-004 | 订单处理流程不受渠道影响 | 对任意渠道订单发货/取消/查询 | 与网页单完全一致（状态机、操作路径不变） | 不因渠道分流处理 |
| R-ORDCH-005 | channel 为订单不可变属性 | 订单状态流转 | 渠道标识随订单全生命周期保持，不随状态变化 | 创建时写入 |

## 验收标准 (E2E 用户旅程)

### 旅程 1：小程序来源会话下单带渠道标识 (Ref: L1-04 | SB-STAGE-04, SB-CUSTOMER-04, SB-OPS)
#### 场景：正常主流程——MINIPROGRAM 会话下单
- @e2e
- **GIVEN** 小程序渠道已启用，买家王倩已通过微信授权登录（story-miniprogram-wechat-login），其会话来源 = MINIPROGRAM
- **AND** 王倩购物车含无线办公鼠标 × 1（¥89.00）
- **WHEN** 王倩提交订单（既有下单 API，携带其会话凭证）
- **THEN** 订单创建成功，`Order.channel = 'MINIPROGRAM'`（服务端按会话来源判定，不依赖客户端传参）

#### 场景：正常主流程——WEB 会话下单为默认渠道
- @e2e
- **GIVEN** 买家林晓明通过网页登录（会话来源 = WEB）
- **WHEN** 林晓明在网页提交订单
- **THEN** 订单创建成功，`Order.channel = 'WEB'`（默认值）

### 旅程 2：B 端订单列表渠道标识展示 (Ref: L1-06 | SB-OPS, SB-CUSTOMER-06)
#### 场景：运营查看订单列表可见渠道来源
- @e2e
- **GIVEN** 系统中同时存在小程序单（王倩：无线办公鼠标）与网页单（陈晓芸：高清显示器）
- **WHEN** 运营进入 B 端「订单管理」
- **THEN** 列表每单展示「渠道」标识：小程序单显示「小程序」、网页单显示「网页」
- **AND** 列表字段与金额正确（小程序单 ¥89.00 / 网页单 ¥1299.00）

#### 场景：小程序订单正常发货/取消（与网页单一致）
- @e2e
- **GIVEN** 存在 `channel=MINIPROGRAM` 的待发货订单（王倩：无线办公鼠标）
- **WHEN** 运营对该订单执行发货（既有发货 API）
- **THEN** 发货成功，订单状态正常流转（PENDING_PAYMENT→PAID 的待发货单 → SHIPPED）
- **AND** 全程无因渠道产生的流程差异（与网页单同一状态机）

#### 场景：历史存量订单兼容（默认 WEB）
- @api
- **GIVEN** 系统存在升级前创建的存量订单（无 channel 字段）
- **WHEN** 运营查看订单列表 / 读取订单详情
- **THEN** 存量订单展示为「网页」（channel 缺省视为 WEB）
- **AND** 不报错、不丢失任何历史数据

### 旅程 3：防伪造校验 (Ref: L1-04 | SB-STAGE-04)
#### 场景：客户端伪造渠道传参不被信任
- @api
- **GIVEN** 网页登录会话（来源 WEB）的买家发起下单
- **WHEN** 请求体恶意携带 `channel=MINIPROGRAM`
- **THEN** 系统忽略客户端传参，订单 `channel` 仍按会话来源判定为 `'WEB'`（Q7：服务端判定，防伪造）

## 治理映射对齐 (Governance Mapping)

- Source of Truth: docs/baseline/domain_model.html
- Bounded Context: `Order Context`（**修改**：`Order` Aggregate 增加 `channel` 字段）；`User Context` / `Channel Context`（只读消费：会话来源渠道判定）
- Capability Taxonomy: `order-management`（**修改**：`Order.channel` 字段 + B 端列表渠道标识展示，复用 `openspec/specs/order-management/spec.md` 路径）；`frontend-ui`（**修改**：订单列表渠道标识列）
- Related Process Nodes: L1-04 下单结算（订单渠道来源写入）；L1-06 履约与完成（B 端订单管理渠道标识展示；发货/取消流程不变）
- Related Service Blueprint Nodes: SB-STAGE-04（提交订单：Order.channel 写入）；SB-CUSTOMER-04（下单归属：渠道标识随订单落库）；SB-OPS-*（B 端订单列表渠道标识列展示）；SB-CUSTOMER-06 / SB-BACKSTAGE-04（订单回读展示渠道来源）
- Sync Assessment: **Yes** — `Order` Aggregate 增加 `channel` 字段（Domain Model 实体字段扩展）、蓝图订单节点渠道标识语义（Epic 级变化）；按分层 Sync 机制在 Epic 全部 Story 归档后统一执行 Baseline Sync（本阶段仅预判不执行）

## 分析制品索引 (Analysis Artifacts)

- 故事详述: `epics/epic-miniprogram-channel/analysis/narrative/story-miniprogram-order-channel/narrative.md` — ❌ 未生成（业务规则与 E2E 验收已完整，不额外生成，对齐既有 Story 先例）

## 交接状态 (Handoff Status)

- [x] 待开发交接 (openspec-handoff)
- [x] 已交接 (changeName: `story-miniprogram-order-channel` 记录于 openspec/epic-miniprogram-channel.story-list.json)
