# Epic 状态机: 小程序渠道接入与账户打通

> Epic Key: `epic-miniprogram-channel`
> 本文件是需求侧 Epic 生命周期的**唯一状态源**，由各阶段 skill/命令自动更新。

## 阶段状态

| 阶段 | 状态 | 说明 |
| --- | --- | --- |
| research（需求调研） | ✅ done | research.md 已产出并经 HITL 确认（2026-09-08；Q1=A / Q2=提示登录 / Q3=纯预留 / Q4=脱敏 / Q6=mock 后门 / Q8=6.1 含小程序登录 UI 已裁定） |
| explore（探索） | ✅ done | idea.md 已产出并经 HITL 确认（2026-09-08；10 条决策口径全部确认：Q5/Q7/Q9/Q10 按推荐方案） |
| prototype（原型·Epic整体） | ✅ done | 2 个可交互 HTML 原型产出并经 HITL 确认（2026-09-08：wechat-login + channel-admin，ZAPP 暗黑） |
| storymap（需求拆分） | ✅ done | storymap.md 已产出并经 HITL 确认（2026-09-08；3 Story 拆分 + 覆盖对账全绿） |
| stories（Story 交付） | ✅ all-handoff | 3 Story 业务面交付物已产出并全部交接开发侧（2026-09-08） |

## Story 交付状态

| Story ID | 状态 | changeName | 开发侧归档 |
| --- | --- | --- | --- |
| story-miniprogram-channel-config | done | story-miniprogram-channel-config | ✅（2026-09-08） |
| story-miniprogram-wechat-login | done | story-miniprogram-wechat-login | ✅（2026-09-08） |
| story-miniprogram-order-channel | done | story-miniprogram-order-channel | ✅（2026-09-08） |

> Story 状态流转：`ready → handoff（/req:handoff 交接后）→ dev-in-progress（开发侧 change 创建）→ done（开发侧归档后由 lead 回填）`

## Epic 生命周期

- [x] **active**（research 创建目录时）
- [x] **all-handoff**（全部 Story 已交接开发侧）
- [x] **all-done**（全部 Story 开发侧已归档，`epic-<key>.story-list.json` 全 done）
- [x] **archived**（`epics/<epic-key>/` → `archive/YYYY-MM-DD-<epic-key>/`）

> 状态 owner：需求侧 skill（research→done / explore→done / prototype→done / storymap→done / handoff→handoff）；开发侧归档后由 `lead` 回填 done/archived。
