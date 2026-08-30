---
name: blueprint-map-generator
description: |
  根据业务流程描述，自动生成高颜值、专业级的服务蓝图（Service Blueprint）HTML。

  Triggers when user mentions:
  - "生成服务蓝图"
  - "generate service blueprint"
  - "服务蓝图生成器"
  - "service blueprint"
author: KK
---

# Blueprint Map Generator

同 osm-map-generator 同源的 Skill 架构，应用于服务蓝图的自动化生成。

> [!IMPORTANT]
> **双重输出规范 (Dual Output Standard)**: 
> 当你使用此 Skill 时，必须**同时**输出两个部分：
> 1. **结构化 YAML**: 用于下一步的自动化处理和数据存档。
> 2. **交互式 HTML**: 用于最终用户的直观审查与演示。
> 
> **输出路径与命名规范 (本仓库适配)**:
> - **目录**: 产物输出到业务基线 `docs/baseline/`（由 `baseline/blueprint` skill 编排，作为 `service_blueprint.html` 的渲染管线）。
> - **文件名**: 数据文件 `docs/baseline/data/service_blueprint.yaml`，渲染产物 `docs/baseline/service_blueprint.html`。
> 
> **视觉设计规范 (Visual Design Standard)**:
> - **样式风格**: 默认按照 `openspec-requirements/tools/design.md` 进行样式输出。
> - **底色模式**: 默认使用 **浅色底 (Light Mode)**。
> - **页面布局**: HTML 内容占据页面 **85%** 宽度，保持简洁的 Header 设计（参考简洁 Header 规范）。

---

## 数据结构（三层泳道）

服务蓝图由若干**纵向阶段 (Phase)** 组成，每个阶段包含三横层：

| 层级 | 内容 | 颜色标识 |
|------|------|---------|
| **客户层** | 客户行为 → 触点 → 痛点/期待 | Sky 蓝 |
| **前台层** | 业务活动 + 角色 → 系统触点 → 认知负荷 | 白底 |
| **后台层** | 支撑流程 + 角色 → 后台系统 → 认知负荷 | Slate 灰 |

认知负荷等级：`low`(绿) / `medium`(黄) / `high`(橙) / `critical`(红)

---

## 工作流 SOP

### Step 1 · 解析输入
阅读用户服务流程描述，识别：阶段数量、客户旅程路径、前后台角色分工、系统触点、关键痛点

### Step 2 · 生成 YAML
- 读取 `references/blueprint_prompts.md`（角色设定 + 字段规范 + 输出铁律）
- 将生成 YAML 保存至 `docs/baseline/data/service_blueprint.yaml`

### Step 3 · 编译 HTML
```bash
python3 openspec-requirements/tools/blueprint-map-generator/scripts/build_blueprint.py \
  docs/baseline/data/service_blueprint.yaml \
  docs/baseline/service_blueprint.html
```

### Step 4 · 交付
通知用户在浏览器中打开 HTML 文件即可查看完整泳道视图

---

## 目录结构

```
blueprint-map-generator/
├── SKILL.md                        # 本文件
├── references/
│   ├── blueprint_prompts.md        # 核心 LLM Prompt（角色、字段约束、示例）
│   └── schema.yaml                 # 标准 YAML 数据契约示例
├── templates/
│   └── blueprint_layout.html       # Jinja2 模板（HTML/CSS 与算法解耦）
├── scripts/
│   └── build_blueprint.py          # 核心编译引擎
└── examples/                       # 示例成品 HTML（输出参考，非产物目录；产物在 docs/baseline/）
```

---

## build_blueprint.py 核心能力

| 能力 | 实现方式 |
|------|---------|
| 防呆 YAML 解析 | 正则剥除 ` ```yaml ``` ` 代码块标记 |
| 动态列宽测算 | 按各层最大活动数动态计算每个 Phase 的 `px` 宽度 |
| 认知负荷着色 | `low/medium/high/critical` 对应绿/黄/橙/红徽章 |
| 模板引擎分离 | Jinja2 + `templates/blueprint_layout.html` |
| 阶段箭头流程 | CSS `clip-path` 多边形实现向右箭头形阶段导航条 |

## QA 清单

- [ ] YAML 能被 `yaml.safe_load` 解析（含防呆过滤）
- [ ] 所有阶段都完整渲染三层行
- [ ] 认知负荷徽章显示正确颜色
- [ ] 列宽自动撑开、无截断
