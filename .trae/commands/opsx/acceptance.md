---
name: "Acceptance"
description: "Run product acceptance for an OpenSpec change with the acceptance skill, capture inspected evidence, and render a local report"
allowed-tools: Bash(*)
category: "Workflow"
tags: ["workflow", "acceptance", "verification"]
---

用 `acceptance` skill 为一个 OpenSpec change 执行产品验收：把交付变成「人可裁决的结果」检查项，
在真实产品上跑、采集证据、渲染本地报告。

**与 `/opsx:verify` 的分工**：`verify` 跑机器门禁（单测/构建/E2E），判"代码是否可信"；
本命令判"用户看到的是否正确"。单测、覆盖率、`tsc`、lint、构建、CI 绿灯**不是**验收检查项，
只能在报告里写一行叙述。

**Input**: `/opsx:acceptance [<change-name>]`。省略时从上下文推断，或 `openspec list --json` 让用户选择。

**本仓库运行事实**（直接使用；不创建 `.agents/acceptance/` 项目适配层，执行编排由 SDD 整体 flow 负责）：
- Node 后端 `3000`（验收用 `NODE_ENV=test`，内存态，测试后门才生效）；Vue 前端 `5173`；Python `8000` 可选。
- 鉴权流程必须走 `http://localhost:5173`（Vite 代理 `/api`；3000 的 CORS 只放行 `Content-Type`）。
- 只有暗黑主题 + 中文；视口默认 1440，布局类再补 `320`、`768`。
- 报告输出目录 `.acceptances/`；首轮创建时在 `.acceptances/.gitignore` 写入 `*`，保持 git 干净。

**Steps**

1. **解析变更**
   - `openspec status --change "<name>" --json` → 取 `changeRoot`。
   - 读 `proposal.md`、`specs/**/*.md`、`design.md`；有需求侧 `story.md` 链接时一并读。

2. **判断是否执行**
   - 纯文档/纯重构且用户可见行为无变化 → **跳过**，一句话说明原因。
   - 已有有效验收且交付未变 → 复用报告，不重跑。
   - 行为已变 → 只跑受影响项，新开一轮（轮次不可变，禁止回填旧轮）。

3. **起草计划（先写计划，后执行）**
   - 目录：`.acceptances/<change-name>/<YYYYMMDD-HHMMSS>-<slug>/`，在其下建 `assets/`；
     若 `.acceptances/.gitignore` 不存在则写入 `*`（首轮一次）。
   - 在 `result.json` 写 `plan[]`，每项：
     `{ id, title, category, verifier, method, expected, requiredEvidence }`。
     - `category` 写业务面（如"购物车"、"运营后台-用户管理"），不是技术层。
     - `requiredEvidence` 只声明真正需要的类型：`screenshot` / `dom_snapshot` / `text` / `gif` / `video`。
   - UI 项把可判定约束写进 `expected`（无圆角/无阴影、暗黑语义令牌、真实中文数据、320 不溢出）。
   - 改动**既有**用户可见文案/布局/样式 → 每项必须有改前/改后对比对（同视口、同状态、暗黑）。
   - 自查：每项问一遍"用户会不会在这里点通过？"——不会的删掉或改写。

4. **计划门禁（先确认再执行）**
   - 调度 `qa`（acceptance-checker）审计划：覆盖缺口、边界、可判定性、有无混入程序化门禁、
     是否缺对比对；最多 2 次反馈。
   - 把计划摘要（检查项标题 + 必需证据 + 与 proposal/specs 的覆盖关系）呈报用户确认。
   - 确认后冻结计划，`id` 不再变化。

5. **执行（交给 `acceptance-runner`）**
   - 用全新上下文委派，传入：changeRoot、冻结计划、改动文件清单、本轮目录、端口与账号事实。
   - 采集引擎 chrome-devtools MCP；截图用 `take_screenshot` 的 `filePath` 落进本轮 `assets/`；
     出处 `--by cdp`；带鉴权流程走 5173。
   - 边采边存，每轮只渲染一次；runner 不修代码，发现缺陷交回由 `engineer` 修复后开新一轮。

6. **证据复核（首轮由 `qa`）**
   - 交给 `qa`：冻结计划、`result.json`、证据索引、被测版本标识。
   - `qa` 逐项打开原始证据（截图必须实际看），给出支撑/不支撑、缺失项、总判定。
   - 缺必需证据 → `uncertain`，不得判通过。

7. **渲染本地报告**
   - 优先用已安装的 `lh`；否则用固定版本：
     ```bash
     npx --yes @lobehub/cli@0.0.73 acceptance run validate "<round-dir>"
     npx --yes @lobehub/cli@0.0.73 acceptance run render "<round-dir>" \
       --requirement "<整次验收的业务目标，一句话>" --json
     ```
   - 首轮必须给 `--requirement`（整次验收的持久目标，不是本轮范围）。
   - 默认**不发布**：不 `lh login`、不 `publish`、不上传证据。

8. **输出摘要**
   给用户：报告路径（`file://...report.html`）、轮次、`Coverage: n/m`、`Verdict`、阻塞项。
   不要粘贴大段日志或证据路径清单。

**Output**

```
## Acceptance Summary

Change: <change-name>
Report: file://<repo>/.acceptances/<change-name>/report.html
Round: 1
Coverage: 2/2 checks, required evidence complete
Verdict: pass
Skipped: <仅当跳过时>
```

**边界**

- 只做产品验收；代码修复归 `engineer`，机器门禁归 `/opsx:verify`，深度审计归 `/opsx:review`。
- 不新建项目适配层、不新增脚本、不改 `openspec/specs` 与业务基线。
- 轮次不可变：修复后新开一轮；已通过的检查项可省略。

**Guardrails**

- 程序化门禁（单测/集成/E2E/覆盖率/lint/构建/CI）不得出现在 `plan[]`/`cases[]`，否则会被丢弃、整轮可能无法渲染。
- 没有证据就没有结论；必需证据缺失即 `uncertain`。
- 三目录（`.agents/`、`.trae/`、`.cursor/`）命令正文一致。
