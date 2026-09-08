# Epic 状态机: 回款与应收账款闭环

> Epic Key: `epic-accounts-receivable`
> 本文件是需求侧 Epic 生命周期的**唯一状态源**，由各阶段 skill/命令自动更新。

## 阶段状态

| 阶段 | 状态 | 说明 |
| --- | --- | --- |
| research（需求调研） | ✅ done | research.md 已产出并经 HITL 确认（2026-09-08；Q1 应收来源=A 账期履约转应收 / Q2 角色=B 复用运营） |
| explore（探索） | ✅ done | idea.md 已产出并定稿（2026-09-08；Q1=A / Q2=B / Q10=Order Context 扩展已定） |
| prototype（原型·Epic整体） | ✅ done | accounts-receivable.html 原型产出（2026-09-08） |
| storymap（需求拆分） | ✅ done | storymap.md 产出（2026-09-08；3 Story + 覆盖对账全绿） |
| stories（Story 交付） | ✅ all done | 3 Story 全部开发侧归档（2026-09-08） |

## Story 交付状态

| Story ID | 状态 | changeName | 开发侧归档 |
| --- | --- | --- | --- |
| story-ar-credit-customer | done | story-ar-credit-customer | ✅（2026-09-08） |
| story-ar-receipt-entry | done | story-ar-receipt-entry | ✅（2026-09-08） |
| story-ar-dashboard | done | story-ar-dashboard | ✅（2026-09-08） |

> Story 状态流转：`ready → handoff（/req:handoff 交接后）→ dev-in-progress（开发侧 change 创建）→ done（开发侧归档后由 lead 回填）`

## Epic 生命周期

- [x] **active**（research 创建目录时）
- [x] **all-handoff**（全部 Story 已交接开发侧）
- [x] **all-done**（全部 Story 开发侧已归档，`epic-<key>.story-list.json` 全 done）
- [x] **archived**（`epics/<epic-key>/` → `archive/YYYY-MM-DD-<epic-key>/`）

> 状态 owner：需求侧 skill（research→done / explore→done / prototype→done / storymap→done / handoff→handoff）；开发侧归档后由 `lead` 回填 done/archived。
