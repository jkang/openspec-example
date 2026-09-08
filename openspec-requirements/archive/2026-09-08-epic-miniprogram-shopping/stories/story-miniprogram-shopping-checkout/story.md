# Story: 小程序购物车 + 结算 + 模拟支付

<!--
Story 是需求侧唯一冻结交付物（业务面）。
开发侧通过 /req:handoff（skill: handoff）以本 Story 为输入，在 openspec/changes/<name>/ 合成 proposal.md，
随后在开发侧按 capability 拆分生成行为规格 specs（Story-specs）。
需求侧不生成 specs/，行为规格一律由开发侧在 proposal 之后产出。
-->

> Story Key: `story-miniprogram-shopping-checkout` | 优先级: P0 | 依赖: story-miniprogram-shopping-browse（浏览/加购入口）
> 关联 Storymap: `epics/epic-miniprogram-shopping/storymap.md`
> 关联 Idea: `epics/epic-miniprogram-shopping/idea.md`
> 关联原型（Epic 整体）: `epics/epic-miniprogram-shopping/prototypes/miniprogram-shopping.html`（已 HITL 确认）

## 用户场景 (User Scenario)

- **目标用户（C 端）**：小程序买家（已完成浏览加购，进入成交环节）。
- **使用动机**：购物车里挑好的商品要快速结算——确认数量、自动用上最划算的券、一次支付完成，价格优惠清晰。
- **关键目标**：购物车管理（数量 +/−、移除、合计，会话归属）→ 结算页（**自动最优券** → 应付金额）→ 提交订单（会话 channel 继承 MINIPROGRAM）→ **模拟支付** → 成功态（库存扣减）。Web/小程序同库（购物车与订单跟同一 userId）。
- **B 端视角**：无新增承诺——订单处理（列表渠道标识/发货/取消）6.1 已交付，小程序订单同流程。
- **C 端约束**：渠道启用才可达；不展示渠道概念；无地址（Q5 模拟订单）；模拟支付（MVP 与 Web 一致）。

## 范围 (Scope)

### In Scope
- 购物车页（移动端）：商品行（缩略占位/名称/单价）、数量 +/−（下限 1）、移除、合计（件数与金额），登录会话 userId 归属。
- 结算页：商品总额 / **自动最优券**（优惠让利）/ 应付金额（实付）；复用既有最优券语义（满足门槛选实际支付最低方案）。
- 提交订单：下单绑定会话 userId；**订单 channel 由会话来源自动继承 = MINIPROGRAM**（服务端已落地，小程序 UI 不传渠道）。
- 模拟支付：支付成功 → 订单 PAID（库存扣减），成功态页（订单号/金额 + 引导查看订单）。
- 真实数据 + ZAPP 暗黑视觉 + 全中文。

### Out of Scope
- 商品浏览/加购入口（story-miniprogram-shopping-browse）。
- 我的订单列表/状态轨迹 UI（story-miniprogram-shopping-orders；本 Story 支付成功后仅成功态 + 跳转入口）。
- C 端展示渠道概念；微信分享/转发（Q4）；收货地址（Q5）；真实微信支付（+X）；B 端改动。

## 原型参考 (Prototype Reference)

- 原型链接：`epics/epic-miniprogram-shopping/prototypes/miniprogram-shopping.html`
- 关键交互点：
  - 购物车页：商品行（数量 −/+/移除）、合计（`font-mono font-bold text-primary`）、「去结算」。
  - 结算页：商品总额 / 优惠（最优券名 + accent 让利）/ 应付金额（大字 primary）+ 「提交订单」。
  - 成功态：待支付 →「模拟支付」按钮 → 支付成功（✓ + 订单号）→「查看我的订单」跳转。
  - 底部 tabBar 购物车角标（accent 数量徽标）。

## 业务规则 (Business Rules)

| 规则ID | 规则描述 | 触发条件 | 期望结果 | 备注 |
| --- | --- | --- | --- | --- |
| R-MC-001 | 购物车行展示商品/单价/数量（会话归属） | 进入购物车 | 展示登录用户购物车（与 Web 同库） | 复用购物车 API（userId 归属） |
| R-MC-002 | 数量 +/− 与移除 | 操作购物车行 | 数量下限 1（−在 1 时不可再减），移除删行；合计实时更新 | 复用购物车 API 语义 |
| R-MC-003 | 自动最优券 | 进入结算 | 满足门槛的券中选实际支付最低方案；展示优惠让利与应付金额 | 复用既有 Coupon 最优券语义 |
| R-MC-004 | 应付金额 = 总额 − 最优券让利（不下探负） | 结算计算 | 展示实付金额 | 复用既有财务精度语义 |
| R-MC-005 | 提交订单绑定会话 userId | 点「提交订单」 | 创建订单（PENDING_PAYMENT），清空购物车 | 复用下单 API |
| R-MC-006 | 订单 channel 会话继承 = MINIPROGRAM | 小程序会话下单 | 服务端按会话 channel 写 Order.channel=MINIPROGRAM（小程序 UI 不传渠道） | 6.1 Q7 已落地；C 端不感知 |
| R-MC-007 | 模拟支付 | 点「模拟支付」 | 订单 PAID，库存扣减；重复支付幂等 | 复用支付 API |
| R-MC-008 | 支付成功态 | 支付成功 | 展示订单号/金额 +「查看我的订单」入口 | 成功态不含渠道概念 |

## 验收标准 (E2E 用户旅程)

### 旅程 1：小程序成交（购物车 → 结算 → 下单 → 支付） (Ref: L1-03, L1-04, L1-05 | SB-STAGE-03/04/05, SB-CUSTOMER-03/04/05)
#### 场景：正常主流程——最优券结算并支付成功
- @e2e
- **GIVEN** 小程序渠道已启用，买家王倩经微信授权登录（会话 channel=MINIPROGRAM），购物车含 无线办公鼠标×2（¥89.00 → 小计 ¥178.00）
- **AND** 系统存在满 50 减 10 优惠券（满足门槛）
- **WHEN** 王倩进入购物车 → 结算
- **THEN** 结算页展示商品总额 ¥178.00、优惠 -¥10.00（最优券满 50 减 10）、应付金额 ¥168.00
- **WHEN** 王倩点击「提交订单」
- **THEN** 订单创建成功且 **Order.channel = MINIPROGRAM**（服务端按会话来源判定，小程序未传渠道）
- **WHEN** 王倩点击「模拟支付」
- **THEN** 支付成功：订单状态 PAID、库存扣减、成功态展示订单号与 ¥168.00

#### 场景：购物车数量调整与移除
- @api
- **GIVEN** 购物车含商品 A×1、商品 B×2
- **WHEN** 将 A 数量 +1（→2）、B 移除
- **THEN** 购物车合计实时更新（A×2），B 不再出现；最终下单金额与购物车一致

#### 场景：售罄库存下单被拒
- @api
- **GIVEN** 购物车商品库存被后端扣减至不足（并发场景）
- **WHEN** 提交订单
- **THEN** 返回 OUT_OF_STOCK（409），订单未创建（对齐既有下单语义）

### 旅程 2：渠道化验证 (Ref: L1-04 | SB-STAGE-04)
#### 场景：小程序订单 channel=MINIPROGRAM（后端契约）
- @api
- **GIVEN** 微信授权登录会话（6.1，channel=MINIPROGRAM）
- **WHEN** 该会话调用下单 API
- **THEN** 订单 `channel = 'MINIPROGRAM'`（与 6.1 order-channel 契约一致）

## 治理映射对齐 (Governance Mapping)

- Source of Truth: docs/baseline/domain_model.html
- Bounded Context: `Shared / Cross`（frontend-ui：小程序购物车/结算/支付 UI）；`Order Context` / `Cart Context` / `Coupon Context`（只读消费下单/购物车/最优券 API）；`User Context`（会话归属 + channel 继承）
- Capability Taxonomy: `frontend-ui`（**修改**：小程序购物车/结算/模拟支付 UI）；`cart-management` / `order-management` / `checkout-management` / `payment` / `coupon-management`（只读消费）
- Related Process Nodes: L1-03 加购与准备（购物车）；L1-04 下单结算；L1-05 支付确认
- Related Service Blueprint Nodes: SB-STAGE-03/04/05（结算确认/提交订单/支付流转）、SB-CUSTOMER-03/04/05（小程序购物车/结算/支付 UI）、SB-BACKSTAGE-04/05（下单/支付 API 消费）
- Sync Assessment: Yes（轻量）——frontend-ui C 端小程序结算/支付 UI 语义扩展（Epic 收尾轻量标注；无新 BC/capability/字段；Order.channel 6.1 已落位）

## 分析制品索引 (Analysis Artifacts)

- 故事详述: `epics/epic-miniprogram-shopping/analysis/narrative/story-miniprogram-shopping-checkout/narrative.md` — ❌ 未生成（业务规则与 E2E 验收已完整）

## 交接状态 (Handoff Status)

- [x] 待开发交接 (openspec-handoff)
- [x] 已交接 (changeName: `story-miniprogram-shopping-checkout` 记录于 openspec/epic-miniprogram-shopping.story-list.json)
