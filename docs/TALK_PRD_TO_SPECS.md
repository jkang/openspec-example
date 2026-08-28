---
name: Talk Deck — 从 PRD 到 Specs：AI 重塑需求工程
purpose: 28 页演讲 PPT 的逐页内容设计（含项目真实资产示例）
updated_at: 2026-08-28
---

# 演讲 PPT 设计稿：《从 PRD 到 Specs：AI 重塑需求工程》

> 本文件只做**页面内容设计**，不做口播。每页内容都落到本项目 OpenSpec-Practice 的真实资产上：真实目录、真实文件路径、真实治理 ID、真实 Gherkin 片段。主讲人 review 后按此稿制作视觉页。

---

## 全局引用约定（每页可反复引用的项目真实资产）

在展开前，先列清楚本仓库的三层资产与文件体系，后面每一页都直接点名引用：

| 层 | 项目里的真实载体 | 路径 / 命名 |
|---|---|---|
| L1 语义层 | story.md（E2E 旅程 + 业务规则表）、业务基线 | `openspec/changes/*/story.md`；`docs/baseline/business_process.html`、`domain_model.html`、`service_blueprint.html` |
| L2 契约层 | capability spec（Requirement/Scenario + 测试标签） | `openspec/specs/<kebab-capability>/spec.md` |
| L3 规格层 | design.md + tasks.md（按 Node/Python/Frontend 拆分） | `openspec/changes/*/design.md`、`tasks.md` |
| 变更闭环 | idea → proposal → prototype → story → specs → design → tasks → verify | `openspec/changes/<name>/`，归档 `openspec/changes/archive/YYYY-MM-DD-<name>/` |
| 治理 ID | Bounded Context 映射、流程节点、蓝图节点 | `bc-order→cap-order`、`L1-04/L2-05/L3-01`、`SB-STAGE-04/SB-CUSTOMER-04` |

---

## Slide 1｜封面

- **页面内容**：
  - 主标题：从 PRD 到 Specs：AI 重塑需求工程
  - 副标题：需求侧工程化的真实路径（基于 OpenSpec-Practice 电商系统 17 个已归档变更）
  - 落款：主讲人 / 日期 / 场景

---

## Slide 2｜内容简介

- **页面内容**（原文）：
  > SDD 落地后，开发越规范，断点越向需求端集中。PRD 的模糊性与不可执行性成为新瓶颈。本次分享基于真实项目，呈现需求侧工程化路径：从需求分类与三层资产模型，到由原型反向沉淀 Specs，再到将业务语义纳入代码仓持续维护。同时探讨 AI 如何介入需求工程——辅助生成初始 Specs、校验需求与实现的一致性、在变更时辅助影响分析，推动需求资产与代码实现协同演进。

---

## Slide 3｜听众收益（四条）

- **页面内容**：
  1. 看清 SDD 落地后需求端成为瓶颈的根本原因
  2. 掌握「分类 + 分层」的需求处理框架与三层资产模型
  3. 获得原型反向沉淀 Specs 及需求进仓的具体实践
  4. 理解 AI 如何介入需求工程核心环节

---

## Slide 4｜议程目录（五部分）

- **页面内容**：
  1. SDD 的隐形瓶颈：需求侧的熵增
  2. 需求工程化的第一步：分类与分层
  3. 从原型到 Specs：需求侧的双向闭环
  4. 需求进仓：动态维护的实践框架
  5. AI 时代的新角色：从 PRD 写手到业务输入架构师

---

## Slide 5｜【章节页】01 — SDD 的隐形瓶颈：需求侧的熵增

- **页面内容**：章节标题 + 本节 3 问（断点为何前移 / PRD 为何失效 / 需求输入缺什么工程属性）

---

## Slide 6｜开发侧引入 SDD 后，为什么交付断点反而向需求端集中

- **页面内容**：
  - 现象：SDD 落地后开发返工下降，但断点移到需求端。
  - **因果链**：实现不再「替需求补位」→ 模糊性被原样暴露 → 断点前移到 explore/propose。
  - **项目实证**：优惠券「发券」在 explore 阶段被逼出 4 个未答问题——谁来发？发什么范围？过期怎么办？每单限几张？（见 `idea.md` 的 B/C 双端视角强约束）。以前一句「发券」开发就自己拍板。
  - **关键判断**：断点前移是好事，错误在需求阶段改一行，比上线后改一段逻辑便宜（可引用 `docs/QUALITY_SCORE.md` 的交付底线）。

---

## Slide 7｜PRD 为何在 SDD 语境下逐渐失效：模糊性、版本滞后与不可执行性

- **页面内容**（三条，每条配真实反例）：
  - **模糊性**：PRD 写「优惠按最优方式结算」。对照 `openspec/specs/coupon-management/spec.md` 的要求——它必须写成「从全场通用券与用户已持未用券中，自动推荐减免额最高的一张」，并把两个候选券算出 5000 分 vs 10000 分比较。这就是把「最优」变成可执行断言。
  - **版本滞后**：PRD 写完就冻结。而 `specs/coupon-management` 的核销规则会随变更回流——`2026-08-17-coupon-integration` 之后又经历 `2026-08-19-story-coupon-engine-upgrade` 扩展百分比券，文档是活的。
  - **不可执行性**：PRD 无法被测试消费。`spec.md` 每个 Scenario 带 `@unit/@api/@e2e` 标签（见 coupon spec 里的「折扣计算向下取整至 cent」= `@unit`），Cucumber 能直接读。

---

## Slide 8｜核心诊断：需求输入需要具备结构化、可消费、可演进的工程属性

- **页面内容**（三个属性 + 项目落点）：
  - 结构化：需求必须是**可分类、可分层**的文件——本仓库用 kebab-case capability 路径（`openspec/specs/coupon-management/`），而不是一篇散文 PRD。
  - 可消费：下游（原型/测试/CI/AI）能直接读。`spec.md` 的 Gherkin + `@unit/@api/@e2e` 标签直接驱动 `node:test/pytest/Cucumber`。
  - 可演进：随代码同仓、随变更回流。`openspec/changes/*/` 增量后 sync 合并进 `openspec/specs/`，再归档到 `openspec/changes/archive/`。

---

## Slide 9｜【章节页】02 — 需求工程化的第一步：分类与分层

- **页面内容**：章节标题 + 本节 4 问（为何不能单一流程 / 三类如何判定 / 三层资产是什么 / 哪类先建哪层）

---

## Slide 10｜为什么企业需求不能用单一流程处理

- **页面内容**：
  - 反模式：所有需求走「写 PRD → 评审 → 开发」一条流水线。
  - 后果：探索型被过早固化、规则型被开会拖慢、联动型被单点评估漏影响面。
  - **项目实证**：`epic-advanced-coupon-system.story-list.json` 把一个大 Epic 拆成 `story-coupon-engine-upgrade`（规则型核销引擎）与 `story-coupon-admin-panel`（后台配置，含 UI）两条不同路径；`epic-order-lifecycle.story-list.json` 又拆出 `story-order-customer`（C 端探索型，含原型）与 `story-order-payment`（支付规则型）。流程必须分叉。

---

## Slide 11｜探索型、规则型、联动型需求的判定逻辑与差异化路径

- **页面内容**（三类 + 判定问句 + 项目打标）：
  - **探索型**：目标清楚、方案未定 → 问「我们清楚要做什么吗？」。打标：`story-order-customer`（C 端订单可见，UI 未定，需原型）。
  - **规则型**：方案清楚、规则密集 → 问「有没有一堆业务规则/状态/边界？」。打标：优惠券核销、订单状态机、`priceCents` 计算。
  - **联动型**：跨多个 Bounded Context → 问「会不会动到多个模块？」。打标：`2026-08-17-coupon-integration` 同时改 `coupon-management`（新增）+ `order-management`（修改）+ `checkout` 结算 `discountCents/totalCents`。

---

## Slide 12｜三类需求的差异化路径（对应 SDD 流程分支）

- **页面内容**：
  - 探索型：原型先行 → HITL 确认 → 反向沉淀。对应 `spec-driven.yaml` 里 prototype 实体，`prototypes/order-customer.html` 必须经 HITL。
  - 规则型：直接写 Specs → 测试标签分层 → 门禁。对应 `specs/*/spec.md` + `config.yaml` 的 specs 规则（SHALL/MUST、每场景打标签）。
  - 联动型：治理映射对齐 → 影响分析 → 基线同步判定。对应 `design.md` 的「Domain Model Sync Assessment」与「Service Blueprint Sync Assessment」两节。

---

## Slide 13｜三层资产模型：L1 语义层、L2 契约层、L3 规格层

- **页面内容**（三层 + 项目真实载体）：
  - **L1 语义层**：对齐「做什么、为什么」。载体：`story.md`（E2E 旅程 + 业务规则表 R-CUS-001~005）+ `docs/baseline/` 三份 HTML。
  - **L2 契约层**：定义「什么行为算对」。载体：`openspec/specs/<capability>/spec.md` 的 Requirement（SHALL/MUST）+ Scenario（Gherkin）+ 测试标签。
  - **L3 规格层**：拆「怎么做」。载体：`design.md`（架构图 + Process Delta + 同步预判）+ `tasks.md`（按 Node.js/Python/Frontend 拆分）。
  - **关键洞察**：过去这三层糊在一篇 PRD 里互相污染；分层后 `design.md` 改实现不影响 L1 语义，`spec.md` 改契约不影响 L3 任务。

---

## Slide 14｜不同类型需求对应哪层资产优先建设

- **页面内容**（矩阵 + 项目实例）：

  | | L1 语义层 | L2 契约层 | L3 规格层 |
  |---|---|---|---|
  | 探索型 | ★ 优先（`story-order-customer` 先定旅程与规则） | 确认后补齐 | 迭代 |
  | 规则型 | 少量 | ★ 优先（`coupon-management` 核销规则） | 快速落地（`tasks.md` 按模块拆） |
  | 联动型 | ★ 优先（治理映射：`bc-order→cap-coupon`） | 契约对齐 | 跨模块任务 |

  - 结论：不是每层都建满。建满是浪费，按需建设才是工程化（回应「SDD 太重」）。

---

## Slide 15｜【章节页】03 — 从原型到 Specs：需求侧的双向闭环

- **页面内容**：章节标题 + 本节 4 子题（原型作用 / 反向沉淀机制 / Context 经营清单 / AI 加速闭环）

---

## Slide 16｜原型的真正作用：认知对齐与范围确认

- **页面内容**：
  - 误区：原型 ≠ 高保真设计稿，≠ 最终 UI 成品。
  - 作用一认知对齐：`prototypes/order-customer.html` 把「我的订单」视图做成可交互——列表（各状态）、详情展开（商品快照/金额/券/状态轨迹），让 B/C 双端对「长什么样」达成同一画面。
  - 作用二范围确认：`story.md` 的 Out of Scope 明确写出——C 端取消订单不在本 Story（由 B 端负责）、不做多用户切换、不做分页。
  - 规范约束：`config.yaml` prototype 规则——禁止圆角/阴影/装饰 Emoji、slate 色系、必须真实数据、必须中文。

---

## Slide 17｜反向沉淀机制：原型确认 → 提取规则 → 编写 Specs → 进入代码仓

- **页面内容**（四步推进，用 `story-order-customer` 走一遍）：
  1. **原型确认**：HITL 锁定 `order-customer.html`，作为 UI 逻辑唯一事实来源。
  2. **提取规则**：从交互里提炼成业务规则表 `R-CUS-001~005`（订单归属/倒序/状态中文化/状态轨迹/详情完整）。
  3. **编写 Specs**：规则逐条转成 Gherkin——「我的订单列表渲染」`@e2e`、「他人订单不可见」`@api`。
  4. **进入代码仓**：specs 归到 `openspec/specs/order-management/` + 新增 `frontend-ui/`，与 Vue 前端同仓。

---

## Slide 18｜业务 Context 经营清单：目标、场景、术语、边界、异常

- **页面内容**（五要素 + 真实例子）：
  - 目标：`story-order-customer` 的目标写死「让买家可见全部订单与实时状态，补全下单→支付→(发货)→买家可见闭环」。
  - 场景：`GIVEN 当前用户存在多个订单（待支付/已支付/已发货/已完成/已取消）`。
  - 术语：`priceCents` 统一「价格」以**分**存，杜绝浮点。这是术语层在防 bug（对照 `docs/ARCHITECTURE.md`「所有金额用整型分」）。
  - 边界：账户体系 In Scope（注册/登录/会话）vs Out of Scope（第三方 OAuth/积分会员），见 `docs/ROADMAP.md`。
  - 异常：订单状态机 `PENDING_PAYMENT→PAID→SHIPPED→COMPLETED/CANCELLED`，取消仅限待支付、且取消无库存与券变化（见 `order-management/spec.md`）。

---

## Slide 19｜AI 加速闭环：生成验收标准、校验术语一致性、提示文档更新

- **页面内容**（三个介入点 + 项目落点）：
  - 生成：从 `idea.md` 的「业务设计思路」辅助产出初始 `spec.md` 草稿与验收标准（Gherkin + 边界反例）。
  - 校验：对照 `spec.md` 的 `@unit/@api/@e2e` 检查实现是否一致，揪出「规格写了但代码没做」或术语漂移（如金额写成 `float` 违反 `priceCents`）。
  - 提示更新：改一个 Bounded Context 时，顺着 `domain_model.html` 的 `bc-order→cap-order` 映射提示哪些下游 capability 与基线要连带更新——即影响分析。
  - 边界：HITL 不变，AI 给草稿与校验，人做确认与决策。

---

## Slide 20｜【章节页】04 — 需求进仓：动态维护的实践框架

- **页面内容**：章节标题 + 本节 3 子题（目录与版本同步 / 业务语义活文档 / 轻量级 CI 与渐进式建设）

---

## Slide 21｜Specs 在代码仓中的目录结构与版本同步策略

- **页面内容**（真实目录树）：
  - 主规格区（契约，增量合并后的最新态）：
    ```
    openspec/specs/
      coupon-management/spec.md
      order-management/spec.md
      cart-management/spec.md
      checkout-management/spec.md
      catalog-management/spec.md
      product-query/spec.md
      payment/spec.md
      frontend-ui/spec.md
      error-handling/spec.md
      domain-model/spec.md
    ```
  - 活跃变更区（增量 delta；含 proposal/story/specs/design/tasks/verify）：
    ```
    openspec/changes/<name>/
      ideas/idea.md  proposal.md  prototypes/*.html
      story.md  specs/<capability>/spec.md  design.md  tasks.md  verify.md
    ```
  - 归档区：`openspec/changes/archive/YYYY-MM-DD-<name>/`（17 个真实变更）。
  - 同步策略：变更完成经 `sync` 合并入主规格，再 `archive`；跨 change 用 `epic-*.story-list.json`（`epic-order-lifecycle` 收官）编排。

---

## Slide 22｜业务语义「活文档」：术语表与接口字段的映射演进

- **页面内容**：
  - 术语表：领域词汇唯一定义。`priceCents`（整型分）、券类型 `FLAT`/`PERCENTAGE`、券状态 `UNUSED/USED`——这些在 `domain_model.html` 与 `frontend-ui` 规范中保持一致。
  - 字段映射：业务语义 ↔ 接口/模型字段。`order-management/spec.md` 里 `discountCents`/`couponId`/`totalCents` 一眼对应 `api 域` 与 `Order` 实体（见 `2026-08-17-coupon-integration` 的 Impact 章节）。
  - 演进机制：`design.md` 的「Service Blueprint Sync Assessment」与「Domain Model Sync Assessment」两类预判 + `sync` 阶段回流到 `docs/baseline/*.html`，保持「文档即现状」。

---

## Slide 23｜轻量级 CI 集成与渐进式资产建设

- **页面内容**：
  - 轻量级 CI（不搞重型流水线）：`openspec validate`（schema）→ `./init.sh node:test` + `python:test`（单元/接口）→ `./init.sh e2e:run`（Cucumber E2E，见 `verify.md` 的 Hard/Soft Gates 分栏）。
  - 渐进式建设：先对核心交易链路（订单/库存/回款）建满三层，再推广次优先级。对应 `epic-order-lifecycle` 收官后再启 `epic-accounts-receivable`（见 `docs/ROADMAP.md`）。
  - 门禁实证：`verify.md` 里 Hard Gates（schema validate / node test / python test / frontend build）必须 PASS，Soft Gates（E2E cucumber）记实际场景数（如 10 scenarios / 46 steps），不允许标「E2E 未纳入」。

---

## Slide 24｜【章节页】05 — AI 时代的新角色：从 PRD 写手到业务输入架构师

- **页面内容**：章节标题 + 本节 2 子题（三重转变 / 三项核心能力）

---

## Slide 25｜三重转变：设计输入结构、持续维护资产、闭环协同

- **页面内容**（三条 + 项目映射）：
  1. 从「写一篇 PRD」→「设计输入结构」：设计分类、分层、模板、判定逻辑。落到 `openspec/templates/`（idea/proposal/spec/story/design/tasks/verify 六套模板）+ `config.yaml` 的 explore/proposal/specs/design 规则。
  2. 从「交付即结束」→「持续维护资产」：像维护代码一样维护术语、Specs、基线。落到 `docs/baseline/` 三份 HTML 随 sync 回流。
  3. 从「抛给开发」→「闭环协同」：与 AI、开发、测试在 Specs 资产上协作（`@unit/@api/@e2e` 分工 + HITL 检查点）。

---

## Slide 26｜三项核心能力：业务抽象力、结构化表达力、工具链驾驭力

- **页面内容**（三项 + 真实案例）：
  - 业务抽象力：把「优惠券别搞太复杂」抽象成「满 100 减 20（FLAT,2000 分），9.5 折向下取整至 77 分」这类可执行不变量。
  - 结构化表达力：判断一个场景该落哪层（L1 story / L2 spec / L3 design）、该打 `@unit/@api/@e2e` 哪个标签。
  - 工具链驾驭力：知道何时让 AI 生成草稿、何时必须人工 HITL 确认、何时触发 `./init.sh e2e:run` 门禁。

---

## Slide 27｜总结：核心要点回顾（对应四条收益）

- **页面内容**：
  1. 瓶颈根源：开发规范化让需求模糊性无处可藏 → 断点前移到 explore/propose。
  2. 处理框架：三类需求（探索/规则/联动）× 三层资产（L1/L2/L3）按需建设。
  3. 落地机制：原型反向沉淀 Specs（`prototypes/*.html`→`story.md`→`specs/*/spec.md`）+ 需求进仓随代码演进（`sync`→`archive`）。
  4. AI 角色：生成草稿 / 校验一致 / 影响分析，人负责结构与决策（依据 `spec-driven.yaml` 的 artifact 链）。
  - 行动项：挑一个规则型需求，从 PRD 改写成一份 `spec.md`，跑通一次三层资产最小闭环。

---

## Slide 28｜结束页 / Q&A

- **页面内容**：
  - 谢谢 / 联系方式 / 仓库地址（OpenSpec-Practice）
  - 备选讨论题：三者资产会不会让流程更重（按需建设）？AI 会替代产品经理写需求吗（替代写作、不替代抽象与决策）？老项目没有 Specs 怎么起步（渐进式，从核心链路开始）？
