---
name: Frontend Governance
purpose: 定义前端 UI 开发规范、视觉约束及验证闭环（以 ZAPP Design System 为唯一事实来源）
updated_at: 2026-08-30
---

# Frontend Governance & UI Specifications

本文档定义了 OpenSpec-Practice 项目前端（Vue 3 客户端）的 UI 设计、开发规范以及验证闭环。
**唯一 UI 事实来源：`docs/baseline/design-system/`（ZAPP Design System）**。所有 AI Agent 在生成前端代码或 UI 原型时，必须严格遵循本规范，且与本规范冲突时一律以 `docs/baseline/design-system/` 为准。

> 规范正文（色彩/字体/组件/微文案/Do-Don't）详见 `docs/baseline/design-system/guidelines/Guidelines.md`；设计令牌（Design Tokens）见 `docs/baseline/design-system/src/index.css`。

## 1. 核心视觉理念 (Visual Style)

本项目采用 **ZAPP 品牌语言：Memphis × Zine × Dark Premium（孟菲斯 × 杂志 × 暗黑高端）**。UI 大胆、动感、带点叛逆，但克制精准。我们**不**做 SaaS 仪表盘，**不**用渐变 Hero。

- **暗黑底色**: 页面地面（ground）为 `--background: #08080E`，禁止浅色/白色铺底。
- **禁止圆角**: 所有元素使用 `rounded-none`（zero radius），可容忍 `rounded-sm`（2px）。`rounded-full` 仅用于头像 chip 或胶囊式数量指示器。
- **禁止阴影与渐变**: 严禁 `box-shadow` 与 `background: linear-gradient(...)`。
- **禁止装饰性 Emoji / 图标库**: 使用 Unicode 符号（`⚡ ♡ ⊕ ⌕ ↗ ★ ✓ ×`）作轻量内联图标；隐藏进度指示器、状态勾选标记的过度装饰。

## 2. 色彩与边框规范 (Colors & Borders)

色彩通过 **语义令牌**（Tailwind 工具类）使用，禁止散落硬编码 hex。令牌定义见 `docs/baseline/design-system/src/index.css`。

| 令牌 | 值 | Tailwind 类 | 用途 |
|---|---|---|---|
| `--background` | `#08080E` | `bg-background` | 页面地面 |
| `--card` | `#0F0F1C` | `bg-card` | 表面/面板 |
| `--foreground` | `#EFEFFA` | `text-foreground` | 主文本 |
| `--muted` | `#15152A` | `bg-muted` | 次级表面 |
| `--muted-foreground` | `#6E6E9A` | `text-muted-foreground` | 标签、说明 |
| `--secondary` | `#1A1A2E` | `bg-secondary` | 次要表面 |
| `--primary` | `#C8FF00` | `bg-primary` / `text-primary` | CTA、价格、激活态 |
| `--primary-foreground` | `#08080E` | `text-primary-foreground` | 主元素上的文字 |
| `--accent` | `#FF2D6B` | `bg-accent` / `text-accent` | 促销、销售、紧迫感 |
| `--electric` | `#3B6DFF` | `bg-electric` | 热门、信息 |
| `--warning` | `#FF9A00` | `bg-warning` | 限定、低库存 |
| `--success` | `#00E5A0` | `bg-success` | 有货、已确认 |
| `--border` | `#222238` | `border-border` | 1px 实线发丝分隔 |

**用法规则**：
- **Primary（荧光绿）** — 主 CTA 按钮、价格、激活导航态、焦点环、交互高亮。
- **Accent（热情粉）** — 促销徽章、限时、折扣标识、心愿单激活态。
- **Warning（琥珀）** — 限定版、低库存、时效性。
- **Electric（电光蓝）** — 热门徽章、资讯高亮、次要交互。
- **Never** 在同一交互元素上混用 primary 与 accent。
- 边框：默认 `border border-border`（1px 实线）；hover 用 `hover:border-primary` 高亮，**禁用背景色 flood**。

## 3. 字体与排版 (Typography & Layout)

三字体协作系统，**不得替换**：

| 家族 | 角色 | Tailwind 类 | 字重 |
|---|---|---|---|
| **Exo 2** | 标题/展示 | `font-display` | 700/800/900 |
| **DM Sans** | 正文/UI 文案 | `font-sans` | 300/400/500/700 |
| **JetBrains Mono** | 价格/标签/编码 | `font-mono` | 400/500/700 |

- 标题默认 `uppercase tracking-tight`；主标题用 `font-display font-black uppercase`。
- **价格恒为** `font-mono font-bold text-primary`。
- **UI 标签 / 分类 tab / token 注释**恒为 `font-mono text-xs uppercase tracking-widest text-muted-foreground`。
- UI 不用斜体；斜体仅限编辑性文案。

**布局**：
- 页面最大宽 `max-w-screen-xl`，左右 `px-6` 留白。
- 卡片内边距 `p-6` 或 `p-8`（按内容密度）。
- 商品网格：`grid-cols-2 md:grid-cols-4`；12 列基准。
- 活动内容以"独立章节"呈现，**严禁卡片堆叠**；横向溢出用滚动条而非折行。
- 全局偏好左侧导航 + 右侧内容区的单屏布局；导航栏高度 `h-16`。

## 4. 原型与数据规范 (Prototyping & Data)

- **真实数据**: 原型 / Mock 数据必须使用真实业务数据示例，严禁 `test1`/`foo`/`bar` 等空洞模板。
- **语言约束**: UI 交互界面必须完全使用中文。
- **字体加载**: 通过 `@import url('https://fonts.googleapis.com/css2?family=Exo+2...')` 在 `src/index.css` 顶部加载三字体。
- **原型地位**: Prototype 产物是 UI 规范的"唯一事实来源"。在进入正式技术实现前，必须先通过原型预览确认视觉和交互符合本规范（本仓库的权威参考见 `docs/baseline/design-system/src/App.tsx`）。

## 5. 组件与技术栈 (Tech Stack)

- **框架**: Vue 3 (Composition API) + Vite
- **样式**: Tailwind CSS v4（通过 `@tailwindcss/vite`），在 `src/index.css` 用 `@theme inline` 注入 ZAPP 设计令牌。
- **组件基线**（详见 Guidelines.md）：`Button`（primary/accent/outline/ghost/muted × sm/md/lg/xl）、`Badge`（七变体）、`Product Card`、`Nav`、`Price`。
- **图标**: 使用 Unicode 符号，不引入图标库依赖。
- **单一职责**: `src/App.vue` 保持单屏展示逻辑。

## 6. UI 验证闭环 SOP (Validation Loop)

单纯的单元测试无法保障视觉约束，必须通过浏览器验证。AI Agent 在进行前端开发或修改（新增组件、修改样式、调整布局）时，必须遵循以下闭环：

### 6.1 启动服务
使用 `init.sh` 脚本启动 Vite 服务器，并确保没有报错。
```bash
./init.sh vue:start
```

### 6.2 获取快照与核对约束
使用 Browser MCP 工具（如 `browser_navigate`, `browser_snapshot`）或 OpenPreview 访问 `http://localhost:5173`。
**强制自检清单（ZAPP）**：
- [ ] 检查 DOM 树：是否彻底消除了 `box-shadow` 与 `background: linear-gradient`？圆角是否仅 `rounded-none`/`rounded-sm`？
- [ ] 检查色彩：是否使用 `bg-background` 暗黑地面 + 语义令牌（`bg-card`/`border-border`），无硬编码 hex 与浅色铺底？
- [ ] 检查字体：标题是否 `font-display font-black uppercase`？价格是否 `font-mono font-bold text-primary`？标签是否 `font-mono uppercase tracking-widest text-muted-foreground`？
- [ ] 检查数据：是否清除了所有的无意义占位符（foo/test），填充了真实业务数据？
- [ ] 检查布局：是否保持了单屏体验，未出现不当的卡片堆叠？

### 6.3 交互验证与 HITL 确认
使用 Browser MCP 的点击与输入功能，模拟核心用户画像完成一次交互操作。
如果发现任何偏离，Agent 必须立即修改代码并重新获取快照验证。验证通过后，请求人类确认 (HITL)。

### 6.4 视觉验证截图落位（证据可追溯）

浏览器视觉验证产出的**核心状态截图（png/jpg）** MUST 统一存放到**对应 change 目录下的 `verify-evidence/` 子目录**：

- 落位路径：`openspec/changes/<change-name>/verify-evidence/<描述>.png`（如 `openspec/changes/fix-admin-user-mgmt-visibility/verify-evidence/admin-users-fixed.png`）。
- 归档联动：change 归档时，整个 change 目录（含 `verify-evidence/`）一并移入 `openspec/changes/archive/YYYY-MM-DD-<change-name>/`，截图作为视觉证据随归档留档。
- 引用闭环：`verify.md` 的视觉验证（§6.2/6.3）结论 MUST 在证据行引用对应截图路径（如 `verify-evidence/<描述>.png`）。
- **禁止**：将验证截图散落到 `learning-sdd/`、仓库根、`docs/` 等非制品目录，避免与学习/文档资料混叠且无引用。
- 命名：`<视图/功能>-<状态>.png`，全小写 kebab-case，语义清晰（如 `admin-users-fixed.png`、`c-end-header-store.png`）。
