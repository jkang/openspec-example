# Storymap: 回款与应收账款闭环 需求拆分

> Epic Key: `epic-accounts-receivable`
> 关联调研: `epics/epic-accounts-receivable/research.md`
> 关联 Idea: `epics/epic-accounts-receivable/idea.md`
> 关联原型: `epics/epic-accounts-receivable/prototypes/accounts-receivable.html`（Epic 整体，UI 唯一事实来源）
> 产出后需用户确认（HITL）※ 用户已授权全程自主

## 需求背景 (Background)

老板"看得到卖了多少、库存剩多少，但看不清楚钱收没收回来"，财务"回款在 Excel/群聊、逾期忘了催"。本 Epic 兑现 PRODUCT.md "回款节点驱动应收账款看板" 差异化承诺：**账期客户（creditDays>0）订单免现结，发货 SHIPPED 即自动转应收（金额=actualPaidCents、到期日=发货日+账期）→ 运营登记回款（部分/整单）→ 剩余/结清/逾期推导 → 老板只读应收看板**。复用 Phase 5 看板底座与 B 端权限模式；C 端零改动。

## 拆分粒度原则 (Granularity)

- Story = 完整端到端功能，按"应收产生 / 回款登记 / 看板聚合"切分：
  - `credit-customer`（产生）：客户 creditDays 账期标记（user-admin 客户详情，仅运营）→ 账期客户订单免现结 → 发货 SHIPPED 自动生成应收（金额/到期日/状态）整条链路。
  - `receipt-entry`（登记）：应收单列表（客户维度/状态/逾期过滤）→ 回款登记（金额 ≤ 剩余，部分/多次）→ 剩余递减/结清状态 整条链路。
  - `dashboard`（看板）：老板/运营只读应收总览（总应收/已回/未回/逾期指标卡 + 客户欠款集中度）整条链路（数据与登记同源）。
- 不拆到行为/UI 细节级（状态徽标样式、回款表单布局等归入对应 Story）。
- **口径贯穿**：creditDays 客户级（0=现结）；应收金额=actualPaidCents（priceCents 精确制）；到期日=发货日+creditDays；剩余=应收−已回；状态 未回/部分/结清/逾期（逾期推导态）；运营写 + 老板只读 + 客服无权。

## Story 拆分明细

| Story ID | 标题 | 角色 (Role) | 价值 (Value) | 目标 (Goal) | 依赖 | 优先级 | 状态(注1) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| story-ar-credit-customer | 账期客户与应收生成 | 运营（账期维护）/ 账期客户（下单，无感） | 客户"发货后按账期回款"的经营方式被系统承认——发货即自动入账，无需人工记应收 | `User.creditDays`（0=现结/>0=账期，客户详情展示/配置，仅运营，user-admin 修改）；账期客户订单免现结（服务端判定）；发货 SHIPPED 自动生成应收 Receivable（amount=订单 actualPaidCents、dueDate=发货日+creditDays、状态=未回款） | 无（复用 User/Order 底座） | P0 | ready |
| story-ar-receipt-entry | 回款登记 | 运营（回款执行）/ 老板（查看） | 客户打款即时登记（部分/整单），剩余/结清/逾期自动算——告别 Excel 对账、不再忘催 | 应收单列表（客户维度：应收/已回/剩余/到期/逾期标识，状态过滤）+ 回款登记（金额 ≤ 剩余，部分回款多次 → 剩余递减、结清状态）；回款流水 Receipt 落库；仅运营（客服无权） | story-ar-credit-customer（应收单来源） | P0 | ready |
| story-ar-dashboard | 老板应收只读看板 | 老板（只读决策）/ 运营（只读复核） | 一眼看应收健康度（总应收/已回/未回/逾期 + 客户欠款集中度），回款不再靠感觉 | 应收只读聚合 API + 看板 UI：指标卡（总应收/已回/未回余额/逾期金额）+ 客户欠款集中度列表（应收单数/未回/逾期/最大账期）；仅运营/老板可访问（客服/客户 403、未登录 401） | story-ar-credit-customer + story-ar-receipt-entry（数据源） | P1 | ready |

## 覆盖对账 (Coverage Reconciliation)

⚠️ 拆分前承诺项（idea/research 的 In Scope + Exit Criteria + 候选 Capability + 决策口径）：

| Epic 承诺项（来自 idea/research） | 承接 Story | 覆盖状态 |
| --- | --- | --- |
| In Scope: 账期管理（客户 creditDays 标记） | story-ar-credit-customer | ✅ 覆盖 |
| In Scope: 应收账款（履约即转应收，金额/到期日/状态） | story-ar-credit-customer | ✅ 覆盖 |
| In Scope: 回款节点登记（部分/整单） | story-ar-receipt-entry | ✅ 覆盖 |
| In Scope: 回款状态看板（老板与财务/运营视角） | story-ar-dashboard | ✅ 覆盖 |
| 决策 Q1: 账期客户免现结、发货 SHIPPED 即转应收（A） | story-ar-credit-customer | ✅ 覆盖 |
| 决策 Q2: 复用运营角色（回款登记/账期维护），老板只读，客服无权（B） | story-ar-credit-customer（账期维护）+ story-ar-receipt-entry（登记写）+ story-ar-dashboard（老板只读） | ✅ 覆盖 |
| 决策 Q3: 客户级 creditDays（0=现结） | story-ar-credit-customer | ✅ 覆盖 |
| 决策 Q4: 到期日 = 发货日 + creditDays | story-ar-credit-customer | ✅ 覆盖 |
| 决策 Q5: 一单一应收，金额=actualPaidCents | story-ar-credit-customer | ✅ 覆盖 |
| 决策 Q6: 逐单登记，部分回款多次（金额 ≤ 剩余） | story-ar-receipt-entry | ✅ 覆盖 |
| 决策 Q7: 到期未结清 → 逾期（推导态无宽限） | story-ar-receipt-entry（列表逾期标识）+ story-ar-dashboard（逾期金额） | ✅ 覆盖 |
| 决策 Q8: 不追溯存量；种子含账期客户演示 | story-ar-credit-customer（种子 + 新订单路径） | ✅ 覆盖 |
| 决策 Q9: C 端零改动 | 三 Story（纯 B 端） | ✅ 覆盖 |
| 决策 Q10: accounts-receivable 归 Order Context 扩展 | 三 Story（capability 契约） | ✅ 覆盖 |
| Candidate Capability: `accounts-receivable`（新增 taxonomy） | story-ar-credit-customer + story-ar-receipt-entry + story-ar-dashboard | ✅ 覆盖 |
| Candidate Capability: `frontend-ui`（修改：应收视图 + 看板 + 客户账期配置） | 三 Story | ✅ 覆盖 |
| Candidate Capability: `user-admin`（修改：客户详情 creditDays） | story-ar-credit-customer | ✅ 覆盖 |
| B 端承诺: 谁配置？——运营维护客户账期（低频） | story-ar-credit-customer | ✅ 覆盖 |
| B 端承诺: 生命周期？——发货触发应收 → 回款登记 → 结清/逾期 | story-ar-credit-customer（产生）+ story-ar-receipt-entry（登记） | ✅ 覆盖 |
| B 端承诺: 权限？——运营写（登记/账期）、老板只读、客服无权 | story-ar-credit-customer + story-ar-receipt-entry + story-ar-dashboard | ✅ 覆盖 |

**闭环校验**：全部承诺项（In Scope 4 / 决策口径 10 / 候选 Capability 3 / B 端承诺 3）均有 ≥1 Story 承接，**无 ❌ 未覆盖项**。

## 分析制品索引 (Analysis Artifacts)

- 用户故事地图（4 层）: `epics/epic-accounts-receivable/analysis/storymap/` — ❌ 未生成（3 Story 依赖链清晰，storymap.md 完整表达）

## 治理映射对齐

- Impacted Bounded Contexts: `Order Context`（**扩展**：新增 `accounts-receivable` capability——应收/回款实体，`bc-order → cap-accounts-receivable` 边，Baseline Sync 落位）；`User Context`（修改：User.creditDays 字段 + user-admin 客户详情账期配置）；`Shared / Cross`（frontend-ui 应收视图/看板）
- Impacted Process Nodes: 复用 L1-05 支付确认（现结不变）/ L1-06 履约与完成（账期发货触发应收）；扩展 L1-07 经营分析（只读支流：应收看板）；Baseline Sync 时定稿节点
- Impacted Service Blueprint Nodes: SB-STAGE-06（履约完成→账期应收生成）、SB-OPS-*（应收账款管理/回款登记后台活动 + 客户账期配置）、SB-BACKSTAGE-*（应收生成/回款入账后台支撑）；SB-CUSTOMER-* 无变化
- Sync Assessment: **Yes** — 新增应收/回款领域概念（Receivable/Receipt 实体 + capability + User.creditDays）属基线级变化；Epic 归档后统一 Baseline Sync

## 关联 Stories

- `epics/epic-accounts-receivable/stories/story-ar-credit-customer/story.md`
- `epics/epic-accounts-receivable/stories/story-ar-receipt-entry/story.md`
- `epics/epic-accounts-receivable/stories/story-ar-dashboard/story.md`

> 注1：Story 状态由需求侧 STATUS.md 维护。
