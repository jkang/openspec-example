---
name: "Review"
description: "Tech Lead 技术评审：五维深度审计当前实现，输出 P0-P3 缺陷分级、修复紧迫性与分阶段修复计划"
allowed-tools: Bash(*)
category: "Workflow"
tags: ["workflow", "review", "architecture", "security", "quality"]
---

对当前实现执行 Tech Lead 级技术评审，并将报告写入 `review.md`。

**角色协议（唯一事实来源）**：执行前必须完整阅读 `.opencode/agents/reviewer.md`，严格按其五维清单、缺陷定级、输出模板与约束执行。当前工具无法加载 agent 时，以该文件作为角色定义。

**Store selection:** If the user names a store (a store is a standalone OpenSpec repo registered on this machine) or the work lives in one, run `openspec store list --json` to discover registered store ids, then pass `--store <id>` on the commands that read or write specs and changes (`new change`, `status`, `instructions`, `list`, `show`, `validate`, `archive`, `doctor`, `context`, `view`). Other commands do not take the flag. Hints printed by commands already carry the flag; keep it on follow-ups. Without a store, commands act on the nearest local `openspec/` root.

**Input**: 可选变更名（如 `/opsx:review coupon-engine-upgrade`）。省略时从对话上下文推断，或运行 `openspec list --json` 让用户选择。

**Scope**

- 提供 change 名：change 级评审（默认）
- `epic:<epic-key>`：Epic / baseline 级评审
- `repo`：全仓级评审（用户要求"审计当前实现"时）

**Steps**

1. **确定 scope 与证据**
   - change 级：`openspec status --change "<name>" --json` 解析 `changeRoot`；读取 `proposal.md`、`specs/`、`design.md`、`tasks.md`、`verify.md`；用 `git diff` / `git log` 界定实现面。
   - Epic / 全仓级：读取 `docs/baseline/`、`openspec/specs/`、`docs/ROADMAP.md` 与相关代码。
   - 读取治理基线：`docs/PRODUCT.md`、`docs/ARCHITECTURE.md`、`docs/QUALITY_SCORE.md`、`docs/TESTING_STRATEGY.md`、`docs/FRONTEND.md`。

2. **执行五维审查**
   - 架构合理性 / 技术架构设计 / 业务知识深度 / 安全 / 质量，逐项取证。
   - 不重复执行 qa 的完整门禁；`verify.md` 作为证据输入；必要时只运行目标测试或只读命令验证具体怀疑。

3. **定级与排序**
   - 每个 finding 标注 P0-P3、紧迫度、置信度、证据（`file:line` / spec / baseline 节点）。
   - 无证据不写 finding；不确定项写入"待验证假设"。

4. **输出报告**
   - change 级：`<changeRoot>/review.md`
   - Epic / 全仓级：`docs/governance/reviews/YYYY-MM-DD-<scope>.md`
   - 使用 reviewer 协议中的模板（Verdict / Scope & Evidence / Findings / Dimension Scorecard / Remediation Plan / Risk Acceptance / Re-review Triggers）。

5. **HITL 与门禁**
   - 输出 Verdict、Top 3 风险、报告路径与建议下一步，交由 `lead` 呈报用户裁决。
   - P0：阻断 sync / archive；P1：阻断归档，除非用户书面接受风险；P2/P3：登记技术债。
   - 存在阻断项时明确输出"禁止进入 `/opsx:sync` / `/opsx:archive`"。

**Guardrails**

- 只读代码与规划制品；只允许写 review 报告。禁止直接修复、禁止修改 specs/design/tasks/baseline。
- 不伪造测试结果；引用 `verify.md` 时注明生成时间与结论。
- 跨工具一致性：本命令与 `.trae/commands/opsx/review.md`、`.cursor/commands/opsx/review.md`、`.agents/commands/opsx/review.md` 必须保持同步。
