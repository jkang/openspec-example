# Epic 状态机: 小程序会员积分（会员权益与积分）

> Epic Key: `epic-miniprogram-membership-points`
> 本文件是需求侧 Epic 生命周期的**唯一状态源**，由各阶段 skill/命令自动更新。

## 阶段状态

| 阶段 | 状态 | 说明 |
| --- | --- | --- |
| research（需求调研） | ✅ done | 2026-10-20 产出 `research.md` 并经 HITL 确认；Q1=A 新增 Phase 9「会员与复购」/ Q2=A 纯复购激励 / Q4=C 现结 `PAID`+账期 `Receipt` 后计发 / Q8=A 等级 Out of Scope |
| explore（探索） | ⬜ | 待 Phase 9 登记 ROADMAP 后启动（research 已确认可进入） |
| prototype（原型·Epic整体） | ⬜ | 涉及小程序/Web UI，待 explore 确认范围后执行 |
| storymap（需求拆分） | ⬜ | 待 explore 与原型确认后执行 |
| stories（Story 交付） | ⬜ | 待 storymap 产出 |

## Story 交付状态

| Story ID | 状态 | changeName | 开发侧归档 |
| --- | --- | --- | --- |
| 待 storymap 产出 | — | — | ⬜ |

> Story 状态流转：`ready → handoff（/req:handoff 交接后）→ dev-in-progress（开发侧 change 创建）→ done（开发侧归档后由 lead 回填）`

## Epic 生命周期

- [x] **active**（research 创建目录时）
- [ ] **all-handoff**（全部 Story 已交接开发侧）
- [ ] **all-done**（全部 Story 开发侧已归档，`epic-<key>.story-list.json` 全 done）
- [ ] **archived**（`epics/<epic-key>/` → `archive/YYYY-MM-DD-<epic-key>/`）

> 状态 owner：需求侧 skill（research→done / explore→done / prototype→done / storymap→done / handoff→handoff）；开发侧归档后由 `lead` 回填 done/archived。
>
> 备注：`active` 仅表示需求侧工作目录已建立，**不代表规划层已批准**。ROADMAP 登记方式（Phase 9 / 并入 Phase 8 / 仅探索）未裁定前，本 Epic 不具备 handoff 条件。
