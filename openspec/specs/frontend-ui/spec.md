# frontend-ui Specification

## Purpose

定义电商系统的前端 UI 表现和交互逻辑，确保符合 Modern Flat 设计规范并提供专业的商品展示体验。

## Requirements

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

### Requirement: 响应式商品网格
**Priority**: P1
**Rationale**: 确保不同设备上的用户都能获得一致且专业的浏览体验。

系统 SHALL 使用响应式网格布局展示商品卡片，确保在不同屏幕尺寸下保持紧凑。

#### Scenario: 响应式网格布局
- @unit

- **WHEN** 在大屏幕上查看
- **THEN** 网格至少显示 3 列
- **WHEN** 在移动端查看
- **THEN** 网格自动调整为 1 列

### Requirement: 实时商品搜索
**Priority**: P2
**Rationale**: 提升用户在大规模商品目录中查找特定商品的效率。

系统 SHALL 提供基于商品名称和分类的实时搜索过滤功能。

#### Scenario: 动态过滤列表
- @e2e
- **GIVEN** 用户位于商品目录页面
- **WHEN** 用户在搜索框输入关键词
- **THEN** 商品列表立即更新，仅显示匹配该关键词的商品
- **AND** 如果没有匹配项，显示“未找到相关商品”的空状态反馈

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

### Requirement: 优惠券配置表单交互
系统 SHALL 在新建券章节提供规则表单：名称输入、类型切换（FLAT / PERCENTAGE）、优惠值输入（随类型切换语义为“减免金额”或“折扣比例”）、使用门槛、有效期。提交前 SHALL 执行合法性校验，非法时以内联错误提示拒绝提交。
- **Priority**: P0
- **Rationale**: 表单校验是防止异常营销规则入库的第一道防线，校验规则与后端一致性（R-ADMIN-002 / 003）。

#### Scenario: 类型切换联动优惠值输入语义
- @e2e
- **GIVEN** 运营人员位于新建优惠券表单
- **WHEN** 运营人员切换优惠类型
- **THEN** 优惠值输入框标签与占位符 SHALL 随类型切换为“减免金额 (元)”或“折扣比例 (折)”

#### Scenario: 非法规则内联拒绝
- @e2e
- **GIVEN** 运营人员填写类型 FLAT、减免金额 ¥120、使用门槛 ¥100
- **WHEN** 运营人员点击「创建并生效」
- **THEN** 页面显示内联错误“减免金额不能大于或等于使用门槛”
- **AND** 不调用创建接口，券列表无新增

### Requirement: 单人发放交互与反馈
系统 SHALL 在发放章节提供：券选择（从列表「发券」按钮联动并自动滚动定位）、目标用户 ID 输入（格式 `user_<数字>`）、发放结果反馈。发放成功 SHALL 展示成功提示并即时回流最近发放记录；重复发放 SHALL 展示拒绝原因。
- **Priority**: P0
- **Rationale**: 与确认后的原型交互完全对齐，让运营对“发给了谁、成功与否”有明确感知。

#### Scenario: 列表发券按钮联动发放表单
- @e2e
- **GIVEN** 券列表存在 ACTIVE 状态的券
- **WHEN** 运营人员在某张券上点击「发券」
- **THEN** 页面自动滚动至手动发券章节
- **AND** 该券信息显示为当前待发放券，用户 ID 输入框聚焦可用

#### Scenario: 发放成功反馈与记录回流
- @e2e
- **GIVEN** 运营人员已选择「新客专享满减券」并输入用户 ID `user_1003`
- **WHEN** 运营人员点击「确认发放」
- **THEN** 页面展示成功提示“已发放给用户 user_1003”
- **AND** 最近发放记录顶部新增对应记录，券列表已发放数量 +1

#### Scenario: 重复发放被拒绝并提示原因
- @e2e
- **GIVEN** 用户 `user_1003` 已持有「新客专享满减券」（UNUSED）
- **WHEN** 运营人员再次对 `user_1003` 发放同一张券
- **THEN** 页面展示拒绝提示“该用户已持有此券，请勿重复发放”
- **AND** 发放记录与已发放数量均不变化

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
- @unit
- **GIVEN** 买家打开任意页面
- **THEN** 页面 `<html lang>` 属性为 `zh-CN`
- **AND** 浏览器标签页标题为中文

#### Scenario: 品牌与类型代码豁免保留
- @e2e
- **GIVEN** 首页顶部展示品牌标识、优惠券表单展示类型代码标注
- **THEN** 品牌名 `Minimal Store` 与括号标注（如「满减券 (FLAT)」「折扣券 (PERCENTAGE)」）可保留英文，不视为违规

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

### Requirement: 商品管理页语言约束
系统 SHALL 保证 B 端商品管理界面所有用户可见文案为中文，仅允许领域枚举值（如 `active`/`deleted` 状态代码，或括号标注类型）保留原文。
- **Priority**: P0
- **Rationale**: 与全站中文 UI 约束一致（`docs/FRONTEND.md` 第 4 节、`openspec/config.yaml` prototype 规则）。

#### Scenario: 商品状态列中文化
- @e2e
- **GIVEN** 运营人员进入「交易管理 / 商品管理」后台视图
- **THEN** 商品列表状态列 SHALL 将 `active`/`deleted` 映射为「上架中」/「已下架」

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

### Requirement: 商品编辑分类下拉
系统 SHALL 在商品编辑表单提供「分类」下拉选择：选项为全部 active 分类 + 「未分类」；保存后商品分类即时更新。
- **Priority**: P1
- **Rationale**: 分类挂载是分类管理闭环的关键动作。

#### Scenario: 商品表单分类下拉
- @e2e
- **GIVEN** 运营人员编辑商品「极简机械键盘」
- **WHEN** 在「分类」下拉选择「键鼠外设」并保存
- **THEN** 商品列表该商品分类显示「键鼠外设」
- **AND** 分类管理页「键鼠外设」商品数 +1

### Requirement: C 端分类筛选条
系统 SHALL 在 C 端首页商品区顶部提供分类筛选条：包含「全部」与全部 active 分类，点击按分类过滤商品；当前选中分类以高亮呈现。
- **Priority**: P0
- **Rationale**: 买家按品类浏览是核心发现路径，与确认后的 `prototype.html` 对齐。

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

### Requirement: B 端库存预警视图

系统 SHALL 在 B 端运营后台提供「库存预警」视图（复用既有运营后台单屏布局：左侧导航 + 右侧内容区；导航项归入「经营分析」分组、与「销售看板」并列），包含：**预警列表**（8 列：商品名/当前库存/预警阈值（覆盖值标「覆盖」、全局值标「全局」）/近7日日均销量/预计售罄天数/超卖风险标识/建议补货量/状态）+「预警中 / 健康水位」**Tabs** 切换 + 已售罄/超卖风险 **Badge** + 排序口径脚注（「排序：已售罄置顶 · 其余按预计售罄天数升序（最紧迫在前）」）。所有视觉遵循 ZAPP 语义令牌（`--warning` `#FF9A00` 低库存警示、`bg-accent` 已售罄、`bg-success` 库存充足、`font-mono` 数字/标签、`bg-background` 地面、`bg-card`/`border-border` 面板、无圆角无阴影、真实中文数据）。

- **Priority**: P0
- **Rationale**: 「可视即价值」——运营进入即见低库存清单与紧迫度排序，兑现 Phase 5「售罄前主动预警」（与确认原型完全对齐）。

#### Scenario: 运营进入库存预警视图渲染预警列表
- @e2e
- **GIVEN** 运营已登录 B 端后台且存在预警商品数据
- **WHEN** 运营点击「经营分析 / 库存预警」导航项
- **THEN** 导航项「库存预警」以左侧 3px 实线 + `bg-primary` 高亮（与「销售看板」并列）
- **AND** 预警列表展示 8 列（商品名/当前库存/预警阈值/近7日日均销量/预计售罄天数/超卖风险标识/建议补货量/状态）
- **AND** 预警阈值列对覆盖值标注「覆盖」（`--warning`）、对全局值标注「全局」
- **AND** 表格底部展示排序脚注「排序：已售罄置顶 · 其余按预计售罄天数升序（最紧迫在前）」
- **AND** 页面任意元素无圆角/阴影，边框为 1px `border-border`，地面 `bg-background`、面板 `bg-card`

#### Scenario: 预警中/健康水位 Tabs 切换
- @e2e
- **GIVEN** 运营位于库存预警视图且存在预警商品与健康水位商品
- **WHEN** 运营点击「健康水位」Tab
- **THEN** 列表切换为健康水位商品（如桌面拾音氛围灯 stock=40，不入列预警）
- **AND** 点击「预警中」Tab 恢复预警列表，Tab 计数与列表项数一致

#### Scenario: 已售罄与超卖风险 Badge 渲染
- @e2e
- **GIVEN** 预警列表存在已售罄商品与超卖风险商品
- **THEN** 已售罄商品（stock=0）行展示 accent「已售罄」Badge 且置顶
- **AND** 超卖风险商品行展示 `--warning` 琥珀「超卖风险」Badge 与「低库存」状态
- **AND** 无风险预警商品展示普通「低库存」状态（1px `border-border` 标签）

#### Scenario: 空状态反馈中文化
- @unit
- **GIVEN** 预警列表当前 Tab 无数据
- **THEN** 空状态展示中文「当前无预警商品 · 全部商品处于健康水位」（或「当前无健康水位商品 · 全部商品已入列预警」）
- **AND** 不出现任何英文占位文案

### Requirement: 库存预警入口角色可见性

系统 SHALL 按当前会话真实角色决定「库存预警」导航入口可见性（对齐 R-DASH-006 看板角色门禁）：仅 `role=运营 / 老板` 会话下「经营分析」分组显示「库存预警」入口；`role=客户 / 客服` 或未登录会话 SHALL NOT 显示该入口。

- **Priority**: P0
- **Rationale**: 库存数据属经营敏感信息，入口可见性由真实角色驱动（与「销售看板」同一门禁语义）。

#### Scenario: 运营与老板可见库存预警入口
- @e2e
- **GIVEN** 运营（或老板）角色会话已登录 B 端后台
- **WHEN** 查看左侧导航「经营分析」分组
- **THEN** 分组下同时显示「销售看板」与「库存预警」入口
- **AND** 点击「库存预警」可进入预警视图

#### Scenario: 客户与客服不可见库存预警入口
- @e2e
- **GIVEN** 客服（或客户）角色会话已进入 B 端后台
- **WHEN** 查看左侧导航「经营分析」分组
- **THEN** 分组下不显示「库存预警」入口（仅「销售看板」可见性按既有规则）

### Requirement: 阈值配置区交互（运营写 / 老板只读）

系统 SHALL 按角色渲染阈值配置区（对齐原型）：

- **运营**：顶部「全局默认阈值」输入 +「保存配置」按钮；保存成功后展示「✓ 已保存 · 阈值已即时生效」（`text-success`，3 秒后消失）；预警列表行内对覆盖阈值商品展示**商品级覆盖阈值编辑框**（`aria-label=商品级覆盖阈值`），修改后保存即时生效并刷新列表；配置区标注「仅运营可配置 · 即时生效」。
- **老板**：无配置区；标题旁展示「纯只读 · 无配置入口」标识（`font-mono` 边框标签）；展示**全局库存健康度总览卡片**框架（预警商品数 / 已售罄数 / 超卖风险数，`--primary`/`--accent`/`--warning` 数值色）。
- 所有输入 `type=number min=0`；非法输入（负数）由校验拦截。

- **Priority**: P0
- **Rationale**: 配置写入口仅运营可见 = 前端侧最小权限表达；保存反馈让运营确认「即时生效」（story.md 旅程 1 场景 2 验收）。

#### Scenario: 运营保存全局阈值显示即时生效反馈
- @e2e
- **GIVEN** 运营位于库存预警视图，全局默认阈值输入框当前为 10
- **WHEN** 运营将全局默认阈值改为 20 并点击「保存配置」
- **THEN** 页面展示「✓ 已保存 · 阈值已即时生效」
- **AND** 预警列表按新阈值 20 即时刷新（无刷新页面操作）

#### Scenario: 运营行内编辑商品级覆盖阈值
- @e2e
- **GIVEN** 预警列表存在商品「无线办公鼠标」（全局阈值 10 入列）
- **WHEN** 运营在行内覆盖阈值输入框（`aria-label=商品级覆盖阈值`）填入 5 并保存
- **THEN** 列表立即刷新：无线办公鼠标（8 > 5）移出预警列表
- **AND** 该行阈值标注变为「覆盖」（5）

#### Scenario: 老板视图无配置入口且展示只读标识
- @e2e
- **GIVEN** 老板角色会话已登录并进入库存预警视图
- **THEN** 页面 SHALL NOT 渲染「保存配置」按钮与任何阈值输入框
- **AND** 标题旁展示「纯只读 · 无配置入口」标识
- **AND** 展示全局库存健康度总览卡片（预警商品数 / 已售罄数 / 超卖风险数）

### Requirement: 补货建议列渲染（R-STOCK-106 口径铁律）

系统 SHALL 将库存预警视图「建议补货量」列由「—」占位替换为**真实计算值渲染**（数据来自 `GET /api/admin/dashboard/stock` 的 `replenish` 字段，前端不做 mock 计算）：

- `replenish > 0` → 显示 `{{ replenish }} 件`（`text-primary` 主色）。
- `replenish = 0` → 展示「无需补货」（`text-muted-foreground`）——**口径铁律（R-STOCK-106）**：无超卖风险 ⇔ 补货量公式结果为 0 ⇔ 展示「无需补货」，不以演示区分度为优先。
- `stock = 0`（已售罄）→ 显示 `{{ replenish }} 件`（`text-accent` accent 色，已售罄仍按公式给出建议量）。
- 表格顶部口径说明 SHALL 更新为真实公式：「超卖风险 = 预计售罄天数 &lt; 7 天 · 建议补货量 = max(0, ⌈日均销量×7⌉ − 当前库存)」（移除「建议补货量待『补货建议』Story 补齐（P1）」占位文案）。
- 表格底部脚注保留：「到货周期固定 7 天（MVP）· 无销量商品不计算售罄天数」。

- **Priority**: P1
- **Rationale**: 「可视即价值」——运营从"拍脑袋补货"转向"销量速度驱动"（story.md 关键目标）；R-STOCK-106 铁律要求公式结果为 0 时展示「无需补货」而非数字 0（原型裁决，原型 `stock-insight.html` 建议补货量列三种渲染分支）。

#### Scenario: 建议补货量列三种渲染分支（R-STOCK-106）
- @e2e
- **GIVEN** 运营位于库存预警视图且存在预警商品数据：键盘(replenish=6)、显示器(replenish=0)、收纳架(stock=0, replenish=28)
- **WHEN** 运营查看「建议补货量」列
- **THEN** 极简机械键盘行显示「6 件」（`text-primary`）
- **AND** 高清显示器行显示「无需补货」（`text-muted-foreground`，公式结果为 0，R-STOCK-106 铁律）
- **AND** 桌面收纳架（已售罄）行显示「28 件」（`text-accent`）
- **AND** 标题旁口径说明展示「建议补货量 = max(0, ⌈日均销量×7⌉ − 当前库存)」，脚注保留「到货周期固定 7 天（MVP）」

### Requirement: 近7日日均销量与预计售罄天数单元格渲染

系统 SHALL 明确「近7日日均销量」与「预计售罄天数」两列的单元格渲染行为（对齐原型，数据来自 API `dailyAvg`/`daysToSellout` 字段，Story 1 已渲染列头与基础值，本 Requirement 固化单元格语义）：

- **近7日日均销量列**：有销量（`dailyAvg > 0`）→ 主值 `{{ dailyAvg }} 件/日`（`font-mono font-bold`，1 位小数）+ 小字「近7日 {{ sales7d }} 件」（`text-muted-foreground`）；无销量（`dailyAvg = 0`）→ 展示「暂无销量」（`text-muted-foreground`）。
- **预计售罄天数列**：有销量 → `{{ daysToSellout }} 天`（`font-mono font-bold`；已售罄 `stock=0` → `text-accent`；超卖风险 → `text-warning`；其余 `text-foreground`）；无销量 → 「—」（`text-muted-foreground`）。
- **无销量语义（R-STOCK-105）**：无销量商品不计算售罄天数与超卖风险（天数列「—」、无「超卖风险」Badge），但 `stock ≤ 阈值` 仍按水位入列预警。

- **Priority**: P1
- **Rationale**: 数值链（日均销量 → 售罄天数 → 补货量）是补货决策的可读性基础；无销量「暂无销量 / —」口径与 story.md 原型一致。

#### Scenario: 日均销量与售罄天数单元格渲染（含无销量）
- @e2e
- **GIVEN** 运营位于库存预警视图，存在有销量商品（键盘 dailyAvg=1.2、售罄 2.5 天）与无销量商品（stock=5 无订单）
- **WHEN** 运营查看「近7日日均销量」与「预计售罄天数」列
- **THEN** 极简机械键盘行显示「1.2 件/日」+ 小字「近7日 8 件」，售罄天数列显示「2.5 天」
- **AND** 无销量商品行日均销量列显示「暂无销量」、售罄天数列显示「—」、无「超卖风险」Badge
- **AND** 无销量商品仍按 `stock ≤ 阈值` 位于预警列表（R-STOCK-105 仍按水位入列）

### Requirement: 老板全局库存健康度总览（API 数据渲染）

系统 SHALL 将老板视图「全局库存健康度总览」卡片由**前端 computed 统计框架**升级为**消费 API `healthOverview` 字段的完整渲染**（数据来源 `GET /api/admin/dashboard/stock`，后端权威口径、前端只读渲染）：

- **3 卡片**：预警商品数（`warningCount`，`text-primary`）/ 已售罄数（`soldOutCount`，`text-accent`）/ 超卖风险数（`riskCount`，`text-warning`），卡片副文案保留（「库存 ≤ 阈值 已入列监控」/「库存为 0 · 最需关注」/「售罄天数不足 7 天到货周期」）。
- 卡片区头部保留「全局库存健康度总览 · 只读」标题与「到货周期 7 天 · 数据来自近7日销量」说明。
- 仅 `role=老板` 视图渲染（运营视图不展示该卡片区，展示阈值配置区）。
- 老板视图 SHALL NOT 渲染任何阈值配置入口（复用既有约束）。

- **Priority**: P1
- **Rationale**: 老板一眼看到库存健康度（断货与压资金双向权衡）——story.md 关键目标；healthOverview 由后端聚合保证口径与预警列表同源一致（前端只读渲染，杜绝前后端统计漂移）。

#### Scenario: 老板健康度总览卡片数值与 API 一致
- @e2e
- **GIVEN** 老板角色会话已登录并进入库存预警视图（预警 4 项：含已售罄 1 项、超卖风险 2 项）
- **WHEN** 老板查看「全局库存健康度总览」
- **THEN** 预警商品数卡片显示 4（与 API `healthOverview.warningCount` 一致）
- **AND** 已售罄数卡片显示 1（`healthOverview.soldOutCount`）、超卖风险数卡片显示 2（`healthOverview.riskCount`）
- **AND** 页面无阈值配置入口（「纯只读 · 无配置入口」标识 + 无「保存配置」按钮与阈值输入框）

## Governance Mapping

- **Bounded Context**: Shared / Cross（`domain_model.html` 映射表：`bc-shared → cap-ui`，Cross-Context）
- **Capability Taxonomy**: `frontend-ui`（复用既有横切支撑映射，无新增 taxonomy）
- **Process Alignment**: `L1-01` 触达与发现（首页/搜索空状态/分类浏览）；`L1-03` 加购与准备（购物车交互）；`L1-04` 下单结算 / `L2-02` 加载结算上下文（发放结果被 C 端消费）；`L1-06` 履约与完成（C 端订单状态可见）；`L1-07` 经营分析（只读支流：库存预警视图 + 阈值配置表单交互 + 补货建议列与老板健康度总览渲染）；`L2-03` 选择优惠方案（结算按钮与成功反馈）；`L3-01` 识别候选券（发放动作建立候选集）
- **Service Blueprint**: `SB-STAGE-01/02/03/06` 与 `SB-CUSTOMER-01/02/03/06`（C 端界面语言与交互）、`SB-OPS-03`（运营配置与发券交互界面）、`SB-BACKSTAGE-03`（后台接口消费）、`SB-OPS-01/02/04`（B 端商品/分类管理界面）、`SB-BACKSTAGE-01/04/06`（商品/订单/分类接口消费）、`SB-OPS-05`（B 端库存预警界面：预警列表 + 补货建议列 + 老板健康度卡片，与「销售看板」并列）、`SB-BACKSTAGE-06`（库存数据聚合与补货建议后台活动消费）
- **实现版本**: Frontend（C 端店铺 + 我的订单 + B 端运营后台视图）
