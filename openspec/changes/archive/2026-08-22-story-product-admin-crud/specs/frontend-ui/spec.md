## ADDED Requirements

### Requirement: B 端商品管理界面（CRUD）
系统 SHALL 提供 B 端商品管理视图（复用既有运营后台单屏布局：左侧导航 + 右侧内容区），包含：商品列表（图片、名称、价格、库存、状态、操作）、编辑表单（名称、价格、库存、图片链接、描述）、删除确认。所有视觉遵循极简规范（无圆角、无阴影、slate 色系、1px 实线边框 `border-slate-200`、全中文、真实数据）。
- **Priority**: P0
- **Rationale**: 补齐商品管理后台"改/删"交互界面（对应 Phase 2 Exit Criteria ②），与确认后的 `prototype.html` 完全对齐。

#### Scenario: 商品列表渲染与状态过滤
- @e2e
- **GIVEN** 运营人员进入「交易管理 / 商品管理」后台视图
- **THEN** 页面展示左侧导航栏与右侧内容区，导航项「商品管理」以左侧 3px 实线高亮
- **AND** 商品列表仅展示 `active`（上架中）商品，每行含图片、名称、价格、库存、状态与操作按钮
- **AND** 页面任意元素均无圆角、无阴影，边框为 1px 实线

#### Scenario: 编辑表单回填
- @e2e
- **GIVEN** 商品列表存在商品「极简机械键盘」（¥299.00、库存 99）
- **WHEN** 运营人员点击该商品的「编辑」按钮
- **THEN** 编辑章节标题为「编辑商品」
- **AND** 名称、价格、库存、图片链接、描述输入框分别回填该商品当前值

#### Scenario: 编辑保存并刷新列表
- @e2e
- **GIVEN** 运营人员已回填「极简机械键盘」编辑表单
- **WHEN** 运营人员将价格改为 ¥279.00 并点击「保存修改」
- **THEN** 商品列表该行价格更新为 ¥279.00
- **AND** 编辑表单被清空复原

#### Scenario: 删除确认交互
- @e2e
- **GIVEN** 商品列表存在「桌面收纳架」
- **WHEN** 运营人员点击「删除」
- **THEN** 页面展示删除确认区，文案说明"该商品将从 C 端商店与列表中移除，历史订单不受影响"
- **AND** 运营人员点击「确认删除（下架）」后，该商品从列表移除
- **AND** 运营人员点击「取消」则列表与商品状态均不变

#### Scenario: 非法输入内联拒绝
- @e2e
- **GIVEN** 运营人员正在编辑/新增商品
- **WHEN** 运营人员将价格填为 0 或库存填为 -1，并点击保存
- **THEN** 页面显示内联错误（「价格必须大于 0 元」或「库存不能为负数」）
- **AND** 不调用修改/新增接口，列表不变

### Requirement: 商品管理页语言约束
系统 SHALL 保证 B 端商品管理界面所有用户可见文案为中文，仅允许领域枚举值（如 `active`/`deleted` 状态代码，或括号标注类型）保留原文。
- **Priority**: P0
- **Rationale**: 与全站中文 UI 约束一致（`docs/FRONTEND.md` 第 4 节、`openspec/config.yaml` prototype 规则）。

#### Scenario: 商品状态列中文化
- @e2e
- **GIVEN** 运营人员进入「交易管理 / 商品管理」后台视图
- **THEN** 商品列表状态列 SHALL 将 `active`/`deleted` 映射为「上架中」/「已下架」

## Governance Mapping

- **Bounded Context**: Shared / Cross（`domain_model.html` 映射表：`bc-shared → cap-ui`，Cross-Context）
- **Capability Taxonomy**: `frontend-ui`（复用既有横切支撑映射，无新增 taxonomy）
- **Process Alignment**: `L1-01` 触达与发现、`L1-02` 评估与决策（商品元数据展示）
- **Service Blueprint**: `SB-STAGE-01`、`SB-CUSTOMER-01`（C 端商品展示交互）、`SB-OPS-01/02/04`（B 端商品管理界面）、`SB-BACKSTAGE-01/04/06`（后台接口消费）
- **实现版本**: Frontend（B 端商品管理视图）
