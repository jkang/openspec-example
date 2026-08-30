# Design: retheme-zapp-design-system

## Context

本变更新旧设计系统：将电商前端从"现代扁平 slate 极简"整体迁移到 **ZAPP（Memphis × Zine × Dark Premium）暗黑高端**。驱动见 `proposal.md` Why。唯一 UI 事实来源为 `docs/baseline/design-system/`（`guidelines/Guidelines.md` + `src/index.css` token + `src/App.tsx` 参考实现）。纯前端视觉层改动，Node.js / Python 零改动；跳过独立 Prototype（以已确认的 ZAPP 参考为视觉唯一事实来源，用户已确认直接重排）。

## Domain Boundary Impact

- `frontend-ui`（`cap-ui`）归属 **Shared / Cross**（`bc-shared`）横切支撑。ZAPP 承载 C/B 双端全部 UI 视觉规范。
- `domain_model.html` 映射：`bc-shared → cap-ui`，规则"全局 UI 组件库与视觉规范"。本变更更新该规则**内容**（slate → ZAPP），BC 边界与 capability 映射、Aggregate/状态机/事件不变。

## Process Delta

- 不修改任何 L1/L2/L3 流程节点语义；仅影响 UI 呈现层。C 端 `L1-01~06` 与 B 端 `L2` 运营各子流程的视觉表现更新为 ZAPP。无流程节点新增/移除。

## Service Blueprint Sync Assessment

- **判定**: `Needs Sync: No`（显式 No-op）
- **理由**: 本变更仅重排视觉层。`frontend-ui` 作为横切支撑能力状态不变；`SB-STAGE-*` 覆盖、`SB-<LANE>-*` 泳道 capability 分布、能力"已落地/规划中/横切支撑"状态均未变化；未新增/移除幕后活动节点；未引入新的 blueprint 引用节点。据此 `docs/baseline/service_blueprint.html` **无需回流**。

## Domain Model Sync Assessment

- **判定**: `Needs Sync: No`（显式 No-op）—— 但含一条**文字性说明**供 baseline 维护者知悉。
- **理由**: `frontend-ui`（`cap-ui`）taxonomy 未新增/移除/改名，BC 边界、`bc-shared → cap-ui` 映射、Domain Event/Command/Policy、Aggregate/状态机/业务不变量均未变化。仅 `cap-ui` 规则描述文字由"全局极简 UI 组件库与视觉规范"语义上更新为"全局 ZAPP 暗黑 UI 组件库与视觉规范"——属**可选的文字性回流**，不触发 capability 结构回流判定。若后续 `/opsx:baseline/sync` 执行，建议同步更新 `domain_model.html` 中 `bc-shared → cap-ui` 节点的规则描述文字为 ZAPP。

## Goals / Non-Goals

- **Goals**: ① C/B 双端按 ZAPP 语义令牌呈现；② `src/index.css` 注入 ZAPP 令牌，移除硬编码 hex；③ `App.vue` 全量 slate→ZAPP 类名映射；④ 保持既有交互与文案中文不变；⑤ 不新增依赖。
- **Non-Goals**: 不改业务行为/API/数据模型；不改 baseline HTML 文档自身排版风格；不新增页面/交互；不改 C 端品牌文案。

## Decisions

- **Decision 1: 语义令牌 + `@theme inline` 注入（沿用 design-system `src/index.css` 方案）**。理由：ZAPP 参考实现（React）已通过 Tailwind v4 `@theme inline` 把 CSS 变量映射为 Tailwind 工具类。Vue 端同样以 `@theme inline` 注入 `--color-background/--color-card/--color-primary/...` 与 `--font-display/--font-sans/--font-mono`，使 `bg-card`/`text-primary` 等工具类可用。替代方案：手动替换色值 → 否决（不可维护、易漂移）。
- **Decision 2: 类名映射表驱动 App.vue 重排**。理由：App.vue 2350 行，多处 `slate-*`/`bg-white`。采用语义映射表（见 tasks 附录）保证 C/B 一致性。替代方案：逐屏手改 → 否决（不一致、易漏）。
- **Decision 3: 保留 `rounded-none`/`rounded-sm`，禁 `box-shadow`/`linear-gradient`**。理由：ZAPP 品牌基因（锐角）；与旧"无圆角无阴影"约束同向，迁移成本低。
- **Decision 4: 保留既有真实中文文案与行为**。理由：本变更仅视觉层，不引入文案/交互变更，降低 E2E 回归风险。
- **Decision 5: 三 Google Fonts 经 `@import` 加载**。理由：ZAPP 依赖 Exo 2 / DM Sans / JetBrains Mono；沿用 design-system 的 `@import url(...)` 方式。

## Risks / Trade-offs

- **回归风险**：全量类名替换可能遗漏个别 `slate-*` 或误改状态类。缓解：tasks 提供映射表 + qa 浏览器全屏 ZAPP 自检 + 构建通过 + `e2e:run` 回归（功能场景依赖文案/交互，不依赖颜色）。
- **视觉断层**：若部分组件未映射，会出现深浅混搭。缓解：映射表覆盖 `bg-*`/`text-*`/`border-*`/`font-*` 全类目；verify 强制「0 白底 / 0 slate / 0 shadow / 0 大圆角」检查。
- **字体加载**：外部 Google Fonts 依赖网络；离线时回退到系统字体（`sans-serif`），不影响功能。
- **Trade-off**：跳过独立 Vue 原型（用户确认直接重排）→ 减少一次 HITL，但依赖设计系统参考的保真度；用浏览器全屏自检补偿。

## Open Questions

- 无。视觉口径已在 ZAPP 参考与 `docs/FRONTEND.md` §6 ZAPP 自检清单中明确。
