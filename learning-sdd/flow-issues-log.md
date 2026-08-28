# Spec Flow 演练问题记录（用户账户体系 Epic）

> **用途**：在「用户账户体系」流程演练过程中，记录发现的 spec flow（规格驱动流程）问题，供后续修正优化。
> **状态**：🔄 演练中

## 演练进度

- [x] research（需求调研，含访谈原始记录）
- [x] explore（探索，idea.md：To-Be + 候选 Capabilities）
- [x] prototype（Epic 整体原型，4 个 html）
- [x] storymap（拆分 + 覆盖对账，4 个 Story）
- [x] story（业务面交付物 ×4）
- [ ] handoff → 开发侧（进行中，由 lead 触发）
- [ ] spec-design / apply / verify / sync / archive
- [ ] Epic 归档 → Baseline Sync

---

## 发现的问题

### ISSUE-001: story.md 的 UI 门禁标注与实际原型状态脱节
- **现象**：story-01 ~ story-04 的「原型参考」标注"原型尚未生成（待 `/req:prototype` 产出）"，但 `epics/account-system/prototypes/` 下 4 个原型 html 实际已存在。
- **影响**：冻结交付物（story.md）携带过期状态信息，交接时若无人工介入，handoff 会因"无已确认原型"而拒绝交接；或反之忽略门禁。
- **根因**：原型生成（prototype skill）与 story.md 原型引用更新（story skill）之间没有自动化联动；prototype 产出后未自动回填 story.md 的「原型参考」与「UI 门禁」状态。
- **建议修复**：prototype skill 在 HITL 确认后，应自动回填关联 story.md 的原型链接与门禁状态；或 handoff 校验以 `epics/<key>/prototypes/` 实际存在性为准（而非 story.md 文字标注）。

### ISSUE-002: 演练产物无"生命周期状态"跟踪，清理/归档依赖人工判断
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
- **现象**：`schemas/req-sdd.yaml` 中 story 制品 instruction 第 97 行要求引用 `epics/<epic-key>/prototypes/<capability>.html`（capability 命名），但 `templates/prototype.html` 的占位符是 `<%= 页面名称 %>`（页面命名），本次实际产出为页面级命名（`account-register.html` / `account-login.html` / `account-session.html` / `admin-users.html`），与 schema 描述能力维度命名（account-management 等）不一致。
- **影响**：handoff 或 QA 若按 schema 字面路径校验会找不到文件；命名口径（页面 vs capability）在两份权威文档间漂移。
- **建议修复**：统一命名口径——原型文件按**页面/场景命名**（与 story 的 UI 门禁引用一致），schema 中把 `<capability>.html` 改为 `<page>.html` 或直接写 `prototypes/*.html`（模糊匹配），避免单数文件名误导。

### ISSUE-004: prototype 模板占位符为 ERB 风格（`<%= %>`），但 skill 不渲染模板
- **现象**：`templates/prototype.html` 使用 `<%= 页面名称 %>`、`<%= Epic 名称 %>`、`<%= 页面主标题 %>` 等 ERB 占位符，而实际执行路径（PM 直接产出 HTML）没有模板渲染引擎，需要人工替换；一旦遗漏，产物中会残留 `<%= %>` 字样（本仓库 `docs/FRONTEND.md` 无渲染步骤说明）。
- **影响**：占位符残留会破坏 HITL 时浏览器预览与 UI 门禁的观感；且 skill 模板无法被直接消费。
- **建议修复**：将 prototype 模板改为可直接填写的 HTML 骨架（用中文说明文字代替 `<%= %>`），或明确 skill 流程含渲染步骤（如 `render-template` 命令）。

### ISSUE-005: 浏览器验证闭环与 MCP 环境冲突时无降级路径
- **现象**：`docs/FRONTEND.md` §6 要求用 Browser MCP（`browser_navigate`/`browser_snapshot`）验证原型；本次演练中 Chrome DevTools MCP 实例已由另一进程占用（"The browser is already running…Use --isolated"），无法打开原型页面完成验证。
- **影响**：UI 门禁（无已确认原型不得拆分/交接）依赖浏览器验证，但验证工具不可用时会阻塞漏斗；若跳过验证直接 HITL，则"已确认原型"可能包含未检验的 UI 偏差。
- **建议修复**：在 FRONTEND.md 验证闭环中补充降级路径——（a）允许 `--isolated` 启动独立浏览器实例；（b）无法自动验证时，将「浏览器自检清单」以可勾选形式交由用户在浏览器中人工确认，并在 HITL 记录确认结果。

### ISSUE-006: `storymap` 模板的「状态」列与 `epic-*.story-list.json` 状态字段口径未对齐
- **现象**：`templates/storymap.md` 拆分明细含「状态」列（示例值为 `planned`），而 SOP「Epic 队列管理」规定 story-list.json 的 `status` 取值是 `planned` / `in_progress` / `done`，且 storymap 阶段只维护 `planned`；storymap 模板未说明该列取值枚举与后续 handoff 时的状态流转责任。
- **影响**：PM 在 storymap 阶段容易自行填 `in_progress` 等状态，造成 storymap.md 与 story-list.json 双源状态不一致。
- **建议修复**：storymap 模板「状态」列注明"取值仅 `planned`；`in_progress`/`done` 由开发侧 handoff/archive 时在 `epic-<key>.story-list.json` 维护"。

### ISSUE-007: 「Epic 归档」章节无自动化触发点，依赖 `/req:handoff` 末 Story 提示
- **现象**：SOP §Epic 归档写"末 Story 交接时 `/req:handoff` 提示，`lead` 确认后执行归档"，但本次演练到 story 阶段结束（handoff 由 lead 触发），需求侧没有任何制品/元数据标记"所有 Story 已 ready for handoff"，无法判断末 Story 时机。
- **影响**：归档时机依赖 lead 记忆与人工判断；若 handoff 顺序打乱或部分 Story 直走交付侧，可能漏归档或提前归档。
- **建议修复**：在 `storymap.md` 增加"交接进度表"（各 Story 的 handoff 状态列），handoff 每完成一个 Story 即回填；末 Story 回填后由 skill 显式提示归档 + Baseline Sync。

