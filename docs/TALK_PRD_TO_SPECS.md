---
name: Talk Deck — 从 PRD 到 Specs：AI 重塑需求工程
purpose: 35 页演讲 PPT 的逐页内容设计（含项目真实资产示例，基于最新 SDD v2.0 需求漏斗）
updated_at: 2026-08-29
---

# 演讲 PPT 设计稿：《从 PRD 到 Specs：AI 重塑需求工程》

> 本文件只做**页面内容设计**，不做口播。每页内容都落到本项目 OpenSpec-Practice 的真实资产上：真实目录、真实文件路径、真实治理 ID、真实 Gherkin 片段、真实访谈记录。主讲人 review 后按此稿制作视觉页。
> 更新说明（2026-08-29）：本稿已对齐最新 SDD v2.0 工作流——需求侧工作区（`openspec-requirements/`）与开发侧（`openspec/`）双工作区架构、需求漏斗六步（research→explore→prototype→storymap→story→handoff）、分层 Sync（变更级 Spec Sync × Epic 级 Baseline Sync）。以**首个完整走通需求漏斗的 Epic「account-system」**（2026-08-29 双端归档）为主案例。

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
  - 副标题：需求侧工程化的真实路径（基于 OpenSpec-Practice 电商系统：21 个已归档变更 + 3 个 Epic 全流程 + 1 个完整走通需求漏斗的 Epic）
  - 落款：主讲人 / 日期 / 场景
- **金句**：写需求的时代结束了，**设计需求输入结构**的时代开始了。

---

## Slide 2｜内容简介

- **页面内容**（原文）：
  > SDD 落地后，开发越规范，断点越向需求端集中。PRD 的模糊性与不可执行性成为新瓶颈。本次分享基于真实项目，呈现需求侧工程化路径：从需求分类、分层、**分侧**（需求侧工作区 × 开发侧工作区）的三维模型，到需求漏斗六步把「想法」冻结成「业务契约」（story.md），再由 handoff 交接开发侧按 capability 生成行为 Specs，最后通过分层 Sync 让业务语义进仓持续维护。同时探讨 AI 如何介入需求工程——生成初始 Specs 草稿、校验需求与实现的一致性、顺治理映射做影响分析，推动需求资产与代码实现协同演进。
- **洞察**：本分享的关键不是「文档更规范」，而是**职责边界更清晰**——业务面冻结在需求侧，实现面在开发侧演进，中间用一条 handoff 桥接。

---

## Slide 3｜听众收益（四条）

- **页面内容**：
  1. 看清 SDD 落地后需求端成为瓶颈的根本原因（三份项目实证）
  2. 掌握「分类 + 分层 + 分侧」的需求处理框架与三层资产模型
  3. 获得需求漏斗六步、覆盖对账、handoff 交接、分层 Sync 的完整落地实践
  4. 理解 AI 在需求工程中的真实位置：生成草稿、校验一致、影响分析，而非替代决策
- **金句**：听完这一场，你能把「需求工程化」从口号变成可落地的四步动作。

---

## Slide 4｜议程目录（六部分）

- **页面内容**：
  1. SDD 的隐形瓶颈：需求侧的熵增
  2. 需求工程化的第一步：分类、分层、分侧
  3. 需求漏斗：把「想法」冻结成「业务契约」
  4. 从 Story 到 Specs：交接边界与双向闭环
  5. 需求进仓：活文档与分层 Sync
  6. AI 时代的新角色：从 PRD 写手到业务输入架构师

---

## Slide 5｜【章节页】01 — SDD 的隐形瓶颈：需求侧的熵增

- **页面内容**：章节标题 + 本节 3 问（断点为何前移 / PRD 为何失效 / 需求输入缺什么工程属性）
- **金句**：开发规范化把河道挖深了，水流不会消失，只会向上游倒灌。

---

## Slide 6｜开发侧引入 SDD 后，为什么交付断点反而向需求端集中

- **页面内容**：
  - 现象：SDD 落地后开发返工下降，但断点移到需求端。
  - **因果链**：实现不再「替需求补位」→ 模糊性被原样暴露 → 断点前移到 explore/propose。
  - **项目实证 1（模糊性被逼出）**：优惠券「发券」在 explore 阶段被逼出 4 个未答问题——谁来发？发什么范围？过期怎么办？每单限几张？（见 coupon-system 的 `idea.md`）。以前一句「发券」开发就自己拍板。
  - **项目实证 2（需求缺口投影为占位符）**：系统所有订单、购物车的归属主体恒为 `user_dev`——这不是「技术债」，是「需求债」的物理形态。工程师写 `user_dev` 时，已经在替你做了「不需要真实账户」的产品决策（见 `research.md` 的调研触发段）。
  - **项目实证 3（调研用数据说话）**：account-system 的 `research.md` 记录了 3 条带原始摘录的访谈——买家「页面里翻不到我自己的订单」、运营「订单列表里全是 user_dev，只能靠猜」、技术「没有真正的认证层」。
  - **关键判断**：断点前移是好事——错误在需求阶段改一行，比上线后改一段逻辑便宜（引用 `docs/QUALITY_SCORE.md` 交付底线）。
- **洞察**：断点前移的本质是**决策时点前移**。模糊性一直都在，SDD 只是让它从「上线后爆炸」变成「探索时暴露」。

---

## Slide 7｜PRD 为何在 SDD 语境下逐渐失效：模糊性、版本滞后与不可执行性

- **页面内容**（三条，每条配真实反例）：
  - **模糊性**：PRD 写「优惠按最优方式结算」。对照 `openspec/specs/coupon-management/spec.md`——它必须写成「从全场通用券与用户已持未用券中，自动推荐减免额最高的一张」，并把两张候选券算出 **5000 分 vs 10000 分** 的显式比较，得出「9折」券胜出。这就是把「最优」变成可执行断言。
  - **版本滞后**：PRD 写完就冻结。而 `specs/coupon-management` 的核销规则随变更回流——`2026-08-17-coupon-integration`（新增发放+归属过滤）之后又经 `2026-08-19-story-coupon-engine-upgrade` 扩展百分比券。文档是活的，PRD 是死的。
  - **不可执行性**：PRD 无法被测试消费。`spec.md` 每个 Scenario 带 `@unit/@api/@e2e` 标签（如「9.5 折向下取整至 77 分」= `@unit`），Cucumber 直接读 feature 文件跑 E2E。
- **洞察**：PRD 是**写给人类读的叙事**，Specs 是**写给机器执行的契约**。叙事可以模糊，契约必须无歧义——这就是「最优」这种词在契约层的宿命。
- **金句**：PRD 里的每一个模糊词，都是一次推迟到实现期的决策。SDD 只是让它们提前现身。

---

## Slide 8｜核心诊断：需求输入需要具备结构化、可消费、可演进的工程属性

- **页面内容**（三个属性 + 项目落点）：
  - **结构化**：需求必须是**可分类、可分层、可分侧**的文件——kebab-case capability 路径（`openspec/specs/coupon-management/`）+ 需求侧 story.md，而不是一篇散文 PRD。
  - **可消费**：下游（原型/测试/CI/AI）能直接读。`spec.md` 的 Gherkin + `@unit/@api/@e2e` 标签直接驱动 `node:test / pytest / Cucumber`；需求侧 story.md 的 E2E 旅程直接映射 `SB-STAGE-*/SB-CUSTOMER-*` 节点。
  - **可演进**：随代码同仓、随变更回流。开发侧 `openspec/changes/*/` 增量 → Spec Sync 合并进 `openspec/specs/` → 归档；需求侧 story.md 冻结后由 STATUS.md 跟踪生命周期，Epic 收尾再归档。
  - **演进证据**：`openspec/specs/` 现有 13 个 capability，其中 `account-management` / `user-session` / `user-admin` 三个是 account-system Epic 新增的 taxonomy——主规格会随 Epic 长大。
- **洞察**：三个属性的终点是**可测试性**——「需求即测试源」，需求资产与 CI 之间没有翻译层，这是需求工程化与文档化的分水岭。

---

## Slide 9｜【章节页】02 — 需求工程化的第一步：分类、分层、分侧

- **页面内容**：章节标题 + 本节 4 问（为何不能单一流程 / 三类如何判定 / 三层资产如何分工 / 需求侧为什么需要独立工作区）
- **金句**：需求工程化的第一刀，不是写模板，而是**给需求分岔路口**。

---

## Slide 10｜为什么企业需求不能用单一流程处理

- **页面内容**：
  - 反模式：所有需求走「写 PRD → 评审 → 开发」一条流水线。
  - 后果：探索型被过早固化、规则型被开会拖慢、联动型被单点评估漏影响面。
  - **项目实证（三条路径的分岔）**：
    - `epic-advanced-coupon-system.story-list.json` 把大 Epic 拆成 `story-coupon-engine-upgrade`（规则型核销引擎）与 `story-coupon-admin-panel`（后台配置含 UI）两条不同路径；
    - `epic-order-lifecycle.story-list.json` 又拆出 `story-order-customer`（C 端探索型，含原型）与 `story-order-payment`（支付规则型）；
    - `epic-account-system.story-list.json` 拆出 register/login/session（C 端探索+规则混合）与 `admin-users`（B 端权限型）。
  - 结论：**流程必须分叉**——Epic 走需求漏斗，Bug Fix / Tech Debt / 简单功能直走交付侧。
- **洞察**：单一流程的隐性成本不是「慢」，而是**把不同性质的需求按同一标准裁剪**——探索型最怕过早固化，规则型最怕评审拖延，联动型最怕单点评估。

---

## Slide 11｜探索型、规则型、联动型需求的判定逻辑与差异化路径

- **页面内容**（三类 + 判定问句 + 项目打标）：
  - **探索型**：目标清楚、方案未定 → 问「我们清楚要做什么吗？」，不确定 → 探索型。打标：`story-order-customer`（C 端订单可见，UI 未定，需原型）。
  - **规则型**：方案清楚、规则密集 → 问「有没有一堆业务规则/状态/边界/安全约束？」。打标：优惠券核销（`coupon-management`）、订单状态机（`order-management`）、账户注册（`R-REG-001~007` 七条规则）。
  - **联动型**：跨多个 Bounded Context → 问「会不会动到多个模块？」。打标：`2026-08-17-coupon-integration` 同时改 `coupon-management`（新增）+ `order-management`（修改）+ checkout 结算 `discountCents/totalCents`；`story-account-system-session` 同时动 User / Order / Cart 三个 Context。
- **洞察**：三问的顺序很关键——先问「做什么」，再问「有多少规则」，最后问「动几个模块」。判定是**递进收敛**的，不是平行打分。

---

## Slide 12｜三类需求的差异化路径（对应 SDD 流程分支）

- **页面内容**：
  - **探索型（Epic 级）**：需求漏斗 `research → explore → prototype → storymap → story`，HITL 逐门禁确认 → `handoff`。对应 `req-sdd.yaml`（version 4）的 artifact 链。
  - **规则型（可直走）**：`proposal → specs → design → tasks`，测试标签分层（`@unit/@api/@e2e`）→ 门禁。对应 `spec-driven.yaml`（version 2）与 `config.yaml` 的 specs 规则。
  - **联动型**：治理映射对齐 → 影响分析（design.md 的「Domain Model Sync Assessment」与「Service Blueprint Sync Assessment」两节）→ 分层 Sync 判定。
  - **技术债（无外部行为变更）**：`skip_specs: true`，仅 design + tasks。
  - **项目实证**：`2026-08-23-story-order-customer/design.md` 的 Sync Assessment——Service Blueprint `Needs Sync: Yes`（C 端客户动作新增「查看我的订单」）、Domain Model `Needs Sync: No`（显式 no-op，仅只读查询）。**同一变更，两个基线一改一不改**——这就是差异化的颗粒度。
- **洞察**：差异化路径的收益是**每一类需求都只付出必要成本**——回应「SDD 太重」的最好方式不是解释，而是展示规则型需求可以 4 个文件走完。

---

## Slide 13｜三层资产模型：L1 语义层、L2 契约层、L3 规格层

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
- **金句**：三层资产的核心问题不是「怎么分层」，而是「**每一层由谁拥有、谁冻结、谁演进**」。

---

## Slide 14｜【章节页】03 — 需求漏斗：把「想法」冻结成「业务契约」

- **页面内容**：章节标题 + 本节 4 子题（双工作区隔离 / 漏斗六步 / HITL 门禁 / 覆盖对账与冻结交付物）
- **金句**：需求工程化的终点，是产出一份**可以冻结、可以交接、可以追溯**的业务契约。

---

## Slide 15｜两个工作区：为什么需求侧必须独立

- **页面内容**：
  - **架构**：`openspec-requirements/`（需求侧，PM 专属）与 `openspec/`（开发侧）平级隔离；需求侧 schema 独立（`req-sdd` v4），开发侧 schema 独立（`spec-driven` v2）。
  - **职责**：需求侧只做大块 Epic 漏斗（业务面），开发侧从 proposal 起步（行为面）；Bug Fix / Tech Debt / 简单功能**不进门**（`openspec-requirements/config.yaml` 适用范围路由）。
  - **项目实证（结构差异即职责差异）**：
    - 需求侧 `epics/account-system/`：research / idea / prototypes(4页) / storymap / stories(4个) / STATUS.md；
    - 开发侧 `changes/2026-08-29-story-account-system-register/`：proposal / specs / design / tasks / verify——**没有 story.md、没有 prototypes**，因为业务面已前移并冻结在需求侧。
  - **为什么不合并**：业务语义变化慢、实现细节变化快。把两者放同一个变更目录里，任何一次实现调整都会污染业务评审记录；分侧后开发侧可自由迭代 L2/L3，L1 不受扰动。
- **洞察**：双工作区不是「两套文档系统」，而是**读写权限的物理隔离**——需求侧只写业务契约，开发侧只读契约、写实现。Status 用 STATUS.md 单一状态源串起来，跨侧信息孤岛由 lead 回填解决。
- **金句**：把「该由谁冻结」和「该由谁演进」放进目录结构里，流程就少了一半的口头协调。

---

## Slide 16｜需求漏斗六步总览：research → explore → prototype → storymap → story → handoff

- **页面内容**（六步 + 每步产物 + HITL 门禁）：
  1. **research**：`research.md`——只收集不转化（背景/对象/访谈原始记录/约束/疑问）。
  2. **explore**：`idea.md`——转化（意图澄清 / To-Be Process / To-Be Journey / B/C 双端 / 候选 Capabilities）。
  3. **prototype**：`prototypes/*.html`——**Epic 整体一次完成**（拆分前），UI 门禁。
  4. **storymap**：`storymap.md`——需求拆分 + **覆盖对账（强制）**。
  5. **story**：`stories/<key>/story.md`——业务面唯一冻结交付物（用户场景 / 规则表 / E2E 验收 / 治理映射）。
  6. **handoff**：合成开发侧 proposal，登记 `story-list.json`，回填 STATUS.md。
  - 每步产出后**必须 HITL 确认**才进下一步（`req-sdd.yaml` 的 HITL 强制门禁）。
- **洞察**：漏斗的本质是**逐级提高信息的确定性**——从「事实」（research）到「解读」（explore）到「具象」（prototype）到「边界」（storymap）到「契约」（story）。每一级只做一件事，防止跳过事实直接设计（早产设计）。

---

## Slide 17｜HITL 门禁与「只收集不转化」：把事实与解读分离

- **页面内容**：
  - **research 的纪律**：只收集。`account-system/research.md` 内嵌 3 条访谈原始记录（对象/时间方式/原始摘录/关键信号）——买家「翻不到我自己的订单」、运营「只能靠猜」、技术「没有真正的认证层」。**不转化**：调研时不做产品设计（那是 explore 的职责）。
  - **explore 的转化**：基于已确认的 research，产出 To-Be Process（As-Is vs To-Be 差异表：`user_dev` → 真实 `userId`、无会话 → 持久会话）+ To-Be Journey（旅程 A 新买家首次购买 / 旅程 B 运营定位订单）+ 4 个候选 Capabilities。
  - **门禁意义**：research 未确认禁止 explore；story.md 未确认禁止 handoff（`SDD_WORKFLOW.md` 适用范围检查）。
- **洞察**：HITL 门禁是**决策点**不是**审批点**——它强迫每个「解读」都站在已确认的「事实」上。调研访谈的原始摘录是一手证据，防止需求在口头传递中失真。
- **金句**：先有可引用的「原话」，才有可辩护的「设计」。

---

## Slide 18｜原型：Epic 整体一次完成 + UI 门禁

- **页面内容**：
  - **时机**：在拆分（storymap）之前，对 Epic **整体**做一次原型——避免拆完 Story 后每个 Story 各做各的原型，页面间互相打架。
  - **项目实证**：account-system 一次产出 4 页原型（`epics/account-system/prototypes/`）——`account-register.html` / `account-login.html` / `account-session.html` / `admin-users.html`，覆盖 B/C 双端。
  - **UI 门禁**：涉及 UI 的 Epic **无已确认原型不得拆分/交接**（`req-sdd.yaml` prototype 规则）。
  - **规范约束**：`docs/FRONTEND.md`——禁止圆角/阴影/装饰 Emoji、slate 色系、真实数据（严禁 foo/test 占位）、全中文、Vue 3 + Tailwind (CDN)。
- **洞察**：原型不是「高保真设计稿」，而是**UI 逻辑的唯一事实来源**。Epic 整体先于 Story 的原型顺序，本质是「先统一交互骨架，再拆分交付单元」——拆分的边界必须落在已经确认的交互上。
- **金句**：原型在拆分之前做，就像地基在隔墙之前打。

---

## Slide 19｜覆盖对账：需求范围的「可审计清单」

- **页面内容**：
  - **规则**（storymap 强制步骤）：拆分前先列出 Epic 的**全部承诺项**（In Scope / Exit Criteria / B 端承诺 / 候选 Capability / Explore 护栏 / 约束），拆分后逐项对账，必须有 ≥1 个 Story 承接。
  - **项目实证**：account-system 的 storymap.md 对账表——**14 项承诺项全部 ✅ 覆盖**。截取关键几行：
    - Exit Criteria ②「未登录不可下单/查看我的订单」→ `story-account-system-session` ✅
    - B 端承诺「用户管理入口（列表/检索/详情/禁用，运营权限）」→ `story-account-system-admin-users` ✅
    - Candidate Capability `user-session`（新增 taxonomy）→ login + session 两个 Story ✅
    - 约束「禁用用户会话失效」→ admin-users（禁用动作）+ session（会话校验拦截）✅
  - **双向价值**：既防「说了没做」（承诺项无人承接），也防「做了没说」（无承诺项的隐式扩范围）。
- **洞察**：覆盖对账把范围管理从「会议口头确认」变成**文件可审计**——这是需求侧唯一能机器检查的环节，也是 QA 对抗审查的重点抓手。
- **金句**：范围不靠人记，靠一张能对账的表。

---

## Slide 20｜Story：业务面唯一冻结交付物

- **页面内容**（以 `story-account-system-session/story.md` 为例）：
  - **结构**：用户场景（B/C 双端视角）→ 范围（In/Out of Scope）→ 原型参考 → 业务规则表 → E2E 验收（Given/When/Then）→ 治理映射对齐 → 交接状态。
  - **规则表即契约**：`R-SES-001~007`——会话持久化、全局校验、订单归属查询（替代 user_dev）、未登录引导回跳、退出销毁、禁用即失效、下单绑定 userId。每条含触发条件 + 期望结果。
  - **E2E 旅程映射治理锚点**：旅程 1 映射 `L1-04, L1-06 | SB-STAGE-04, SB-STAGE-06, SB-CUSTOMER-04, SB-CUSTOMER-06`；「禁用用户会话失效」场景是 **B 端联动 Story** 的跨 Story 验收。
  - **明确边界**：Out of Scope 写死「会话过期自动续期（待确认）」「多设备会话并行」「购物车跨端同步」——把「以后再说」变成「显式不承诺」。
  - **不含行为规格**：specs（Story-specs）由开发侧在 proposal 后按 capability 拆分生成——**业务面冻结，实现面开放**。
- **洞察**：story.md 是需求侧唯一能「冻结」的东西——冻结的不是文字，而是**业务承诺**。它取代了 PRD 的评审会，因为验收标准已经写成了可执行的 Given/When/Then。
- **金句**：Story 冻结的是「承诺做什么」，不是「怎么做」。

---

## Slide 21｜【章节页】04 — 从 Story 到 Specs：交接边界与双向闭环

- **页面内容**：章节标题 + 本节 3 子题（handoff 交接 / Context 经营清单 / AI 加速与需求缺口回流）
- **金句**：Story 与 Specs 之间不是翻译，是**一次有边界的交接**。

---

## Slide 22｜handoff：合成 proposal，开发侧从 proposal 起步

- **页面内容**：
  - **机制**：`/req:handoff` 读取已确认的 story.md（业务面），在开发侧创建 change 并**合成 proposal.md**——Why ← 用户场景；What ← 范围；Capabilities ← idea 候选 Capabilities；Alignment ← 治理映射；Impact ← 架构影响。
  - **强制约束**：开发侧**不重复** explore / 原型 / story（均已前移到需求侧）；行为规格（Story-specs）由开发侧在 proposal 后按 capability 拆分生成，需求侧不生成 specs/。
  - **项目实证**：`2026-08-29-story-account-system-register/proposal.md`——
    - New Capability：`account-management`（新增 taxonomy，理由：既有 10 个 capability 均无账户认证能力）；
    - Impacted Bounded Context：**User Context（新增 BC，需标注）**，属基线级新增，Epic 归档后由 Baseline Sync 统一回流；
    - Process Alignment：`L1-03 加购与准备` 新增「结算前身份前置」子流程；Service Blueprint：`SB-STAGE-01/03`、`SB-CUSTOMER-01/03` 标为**修改**（复用结构，不新增阶段）。
  - **交接配套**：登记 `story-list.json`（status=in_progress, changeName）+ 回填需求侧 story.md 交接状态 + STATUS.md（Story → handoff）。
- **洞察**：handoff 是**单次翻译、双向引用**——开发侧不再重复需求侧工作，需求侧不再产出行为规格；proposal 里每一项 Capability / BC / 流程 / 蓝图声明都带着「新增/修改/复用」的显式标注，这正是影响分析的种子。
- **金句**：交接的产物不是一份文档，而是一张**「改了什么、动到谁」的声明清单**。

---

## Slide 23｜业务 Context 经营清单：目标、场景、术语、边界、异常

- **页面内容**（五要素 + 真实例子）：
  - **目标**：`story-order-customer` 的目标写死「让买家可见全部订单与实时状态，补全下单→支付→(发货)→买家可见闭环」。
  - **场景**：`GIVEN 当前用户存在多个订单（待支付/已支付/已发货/已完成/已取消）`。
  - **术语**：`priceCents` 统一「价格」以**分**存，杜绝浮点（`docs/ARCHITECTURE.md`「所有金额用整型分」）；`PENDING_PAYMENT→PAID→SHIPPED→COMPLETED/CANCELLED` 状态机在 story 与 spec 两层保持一致。
  - **边界**：账户体系 In Scope（注册/登录/会话）vs Out of Scope（第三方 OAuth / 积分会员），见 `docs/ROADMAP.md` 与 `story.md` Out of Scope。
  - **异常**：安全语义也沉淀在需求层——`R-LOG-002`「凭证不区分账号不存在/密码错误，统一提示『手机号或密码不正确』」**防账号枚举**；取消仅限待支付、且取消无库存与券变化（`order-management/spec.md`）。
- **洞察**：Context 经营清单把需求从「功能清单」升级为**领域语义快照**——术语、边界、异常这些「看不见的部分」，恰恰是跨模块协作和 AI 校验最容易失守的地方。安全不是上线后的补丁，是需求层的规则。
- **金句**：需求工程管的不只是功能，还有**领域语义的守恒**。

---

## Slide 24｜AI 加速闭环：生成验收标准、校验术语一致性、提示文档更新

- **页面内容**（三个介入点 + 项目落点）：
  - **生成**：从 `idea.md` 的「业务设计思路」辅助产出初始 `spec.md` 草稿与验收标准（Gherkin + 边界反例），以及需求侧 story.md 的 E2E 旅程初稿与治理映射建议（L1/L2 + SB-STAGE-* 候选）。
  - **校验**：对照 `spec.md` 的 `@unit/@api/@e2e` 检查实现是否一致，揪出「规格写了但代码没做」或术语漂移（如金额写成 `float` 违反 `priceCents`）；在需求侧检查规则表与验收标准是否互相矛盾（如 R-SES-003 归属查询 vs 旅程 1 的断言）。
  - **提示更新**：改一个 Bounded Context 时，顺着 `domain_model.html` 的 `bc-order→cap-order` 映射提示哪些下游 capability 与基线要连带更新——即影响分析。`story-account-system-session` 同时动 User/Order/Cart 三 Context 的跨侧影响，正是 AI 顺映射枚举出的。
  - **边界**：HITL 不变，AI 给草稿与校验，人做确认与决策。
- **洞察**：AI 在需求工程里的高杠杆点不是「写文档」，而是**顺着治理映射做图的遍历**——BC→capability 是有向图，AI 天然适合做影响面枚举与一致性校验这类图算法活。
- **金句**：AI 替代的是「打字」，不是「抽象与决策」。

---

## Slide 25｜双向闭环：开发中的需求缺口如何回流

- **页面内容**：
  - **规则**：若开发中发现需求缺口（`SDD_WORKFLOW.md`），**回关需求侧 skill**（research/explore/storymap/story），不擅自改需求侧规划。
  - **项目实证（需求缺口即新 Story）**：`user_dev` 占位在 order-lifecycle 阶段只是「技术债」；到了 Phase 4，它被识别为「需求缺口」——真实账户体系缺失，于是立项 Epic `account-system`（research 调研触发段明确写了这一点）。**同一个现象，从实现侧看是技术债，从需求侧看是新 Epic。**
  - **机制配套**：STATUS.md 单一状态源 + story-list.json 跨 change 队列 + lead 回填 done/archived，让缺口回流有据可查、有状态可追。
- **洞察**：闭环不是「文档来回改」，而是**缺口的发现位置决定它的处理路径**——实现期发现 → 回需求侧登记/重评审；探索期发现 → 直接问 HITL 问题。这避免了「开发顺手就改了需求」这个最隐蔽的漂移源。
- **金句**：需求缺口是产品最诚实的反馈通道——问题只在于它有没有一条回流的路。

---

## Slide 26｜【章节页】05 — 需求进仓：活文档与分层 Sync

- **页面内容**：章节标题 + 本节 3 子题（目录与版本同步 / 分层 Sync 机制 / 活文档与 CI）
- **金句**：需求进仓的终点，是让「文档即现状」从口号变成可验证的事实。

---

## Slide 27｜Specs 在代码仓中的目录结构与版本同步策略

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

## Slide 28｜分层 Sync：Spec Sync（变更级）× Baseline Sync（Epic 级）

- **页面内容**：
  - **Spec Sync（/opsx:sync，每个 change 归档前）**：把 `changes/<name>/specs/` 增量合并入 `openspec/specs/`——保证**下一个 Story 消费最新契约**（Story 间有依赖，如 login 依赖 register 的用户池）。
  - **Baseline Sync（/opsx:baseline/sync，Epic 全部 Story 归档后）**：把 Epic 沉淀的认知回流 `docs/baseline/` 三份 HTML——**避免单个 Story 中间态污染基线**；含显式 No-op 判定（无变化必须写明理由，禁止静默跳过）。
  - **项目实证（account-system 的完整分层链路）**：4 个 Story 各自 Spec Sync（`account-management` / `user-session` / `user-admin` 三个新 taxonomy 依次进入主规格）→ 全部归档 → Baseline Sync **新增 User Context BC** + 3 个 capability 映射 + Roadmap 更新（Phase 4 完成）。
  - **反例对照**：`story-order-customer/design.md` 的 Sync Assessment 已预判——Service Blueprint 要改（`SB-CUSTOMER-06` 补「查看我的订单」）、Domain Model 显式 no-op（仅只读查询）——**预判写进 design，Sync 阶段按预判执行**，不让基线漂移。
- **洞察**：分层 Sync 是「小步快跑」与「文档稳定」的平衡解——Spec 层跟着变更走（快），Baseline 层跟着 Epic 走（稳）。如果只有一种节奏，要么文档永远落后，要么基线永远在改。
- **金句**：Spec 同步到变更，Baseline 同步到 Epic——**节奏分层的本质是给「快」和「稳」各自一条跑道**。

---

## Slide 29｜业务语义「活文档」：术语表与接口字段的映射演进

- **页面内容**：
  - **术语表**：领域词汇唯一定义。`priceCents`（整型分，防浮点）、券类型 `FLAT`/`PERCENTAGE`、券状态 `UNUSED/USED`、用户状态 `正常/已禁用`、订单状态机五态——在 `domain_model.html` 与各 capability spec 中保持一致。
  - **字段映射**：业务语义 ↔ 接口/模型字段。`order-management/spec.md` 里 `discountCents`/`couponId`/`totalCents` 一眼对应 `api 域` 与 `Order` 实体（见 `2026-08-17-coupon-integration` 的 Impact 章节）；`user-session/spec.md` 里 `sessionToken → userId` 映射是会话契约的核心。
  - **演进机制**：`design.md` 的「Service Blueprint Sync Assessment」与「Domain Model Sync Assessment」预判 + Sync 阶段回流 `docs/baseline/*.html`，保持「文档即现状」。
  - **术语漂移的代价**：金额若写成 `float`，`priceCents` 的整型不变量被破坏——术语不是命名规范，是**运行时契约**。
- **洞察**：活文档的「活」不在更新频率，而在**变更的触发信号被显式定义**（六类蓝图信号 + 五类领域模型信号）。没有触发信号，文档更新全靠自觉——那和 PRD 没区别。
- **金句**：术语表是需求层写下的第一行代码。

---

## Slide 30｜轻量级 CI 集成与渐进式资产建设

- **页面内容**：
  - **轻量级 CI（不搞重型流水线）**：`openspec validate`（schema，开发侧）→ `./init.sh test:all`（Node + Python 单元/接口）→ `./init.sh e2e:run`（Cucumber E2E，8 个 feature 文件、26 条场景，覆盖交易/订单生命周期/账户体系/持久化/冒烟）。
  - **门禁实证**（`verify.md` 的 Hard/Soft Gates 分栏）：Hard Gates（schema validate / node test / python test / frontend build）必须 PASS；Soft Gates（E2E cucumber）记实际场景数，**不允许标「E2E 未纳入」**。`story-order-customer/verify.md`：65 node + 12 python PASS，10 scenarios / 46 steps 全绿。
  - **渐进式建设**：先对核心交易链路（订单/库存/回款）建满三层，再推广次优先级。对应 Phase 3 `epic-order-lifecycle` 收官 → Phase 4 `epic-account-system`（用户资产）→ 下一步 Phase D `epic-accounts-receivable`（回款与应收账款，见 `docs/ROADMAP.md`）。
  - **需求侧质量兜底**：`req-sdd` 不受 `openspec validate` 覆盖——需求制品质量由 **QA 对抗审查**兜底 + 治理锚点必须真实引用 `docs/baseline/*.html`。
- **洞察**：工具管不到的地方，流程与评审来兜底——承认工具边界，反而让质量机制更诚实。而「渐进式」的本质是**按价值密度排序资产建设**，核心链路先受益，边缘能力后补齐。
- **金句**：门禁的价值不是拦住代码，而是**让「完成」有可验证的定义**。

---

## Slide 31｜【章节页】06 — AI 时代的新角色：从 PRD 写手到业务输入架构师

- **页面内容**：章节标题 + 本节 2 子题（三重转变 / 三项核心能力）
- **金句**：AI 会写文档之后，需求工程师的护城河变成了**设计输入结构**。

---

## Slide 32｜三重转变：设计输入结构、持续维护资产、闭环协同

- **页面内容**（三条 + 项目映射）：
  1. **从「写一篇 PRD」→「设计输入结构」**：设计分类（三类）、分层（三层）、分侧（双工作区）、判定逻辑、模板体系。落到需求侧模板（`openspec-requirements/templates/`：research / idea / prototype / storymap / story / STATUS 六套）+ 开发侧模板（`openspec/templates/`：proposal / spec / design / tasks / verify 五套）+ `req-sdd.yaml` / `spec-driven.yaml` 的生成规则。
  2. **从「交付即结束」→「持续维护资产」**：像维护代码一样维护术语、Specs、基线。落到 `docs/baseline/` 三份 HTML 随分层 Sync 回流；STATUS.md + story-list.json 跟踪 Epic 生命周期。
  3. **从「抛给开发」→「闭环协同」**：与 AI、开发、测试在 Specs 资产上协作——`@unit/@api/@e2e` 标签分工、HITL 检查点、需求缺口回流通道（开发发现缺口回关需求侧 skill）。
- **洞察**：三重转变的共同点是把需求工程师从「内容生产者」变成「**系统设计者**」——你不再直接写需求，你设计需求被生产、被校验、被演进的方式。
- **金句**：好的输入结构，让 80% 的需求在生成时就接近正确——剩下的 20% 留给 HITL。

---

## Slide 33｜三项核心能力：业务抽象力、结构化表达力、工具链驾驭力

- **页面内容**（三项 + 真实案例）：
  - **业务抽象力**：把「优惠券别搞太复杂」抽象成「满 100 减 20（FLAT, 2000 分），9.5 折向下取整至 77 分」这类**可执行不变量**；把「让订单有归属」抽象成「替换 user_dev，订单按会话 userId 查询」（R-SES-003）。
  - **结构化表达力**：判断一个场景该落哪层（L1 story / L2 spec / L3 design）、该打 `@unit/@api/@e2e` 哪个标签、该引用哪个治理锚点（`L1-04` / `SB-CUSTOMER-06` / `bc-order→cap-order`）。
  - **工具链驾驭力**：知道何时让 AI 生成草稿（初始 spec / E2E 验收初稿）、何时必须人工 HITL 确认（storymap 拆分 / 验收标准冻结）、何时触发 `./init.sh e2e:run` 门禁、何时做 Baseline Sync（Epic 收官）。
- **洞察**：三项能力恰好对应需求工程的三个质量维度——抽象力管「对不对」，表达力管「能不能被消费」，工具链力管「流不流得动」。
- **金句**：AI 时代的需求工程师，是**领域语义的架构师**，不是文档打字员。

---

## Slide 34｜总结：核心要点回顾（对应四条收益）

- **页面内容**：
  1. **瓶颈根源**：开发规范化让需求模糊性无处可藏 → 断点前移到 explore/propose；`user_dev` 是需求缺口最诚实的投影。
  2. **处理框架**：三类需求（探索/规则/联动）× 三层资产（L1/L2/L3）× 两侧工作区（需求侧冻结 / 开发侧演进）按需建设。
  3. **落地机制**：需求漏斗六步（research→explore→prototype→storymap→story→handoff）冻结业务契约 → handoff 合成 proposal → 开发侧按 capability 生成 Specs → 分层 Sync（变更级 Spec / Epic 级 Baseline）。
  4. **AI 角色**：生成草稿 / 校验一致 / 顺治理映射做影响分析，人负责结构与决策（依据 `req-sdd.yaml` + `spec-driven.yaml` 的 artifact 链）。
  - **行动项**：挑一个规则型需求，从一段 PRD 改写成一份 `spec.md`，跑通一次三层资产最小闭环（story → proposal → spec → design → tasks → verify）。
- **金句**：需求工程化的终点不是文档，是**一条从「想法」到「可执行契约」的流水线**——AI 在这条流水线上是工人，你是设计师。

---

## Slide 35｜结束页 / Q&A

- **页面内容**：
  - 谢谢 / 联系方式 / 仓库地址（OpenSpec-Practice）
  - 备选讨论题：
    1. 双工作区 + 三层资产会不会让流程更重？（按需建设 + 直走交付侧路由，规则型 4 个文件走完）
    2. AI 会替代产品经理写需求吗？（替代「打字」，不替代「抽象与决策」——HITL 门禁就是证据）
    3. 老项目没有 Specs 怎么起步？（渐进式：从核心交易链路建满三层，再推广；先从把一个 `user_dev` 变成真实实体开始）
    4. 需求侧不受 `openspec validate` 覆盖，质量靠什么保证？（QA 对抗审查 + 治理锚点真实引用——工具边界处，正是人的价值处）
