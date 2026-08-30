# Story: <Story 名称>

<!--
Story 是需求侧唯一冻结交付物（业务面）。
开发侧通过 /req:handoff（skill: handoff）以本 Story 为输入，在 openspec/changes/<name>/ 合成 proposal.md，
随后在开发侧按 capability 拆分生成行为规格 specs（Story-specs）。
需求侧不生成 specs/，行为规格一律由开发侧在 proposal 之后产出。
-->

> Story Key: `story-<epic-key>-<功能>`（命名规范） | 优先级: P0/P1/P2 | 依赖: `<依赖 story 或 无>`
> 关联 Storymap: `epics/<epic-key>/storymap.md`
> 关联 Idea: `epics/<epic-key>/idea.md`
> 关联原型（Epic 整体）: `epics/<epic-key>/prototypes/*.html`

## 用户场景 (User Scenario)
<!--
描述用户在什么背景下使用此功能，解决什么痛点。
- 目标用户（C 端）：
- 使用动机：
- 关键目标：
- B 端视角（若涉及）：后台怎么配置？生命周期如何？谁有权限？
-->

## 范围 (Scope)
### In Scope
- 

### Out of Scope
- 

## 原型参考 (Prototype Reference)
<!--
如果涉及前端 UI，必须在此链接到【已确认】的原型文件。
⚠️ UI 门禁：涉及 UI 的 Story，若原型未生成并经用户 HITL 确认，禁止勾选下方「待开发交接」。
- 原型链接：epics/<epic-key>/prototypes/<capability>.html
- 关键交互点：
-->

## 业务规则 (Business Rules)
| 规则ID | 规则描述 | 触发条件 | 期望结果 | 备注 |
| --- | --- | --- | --- | --- |
| R-001 |  |  |  |  |

## 验收标准 (E2E 用户旅程)
<!--
聚焦于跨模块的端到端用户旅程，使用 Given/When/Then 描述。
必须映射到流程基线中的 L1 (价值流) 和 L2 (协同流) 节点。
同时必须映射到 service_blueprint.html 中的 SB-STAGE-* 与 SB-CUSTOMER-* 节点。
-->

### 旅程 1：<旅程名称> (Ref: L1-XX, L2-XX | SB-STAGE-XX, SB-CUSTOMER-XX)
#### 场景：<正常主流程场景名>
- @e2e
- **GIVEN** <初始状态>
- **WHEN** <用户动作>
- **THEN** <系统反应/结果>

#### 场景：<关键异常场景名>
- @e2e
- **GIVEN** <异常触发前状态>
- **WHEN** <用户动作/异常输入>
- **THEN** <系统反应（如错误提示）>

## 治理映射对齐 (Governance Mapping)
<!--
- Source of Truth: docs/baseline/domain_model.html
- Bounded Context: <边界名称>（新增需显式标注）
- Capability Taxonomy: <capability-path>（新增需显式标注）
- Related Process Nodes: <L3-XX, L3-YY>
- Related Service Blueprint Nodes: <SB-STAGE-XX, SB-<LANE>-XX>
- Sync Assessment: [Yes/No + 原因]
-->

## 分析制品索引 (Analysis Artifacts)
<!--
可选增强（tools/）：story 阶段可调用 story-narrative-generator 生成故事详述（角色画像/交互逻辑/AC/业务价值）。
仅作业务面质量增强，不生成行为规格 specs（那由开发侧在 proposal 后产出）。
- 故事详述: epics/<epic-key>/analysis/narrative/<story-key>/narrative.md — [✅ 已生成 / ❌ 未生成]
-->

## 交接状态 (Handoff Status)
<!--
- [ ] 待开发交接 (openspec-handoff)
- [ ] 已交接 (changeName: <change-name> 记录于 openspec/epic-<key>.story-list.json)
-->
