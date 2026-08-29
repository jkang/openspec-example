# Design System: Inspire (Enterprise Tech)

这是通过 UI UX Pro Max 引擎并结合 Inspire 核心品牌资产 (`pptstyle.json`) 生成的全局 UI 设计系统 (Source of Truth)。

## Pattern (布局与架构模式)
- **Name:** Enterprise Gateway
- **Conversion Focus:** Path selection (我是.../按行业/按角色). 强调可信赖程度与大型企业调性。
- **CTA Placement:** Contact Sales (Primary 位于 Header 右侧及底部) + 申请演示 / 登录 (Secondary)
- **Sections (标准落地页参考结构):** 
  1. Hero (核心理念 + 视频背景或品牌插画)
  2. Solutions by Industry (按行业划分的解决方案卡片)
  3. Core Capabilities (核心业务能力图谱)
  4. Client Logos (信任背书，配合横向滚动)
  5. Contact Sales (尾部转化区)

## Style (视觉设计风格)
- **Name:** Trust & Authority / Modern Enterprise
- **Mode Support:** 面向企业端，以白昼模式 (Light) 为主，局部深色背景 (搭配 Starry Blues 深蓝进行色块反转)
- **Keywords:** 现代扁平、结构化卡片、微弱投影(增加层级)、硬朗与柔和结合(大圆角配合锐利信息)、行业资质露出
- **Best For:** B2B SaaS, 企服平台, Tech Business Landing Pages
- **Performance:** ⚡ Excellent | **Accessibility:** ✓ WCAG AA 达标

## Colors (品牌独占色彩系统)

配色严格遵循 Inspire `pptstyle.json` 定义的品牌标量。

| Role | Hex | Name | CSS Variable | Usage |
|------|-----|------|--------------|-------|
| **Primary** | `#10213E` | Starry Blues | `--color-primary` | 主品牌色，用于章节背景、关键标题、大面积品牌色快 |
| **Accent/CTA** | `#5DB2E2` | Creative Blue | `--color-accent` | 侧重标识、跳转链接、按钮强化、图表高亮 (用量 5-10%) |
| **Secondary** | `#625D9C` | Amethyst | `--color-secondary` | 辅助信息、图表辅助色、创新标签 |
| **Success** | `#00524C` | Myrtle Deep Green | `--color-success` | 成功状态、正向数据增加、环保/合规状态 |
| **Info / Sub**| `#6FB1C8` | Cerulean Frost | `--color-info` | 浅蓝辅助色，用作轻量背景或次要图表色 |
| **Warning** | `#F59E0B` | Warning | `--color-warning` | 风险提示、关注状态 |
| **Destructive**| `#EF4444` | Danger | `--color-destructive` | 删除操作、阻断性错误提示 |
| **Background** | `#FFFFFF` | Pure White | `--color-background` | 工作区主背景、卡片容器底色 |
| **Background Alt**| `#F5F5F6` | Tech Gray | `--color-bg-alt` | 底层柔和过渡背景色，或用于区分不同模块区间 |
| **Foreground / Text** | `#10213E` | Primary Text | `--color-foreground` | 替代纯黑带来更温暖的科技感文本主色 |
| **Muted Text** | `#64748B` | Text Secondary| `--color-text-muted`| 次要说明、日期、辅助类图例文案 |
| **Border** | `#E2E8F0` | Border/Line | `--color-border` | 卡片描边、分割线、表格网格 |

*Brand Logic: 纯净大方，深渊蓝做底，创想蓝点睛。摒弃绝对纯黑。*

## Gradients (渐变与遮罩)
- **Section Background (`135deg`):** `#1B2B47` (0%) -> `#4A9FD8` (100%) - 用于封面和醒目章节背景。
- **Dark Overlay (to bottom):** `rgba(27, 43, 71, 0.8)` -> `rgba(27, 43, 71, 0.4)` - 用于大图片上方叠加，保证白色文字（如封面题解）高对比度。

## Typography (企业规范字体)

- **字体家族:** **MiSans** (优先), 备用字体 `Microsoft YaHei`, `Inter`, `Arial`
- **Mood:** enterprise, professional, clear, geometric, legible

**版式层级系统 (Hierarchy):**
- **Cover Title (英雄区大字):** 48pt, SemiBold (`#FFFFFF`), `line-height: 1.2`, 字间距 `-0.02em`
- **H1 (一级标题):** 28pt, SemiBold (`#10213E`), 底部间距 `24pt`
- **H2 (二级标题):** 22pt, Medium (`#10213E`), 底部间距 `16pt`
- **H3 (三级标题 / 卡片头):** 18pt, Medium (`#1B2B47`), 底部间距 `12pt`
- **Body (正文):** 12pt (移动端基础 16px), Regular (`#10213E`), `line-height: 1.5`, 容器最宽控制 `max-width: 80%` (针对宽屏阅读)
- **Label / Accent (标签与强调词):** 11pt, SemiBold (`#4A9FD8`), 全大写 `uppercase`, 字间距加宽 `0.05em`
- **Caption (注释及小字):** 12pt, Light (`#64748B`), 斜体 `Italic`

## File Format Mandatory Standards (强制排版规范)

### 1. Word Documents (.docx) - 商务专业版
- **Logo Header**: 每一页页眉左侧必须包含 `assets/logo.png`，宽度统一为 `3.5cm`。
- **Bottom Divider**: 页眉下方必须有一条 `2.25pt` 粗细的 `Starry Blues (#10213E)` 实线分割。
- **Footer**: 底部居中显示页码，字体 `MiSans Light`, `9pt`；右侧显示 `© 2026. All rights reserved.`
- **Callout Ornaments (点睛装饰)**:
    - **Header H1/H2**: 底部必须带有 `1pt` 的 `Border/Line (#E2E8F0)` 分割。
    - **案例 (Case Study)**: 凡包含“案例”字样的标题，左侧必须附带一条 `4pt` 宽度的 `Creative Blue (#5DB2E2)` 垂直装饰线。
    - **重点块 (Callouts)**: 对“核心痛点”、“目标用户”等模块，强制应用 `Tech Gray (#F5F5F6)` 背景底纹，并使用 `Creative Blue (#5DB2E2)` 作为小标题色。

### 2. PowerPoint (.pptx) - 智能演示版
- **Cover Overlay**: 封面大图必须应用 `Dark Overlay` 渐变遮罩，确保标题对比度。
- **Navigation Row**: 内容页底部必须保留 `20px` 高度的品牌色块或细线。
- **Consistency**: 所有字体必须强制指定为 `MiSans`，严禁出现默认宋体/微软雅黑。

### 3. Excel (.xlsx) - 数据仪表盘版
- **Master Header**: 首行强制应用 `Starry Blues (#10213E)` 背景 + 白色加粗字体。
- **Zebra Strips**: 数据区强制开启“斑马纹”交替行色 (`Tech Gray #F5F5F6`)。
- **Chart Palette**: 图表必须严格按序列使用：`Starry Blues` -> `Creative Blue` -> `Amethyst` -> `Myrtle Deep Green`。

### 4. PDF (.pdf) - 正式交付版
- **Page Margins**: 四边统一 `1 inch` 页边距，确保打印与阅读一致性。
- **Heading Hierarchy**: 标题层级遵循本文件 Typography 章节，不得自定义字号体系。
- **Body Readability**: 正文保持高对比度与稳定行距，避免压缩排版导致阅读疲劳。
- **Caption Rule**: 图注和注释统一使用次要文本色，并与正文拉开明显层级。

### 5. Web/HTML Applications - 响应式企业官网版
- **CSS Variables**: 必须注入 `scripts/apply_brand.py` 生成的 `:root` 变量块。
- **Responsive Breakpoints**: 强制标准：`375px` (Mobile), `768px` (Tablet), `1024px` (Laptop), `1440px` (Desktop)。
- **Interactive States**:
    - **Hover**: 统一应用 `0.15s ease-out` 过渡动画。
    - **Focus**: 必须使用 `Creative Blue (#5DB2E2)` 轮廓线（Outline）。
- **Base Components**:
    - **Cards**: 背景 `#FFFFFF`, 圆角 `8px`, 阴影 `0 2px 8px rgba(16, 33, 62, 0.08)`。
    - **Buttons**: 文字居中，主按钮使用 `Starry Blues` 背景，悬浮时透明度降至 `0.8`。

## Avoid (Anti-patterns / 品牌禁区)
- ❌ 不要过度追求年轻化/娱乐化的强弹簧感 (Spring bounce) 动效。
- ❌ 绝对禁止使用 AI 紫色/粉色高饱和赛博朋克渐变，破坏信任感。
- ❌ 禁止混搭阴影：投影必须使用系统内收敛的、带蓝色相 (`rgba(16, 33, 62, 0.08)`) 的阴影，不使用粗糙的黑/灰阴影。
- ❌ 不要出现低对比度正文（浅灰叠白），`#10213E` 具备极好的阅读锐度。

## Standard Output Layout (Skills)

所有 AI Skill 的 HTML 输出（除 `unified-report-dashboard` 外）必须遵循以下排版规范：

### 1. Page Layout (页面布局)
- **Container Width**: 页面主容器宽度强制设为屏幕的 **85%** (`width: 85%`)，水平居中 (`margin: 0 auto`)。
- **Background**: 默认使用 **Light Mode** (白昼模式)，底色为 `Background Alt (#F5F5F6)`，内容容器为 `Background (#FFFFFF)`。
- **Exception**: `unified-report-dashboard` 保持其原有的 **Dark Mode**。

### 2. Standard Header (标准页眉)
页眉采用左右分布的简洁设计，高度建议在 `80px - 100px` 之间。
- **Left Side**:
    - **Title (H1)**: 企业或项目的主标题，使用 `Starry Blues (#10213E)`，加粗。
    - **Subtitle**: 业务类型或副标题，使用 `Muted Text (#64748B)`。
- **Right Side**:
    - **Generator Info**: 格式为 `Generated by [Skill Name]`，使用 `Muted Text (#64748B)`。
    - **Timestamp**: 格式为 `YYYY-MM-DD HH:MM`，使用 `Muted Text (#64748B)`。
- **Visual Ornament**: 页眉底部带有一条 `1px` 的 `Border (#E2E8F0)` 分割线。

### 3. File & Directory Management (文件与目录管理)
- **Directory**: 所有输出必须存放在以**公司/业务名**命名的子目录中（例如：`张雪机车海外销售/`）。
- **Filename**: 命名规范为 `{公司名}-{内容类型}.html`（例如：`张雪机车-OSM业务战略地图.html`）。

## Pre-Delivery Checklist
- [ ] 容器宽度是否设为 85%
- [ ] 页眉是否包含左侧标题/副标题和右侧生成信息/时间戳
- [ ] 字体是否强制使用 MiSans (优先)
- [ ] 输出路径是否遵循 `{公司名}/{公司名}-{内容类型}.html`
- [ ] 所有 LOGO 图标挂载 `assets/logo.png` (深色文字版) / `assets/logo white.png` (白昼版)
- [ ] 确保 `cursor-pointer` 添加到所有可点击交互区域
- [ ] Form / Input focus 轮廓保持明显的 Inspire Blue `#5DB2E2`
- [ ] 响应式折点匹配 (375px / 768px / 1024px / 1440px)
- [ ] 检查输出是否严格遵循本文件（`references/design.md`）的强制规范
