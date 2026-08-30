## ADDED Requirements

### Requirement: C/B 顶部导航作用域分离

系统 SHALL 将 C 端与 B 端的顶部导航（header）**作用域化分离**：C 端视图（store / orders / register / login / checkout 等）的 header SHALL 仅承载顾客操作（店铺品牌、商品搜索、购物车、我的订单、登录态用户信息、退出登录）；B 端（admin）视图的 header SHALL 为独立运营作用域，展示「运营后台 / 当前模块」分层面包屑，并提供「返回店铺」出口。C 端 header 中 B 端入口 SHALL 为**独立「运营后台」入口按钮**，SHALL NOT 使用「店铺 | 运营后台」分段切换控件；B 端 header SHALL NOT 复用 C 端顾客操作序列（购物车/我的订单/退出登录）。

- **Priority**: P0
- **Rationale**: 顾客与运营是两种业务身份，混排导致 C/B 入口语义不清、呈现不专业。作用域分离符合 PRODUCT.md「逻辑驱动、效率优先」与 FRONTEND.md「左侧导航 + 右侧内容」极简单屏规范。

#### Scenario: C 端店铺视图不从 header 混排运营后台顾客操作
- @e2e
- **GIVEN** 买家打开 C 端店铺视图
- **WHEN** 查看顶部 header
- **THEN** header 仅展示顾客操作（搜索/购物车/我的订单/登录态用户信息/退出登录）
- **AND** B 端入口为独立「运营后台」按钮
- **AND** header 中不存在「店铺 | 运营后台」分段切换控件

#### Scenario: B 端运营后台视图 header 为独立作用域
- @e2e
- **GIVEN** 运营人员进入 B 端运营后台（admin）视图
- **WHEN** 查看顶部 header
- **THEN** header 展示「运营后台 / 当前模块」分层面包屑
- **AND** header 提供「返回店铺」出口
- **AND** header 中不存在购物车/我的订单/退出登录等 C 端顾客操作

#### Scenario: 顶部路径以分层面包屑呈现
- @e2e
- **GIVEN** 运营人员位于 B 端后台「营销中心 / 优惠券管理」
- **WHEN** 查看 header 顶部路径
- **THEN** 路径呈现为「运营后台 / 营销中心 / 优惠券管理」分层面包屑（替代单行映射文案）

#### Scenario: B 端作用域角色标签表达
- @e2e
- **GIVEN** 会话为运营角色用户，位于 B 端后台
- **WHEN** 查看 header「运营专员」标签
- **THEN** 标签显示该运营用户真实昵称

## MODIFIED Requirements

### Requirement: B 端运营后台布局

系统 SHALL 提供 B 端运营后台视图，采用左侧导航栏（高度 `h-16`、激活项左侧 3px 实线指示器）+ 右侧内容区撑满的单屏布局，内容以"独立章节"呈现而非卡片堆叠。**其顶部 header SHALL 为独立运营作用域**（展示「运营后台 / 当前模块」分层面包屑 + 「运营专员」真实角色标签 + 「返回店铺」出口），SHALL NOT 复用 C 端顾客操作序列。所有视觉遵循极简规范（无圆角、无阴影、slate 色系、1px 实线边框 `border-slate-200`）。

- **Priority**: P0
- **Rationale**: 运营后台与 C 端共用一套视觉语言，确保"极简"审美贯穿 B/C 两端；header 作用域边界确保 C/B 入口语义清晰。

#### Scenario: 后台单屏布局渲染
- @e2e
- **GIVEN** 运营人员进入「营销中心 / 优惠券管理」后台视图
- **THEN** 页面展示左侧导航栏与右侧内容区，导航项"优惠券管理"以左侧 3px 实线高亮
- **AND** 内容区按章节顺序展示：新建优惠券规则、优惠券列表、手动发券、最近发放记录
- **AND** 页面任意元素均无圆角、无阴影，边框为 1px 实线
- **AND** 顶部 header 展示「运营后台 / 营销中心 / 优惠券管理」面包屑 + 「返回店铺」出口

#### Scenario: B 端后台 header 不混排 C 端顾客操作
- @e2e
- **GIVEN** 运营人员位于 B 端后台视图
- **WHEN** 查看顶部 header
- **THEN** header 中不存在购物车、我的订单、退出登录等 C 端顾客操作

## Governance Mapping

- **Bounded Context**: Shared / Cross（`docs/baseline/domain_model.html`：`bc-shared` → `cap-ui`（frontend-ui），Cross-Context「全局极简 UI 组件库与视觉规范」；该能力已收录）
- **Capability Taxonomy**: `frontend-ui`（修改·C/B 顶部导航作用域契约细化；taxonomy 无新增/移除）
- **Process Nodes**: `L1-01 触达与发现`（C 端 header 入口作用域化）、`L1-06 履约与完成`（B 端后台入口与返回店铺作用域分离）
- **Service Blueprint**: `SB-STAGE-01 触达与发现`（C 端 header 入口层呈现重组）、`SB-OPS-06`（电商运营层·运营后台与返回店铺 header 作用域分离；capability 分布与状态不变）
- **测试标签**: `@e2e`（C/B header 作用域、面包屑、B 端 role 标签与不混排顾客操作）
