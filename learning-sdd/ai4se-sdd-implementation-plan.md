# 实施计划：SDD 端到端流程 v2 校准（依据 `ai4se-sdd-proposal.md`）

> **目标**：把需求侧实现校准到已对齐的最终流程（`ai4se-sdd-proposal.md` §2.2/§2.3），包括：命名统一（去 `req-` + `/req:` 子目录）、需求调研环节新增、idea 扩展、P0 规划废弃、原型前置、分层 Sync。
> **分支**：`feature/openspec-requirements`（当前分支继续）
> **状态**：待用户确认后逐步执行

---

## 📊 差距分析（当前 → 目标）

| # | 维度 | 当前实现 | 目标状态 | 变更类型 |
|---|---|---|---|---|
| G1 | 需求侧首环节 | `product-plan`(planning/ROADMAP) + `epic` | **删除**（规划在起点 A 已有） | 删除 |
| G2 | 需求调研 | 无独立环节 | **新增 `research`**（产出 `research.md`） | 新增 |
| G3 | 探索 skill | `req-research`（6步法·重复） | **`explore`**（去 req- + idea 扩展 To-Be/Capabilities） | 重命名+改内容 |
| G4 | 拆分 skill | `req-breakdown` | **`storymap`** | 重命名 |
| G5 | 原型 skill | `req-prototype` | **`prototype`**（Epic 整体·前置到拆分前） | 重命名+改定位 |
| G6 | Story skill | `req-story` | **`story`** | 重命名 |
| G7 | 交接 skill | `openspec-handoff` | **`handoff`**（合成 proposal 已有） | 重命名 |
| G8 | 命令命名空间 | `/opsx:req-*`（前缀） | **`/req:` 子目录**（`.trae/.cursor/commands/req/`） | 迁移 |
| G9 | schema | artifacts: product-plan/epic/idea/storymap/prototype/story | artifacts: **research/explore/prototype/storymap/story**（+handoff） | 重构 |
| G10 | 模板 | product-plan/epic/idea/storymap/story + 缺 research | **research/idea(扩展)/storymap/story**；删 product-plan/epic | 增删改 |
| G11 | 目录 | planning/ ideas/ storymaps/ stories/ | **research/ ideas/ prototypes/ storymaps/ stories/** | 调整 |
| G12 | Sync | 混在 change 级 | **分层**：K1 Spec Sync(change级) + K2 Baseline Sync(Epic级) | SOP+skill 解耦 |
| G13 | SOP/AGENTS/角色 | 旧命名与流程 | 对齐新流程 | 更新 |
| G14 | 演练产物 | planning/ROADMAP.md + 4 story + storymap + idea | 移除 planning，新增 research.md，idea 扩展，storymap 对账 | 校准 |

---

## 📋 实施步骤（分阶段）

### Phase 1 · 需求侧工作区结构与 schema（G1/G2/G9/G10/G11）

1. **目录调整**：
   - `openspec-requirements/planning/` 移除（含 ROADMAP 废弃重定向与 epics/）——Epic 直接来自 `docs/ROADMAP.md`
   - 新增 `openspec-requirements/research/`、`openspec-requirements/prototypes/`
2. **模板**：
   - 删除 `templates/product-plan.md`、`templates/epic.md`
   - 新增 `templates/research.md`（调研纪要：Epic 引用/背景/干系人/原始反馈/约束/疑问/HITL）
   - 扩展 `templates/idea.md`：新增 **To-Be Process / To-Be Journey** 章节 + **Candidate Capabilities** 章节（对齐 domain_model）
   - 调整 `templates/storymap.md`（引用 research/idea；覆盖对账已有）
   - 调整 `templates/story.md`（引用 storymap）
3. **schema `req-sdd.yaml` 重构**（version 3）：
   - artifacts：`research → explore → prototype → storymap → story`
   - `handoff`：保持不变（读 story → 合成 proposal → 登记 epic 队列）
   - 各 artifact instruction 更新（产出路径、HITL、Capabilities 识别）
4. **config.yaml rules 重构**：匹配新 artifacts（research/explore/prototype/storymap/story）

### Phase 2 · Skills 重命名与改造（G3-G7）

5. **删除**：`.agents/.trae/.cursor/skills/req-planning/`
6. **重命名**（三目录同步）：
   - `req-research` → `explore`（内容改写：To-Be Process/Journey + Candidate Capabilities 识别 + 6步法）
   - `req-breakdown` → `storymap`（内容微调：引用 research/idea）
   - `req-prototype` → `prototype`（定位：Epic 整体原型，前置拆分前）
   - `req-story` → `story`（内容微调）
   - `openspec-handoff` → `handoff`
7. **新增**：`.agents/.trae/.cursor/skills/research/`（需求调研 skill）

### Phase 3 · 命令迁移（G8）

8. **删除** `.trae/.cursor/commands/opsx/` 下：`req-planning.md`、`req-research.md`、`req-breakdown.md`、`req-prototype.md`、`req-story.md`、`handoff.md`
9. **新增** `.trae/commands/req/` 与 `.cursor/commands/req/`（子目录命名空间）：
   - `research.md`（→ `/req:research`）、`explore.md`、`storymap.md`、`prototype.md`、`story.md`、`handoff.md`
   - 两目录内容一致（md5 校验）

### Phase 4 · 分层 Sync 解耦（G12）

10. **SOP `docs/SOPS/SDD_WORKFLOW.md`**：
    - sync 章节解耦：`/opsx:sync`（change 级，仅 Spec Sync）；新增说明：Baseline Sync 在 Epic 全部 Story 归档后由 `/opsx:baseline/sync` 统一执行
    - 需求侧章节更新：新漏斗（research→explore→prototype→storymap→story）、`/req:` 命令、适用范围路由
11. **skill `openspec-sync-specs`**：instruction 补充"仅 spec sync（change 级）；baseline 回流由 Epic 级 `/opsx:baseline/sync` 统一执行"
12. **skill `openspec-archive-change`**：归档逻辑提示"若属 Epic 末 Story，提示执行 Baseline Sync + Roadmap 更新"

### Phase 5 · 文档与角色（G13）

13. **`AGENTS.md`**：需求侧路由更新（`/req:*` 命令、`openspec-requirements/` 结构）
14. **角色定义 ×4 处**（`.opencode/agents/` `.cursor/agents/` `.trae/skills/sdd-team/` `.agents/skills/sdd-team/`）：
    - `pm.md`：需求侧流程更新（research/explore/storymap/prototype/story + handoff）
    - `engineer.md`：handoff 承接（合成 proposal 后从 proposal 起步）
    - `lead.md`：编排更新（`/req:` 路由、分层 Sync、Epic 级收尾）

### Phase 6 · 演练产物校准（G14）

15. **用户账户体系**（`openspec-requirements/`）：
    - 移除 `planning/`（ROADMAP 废弃重定向 + epics/account-system）
    - 新增 `research/account-system.md`（调研纪要）
    - `ideas/idea-account-system.md` 扩展：To-Be Process / To-Be Journey / Candidate Capabilities
    - `storymaps/account-system/storymap.md` 对齐新模板（引用 research/idea）
    - 4 个 `stories/*/story.md` 微调引用
    - 删除 `templates` 中已废弃文件引用

### Phase 7 · 校验（回归）

16. **一致性**：6 个 skills 三目录 md5 一致；6 个命令两目录 md5 一致；角色 4 处一致
17. **语法**：`req-sdd.yaml` / `config.yaml` YAML 合法；schema artifacts ↔ config rules 对齐
18. **残留**：无 `req-` 前缀 skill/命令残留、无 `planning` 需求侧产物残留、无过时引用（`req-breakdown`/`req-research`/`openspec-handoff` 等）
19. **openspec CLI**：`openspec list` 无回归；未创建新 change
20. **占位符**：无 foo/test/TODO

---

## 🎯 关键决策点（执行前请确认）

1. **需求侧目录**：移除 `planning/` 目录（含演练产物 epics/account-system）——确认？还是保留 `epics/` 作为"Epic 状态跟踪"（仅引用 docs/ROADMAP）？
2. **原型产物路径**：`openspec-requirements/prototypes/`（Epic 级，顶层）还是维持 `stories/<key>/prototypes/`？**建议改为顶层 `prototypes/<epic-key>/`**（因为原型是 Epic 整体，不属于单个 Story）
3. **`research.md` 命名**：`research/<epic-key>.md`（按 Epic 一个文件）——确认？
4. **分层 Sync 的执行者**：`/opsx:sync` 保持现有命令但语义变为仅 spec sync；Baseline Sync 明确由 `/opsx:baseline/sync`（Epic 级）执行——确认不新增命令？
5. **演练产物**：账户体系演练是否保留（作为示例），还是清空只留骨架？

---

## 执行顺序

1. 确认以上 5 个决策点
2. 按 Phase 1→7 逐步执行（每 Phase 完成后汇报）
3. 全部完成后 QA 复审一轮（确认阻断问题闭环）
