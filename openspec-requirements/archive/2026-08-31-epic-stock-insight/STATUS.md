# Epic 状态机: 库存预警与补货建议

> Epic Key: `epic-stock-insight`
> 本文件是需求侧 Epic 生命周期的**唯一状态源**，由各阶段 skill/命令自动更新。

## 阶段状态

| 阶段 | 状态 | 说明 |
| --- | --- | --- |
| research（需求调研） | ✅ done | 调研制品完成（lead 已授权跳过 HITL 确认） |
| explore（探索） | ✅ done | idea.md 产出（8 条产品决策口径待用户最终确认，lead 已授权跳过 HITL） |
| prototype（原型·Epic整体） | ✅ done | 原型产出并经浏览器 DOM 验证（lead 已授权跳过 HITL） |
| storymap（需求拆分） | ✅ done | storymap.md 产出，2 Story 拆分完成（lead 已授权跳过 HITL） |
| stories（Story 交付） | 🔄 部分 done | 2 Story 业务面交付物已产出（story-stock-warning-list P0 / story-stock-replenish-suggestion P1），Story 状态保持 ready，待 /req:handoff 交接开发侧（lead 已授权跳过 HITL） |

## Story 交付状态

| Story ID | 状态 | changeName | 开发侧归档 |
| --- | --- | --- | --- |
| story-stock-warning-list | done | story-stock-warning-list | ✅（2026-08-31） |
| story-stock-replenish-suggestion | done | story-stock-replenish-suggestion | ✅（2026-08-31） |

> Story 状态流转：`ready → handoff（/req:handoff 交接后）→ dev-in-progress（开发侧 change 创建）→ done（开发侧归档后由 lead 回填）`

## Epic 生命周期

- [x] **active**（research 创建目录时）
- [x] **all-handoff**（全部 Story 已交接开发侧）
- [x] **all-done**（全部 Story 开发侧已归档，`epic-<key>.story-list.json` 全 done）
- [x] **archived**（`epics/<epic-key>/` → `archive/YYYY-MM-DD-<epic-key>/`）

> 状态 owner：需求侧 skill（research→done / explore→done / prototype→done / storymap→done / handoff→handoff）；开发侧归档后由 `lead` 回填 done/archived。
