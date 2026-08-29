# openspec-requirements/tools — 需求分析工具箱 (Requirement Analysis Toolbox)

需求侧（`/req:`）可选调用的**需求工程分析工具**。本目录为工具本体的**唯一事实来源**（单份拷贝，自包含，不依赖外部技能库），由 `.agents/`、`.trae/`、`.cursor/` 三目录下的阶段 skills 编排调用。

> 来源：`~/MyCoding/Skills/myskills/ai4pm-skills`（AI4PM 技能库），本仓库为裁剪适配版。
> 定位：所有工具均为**可选增强**，缺省不影响需求漏斗原有 HITL 门禁；产物一律输出到 `epics/<epic-key>/analysis/<type>/`（见下）。

## 工具清单

| 工具 | 调用阶段 | 作用 | 输出落位 |
| --- | --- | --- | --- |
| `osm-map-generator` | explore | Epic 目标-策略-度量（Exit Criteria 可度量锚点） | `epics/<key>/analysis/osm/{osm.yaml,osm.html}` |
| `business-process-deep-analyzer` | explore | To-Be Process L1/L2 + 痛点热力 | `epics/<key>/analysis/process/{process.yaml,process.html}` |
| `journey-map-generator` | explore | To-Be Journey 可视化（阶段/行为/触点/情绪/痛点） | `epics/<key>/analysis/journey/{journey.yaml,journey.html}` |
| `blueprint-map-generator` | baseline/blueprint | 服务蓝图 YAML→HTML 渲染管线（增强 baseline skill） | `docs/baseline/service_blueprint.html` |
| `brand-design-system` | prototype 前置 | 产品 design system（tokens/组件规格/CSS 变量） | `docs/baseline/design-system/` |
| `prototype-generator` | prototype | 复杂业务产品 → 可运行前后端一体化原型 | `epics/<key>/prototypes/working/` |
| `story-map-generator` | storymap | 阶段-活动-接触点-用户故事 4 层地图 | `epics/<key>/analysis/storymap/{storymap.yaml,storymap.html}` |
| `story-narrative-generator` | story | 故事详述（角色画像/AC/交互逻辑） | `epics/<key>/analysis/narrative/<story-key>/` |

## 环境依赖

- **Python 3** + `jinja2` + `pyyaml`（所有 `build_*.py` 编译引擎必需）
  ```bash
  pip3 install jinja2 pyyaml
  ```
- **Node.js ≥ 18**（`brand-design-system` 的 `generate-tokens.cjs` / `validate-tokens.cjs` 必需）

## 输出命名与路径约定（本仓库适配版）

原 AI4PM 技能约定输出到 `[公司名]/[公司名]-[类型].html`；本仓库统一改为：

```
epics/<epic-key>/analysis/<type>/<type>.yaml   # 结构化数据（LLM 产物）
epics/<epic-key>/analysis/<type>/<type>.html   # 交互式可视化（编译产物）
```

- `<epic-key>` = 需求侧 Epic 目录 key（如 `coupon-system`）
- `<type>` = `osm` / `process` / `journey` / `storymap`
- `story-narrative-generator` 输出为 Markdown：`epics/<epic-key>/analysis/narrative/<story-key>/narrative.md`
- `prototype-generator` 输出为可运行工程：`epics/<epic-key>/prototypes/working/mvp-prototype/`
- `brand-design-system` 输出为产品级设计系统：`docs/baseline/design-system/`
- `blueprint-map-generator` 渲染 `docs/baseline/service_blueprint.html`（由 baseline/blueprint skill 编排）

## 调用契约

各工具以 `SKILL.md` 为操作指南（工作流 SOP），遵循 `LLM → YAML → Python/Jinja2 → HTML` 标准流水线：

1. 读输入（如 `epics/<key>/idea.md` 的 To-Be 章节）
2. 按 `references/*.md` 铁律生成结构化 YAML（保存到输出落位）
3. 运行编译引擎：
   ```bash
   python3 <tool>/scripts/build_*.py <input.yaml> <output.html>
   ```
4. 产物写入 `analysis/` 落位，供 idea/storymap/story 引用与 HITL 审查

## 裁剪说明

- 已删除 `examples/` 中 PNG 预览与冗余成品 HTML，仅保留 1 个示例 YAML 作为数据契约参考
- `brand-design-system` 已裁剪：保留 tokens/组件规格/校验核心，幻灯片子系统（slides）标注可选
- `prototype-generator` 上游输入由"AI Canvas + To-be Journey"适配为"idea.md 的 To-Be 章节 + design-system tokens"
