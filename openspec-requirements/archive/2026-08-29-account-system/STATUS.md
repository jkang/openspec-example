# Epic 状态机: 用户账户体系

> Epic Key: `account-system`
> 本文件是需求侧 Epic 生命周期的**唯一状态源**，由各阶段 skill/命令自动更新。

## 阶段状态

| 阶段 | 状态 | 说明 |
| --- | --- | --- |
| research（需求调研） | ✅ done | 3 条访谈记录，HITL 已确认 |
| explore（探索） | ✅ done | To-Be Process/Journey + 4 候选 Capabilities，HITL 已确认 |
| prototype（原型·Epic整体） | ✅ done | 4 页原型（register/login/session/admin-users），HITL 已确认 |
| storymap（需求拆分） | ✅ done | 4 个 Story，14 项覆盖对账全 ✅ |
| stories（Story 交付） | ✅ done | 4 个 Story 已产出；全部完成开发侧归档（register/login/session/admin-users） |

## Story 交付状态

| Story ID | 状态 | changeName | 开发侧归档 |
| --- | --- | --- | --- |
| story-account-system-register | done | story-account-system-register | ✅ |
| story-account-system-login | done | story-account-system-login | ✅ |
| story-account-system-session | done | story-account-system-session | ✅ |
| story-account-system-admin-users | done | story-account-system-admin-users | ✅ |

> Story 状态流转：`ready → handoff（/req:handoff 交接后）→ dev-in-progress（开发侧 change 创建）→ done（开发侧归档后由 lead 回填）`

## Epic 生命周期

- [x] **active**（research 创建目录时）
- [x] **all-handoff**（全部 Story 已交接开发侧）
- [x] **all-done**（全部 Story 开发侧已归档，`epic-account-system.story-list.json` 全 done）
- [x] **archived**（`epics/account-system/` → `archive/2026-08-29-account-system/`）

> 状态 owner：需求侧 skill（research→done / explore→done / prototype→done / storymap→done / handoff→handoff）；开发侧归档后由 `lead` 回填 done/archived。
