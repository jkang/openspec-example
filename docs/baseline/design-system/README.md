# ZAPP Design System（权威设计系统）

本目录是电商系统（ecommerce-mini）的**唯一权威设计系统（Design System）**。所有前端 UI（含产品页面、运营后台、原型、规格内嵌视觉）与**未来新增 Feature** 的视觉呈现，**必须**以此处的 ZAPP 规范为基准。

## 定位

- 本目录属于业务基线（`docs/baseline/`），是"系统认知的核心沉淀"之一。
- 它**不是**可运行的应用，而是**设计规范 + 设计令牌（design tokens）+ 参考实现**的权威源。
- 产品级前端（`ecommerce/ecommerce-mini-frontend/`，Vue 3 + Tailwind v4）消费这里的令牌与规范进行实现。

## 目录内容

| 路径 | 作用 |
| --- | --- |
| `guidelines/Guidelines.md` | **设计规范正文**：品牌立场、色彩、字体、间距、组件、图标、微文案、Do/Don't。 |
| `src/index.css` | **设计令牌（Design Tokens）**：CSS 自定义属性 `--background/--primary/...` 与 Tailwind `@theme inline` 映射。实现端以此为准注入令牌。 |
| `src/App.tsx` | **参考实现**：ZAPP 设计系统在商品/店铺场景上的完整落地示例（React 写法仅作视觉参考），供 Vue 端移植对照。 |

> 说明：`src/` 内为参考源码（React/TS），仅用于**视觉与令牌映射对照**；本目录不引入构建工具链（无 `package.json`/`vite`/`node_modules`），不参与运行。

## 使用规则（给所有 Agent）

1. **引用令牌，禁止硬编码色值**：实现端 MUST 使用 `src/index.css` 定义的语义令牌（`bg-background` / `text-foreground` / `bg-primary` / `border-border` / `text-muted-foreground` 等），不得散落硬编码 hex。
2. **遵循 `guidelines/Guidelines.md`**：字体（Exo 2 / DM Sans / JetBrains Mono）、圆角（`rounded-none` / 2px）、uppercase 标题、mono 价格等 MUST 依规范。
3. **视觉事实来源**：任何涉及 UI 的 prototype / spec / 实现，若与本目录冲突，以本目录为准；变更本目录需同步评估是否需要回流 `docs/baseline/` 与 `openspec/`。
4. **跨工具一致**：本规范被 `docs/FRONTEND.md`、`openspec/config.yaml` `rules.prototype`、`skills/prod/prototype`、`skills/opsx/verify` 引用；修改本目录时须确保这些引用同步（尤其 `.agents/`、`.trae/`、`.cursor/` 三目录）。
