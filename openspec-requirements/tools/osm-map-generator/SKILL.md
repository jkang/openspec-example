---
name: osm-map-generator
description: |
  根据业务描述，自动生成包含结构化 OSM（目标-策略-度量）与业务场景分析的高颜值 HTML 报告。

  Triggers when user mentions:
  - "生成 OSM 地图"
  - "generate OSM map"
  - "目标策略度量地图"
  - "OSM framework"
author: KK
---

# OSM Map Generator  v2

将战略分析和前端可视化分为两段：
1. LLM 理解业务描述 → 一次性输出含底层场景的完整 YAML
2. Python 编译引擎 → 读取 YAML → 精准布局 → 独立单文件 HTML

> [!IMPORTANT]
> **双重输出规范 (Dual Output Standard)**: 
> 当你使用此 Skill 时，必须**同时**输出两个部分：
> 1. **结构化 YAML**: 用于下一步的自动化处理和数据存档。
> 2. **交互式 HTML**: 用于最终用户的直观审查与演示。
> 
> **输出路径与命名规范 (Output Path & Naming Convention)**:
> - **目录**: 所有输出文件必须放在当前工作目录下的一个新子目录中，目录名为 `[公司/业务名]` (例如：`张雪机车海外销售/`)。
> - **文件名**: HTML 文件名必须反映内容，格式为 `[公司/业务名]-[业务类型].html` (例如：`张雪机车海外销售-OSM战略地图.html`)。
> 
> **视觉设计规范 (Visual Design Standard)**:
> - **样式风格**: 默认按照 `ai4pm-skills/design.md` 进行样式输出。
> - **底色模式**: 默认使用 **浅色底 (Light Mode)**。
> - **页面布局**: HTML 内容占据页面 **85%** 宽度，保持简洁的 Header 设计（参考简洁 Header 规范）。

---

## 工作流 SOP

### Step 1 · 解析输入
- 阅读用户描述，识别行业领域，内化核心痛点与期望目标

### Step 2 · 生成 YAML
- 读取 `references/osm_prompts.md` 获取全部设定（角色+字段规范+示例）
- 使用完整 prompt 指导 LLM 生成结构化 YAML（字段说明见 `references/schema.yml`）
- 将生成内容保存至 `examples/<标识>.yaml`

### Step 3 · 校验 YAML（选做）
- 确认文件以 `title:` 开始，无 Markdown 代码块外壳
- 确认每个子目标都有 `relatedScenarios.scenarios`（≥ 2 条）
- 如有格式问题，脚本会自动剥除 ` ``` ` 标记后重试解析

### Step 4 · 编译 HTML
```bash
python3 scripts/build_osm.py examples/<输入>.yaml examples/<输出>.html
```

### Step 5 · 交付
- 通知用户用浏览器打开生成的 HTML 文件即可查看完整可视化

---

## 目录结构

```
osm-map-generator/
├── SKILL.md                        # 本文件：主控工作流说明
├── references/
│   ├── osm_prompts.md              # 综合 LLM 提示词（OSM + 场景分析二合一）
│   └── schema.yml                  # 标准 YAML 数据契约示例
├── templates/
│   └── osm_layout.html             # Jinja2 HTML/CSS 模板（与算法完全解耦）
├── scripts/
│   └── build_osm.py                # 核心编译引擎（v2）
└── examples/                       # 存放每次生成的 YAML & HTML
```

---

## build_osm.py v2 核心能力

| 能力 | 实现方式 |
|------|----------|
| 防呆 YAML 解析 | 正则自动剥除 ` ```yaml ` 和 ` ``` ` 代码块包裹 |
| 模板引擎分离 | Jinja2 + `templates/osm_layout.html`，样式修改无需动算法代码 |
| 动态高度测算 | 根据 `scenarios` 条数精算业务场景卡片高度，避免节点重叠 |
| SVG 贝塞尔连线 | 自动为父目标→子目标绘制虚线路径，关系直观 |
| `config` 生效 | `config.height.objectiveScore` 真正控制目标行高度 |
| 多层树支持 | level ≥ 2 的节点自动折叠入 sub-lane，不破坏整体布局 |

---

## 输出标准

- 纯静态单文件 HTML，无 JS 依赖，可直接离线浏览或分享
- 浏览器原生横向滚动，宽度自适应节点数量
- 色彩体系：蓝（主目标）→ 绿（子目标）→ 白（策略/指标）→ 紫（业务场景）

## QA 清单

- [ ] YAML 是否能直接被 `yaml.safe_load` 解析（含防呆前处理）
- [ ] 每个子目标是否都渲染了策略卡、指标卡、业务场景卡
- [ ] 页面横向是否能完整展示所有列（无截断）
- [ ] 业务场景描述是否符合业务领域专业表述
