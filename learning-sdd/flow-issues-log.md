# Spec Flow 演练问题记录（用户账户体系 Epic）

> **用途**：在「用户账户体系」流程演练过程中，记录发现的 spec flow（规格驱动流程）问题，供后续修正优化。
> **状态**：🔄 演练中

## 演练进度

- [x] research（需求调研，含访谈原始记录）
- [x] explore（探索，idea.md：To-Be + 候选 Capabilities）
- [x] prototype（Epic 整体原型，4 个 html）
- [x] storymap（拆分 + 覆盖对账，4 个 Story）
- [x] story（业务面交付物 ×4）
- [ ] handoff → 开发侧（进行中）
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

