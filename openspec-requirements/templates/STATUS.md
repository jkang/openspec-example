# Epic 状态机: <Epic 名称>

> Epic Key: `<epic-key>`
> 本文件是需求侧 Epic 生命周期的**唯一状态源**，由各阶段 skill/命令自动更新。

## 阶段状态

| 阶段 | 状态 | 说明 |
| --- | --- | --- |
| research（需求调研） | ⬜ | researching / done（HITL 确认后置 done） |
| explore（探索） | ⬜ | exploring / done（HITL 确认后置 done） |
| prototype（原型·Epic整体） | ⬜ | prototyping / done（HITL 确认后置 done；不涉及 UI 记 n/a） |
| arch（架构影响·OPT） | ⬜ | arching / done / n/a（OPT，HITL 确认或无影响 no-op 后置 done；跳过记 n/a） |
| storymap（需求拆分） | ⬜ | splitting / done（HITL 确认后置 done） |
| stories（Story 交付） | ⬜ | storying / 部分 done / all done |
| test-design（测试设计·MUST） | ⬜ | test-designing / done（各 Story 交接前完成，HITL 确认后置 done） |

## Story 交付状态

| Story ID | 状态 | changeName | 开发侧归档 |
| --- | --- | --- | --- |
| story-<epic-key>-<功能1> | ready | — | ⬜ |
| story-<epic-key>-<功能2> | ready | — | ⬜ |

> Story 状态流转：`ready → handoff（/req:handoff 交接后）→ dev-in-progress（开发侧 change 创建）→ done（开发侧归档后由 lead 回填）`

## Epic 生命周期

- [ ] **active**（research 创建目录时）
- [ ] **all-handoff**（全部 Story 已交接开发侧）
- [ ] **all-done**（全部 Story 开发侧已归档，`epic-<key>.story-list.json` 全 done）
- [ ] **archived**（`epics/<epic-key>/` → `archive/YYYY-MM-DD-<epic-key>/`）

> 状态 owner：需求侧 skill（research→done / explore→done / prototype→done / arch-impact→done|n/a / storymap→done / test-design→done / handoff→handoff）；开发侧归档后由 `lead` 回填 done/archived。
