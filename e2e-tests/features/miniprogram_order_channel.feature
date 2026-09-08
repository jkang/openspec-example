Feature: 订单渠道标识 channel（story-miniprogram-order-channel）
    提取自 specs/order-management/spec.md @e2e/@api 场景与 story.md E2E 验收旅程（旅程 1/2/3），
    Node 后端 (3000) 全链路验证：
    MINIPROGRAM 会话下单自动带渠道标识（channel=MINIPROGRAM，服务端按会话来源判定）→
    WEB 会话下单默认渠道（channel=WEB）→ 客户端伪造 channel 传参不被信任（Q7）→
    B 端运营订单列表渠道标识展示 → 小程序订单发货与网页单一致。
    口径（R-ORDCH-001~005 + Q7）：channel 创建时写入不可变；会话来源继承（wechat-auth
    登录会话 → MINIPROGRAM；网页 → WEB）；防客户端伪造；存量订单缺省 WEB；仅展示不做筛选。

  @e2e
  Scenario: MINIPROGRAM 会话下单带渠道标识（Q7 会话来源继承）
    Given 小程序渠道已启用（order-channel）
    And 买家王倩经微信授权登录（bind 建号，会话 MINIPROGRAM）
    When 王倩加购无线办公鼠标并提交订单
    Then 订单创建成功且 channel=MINIPROGRAM（服务端按会话来源判定）

  @e2e
  Scenario: WEB 会话下单默认渠道
    Given 买家林晓明网页注册并登录（会话 WEB）
    When 林晓明加购极简机械键盘并提交订单
    Then 订单创建成功且 channel=WEB（默认值）

  @api
  Scenario: 客户端伪造渠道传参不被信任（Q7 防伪造）
    Given 买家林晓明网页注册并登录（会话 WEB）
    When 林晓明加购并提交订单（请求体恶意携带 channel=MINIPROGRAM）
    Then 订单创建成功且 channel 仍为 WEB（服务端判定，忽略客户端传参）

  @e2e
  Scenario: B 端订单列表渠道标识展示
    Given 小程序渠道已启用（order-channel）
    And 买家王倩经微信授权登录（bind 建号，会话 MINIPROGRAM）并已下单（channel=MINIPROGRAM）
    And 买家林晓明网页注册并登录并已下单（channel=WEB）
    And 运营陈晓芸已登录 B 端订单管理
    When 运营查看订单列表
    Then 列表展示渠道标识：小程序单「小程序」与 网页单「网页」（渠道不影响金额与状态）

  @e2e
  Scenario: 小程序订单发货与网页单一致（R-ORDCH-004）
    Given 小程序渠道已启用（order-channel）
    And 买家王倩经微信授权登录（bind 建号，会话 MINIPROGRAM）并已下单（channel=MINIPROGRAM）
    And 王倩已支付该订单（PAID）
    And 运营陈晓芸已登录 B 端订单管理
    When 运营对该小程序订单执行发货
    Then 订单状态流转为 SHIPPED 且 channel 保持 MINIPROGRAM（同一状态机，不因渠道分流）
