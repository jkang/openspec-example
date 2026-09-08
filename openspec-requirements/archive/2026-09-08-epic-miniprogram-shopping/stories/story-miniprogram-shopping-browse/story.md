# Story: 小程序商品发现（首页/搜索/分类/详情）

<!--
Story 是需求侧唯一冻结交付物（业务面）。
开发侧通过 /req:handoff（skill: handoff）以本 Story 为输入，在 openspec/changes/<name>/ 合成 proposal.md，
随后在开发侧按 capability 拆分生成行为规格 specs（Story-specs）。
需求侧不生成 specs/，行为规格一律由开发侧在 proposal 之后产出。
-->

> Story Key: `story-miniprogram-shopping-browse` | 优先级: P0 | 依赖: 无（微信登录会话底座 6.1 已交付）
> 关联 Storymap: `epics/epic-miniprogram-shopping/storymap.md`
> 关联 Idea: `epics/epic-miniprogram-shopping/idea.md`
> 关联原型（Epic 整体）: `epics/epic-miniprogram-shopping/prototypes/miniprogram-shopping.html`（已 HITL 确认，技术形态 B 已裁定）

## 用户场景 (User Scenario)

- **目标用户（C 端）**：小程序买家（林采购类，微信内浏览选品的下游采购员/老板）。
- **使用动机**：微信里看到商品想直接挑选——搜一下、看分类、点开详情确认价格库存，快速决定是否要买。
- **关键目标**：小程序首页展示**真实 6 商品**；支持关键词搜索 / 价格排序 / 分类筛选；商品详情页展示价格（font-mono primary）/ 库存 / 描述；详情页可「加入购物车」。移动端极简（少步骤、少输入）。
- **B 端视角**：无新增承诺——商品数据沿用既有 Catalog 管理（Web/B 端已交付），小程序只读消费。
- **C 端约束**：渠道启用才可达（6.1 CHANNEL_DISABLED 语义）；不暴露渠道概念；同源账户（如需会话的购物车动作跟 userId）。

## 范围 (Scope)

### In Scope
- 小程序首页：真实 6 商品卡片网格（极简机械键盘/无线办公鼠标/高清显示器/桌面收纳架/铝合金笔记本支架/桌面拾音氛围灯，真实价格与描述）。
- 关键词搜索：按商品名/描述匹配（复用 `GET /api/products` 搜索语义）。
- 价格排序：升/降序切换（复用列表排序语义）。
- 分类筛选：键鼠外设 / 显示设备 / 桌面收纳 / 音频设备 Tabs（复用 `GET /api/categories`）。
- 商品详情页：图片区（占位图形）+ 名称 / 价格（`font-mono font-bold text-primary`）/ 库存状态（有货 / 低库存 / 已售罄）/ 描述 + 「加入购物车」（售罄禁用）。
- 加购动作写入购物车（会话归属，供 Story 2 消费）。
- 真实数据 + ZAPP 暗黑视觉（无圆角阴影、语义令牌 WXSS 映射、全中文）。

### Out of Scope
- 购物车管理/结算/支付（story-miniprogram-shopping-checkout）。
- 我的订单（story-miniprogram-shopping-orders）。
- C 端展示渠道概念（channel 内部语义）；微信分享/转发（Q4）；收货地址（Q5）；B 端任何改动。

## 原型参考 (Prototype Reference)

- 原型链接：`epics/epic-miniprogram-shopping/prototypes/miniprogram-shopping.html`
- 关键交互点：
  - 首页：顶部搜索框 + 「价格↓/↑」排序按钮 + 分类 Tabs（全部/键鼠外设/显示设备/桌面收纳/音频设备）。
  - 商品卡片网格：2 列，占位图 + 名称 + 描述 + `font-mono font-bold text-primary` 价格。
  - 详情页：占位图 + 名称/描述/价格 + 库存状态（>10 成功色 / ≤10 预警色 / 0 accent「已售罄」）+ 「加入购物车」/「立即购买」。
  - 「立即购买」= 加购并跳购物车（本 Story 交付加购；跳转联动 Story 2）。
  - 加购反馈：「✓ 已加入购物车」toast。

## 业务规则 (Business Rules)

| 规则ID | 规则描述 | 触发条件 | 期望结果 | 备注 |
| --- | --- | --- | --- | --- |
| R-MB-001 | 小程序首页展示**真实在售商品**（active 且非 deleted） | 首页加载 | 展示 6 商品卡片（名称/描述/价格/库存语义） | 与 Web/B 端同源 `GET /api/products` |
| R-MB-002 | 关键词搜索匹配商品名/描述 | 搜索框输入 | 返回匹配商品列表；空关键词返回全量 | 复用列表搜索语义 |
| R-MB-003 | 价格升/降序切换 | 点击排序按钮 | 列表按 priceCents 升/降序重排 | 移动端单按钮切换 |
| R-MB-004 | 分类筛选 | 点击分类 Tab | 仅展示该分类在售商品 | 分类数据同源 `GET /api/categories` |
| R-MB-005 | 商品详情展示价格/库存/描述 | 点击商品卡片 | 详情页展示完整信息；库存低/售罄有视觉区分 | 价格恒 font-mono primary |
| R-MB-006 | 加入购物车（售罄禁用） | 详情页点「加入购物车」 | 购物车 +1（会话 userId 归属）；toast 反馈 | stock=0 时按钮禁用显示「已售罄」 |
| R-MB-007 | 渠道门禁联动 | 渠道停用（6.1） | 小程序旅程不可达（登录被拒语义） | 复用 6.1 CHANNEL_DISABLED |
| R-MB-008 | 数据一致性 | 任意时刻 | 小程序所见商品/价格/库存与 Web 同库一致 | 后端单实例同源 |

## 验收标准 (E2E 用户旅程)

### 旅程 1：小程序浏览选品 (Ref: L1-01, L1-02 | SB-STAGE-01, SB-CUSTOMER-01)
#### 场景：正常主流程——首页浏览 → 搜索 → 分类 → 详情 → 加购
- @e2e
- **GIVEN** 小程序渠道已启用，买家已通过微信授权登录（6.1，会话 userId 归属）
- **WHEN** 买家打开小程序首页
- **THEN** 首页展示真实 6 商品（含极简机械键盘 ¥299.00、无线办公鼠标 ¥89.00 等，与 Web 列表一致）
- **WHEN** 买家搜索"键盘"
- **THEN** 列表仅返回名称/描述含"键盘"的商品（极简机械键盘）
- **WHEN** 买家点击分类「显示设备」
- **THEN** 列表仅显示高清显示器
- **WHEN** 买家点击价格升序
- **THEN** 列表按价格从低到高排列
- **WHEN** 买家点击极简机械键盘进入详情并点「加入购物车」
- **THEN** 详情展示 ¥299.00 + 库存；加购成功 toast，购物车角标 +1（会话归属）

#### 场景：售罄商品不可加购
- @e2e
- **GIVEN** 某商品 stock=0（已售罄，后端语义）
- **WHEN** 买家进入该商品详情
- **THEN** 展示「已售罄」状态（accent 色），「加入购物车」按钮禁用
- **AND** 无法将其加入购物车

### 旅程 2：同源数据一致性 (Ref: L1-01 | SB-STAGE-01, SB-BACKSTAGE-01)
#### 场景：小程序与 Web 商品数据一致
- @api
- **GIVEN** 后端同一实例服务 Web 与小程序
- **WHEN** 小程序调用商品列表/详情 API（与 Web 同源）
- **THEN** 返回数据与 Web 端完全一致（6 商品/价格/库存；无小程序独立数据源）

## 治理映射对齐 (Governance Mapping)

- Source of Truth: docs/baseline/domain_model.html
- Bounded Context: `Shared / Cross`（frontend-ui 横切支撑：小程序 C 端旅程 UI——浏览/详情触点）；`Catalog Context`（只读消费商品/分类 API）
- Capability Taxonomy: `frontend-ui`（**修改**：bc-shared → cap-ui，小程序首页/搜索/分类/详情 UI）；`catalog-management` / `product-query`（只读消费）
- Related Process Nodes: L1-01 触达与发现（小程序移动触点：浏览/搜索/分类/详情）；L1-02 评估与决策（选品比较）
- Related Service Blueprint Nodes: SB-STAGE-01（小程序触点）、SB-CUSTOMER-01（首页/搜索/详情 UI）、SB-BACKSTAGE-01（商品/分类 API 消费）
- Sync Assessment: Yes（轻量）——frontend-ui C 端小程序旅程 UI 语义扩展（Epic 收尾 Baseline Sync 轻量标注；无新 BC/capability/字段）

## 分析制品索引 (Analysis Artifacts)

- 故事详述: `epics/epic-miniprogram-shopping/analysis/narrative/story-miniprogram-shopping-browse/narrative.md` — ❌ 未生成（业务规则与 E2E 验收已完整，不额外生成）

## 交接状态 (Handoff Status)

- [x] 待开发交接 (openspec-handoff)
- [x] 已交接 (changeName: `story-miniprogram-shopping-browse` 记录于 openspec/epic-miniprogram-shopping.story-list.json)
