# Story: B 端商品管理 CRUD 补齐（改/删）(story-product-admin-crud)

## 用户场景

- **目标用户**: 电商运营人员（B 端）。
- **使用动机**: 运营需要维护真实商品目录 —— 修改在售商品的价格/库存/图片/描述，以及下架（删除）失效商品，不再依赖开发同学写入种子/兜底数据。
- **关键目标**: 补齐商品管理「改 + 删」，与既有「增 + 查」共同构成完整 CRUD，满足 Phase 2 Exit Criteria ②「商品管理后台支持增删改查」；通过软删除保证历史订单可追溯。

## 范围

### In Scope

- **商品修改**：编辑 `name`、`priceCents`、`stock`、`imageUrl`、`description`，保存后立即生效。
- **商品删除（软删除 / 下架）**：删除将商品 `status` 置为 `deleted`，从 C 端商店与后台默认列表移除；历史订单/购物车引用（商品快照）不受影响。
- **列表/搜索过滤**：`GET /api/products`（含 name 过滤、sort 排序）默认只返回 `active` 商品。
- **前端商品管理页**：商品列表 + 编辑表单 + 删除确认，极简 UI（真实数据、全中文）。

### Out of Scope

- 商品分类管理（Phase 2 In Scope 另一独立项，后续独立变更）。
- 批量修改 / 批量删除、商品导入导出。
- 库存预警、自动补货。
- 履约 / 退款 / 售后相关状态流转。
- Python 后端同步 CRUD（本次降级观察）。

## 原型参考 (Prototype Reference)

- **原型链接**: [catalog-management.html](file:///Users/superkkk/MyCoding/OpenSpec-practice/openspec/changes/story-product-admin-crud/prototypes/catalog-management.html)（已通过 HITL 确认）
- **关键交互点**:
  - 商品列表展示图片、名称、价格、库存、状态与操作；按 `active` 状态过滤。
  - 「编辑」按钮回填表单（名称/价格/库存/图片/描述），保存后更新列表。
  - 「删除」按钮弹出确认区，确认后将商品下架并从列表移除。
  - 价格输入校验 > 0 元、库存校验 >= 0。

## 业务规则

| 规则ID | 规则描述 | 触发条件 | 期望结果 | 备注 |
| --- | --- | --- | --- | --- |
| R-PRODUCT-001 | 可编辑字段 | 运营编辑商品 | 仅允许修改 name / priceCents / stock / imageUrl / description | 其余为系统托管字段 |
| R-PRODUCT-002 | 价格校验 | 提交商品修改/新增 | priceCents > 0，否则拒绝并提示 | 保证财务精确性与正价 |
| R-PRODUCT-003 | 库存校验 | 提交商品修改/新增 | stock >= 0，否则拒绝并提示 | 库存不得为负 |
| R-PRODUCT-004 | 软删除语义 | 运营执行删除 | 商品 status 置为 deleted，非物理移除 | 历史订单/购物车引用为快照，不受影响 |
| R-PRODUCT-005 | 列表/搜索过滤 | 查询商品列表 | 默认仅返回 status=active 商品；deleted 不可见 | 存量无 status 字段视为 active |
| R-PRODUCT-006 | 改价不溯及 | 修改价格 | 不更改任何历史订单 actualPaidCents | 支付确认后价格锁定，仅影响后续加购 |
| R-PRODUCT-007 | 修改即生效 | 保存商品修改 | 修改后列表与 C 端立即反映新值 | 无需额外审批流 |

## 验收标准 (E2E 用户旅程)

### 旅程 1：运营修改商品

- **流程映射**: `L1-01` 触达与发现、`L1-02` 评估与决策（商品元数据供给）
- **蓝图映射**: `SB-STAGE-01`、`SB-STAGE-02`、`SB-CUSTOMER-01`、`SB-CUSTOMER-02`（C 端消费更新后的商品数据）

#### 场景：修改商品价格与库存并生效

- **GIVEN** 运营人员王琳登录运营后台并进入「交易管理 / 商品管理」，商品列表中存在「极简机械键盘」（¥299.00, 库存 99）
- **WHEN** 王琳点击「编辑」，将价格改为 ¥279.00、库存改为 50，并点击「保存修改」
- **THEN** 商品列表中该商品显示为 ¥279.00、库存 50
- **AND** C 端商店首页该商品价格同步更新为 ¥279.00

#### 场景：非法数据被拒绝

- **GIVEN** 王琳正在编辑商品
- **WHEN** 王琳将价格填写为 0 或库存填写为 -1，并点击「保存修改」
- **THEN** 系统拒绝保存并提示「价格必须大于 0 元」或「库存不能为负数」
- **AND** 商品数据不发生任何变化

### 旅程 2：运营删除（下架）商品

- **流程映射**: `L1-01` 触达与发现（下架后不再供给 C 端）
- **蓝图映射**: `SB-STAGE-01`、`SB-CUSTOMER-01`（商品栅格）、`SB-OPS-04`（运营移除商品活动）

#### 场景：删除后商品从 C 端与列表移除

- **GIVEN** 商品列表中存在「桌面收纳架」（上架中）
- **WHEN** 王琳点击「删除」并确认下架
- **THEN** 该商品从运营后台商品列表中消失
- **AND** C 端商店首页不再展示「桌面收纳架」
- **AND** 历史订单（含该商品快照）不受影响，仍可正常追溯

#### 场景：删除确认前取消

- **GIVEN** 王琳在商品行点击「删除」
- **WHEN** 王琳在确认区点击「取消」
- **THEN** 确认区关闭，商品保持「上架中」，列表不变

### 旅程 3：修改/删除后商品列表与搜索一致性

- **流程映射**: `L1-01`、`L1-02`；`SB-STAGE-01`、`SB-CUSTOMER-01`

#### 场景：搜索与列表不含已删除商品

- **GIVEN** 「桌面收纳架」已被下架（deleted）
- **WHEN** 用户请求 `GET /api/products`（不带过滤）或按名称搜索「收纳架」
- **THEN** 返回结果中不包含该已下架商品
- **AND** 其余 active 商品正常返回

## 关联规格入口

- [ ] [proposal.md](file:///Users/superkkk/MyCoding/OpenSpec-practice/openspec/changes/story-product-admin-crud/proposal.md)
- [ ] specs/catalog-management/spec.md
- [ ] specs/frontend-ui/spec.md
