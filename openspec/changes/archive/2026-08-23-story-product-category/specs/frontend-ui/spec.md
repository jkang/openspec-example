## ADDED Requirements

### Requirement: B 端分类管理界面
系统 SHALL 提供 B 端分类管理视图（复用运营后台单屏布局），包含：分类列表（排序号、名称、商品数、状态、操作）、新增/编辑表单（名称、排序号）、删除确认（提示该分类下商品数，确认后删除并提示商品将变为未分类）。所有视觉遵循极简规范。
- **Priority**: P0
- **Rationale**: 运营需要结构化组织商品目录，与确认后的 `prototype.html` 对齐。

#### Scenario: 分类列表渲染
- @e2e
- **GIVEN** 运营人员进入「交易管理 / 分类管理」后台视图
- **THEN** 导航项「分类管理」以左侧 3px 实线高亮
- **AND** 分类列表展示排序号、名称、商品数、状态（生效中）与操作按钮
- **AND** 页面任意元素无圆角、无阴影，边框为 1px 实线

#### Scenario: 新增分类并生效
- @e2e
- **GIVEN** 运营人员位于分类管理页
- **WHEN** 填写名称「键鼠外设」、排序号 1 并点击「新增分类」
- **THEN** 列表新增该分类，状态为「生效中」
- **AND** 商品管理页分类下拉与 C 端筛选条出现该分类

#### Scenario: 删除分类确认与商品置空提示
- @e2e
- **GIVEN** 分类「音频设备」下有 1 个商品
- **WHEN** 运营人员点击「删除」
- **THEN** 删除确认区展示「其下 1 个商品将变为『未分类』，不影响销售」
- **AND** 确认后该分类从列表移除

### Requirement: 商品编辑分类下拉
系统 SHALL 在商品编辑表单提供「分类」下拉选择：选项为全部 active 分类 + 「未分类」；保存后商品分类即时更新。
- **Priority**: P1
- **Rationale**: 分类挂载是分类管理闭环的关键动作（R-CAT-005）。

#### Scenario: 商品表单分类下拉
- @e2e
- **GIVEN** 运营人员编辑商品「极简机械键盘」
- **WHEN** 在「分类」下拉选择「键鼠外设」并保存
- **THEN** 商品列表该商品分类显示「键鼠外设」
- **AND** 分类管理页「键鼠外设」商品数 +1

### Requirement: C 端分类筛选条
系统 SHALL 在 C 端首页商品区顶部提供分类筛选条：包含「全部」与全部 active 分类，点击按分类过滤商品；当前选中分类以高亮呈现。
- **Priority**: P0
- **Rationale**: 买家按品类浏览是核心发现路径，与确认后的 `prototype.html` 对齐（R-CAT-006）。

#### Scenario: 分类筛选条渲染
- @e2e
- **GIVEN** 买家打开 C 端首页
- **THEN** 商品区顶部展示「全部 / 键鼠外设 / 显示设备 / 桌面收纳 / 音频设备」筛选条
- **AND** 「全部」默认选中（高亮）

#### Scenario: 点击分类过滤商品
- @e2e
- **GIVEN** 买家位于 C 端首页
- **WHEN** 买家点击「键鼠外设」
- **THEN** 商品列表仅展示该分类下 active 商品
- **AND** 点击「全部」恢复全量商品

## Governance Mapping

- **Bounded Context**: Shared / Cross（`domain_model.html` 映射表：`bc-shared → cap-ui`，Cross-Context）
- **Capability Taxonomy**: `frontend-ui`（复用既有横切支撑映射，无新增 taxonomy）
- **Process Alignment**: `L1-01` 触达与发现（C 端分类浏览/筛选）；`L1-02` 评估与决策（商品元数据展示）
- **Service Blueprint**: `SB-STAGE-01`、`SB-CUSTOMER-01`（C 端分类筛选条）、`SB-OPS-01`（B 端分类管理界面）、`SB-BACKSTAGE-01`（分类接口消费）
- **实现版本**: Frontend（B 端分类管理视图 + C 端分类筛选条）
