# Idea: 回款与应收账款闭环 (Accounts Receivable)

> 关联 Epic: `epic-accounts-receivable`（来自 `docs/ROADMAP.md` Phase 7）
> 关联调研: `epics/epic-accounts-receivable/research.md`（已 HITL 确认：Q1=A 账期履约转应收 / Q2=B 复用运营角色）
> 产出后需用户确认（HITL）※ 用户已授权全程自主，仅关键决策呈报后推进

## 1. 澄清业务意图 (Clarify Business Intent)

- **目标用户**：
  - **财务/运营（回款登记执行人，复用 role=运营，决策 Q2）**：日常登记客户回款（整单或部分）、按账期盯到期、催逾期；查看客户未结清应收。
  - **老板（只读决策者）**：应收总览看板——总应收/已回/未回余额、逾期金额、客户欠款集中度；只看不登。
  - **客服（无权）**：不可见/不可操作应收与回款（钱的事收敛）。
- **核心业务价值**：兑现 PRODUCT.md "回款节点驱动应收账款看板"差异化承诺——把"回款进度在群聊、应收账款逾期无感"变为可追踪的数字化流程；产品从"电商工具"升级为"运营闭环系统"。
- **硬性业务限制**：
  - **账期客户（Q1=A）**：User 可标记为账期客户（`creditDays > 0`，如 30/45；`creditDays = 0` 为现结客户维持既有先付后货）。账期客户订单**免模拟支付结清**，履约（发货 SHIPPED）即生成应收。
  - **金额口径**：应收金额 = 订单 `actualPaidCents`（priceCents 精确制，严禁浮点）。
  - **应收到期日**：= 履约基准日（发货日 SHIPPED 时间）+ 客户账期天数。
  - **部分回款**：一笔应收可多条回款流水；剩余 = 应收 − Σ已回；状态 = 未回款 / 部分回款 / 已结清 / 逾期（到期未结清，推导态非存储态）。
  - **权限（决策 Q2）**：回款登记/账期客户标记/应收查看仅 `role=运营`；老板只读看板（`requireRole('运营','老板')` 白名单模式）；客服/客户/未登录 401/403。
  - **C 端零改动**（B 端承诺为主，调研决策 Q9）。
- **B 端视角**：
  - 后台怎么配置？—— 账期客户标记（信用账期天数）在**用户管理/客户详情**维护（运营，低频）；无全局复杂配置。
  - 生命周期如何？—— 账期客户订单发货 → 自动生成应收（到期日 = 发货日 + creditDays）→ 运营登记回款（部分/整单）→ 结清；到期未结清 → 逾期（实时推导）。
  - 谁有权限？—— 运营（登记回款/维护账期客户/查看应收）；老板只读看板；客服无权。
- **C 端视角**：无新增（账期客户为 B 端内部对客户的信用标记，不暴露给 C 端买家自身）。

## 2. To-Be Process (目标流程)

在既有交易主流程上扩展"账期客户应收支流"（不改现结客户语义）：

```
【现结客户（creditDays=0，既有语义不变）】下单 → 模拟支付 PAID → 发货 → 完成
【账期客户（creditDays>0，决策 A 新增）】
下单（PENDING_PAYMENT，可标记账期免现结）→ 发货 SHIPPED
  → 自动生成应收 Receivable { userId, orderId, amount=actualPaidCents, dueDate=发货日+creditDays, status=未回款 }
  → 运营登记回款（Receipt：整单或部分）→ 剩余应收递减 → 结清或部分回款
  → 到期日已过且未结清 → 逾期（看板推导标注，催收重点）
  → 老板应收看板只读聚合：总应收/已回/未回/逾期/客户集中度
```

- **与现状差异**：现状全客户先付后货（PAID 才发货）；To-Be 增加**账期客户**维度——发货即产生应收、回款后置，其余（浏览/下单/库存/发货/取消）复用既有流程。
- **涉及角色**：运营（账期客户维护 + 回款登记 + 应收查看）、老板（只读看板）。
- **流程节点引用**：复用 L1-05 支付确认（现结客户）/L1-06 履约与完成（账期客户发货触发应收）；扩展 L1-07 经营分析（只读支流：应收看板）或新增平行支流——治理落点见第 8 章。

## 3. To-Be Journey (目标旅程)

### 旅程 1：财务/运营登记账期客户回款
| 阶段 | 用户动作 | 系统反应 | 情绪 | 触点 |
| --- | --- | --- | --- | --- |
| 发现 | 运营进入「应收账款」 | 客户维度应收列表（未结清优先、逾期醒目） | 🙂 | B 端应收视图 |
| 定位 | 选客户 → 看其未结清应收单 | 每单显示应收额/已回/剩余/到期日/逾期标识 | 🙂 快速定位 | 应收单列表 |
| 登记 | 对某应收单登记回款金额 | 回款流水入账，剩余递减；结清 → 状态更新 | 🙂 账目清晰 | 回款登记表单 |
| 复核 | 老板查看应收看板 | 看板与登记同源（后端权威聚合） | 🙂 数据可信 | 应收看板 |

### 旅程 2：账期客户下单到应收
| 阶段 | 用户动作 | 系统反应 | 情绪 | 触点 |
| --- | --- | --- | --- | --- |
| 下单 | 账期客户（creditDays=45）提交订单 | 订单创建（免现结标记，无需模拟支付） | 🙂 | 下单 |
| 履约 | 运营发货 | SHIPPED → 自动生成应收（到期日=发货日+45 天） | 🙂 自动入账 | 发货动作 |
| 追踪 | 运营/老板查看应收 | 应收单出现（未回款状态，到期日 45 天后） | 🙂 账目实时 | 应收视图 |

## 4. 产品设计思路 (Business Design Approach)

- **触发方式**：B 端导航新增「应收账款」入口（运营可操作/老板只读）；账期客户由用户在管理（客户详情）标记 creditDays。
- **核心交互**：
  - 账期客户管理：客户详情页展示/设置 `creditDays`（0=现结 / >0=账期），仅运营。
  - 订单侧：账期客户下单自动免现结（订单标记 `paymentType=CREDIT` 语义，后端判定不信任客户端）。
  - 应收列表：客户 → 应收单（应收额/已回/剩余/到期/逾期）；登记回款（金额 ≤ 剩余，支持部分）。
  - 应收看板（老板）：指标卡（总应收/已回/未回余额/逾期金额）+ 按客户集中度列表。
- **价值提升**：回款有节点可依（告别 Excel/群聊）、逾期自动暴露（不再"忘了催"）、账期经营方式被系统承认（发货≠坏账）、老板看板闭环（销售/库存/应收三看板）。

## 5. 任务类型与后续策略 (Task Type & Workflow Strategy)

- [x] **Epic**（大块需求、跨多能力/需拆分）：走需求侧漏斗 → 原型(Epic整体) → storymap 拆分 → Story → `/req:handoff`。
- [ ] Feature / Bug Fix / Tech Debt

确认的类型：**Epic**
后续策略说明：走需求侧完整漏斗；涉及 UI（应收列表/登记/看板 + 客户账期标记）→ 先 `/req:prototype`（Epic 整体）→ storymap → Story → handoff。

**调研 10 项待澄清项 → 决策口径**：
1. **应收来源语义（Q1）** ✅ 已确认 A：账期客户（User.creditDays>0）订单免现结，履约（发货 SHIPPED）即转应收。
2. **角色（Q2）** ✅ 已确认 B：复用运营角色（回款登记/账期维护/应收查看）；老板只读看板；客服无权。
3. **账期粒度（Q3）**：客户级 `creditDays`（0=现结 / >0=账期天数），在用户管理客户详情维护（运营，低频）。
4. **到期日基准（Q4）**：**发货日（SHIPPED）**为账期起点（贸易发货/对账惯例）；账期客户订单直接发货态生成应收。
5. **应收实体粒度（Q5）**：独立应收实体，**按 客户+订单 一条应收**（一单一应收）；金额 = 订单 `actualPaidCents`。
6. **回款登记粒度（Q6）**：**按应收单逐笔登记**（金额 ≤ 剩余，支持部分回款多次）。
7. **逾期口径（Q7）**：到期日已过且剩余 > 0 → 逾期（推导态，实时标注）；无宽限期（MVP）。
8. **存量数据（Q8）**：**不追溯**存量 PAID 订单（应收从账期客户新订单起算）；种子含账期客户演示数据。
9. **B/C 边界（Q9）**：纯 B 端（财务/运营/老板）；**C 端零改动**。
10. **治理归属（Q10）**：应收/回款为**新领域概念**——倾向新增 capability 于既有 BC（见第 6/8 章，需定稿）：候选 `accounts-receivable`（Order Context 扩展 vs 独立 Finance BC，见 §6）。

## 6. 候选 Capabilities (Candidate Capabilities)

> 参考 `docs/baseline/domain_model.html` 的 BC→Capability 映射。应收/回款为**从零引入的新概念**——需确定 capability 归属。

- **新增 Capability**:
  - `accounts-receivable`（**新增 taxonomy**）— 应收账款闭环：账期客户订单履约自动生成应收、应收到期日（发货日+creditDays）、回款登记（部分/整单，金额 ≤ 剩余）、剩余应收/状态（未回/部分/结清/逾期推导）、应收只读聚合（老板看板）。
    - **归属决策** ✅ **已定稿**：Order Context 扩展（应收随订单履约产生，`bc-order → cap-accounts-receivable` 边）——应收的"源头事实"是订单履约（SHIPPED），与 Order 生命周期强耦合；被 data-insights 看板只读消费。独立 Finance BC 在本仓库单业务域粒度下偏重。
- **修改 Capability**:
  - `frontend-ui`（Shared / Cross，`bc-shared → cap-ui`）— B 端「应收账款」视图：应收单列表 + 回款登记 + 老板只读看板指标/客户集中度；客户详情账期（creditDays）配置区。
  - `user-admin`（修改，User Context）— 客户详情增加 `creditDays`（账期客户标记）展示/配置（仅运营）✅ 定稿：账期标记放 user-admin 客户详情（客户即信用主体，运营在既有用户管理维护，复用 R-ADM 门禁）。
- **只读消费（不修改语义）**: `order-management`（订单履约事实/金额来源）、`user-session` / `user-admin`（客户/权限）、`sales-dashboard` / `stock-insight`（同看板支流导航，可选）。
- **Impacted Bounded Contexts**: `Order Context`（扩展：新增 `accounts-receivable` capability + 应收实体，或独立 Finance BC）；`User Context`（修改候选：客户 creditDays 账期标记）；`Shared / Cross`（frontend-ui 应收视图）。

## 7. 分析制品索引 (Analysis Artifacts)

- OSM / Process / Journey 分析物 — ❌ 未生成（To-Be Process/Journey 已结构化表达于第 2/3 章）

## 8. 治理映射对齐 (Governance Mapping)

- **Impacted Process Nodes**（`docs/baseline/business_process.html`）：
  - 复用：L1-05 支付确认（现结客户语义不变）；L1-06 履约与完成（账期客户发货 SHIPPED 触发应收）。
  - 扩展：**L1-07 经营分析（只读支流）**——在销售看板/库存洞察旁新增「应收账款」支流（应收只读聚合），或既有 L1-06 履约后新增回款登记环节（业务支流）。**Baseline Sync 时定稿节点**。
- **Impacted Service Blueprint Nodes**：SB-STAGE-06（成功回流/履约完成——账期客户应收生成）；SB-OPS-*（B 端应收账款管理/回款登记后台活动 + 客户账期配置）；SB-BACKSTAGE-*（应收生成/回款入账后台支撑）；SB-CUSTOMER-* 无变化（C 端零改动）。
- **Potential Domain Model Sync Triggers**：应收/回款实体（Receivable + Receipt）建模、User 增 `creditDays`、capability taxonomy（accounts-receivable 及归属 BC）→ **需 Sync**（Epic 级）
- **Potential Service Blueprint Sync Triggers**：B 端新增应收账款泳道活动/看板 → **需 Sync**（Epic 级）
- **Preliminary Sync Assessment**: **Yes** — 新增应收/回款领域概念（实体 + capability + User 字段）属基线级变化；Epic 归档后统一 Baseline Sync。

## 9. 需求拆分建议 (Requirement Splitting)

- **Story 1 (P0)**: `story-ar-credit-customer` — 账期客户与应收生成：
  - User `creditDays` 字段（0=现结/账期天数），客户详情展示/配置（仅运营）。
  - 账期客户订单免现结（订单侧语义），发货 SHIPPED 自动生成应收（Receivable：amount=actualPaidCents、dueDate=发货日+creditDays、状态=未回款）。
- **Story 2 (P0)**: `story-ar-receipt-entry` — 回款登记：
  - 应收单列表（客户维度：应收额/已回/剩余/到期/逾期标识）。
  - 回款登记（金额 ≤ 剩余，支持部分回款多次）→ 剩余递减、结清状态；回款流水落库。
- **Story 3 (P1)**: `story-ar-dashboard` — 老板应收只读看板：
  - 应收总览（总应收/已回/未回余额/逾期金额指标卡 + 客户欠款集中度列表），数据与登记同源（后端权威聚合）。
- **依赖关系**：Story 1（应收产生）→ Story 2（回款登记）→ Story 3（看板聚合消费 1/2 数据）。三者均复用运营/老板权限与用户体系。
- **覆盖对账**：In Scope（账期管理 ✅ S1 / 回款登记 ✅ S2 / 看板 ✅ S3）；Exit Criteria（账期客户订单履约转应收 ✅ / 回款登记部分结清 ✅ / 老板只读看板同源 ✅ / 逾期自动标识 ✅）；B 端承诺（谁配置=运营 / 生命周期=发货触发-回款结清 / 权限=运营写+老板只读 ✅）；候选 Capability `accounts-receivable` ✅ / `frontend-ui` ✅ / `user-admin` 修改（creditDays）✅。

## 10. 架构影响分析 (Architectural Impact & Ideas)

- **后端服务（Node.js 权威实现）**：
  - `User` 增 `creditDays`（可空/默认 0）；账期客户订单免现结语义（服务端判定，不信任客户端 paymentType）。
  - 新增应收/回款仓储：`ReceivableRepo` / `ReceiptRepo`（FileRepo 双模式，`receivables.json` / `receipts.json`）。
  - 订单发货（markShipped）钩子：账期客户订单 → 生成应收（纯函数：金额/到期日/状态）。
  - 新路由：应收单列表（按客户/状态/逾期过滤）、回款登记 POST、客户 creditDays 配置、应收看板只读聚合（老板）。
  - 逾期为推导态（查询时按 dueDate + 剩余 > 0 计算），不落库。
- **Python 后端**：不对齐（无认证/客户语义覆盖，Node 权威）。
- **前端 UI（Vue）**：B 端导航新增「应收账款」（运营可操作/老板只读）+ 客户详情 creditDays 配置区；应收列表（含回款登记表单）+ 老板看板指标卡；ZAPP 令牌、无圆角阴影、真实中文数据（种子账期客户演示）。
- **数据模型变化**：User + creditDays；新增应收（Receivable：id/userId/orderId/amountCents/receivedCents/dueDate/createdAt）与回款（Receipt：id/receivableId/amountCents/recordedAt/operator）实体；`receivables.json`/`receipts.json` 落盘。
- **跨域/同步**：无新增跨域；金额 priceCents 精确制；老板看板与登记同源（后端聚合）。

## 11. 确认结论 (User Confirmation)

- 调研 10 项待澄清项已收敛：**Q1=A 账期履约转应收、Q2=B 复用运营**已确认；其余 8 项按默认口径（Q3 客户级 creditDays / Q4 发货日基准 / Q5 一单一应收 / Q6 逐单登记部分回款 / Q7 到期即逾期无宽限 / Q8 不追溯存量 + 种子演示 / Q9 C 端零改动 / Q10 应收归属倾向 Order Context 扩展）。
- 方案：新增 `accounts-receivable` capability（Order Context 扩展倾向）+ 修改 `frontend-ui` / `user-admin`（creditDays）；3 Story 拆分（P0 账期客户+应收生成 / P0 回款登记 / P1 老板看板）。
- 涉及 UI → 下一步进入 **prototype（Epic 整体）**。
- [x] 探索结论已定稿（2026-09-08 用户授权全程自主；Q10=Order Context 扩展、creditDays 落 user-admin、3 Story 拆分），可进入 prototype
