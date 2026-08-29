---
name: story-map-generator
description: |
  根据用户的自然语言需求，自动生成高颜值、专业的用户故事地图 (User Story Map) HTML 报告。
  该技能参考了 AIStorymap 的核心逻辑，支持“阶段-活动-接触点-用户故事”的四层结构，并具备 MVP 优先级标注。

  Triggers when user mentions:
  - "生成用户故事地图"
  - "画一个 Storymap"
  - "create a user story map"
  - "generate story map"
author: KK
---

# User Story Map Generator

该技能通过 `LLM -> YAML -> Python -> Jinja2` 的标准工作流，将非结构化的产品需求转化为结构化的用户故事地图。

> [!IMPORTANT]
> **双重输出规范 (Dual Output Standard)**: 
> 当你使用此 Skill 时，必须**同时**输出两个部分：
> 1. **结构化 YAML**: 用于下一步的自动化处理和数据存档。
> 2. **交互式 HTML**: 用于最终用户的直观审查与演示。
> 
> **输出路径与命名规范 (Output Path & Naming Convention)**:
> - **目录**: 所有输出文件必须放在当前工作目录下的一个新子目录中，目录名为 `[公司/业务名]` (例如：`张雪机车海外销售/`)。
> - **文件名**: HTML 文件名必须反映内容，格式为 `[公司/业务名]-[业务类型].html` (例如：`张雪机车海外销售-用户故事地图.html`)。
> 
> **视觉设计规范 (Visual Design Standard)**:
> - **样式风格**: 默认按照 `ai4pm-skills/design.md` 进行样式输出。
> - **底色模式**: 默认使用 **浅色底 (Light Mode)**。
> - **页面布局**: HTML 内容占据页面 **85%** 宽度，保持简洁的 Header 设计（参考简洁 Header 规范）。

## 快速使用

### 1. 准备输入
提供一段产品功能的详细描述或业务流程。

### 2. 生成 YAML
LLM 会根据描述生成包含阶段、活动、接触点和用户故事的 YAML 数据。

### 3. 编译 HTML
使用内置的 Python 编译器生成可视化 HTML。

```bash
python3 scripts/build_storymap.py input.yaml output.html
```

## 数据结构定义

1. **阶段 (Stage)**: 顶层横向划分，如“租车前准备”。
2. **活动 (Activity)**: 阶段内的具体行为，如“搜索租车服务”。
3. **接触点 (Touchpoint)**: 执行活动时的交互介质，如“微信小程序”。
4. **用户故事 (User Story)**: 颗粒度更细的功能任务，通常以“作为[角色]，我想...以便...”格式书写。

## YAML 规范示例

```yaml
title: "智慧零售 Story Map"
stages:
  - name: "搜索与选购"
    activities:
      - name: "搜索商品"
        touchpoints: "小程序首页/搜索框"
        stories:
          - description: "作为消费者，我想通过关键词搜索，以便快速找到目标商品。"
            priority: "must"
          - description: "作为消费者，我想查看热门搜索词，以便了解流行趋势。"
            priority: "could"
```

## 视觉规范
- **红点**: 必须 (Must) - MVP 核心功能。
- **黄点**: 应该 (Should) - 重要非核心。
- **蓝点**: 可以 (Could) - 增强体验。
