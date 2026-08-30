---
name: business-process-deep-analyzer
description: |
  对企业特定领域（如客服、营销、供应链等）进行深度业务分析，生成包含业务类型分析、L1/L2 级业务流程及痛点的可视化 HTML 报告。

  Triggers when user mentions:
  - "业务流程分析"
  - "业务痛点分析"
  - "value stream analysis"
  - "端到端流程梳理"
  - "业务流程深度分析"
  - "客服流程分析"
  - "供应链流程分析"
  - "营销流程分析"
  - "业务诊断"
author: KK
---

# 企业领域业务流程深度分析器 (Business Process Deep Analyzer)

此技能用于对企业特定业务领域进行系统化、结构化的深度分析，从宏观业务类型到微观流程痛点，生成一份专业级的可视化 HTML 分析报告。

> [!IMPORTANT]
> **双重输出规范 (Dual Output Standard)**: 
> 当你使用此 Skill 时，必须**同时**输出两个部分：
> 1. **结构化 YAML**: 用于下一步的自动化处理和数据存档。
> 2. **交互式 HTML**: 用于最终用户的直观审查与演示。HTML 内部已集成“复制 YAML”功能，确保数据可溯源.
> 3. **输出路径与命名规范 (本仓库适配)**: 
>    - **输出目录**: 产物必须输出到需求侧工作区 `epics/<epic-key>/analysis/process/`（`<epic-key>` 为需求侧 Epic key）。
>    - **文件名**: 数据文件 `process.yaml`，可视化文件 `process.html`。
> 4. **视觉规范**: HTML 样式默认按照 `openspec-requirements/tools/design.md` 进行样式输出，且默认都是浅色底色（Light Mode），页面内容占据 85% 宽度并居中。

## 核心架构

本技能采用 **LLM -> YAML -> Python -> HTML** 的解耦架构：
1. **LLM**: 负责业务逻辑分析，将非结构化描述转化为标准 YAML 数据。
2. **Compiler**: 位于 `scripts/build_process.py`，负责解析 YAML 并结合 `templates/` 下的 Jinja2 模板生成高颜值 HTML。

## 分析框架

### 第一层：业务类型分析 (Business Typology)

从三个维度对企业该领域的业务进行分型：
- **业务模式** (Business Model): B2B / B2C / B2B2C / 平台型 / 自营型 等
- **产品类型** (Product Type): 实体产品 / 虚拟服务 / SaaS / 平台服务 等
- **市场类型** (Market Type): 存量市场 / 增量市场 / 利基市场 / 大众市场 等

### 第二层：L1 端到端价值流 (L1 Value Stream)

针对每种业务类型，梳理其核心端到端价值流：
- 价值流起点 → 终点
- 每个阶段 (Stage) 的定义和业务目标
- 阶段间的逻辑关系（串行/并行/决策）

### 第三层：L2 业务流程分析 (L2 Process Flow)

在每个 L1 阶段内，展开详细的业务流程：
- 具体活动 (Activity)
- 执行角色 (Role)
- 支撑系统 (System)
- 输入/输出 (Inputs/Outputs)
- 业务规则 (Rules)

### 第四层：业务痛点识别 (Pain Points)

在每个 L2 活动上标注痛点：
- **严重程度**: `critical`(严重) / `high`(高) / `medium`(中) / `low`(低)
- **痛点描述**: 具体问题
- **影响范围**: 对效率、成本、体验、质量的影响
- **根因分析**: 为什么会出现这个痛点

## 工作流 SOP

### Step 1 · 解析输入
阅读用户提供的业务描述，识别：
- 企业所属行业及规模
- 分析的目标领域（客服/营销/供应链/生产/研发等）
- 业务现状描述（如有）

### Step 2 · 生成 YAML
- 读取 `references/process_prompts.md`（角色设定 + 字段规范 + 输出铁律）
- 按照四层分析框架，将分析结果保存为结构化 YAML
- 将 YAML 保存至 `epics/<epic-key>/analysis/process/process.yaml`

### Step 3 · 编译 HTML
```bash
python3 openspec-requirements/tools/business-process-deep-analyzer/scripts/build_process.py \
  epics/<epic-key>/analysis/process/process.yaml \
  epics/<epic-key>/analysis/process/process.html
```

### Step 4 · 交付
通知用户在浏览器中打开 HTML 文件即可查看完整的业务流程分析报告，包含：
- 业务类型矩阵概览
- L1 价值流横向时间轴
- L2 流程纵向展开详情
- 痛点热力标记与汇总面板

## 目录结构

```
business-process-deep-analyzer/
├── SKILL.md                        # 本指引说明
├── references/
│   ├── process_prompts.md          # 核心 LLM Prompt（角色、字段约束、示例）
│   └── schema.yaml                 # 标准 YAML 数据契约示例
├── templates/
│   └── process_layout.html         # Jinja2 HTML/CSS 可视化模板
├── scripts/
│   └── build_process.py            # 核心编译引擎
└── examples/                       # 示例 YAML（数据契约参考，非产物目录；产物在 epics/<key>/analysis/process/）
```

## 可视化设计说明

### 页面结构（自上而下）

| 区域 | 内容 | 交互 |
|------|------|------|
| **Header** | 标题、企业、领域、生成时间 | 静态 |
| **业务类型矩阵** | 卡片式展示各业务类型的三维分型 | 悬停显示详情 |
| **L1 价值流轴** | 横向时间轴，节点为价值流阶段 | 点击展开 L2 |
| **L2 流程详情** | 纵向流程图，展示活动、角色、系统 | 与 L1 联动 |
| **痛点热力层** | 在 L2 活动上标记痛点严重程度 | 颜色编码 |
| **痛点汇总面板** | 表格形式汇总所有痛点，可排序 | 按严重程度/阶段筛选 |

### 视觉编码规范

- **L1 阶段节点**: 圆角卡片，深蓝色边框，带序号
- **L2 活动卡片**: 白色背景，左侧彩色边框标识业务类型
- **痛点标记**: 
  - 严重 (critical): 🔴 红色脉冲动画
  - 高 (high): 🟠 橙色实心底
  - 中 (medium): 🟡 黄色实心底
  - 低 (low): 🔵 蓝色实心底
- **连接线**: 
  - L1: 实线箭头（主流程）/ 虚线箭头（支撑流程）
  - L2: 细线连接，带方向箭头

## build_process.py 核心能力

| 能力 | 实现方式 |
|------|---------|
| 防呆 YAML 解析 | 正则剥除 ` ```yaml ``` ` 代码块标记 |
| 业务类型卡片布局 | CSS Grid 自适应列数 |
| L1 阶段动态宽度 | 基于阶段数量均分或自适应 |
| L2 流程纵向渲染 | Flexbox 纵向排列活动卡片 |
| 痛点热力标记 | 严重程度映射 CSS 类 + SVG 图标 |
| 交互展开/收起 | 纯 JS（无外部依赖）实现 L1→L2 联动 |
| 痛点汇总表格 | 按严重程度排序，支持筛选 |
| 模板引擎分离 | Jinja2 + `templates/process_layout.html` |

## QA 清单

- [ ] YAML 能被 `yaml.safe_load` 解析（含防呆过滤）
- [ ] 至少包含 1 个业务类型
- [ ] 每个业务类型至少包含 1 条 L1 价值流
- [ ] 每条 L1 价值流至少包含 3 个阶段
- [ ] 每个 L1 阶段至少包含 2 个 L2 活动
- [ ] 痛点严重程度标记正确（critical/high/medium/low）
- [ ] L1 点击展开 L2 的交互正常
- [ ] 痛点汇总面板数据完整
- [ ] 所有业务类型颜色区分明显
- [ ] 响应式布局在 1280px+ 屏幕正常显示
