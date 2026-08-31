# Idea: 库存预警与补货建议 (Stock Insight)

> 关联 Epic: `epic-stock-insight`（来自 `docs/ROADMAP.md` Phase 5 Epic 5.2）
> 关联调研: `epics/epic-stock-insight/research.md`
> 产出后需用户确认（HITL）※ 本次由 lead 授权全程自主，决策口径仍标注「待用户最终确认」

## 1. 澄清业务意图 (Clarify Business Intent)

- **目标用户**：
  - **运营（库存管理/补货负责人）**：日常库存水位巡检与补货决策，最痛断货与超卖。
  - **运营（商品管理，product-admin 既有用户）**：阈值配置职责承担者（研究访谈 3），低频配置、默认值兜底、复用既有操作入口。
  - **老板（决策者，Epic 5.1 已新增只读角色）**：全局库存健康度总览，与销售看板形成经营决策闭环。
- **核心业务价值**：把"库存数字 + 销量速度"转化为**售罄前的主动预警**与**有据可依的补货建议**，解决"断货靠买家提醒、补货靠拍脑袋"的被动局面；老板一眼看到库存健康度与资金占用（"可视即价值"）。
- **硬性业务限制**：
  - 判定口径：`stock ≤ 阈值` 商品进入预警列表；`stock = 0` 以「已售罄」特殊状态入列（ROADMAP EC3 扩展）。
  - 销量速度：日均销量 = 近7日成交订单（`status ∈ {PAID, SHIPPED, COMPLETED}`）`Σ(items.quantity)` ÷ 7；预计售罄天数 = `stock ÷ 日均销量`（日维度，EC3 口径）。
  - 超卖风险标识：预计售罄天数 < 到货周期（MVP 固定 7 天）→ 琥珀标识。
  - 补货建议量 = `max(0, ⌈日均销量 × 到货周期⌉ − 当前库存)`（到货周期 MVP 固定 7 天）。
  - 只读聚合：洞察 API 只读，不改变库存/订单语义；**阈值配置是本 Epic 唯一写操作**。
  - 权限：预警/建议 API 仅 `role=运营 / 老板` 可访问，`客户 / 客服` 403；阈值配置**仅运营可写**、老板只读（对齐 domain_model.html 行 869 看板权限门禁）。
- **B 端视角**：
  - 后台怎么配置？—— 预警阈值两级配置：**全局默认阈值（10 件）+ 商品级覆盖阈值**；低频写操作，设一次长期有效；商品管理运营承担配置职责，不引入新角色。
  - 生命周期如何？—— 配置落盘 `data/stock-config.json`，**即时生效**（修改后下一次预警查询立即反映）；无过期概念，长期有效；商品软删除后其覆盖配置保留但不参与聚合。
  - 谁有权限？—— 配置写权限仅 `role=运营`；`role=老板` 只读总览（无配置入口）；沿用 Epic 5.1 白名单门禁 `requireRole('运营','老板')`。
- **C 端视角**：**本 Epic 纯 B 端，C 端无新增交互**——不改变商品浏览/购物车/下单/支付任何 C 端行为；`Product.stock` 仍是支付成功时扣减的真实库存事实（不变量 `stock≥0`），库存洞察只读消费之。

## 2. To-Be Process (目标流程)

本 Epic 不改变交易主流程（L1-01~L1-06 保持不变），在 **L1-07 经营分析（只读支流）** 内新增「库存洞察」平行支流（与既有销售看板并列）：

```
L1-06 履约与完成（交易闭环：支付成功扣减库存，stock 事实写入）
   │
   ▼
L1-07 经营分析（只读支流）【本 Epic 扩展】
   ├─ 销售看板（Epic 5.1 已交付）
   └─ 库存洞察（本 Epic）
       ├─ ① 运营/老板进入「库存预警」（role 门禁：运营/老板可入，客户/客服 403）
       ├─ ② 运营配置阈值（低频写：全局默认 10 件 + 商品级覆盖，即时生效，仅运营可写）
       ├─ ③ 系统聚合：库存水位（Product.stock 只读）+ 销量速度（近7日 items.quantity 聚合 ÷ 7）
       ├─ ④ 判定入列：stock ≤ 阈值 → 低库存预警；stock = 0 → 已售罄状态
       ├─ ⑤ 风险与建议：售罄天数 < 7 天 → 超卖风险标识；建议补货量 = max(0, ⌈日均销量×7⌉ − stock)
       └─ ⑥ 展示：预警列表（库存/阈值/日均销量/售罄天数/风险/建议量），老板只读
```

- **与现状差异**：现状断货靠买家提醒（售罄后被动补救）、补货靠 Excel/拍脑袋 → To-Be 售罄前主动预警、补货有量可依；库存与销售看板从"两块断的"变为同一经营分析支流内闭环。
- **涉及角色**：运营（配置 + 巡检 + 补货决策）、老板（只读总览）。
- **流程节点引用**：只读消费 L1-05 支付确认 / L1-06 履约与完成（库存扣减与成交订单数据来源）；扩展 L1-07 经营分析（只读支流）——不作为交易节点修改。

## 3. To-Be Journey (目标旅程)

### 旅程：运营的库存巡检与补货决策
| 阶段 | 用户动作 | 系统反应 | 情绪 | 触点 |
| --- | --- | --- | --- | --- |
| 登录进入 | 运营登录，进入「库存预警」 | 展示预警列表（低库存商品 + 超卖风险标识） | 😐 进入巡检 | B 端库存预警页 |
| 水位速览 | 看预警列表 | `stock ≤ 阈值` 商品入列，超卖风险琥珀标识、已售罄醒目状态 | 🙂 快速发现风险点 | 预警列表 |
| 原因判断 | 看单品的日均销量与预计售罄天数 | 展示决策链：日均销量 → 预计售罄天数 | 🙂 判断紧迫度 | 列表行 |
| 补货决策 | 看建议补货量，按实际到货周期调整 | 系统给出建议量（含 7 天到货假设标注） | 🙂 有据可依 | 补货建议列 |
| 调阈值 | 给跑量款（键盘）调高阈值、慢销款（氛围灯）调低 | 阈值配置即时生效，列表即时刷新 | 🙂 个性化水位线 | 阈值配置表单 |

### 旅程：老板的库存健康度总览
| 阶段 | 用户动作 | 系统反应 | 情绪 | 触点 |
| --- | --- | --- | --- | --- |
| 登录进入 | 老板登录，进入「库存预警」 | 只读总览：预警商品数 + 低库存分布 | 😐 全局速览 | B 端预警页 |
| 健康度判断 | 看预警列表与风险标识 | 快售罄商品醒目，超卖风险琥珀标识 | 🙂 判断断货风险面 | 预警列表 |
| 经营联动 | 切换「销售看板」对照销售与库存 | 销售看板 + 库存预警同支流闭环 | 🙂 销售库存联动判断 | 看板导航 |
| 只读确认 | 无任何配置操作 | 老板无阈值配置入口（只读最小权限） | 🙂 无操作负担 | — |

## 4. 产品设计思路 (Business Design Approach)

- **触发方式**：B 端后台导航新增「库存预警」入口（仅 `运营/老板` 角色可见），与「销售看板」并列，形成经营分析支流。
- **核心交互**：
  - 预警列表（主视图）：列 = 商品名 / 当前库存 / 预警阈值 / 近7日日均销量 / 预计售罄天数 / 超卖风险标识 / 建议补货量 / 状态；默认按预计售罄天数升序（最紧迫在最前）。
  - 超卖风险标识：`--warning`（#FF9A00）琥珀 Badge「超卖风险」；`stock=0` 用醒目「已售罄」状态；均区别于普通低库存行。
  - 阈值配置（运营）：顶部「全局默认阈值」输入 + 列表行内「商品级覆盖」编辑；保存后即时生效；老板视图无此区域。
  - 口径透明：UI 标注「日均销量 = 近7日销量 ÷ 7」「建议补货量按 7 天到货周期估算」，对齐决策链。
- **价值提升**：售罄前主动预警（被动→主动）、补货量有据可依（拍脑袋→数据驱动）、库存资金健康度老板可见（断货与压资金双向权衡）。

## 5. 任务类型与后续策略 (Task Type & Workflow Strategy)

- [x] **Epic**（大块需求、跨多能力/需拆分）：走需求侧漏斗 → 原型(Epic整体) → storymap 拆分 → Story → `/req:handoff`。
- [ ] Feature
- [ ] Bug Fix
- [ ] Tech Debt

确认的类型：**Epic**
后续策略说明：走需求侧完整漏斗；storymap 拆 2 个 Story（warning-list + replenish-suggestion）；创建 `openspec/epic-stock-insight.story-list.json`（status=planned）。

**调研 9 项待澄清项 → 产品决策口径（8 条，均标注「待用户最终确认」）**：
1. **阈值配置口径**（#1+#6）：全局默认阈值 = **10 件** + **商品级覆盖**（跑量款调高、慢销款调低）；不做品类差异化默认（差异化由商品级覆盖满足，保持极简）。
2. **阈值配置权限**（#2）：**仅 `运营` 可写**，`老板` 只读（对齐 Epic 5.1 老板只读定位）。
3. **日均销量窗口与无销量商品**（#3）：窗口 = **近7日**（与销售看板默认维度一致，近期代表性更强）；近7日无销量商品：**不计算售罄天数/超卖风险**，展示「暂无销量」，但 `stock ≤ 阈值` 仍按库存水位入列预警。
4. **建议补货量口径**（#4）：MVP 极简 = **`max(0, ⌈日均销量 × 7⌉ − 当前库存)`**（到货周期固定 7 天、不在后台暴露）；安全库存/个性化到货周期为 P2 增强候选。
5. **超卖风险标识口径**（#5）：**预计售罄天数 < 7 天（到货周期）** 判定（语义等价 `当前库存 < 日均销量 × 7`）；**不纳入 PENDING_PAYMENT 未支付订单占用**（MVP 避免误报，P2 候选）。
6. **阈值配置持久化与生命周期**（#7）：落盘 `data/stock-config.json`（与既有 JSON 持久化一致），**写操作即时生效**；配置长期有效无过期；商品软删除后覆盖配置保留但不参与聚合。
7. **老板演示账号**（#8）：**补充 `user_1003`（role=老板）种子演示账号**，便于 E2E 与演示（对齐 Epic 5.1 已建老板角色、补齐种子缺口）。
8. **售罄商品可见性**（#9）：`stock=0` 以**「已售罄」特殊状态入列**（最需关注，不可静默消失），补货建议照常给出（售罄天数=0）。

## 6. 候选 Capabilities (Candidate Capabilities)

参考 `docs/baseline/domain_model.html` 的 BC→Capability 映射（bc-data-insights 行 939 / cap-sales-dashboard 行 954 / Governs 边行 970 先例）：

- **新增 Capability**:
  - `stock-insight`（**新增 taxonomy**）— 库存洞察：低库存预警聚合（`stock ≤ 阈值` 入列 + 已售罄状态）、销量速度计算（近7日日均销量）、预计售罄天数、超卖风险标识、建议补货量、阈值配置读写（全局默认 + 商品级覆盖，仅运营可写）。归属 `data-insights` BC。理由：ROADMAP Phase 5 Guardrails 明确 `sales-dashboard` / `stock-insight` 双 capability 命名预留；data-insights BC 扩展；参照 Epic 5.1 新增 `sales-dashboard` 的先例。阈值配置**内聚于本 capability**（决策项 A：配置随洞察，看板自洽；不污染 Catalog 商品维护职责）。
- **修改 Capability**:
  - `frontend-ui`（Shared / Cross，`bc-shared → cap-ui` 行 966）— B 端新增「库存预警」视图（预警列表 + 补货建议列 + 阈值配置表单），复用 ZAPP 设计令牌（`--warning` #FF9A00 "low stock"）与既有 B 端导航框架（横切支撑映射）。
- **只读消费（不修改）**: `catalog-management`（Product.stock 库存事实来源）、`order-management`（订单 items 销量聚合来源）、`sales-dashboard`（同支流导航/数据底座复用）。
- **Impacted Bounded Contexts**: `data-insights`（扩展，新增 capability）、`Shared / Cross`（frontend-ui 横切支撑）、`Catalog Context`（只读消费 stock 事实）、`Order Context`（只读消费销量数据）。

## 7. 分析制品索引 (Analysis Artifacts)

- OSM（目标-策略-度量）: `epics/epic-stock-insight/analysis/osm/` — ❌ 未生成（度量已含于 ROADMAP Exit Criteria 3/4/5，story 阶段按 E2E 断言落地）
- To-Be Process（L1/L2 + 痛点）: `epics/epic-stock-insight/analysis/process/` — ❌ 未生成（本 Epic 为 L1-07 只读支流扩展，流程影响已在第 2 章结构化表达）
- To-Be Journey（体验旅程）: `epics/epic-stock-insight/analysis/journey/` — ❌ 未生成（To-Be Journey 已在第 3 章结构化表达）
- 说明：分析制品均为可选；本 Epic 以 idea.md 内嵌的结构化表达为准，不额外生成 HTML 分析物（对齐 Epic 5.1 先例）。

## 8. 治理映射对齐 (Governance Mapping)

参考 `docs/baseline/business_process.html` 与 `docs/baseline/service_blueprint.html`：

- **Impacted Process Nodes**:
  - 只读消费：L1-05 支付确认、L1-06 履约与完成（库存扣减与成交订单数据来源）
  - 扩展（只读支流）：**L1-07 经营分析（只读支流）**——在既有"销售看板"之外新增"库存洞察"聚合（库存水位 + 销量速度 + 补货建议），不作为交易节点修改
- **Impacted Service Blueprint Nodes**:
  - SB-STAGE-06（成功回流 / B 端聚合回查）— 库存与订单数据来源
  - SB-LANE-BACKSTAGE（后台核心活动泳道）— 库存洞察属后台聚合活动
  - SB-BACKSTAGE-01（商品发布与库存维护）— Product.stock 库存事实来源（catalog-management，只读消费）
  - SB-BACKSTAGE-06（后台核心活动）— 在"销售数据聚合"旁新增「库存数据聚合与补货建议」后台活动 + `stock-insight` 支撑能力节点（参照 sales-dashboard 支撑节点先例，行 1046-1049）
  - 不改变 SB-CUSTOMER-*（C 端旅程无变化）
- **Potential Domain Model Sync Triggers**: `data-insights` BC 新增 `stock-insight` capability taxonomy（新节点 + `bc-data-insights → cap-stock-insight` Governs 边，参照 cap-sales-dashboard 行 954/970 模式）；复用既有 ReadModel `Operator 库存看板`（行 877）扩展描述（补充预警/补货建议口径）；新增业务规则（库存预警判定、阈值配置权限、超卖风险口径）→ **Domain Model 需 Sync**
- **Potential Service Blueprint Sync Triggers**: SB-BACKSTAGE-06 新增「库存数据聚合与补货建议」后台活动 + `stock-insight` capability 支撑节点 → **Service Blueprint 需 Sync**
- **Preliminary Sync Assessment**: **Yes** — 新增 `stock-insight` capability taxonomy 与蓝图后台活动（Epic 级变化，参照 Epic 5.1 sales-dashboard 先例）；按分层 Sync 机制，在 Epic 全部 Story 归档后统一执行 Baseline Sync。

## 9. 需求拆分建议 (Requirement Splitting)

- **Story 1 (P0)**: `story-stock-warning-list` — 低库存预警列表 + 阈值配置：
  - 预警列表 API（`stock ≤ 阈值` 入列，含 `stock=0` 已售罄状态）；ROADMAP EC3 前半 + EC4 权限门禁扩展（客户/客服 403，运营/老板可访问）。
  - B 端阈值配置：全局默认 10 件 + 商品级覆盖，仅运营可写，写操作落盘 `data/stock-config.json` 且**即时生效**（EC3"阈值配置即时生效"）。
  - 超卖风险标识（预计售罄天数 < 7 天 → `--warning` 琥珀 Badge）。
- **Story 2 (P1)**: `story-stock-replenish-suggestion` — 补货建议：
  - 销量速度计算：近7日日均销量（复用 `buildProductRanking` items.quantity 聚合 + `resolveDashboardRange` 时间换算）。
  - 预计售罄天数 = `stock ÷ 日均销量`（EC3 后半）；建议补货量 = `max(0, ⌈日均销量×7⌉ − stock)`；无销量商品展示「暂无销量」。
  - 老板只读视角的全局库存健康度总览（预警商品数 + 低库存分布）。
- **依赖关系**：Story 2 依赖 Story 1 的库存洞察聚合底座（库存水位读取 + 权限门禁 + 预警列表框架）。
- **口径贯穿**：两 Story 共用口径（stock ≤ 阈值入列、近7日日均销量、售罄天数 = stock ÷ 日均销量、老板只读）。
- **覆盖对账**：Epic In Scope（预警列表/阈值配置/补货建议）✅；Exit Criteria 3/4/5 ✅；B 端承诺项（谁配置/生命周期/权限）✅；候选 Capability `stock-insight` ✅ / `frontend-ui` ✅。

## 10. 架构影响分析 (Architectural Impact & Ideas)

- **后端服务 (Node.js)**：
  - 新增只读聚合路由：`GET /api/admin/dashboard/stock`（预警列表：库存水位 + 日均销量 + 售罄天数 + 超卖风险 + 建议量）；复用 `resolveDashboardRange`（近7日窗口）与 `buildProductRanking` 同源销量聚合口径。
  - 新增阈值配置写路由（本 Epic 唯一写操作）：`PUT /api/admin/stock-config`（全局默认）/ `PUT /api/admin/products/{id}/stock-config`（商品级覆盖）；仅 `role=运营`。
  - 新建 `stock-config` repo（JSON 文件持久化 `data/stock-config.json`，对齐既有 fileRepo/memoryRepo 模式）；预警聚合只读消费 Product/Order，不改写交易语义。
  - 权限：复用 `requireRole('运营','老板')` 白名单中间件（对齐 R-DASH-006 / domain_model 行 869 看板权限门禁）。
- **前端 UI (Vue)**：
  - App.vue 新增「库存预警」视图（运营/老板角色可见），与「销售看板」并列导航。
  - 预警列表：表格（商品/库存/阈值/日均销量/售罄天数/风险/建议量）；超卖风险与已售罄用 `--warning` 琥珀/深色 Badge；零第三方图表库（纯 CSS）。
  - 阈值配置表单（运营）：全局默认阈值 + 行内商品级覆盖编辑；老板视图不渲染配置区。
  - 遵循 slate 色系、`rounded-none`、无阴影、真实中文数据（`docs/FRONTEND.md` 极简约束）。
- **数据模型变化**：无实体/聚合变更；`Product.stock` 不变量与扣减语义不动（只读消费）；新增独立配置持久化文件 `stock-config.json`。
- **跨域/同步问题**：无新增跨域；阈值配置写入后即时生效，无缓存/同步负担。

## 11. 确认结论 (User Confirmation)

- 调研 9 项待澄清项已在第 5 章收敛为 **8 条产品决策口径**（阈值口径/权限/销量窗口/补货量/超卖标识/持久化/演示账号/售罄可见性），均标注「待用户最终确认」。
- 方案：**纯 B 端库存洞察**（C 端无新增交互），扩展 `data-insights` BC 新增 `stock-insight` capability + 修改 `frontend-ui` 横切支撑；2 个 Story 拆分（P0 预警列表+阈值配置 / P1 补货建议）。
- 涉及 UI → 下一步进入 **prototype（Epic 整体）**，产出可交互 HTML 原型待确认。
- [ ] 已与用户确认，可进入 prototype（本次由 lead 授权全程自主，跳过 HITL；决策口径仍留待用户最终确认后定稿）
