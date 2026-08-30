# Epic 状态机: 销售报表看板

> Epic Key: `epic-sales-dashboard`
> 本文件是需求侧 Epic 生命周期的**唯一状态源**，由各阶段 skill/命令自动更新。

## 阶段状态

| 阶段 | 状态 | 说明 |
| --- | --- | --- |
| research（需求调研） | ✅ done | HITL 确认 |
| explore（探索） | ✅ done | HITL 确认 |
| prototype（原型·Epic整体） | ✅ done | HITL 确认（sales-dashboard.html，浏览器验证通过） |
| storymap（需求拆分） | ✅ done | HITL 确认（覆盖对账 100% 闭环） |
| stories（Story 交付） | ✅ all done | 2 Story 业务面交付物完成 |

## Story 交付状态

| Story ID | 状态 | changeName | 开发侧归档 |
| --- | --- | --- | --- |
| story-sales-dashboard-overview | ready | — | ⬜ |
| story-sales-dashboard-ranking | ready | — | ⬜ |

> Story 状态流转：`ready → handoff（/req:handoff 交接后）→ dev-in-progress（开发侧 change 创建）→ done（开发侧归档后由 lead 回填）`

## Epic 生命周期

- [x] **active**（research 创建目录时）
- [ ] **all-handoff**（全部 Story 已交接开发侧）
- [ ] **all-done**（全部 Story 开发侧已归档，`epic-<key>.story-list.json` 全 done）
- [ ] **archived**（`epics/<epic-key>/` → `archive/YYYY-MM-DD-<epic-key>/`）

> 状态 owner：需求侧 skill（research→done / explore→done / prototype→done / storymap→done / handoff→handoff）；开发侧归档后由 `lead` 回填 done/archived。
