# Frontend Governance & UI Specifications

本文档定义了 OpenSpec-Practice 项目前端（特别是 Vue 3 客户端）的 UI 设计与开发规范。所有 AI Agent 在生成前端代码或 UI 原型时，必须严格遵守以下规则。

## 1. 核心视觉理念 (Visual Style)

本项目采用**极简“现代扁平化”审美**。UI 设计以逻辑驱动为主，坚决摒弃一切不必要的视觉修饰。

- **禁止圆角**: 所有元素（按钮、输入框、容器等）必须直角。(`border-radius: 0` / `rounded-none`)
- **禁止阴影**: 严禁使用任何阴影效果。(`box-shadow: none` / `shadow-none`)
- **禁止渐变**: 必须使用纯色背景。
- **禁止过度装饰**: 隐藏进度指示器、状态勾选标记和装饰性 Emoji，保持界面极度整洁。

## 2. 颜色与边框规范 (Colors & Borders)

- **主色/强调色**: `slate-900`
- **背景色**: `slate-50`
- **边框**: 必须使用 1px 实线边框，颜色为 `slate-200` (`border border-slate-200`)。

## 3. 布局与结构 (Layout & Structure)

- **全局布局**: 偏好左侧导航栏 + 右侧内容区撑满宽度的单屏布局。
- **顶部/导航尺寸**: 导航栏高度统一为 `h-16`。
- **导航交互**: 侧边栏活动导航项应使用左侧 3px 实线指示器进行高亮。
- **内容呈现**: 活动内容应以“独立章节”形式呈现，**严禁使用卡片堆叠 (Card Stacking)**。
- **溢出处理**: 阶段或步骤若需横向排列，内容溢出时应使用横向滚动条，而不是强行折行破坏布局。

## 4. 原型与数据规范 (Prototyping & Data)

- **真实数据**: 在进行原型设计（Prototype）或编写 Mock 数据时，必须使用**真实的业务数据示例**，严禁使用空洞的模板化文本（如 `test1`, `foo`, `bar`）。
- **语言约束**: UI 交互界面必须完全使用中文。
- **原型地位**: Prototype 产物是 UI 规范的“唯一事实来源”。在进入正式技术实现前，必须先通过原型预览确认视觉和交互符合本规范。

## 5. 组件与技术栈 (Tech Stack)

- **框架**: Vue 3 (Composition API) + Vite
- **样式**: Tailwind CSS (遵循上述 `slate-*` 和 `rounded-none` 约束)
- **单一职责**: `src/App.vue` 保持 Minimalist 风格，遵循单屏展示逻辑。
