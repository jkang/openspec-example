# Epic 状态机: 小程序 C 端交易链路

> Epic Key: `epic-miniprogram-shopping`
> 本文件是需求侧 Epic 生命周期的**唯一状态源**，由各阶段 skill/命令自动更新。

## 阶段状态

| 阶段 | 状态 | 说明 |
| --- | --- | --- |
| research（需求调研） | ✅ done | research.md 已产出并经 HITL 确认（2026-09-08；技术栈形态 B 已裁定：独立小程序原生工程） |
| explore（探索） | ✅ done | idea.md 已产出（2026-09-08；技术栈 B + 3 Story 拆分，用户已授权全程自主） |
| prototype（原型·Epic整体） | ✅ done | miniprogram-shopping.html 旅程原型产出（2026-09-08，用户授权全程自主） |
| storymap（需求拆分） | ✅ done | storymap.md 产出（2026-09-08；3 Story + 覆盖对账全绿） |
| stories（Story 交付） | ✅ all done | 3 Story 业务面交付物已产出并全部交接开发侧（2026-09-08） |

## Story 交付状态

| Story ID | 状态 | changeName | 开发侧归档 |
| --- | --- | --- | --- |
| story-miniprogram-shopping-browse | done | story-miniprogram-shopping-browse | ✅（2026-09-08） |
| story-miniprogram-shopping-checkout | done | story-miniprogram-shopping-checkout | ✅（2026-09-08） |
| story-miniprogram-shopping-orders | done | story-miniprogram-shopping-orders | ✅（2026-09-08） |

> Story 状态流转：`ready → handoff（/req:handoff 交接后）→ dev-in-progress（开发侧 change 创建）→ done（开发侧归档后由 lead 回填）`

## Epic 生命周期

- [x] **active**（research 创建目录时）
- [x] **all-handoff**（全部 Story 已交接开发侧）
- [x] **all-done**（全部 Story 开发侧已归档，`epic-<key>.story-list.json` 全 done）
- [x] **archived**（`epics/<epic-key>/` → `archive/YYYY-MM-DD-<epic-key>/`）

> 状态 owner：需求侧 skill（research→done / explore→done / prototype→done / storymap→done / handoff→handoff）；开发侧归档后由 `lead` 回填 done/archived。
