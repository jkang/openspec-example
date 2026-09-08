Feature: 小程序 C 端交易链路（story-miniprogram-shopping browse / checkout / orders）
    提取自 specs/frontend-ui/spec.md @e2e 场景与三 story.md E2E 验收旅程，
    验证降级层（决策 B：独立小程序原生工程，仓库无微信开发者工具可驱动小程序 UI）——
    以 Node 后端 (3000) 契约断言小程序工程将消费的全部 API 语义：
    【browse】微信登录会话 + 商品 API 同源（6 商品真实数据/搜索/分类/详情）+ 售罄不可加购 + 加购归属 →
    【checkout】购物车/最优券结算/下单 channel=MINIPROGRAM/模拟支付 →
    【orders】我的订单（会话归属 + 状态推进）。
    数据口径（R-MB-001~008 + R-MC-001~008 + R-MO-001~006）：同源数据、会话归属、
    channel 会话继承（Q7）、模拟支付、C 端不感知渠道概念。

  @e2e
  Scenario: [browse] 小程序商品 API 同源（6 商品真实数据 + 搜索 + 分类）
    Given 小程序渠道已启用且买家已微信登录（mock 会话）
    When 小程序调用商品列表接口（同源商品数据）
    Then 返回 6 件真实商品（极简机械键盘 ¥299.00 与 无线办公鼠标 ¥89.00 等，与 Web 一致）
    When 小程序按名称搜索「键盘」
    Then 列表仅返回名称含「键盘」的商品
    When 小程序按分类「显示设备」过滤
    Then 列表仅返回高清显示器

  @api
  Scenario: [browse] 售罄商品下单被拒
    Given 王倩微信会话已加购某商品
    And 该商品随后被后端置为售罄（库存为零）
    When 王倩提交订单
    Then 返回库存不足错误，订单未创建

  @e2e
  Scenario: [browse] 微信会话加购按会话归属
    Given 买家王倩经微信授权登录（mock 会话，channel=MINIPROGRAM）
    When 王倩对无线办公鼠标发起加购 ×2
    Then 购物车按王倩 userId 归属（与 Web 同库），数量为 2

  @e2e
  Scenario: [checkout] 最优券结算并下单 channel=MINIPROGRAM
    Given 王倩已登录且购物车含 无线办公鼠标×2（¥178.00）且存在可用优惠券
    When 王倩提交订单（复用结算与下单接口）
    Then 订单创建成功且应付金额含优惠（自动选择实际支付最低的最优券）
    And 订单 channel=MINIPROGRAM（服务端按会话来源判定，小程序未传渠道）

  @e2e
  Scenario: [checkout] 模拟支付成功（库存扣减）
    Given 王倩的小程序订单处于 PENDING_PAYMENT（channel=MINIPROGRAM）
    When 王倩对该订单发起模拟支付
    Then 订单状态变为 PAID 且库存已扣减

  @e2e
  Scenario: [orders] 我的订单会话归属 + 状态推进
    Given 王倩（微信登录会话）存在已支付订单
    When 王倩请求我的订单 API
    Then 列表返回该订单（金额与状态一致，Web 下单同库可见）
    When B 端运营对该订单执行发货
    Then 王倩再次请求我的订单 → 状态变为 SHIPPED（已发货）
