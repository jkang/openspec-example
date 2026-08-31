---
name: Product Roadmap
purpose: 定义项目当前阶段目标、已完成能力及后续阶段规划
updated_at: 2026-08-31
---

# 产品路线图 (Product Roadmap)

本文档定义了 OpenSpec-Practice 极简电商系统的高阶业务规划。
AI Agent 在执行需求探索（`/req:explore`）阶段时，**必须首先查阅此文档**，确保新构思的需求符合当前所处的业务阶段与产品价值方向。

---

## 📅 当前状态与阶段规划 (Current State & Phasing)

最后刷新时间: 2026-08-31

### 🏆 当前 Baseline (已完成能力)

- **C 端交易链路**: 商品浏览 / 关键词搜索 / 价格排序 / 分类筛选 / 购物车 / 结算（模拟下单）。
- **C 端订单可见**: 「我的订单」视图（订单列表 + 详情 + 状态轨迹），支付后可见实时状态；订单按登录会话用户归属（R-SES-003）。
- **B 端运营后台**: 商品管理完整 CRUD（含软删除）、商品分类管理、优惠券规则配置与单人发放、**订单管理（列表/详情/发货/取消）**、**用户管理（列表/手机号或昵称检索/详情含订单聚合/禁用启用，仅运营角色，R-ADM-001~007）**。
- **用户账户体系（Phase 4 完成）**: 注册（手机号唯一 + 密码哈希 + 自动登录）/ 登录（统一失败提示防枚举 + 禁用拦截）/ 会话生命周期（全局校验 + 刷新保持 + 退出销毁 + 禁用即失效）；订单归属真实用户，替换 `user_dev` 占位；新增 `account-management` / `user-session` / `user-admin` 三个 capability taxonomy（User Context）。
- **订单生命周期闭环**: `PENDING_PAYMENT → PAID → SHIPPED → COMPLETED / CANCELLED` 状态机；模拟支付（库存与券在支付成功时扣减/核销）。
- **营销工具**: 优惠券系统闭环（B 端配置 → 发放 → C 端最优券结算核销）。
- **销售报表看板（Phase 5 Epic 5.1 完成）**: B 端销售总览（4 指标卡：销售额/订单量/客单价/优惠让利 + 今日/近7日/近30日切换 + SVG 趋势 + 优惠券效果）+ 商品 TOP10 / 分类 TOP10 排行；新增 `role=老板`（只读看板视角）；仅运营/老板可访问（客服/未登录 403）；新增 `data-insights` BC 与 `sales-dashboard` capability（Baseline Sync 已完成）。
- **库存预警与补货建议（Phase 5 Epic 5.2 完成）**: B 端库存洞察——低库存预警列表（`stock ≤ 阈值` 入列 + 已售罄置顶 + 超卖风险标识）、阈值两级配置（全局默认 10 件 + 商品级覆盖，仅运营可写，落盘 `data/stock-config.json` 即时生效）、补货建议（近7日日均销量 → 预计售罄天数 → 建议补货量 = `max(0, ⌈日均×7⌉ − stock)`，到货周期固定 7 天，无销量展示「暂无销量」）、老板只读全局库存健康度总览（预警/已售罄/超卖风险计数）；仅运营/老板可访问（客户/客服 403、未登录 401）；新增 `stock-insight` capability（data-insights BC，Baseline Sync 已完成）。
- **持久化与真实数据**: JSON 文件持久化（products/categories/coupons/issuances/orders/carts/users/sessions/stock-config），真实数据落地。
- **SDD 工作流**: 基于 OpenSpec 的规格驱动开发闭环，Epic/Story/Bug Fix/Tech Debt 共 28 个变更已归档；E2E Cucumber 覆盖 44 场景（含销售看板 5 场景 + 库存洞察 8 场景）。

### 🔍 现状评估 (Product Expert Review)

对照产品核心价值承诺（`docs/PRODUCT.md`：*订单驱动库存实时变更* + *回款节点驱动应收账款看板*）：

| 价值承诺 | 现状 | 差距 |
| :--- | :--- | :--- |
| 订单驱动库存实时变更 | ✅ 支付成功后扣减库存，取消（待支付）不占库存 | 已闭环 |
| 订单可处理工作流 | ✅ 下单→支付→发货→完成/取消，B 端订单管理 + C 端我的订单 | 已闭环 |
| 用户资产归属 | ✅ 注册/登录/会话闭环，订单归属真实用户，B 端用户管理（检索/详情/禁用） | 已闭环（Phase 4 完成） |
| 数据驱动经营决策 | ✅ 销售报表看板（Epic 5.1）+ 库存预警与补货建议（Epic 5.2）：总览/排行/预警/补货，只读聚合自订单明细与库存事实 | 已闭环（Phase 5 完成） |
| 回款节点驱动应收账款看板 | 未启动 | 无账期/回款概念，差异化承诺空白（Phase 7） |

**数据资产盘点（Phase 6 输入）**:
- `Product` 含 `stock`（Aggregate 不变量 `stock≥0`）→ 库存预警/补货建议数据基础已落地（Epic 5.2 完成）。
- `Order` 已含 `totalCents / discountCents / actualPaidCents / couponId / items / userId / status`（priceCents 精确制）→ 销售分析字段完整。
- `User` 角色已含 `客户 / 运营 / 客服 / 老板` → B 端权限模型完整（老板只读看板/预警视角）。
- `domain_model.html` 前瞻 ReadModel `Operator 库存看板` 已扩展并落地（预警 + 补货建议口径）。

**结论**: 「订单生命周期与履约闭环」（Phase 3）+「用户资产与账户体系」（Phase 4）+「销售报表看板」（Epic 5.1）+「库存预警与补货建议」（Epic 5.2）均已交付，**Phase 5 Exit Criteria 全部达成**。下一阶段：**Phase 6 微信小程序渠道**（C 端移动化入口）。

---

## 📍 当前阶段 (Current Phase) — Phase 5: 数据洞察与经营决策 ✅ 已完成

> **Phase 5 已全部交付**（Epic 5.1 销售报表看板 + Epic 5.2 库存预警与补货建议，Exit Criteria 全达成）。下一阶段进入 **Phase 6 微信小程序渠道**（见下方 Future Phases）。

### 🎯 目标 (Target)

让**老板与运营**通过真实数据驱动经营决策：销售报表看板（日/周/月维度）+ 库存预警与补货建议，兑现"可视即价值"。

### 📥 In Scope

- **Epic 5.1 `epic-sales-dashboard` — 销售报表看板** ✅ 已交付（2026-08-30）：
  - 核心指标：销售额（`actualPaidCents` 汇总）、订单量、客单价、优惠让利（`discountCents`）。
  - 维度：时间（今日 / 近7日 / 近30日）、商品、分类。
  - 视图：指标卡 + 趋势 + 商品/分类排行。
  - B 端：仅 `role=运营` 或 `role=老板` 角色可访问（扩展 R-ADM 权限门禁）。
- **Epic 5.2 `epic-stock-insight` — 库存预警与补货建议** ✅ 已交付（2026-08-31）：
  - 低库存预警列表（`stock ≤ 阈值` 入列 + 已售罄置顶 + 超卖风险标识）。
  - 基于销量速度的补货建议（预计售罄天数 + 建议补货量，到货周期 7 天）。
  - B 端：阈值两级配置（全局默认 10 件 + 商品级覆盖，仅运营可写、即时生效落盘）；老板只读健康度总览。

### 🚫 Out of Scope

- ❌ 回款与应收账款（Phase 7 专属）。
- ❌ 自动化补货执行（仅给建议，不自动下单）。
- ❌ 复杂 BI（多租户、自定义报表引擎、图表导出）。

### ✅ Exit Criteria（可度量）— 全部达成

1. ✅ 销售看板支持 今日 / 近7日 / 近30日 时间切换；销售额 / 订单量 / 客单价 / 优惠让利 4 项指标与订单数据一致（E2E 断言）。
2. ✅ 商品 TOP10 与分类聚合排行与订单明细一致。
3. ✅ 库存预警：`stock ≤ 阈值` 商品出现在预警列表；阈值配置即时生效；预计售罄天数 = 库存 / 日均销量（日维度）。
4. ✅ 权限门禁：`客户 / 客服` 访问看板 API 返回 403；`运营 / 老板` 可访问。
5. ✅ 全部 E2E 通过（新增看板与库存洞察旅程映射 `SB-STAGE-*`）。

### 🧭 Explore Guardrails（Phase 5 硬约束）

- **B/C 双端视角**：看板与预警是纯 B 端（运营/老板），必须明确角色权限门禁；无 C 端交互新增。
- **只读聚合**：看板 API 为只读聚合，不产生写操作、不改变订单/库存语义。
- **真实数据**：示例必须用现有 6 商品真实数据 + 真实订单量级，严禁占位符。
- **治理映射**：新增 `data-insights` Bounded Context 与 capability taxonomy（`sales-dashboard` / `stock-insight`），在 `domain_model.html` 显式标注"新增"；复用既有 `Operator 库存看板` ReadModel。
- **极简 UI**：看板遵循 slate 色系、无圆角阴影、零第三方图表库（用 CSS/SVG 实现简单趋势图）。

### 📦 代表性 Epics 与 Story 拆分

| Epic | Story | 说明 | 优先级 |
| --- | --- | --- | --- |
| `epic-sales-dashboard` | `story-sales-dashboard-overview` | 销售总览（4 指标卡 + 时间切换） | P0 |
| `epic-sales-dashboard` | `story-sales-dashboard-ranking` | 商品/分类 TOP10 排行 | P1 |
| `epic-stock-insight` | `story-stock-warning-list` | 低库存预警列表 + 阈值配置 | P0 |
| `epic-stock-insight` | `story-stock-replenish-suggestion` | 补货建议（售罄天数 + 建议量） | P1 |

---

## 🗺️ 后续阶段 (Future Phases)

> 各阶段为高价值方向，进入前需重新评估现状与优先级。

### 🚀 未来 +1 个月 — Phase 6: 微信小程序渠道（C 端移动化入口）

- **目标**: 让买家在微信生态内完成完整购物闭环（浏览→下单→订单追踪），把"生意搬进微信"。
- **范围**:
  - **Epic 6.1 `epic-miniprogram-channel` — 小程序渠道接入与账户打通**:
    - B 端小程序渠道配置（appid / appsecret / 商户号 / 启用状态；仅运营角色，扩展 R-ADM 权限门禁）。
    - 微信授权登录（openid）→ 手机号绑定 → 复用现有 User 账户/会话体系（同源账户，不做独立用户池）。
    - B 端订单管理展示订单渠道标识（`channel=MINIPROGRAM`），小程序订单可正常发货/取消。
  - **Epic 6.2 `epic-miniprogram-shopping` — 小程序 C 端交易链路**:
    - 商品浏览 / 关键词搜索 / 分类 / 详情、购物车、结算（优惠券最优核销）、模拟支付、我的订单（列表 + 状态轨迹）。
    - 完全复用现有 Catalog / Cart / Coupon / Order 后端 API 与数据源，Web 与小程序同库实时一致。
- **产品理由**: 目标买家（贸易型中小企业客户）日常活跃于微信，小程序是零安装、低门槛的移动购物入口，直接承接"订单散落在表格、回款在群聊"痛点中买家侧的数字化下单诉求；复用 Phase 3-5 沉淀的交易/库存/营销闭环，边际成本低，兑现"可视即价值"。
- **代表性 Epic**: `epic-miniprogram-channel` / `epic-miniprogram-shopping`
- **触发条件**: Phase 5 Exit Criteria 已全达成（含 Epic 5.2 库存预警交付）✅ 可启动。
- **Explore Guardrails（Phase 6 硬约束）**:
  - **B/C 双端视角（强约束）**: 小程序是 C 端触点，但渠道配置（appid/secret/商户号）、订单渠道标识、用户绑定管理是 B 端承诺项；严禁只设计 C 端。
  - **同源账户**: 小程序用户与 Web 用户同一 User 表，openid/手机号只是新的登录因子，不做数据孤岛。
  - **模拟支付**: MVP 保持模拟支付（与 Web 端一致），真实微信支付（商户资质/证书）作为交付后的 +X 评估项。
  - **真实数据**: 小程序 UI 示例必须用现有 6 商品真实数据 + 真实订单，严禁占位符。
  - **治理映射**: User Context 新增 `wechat-auth` capability；新增 `Channel Context`（B 端渠道配置）BC 与 `miniprogram-channel` capability；Order 增加渠道来源（`channel=MINIPROGRAM`）；`domain_model.html` / `service_blueprint.html` 显式标注"新增"。
  - **极简 UI**: 小程序遵循与 Web 一致的极简约束（无圆角阴影、slate 色系、真实中文数据）；具体技术栈（原生 WXML / uni-app / Taro）由 lead 与 engineer 评估后定，roadmap 不锁定。

### 🚀 未来 +2 个月 — Phase 7: 回款与应收账款闭环（产品差异化终点）

- **目标**: 兑现"回款节点驱动应收账款看板"的核心承诺。
- **范围**: 应收账款 / 账期管理、回款节点登记、回款状态看板（老板与财务视角）。
- **产品理由**: 这是 `PRODUCT.md` 中与"订单散落、回款在群聊"痛点直接对应的差异化能力，是产品从"电商工具"升级为"运营闭环系统"的标志；复用 Phase 5 看板底座。
- **代表性 Epic**: `epic-accounts-receivable`
- **触发条件**: Phase 6 交付后评估。

### 🚀 未来 +3 个月 — Phase 8: 运营效率增强

- **目标**: 降低 B 端重复性人工操作成本。
- **范围**: 订单批量处理（批量发货/取消）、数据导出（CSV）、常用查询保存。
- **产品理由**: Phase 5-7 沉淀的数据与后台操作具备规模，批量与导出成为效率刚需。
- **代表性 Epic**: `epic-operation-tools`
- **触发条件**: Phase 7 交付后评估。

### 🚀 未来 +X 个月 — 探索方向（未排期）

- 多仓/多店铺管理、供应商协同、复杂促销引擎（满减/阶梯价）、真实微信支付与订阅消息推送。
- 视业务反馈与客户验证结果再评估。

---

## 🧭 Explore 边界总则（所有阶段适用）

- Explore 必须对齐上述阶段目标与 In/Out of Scope；超出范围的新构思先回退评估。
- **B/C 双端视角（强约束）**：探索任何新功能必须同时澄清 B 端运营逻辑（后台如何配置 / 生命周期 / 权限）与 C 端体验。
- 保持极简：无圆角阴影、slate 色系、零第三方 UI 依赖、真实数据。
