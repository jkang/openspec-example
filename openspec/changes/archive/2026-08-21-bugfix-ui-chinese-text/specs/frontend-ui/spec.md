## ADDED Requirements

### Requirement: UI 文案语言约束
系统 SHALL 保证 C 端店铺首页、结算成功弹窗与 B 端运营后台中所有用户可见的交互文案（按钮、标题、空状态、状态反馈、提示语）均为中文。仅允许以下两类豁免保留英文：品牌标识（如 `Minimal Store`）与领域技术枚举值（如 `FLAT`、`PERCENTAGE`、`ACTIVE` 等状态/类型代码及括号标注）。
- **Priority**: P0
- **Rationale**: 语言一致性是「可视即价值」极简电商的基本体验底线，`docs/FRONTEND.md` 与 `openspec/config.yaml` 均强制「UI 交互界面必须完全使用中文」；英文残留破坏产品一致性并造成买家认知负担。

#### Scenario: C 端首页按钮与文案中文化
- @e2e
- **GIVEN** 买家打开 C 端店铺首页（store 视图）
- **THEN** 顶部购物车按钮显示为「购物车」而非 BAG
- **AND** 商品卡片操作按钮显示为「加入购物车」而非 ADD TO CART
- **AND** 购物车侧栏标题、关闭按钮、空状态、删除操作分别显示「购物车」「关闭」「购物车为空」「删除」
- **AND** 结算按钮显示为「确认结算」，提交处理中显示为「处理中...」

#### Scenario: 搜索空状态中文化
- @e2e
- **GIVEN** 买家搜索关键词无匹配商品
- **THEN** 页面空状态仅显示中文「未找到相关商品」，不出现英文 No Results Found

#### Scenario: 结算成功弹窗中文化
- @e2e
- **GIVEN** 买家完成结算提交
- **THEN** 成功弹窗标识显示为「下单成功」而非 SUCCESS

#### Scenario: B 端运营后台状态列中文化
- @e2e
- **GIVEN** 运营人员进入「营销中心 / 优惠券管理」后台视图
- **THEN** 优惠券列表状态列 SHALL 将英文枚举映射为中文（`ACTIVE`→生效中、`USED`→已使用、`UNUSED`→未使用、`EXPIRED`→已过期）
- **AND** 最近发放记录的券状态显示「未使用」而非 UNUSED

#### Scenario: 页面语言声明与标题中文化
- @e2e
- **GIVEN** 买家打开任意页面
- **THEN** 页面 `<html lang>` 属性为 `zh-CN`
- **AND** 浏览器标签页标题为中文

#### Scenario: 品牌与类型代码豁免保留
- **GIVEN** 首页顶部展示品牌标识、优惠券表单展示类型代码标注
- **THEN** 品牌名 `Minimal Store` 与括号标注（如「满减券 (FLAT)」「折扣券 (PERCENTAGE)」）可保留英文，不视为违规

## Governance Mapping

- **Bounded Context**: Shared / Cross（`domain_model.html` 映射表：`bc-shared → cap-ui`，Cross-Context）
- **Capability Taxonomy**: `frontend-ui`（复用既有横切支撑映射，无新增 taxonomy）
- **Process Alignment**: `L1-01` 触达与发现（首页/搜索空状态）；`L1-03` 加购与准备（购物车交互）；`L1-04` 下单结算 / `L2-02` 加载结算上下文 / `L2-03` 选择优惠方案（结算按钮与成功反馈）
- **Service Blueprint**: `SB-STAGE-01/02/03/06`；`SB-CUSTOMER-01/02/03/06`；`SB-OPS-03`（均为既有节点文案修正，蓝图结构不变）
- **实现版本**: Frontend（`ecommerce-mini-frontend`）
