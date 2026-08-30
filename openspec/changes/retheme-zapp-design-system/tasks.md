> 实现版本：**Frontend（Vue）** `ecommerce/ecommerce-mini-frontend`。依赖 `specs/frontend-ui/spec.md`（delta：ADDED「ZAPP 设计系统视觉规范」+ MODIFIED 若干视觉需求）与 `design.md`（Sync Assessment 均显式 No-op）。测试标签遵循 `docs/TESTING_STRATEGY.md` 金字塔。**无 Node.js / Python 后端改动**。

## 1. 前端（Vue）— 注入 ZAPP 设计令牌（@unit/@api）

- [ ] 1.1 在 `ecommerce/ecommerce-mini-frontend/src/index.css`（当前仅 `@import "tailwindcss"`）中，**保留顶部 `@import 'tailwindcss'` 前**加入三字体 @import：
      ```css
      @import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@400;700;800;900&display=swap');
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,700&display=swap');
      @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap');
      @import 'tailwindcss';
      ```
      （注意 CSS `@import` 必须先于其它语句。）
- [ ] 1.2 在 `src/index.css` 追加 `:root { --background: #08080E; ... }` 与 `@theme inline { --color-background: var(--background); ... }` 定义全部 ZAPP 令牌（对照 `docs/baseline/design-system/src/index.css` 逐字同步：background/foreground/card/card-foreground/primary/primary-foreground/secondary/secondary-foreground/muted/muted-foreground/accent/accent-foreground/electric/electric-foreground/warning/warning-foreground/success/success-foreground/border/ring/radius + `--font-display/--font-sans/--font-mono`）。
- [ ] 1.3 在 `src/index.css` 设置 `body { background-color: var(--background); color: var(--foreground); font-family: 'DM Sans', sans-serif; }`，并保留 4px 滚动条 styled (`::-webkit-scrollbar`)。
- [ ] 1.4 校验：`./init.sh vue:build` 通过（Tailwind v4 能识别 `bg-background`/`bg-card`/`text-primary` 等语义工具类）。

## 2. 前端（Vue）— App.vue 全量 slate→ZAPP 类名重排（@unit/@e2e）

按语义映射表将 `src/App.vue` 中 `slate-*` / `bg-white` / `bg-slate-*` / `text-slate-*` / `border-slate-*` / shadow 等替换为 ZAPP 令牌：

| 旧（slate 极简） | 新（ZAPP 暗黑） |
| --- | --- |
| `bg-white`（页面层） | `bg-background` |
| `bg-slate-50`（内容地面） | `bg-background`（或 `bg-card` 用于低层表面） |
| `bg-white`（面板/卡片） | `bg-card` |
| `text-slate-900` | `text-foreground` |
| `text-slate-600` / `text-slate-500` / `text-slate-400` | `text-muted-foreground` |
| `bg-slate-900 text-white`（主 CTA） | `bg-primary text-primary-foreground` |
| `hover:bg-slate-800` / `hover:bg-slate-700` | `hover:opacity-85` |
| `border-slate-200` / `border-slate-900` | `border-border` |
| `hover:border-slate-400` | `hover:border-primary` |
| `bg-slate-100` / `bg-slate-900`（徽章/角标） | `bg-primary` / `bg-muted` |
| 标题/导航文字 | 加 `font-display font-black uppercase tracking-tight` |
| 价格/金额 `font-bold` 文本 | `font-mono font-bold text-primary` |
| 标签/章节小标题 | `font-mono text-xs uppercase tracking-widest text-muted-foreground` |
| `text-red-500`（错误/删除） | `text-accent`（促销/紧迫语义） |
| `text-red-50/red-*`（错误态） | `bg-accent/10 text-accent`（或用 `bg-warning`） |

- [ ] 2.1 `src/App.vue` 顶层容器：`class="h-screen flex flex-col overflow-hidden bg-white text-slate-900 font-sans"` → `bg-background text-foreground font-sans`。
- [ ] 2.2 C 端 header（品牌 logo/搜索/购物车/我的订单/登录态/退出/运营后台入口）：品牌 logo 块 `bg-slate-900` → `bg-primary text-primary-foreground`；header `bg-white` → `bg-card`；边框 `border-slate-200` → `border-border`；购物车角标 → `bg-primary text-primary-foreground`。
- [ ] 2.3 C 端店铺主体：内容地面 `bg-slate-50` → `bg-background`；分类筛选条按钮（`bg-slate-900 text-white` 激活 / `bg-white border-slate-200` 未选）→（`bg-primary text-primary-foreground` / `bg-card border-border text-muted-foreground`）；商品卡片 `bg-white border-slate-200 hover:border-slate-400` → `bg-card border-border hover:border-primary`；品名 `text-slate-900` → `text-foreground font-display`；价格 → `font-mono font-bold text-primary`；加购按钮 `bg-slate-900 text-white` → `bg-primary text-primary-foreground`。
- [ ] 2.4 购物车侧栏：`bg-white border-slate-200` → `bg-card border-border`；条目/小计/金额 → `text-foreground`/`text-muted-foreground`，金额 `font-mono font-bold`；优惠券选择卡（选中 `border-slate-900 bg-slate-900 text-white` → `border-primary bg-primary text-primary-foreground`）；「最优方案」徽章 → `bg-primary border-primary`；结算按钮 `bg-slate-900` → `bg-primary text-primary-foreground`；删除 `hover:text-red-500` → `hover:text-accent`。
- [ ] 2.5 注册 / 登录表单：`bg-slate-50` → `bg-background`；面板 `bg-white border-slate-200` → `bg-card border-border`；输入框 `bg-white border-slate-200 focus:border-slate-900` → `bg-muted border-border focus:border-primary`；主按钮 `bg-slate-900` → `bg-primary text-primary-foreground`；错误 `text-red-600`/`border-red-200 bg-red-50` → `text-accent border-accent/40 bg-accent/10`；footer 示例表 → `bg-card border-border`。
- [ ] 2.6 C 端我的订单：图片/金额/状态徽章 → `bg-card border-border`、`font-mono font-bold text-primary`、状态徽章用 `bg-primary`/`bg-warning`/`bg-accent` 语义色；状态轨迹高亮 `border-slate-900 text-slate-900` → `border-primary text-primary`。
- [ ] 2.7 B 端运营后台：左侧导航 `bg-white border-r border-slate-200` → `bg-card border-border`；激活 `border-l-4 border-slate-900 bg-slate-50 text-slate-900` → `border-primary bg-primary/5 text-primary font-medium`；章节标题 `text-slate-500 uppercase` → `text-muted-foreground font-mono text-xs uppercase tracking-widest`。
- [ ] 2.8 B 端各 tab（销售看板/订单/商品/分类/优惠券/用户）：面板 `bg-white border-slate-200` → `bg-card border-border`；表格 `border-slate-200` → `border-border`；主按钮 `bg-slate-900` → `bg-primary text-primary-foreground`；指标数值/金额 → `font-mono font-bold text-primary`；趋势图 `stroke="#0f172a"`/`fill="#0f172a"` → `stroke/fill="var(--primary)"`；SVG 网格线 `stroke="#e2e8f0"` → `stroke="var(--border)"`。
- [ ] 2.9 校验：全文 `rg`（或 grep）确认无残留 `slate-`、`bg-white`、`shadow-`、`linear-gradient`、`rounded-`（除 `rounded-none`/`rounded-sm`）。
- [ ] 2.10 前端约束验证（浏览器）：`./init.sh vue:start` 后，用 Chrome DevTools 全屏快照核对 ZAPP 自检清单（见 `docs/FRONTEND.md` §6）：0 白底、0 slate、0 `box-shadow`、0 `linear-gradient`、仅 `rounded-none`/`rounded-sm`、标题 `font-display font-black uppercase`、价格 `font-mono font-bold text-primary`、真实中文数据、无占位符。

## 3. E2E 回归（@e2e，防视觉重排破坏功能链路）

- [ ] 3.1 覆盖审查：确认既有 `e2e-tests/features/` 功能场景（`smoke`/`mvp_trading`/`account_*`/`order_lifecycle`/`coupon`/`sales_dashboard`/`admin_*`）依赖文案与交互而非颜色（本变更不改文案/交互），预期不受视觉重排影响。
- [ ] 3.2 若任一场景断言了旧视觉类名（`slate`/`bg-white`/`border-slate`），更新断言为 ZAPP 语义/行为断言（若无则跳过）。
- [ ] 3.3 运行 `./init.sh e2e:run`，全量 Cucumber E2E PASS（场景数不倒退）。

## 4. 验证门禁（@unit/@api/@e2e）

- [ ] 4.1 `openspec validate retheme-zapp-design-system` PASS。
- [ ] 4.2 `./init.sh node:test` PASS（无后端改动，应保持原结果）。
- [ ] 4.3 `./init.sh python:test` PASS（无后端改动，应保持原结果）。
- [ ] 4.4 `./init.sh vue:build` PASS（前端构建）。
- [ ] 4.5 浏览器 ZAPP 视觉自检：C 端店铺 / 我的订单 / 登录 / 注册 + B 端销售看板 / 优惠券 / 商品 / 分类 / 用户 各截图核对 ZAPP 清单，记录证据至 `verify.md`。
- [ ] 4.6 `./init.sh e2e:run` PASS（或记录失败摘要）。

## 5. 基准回流与收尾

- [ ] 5.1 Spec Sync（change 级）：`/opsx:sync` 将 `specs/frontend-ui/spec.md`（delta MODIFIED/ADDED）合并进 `openspec/specs/frontend-ui/spec.md`。
- [ ] 5.2 Baseline Sync（Epic/变更级）评估：`design.md` Sync Assessment 判定服务蓝图与领域模型均**显式 No-op**（`frontend-ui` taxonomy/边界/状态不变）；`baseline/sync` 无需执行（仅建议知悉 `domain_model.html` `bc-shared→cap-ui` 规则文字可选更新，不触发结构回流）。
- [ ] 5.3 `/opsx:archive` 归档，移至 `openspec/changes/archive/<YYYY-MM-DD>-retheme-zapp-design-system/`。

## 附录：类名映射速查（供 engineer 实施参考）

```text
bg-white       → bg-card（面板）/ bg-background（页面层）
bg-slate-50    → bg-background
bg-slate-100   → bg-muted
bg-slate-900   → bg-primary（+ text-primary-foreground）
text-slate-900 → text-foreground
text-slate-600/500/400 → text-muted-foreground
border-slate-200/900   → border-border
hover:border-slate-400 → hover:border-primary
hover:bg-slate-700/800 → hover:opacity-85
text-red-*     → text-accent（促销/紧迫/删除）
font-bold(价格) → font-mono font-bold text-primary
标题          → font-display font-black uppercase tracking-tight
标签/章节小标题 → font-mono text-xs uppercase tracking-widest text-muted-foreground
```
