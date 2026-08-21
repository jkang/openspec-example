## Why

C 端店铺首页及全站 UI 存在多处英文按钮/文案（`BAG`、`ADD TO CART`、`Complete Checkout`、`SUCCESS`、`No Results Found` 等），违反 `docs/FRONTEND.md` 与 `openspec/config.yaml` 的硬性约束「UI 交互界面必须完全使用中文」。Phase 2 刚落地的 B 端运营后台（`story-coupon-admin-panel`）也混入英文状态文本（`{{ coupon.status }}`、`UNUSED`）。英文残留破坏「可视即价值」的产品一致性，属于既有功能的合规性修正，不改变 Phase 2 范围。

## What Changes

- **C 端首页（store 视图）文案中文化**：`BAG`→购物车、`ADD TO CART`→加入购物车、`Cart (n)`→购物车 (n)、`CLOSE`→关闭、`Empty`→购物车为空、`Del`→删除、`Complete Checkout`→确认结算、`Processing...`→处理中...、`No Results Found` 删除（下方已有中文「未找到相关商品」）。品牌名 `Minimal Store` 豁免保留（用户确认）。
- **结算成功弹窗**：`SUCCESS`→下单成功。
- **B 端运营后台**：`{{ coupon.status }}` 增加中文枚举映射（`UNUSED`→未使用、`USED`→已使用、`ACTIVE`→生效中、`EXPIRED`→已过期），发放记录静态文本 `UNUSED`→未使用。
- **`index.html`**：`lang="en"`→`lang="zh-CN"`，`<title>` 改为中文。
- **范围说明**：类型/状态代码括号标注（`(FLAT)`、`(PERCENTAGE)`、`(ACTIVE)`）保留（用户确认），仅作为技术枚举说明，不承担按钮/标签职能。

## Capabilities

### New Capabilities

- 无

### Modified Capabilities

- `frontend-ui`: 新增「UI 文案语言约束」Requirement——系统 SHALL 保证所有用户可见交互文案（按钮、标题、空状态、状态反馈、提示）为中文，仅允许技术枚举值（如 `FLAT`/`PERCENTAGE`/状态代码）及品牌标识保留英文；同时覆盖 C 端首页、结算成功弹窗与 B 端运营后台。

## Impacted Bounded Contexts

- **Shared / Cross**（唯一影响）：治理 `frontend-ui`，通过 `domain_model.html` 映射 `bc-shared → cap-ui`（Cross-Context，共享极简 UI 视觉与语言规范）。
- 无新增 taxonomy：`frontend-ui` 为既有横切支撑 capability。

## Process Alignment

- `L1-01 触达与发现`：首页浏览/搜索空状态的文案中文化（`No Results Found`）。
- `L1-03 加购与准备`：购物车侧栏交互文案（`Cart`/`BAG`/`Empty`/`Del`）中文化。
- `L1-04 下单结算` / `L2-02 加载结算上下文` / `L2-03 选择优惠方案`：结算按钮、处理中状态、成功弹窗文案中文化。
- 说明：纯文案修正，不改动流程结构、节点语义与业务规则。

## Service Blueprint Alignment

- **主要阶段**：
  - `SB-STAGE-01 触达与发现`（首页/搜索交互界面）
  - `SB-STAGE-02 选购与加购`（加购与购物车交互）
  - `SB-STAGE-03 结算确认`（结算按钮与优惠券选择区）
  - `SB-STAGE-06 成功回流`（成功弹窗反馈）
- **影响节点**：
  - `SB-CUSTOMER-01`（复用，**文案修正**）：商品栅格与搜索交互界面文案中文化。
  - `SB-CUSTOMER-02`（复用，**文案修正**）：加购/购物车交互界面文案中文化。
  - `SB-CUSTOMER-03`（复用，**文案修正**）：结算/优惠券交互界面文案中文化。
  - `SB-CUSTOMER-06`（复用，**文案修正**）：成功反馈文案中文化。
  - `SB-OPS-03`（复用，**文案修正**）：B 端发券后台状态列文案中文化。
- **布局口径**：仅修正既有节点的界面语言表现，不新增/删除阶段、泳道或 capability，蓝图结构不变。

## Impact

- **Frontend**：仅 `ecommerce/ecommerce-mini-frontend/src/App.vue` 与 `index.html` 文案替换；无组件/布局/交互逻辑变化。
- **后端**：Node.js / Python 无影响，接口契约与返回数据不变。
- **数据模型**：无变化。
- **基线同步**：`/opsx:sync` 阶段预计无需回写基线（无流程/蓝图结构变化）。
- **后续流程**：Bug Fix 含 UI 变更，但纯文案替换、无需视觉原型，**跳过 Prototype**；下一步执行 `/opsx:spec-design`（含 RCA 与浏览器验证闭环任务），再实施。
