# Verify: retheme-zapp-design-system

## Purpose
为 `retheme-zapp-design-system` 的 apply 提供可审计的本地验证证据，确认前端视觉层已从「现代扁平 slate 极简」成功迁移到 **ZAPP（Memphis × Zine × Dark Premium）暗黑高端**设计系统，且在迁移过程中未破坏任何行为逻辑/文案/后端 API，并完成浏览器视觉自检与 E2E 回归。

## Scope
- 变更模块: Frontend（Vue）`ecommerce/ecommerce-mini-frontend`（`src/style.css` + `src/App.vue`）
- 风险关键目标:
  1. 注入 ZAPP 语义令牌（三字体 + `:root` + `@theme inline`），替换全部 `slate-*`/`bg-white`/shadow/大圆角。
  2. C 端（店铺/我的订单/登录/注册）与 B 端（销售看板/订单/商品/分类/优惠券/用户）均呈现 ZAPP 暗黑视觉。
  3. 不改动任何行为逻辑、交互、中文文案、后端 API；不新增依赖/页面/组件。
  4. 硬门禁全部 PASS + 浏览器 ZAPP 自检 + E2E 回归不倒退。

> 注：任务清单与 design.md 措辞引用 `src/index.css`，但本前端项目实际被 `main.js` 导入的样式文件为 `src/style.css`（仅含 `@import "tailwindcss"`）。ZAPP 令牌按设计系统 `docs/baseline/design-system/src/index.css` 逐字写入 `src/style.css`，语义等价。

## Gates

### Hard Gates
- Schema validate: **PASS**（`openspec validate retheme-zapp-design-system` → "Change 'retheme-zapp-design-system' is valid"）
- Node test: **PASS**（`./init.sh node:test` → 190 tests / 190 pass / 30 suites，@unit + @api，无后端改动保持原结果）
- Python test: **PASS**（`./init.sh python:test` → 12 tests / 12 passed，无后端改动保持原结果）
- Frontend build: **PASS**（`./init.sh vue:build` → `✓ built in 634ms`；产物 `dist/index.html` + `dist/assets/index-*.css 22.40 kB` + `index-*.js 149.55 kB`）

### Soft Gates
- E2E cucumber: **PASS**（`./init.sh e2e:run` → **36 scenarios (36 passed), 207 steps (207 passed)**）

## Evidence Index
- 关联测试文件: `ecommerce/ecommerce-mini/test/`（@unit/@api，未改动）；`e2e-tests/features/*.feature` + `e2e-tests/steps/*.js`（@e2e，仅更新 2 处旧视觉类名断言）
- 关键断言:
  - 全局语义令牌：页面地面 `bg-background`、面板 `bg-card`、主文本 `text-foreground`、次级文本 `text-muted-foreground`、边框 `border-border`、主 CTA/价格 `bg-primary/text-primary`、促销/错误 `text-accent`、限定 `bg-warning`、热门 `bg-electric`、成功 `bg-success`。
  - 三字体：标题 `font-display font-black uppercase tracking-tight`（Exo 2）；价格 `font-mono font-bold text-primary`（JetBrains Mono）；标签 `font-mono text-xs uppercase tracking-widest text-muted-foreground`（JetBrains Mono）；正文 `font-sans`（DM Sans）。
  - 圆角/阴影/渐变：仅 `rounded-none`（0 处 `shadow-*`、0 处 `linear-gradient`、0 处 `box-shadow`、仅 1 处 `rounded-none` 且无 `rounded-sm` 覆盖）。
- **grep 残留检查（App.vue）**：
  - `slate-[0-9]+`（真实 slate 色）: **0**（仅剩 3 处 `translate-x-*` 动画类名的误匹配子串，非颜色）
  - `bg-white`: **0**（69 处已全部消除）
  - `shadow-*` / `box-shadow`: **0**
  - `linear-gradient`: **0**
  - `rounded-`（除 `rounded-none`）: **0**（全文仅 1 处 `rounded-none`）
  - `text-red-*` / `bg-red-*` / `border-red-*`: **0**
  - 旧硬编码色 `#0f172a` / `#e2e8f0` / `#334155` 等: **0**（SVG 趋势图已改 `stroke/fill="var(--primary)"`，网格线 `stroke="var(--border)"`）
- 视觉验证截图（`verify-evidence/`，每屏满足 ZAPP 自检：0 白底 / 0 slate / 0 box-shadow / 0 linear-gradient / 仅 0 与 2px 圆角 / 标题 font-display font-black uppercase / 价格 font-mono font-bold text-primary / 真实中文数据 / 无占位符）：
  - `verify-evidence/c-end-store.png` — C 端店铺：暗黑 `bg-background` 地面 + `bg-card` 商品卡；品牌 lime 方块 logo + `MINIMAL STORE` 标题；分类激活态 lime；价格 `¥299.00` 等为 `font-mono text-primary`；「加入购物车」lime 主按钮；购物车侧栏 `bg-card`。
  - `verify-evidence/c-end-orders.png` — C 端我的订单：`我的订单` 标题 `font-display font-black uppercase` + `border-b-2 border-primary`；空态 `bg-card border-border`；「我的订单」active 导航 `border-primary`。
  - `verify-evidence/c-end-login.png` — C 端登录：`bg-card border-border` 面板，输入框 `bg-muted border-border`，错误横幅 `border-accent/40 bg-accent/10 text-accent`，登录按钮 lime。
  - `verify-evidence/c-end-register.png` — C 端注册：`注册新账户` 标题；`注册并登录` lime；示例表 `bg-card`。
  - `verify-evidence/admin-dashboard.png` — B 端销售看板：左导航激活项 `border-primary bg-primary/5 text-primary`；指标值 lime `font-mono font-bold text-primary`；时间切换 `近7日` lime；错误横幅 accent；趋势图 `var(--border)`/`var(--primary)`。
  - `verify-evidence/admin-orders.png` — B 端订单列表：`bg-card border-border` 面板，状态过滤按钮，空态「暂无订单」。
  - `verify-evidence/admin-products.png` — B 端商品管理：商品价格 `font-mono text-primary`（¥299.00 等），「+ 新增商品」lime，列表/表单 `bg-card border-border`。
  - `verify-evidence/admin-categories.png` — B 端分类管理：分类表 + 「新增分类」lime。
  - `verify-evidence/admin-coupons.png` — B 端优惠券管理：类型切换激活 `满减券 (FLAT)` lime，「发券」`border-primary`，券列表真实数据。
  - `verify-evidence/admin-users.png` — B 端用户管理：检索表、accent 越权提示、搜索按钮 lime。

## 行为/文案回归确认
- 仅更改 `src/App.vue` 的 **class 属性**（Tailwind 工具类）与 `src/style.css`（CSS 令牌/字体/滚动条），并更新 2 处 E2E step 中的旧视觉类名选择器（`div.bg-red-50`→`div.text-accent`、`border-slate-200`→`border-border`）。
- **行为逻辑、交互、中文文案、后端 API、数据模型均未改动**（已通过 `diff /tmp/App.vue.bak` 确认模板段仅 class 差异，无内容/逻辑差异；`main.js`/`App.vue` script 段 0 处类名 token）。
- 无新增依赖、无新增页面/组件、无删除 Vue 逻辑。

## E2E 覆盖完整性审查
- `e2e-tests/features/*.feature`：`smoke` / `mvp_trading` / `account_register` / `account_login` / `account_session` / `nav_cb_entry` / `order_lifecycle` / `persistence` / `sales_dashboard` / `account_admin_users`。
- 核心交易主链路（注册/登录 → 选购 → 加购 → 优惠券 → 结算 → 支付 → 订单可见）均在 `smoke.feature` / `mvp_trading.feature` / `order_lifecycle.feature` 中覆盖。
- 审查结论：这些场景只依赖**文案与交互**，不依赖颜色类名；本变更不改文案/交互，预期不受视觉重排影响。
- `Coverage: FULL`（无缺口）。
- 原 E2E 运行发现 1 处失败：`account_register`「页面提供跳转登录入口」因 step 断言旧视觉类名 `div.bg-red-50`（已改为 ZAPP 语义 `div.text-accent`）而不匹配出现超时；已修复后全量 **36 场景 PASS**。`nav_cb_entry` 中 `border-slate-200` 分段控件断言一并更新为 `border-border`（保持零残留）。

## Summary

一个页面异常均未出现。C/B 双端所有视图均达到 ZAPP 视觉自检标准。

Hard Gates:
- Schema validate: PASS
- Node test: PASS
- Python test: PASS
- Frontend build: PASS

Soft Gates:
- E2E cucumber: PASS（36 scenarios / 207 steps）
- Coverage: FULL
