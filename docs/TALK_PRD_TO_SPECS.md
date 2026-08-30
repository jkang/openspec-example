---
name: Talk Deck — 从 PRD 到 Specs：AI 重塑需求工程
purpose: 38 页演讲 PPT 的逐页内容设计（含项目真实资产示例；主线：Coding 自动化后需求环节如何不再成为 Blocker）
updated_at: 2026-08-29
---

# 演讲 PPT 设计稿：《从 PRD 到 Specs：AI 重塑需求工程》

> 本文件只做**页面内容设计**，不做口播。每页内容都落到本项目 OpenSpec-Practice 的真实资产上：真实目录、真实文件路径、真实治理 ID、真实 Gherkin 片段、真实访谈记录。主讲人 review 后按此稿制作视觉页。
>
> **叙事主线（本次修订）**：AI 已让 Coding 环节自动化，交付瓶颈从「怎么写」前移到「要什么」。本稿以「**需求环节如何不再成为 Blocker**」为主线组织——先诊断机理（为什么慢、慢在哪），再给四条处方：**分流（Fork）→ 管线化（Pipeline）→ 资产化（Asset）→ AI 乘数（Multiplier）**。原大纲中「原型作用、反向沉淀、分类分层、三层资产、Context 清单、活文档、CI、角色转变」等全部要点保留并讲透。

---

## 全局引用约定（每页可反复引用的项目真实资产）

在展开前，先列清楚本仓库的**双工作区 + 三层资产**体系，后面每一页都直接点名引用：

| 层 / 区 | 项目里的真实载体 | 路径 / 命名 |
|---|---|---|
| 需求侧工作区 | research.md / idea.md / prototypes/*.html / storymap.md / story.md / STATUS.md | `openspec-requirements/epics/<epic-key>/`；归档 `openspec-requirements/archive/YYYY-MM-DD-<epic-key>/` |
| 开发侧工作区 | proposal.md / specs/ / design.md / tasks.md / verify.md | `openspec/changes/<name>/`；归档 `openspec/changes/archive/YYYY-MM-DD-<name>/` |
| Epic 编排 | story-list.json（跨 change 单轨队列） | `openspec/changes/archive/YYYY-MM-DD-epic-<key>.story-list.json` |
| L1 语义层 | 需求侧 story.md（E2E 旅程 + 业务规则表）＋ 业务基线 | `openspec-requirements/.../story.md`；`docs/baseline/{business_process,domain_model,service_blueprint}.html` |
| L2 契约层 | capability spec（Requirement/Scenario + 测试标签） | `openspec/specs/<kebab-capability>/spec.md`（13 个 capability） |
| L3 规格层 | design.md（架构图 + Sync Assessment）+ tasks.md（Node/Python/Frontend 拆分） | `openspec/changes/*/design.md`、`tasks.md` |
| 治理 ID | Bounded Context 映射、流程节点、蓝图节点 | `bc-order→cap-order`、`L1-04/L2-05/L3-01`、`SB-STAGE-04/SB-CUSTOMER-04` |
| 关键数字 | 21 个已归档变更 ＋ 3 个 Epic story-list 编排（coupon-system / order-lifecycle / account-system）；26 条 Cucumber E2E 场景；13 个主规格 capability | `openspec/changes/archive/`、`e2e-tests/features/*.feature` |

---

## Slide 1｜封面

- **页面内容**：
  - 主标题：从 PRD 到 Specs：AI 重塑需求工程
  - 副标题：Coding 已可自动化——需求环节如何不再成为 Blocker（基于 OpenSpec-Practice 电商系统：21 个归档变更 + 3 个 Epic 全流程 + 26 条 E2E）
  - 落款：主讲人 / 日期 / 场景
- **金句**：写代码的时代结束了，**把「要什么」讲清楚的时代**开始了。

---

## Slide 4｜议程目录（六部分）

- **页面内容**：
  1. 新现实：Coding 自动化之后，需求环节成为唯一 Blocker
  2. 需求为什么慢：一次成型 vs 流水线（第一性原理）
  3. 处方一：分流——分类 × 分侧 × 分层
  4. 处方二：管线化——需求漏斗与最小冻结单元
  5. 处方三：资产化——handoff、分层 Sync 与活文档
  6. 处方四：AI 乘数——从 PRD 写手到业务输入架构师

---

## Slide 5｜【章节页】01 — 新现实：Coding 自动化之后，需求环节成为唯一 Blocker

- **页面内容**：章节标题 + 本节 3 问（瓶颈为什么前移到需求 / SDD 如何让断点更早暴露 / 需求输入缺什么工程属性）
- **金句**：当「怎么写」不再稀缺，稀缺的就变成了「要什么」。

---

## Slide 6｜编码成本趋近于零，瓶颈必然前移到需求环节

- **页面内容**：
  - **现象**：AI 编码让「怎么写」的成本趋近于零；团队的吞吐上限从「键盘」转移到「脑子」。
  - **因果链**：开发不再慢 → 需求吞吐成为唯一瓶颈 → 「开发等需求」变成「**AI 等需求**」。
  - **深层机理**：AI 编码需要**精确、可消费的输入**（specs / 验收标准 / 测试标签）；PRD 的散文喂不饱 AI——**需求质量直接决定 AI 产出质量**，需求环节从「后勤」变成「产线入口」。
  - **项目实证**：本仓库开发侧已形成全自动闭环——21 个变更归档，Node.js + Python + Vue 双实现，`./init.sh test:all` + `./init.sh e2e:run`（26 条 Cucumber 场景）自动跑通；但**每个变更的起点都必须是 proposal / specs 这类精确输入**——输入不精确，自动化产线输出的就是「自动化地做错」。
- **关键判断**：瓶颈前移到需求不是坏事，问题是**需求环节本身还是手工作坊**——这就是本场要解的题。
- **金句**：自动化不会消除不确定性，它只会让不确定性在**入口处**结算。

---

## Slide 7｜为什么 SDD 让交付断点更早暴露在需求端

- **页面内容**：
  - **现象**：SDD 落地后开发返工下降，但断点移到需求端。
  - **因果链**：实现不再「替需求补位」→ 模糊性被原样暴露 → 断点前移到 explore/propose。
  - **项目实证 1（模糊性被逼出）**：优惠券「发券」在 explore 阶段被逼出 4 个未答问题——谁来发？发什么范围？过期怎么办？每单限几张？（见 coupon-system 的 `ideas/idea.md`）。以前一句「发券」开发就自己拍板。
  - **项目实证 2（需求缺口投影为占位符）**：系统所有订单、购物车的归属主体恒为 `user_dev`——这不是「技术债」，是「需求债」的物理形态。工程师写 `user_dev` 时，已经在替你做了「不需要真实账户」的产品决策。
  - **项目实证 3（调研用数据说话）**：account-system 的 `research.md` 记录 3 条带原始摘录的访谈——买家「页面里翻不到我自己的订单」、运营「订单列表里全是 user_dev，只能靠猜」、技术「没有真正的认证层」。
  - **关键判断**：断点前移是好事——错误在需求阶段改一行，比上线后改一段逻辑便宜（引用 `docs/QUALITY_SCORE.md` 交付底线）。
- **洞察**：SDD 像把河道挖深——开发侧不再替需求兜底，**所有「没想清楚」都以 blocker 的形态回到需求端**。所以解 blocker 必须先看清：这些 blocker 不是 SDD 制造的，是本来就存在、现在被暴露了。

---

## Slide 8｜PRD 为何在 SDD 语境下逐渐失效：模糊性、版本滞后与不可执行性

- **页面内容**（三条，每条配真实反例）：
  - **模糊性**：PRD 写「优惠按最优方式结算」。对照 `openspec/specs/coupon-management/spec.md`——它必须写成「从全场通用券与用户已持未用券中，自动推荐减免额最高的一张」，并把两张候选券算出 **5000 分 vs 10000 分** 的显式比较，得出「9折」券胜出。这就是把「最优」变成可执行断言。
  - **版本滞后**：PRD 写完就冻结。而 `specs/coupon-management` 的核销规则随变更回流——`2026-08-17-coupon-integration`（新增发放+归属过滤）之后又经 `2026-08-19-story-coupon-engine-upgrade` 扩展百分比券。文档是活的，PRD 是死的。
  - **不可执行性**：PRD 无法被测试消费。`spec.md` 每个 Scenario 带 `@unit/@api/@e2e` 标签（如「9.5 折向下取整至 77 分」= `@unit`），Cucumber 直接读 feature 文件跑 E2E。
- **洞察**：PRD 是**写给人类读的叙事**，Specs 是**写给机器执行的契约**。在 AI 时代，「不可执行」的后果被放大——因为执行者从「能猜意的人类开发」变成了「必须精确的 AI」。
- **金句**：PRD 里的每一个模糊词，都是一次推迟到实现期的决策；而在 AI 时代，决策推迟 = 产线空转。

---

## Slide 9｜核心诊断：需求输入需要具备结构化、可消费、可演进的工程属性

- **页面内容**（三个属性 + 项目落点）：
  - **结构化**：需求必须是**可分类、可分层、可分侧**的文件——kebab-case capability 路径（`openspec/specs/coupon-management/`）+ 需求侧 story.md，而不是一篇散文 PRD。
  - **可消费**：下游（开发 / 测试 / CI / **AI**）能直接读。`spec.md` 的 Gherkin + `@unit/@api/@e2e` 标签直接驱动 `node:test / pytest / Cucumber`；需求侧 story.md 的 E2E 旅程直接映射 `SB-STAGE-*/SB-CUSTOMER-*` 节点。
  - **可演进**：随代码同仓、随变更回流。开发侧 `openspec/changes/*/` 增量 → Spec Sync 合并进 `openspec/specs/` → 归档；需求侧 story.md 冻结后由 STATUS.md 跟踪生命周期，Epic 收尾再归档。
  - **演进证据**：`openspec/specs/` 现有 13 个 capability，其中 `account-management` / `user-session` / `user-admin` 三个是 account-system Epic 新增的 taxonomy——主规格会随 Epic 长大。
- **洞察**：三个属性的终点是**可测试性 + 可机读性**——「需求即测试源，需求即 AI 输入源」。需求资产与执行之间没有翻译层，这是需求工程化与文档化的分水岭。
- **金句**：需求能不能喂给 AI，取决于它是不是**结构化资产**，而不是一篇漂亮的叙事。

---

## Slide 10｜【章节页】02 — 需求为什么慢：一次成型 vs 流水线

- **页面内容**：章节标题 + 本节 4 问（需求慢的机理 / 单一流程错在哪 / 思考与操作为什么要分离 / 速度与吞吐的区别）
- **金句**：需求慢，多半不是「想不清楚」，而是**工作结构**让它慢。

---

## Slide 11｜需求慢的机理诊断：一次成型（Monolithic）的结构性缺陷

- **页面内容**：
  - **现状**：需求工作是「写一篇 PRD → 评审 → 等确认 → 修改 → 再评审 → 开工」——**一次成型、串行、不可增量**。
  - **三个结构性缺陷**：
    1. **串行等待**：评审、确认、修改全在关键路径上，一整版 PRD 确认后才能进入下一步——任何一个「待确认项」都阻塞全流程。
    2. **不可增量**：PRD 不写完不能开工；小需求也要等大文档；一个模块改了，整篇要跟着改。
    3. **不可复用**：PRD 是一次性叙事，没有可被下游直接消费、可被 AI 读取的结构——写一次、用一次、丢一次。
  - **专家判断**：这与「瀑布串行」不是一回事——问题是**需求的加工方式**没有拆分：没有中间产物、没有完成定义、没有并行窗口。
- **金句**：把需求当成「项目」来管理，它就永远是关键路径；把它当成「管线」来设计，它才能并行。

---

## Slide 12｜反模式：所有需求走「写 PRD → 评审 → 开发」一条流水线

- **页面内容**：
  - 反模式：所有需求走同一条流水线。
  - 后果：探索型被过早固化、规则型被开会拖慢、联动型被单点评估漏影响面。
  - **项目实证（三条路径的分岔）**：
    - `epic-advanced-coupon-system.story-list.json` 拆出 `story-coupon-engine-upgrade`（规则型核销引擎）与 `story-coupon-admin-panel`（后台配置含 UI）两条不同路径；
    - `epic-order-lifecycle.story-list.json` 拆出 `story-order-customer`（C 端探索型，含原型）与 `story-order-payment`（支付规则型）；
    - `epic-account-system.story-list.json` 拆出 register/login/session（C 端探索+规则混合）与 `admin-users`（B 端权限型）。
  - 结论：**流程必须分叉**——Epic 走需求漏斗，Bug Fix / Tech Debt / 简单功能直走交付侧（`openspec-requirements/config.yaml` 适用范围路由）。
- **洞察**：单一流程的隐性成本不是「慢」，而是**把不同性质的需求按同一标准裁剪**——探索型最怕过早固化，规则型最怕评审拖延，联动型最怕单点评估。需求环节要吞吐，第一件事就是**分流**。

---

## Slide 13｜第一性原理：把「思考」与「操作」分离，把「速度」与「吞吐」分开

- **页面内容**：
  - **需求工作 = 两种性质不同的工作**：
    - **思考性工作**（抽象、判断、优先级、拍板）——慢，且**只能人做**，AI 不可替代；
    - **操作性工作**（记录访谈、整理格式、拆解清单、画图、写验收标准、映射治理 ID）——快，且**可以被模板和 AI 替代**。
  - **解 blocker 的两个动作**：
    1. **减少操作性工作在需求工程师时间里的占比**（模板 + AI）——同一个需求工程师，思考时间从 30% 提到 70%，产能翻倍；
    2. **提升系统吞吐而非单条速度**——单条需求的 Lead Time 受限于「思考」本身，压缩空间有限（你没法让老板更快想清楚）；但吞吐 = 并行管线数 × 单线节拍，**分流 + 冻结 + 并行可以把并行管线数从 1 提升到 N**。
  - **题眼**：需求环节的 bottleneck 不是「思考」，而是**被操作性工作吃掉的思考时间**和**被串行流程卡住的吞吐**。
- **金句**：Blocker 的解法是**吞吐**，不是速度；是**结构**，不是加班。

---

## Slide 14｜【章节页】03 — 处方一：分流（Fork）

- **页面内容**：章节标题 + 本节 4 问（为何不能单一流程 / 三类如何判定 / 需求侧为什么独立 / 三层资产谁拥有）
- **金句**：分流的第一刀，是给需求分岔路口——**不同性质的需求，走不同深度的管线**。

---

## Slide 15｜探索型、规则型、联动型需求的判定逻辑

- **页面内容**（三类 + 判定问句 + 项目打标）：
  - **探索型**：目标清楚、方案未定 → 问「我们清楚要做什么吗？」，不确定 → 探索型。打标：`story-order-customer`（C 端订单可见，UI 未定，需原型）。
  - **规则型**：方案清楚、规则密集 → 问「有没有一堆业务规则/状态/边界/安全约束？」。打标：优惠券核销（`coupon-management`）、订单状态机（`order-management`）、账户注册（`R-REG-001~007` 七条规则）。
  - **联动型**：跨多个 Bounded Context → 问「会不会动到多个模块？」。打标：`2026-08-17-coupon-integration` 同时改 `coupon-management`（新增）+ `order-management`（修改）+ checkout 结算 `discountCents/totalCents`；`story-account-system-session` 同时动 User / Order / Cart 三个 Context。
- **洞察**：三问的顺序是**递进收敛**的——先问「做什么」（不确定→探索），再问「多少规则」（密集→规则型），最后问「动几个模块」（跨域→联动）。判定不是平行打分，是漏斗式的排除。

---

## Slide 16｜三类需求的差异化路径（对应 SDD 流程分支）

- **页面内容**：
  - **探索型（Epic 级）**：需求漏斗 `research → explore → prototype → storymap → story`，HITL 逐门禁确认 → `handoff`。对应 `req-sdd.yaml`（version 4）的 artifact 链。
  - **规则型（可直走）**：`proposal → specs → design → tasks`，测试标签分层（`@unit/@api/@e2e`）→ 门禁。对应 `spec-driven.yaml`（version 2）与 `config.yaml` 的 specs 规则。
  - **联动型**：治理映射对齐 → 影响分析（design.md 的「Domain Model Sync Assessment」与「Service Blueprint Sync Assessment」两节）→ 分层 Sync 判定。
  - **技术债（无外部行为变更）**：`skip_specs: true`，仅 design + tasks。
  - **项目实证**：`2026-08-23-story-order-customer/design.md` 的 Sync Assessment——Service Blueprint `Needs Sync: Yes`（C 端客户动作新增「查看我的订单」）、Domain Model `Needs Sync: No`（显式 no-op，仅只读查询）。**同一变更，两个基线一改一不改**——这就是差异化的颗粒度。
- **洞察**：差异化路径的收益是**每一类需求都只付出必要成本**——回应「SDD 太重」的最好方式不是解释，而是展示规则型需求可以 4 个文件走完、Bug Fix 可以直走不进门。**分流直接消灭「小需求排队等大流程」这一 blocker 源头**。

---

## Slide 17｜分侧：需求侧为什么必须独立于开发侧

- **页面内容**：
  - **架构**：`openspec-requirements/`（需求侧，PM 专属）与 `openspec/`（开发侧）平级隔离；需求侧 schema 独立（`req-sdd` v4），开发侧 schema 独立（`spec-driven` v2）。
  - **职责**：需求侧只做大块 Epic 漏斗（业务面），开发侧从 proposal 起步（行为面）；Bug Fix / Tech Debt / 简单功能**不进门**。
  - **项目实证（结构差异即职责差异）**：
    - 需求侧 `epics/account-system/`：research / idea / prototypes(4页) / storymap / stories(4个) / STATUS.md；
    - 开发侧 `changes/2026-08-29-story-account-system-register/`：proposal / specs / design / tasks / verify——**没有 story.md、没有 prototypes**，因为业务面已前移并冻结在需求侧。
  - **为什么不合并**：业务语义变化慢、实现细节变化快。把两者放同一个变更目录里，任何一次实现调整都会污染业务评审记录；分侧后开发侧可自由迭代 L2/L3，L1 不受扰动。
  - **单一状态源**：`STATUS.md` 串起需求侧生命周期（阶段状态 / Story 状态 / Epic 生命周期），开发侧归档后由 lead 回填——**跨侧信息孤岛是 blocker 的隐身衣，STATUS.md 让它无处可藏**。
- **金句**：把「该由谁冻结」和「该由谁演进」放进目录结构里，流程就少了一半的口头协调。

---

## Slide 18｜三层资产模型：L1 语义层、L2 契约层、L3 规格层（谁拥有、谁冻结）

- **页面内容**（三层 + 两侧归属 + 按需建设矩阵）：
  - **L1 语义层**（需求侧，冻结）：对齐「做什么、为什么」。载体：需求侧 `story.md`（E2E 旅程 + 规则表，如 R-CUS-001~005 / R-SES-001~007）+ `docs/baseline/` 三份 HTML。
  - **L2 契约层**（开发侧，演进）：定义「什么行为算对」。载体：`openspec/specs/<capability>/spec.md` 的 Requirement（SHALL/MUST）+ Scenario（Gherkin）+ 测试标签。
  - **L3 规格层**（开发侧，演进）：拆「怎么做」。载体：`design.md`（架构图 + Process Delta + Sync 预判）+ `tasks.md`（Node.js / Python / Frontend 拆分）。
  - **关键洞察**：这三层过去糊在一篇 PRD 里互相污染；分层后 `design.md` 改实现不影响 L1 语义，`spec.md` 改契约不影响 L3 任务。**分层不是文档组织方式，是变更隔离边界。**
  - **按需建设矩阵**：

    | | L1 语义层 | L2 契约层 | L3 规格层 |
    |---|---|---|---|
    | 探索型 | ★ 优先（`story-order-customer` 先定旅程） | 确认后补齐 | 迭代 |
    | 规则型 | 少量 | ★ 优先（`coupon-management` 核销规则） | 快速落地（tasks 按模块拆） |
    | 联动型 | ★ 优先（治理映射：`bc-order→cap-coupon`） | 契约对齐 | 跨模块任务 |

  - 结论：不是每层都建满。建满是浪费，**按需建设才是工程化**。
- **金句**：三层资产的核心问题不是「怎么分层」，而是「**每一层由谁拥有、谁冻结、谁演进**」——边界清晰，变更才不互相踩。

---

## Slide 19｜【章节页】04 — 处方二：管线化（Pipeline）

- **页面内容**：章节标题 + 本节 5 子题（漏斗六步 / HITL 与只收集不转化 / 原型两作用 / 反向沉淀 / 冻结与覆盖对账）
- **金句**：把「一次成型的文档」变成「六步流水线」，是需求环节从项目变成产线的关键一跃。

---

## Slide 20｜需求漏斗六步总览：research → explore → prototype → storymap → story → handoff

- **页面内容**（六步 + 每步产物 + HITL 门禁）：
  1. **research**：`research.md`——只收集不转化（背景/对象/访谈原始记录/约束/疑问）。
  2. **explore**：`idea.md`——转化（意图澄清 / To-Be Process / To-Be Journey / B/C 双端 / 候选 Capabilities）。
  3. **prototype**：`prototypes/*.html`——**Epic 整体一次完成**（拆分前），UI 门禁。
  4. **storymap**：`storymap.md`——需求拆分 + **覆盖对账（强制）**。
  5. **story**：`stories/<key>/story.md`——业务面唯一冻结交付物（用户场景 / 规则表 / E2E 验收 / 治理映射）。
  6. **handoff**：合成开发侧 proposal，登记 `story-list.json`，回填 STATUS.md。
  - 每步产出后**必须 HITL 确认**才进下一步（`req-sdd.yaml` 的 HITL 强制门禁）。
- **洞察**：漏斗的本质是**逐级提高信息的确定性**——从「事实」（research）到「解读」（explore）到「具象」（prototype）到「边界」（storymap）到「契约」（story）。**每一级都有明确产物和完成定义**，这正是流水线与「写一篇大文档」的区别：任何一步被打断，损失是单步的，不是整篇的。

---

## Slide 21｜HITL 门禁与「只收集不转化」：把事实与解读分离

- **页面内容**：
  - **research 的纪律**：只收集。`account-system/research.md` 内嵌 3 条访谈原始记录（对象/时间方式/原始摘录/关键信号）——买家「翻不到我自己的订单」、运营「只能靠猜」、技术「没有真正的认证层」。**不转化**：调研时不做产品设计（那是 explore 的职责）。
  - **explore 的转化**：基于已确认的 research，产出 To-Be Process（As-Is vs To-Be 差异表：`user_dev` → 真实 `userId`、无会话 → 持久会话）+ To-Be Journey（旅程 A 新买家首次购买 / 旅程 B 运营定位订单）+ 4 个候选 Capabilities。
  - **门禁意义**：research 未确认禁止 explore；story.md 未确认禁止 handoff（`SDD_WORKFLOW.md` 适用范围检查）。
- **洞察**：HITL 门禁是**决策点**不是「审批点」——它强迫每个「解读」都站在已确认的「事实」上，**防止早产设计**（调研没做完就开始画方案，是需求返工的最大来源）。访谈原始摘录是一手证据，防止需求在口头传递中失真。
- **金句**：先有可引用的「原话」，才有可辩护的「设计」——**这步省不得，但它是最不该人工重复的一步**（记录整理交给 AI）。

---

## Slide 22｜原型的真正作用：认知对齐与范围确认（不是高保真设计稿）

- **页面内容**：
  - **误区**：原型 ≠ 高保真设计稿，≠ 最终 UI 成品。
  - **作用一·认知对齐**：`prototypes/order-customer.html` 把「我的订单」视图做成可交互——列表（各状态）、详情展开（商品快照/金额/券/状态轨迹），让 B/C 双端对「长什么样」达成同一画面。**这是成本最低的共识机制：让分歧发生在纸上，而不是上线后。**
  - **作用二·范围确认**：`story.md` 的 Out of Scope 明确写出——C 端取消订单不在本 Story（由 B 端负责）、不做多用户切换、不做分页。**原型确认过的画面 + 显式排除的边界 = 范围契约。**
  - **时机与门禁**：需求侧在拆分前对 **Epic 整体**做一次原型（account-system 一次产出 register/login/session/admin-users 4 页，覆盖 B/C 双端）；涉及 UI 的 Epic **无已确认原型不得拆分/交接**（UI 门禁）。
  - **规范约束**：`docs/FRONTEND.md`——禁止圆角/阴影/装饰 Emoji、slate 色系、真实数据（严禁 foo/test 占位）、全中文、Vue 3 + Tailwind (CDN)。
- **洞察**：原型在需求管线里的作用不是「美工前置」，而是**把「我以为是」和「你以为」之间的信息差，用一次交互演示清零**。这个作用在 AI 时代更值钱——因为 AI 编码会严格按确认过的交互长出来，**原型就是给 AI 的「长相」输入**。
- **金句**：原型是需求管线里**最便宜的一次对齐**——它解掉的是 blocker 里最贵的那个：理解偏差。

---

## Slide 23｜反向沉淀机制：原型确认 → 提取规则 → 编写 Specs → 进入代码仓

- **页面内容**（四步推进，用 `story-order-customer` 走一遍）：
  1. **原型确认**：HITL 锁定 `order-customer.html`，作为 **UI 逻辑唯一事实来源**。
  2. **提取规则**：从交互里提炼成业务规则表 `R-CUS-001~005`——订单归属（仅当前 userId）/ 倒序展示 / 状态中文化（待支付…已取消）/ 状态轨迹 / 详情完整（商品快照+金额+券）。
  3. **编写 Specs**：规则逐条转成 Gherkin——「我的订单列表渲染」`@e2e`、「他人订单不可见」`@api`（对应 `R-CUS-001` 归属隔离）。
  4. **进入代码仓**：specs 归到 `openspec/specs/order-management/` + 新增 `frontend-ui/` 规范，与 Vue 前端同仓、同版本演进。
- **洞察**：反向沉淀是「从具象到契约」的翻译——**原型里的每一次点击，都能在规则表里找到一行，在 spec 里找到一个 Scenario**。这个机制保证 UI 逻辑不丢：原型确认了什么，契约就冻结什么，测试就验证什么。
- **金句**：点击 → 规则 → 断言，一条链到底——**UI 需求从此不再「交付即失忆」**。

---

## Slide 24｜覆盖对账：需求范围的「可审计清单」

- **页面内容**：
  - **规则**（storymap 强制步骤）：拆分前先列出 Epic 的**全部承诺项**（In Scope / Exit Criteria / B 端承诺 / 候选 Capability / Explore 护栏 / 约束），拆分后逐项对账，必须有 ≥1 个 Story 承接。
  - **项目实证**：account-system 的 storymap.md 对账表——**14 项承诺项全部 ✅ 覆盖**。截取关键几行：
    - Exit Criteria ②「未登录不可下单/查看我的订单」→ `story-account-system-session` ✅
    - B 端承诺「用户管理入口（列表/检索/详情/禁用，运营权限）」→ `story-account-system-admin-users` ✅
    - Candidate Capability `user-session`（新增 taxonomy）→ login + session 两个 Story ✅
    - 约束「禁用用户会话失效」→ admin-users（禁用动作）+ session（会话校验拦截）✅
  - **双向价值**：既防「说了没做」（承诺项无人承接），也防「做了没说」（无承诺项的隐式扩范围）。
- **洞察**：覆盖对账把范围管理从「会议口头确认」变成**文件可审计**——这是需求侧唯一能机器检查的环节，也是**QA 对抗审查的重点抓手**。它解决的是 blocker 里最隐蔽的一种：**以为做了、其实没做**。
- **金句**：范围不靠人记，靠一张能对账的表——**漏项在拆分时发现，成本是改一行表格；在验收时发现，成本是一个迭代**。

---

## Slide 25｜Story：业务面唯一冻结交付物 + 最小冻结单元解耦等待

- **页面内容**（以 `story-account-system-session/story.md` 为例）：
  - **结构**：用户场景（B/C 双端视角）→ 范围（In/Out of Scope）→ 原型参考 → 业务规则表 → E2E 验收（Given/When/Then）→ 治理映射对齐 → 交接状态。
  - **规则表即契约**：`R-SES-001~007`——会话持久化、全局校验、订单归属查询（替代 user_dev）、未登录引导回跳、退出销毁、禁用即失效、下单绑定 userId。每条含触发条件 + 期望结果。
  - **E2E 旅程映射治理锚点**：旅程 1 映射 `L1-04, L1-06 | SB-STAGE-04, SB-STAGE-06, SB-CUSTOMER-04, SB-CUSTOMER-06`；「禁用用户会话失效」场景是 **B 端联动 Story** 的跨 Story 验收。
  - **明确边界**：Out of Scope 写死「会话过期自动续期（待确认）」「多设备会话并行」「购物车跨端同步」——**把「以后再说」变成「显式不承诺」**，消灭隐性阻塞。
  - **不含行为规格**：specs（Story-specs）由开发侧在 proposal 后按 capability 拆分生成——**业务面冻结，实现面开放**。
  - **★ 最小冻结单元（解 blocker 的关键机制）**：Story 是需求管线的最小交付单元。**一个 Story 确认即可 handoff 开工，不必等整个 Epic 冻结**——account-system 的 register 冻结后立即交接，login/session/admin-users 继续在需求侧加工。**需求与开发两条流水线由此并行**：开发侧处理 Story N 时，需求侧正在加工 Story N+1。
- **洞察**：blocker 的典型形态是「整个 Epic 想清楚才能开工」。**最小冻结单元把等待颗粒度从「Epic 级」降到「Story 级」**——这是需求环节吞吐提升的最大单点。
- **金句**：冻结的最小单位越小，等待的链条越短——**Story 级冻结，是需求流水线并行化的开关**。

---

## Slide 26｜用产能指标管理需求管线（像管开发一样管需求）

- **页面内容**（四个指标 + 项目载体）：
  1. **漏斗 WIP（在制 Story 数）**：限制同时在漏斗中的 Epic/Story 数量——WIP 超过上限就是显式过载。载体：`STATUS.md` 的 Story 交付状态表（ready → handoff → dev-in-progress → done）。
  2. **Story Lead Time（想法 → handoff）**：按周跟踪；持续变长说明漏斗某步堵了（通常是 HITL 等待）。载体：STATUS.md 阶段状态表。
  3. **HITL 一次通过率**：被打回次数 / 提交次数——衡量「操作性产出质量」；通过率低说明该步的完成定义不够清晰。载体：各阶段 skill 自动更新 STATUS.md。
  4. **覆盖对账漏项数**：每次 storymap 必须为 0（account-system 是 14/14 ✅）——**这是需求侧唯一可自动检查的硬指标**。
  - **辅助工具**：`story-list.json` 跨 change 单轨队列（登记/更新 done/孤儿对账）让 Epic 内所有 Story 状态对全员可见。
- **洞察（多年经验）**：需求阻塞从来不是突然发生的，是**没有指标让它显形**。用开发的 WIP/Lead Time 语言管理需求，需求环节就从「黑盒」变成「可诊断的产线」——**能测的阻塞，才是能解的阻塞**。
- **金句**：需求团队不缺努力，缺的是**一个让阻塞无处藏身的仪表盘**。

---

## Slide 27｜【章节页】05 — 处方三：资产化（Asset）

- **页面内容**：章节标题 + 本节 4 子题（handoff 交接 / Context 经营清单 / 目录与分层 Sync / 活文档与 CI）
- **金句**：需求「写一次、用多次」——资产化让需求产出从「一次性消耗品」变成「可复用资本」。

---

## Slide 28｜handoff：合成 proposal，开发侧从 proposal 起步

- **页面内容**：
  - **机制**：`/req:handoff` 读取已确认的 story.md（业务面），在开发侧创建 change 并**合成 proposal.md**——Why ← 用户场景；What ← 范围；Capabilities ← idea 候选 Capabilities；Alignment ← 治理映射；Impact ← 架构影响。
  - **强制约束**：开发侧**不重复** explore / 原型 / story（均已前移到需求侧）；行为规格（Story-specs）由开发侧在 proposal 后按 capability 拆分生成，需求侧不生成 specs/。
  - **项目实证**：`2026-08-29-story-account-system-register/proposal.md`——
    - New Capability：`account-management`（新增 taxonomy，理由：既有 10 个 capability 均无账户认证能力）；
    - Impacted Bounded Context：**User Context（新增 BC，需标注）**，属基线级新增，Epic 归档后由 Baseline Sync 统一回流；
    - Process Alignment：`L1-03 加购与准备` 新增「结算前身份前置」子流程；Service Blueprint：`SB-STAGE-01/03`、`SB-CUSTOMER-01/03` 标为**修改**（复用结构，不新增阶段）。
  - **交接配套**：登记 `story-list.json`（status=in_progress, changeName）+ 回填需求侧 story.md 交接状态 + STATUS.md（Story → handoff）。
- **洞察**：handoff 是**单次翻译、双向引用**——需求侧资产（story.md）不被复制进开发侧，而是被 proposal **链接引用**；proposal 里每一项 Capability / BC / 流程 / 蓝图声明都带着「新增/修改/复用」的显式标注。**这正是影响分析的种子，也是 AI 最容易接手的一步**。
- **金句**：交接的产物不是一份文档，而是一张**「改了什么、动到谁」的声明清单**。

---

## Slide 29｜业务 Context 经营清单：目标、场景、术语、边界、异常

- **页面内容**（五要素 + 真实例子）：
  - **目标**：`story-order-customer` 的目标写死「让买家可见全部订单与实时状态，补全下单→支付→(发货)→买家可见闭环」。
  - **场景**：`GIVEN 当前用户存在多个订单（待支付/已支付/已发货/已完成/已取消）`。
  - **术语**：`priceCents` 统一「价格」以**分**存，杜绝浮点（`docs/ARCHITECTURE.md`「所有金额用整型分」）；`PENDING_PAYMENT→PAID→SHIPPED→COMPLETED/CANCELLED` 状态机在 story 与 spec 两层保持一致。
  - **边界**：账户体系 In Scope（注册/登录/会话）vs Out of Scope（第三方 OAuth / 积分会员），见 `docs/ROADMAP.md` 与 `story.md` Out of Scope。
  - **异常**：安全语义也沉淀在需求层——`R-LOG-002`「凭证不区分账号不存在/密码错误，统一提示『手机号或密码不正确』」**防账号枚举**；取消仅限待支付、且取消无库存与券变化（`order-management/spec.md`）。
- **洞察**：Context 经营清单把需求从「功能清单」升级为**领域语义快照**——术语、边界、异常这些「看不见的部分」，恰恰是跨模块协作和 AI 校验最容易失守的地方。**安全不是上线后的补丁，是需求层的规则。**
- **金句**：需求工程管的不只是功能，还有**领域语义的守恒**——术语错了，bug 在代码里开花。

---

## Slide 30｜Specs 在代码仓中的目录结构与版本同步策略

- **页面内容**（真实目录树）：
  - 主规格区（契约，增量合并后的最新态）——**13 个 capability**：
    ```
    openspec/specs/
      coupon-management/  order-management/  cart-management/  checkout-management/
      catalog-management/  product-query/  payment/  frontend-ui/
      error-handling/  domain-model/
      account-management/  user-session/  user-admin/        ← Phase 4 新增
    ```
  - 需求侧工作区（业务面，唯一冻结交付物）：
    ```
    openspec-requirements/epics/<epic-key>/
      research.md  idea.md  prototypes/*.html  storymap.md
      stories/<story-key>/story.md  STATUS.md
    ```
  - 开发侧活跃变更区（增量 delta；handoff 场景 = proposal/specs/design/tasks/verify）：
    ```
    openspec/changes/<name>/
      proposal.md  specs/<capability>/spec.md  design.md  tasks.md  verify.md
    ```
  - 归档区：开发侧 `openspec/changes/archive/YYYY-MM-DD-<name>/`（21 个变更 + 3 个 story-list.json）；需求侧 `openspec-requirements/archive/YYYY-MM-DD-<epic-key>/`（保留 research/idea/prototypes/storymap/stories 完整交付记录）。
  - 同步策略：变更完成经 Spec Sync 合并入主规格 → 归档；Epic 全部 Story 归档后 → Baseline Sync + Roadmap 更新。
- **洞察**：目录即流程——看到路径就知道「这是哪一侧、什么阶段、冻结还是演进」。版本同步的本质是**两个时间尺度**：变更级的小步快跑与 Epic 级的整段沉淀。
- **金句**：让目录结构替你表达流程，人只需要走，不需要记。

---

## Slide 31｜分层 Sync：Spec Sync（变更级）× Baseline Sync（Epic 级）

- **页面内容**：
  - **Spec Sync（/opsx:sync，每个 change 归档前）**：把 `changes/<name>/specs/` 增量合并入 `openspec/specs/`——保证**下一个 Story 消费最新契约**（Story 间有依赖，如 login 依赖 register 的用户池）。
  - **Baseline Sync（/opsx:baseline/sync，Epic 全部 Story 归档后）**：把 Epic 沉淀的认知回流 `docs/baseline/` 三份 HTML——**避免单个 Story 中间态污染基线**；含显式 No-op 判定（无变化必须写明理由，禁止静默跳过）。
  - **项目实证（account-system 的完整分层链路）**：4 个 Story 各自 Spec Sync（`account-management` / `user-session` / `user-admin` 三个新 taxonomy 依次进入主规格）→ 全部归档 → Baseline Sync **新增 User Context BC** + 3 个 capability 映射 + Roadmap 更新（Phase 4 完成）。
  - **反例对照**：`story-order-customer/design.md` 的 Sync Assessment 已预判——Service Blueprint 要改（`SB-CUSTOMER-06` 补「查看我的订单」）、Domain Model 显式 no-op（仅只读查询）——**预判写进 design，Sync 阶段按预判执行**，不让基线漂移。
- **洞察**：分层 Sync 是「小步快跑」与「文档稳定」的平衡解——Spec 层跟着变更走（快），Baseline 层跟着 Epic 走（稳）。**如果只有一种节奏，要么文档永远落后（下游等），要么基线永远在改（所有人一起乱）。**
- **金句**：Spec 同步到变更，Baseline 同步到 Epic——**节奏分层的本质是给「快」和「稳」各自一条跑道**。

---

## Slide 32｜业务语义「活文档」+ 轻量级 CI + 渐进式建设

- **页面内容**：
  - **术语表（活文档）**：领域词汇唯一定义。`priceCents`（整型分，防浮点）、券类型 `FLAT`/`PERCENTAGE`、券状态 `UNUSED/USED`、用户状态 `正常/已禁用`、订单状态机五态——在 `domain_model.html` 与各 capability spec 中保持一致；`user-session/spec.md` 里 `sessionToken → userId` 映射是会话契约的核心。
  - **字段映射**：业务语义 ↔ 接口/模型字段。`order-management/spec.md` 里 `discountCents`/`couponId`/`totalCents` 一眼对应 `api 域` 与 `Order` 实体（见 `2026-08-17-coupon-integration` 的 Impact 章节）。
  - **轻量级 CI**：`openspec validate`（schema，开发侧）→ `./init.sh test:all`（Node + Python）→ `./init.sh e2e:run`（Cucumber E2E，8 个 feature 文件、26 条场景，覆盖交易/订单生命周期/账户体系/持久化/冒烟）。
  - **门禁实证**（`verify.md` 的 Hard/Soft Gates 分栏）：Hard Gates（schema validate / node test / python test / frontend build）必须 PASS；Soft Gates（E2E cucumber）记实际场景数，**不允许标「E2E 未纳入」**。`story-order-customer/verify.md`：65 node + 12 python PASS，10 scenarios / 46 steps 全绿。
  - **渐进式建设**：先对核心交易链路（订单/库存/回款）建满三层，再推广次优先级。对应 Phase 3 `epic-order-lifecycle` 收官 → Phase 4 `epic-account-system`（用户资产）→ 下一步 Phase D `epic-accounts-receivable`（回款与应收账款，见 `docs/ROADMAP.md`）。
  - **需求侧质量兜底**：`req-sdd` 不受 `openspec validate` 覆盖——需求制品质量由 **QA 对抗审查**兜底 + 治理锚点必须真实引用 `docs/baseline/*.html`。
- **洞察**：资产化的最终形态是**「文档即现状、需求即测试源」**——活文档的「活」不在更新频率，而在**变更的触发信号被显式定义**（六类蓝图信号 + 五类领域模型信号）。没有触发信号，文档更新全靠自觉——那和 PRD 没区别。
- **金句**：门禁的价值不是拦住代码，而是**让「完成」有可验证的定义**——定义越清晰，blocker 越无处可赖。

---

## Slide 33｜【章节页】06 — 处方四：AI 乘数（Multiplier）

- **页面内容**：章节标题 + 本节 3 子题（AI 如何放大需求产能 / 需求缺口回流闭环 / 需求工程师新角色）
- **金句**：AI 不会替你决策，但能把你的**操作性工时**吃干净——这本身就是产能翻倍。

---

## Slide 34｜AI 加速闭环：生成草稿、校验一致性、顺治理映射做影响分析

- **页面内容**（三个介入点 + 项目落点 + 产能乘数逻辑）：
  - **生成（吃掉记录与起草）**：从 `idea.md` 的「业务设计思路」辅助产出初始 `spec.md` 草稿与验收标准（Gherkin + 边界反例）；需求侧 story.md 的 E2E 旅程初稿与治理映射建议（L1/L2 + SB-STAGE-* 候选）；research 访谈记录的整理与关键信号提取。**这对应第一性原理里的「操作性工作」——全部交给 AI。**
  - **校验（吃掉一致性检查）**：对照 `spec.md` 的 `@unit/@api/@e2e` 检查实现是否一致，揪出「规格写了但代码没做」或术语漂移（如金额写成 `float` 违反 `priceCents`）；在需求侧检查规则表与验收标准是否互相矛盾（如 R-SES-003 归属查询 vs 旅程 1 的断言）。
  - **影响分析（吃掉图遍历）**：改一个 Bounded Context 时，顺着 `domain_model.html` 的 `bc-order→cap-order` 映射提示哪些下游 capability 与基线要连带更新。`story-account-system-session` 同时动 User/Order/Cart 三 Context 的跨侧影响，正是 AI 顺映射枚举出的。
  - **产能乘数**：需求工程师从「写手」变成「审稿人/决策者」——同一人 + AI 支撑 N 条并行漏斗；HITL 门禁不变，**AI 给草稿与校验，人做确认与决策**。
- **洞察**：AI 在需求工程里的高杠杆点不是「写文档」，而是**顺着治理映射做图的遍历**——BC→capability 是有向图，AI 天然适合做影响面枚举与一致性校验这类图算法活；而人的 HITL 决策是图中唯一的「语义检查点」。
- **金句**：AI 替代的是「打字」，不是「抽象与决策」——**但仅打字这一项，就足以让需求团队吞吐翻倍**。

---

## Slide 35｜双向闭环：开发中的需求缺口如何回流

- **页面内容**：
  - **规则**：若开发中发现需求缺口（`SDD_WORKFLOW.md`），**回关需求侧 skill**（research/explore/storymap/story），不擅自改需求侧规划。
  - **项目实证（需求缺口即新 Story）**：`user_dev` 占位在 order-lifecycle 阶段只是「技术债」；到了 Phase 4，它被识别为「需求缺口」——真实账户体系缺失，于是立项 Epic `account-system`（research 调研触发段明确写了这一点）。**同一个现象，从实现侧看是技术债，从需求侧看是新 Epic。**
  - **机制配套**：STATUS.md 单一状态源 + story-list.json 跨 change 队列 + lead 回填 done/archived，让缺口回流有据可查、有状态可追。
- **洞察**：闭环不是「文档来回改」，而是**缺口的发现位置决定它的处理路径**——实现期发现 → 回需求侧登记/重评审；探索期发现 → 直接问 HITL 问题。**这避免了「开发顺手就改了需求」这个最隐蔽的漂移源**——它同时也是 blocker 的回流阀：需求侧没接住，缺口就变成隐性技术债。
- **金句**：需求缺口是产品最诚实的反馈通道——问题只在于它有没有一条回流的路。

---

## Slide 36｜三重转变：设计输入结构、持续维护资产、闭环协同

- **页面内容**（三条 + 项目映射）：
  1. **从「写一篇 PRD」→「设计输入结构」**：设计分类（三类）、分层（三层）、分侧（双工作区）、判定逻辑、模板体系。落到需求侧模板（`openspec-requirements/templates/`：research / idea / prototype / storymap / story / STATUS 六套）+ 开发侧模板（`openspec/templates/`：proposal / spec / design / tasks / verify 五套）+ `req-sdd.yaml` / `spec-driven.yaml` 的生成规则。
  2. **从「交付即结束」→「持续维护资产」**：像维护代码一样维护术语、Specs、基线。落到 `docs/baseline/` 三份 HTML 随分层 Sync 回流；STATUS.md + story-list.json 跟踪 Epic 生命周期。
  3. **从「抛给开发」→「闭环协同」**：与 AI、开发、测试在 Specs 资产上协作——`@unit/@api/@e2e` 标签分工、HITL 检查点、需求缺口回流通道（开发发现缺口回关需求侧 skill）。
- **洞察**：三重转变的共同点是把需求工程师从「内容生产者」变成「**系统设计者**」——你不再直接写需求，你设计需求被生产、被校验、被演进的方式。**这也是「需求不再 blocker」的组织答案：把产能建在结构上，而不是建在个人身上。**
- **金句**：好的输入结构，让 80% 的需求在生成时就接近正确——剩下的 20% 留给 HITL。

---

## Slide 37｜三项核心能力：业务抽象力、结构化表达力、工具链驾驭力

- **页面内容**（三项 + 真实案例）：
  - **业务抽象力**：把「优惠券别搞太复杂」抽象成「满 100 减 20（FLAT, 2000 分），9.5 折向下取整至 77 分」这类**可执行不变量**；把「让订单有归属」抽象成「替换 user_dev，订单按会话 userId 查询」（R-SES-003）。
  - **结构化表达力**：判断一个场景该落哪层（L1 story / L2 spec / L3 design）、该打 `@unit/@api/@e2e` 哪个标签、该引用哪个治理锚点（`L1-04` / `SB-CUSTOMER-06` / `bc-order→cap-order`）。
  - **工具链驾驭力**：知道何时让 AI 生成草稿（初始 spec / E2E 验收初稿 / 访谈整理）、何时必须人工 HITL 确认（storymap 拆分 / 验收标准冻结）、何时触发 `./init.sh e2e:run` 门禁、何时做 Baseline Sync（Epic 收官）。
- **洞察**：三项能力恰好对应需求工程的三个质量维度——抽象力管「对不对」，表达力管「能不能被消费」（被开发、被测试、被 AI），工具链力管「流不流得动」。**在 AI 时代，工具链驾驭力的权重最高**——它是把 AI 变成产能乘数而非新的噪音源的能力。
- **金句**：AI 时代的需求工程师，是**领域语义的架构师**，不是文档打字员。

---

## Slide 38｜总结：核心要点回顾 + 行动项 + Q&A

- **页面内容**（回顾 + 行动项 + 备选讨论）：
  - **瓶颈根源**：Coding 自动化让瓶颈前移到需求；需求环节慢在「一次成型」的结构（串行、不可增量、不可复用），`user_dev` 是需求缺口最诚实的投影。
  - **四条处方**：
    1. **分流**：三类需求（探索/规则/联动）× 三层资产（L1/L2/L3）× 两侧工作区（需求侧冻结 / 开发侧演进）按需建设；
    2. **管线化**：需求漏斗六步（research→explore→prototype→storymap→story→handoff）+ HITL 门禁 + 覆盖对账 + **Story 级最小冻结单元**解耦等待；
    3. **资产化**：handoff 合成 proposal → 开发侧按 capability 生成 Specs → 分层 Sync（变更级 Spec / Epic 级 Baseline）→ 活文档与 CI；
    4. **AI 乘数**：生成草稿 / 校验一致 / 顺治理映射做影响分析，人负责结构与决策。
  - **行动项**：挑一个规则型需求，从一段 PRD 改写成一份 `spec.md`，跑通一次三层资产最小闭环（story → proposal → spec → design → tasks → verify）；给需求漏斗加上 WIP 与 Lead Time 两个指标。
  - **备选讨论题**：
    1. 双工作区 + 三层资产会不会让流程更重？（按需建设 + 直走交付侧路由，规则型 4 个文件走完）
    2. AI 会替代产品经理写需求吗？（替代「打字」，不替代「抽象与决策」——HITL 门禁就是证据）
    3. 老项目没有 Specs 怎么起步？（渐进式：从核心交易链路建满三层，再推广；先从把一个 `user_dev` 变成真实实体开始）
    4. 需求侧不受 `openspec validate` 覆盖，质量靠什么保证？（QA 对抗审查 + 治理锚点真实引用——工具边界处，正是人的价值处）
- **收尾金句**：需求工程化的终点不是文档，而是**一条从「想法」到「可执行契约」的流水线**——AI 是这条流水线上的工人，你是设计师；**blocker 的解药不在更快的写，而在更好的结构**。
