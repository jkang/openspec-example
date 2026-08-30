# frontend-ui Specification (delta: ZAPP Design System)

> 本增量将 `frontend-ui` 的视觉规范从"现代扁平 slate 极简"更新为 **ZAPP（Memphis × Zine × Dark Premium）暗黑高端**。行为/文案契约不变；唯一事实来源 `docs/baseline/design-system/`（Guidelines.md + src/index.css）。基准：`openspec/specs/frontend-ui/spec.md`。MODIFIED 需求完整保留其在主规格中的全部 Scenario，仅将视觉描述 ZAPP 化。

## ADDED Requirements

### Requirement: ZAPP 设计系统视觉规范

系统 SHALL 使所有前端页面（C 端店铺 / 我的订单 / 注册 / 登录，B 端运营后台各 tab）遵循 **ZAPP 权威设计系统**（`docs/baseline/design-system/guidelines/Guidelines.md`），并仅通过**语义令牌**（`docs/baseline/design-system/src/index.css` 定义的 Tailwind 工具类）表达视觉，禁止散落硬编码 hex。

- **Priority**: P0
- **Rationale**: ZAPP 是系统唯一 UI 事实来源，确保 C/B 双端品牌一致，并作为后续 Feature 的视觉基准。

#### Scenario: 全局语义令牌应用
- @unit
- **GIVEN** 任意页面处于 C 端或 B 端视图
- **THEN** 页面地面使用 `bg-background`（`#08080E`），面板/卡片使用 `bg-card`（`#0F0F1C`），主文本 `text-foreground`（`#EFEFFA`），次级文本 `text-muted-foreground`（`#6E6E9A`），分隔边框 `border-border`（`#222238`）
- **AND** 页面不出现硬编码色值（白底 `bg-white`、`slate-*` 等浅色系）作为页面地面

#### Scenario: 色彩语义用途
- @unit
- **GIVEN** 页面存在主 CTA、促销、热门、限定、成功等状态元素
- **THEN** 主 CTA / 价格 / 激活态 / 焦点环使用 `bg-primary`（`#C8FF00` 荧光绿）与 `text-primary-foreground`；促销/限时/折扣使用 `bg-accent`（`#FF2D6B` 热情粉）；热门/资讯使用 `bg-electric`（`#3B6DFF`）；限定/低库存使用 `bg-warning`（`#FF9A00`）；有货/已确认使用 `bg-success`（`#00E5A0`）
- **AND** 同一交互元素 SHALL NOT 同时使用 primary 与 accent

#### Scenario: 三字体协作
- @unit
- **GIVEN** 页面加载
- **THEN** 标题使用 `font-display`（Exo 2）且 `uppercase tracking-tight`，主标题 `font-display font-black uppercase`
- **AND** 正文使用 `font-sans`（DM Sans）
- **AND** 价格使用 `font-mono font-bold text-primary`（JetBrains Mono）
- **AND** UI 标签/分类 tab/token 注释使用 `font-mono text-xs uppercase tracking-widest text-muted-foreground`
- **AND** 页面已通过 `@import` 加载 Exo 2 / DM Sans / JetBrains Mono 三字体

#### Scenario: 圆角与阴影约束
- @unit
- **GIVEN** 页面任意元素
- **THEN** 圆角仅 `rounded-none` 或 `rounded-sm`（2px），禁止大圆角；`rounded-full` 仅用于头像 chip / 胶囊式数量指示器
- **AND** 页面无 `box-shadow`、无 `background: linear-gradient(...)`
- **AND** 边框为 1px 实线 `border-border`

#### Scenario: hover 高亮
- @unit
- **GIVEN** 元素支持 hover
- **THEN** hover 高亮使用 `hover:border-primary`（或前景/主色文字），SHALL NOT 使用背景色 flood

## MODIFIED Requirements

### Requirement: 商品卡片展示

系统 SHALL 以卡片形式展示商品，每张卡片必须包含图片、名称、描述、价格和操作按钮。卡片遵循 ZAPP 视觉：`bg-card border border-border`，hover 时 `hover:border-primary`，图片容器 `bg-muted`，商品名 `font-display font-bold`，价格 `font-mono font-bold text-primary`。

- **Priority**: P0
- **Rationale**: 商品卡片是电商 UI 的核心，直接决定了用户对产品与品牌的专业感认知。

#### Scenario: 渲染商品卡片
- @unit
- **GIVEN** 商品数据包含 { name, description, price, imageUrl }
- **WHEN** 页面加载商品列表
- **THEN** 系统展示 `bg-card border border-border` 的 ZAPP 暗黑卡片
- **AND** 图片显示在卡片顶部，宽高比为 4:3，图片容器 `bg-muted`
- **AND** 鼠标悬停时卡片边框变为主色 `hover:border-primary`
- **AND** 商品名使用 `font-display font-bold`，价格使用 `font-mono font-bold text-primary`

#### Scenario: 加购按钮成功态
- @unit
- **GIVEN** 商品卡片展示「加入购物车」按钮
- **WHEN** 用户点击加购
- **THEN** 按钮翻转至 `bg-success`（`#00E5A0`）成功态并显示「✓ 已加入」

### Requirement: 状态反馈模态框规范

系统 SHALL 使用 ZAPP 暗黑 `bg-card` 模态框展示关键操作的结果（如结算成功）。模态框必须具备 1px `border-border` 边框、暗黑表面背景，并使用内容决定大小的紧凑布局。

- **Priority**: P1
- **Rationale**: 统一系统内的状态反馈视觉语言，符合 ZAPP 暗黑高端定位。

#### Scenario: 展示成功模态框
- @unit
- **GIVEN** 操作（如结算）已成功完成
- **WHEN** 触发反馈展示
- **THEN** 系统在页面中央展示一个 1px 边框（`border-border`）的 `bg-card` 模态框
- **AND** 包含至少一个明确的动作按钮（如「继续购物」）用于关闭模态框
- **AND** 背景使用半透明暗色遮罩（如 `bg-black/60`）
- **AND** 成功标识使用 `font-mono font-bold text-primary`（或 Unicode 符号 `✓`）

<details>
<summary>View UI Prototype Code</summary>

```html
<div v-if="showSuccess" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
    <div class="w-full max-w-xs bg-card border border-border p-8 space-y-6 text-center">
        <!-- 成功标识 -->
        <div class="flex justify-center">
            <span class="w-12 h-12 flex items-center justify-center font-mono font-bold text-primary">✓</span>
        </div>
        <!-- 内容和按钮省略... -->
    </div>
</div>
```
</details>

### Requirement: B 端运营后台布局

系统 SHALL 提供 B 端运营后台视图，采用左侧导航栏（高度 `h-16`、激活项左侧 3px 实线指示器）+ 右侧内容区撑满的单屏布局，内容以"独立章节"呈现而非卡片堆叠。其顶部 header SHALL 为独立运营作用域（展示「运营后台 / 当前模块」分层面包屑 + `role` 真实角色标签 + 「返回店铺」出口），SHALL NOT 复用 C 端顾客操作序列。所有视觉遵循 ZAPP：`bg-background` 地面、`bg-card`/`border-border` 面板、导航激活态 `bg-primary` 高亮、`font-mono uppercase` 标签。

- **Priority**: P0
- **Rationale**: 运营后台与 C 端共用 ZAPP 视觉语言，header 作用域边界确保 C/B 入口语义清晰。

#### Scenario: 后台单屏布局渲染
- @e2e
- **GIVEN** 运营人员进入「营销中心 / 优惠券管理」后台视图
- **THEN** 页面展示左侧导航栏与右侧内容区，导航项"优惠券管理"以左侧 3px 实线 + `bg-primary` 高亮
- **AND** 内容区按章节顺序展示：新建优惠券规则、优惠券列表、手动发券、最近发放记录
- **AND** 页面任意元素均无圆角/阴影，边框为 1px `border-border`，地面为 `bg-background`，面板为 `bg-card`
- **AND** 顶部 header 展示「运营后台 / 营销中心 / 优惠券管理」面包屑 + 「返回店铺」出口

#### Scenario: B 端后台 header 不混排 C 端顾客操作
- @e2e
- **GIVEN** 运营人员位于 B 端后台视图
- **WHEN** 查看顶部 header
- **THEN** header 中不存在购物车、我的订单、退出登录等 C 端顾客操作

### Requirement: B 端商品管理界面（CRUD）

系统 SHALL 提供 B 端商品管理视图（复用既有运营后台单屏布局：左侧导航 + 右侧内容区），包含：商品列表（图片、名称、价格、库存、状态、操作）、编辑表单（名称、价格、库存、图片链接、描述）、删除确认。所有视觉遵循 ZAPP（`bg-background` 地面、`bg-card`/`border-border` 面板、价格 `font-mono font-bold text-primary`、标签 `font-mono uppercase tracking-widest text-muted-foreground`、全中文、真实数据、无圆角/阴影）。

- **Priority**: P0
- **Rationale**: 补齐商品管理后台"改/删"交互界面（对应 Phase 2 Exit Criteria ②），与 ZAPP 视觉规范完全对齐。

#### Scenario: 商品列表渲染与状态过滤
- @e2e
- **GIVEN** 运营人员进入「交易管理 / 商品管理」后台视图
- **THEN** 页面展示左侧导航栏与右侧内容区，导航项「商品管理」以左侧 3px 实线 + `bg-primary` 高亮
- **AND** 商品列表仅展示 `active`（上架中）商品，每行含图片、名称、价格（`font-mono text-primary`）、库存、状态与操作按钮
- **AND** 页面任意元素均无圆角/阴影，边框为 1px `border-border`

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

### Requirement: B 端分类管理界面

系统 SHALL 提供 B 端分类管理视图（复用运营后台单屏布局），包含：分类列表（排序号、名称、商品数、状态、操作）、新增/编辑表单（名称、排序号）、删除确认（提示该分类下商品数，确认后删除并提示商品将变为未分类）。所有视觉遵循 ZAPP（`bg-background` 地面、`bg-card`/`border-border` 面板、标签 `font-mono uppercase tracking-widest text-muted-foreground`、无圆角/阴影）。

- **Priority**: P0
- **Rationale**: 运营需要结构化组织商品目录，遵循 ZAPP 视觉规范。

#### Scenario: 分类列表渲染
- @e2e
- **GIVEN** 运营人员进入「交易管理 / 分类管理」后台视图
- **THEN** 导航项「分类管理」以左侧 3px 实线 + `bg-primary` 高亮
- **AND** 分类列表展示排序号、名称、商品数、状态（生效中）与操作按钮
- **AND** 页面任意元素无圆角/阴影，边框为 1px `border-border`

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

### Requirement: C 端我的订单视图

系统 SHALL 提供 C 端「我的订单」视图：header 提供「我的订单」入口（与购物车并列）；订单列表展示订单号、状态（中文映射）、实付金额、商品摘要；点击「查看详情」展开订单详情（金额明细、优惠券、商品快照）与状态轨迹（待支付→已支付→已发货→已完成；已取消单独标注）。所有视觉遵循 ZAPP（`bg-background` 地面、`bg-card`/`border-border` 面板、金额 `font-mono font-bold`、状态徽章用语义色、无圆角/阴影）。

- **Priority**: P0
- **Rationale**: 买家需要持续追踪订单状态，形成「下单→支付→发货→可见」闭环。

#### Scenario: 我的订单入口与列表渲染
- @e2e
- **GIVEN** 当前用户存在多个不同状态订单
- **WHEN** 买家点击 header「我的订单」
- **THEN** 展示订单列表（订单号/状态中文/实付金额/商品摘要），按创建倒序
- **AND** 页面任意元素无圆角/阴影，边框为 1px `border-border`，金额使用 `font-mono font-bold`

#### Scenario: 订单详情与状态轨迹
- @e2e
- **GIVEN** 买家位于我的订单列表
- **WHEN** 买家点击某订单「查看详情」
- **THEN** 展开详情：商品总额/优惠券/折扣/实付 + 商品明细
- **AND** 状态轨迹高亮当前状态（待支付→已支付→已发货→已完成），高亮态用 `text-primary`/`border-primary`

#### Scenario: 结算成功弹窗跳转查看
- @e2e
- **GIVEN** 买家完成支付（订单已支付）
- **WHEN** 买家在结算成功弹窗点击「查看订单」
- **THEN** 跳转我的订单视图，该订单显示「已支付」

### Requirement: C/B 顶部导航作用域分离

系统 SHALL 将 C 端与 B 端的顶部导航（header）**作用域化分离**：C 端视图（store / orders / register / login / checkout 等）的 header SHALL 仅承载顾客操作（店铺品牌、商品搜索、购物车、我的订单、登录态用户信息、退出登录）；B 端（admin）视图的 header SHALL 为独立运营作用域，展示「运营后台 / 当前模块」分层面包屑，并提供「返回店铺」出口。C 端 header 中 B 端入口 SHALL 为**独立「运营后台」入口按钮**，SHALL NOT 使用「店铺 | 运营后台」分段切换控件；B 端 header SHALL NOT 复用 C 端顾客操作序列（购物车/我的订单/退出登录）。所有视觉遵循 ZAPP：header `bg-card border-b border-border`、品牌 logo `bg-primary` 方块、分类 tab `font-mono uppercase`（激活 `bg-primary text-primary-foreground`）、购物车角标 `bg-primary text-primary-foreground` 小方块。

- **Priority**: P0
- **Rationale**: 顾客与运营是两种业务身份，混排导致 C/B 入口语义不清、呈现不专业。作用域分离符合 PRODUCT.md「逻辑驱动、效率优先」与 FRONTEND.md ZAPP 规范。

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

## Governance Mapping

- **Bounded Context**: Shared / Cross（`domain_model.html` 映射表：`bc-shared → cap-ui`，Cross-Context）
- **Capability Taxonomy**: `frontend-ui`（复用既有横切支撑映射；**无新增/移除 taxonomy**。ZAPP 视觉规范更新不改 BC 边界、Domain Event/Command/Policy、Aggregate/状态机）
- **Process Alignment**: `L1-01` 触达与发现；`L1-03` 加购与准备；`L1-04` 下单结算；`L1-06` 履约与完成；B 端 `L2` 运营各子流程（订单/商品/分类/优惠券/用户/看板）。本变更仅视觉层，不改变流程语义。
- **Service Blueprint**: `SB-STAGE-01/02/03/06` 与 `SB-CUSTOMER-01/02/03/06`（C 端视觉）、`SB-OPS-01/02/03/04/06`（B 端运营视觉）、`SB-BACKSTAGE-*`（接口消费不变）。**能力分布与状态不变** → 服务蓝图显式 No-op。
- **实现版本**: Frontend（C 端店铺 + 我的订单 + B 端运营后台视图）。Node.js / Python 零改动。
