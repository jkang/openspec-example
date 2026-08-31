# Story: 低库存预警列表 + 阈值配置

<!--
Story 是需求侧唯一冻结交付物（业务面）。
开发侧通过 /req:handoff（skill: handoff）以本 Story 为输入，在 openspec/changes/<name>/ 合成 proposal.md，
随后在开发侧按 capability 拆分生成行为规格 specs（Story-specs）。
需求侧不生成 specs/，行为规格一律由开发侧在 proposal 之后产出。
-->

> Story Key: `story-stock-warning-list` | 优先级: P0 | 依赖: 无
> 关联 Storymap: `epics/epic-stock-insight/storymap.md`
> 关联 Idea: `epics/epic-stock-insight/idea.md`
> 关联原型（Epic 整体）: `epics/epic-stock-insight/prototypes/stock-insight.html`

## 用户场景 (User Scenario)

- **目标用户（B 端）**：运营（库存管理/补货负责人，日常巡检库存水位）、老板（决策者，只读）。B 端导航「库存预警」入口仅运营/老板可见，客户/客服不可见。
- **使用动机**：售罄前主动发现低库存商品，避免"断货靠买家提醒、超卖靠赔付兜底"的被动局面；阈值可按商品设置个性水位线（跑量款调高、慢销款调低）。
- **关键目标**：进入「库存预警」即见 `stock ≤ 阈值` 的预警列表（含 `stock=0` 已售罄特殊状态与超卖风险琥珀标识）；运营可按需配置阈值并即时生效。
- **B 端视角**：
  - 后台怎么配置？—— 阈值两级配置：**全局默认阈值（10 件）+ 商品级覆盖阈值**；低频写操作，设一次长期有效；商品管理运营承担配置职责，不引入新角色。
  - 生命周期如何？—— 配置落盘 `data/stock-config.json`，**即时生效**（修改后下一次预警查询立即反映）；无过期概念、长期有效；商品软删除后其覆盖配置保留但不参与聚合。
  - 谁有权限？—— 配置写权限仅 `role=运营`；`role=老板` 只读（无配置入口）；预警 API 仅运营/老板可访问，客户/客服 403、未登录 401（对齐 `domain_model.html` 行 869 看板权限门禁）。

## 范围 (Scope)

### In Scope
- B 端后台导航新增「库存预警」入口（经营分析分组，与「销售看板」并列），仅运营/老板角色可见，客户/客服不可见。
- 预警列表 API：`stock ≤ 阈值` 商品入列；`stock = 0` 以「已售罄」特殊状态入列（置顶、醒目，不可静默消失）。
- 超卖风险标识：预计售罸天数 < 7 天（到货周期）→ `--warning`（#FF9A00）琥珀 Badge「超卖风险」；不纳入 PENDING_PAYMENT 未支付订单占用。
- 阈值两级配置：全局默认阈值 = **10 件** + 商品级覆盖阈值（覆盖优先于全局默认）。
- 阈值配置写操作：仅 `role=运营` 可写；落盘 `data/stock-config.json`、**即时生效**、长期有效；软删除商品覆盖配置保留但不参与聚合。
- 权限门禁：预警/配置 API 仅 `role=运营 / 老板` 可访问；客户/客服 403、未登录 401。
- 补充 `user_1003`（role=老板）种子演示账号（对齐 Epic 5.1 老板角色、补齐种子缺口，供 E2E 与演示）。
- 列表排序：已售罄置顶；其余按预计售罸天数升序（最紧迫在前）；无销量商品（不计算天数）置底。
- 只读聚合：预警 API 只读消费 `Product.stock` 与订单销量，不产生写操作（阈值配置写路由为本 Story 唯一写操作）。

### Out of Scope
- 补货建议（预计售罸天数 / 建议补货量 /「无需补货」列）——归属 story-stock-replenish-suggestion（P1，依赖本 Story）。
- C 端任何页面改动（不改变商品浏览/购物车/下单/支付行为）。
- PENDING_PAYMENT 未支付订单占用纳入超卖判定（P2 候选）。
- 品类差异化默认阈值（差异化由商品级覆盖满足）、自动补货执行、安全库存/个性化到货周期（P2 候选）。

## 原型参考 (Prototype Reference)

- 原型链接：`epics/epic-stock-insight/prototypes/stock-insight.html`
- 关键交互点：
  - 左侧导航「经营分析 / 库存预警」入口（与销售看板并列，仅运营/老板角色视图渲染）。
  - 预警列表表格：商品名 / 当前库存 / 预警阈值（覆盖值标「覆盖」、全局值标「全局」）/ 近7日日均销量 / 预计售罸天数 / 超卖风险标识 / 建议补货量 / 状态；Tabs「预警中 / 健康水位」切换。
  - 已售罄（stock=0）行：accent 色库存 +「已售罄」Badge 置顶；超卖风险行：`--warning` 琥珀 Badge「超卖风险」+ 状态「低库存」。
  - 阈值配置区（仅运营渲染）：顶部「全局默认阈值」输入 +「保存配置」按钮（保存后显示「✓ 已保存 · 阈值已即时生效」）；列表行内商品级覆盖阈值编辑（运营可改，老板只读展示）。
  - 老板视图：无配置区，标题旁展示「纯只读 · 无配置入口」标识；展示全局库存健康度总览卡片框架（预警商品数/已售罄数/超卖风险数，完整统计口径见 P1 Story）。
  - 口径脚注：「排序：已售罄置顶 · 其余按预计售罸天数升序（最紧迫在前）」；ZAPP 设计令牌（slate 色系、零第三方图表库、无圆角无阴影）。

## 业务规则 (Business Rules)

| 规则ID | 规则描述 | 触发条件 | 期望结果 | 备注 |
| --- | --- | --- | --- | --- |
| R-STOCK-001 | 入列判定：`stock ≤ 有效阈值` 的商品进入预警列表（有效阈值 = 商品级覆盖阈值优先，否则取全局默认阈值） | 聚合预警列表 | 满足条件的商品返回并渲染 | `stock=0` 恒入列（R-STOCK-002） |
| R-STOCK-002 | 已售罄状态：`stock = 0` 以「已售罄」特殊状态入列并置顶 | 在售商品 stock=0 | 展示「已售罄」Badge（accent），行置顶 | 售罄商品不可静默消失（决策口径⑧） |
| R-STOCK-003 | 超卖风险标识：预计售罸天数 < 7 天（到货周期）→ 琥珀 `--warning` Badge「超卖风险」 | 有销量且 `0 < stock < 日均销量 × 7` | 行内展示超卖风险标识 | 不纳入 PENDING_PAYMENT 占用（决策口径⑤） |
| R-STOCK-004 | 全局默认阈值 = 10 件 | 商品无商品级覆盖配置 | 有效阈值取 10，行内标注「全局」 | 决策口径① |
| R-STOCK-005 | 商品级覆盖阈值优先于全局默认 | 商品存在覆盖配置 | 有效阈值取覆盖值，行内标注「覆盖」 | 跑量款调高、慢销款调低 |
| R-STOCK-006 | 阈值配置仅 `role=运营` 可写；老板只读（无配置入口） | 写阈值配置（全局/商品级） | 运营 200 生效；老板/其他角色 403 | 决策口径②，对齐 domain_model 行 869 权限门禁 |
| R-STOCK-007 | 阈值配置落盘 `data/stock-config.json`，写操作即时生效、长期有效 | 保存配置 | 下一次预警查询立即反映新阈值；无过期概念 | 本 Epic 唯一写操作（决策口径⑥） |
| R-STOCK-008 | 商品软删除后其覆盖配置保留但不参与预警聚合 | 商品 status=deleted | 覆盖配置存留，不参与聚合计算 | 决策口径⑥ |
| R-STOCK-009 | 权限门禁：预警 API 仅 `role=运营 / 老板` 可访问 | 任意预警请求 | 客户/客服 403 且不返回数据；未登录 401 | 对齐 R-DASH-006 白名单模式 |
| R-STOCK-010 | 列表排序：已售罄置顶，其余按预计售罸天数升序（无销量商品置底） | 渲染预警列表 | 最紧迫商品在最前 | 原型脚注口径 |

## 验收标准 (E2E 用户旅程)

### 旅程 1：运营巡检预警列表与阈值配置 (Ref: L1-07 | SB-STAGE-06, SB-BACKSTAGE-06)
#### 场景：正常主流程——运营查看预警列表（真实库存数据）
- @e2e
- **GIVEN** 存在真实商品与库存数据：极简机械键盘(stock=3)、无线办公鼠标(8)、高清显示器(5)、桌面收纳架(0)、铝合金笔记本支架(15, 商品级覆盖阈值15)、桌面拾音氛围灯(40)，全局默认阈值=10
- **AND** 存在 `role=运营` 的登录会话，已进入「库存预警」页面（预警中 Tab）
- **WHEN** 查看预警列表
- **THEN** 返回 200，预警中列表共 5 项：桌面收纳架、极简机械键盘、无线办公鼠标、高清显示器、铝合金笔记本支架
- **AND** 桌面收纳架（stock=0）以「已售罄」状态置顶（accent Badge）
- **AND** 极简机械键盘（3 ≤ 10）与无线办公鼠标（8 ≤ 10）展示琥珀「超卖风险」Badge（预计售罸天数 2.5 / 4 天 < 7 天）
- **AND** 铝合金笔记本支架（15 ≤ 覆盖阈值15）以「覆盖」阈值入列；桌面拾音氛围灯（40 > 10）不入列，位于健康水位 Tab
- **AND** 列表排序：已售罄置顶 → 其余按预计售罸天数升序（2.5 → 4 → 16.7 → 150）
- **AND** 预警 API 为只读聚合，本次巡检无任何写操作发生

#### 场景：阈值配置即时生效（商品级覆盖 + 全局默认）
- @e2e
- **GIVEN** 运营已进入库存预警页（全局默认阈值 10，无线办公鼠标以全局阈值 10 入列）
- **WHEN** 将「无线办公鼠标」的商品级覆盖阈值设为 5 并保存
- **THEN** 保存成功提示「✓ 已保存 · 阈值已即时生效」，配置落盘 `data/stock-config.json`
- **AND** 预警列表立即刷新：无线办公鼠标（8 > 5）移出预警列表
- **AND** 再次将该商品覆盖阈值改回 10 并保存
- **THEN** 该商品重新按 `8 ≤ 10` 入列（即时生效、长期有效、可双向调整）

### 旅程 2：预警权限门禁 (Ref: L1-07 | SB-BACKSTAGE-06)
#### 场景：客服/客户角色被拒绝访问
- @e2e
- **GIVEN** 存在 `role=客服`（或 `role=客户`）的登录会话
- **WHEN** 访问 `GET /api/admin/dashboard/stock`
- **THEN** 返回 403，且不返回任何库存/预警数据
- **AND** B 端导航不展示「库存预警」入口（客户/客服不可见）

#### 场景：未登录访问被拒绝
- @api
- **GIVEN** 无有效会话凭证
- **WHEN** 访问 `GET /api/admin/dashboard/stock`
- **THEN** 返回 401

## 治理映射对齐 (Governance Mapping)

- Source of Truth: docs/baseline/domain_model.html
- Bounded Context: `data-insights`（**扩展**，新增 `stock-insight` capability taxonomy，`bc-data-insights → cap-stock-insight` Governs 边）；`Shared / Cross`（`frontend-ui` 横切支撑）；只读消费 `Catalog Context`（`Product.stock` 库存事实，不变量 `stock≥0` 不动）、`Order Context`（近7日订单销量聚合数据来源）
- Capability Taxonomy: `stock-insight`（**新增 taxonomy**，data-insights BC）；`frontend-ui`（**修改**，bc-shared → cap-ui，「库存预警」视图 + 阈值配置表单）
- Related Process Nodes: L1-05 支付确认、L1-06 履约与完成（只读数据来源）；**L1-07 经营分析（只读支流）**——新增「库存洞察」平行支流（预警列表 + 阈值配置）
- Related Service Blueprint Nodes: SB-STAGE-06（成功回流 / B 端聚合回查，数据来源）；SB-BACKSTAGE-01（`Product.stock` 库存事实来源，只读消费）；SB-BACKSTAGE-06（新增「库存数据聚合与补货建议」后台活动 + `stock-insight` 支撑能力节点，参照 sales-dashboard 支撑节点先例行 1046-1049）；SB-CUSTOMER-* 无变化
- Sync Assessment: **Yes** — 新增 `stock-insight` capability taxonomy（Domain Model 节点 + Governs 边）与 SB-BACKSTAGE-06 后台活动/支撑节点（Epic 级变化，理由同 idea.md 第 8 章）；按分层 Sync 机制，Epic 全部 Story 归档后统一执行 Baseline Sync

## 分析制品索引 (Analysis Artifacts)

- 故事详述: `epics/epic-stock-insight/analysis/narrative/story-stock-warning-list/narrative.md` — ❌ 未生成（本 Story 业务规则与 E2E 验收已完整，不额外生成）

## 交接状态 (Handoff Status)

- [x] 待开发交接 (openspec-handoff)
- [x] 已交接 (changeName: `story-stock-warning-list` 记录于 openspec/epic-stock-insight.story-list.json)
