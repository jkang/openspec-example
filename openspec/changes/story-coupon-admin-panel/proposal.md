## Why

Story 1（结算引擎升级）已让 C 端具备 FLAT / PERCENTAGE 券的计算与最优推荐能力，但运营侧没有任何入口创建券规则和发放优惠券，可用券只能依赖预设种子数据，营销能力无法真实落地。本 Story 补齐 B 端运营闭环，使“配置 → 发放 → 结算核销”链路完整可用。

## What Changes

- **券规则配置（B 端）**：新增运营后台入口，支持创建优惠券规则：名称、类型（FLAT / PERCENTAGE）、折扣值 / 金额、使用门槛（minSpendCents）、有效期。创建的券即进入 `ACTIVE` 状态，可被发放与参与最优推荐（对应 Coupon 状态机 `DRAFT → ACTIVE`，本 Story 简化为创建即生效）。
- **手动单人发券**：支持将已配置的券发放给指定 userId，建立券与用户的持有关系；仅单人发放，不支持批量（Epic 探索已确认）。
- **券列表视图**：极简列表展示已配置券的类型、值、门槛、有效期与发放情况，作为配置与发放的统一入口。
- **范围说明**：
  - 适用范围保持**全场通用**，不做商品级 / 品类级配置。
  - 不含券的停用 / 删除、数据报表与退款相关逻辑（退款已移至 Roadmap 下一阶段）。

## Capabilities

### New Capabilities

- 无

### Modified Capabilities

- `coupon-management`: 新增 B 端券规则配置（创建 / 列表）与手动单人发放需求，建立券与 userId 的持有关系，作为结算时候选券识别（L3-01）的输入来源。
- `frontend-ui`: 新增 B 端极简运营后台页面（券规则配置表单、单人发券操作、券列表），遵循既有极简 UI 规范。

## Impacted Bounded Contexts

- **Coupon Context**（主影响）：治理 `coupon-management`，负责券生命周期与发放归属规则。本 Story 在其边界内新增“配置”与“发放”行为，不改变既有核销与最优推荐语义。
- **Shared / Cross**（横切）：治理 `frontend-ui`，B 端后台页面复用全局极简 UI 规范。

无新增 taxonomy：所有 capability 均复用 `domain_model.html` 既有映射（Coupon Context → coupon-management，Shared / Cross → frontend-ui）。

## Process Alignment

- `L2-02` 加载结算上下文：本 Story 发放的券是“读取可用优惠资源”的数据来源。
- `L3-01` 识别候选券：券与 userId 的持有关系直接决定候选券集合。
- 说明：本 Story 是交易主流程（L1-04 下单结算）的**上游供给动作**，`business_process.html` 当前未将运营配置建模为独立 L2 价值段；按 Lightweight 原则不新增流程结构，仅供给既有节点，后续若运营流复杂化再评估下沉。

## Service Blueprint Alignment

- **主要阶段**：`SB-STAGE-03`（结算确认）—— 运营配置的券在该阶段被 C 端消费。
- **影响节点**：
  - `SB-OPS-03`（**修改**）：“创建 FLAT / PERCENTAGE 优惠券、设置 minSpendCents 与有效期”活动获得实际 UI / API 支撑，并新增“手动单人发券”运营活动。
  - `SB-BACKSTAGE-03`（**修改**）：后台活动补充券规则持久化与单人发放接口。
- **布局口径**：复用现有 capability 布局（`coupon-management`），不新增阶段、泳道或 capability；无新增 taxonomy。

## Impact

- **后端**：Node.js 与 Python 各自新增 admin 端点（券规则创建、券列表、单人发放），落在既有 HTTP → Service → Domain → Repo 四层结构内，不改动结算引擎逻辑。
- **前端**：新增 B 端运营后台页面（单文件 HTML 原型先行，经 HITL 确认后落地）。
- **基线同步**：`/opsx:sync` 阶段预计需小幅回流 `service_blueprint.html` 的 `SB-OPS-03` / `SB-BACKSTAGE-03` 活动描述，并评估 `domain_model.html` 的 Coupon 聚合是否补充发放归属语义。
- **后续流程**：本 Story 含 UI 变更，下一步执行 `/opsx:prototype` → `/opsx:Story`。
