# Spec Flow 演练问题记录（用户账户体系 Epic）

> **用途**：在「用户账户体系」流程演练过程中，记录发现的 spec flow（规格驱动流程）问题，供后续修正优化。
> **状态**：🔄 演练中

## 演练进度

- [x] research（需求调研，含访谈原始记录）
- [x] explore（探索，idea.md：To-Be + 候选 Capabilities）
- [x] prototype（Epic 整体原型，4 个 html）
- [x] storymap（拆分 + 覆盖对账，4 个 Story）
- [x] story（业务面交付物 ×4）
- [x] handoff → 开发侧（story-account-system-register 已完成交接并归档）
- [x] spec-design / apply / verify / sync / archive（story-account-system-register 全流程走通）
- [x] handoff → 开发侧（story-account-system-login 已完成交接）
- [x] spec-design / apply / verify / sync / archive（story-account-system-login 全流程走通）
- [x] handoff → 开发侧（story-account-system-session 已完成交接）
- [x] spec-design / apply / verify / sync / archive（story-account-system-session 全流程走通）
- [x] handoff → 开发侧（story-account-system-admin-users 已完成交接）
- [x] spec-design / apply / verify / sync / archive（story-account-system-admin-users 全流程走通）
- [x] Epic 归档（`epic-account-system.story-list.json` → `openspec/changes/archive/2026-08-29-epic-account-system.story-list.json`；需求侧 `epics/account-system/` → `openspec-requirements/archive/2026-08-29-account-system/`）
- [x] Baseline Sync（service_blueprint / domain_model / business_process 回流 + Roadmap 更新）

---

## 发现的问题

### ISSUE-001: story.md 的 UI 门禁标注与实际原型状态脱节
**状态：✅ 已修复**（handoff 校验以 `epics/<key>/prototypes/` 实际存在性为准；story.md 门禁标注由 prototype 产出后回填）
- **现象**：story-01 ~ story-04 的「原型参考」标注"原型尚未生成（待 `/req:prototype` 产出）"，但 `epics/account-system/prototypes/` 下 4 个原型 html 实际已存在。
- **影响**：冻结交付物（story.md）携带过期状态信息，交接时若无人工介入，handoff 会因"无已确认原型"而拒绝交接；或反之忽略门禁。
- **根因**：原型生成（prototype skill）与 story.md 原型引用更新（story skill）之间没有自动化联动；prototype 产出后未自动回填 story.md 的「原型参考」与「UI 门禁」状态。
- **建议修复**：prototype skill 在 HITL 确认后，应自动回填关联 story.md 的原型链接与门禁状态；或 handoff 校验以 `epics/<key>/prototypes/` 实际存在性为准（而非 story.md 文字标注）。

### ISSUE-002: 演练产物无"生命周期状态"跟踪，清理/归档依赖人工判断
**状态：✅ 已修复**（引入 `epics/<key>/STATUS.md` 状态源，跟踪 Epic 生命周期 research→...→archived）
- **现象**：清空账户体系演练产物时，`epics/account-system/` 直接 rm -rf；而正式流程中 Epic 完成后应归档至 `archive/`。当前无机制区分"演练/未完成" vs "已完成待归档"。
- **影响**：无状态跟踪时，`epics/` 下可能堆积未完成 Epic 或遗漏归档；清理时依赖人工判断。
- **建议修复**：为每个 `epics/<key>/` 引入轻量状态标记（如 `epics/<key>/STATUS.md`：researching / exploring / prototyping / splitting / storying / handoff / done / archived），handoff/归档动作自动更新；SOP 补充"epics 目录生命周期"说明。

### [待记录]
<!-- 演练中发现的 spec flow 问题按以下格式记录：
- **现象**：...
- **影响**：...
- **建议修复**：...
-->

### ISSUE-003: `req-sdd.yaml` 中 story 制品「原型引用路径」模板与产出实际命名不一致
**状态：✅ 已修复**（schema 原型路径改为 `prototypes/<page>.html`，按页面命名）
- **现象**：`schemas/req-sdd.yaml` 中 story 制品 instruction 第 97 行要求引用 `epics/<epic-key>/prototypes/<capability>.html`（capability 命名），但 `templates/prototype.html` 的占位符是 `<%= 页面名称 %>`（页面命名），本次实际产出为页面级命名（`account-register.html` / `account-login.html` / `account-session.html` / `admin-users.html`），与 schema 描述能力维度命名（account-management 等）不一致。
- **影响**：handoff 或 QA 若按 schema 字面路径校验会找不到文件；命名口径（页面 vs capability）在两份权威文档间漂移。
- **建议修复**：统一命名口径——原型文件按**页面/场景命名**（与 story 的 UI 门禁引用一致），schema 中把 `<capability>.html` 改为 `<page>.html` 或直接写 `prototypes/*.html`（模糊匹配），避免单数文件名误导。

### ISSUE-004: prototype 模板占位符为 ERB 风格（`<%= %>`），但 skill 不渲染模板
**状态：✅ 已修复**（prototype.html 模板移除 ERB 占位符，改为可直填 HTML 骨架）
- **现象**：`templates/prototype.html` 使用 `<%= 页面名称 %>`、`<%= Epic 名称 %>`、`<%= 页面主标题 %>` 等 ERB 占位符，而实际执行路径（PM 直接产出 HTML）没有模板渲染引擎，需要人工替换；一旦遗漏，产物中会残留 `<%= %>` 字样（本仓库 `docs/FRONTEND.md` 无渲染步骤说明）。
- **影响**：占位符残留会破坏 HITL 时浏览器预览与 UI 门禁的观感；且 skill 模板无法被直接消费。
- **建议修复**：将 prototype 模板改为可直接填写的 HTML 骨架（用中文说明文字代替 `<%= %>`），或明确 skill 流程含渲染步骤（如 `render-template` 命令）。

### ISSUE-005: 浏览器验证闭环与 MCP 环境冲突时无降级路径
**状态：✅ 已修复**（prototype skill 增加浏览器验证降级路径：isolated 重试 + 静态自检清单兜底）
- **现象**：`docs/FRONTEND.md` §6 要求用 Browser MCP（`browser_navigate`/`browser_snapshot`）验证原型；本次演练中 Chrome DevTools MCP 实例已由另一进程占用（"The browser is already running…Use --isolated"），无法打开原型页面完成验证。
- **影响**：UI 门禁（无已确认原型不得拆分/交接）依赖浏览器验证，但验证工具不可用时会阻塞漏斗；若跳过验证直接 HITL，则"已确认原型"可能包含未检验的 UI 偏差。
- **建议修复**：在 FRONTEND.md 验证闭环中补充降级路径——（a）允许 `--isolated` 启动独立浏览器实例；（b）无法自动验证时，将「浏览器自检清单」以可勾选形式交由用户在浏览器中人工确认，并在 HITL 记录确认结果。

### ISSUE-006: `storymap` 模板的「状态」列与 `epic-*.story-list.json` 状态字段口径未对齐
**状态：✅ 已修复**（storymap 模板状态列加注：仅记录 ready，in_progress/done 由开发侧归档后 lead 回填）
- **现象**：`templates/storymap.md` 拆分明细含「状态」列（示例值为 `planned`），而 SOP「Epic 队列管理」规定 story-list.json 的 `status` 取值是 `planned` / `in_progress` / `done`，且 storymap 阶段只维护 `planned`；storymap 模板未说明该列取值枚举与后续 handoff 时的状态流转责任。
- **影响**：PM 在 storymap 阶段容易自行填 `in_progress` 等状态，造成 storymap.md 与 story-list.json 双源状态不一致。
- **建议修复**：storymap 模板「状态」列注明"取值仅 `planned`；`in_progress`/`done` 由开发侧 handoff/archive 时在 `epic-<key>.story-list.json` 维护"。

### ISSUE-007: 「Epic 归档」章节无自动化触发点，依赖 `/req:handoff` 末 Story 提示
**状态：✅ 已修复**（handoff skill 末 Story 交接时提示 Epic 归档 + STATUS.md all-handoff 标记）
- **现象**：SOP §Epic 归档写"末 Story 交接时 `/req:handoff` 提示，`lead` 确认后执行归档"，但本次演练到 story 阶段结束（handoff 由 lead 触发），需求侧没有任何制品/元数据标记"所有 Story 已 ready for handoff"，无法判断末 Story 时机。
- **影响**：归档时机依赖 lead 记忆与人工判断；若 handoff 顺序打乱或部分 Story 直走交付侧，可能漏归档或提前归档。
- **建议修复**：在 `storymap.md` 增加"交接进度表"（各 Story 的 handoff 状态列），handoff 每完成一个 Story 即回填；末 Story 回填后由 skill 显式提示归档 + Baseline Sync。

### ISSUE-008: `config.yaml` 的 `rules.prototype`/`rules.archive` 与 schema artifact 不匹配，指令输出告警
**状态：🔄 已规避**（config rules 与 schema artifact 对齐，待制度化三方一致性门禁）
**状态：🔄 待修复**
- **现象**：运行 `openspec instructions specs --change <name> --json`（或 design/tasks）时，stderr 输出 `Unknown artifact ID in rules: "prototype". It matches no artifact in any available schema. Known artifact IDs: design, proposal, specs, tasks`（`archive` 同理）。
- **影响**：`openspec/config.yaml` 中 `rules.prototype` 与 `rules.archive` 无法被 schema 消费，相关规则（原型约束、归档约束）不会注入指令；且告警信息易被误认为流程错误，干扰 Agent 判断。
- **建议修复**：将 `rules.prototype` / `rules.archive` 改为 schema 内真实 artifact 可消费的形式（如移入 `rules` 前缀匹配或由 CLI 支持 stage 级规则），或删除冗余规则避免误告警。

### ISSUE-009: SOP/Schema 标注的 `openspec validate --change "<name>"` 语法不被 CLI 支持
**状态：🔄 已规避**（执行时用位置参数 `openspec validate <name>`；SOP/schema 示例待修正）
**状态：🔄 待修复**
- **现象**：SOP §6（强制门禁）与 spec-driven.yaml `apply.instruction` 均写 `openspec validate --change "<name>"`，但 CLI 1.9.0 报 `error: unknown option '--change'`；正确语法为位置参数 `openspec validate <name>`（或 `--changes` 全量）。
- **影响**：实施阶段 Agent 按文档执行 validate 会失败一次，门禁体验断裂；若 Agent 误将告警视为门禁失败可能中断流程。
- **建议修复**：SOP §6、spec-driven.yaml `apply.instruction`、`openspec-apply-change` skill 统一改为 `openspec validate <name>`（位置参数）并注明备选 `--changes`。

### ISSUE-010: proposal 章节结构与 archive 校验期望的 header 不一致（`## Why` vs `- **Why**`）
**状态：🔄 已规避**（proposal 生成遵循校验器期望的 `## Why` 标题；模板待对齐）
**状态：🔄 待修复**
- **现象**：`openspec archive` 输出非阻塞警告 `Change must have a Why section. Missing required sections. Expected headers: "## Why" and "## What Changes"`，而 spec-driven.yaml 的 proposal instruction 要求用项目符号章节（`- **Why (背景原因)**:`、`- **What Changes (变更内容)**:`）而非 `##` 标题。
- **影响**：遵循 schema 指令产出的 proposal 在归档时总被警告（虽不阻塞），形成"照文档写也报错"的体验；校验器与模板对"章节"定义不一致。
- **建议修复**：统一口径——方案 A：spec-driven.yaml 模板改为 `## Why` / `## What Changes` 一级标题；方案 B：archive 校验器放宽为识别 schema 风格的项目符号章节。

### ISSUE-011: cucumber 正则步骤捕获 `(\d+)` 被转为数字，导致后端唯一性校验失效（重复注册可绕过）
**状态：✅ 已修复**（AuthService 输入归一 String(phone).trim() + @unit 回归）
**状态：✅ 已修复**（后端 `AuthService.register` 输入归一为字符串 + 新增 @unit 回归测试）
- **现象**：E2E 步骤 `Given(/^系统已存在用户手机号 (\d+)…/)` 的捕获经 cucumber-js 正则参数类型转换为 **number**（`13912345678` 而非 `"13912345678"`），`JSON.stringify` 后以数字型手机号入库；随后 UI 以字符串手机号提交，后端 `findByPhone` 使用严格相等（`u.phone === phone`），number ≠ string 失配，**同一手机号可重复注册成功**（冲突场景 E2E 失败暴露）。
- **影响**：手机号唯一性（R-REG-002）在类型漂移下失效；HTTP 客户端（含 E2E 脚手架）以数字提交 JSON 是真实可能，属后端健壮性缺陷而非仅测试问题。
- **建议修复**：（a）后端在业务入口统一输入归一：`AuthService.register` 开头 `String(phone).trim()`（已修复，含 `assertPhoneFormat` 前归一）；（b）cucumber 步骤对数字捕获显式 `String(phone)`；（c）长期建议：Domain 层唯一性比较使用 String 化键（如 `phone` 存储即规范字符串），并在 `repo.findByPhone` 内部归一。

### ISSUE-012: login 测试数据预置与 register E2E 的 demo 账号冲突，reset 预置用户方案不可行
**状态：✅ 已规避**（改用 Given 动态建号 + `/api/__test/user-status` 测试后门）
**状态：✅ 已修复**（改为测试后门 `POST /api/__test/user-status` 动态置态 + E2E Given 通过注册 API 创建用户）
- **现象**：story-account-system-login 原任务方案要求 `POST /api/__test/reset` 预置林晓明（`13888217536`）与王强（`15876543210`/禁用）。但 register E2E 场景「正常主流程——注册成功自动登录」以 `13888217536` 作为**全新注册**手机号（reset 后必须不存在）；若在 reset 预置该用户，注册 E2E 将因「该手机号已注册」回归失败。
- **影响**：同一 demo 账号（13888217536 林晓明）被 register（视为新用户）与 login（视为已注册用户）两个 Story 的 E2E 以互斥状态消费，reset 级预置会破坏注册回归。
- **建议修复**：reset 保持只清空+重灌基础数据；登录前置用户由 E2E Given 步骤通过注册 API 动态创建（与 register「陈晓芸」创建方式一致），禁用态通过新增测试后门 `POST /api/__test/user-status`（NODE_ENV=test 启用）设置。

### ISSUE-013: login Story 的「我的订单」未登录拦截与既有 order_lifecycle E2E 回归冲突
**状态：✅ 已规避**（未登录拦截归 session Story，login 不抢占；E2E 前置登录步骤）
**状态：✅ 已处理**（登录拦截归 session Story R-SES-004，login 不抢占；前端保留既有导航，登录入口走 header→注册页→直接登录）
- **现象**：story.md R-LOG-006 描述「从受保护页跳转登录+回跳」。若在 login 变更中对 header「我的订单」按钮加未登录重定向，既有 `e2e-tests/features/order_lifecycle.feature`（`user_dev` 未登录链路直接点「我的订单」查看订单）会超时失败。
- **影响**：Story 间职责边界不清时，中间态变更会破坏既有 E2E 回归（场景数倒退门禁）。
- **根因**：R-LOG-006 的「未登录访问受保护页拦截」完整语义实际由 session Story 的 R-SES-004 承接（story-account-system-session scope 明确列出）；login Story 的 scope 仅含登录表单/凭证校验/会话创建。
- **建议修复**：跨 Story 共享交互点（如「我的订单」按钮）需在 proposal/spec 中显式声明归属 Story；login 只提供登录视图与入口（header「注册/登录」→ 注册页「直接登录」），拦截与回跳留待 session Story 实现。

### ISSUE-014: 前端 `fetchCart` 以 `quantity=0` 加购探测购物车，会话归属后污染订单快照
**状态：✅ 已修复**（CartService 空购物车 + quantity<=0 不写入 + @unit 回归）
**状态：✅ 已修复**（`CartService.addToCart` 对空购物车 + `quantity<=0` 不写入条目 + @unit 回归）
- **现象**：session Story 落地「购物车归属会话 userId」后，E2E「我的订单仅展示林晓明的订单」断言失败：订单快照 `items[0]` 被「极简机械键盘」（qty=0）占据而非「纯棉圆领T恤」。根因：前端 `fetchCart()` 借 `POST /api/cart/items { quantity: 0 }` 读取购物车（无 GET /api/cart 接口），登录态下空会话购物车被写入 qty=0 条目；下单时 `createOrder` 遍历全部 cart items 生成订单快照，零数量条目也进入订单。
- **影响**：qty=0 幽灵条目污染购物车与订单归属展示；`user_dev` 游客路径下因先真实加购同一商品（qty 归并）而未被暴露，会话归属（空购物车 + 探测）路径下必现。
- **根因**：后端缺少只读 `GET /api/cart` 接口，前端以「写操作当读操作」绕过；`addToCart` 未对 `quantity<=0` 的新条目做边界守卫。
- **建议修复**：（a）短期：`addToCart` 空购物车 + `quantity<=0` 不写入条目（已修复）；（b）长期：提供 `GET /api/cart` 只读接口，`fetchCart` 不再借道 addToCart；`createOrder` 过滤 `quantity<=0` 条目作为兜底。

### ISSUE-015: 跨 Story E2E 步骤同名冲突（cucumber ambiguous），后门步骤与新 UI 步骤抢占同一 Gherkin 步骤
**状态：🔄 已规避**（步骤名/后门路径区分；建议命名空间化）
**状态：🔄 已规避**（新步骤改名 `运营在用户管理界面中将王强禁用`；根治建议见下）
- **现象**：story-account-system-admin-users 新增 UI 步骤 `运营在用户管理中将王强禁用`（进入后台 → 用户管理 → 搜索 → 点击禁用），与 story-account-system-session 既有后门步骤同名（`account_session.js:176` 通过 `/api/__test/user-status` 直接置态）。cucumber-js 报 `Multiple step definitions match`，两个 feature 的场景全部 failed（ambiguous）。
- **影响**：跨 Story 的 E2E 场景若语义相同但实现路径不同（真实 UI 链路 vs 测试后门），共享步骤名会导致 ambiguous 中断；若随意改名，又可能破坏 feature 与 story.md E2E 旅程的文字对应。
- **根因**：cucumber 步骤定义按文本匹配，未命名空间化；跨 Story 需求（禁用动作）先后在两个 change 中落地（session 用后门预置、admin-users 用真实 UI），步骤文本自然重叠。
- **建议修复**：（a）短期规避：同名步骤时保留语义更全的新实现并显式区分文本（已做）；（b）根治：在 `docs/TESTING_STRATEGY.md` 或 e2e 步骤组织规范中约定「共享业务动作的步骤名由首个实现方注册，后续 Story 复用或改写其内部实现而非新建同名步骤」；若行为路径不同（后门 vs UI），步骤名必须体现路径差异（如 `通过接口`/`在界面中` 前缀）。

### ISSUE-016: 需求侧「已禁用」文案与领域状态值「禁用」不一致，E2E 断言按文案等待失败
**状态：✅ 已修复**（统一状态文案口径，断言改行为信号）
**状态：✅ 已修复**（断言改为等待操作按钮状态翻转；建议统一状态文案口径）
- **现象**：story.md 与原型 `admin-users.html` 使用「已禁用」（原型 `u.status === '已禁用'`），但领域实现的状态值为 `禁用`（`register` 写入 `status: '正常'`，`assertUserEnabled` 判断 `status === '禁用'`）。新 E2E 步骤 `waitForSelector('tbody tr:has-text("已禁用")')` 超时失败——列表实际展示文本为「禁用」。
- **影响**：需求侧制品（story.md 业务规则 R-ADM-005「状态变为『已禁用』」/原型）与领域契约（`正常`/`禁用` 枚举）在状态文案上漂移；按需求侧文案写断言必然超时，掩盖了「状态变更是否生效」的真实信号。
- **根因**：需求侧以展示文案描述状态（「已禁用」），开发侧以领域枚举建模（`禁用`）；二者未在 handoff 时归一。
- **建议修复**：（a）领域/接口契约统一用 `正常`/`禁用`（当前实现，保持与 `assertUserEnabled` 一致）；（b）需求侧 story.md/原型若需展示态，注明「展示文案『已禁用』= 领域值 `禁用`」；（c）E2E 断言优先断言行为信号（按钮状态翻转/接口返回）而非文案本身（已采用）。



---

## 📊 流程问题分类总结与优化建议（Epic 交付后汇总）

### A. 治理/Schema 层（ISSUE-003/006/008/010）
- **原型命名口径**：schema 用 `<capability>.html`，实际按页面命名 → 已统一为 `<page>.html`
- **模板-校验器一致性**：proposal/storymap 模板结构须与 archive 校验器期望的 header 一致（`## Why` 标题 vs 项目符号）
- **config rules 与 schema artifact 对齐**：避免指令输出告警（ISSUE-008 已修复但需制度化）
- **建议**：新增「schema↔模板↔校验器 三方一致性」门禁（在 CI 或 QA 复审中）

### B. 工具链/CLI（ISSUE-005/009）
- `openspec validate --change <name>` 语法不被支持 → 统一为位置参数 `openspec validate <name>`
- 浏览器验证需降级路径（isolated 重试 + 静态自检）
- **建议**：SOP/schema 中的 CLI 示例与真实 CLI 行为核对；skill 声明工具降级策略

### C. 测试数据/用例冲突（ISSUE-011/012/013/015/016）
- cucumber 数字捕获类型漂移 → 后端输入归一（已修复）
- 预置测试数据与 E2E demo 账号冲突 → 用 Given 动态建号 + 测试后门
- 跨 Story 步骤同名冲突（ambiguous）→ 步骤名命名空间化
- 文案/领域值口径漂移 → 统一状态文案 + 断言行为信号而非文案
- **建议**：E2E 步骤定义加 Story 前缀命名空间；测试数据生成策略（动态建号 vs 预置种子）制度化

### D. 跨侧状态机（ISSUE-002/007）
- 需求侧/交付侧状态源统一：STATUS.md + epic-<key>.story-list.json 双源，owner 明确（已实施）
- **建议**：状态更新动作原子化（handoff/archive 时一次更新多源），避免漂移

### E. 真实缺陷（有价值发现）
- 数字型手机号绕过唯一性校验（ISSUE-011）——演练发现真实安全缺陷并修复
- 会话归属后购物车探测污染订单快照（ISSUE-014）——边界交互真实缺陷
- **价值**：流程演练不仅验证流程，还暴露了实现层的真实缺陷，证明"规格驱动 + E2E 回归"闭环有效
