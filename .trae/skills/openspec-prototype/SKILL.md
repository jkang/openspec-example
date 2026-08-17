---
name: "openspec-prototype"
description: "生成符合 Modern Flat 规范的交互式企业级 Vue 3 原型。在 OpenSpec 提议阶段生成 prototype 产物时调用。"
---

# OpenSpec Prototype 设计专家

该技能专门用于为 OpenSpec 工作流生成高质量、可交互的前端原型。它严格遵守“现代扁平化 (Modern Flat)”美学，并针对企业级应用进行了优化。

## 设计原则

### 1. 视觉风格 (Modern Flat)
- **1px 边框**: 所有的卡片、按钮和输入框必须使用 1px 实线边框（例如 Tailwind 的 `border-border`）。
- **纯色背景**: 使用中性色调（如 Slate, Zinc, Neutral）。禁止使用渐变。
- **严禁阴影**: 不得使用任何形式的 `shadow-*` 类。
- **内容驱动**: 布局应紧凑，尺寸由内容决定，避免大面积的空洞留白。

### 2. 技术栈要求
- **Vue 3 (CDN)**: `https://unpkg.com/vue@3/dist/vue.global.js`
- **Tailwind CSS (CDN)**: `https://cdn.tailwindcss.com`
- **Shadcn UI 模式**: 使用 Tailwind 直接实现类似 Shadcn 的组件（Button, Card, Input, Dialog, Table）。
- **Lucide 图标**: `https://unpkg.com/lucide@latest`

### 3. 企业级交互规范
- **单文件原型**: 所有的 HTML, CSS, JS 必须合并在一个 `.html` 文件中。
- **状态驱动**: 使用 Vue 的 `ref` 或 `reactive` 管理页面状态（如 Modal 开关、列表更新、表单校验）。
- **极简反馈**: 隐藏状态勾选标记和复杂的进度条，仅在必要时提供最轻量化的视觉反馈。

### 4. 图像资源规范 (Image Assets)
- **严禁使用 AI 生成图像**: 不得使用任何 `text_to_image` 或 AI 绘图接口。
- **使用公开素材库**: 必须从网上公开的图片资源网站（如 Unsplash, Pexels, Pixabay）获取风格类似的真实图片。
- **引用方式**: 使用高质量的公开 URL 链接（例如 `https://images.unsplash.com/photo-...`）。
- **视觉匹配**: 选择背景干净、主体突出、符合极简主义审美的产品摄影图，以匹配“现代扁平化”整体风格。

### 5. 业务真实性与一致性
- **全中文交互**: 所有的 UI 文本、按钮标签、提示信息以及示例数据必须使用**中文**。
- **使用真实种子数据**: 严禁生成虚假的英文测试数据。必须先读取项目中已有的种子数据（如 `ecommerce/ecommerce-mini/data/products.json`）作为原型的数据来源，确保与主系统业务逻辑一致。
- **风格高度对齐**: 必须深度对齐主系统 [App.vue](file:///Users/superkkk/MyCoding/OpenSpec-practice/ecommerce/ecommerce-mini-frontend/src/App.vue) 的视觉风格：
    - 使用 `font-sans` 字体。
    - 严格遵循 `slate-900` 作为主色调，`slate-50` 作为背景色，`slate-200` 作为边框色。
    - 保持紧凑的布局结构，顶部导航栏高度固定为 `h-16`。

## 任务执行指南

1. **读取上下文**: 在生成原型前，必须阅读 `proposal.md` 以及项目现有的种子数据文件。
2. **生成 HTML**: 
   - 包含完整的 Tailwind 配置（颜色、边框宽度等）。
   - 编写具备响应式状态的 Vue 应用代码。
   - 实现关键交互逻辑（点击、切换、过滤）。
3. **样式校验**: 检查生成代码是否包含任何圆角、阴影或装饰性 Emoji，确保视觉上与主系统无异。
4. **输出路径**: 默认输出到 `prototypes/<capability-path>.html`。
5. **嵌入规范**: 生成后，将代码块以 `<details>` 标签形式提供，以便后续步骤嵌入 `spec.md`。
