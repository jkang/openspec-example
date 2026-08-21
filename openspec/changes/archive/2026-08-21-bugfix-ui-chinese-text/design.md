## Context

变更动机与范围见 proposal.md。当前 `ecommerce/ecommerce-mini-frontend/src/App.vue` 为单文件极简实现（Vue 3 Composition API + Tailwind），C 端首页与 B 端后台共用此文件，通过 `viewMode` 切换。`index.html` 为 Vite 入口。`docs/FRONTEND.md` 与 `openspec/config.yaml` 强制「UI 交互界面必须完全使用中文」，本次变更是对该硬性约束的合规性修正。

## Goals / Non-Goals

**Goals:**
- 全站用户可见文案中文化（C 端首页、结算成功弹窗、B 端后台、页面语言声明）。
- 保持现有视觉风格、布局与交互逻辑完全不变。

**Non-Goals:**
- 不改动任何后端接口契约（Node.js / Python）与数据模型。
- 不引入 i18n 框架或语言切换机制（本项目仅面向中文单语言市场）。
- 不调整品牌名 `Minimal Store` 与类型/状态代码括号标注（用户已确认豁免）。

## 根本原因分析 (RCA)

英文文案残留非单次引入，而是**多个变更迭代叠加未同步收敛**的结果：

```
2026-08-14 checkout-success-ui   → 引入 "SUCCESS" 弹窗标识、C 端按钮英文样式
2026-08-17 coupon-integration    → 引入 Cart 侧栏、Coupon 区英文标签（BAG/Empty/Del）
2026-08-21 story-coupon-admin-panel → 引入 {{ coupon.status }} 原始英文枚举与 "UNUSED"
index.html                        → 早期脚手架遗留 lang="en" 与英文 title
```

**根因**：前端实现（App.vue）未持续对照 FRONTEND.md「完全中文」约束做回归自检；spec 层此前缺乏显式的语言约束 Requirement，导致实现阶段无校验依据。Bug Fix 阶段无 Prototype 强制门禁，英文残留经多次归档变更未被拦截。

## Decisions

### D1: 纯文案替换，不引入 i18n
在 `App.vue` 内直接以中文字面量替换英文文案；B 端状态列增加前端枚举映射（`statusLabel` 计算映射）。
- **理由**：系统为单语言（中文）市场，i18n 属过度设计；改动面最小、回归风险最低。
- **替代方案**：引入 `vue-i18n` 与 locale 文件 —— 被否决，无多语言需求且违反 Lightweight 原则。

### D2: 状态枚举映射放前端
`UNUSED→未使用`、`USED→已使用`、`ACTIVE→生效中`、`EXPIRED→已过期` 的映射由 `App.vue` 内联计算属性完成。
- **理由**：后端返回英文枚举是领域契约，保持稳定；仅前端展示层做本地化，不动接口。
- **替代方案**：后端改返回中文 —— 被否决，会污染领域枚举契约并影响既有测试与 Python 版本一致性。

### D3: 品牌名与类型代码豁免
`Minimal Store` 保留；`满减券 (FLAT)` / `折扣券 (PERCENTAGE)` / `(ACTIVE)` 括号标注保留（用户确认）。
- **理由**：品牌标识与领域枚举值属「技术数据」，非交互文案；严格剔除会降低与后端契约的对齐可读性。

## Process Delta

纯界面文案修正，对 `business_process.html` 无任何结构性改动：
- `L1-01 / L1-03 / L1-04` 节点语义、进入/退出条件与负责人不变。
- `L2-02 / L2-03` 节点不变。
- 流程变更量：**None**（仅节点承载的 UI 表现语言收敛）。

## Service Blueprint Sync Assessment

- **Needs Sync**: **No**
- **Trigger Type**: 无（未命中 SKILL.md 任一触发项）
- **Evidence Source**:
  - 未新增/删除/重命名任何 `SB-STAGE-*` 或 `SB-<LANE>-*` 节点。
  - `frontend-ui` capability 分布与状态（横切支撑）不变，仍位于 `SB-CUSTOMER-01`。
  - 无 capability 在「已落地 / 规划中 / 横切支撑」间迁移。
- **Planned Baseline Update**: 无。仅修正节点承载界面的语言表现，蓝图结构无需回写。

## Domain Boundary Impact & Domain Model Sync Assessment

- **Needs Sync**: **No**
- **Bounded Context Impact**: `bc-shared → cap-ui`（frontend-ui）职责不变，Cross-Context 映射不变。
- **Domain Model Sync Triggers**（检查项）:
  - 新增 Domain Event / Command？ 否。
  - 修改状态机（Coupon/Order/Cart）？ 否。
  - 调整 BC → Capability 映射？ 否。
  - 新增领域对象或关系？ 否。
- **Planned Baseline Update**: 无。`domain_model.html` 无需回写。

## UI 组件层级与状态管理

变更不触及组件层级与状态管理（无 Prototype 变更，纯文案层替换）：

```
App.vue
├── header        (viewMode 切换 / BAG→购物车按钮)
├── main[store]   (商品卡片 ADD TO CART / Cart 侧栏 / 结算按钮 / 空状态)
│   └── aside     (Cart / CLOSE / Empty / Del / 确认结算 / 处理中)
├── main[admin]   (优惠券状态列 statusLabel / 发放记录 UNUSED→未使用)
└── modal         (SUCCESS → 下单成功)
```

- 状态管理：不变（`ref`/`computed` 既有结构）。
- 新增最小逻辑：`statusLabel(status)` 纯函数（enum → 中文），无副作用、可单测。

## Risks / Trade-offs

- [影响范围判定偏差] → 以 spec 的豁免口径为准（品牌名/代码标注保留），提交前逐项对照核对清单。
- [文案替换引入错别字或语义漂移] → 按 FRONTEND.md 走浏览器快照 + 交互验证闭环，HITL 确认。
- [改动面看似微小但分散多行] → 以 spec 中 6 个 Scenario 为验收锚点，逐条核验，避免遗漏。

## Open Questions

无。口径（全站中文化、品牌名豁免、代码标注保留）已在 explore 阶段与用户确认，不改变 specs、方案与任务拆分。
