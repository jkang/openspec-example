Feature: B 端小程序渠道配置（story-miniprogram-channel-config）
    提取自 specs/miniprogram-channel/spec.md @e2e 场景与 story.md E2E 验收旅程（旅程 1/2/3），
    通过 Vue 前端 (5173) + Node 后端 (3000) 全链路验证：
    运营配置小程序渠道（AppID/AppSecret 脱敏回显/商户号纯预留/启用状态，保存即时生效）→
    老板只读渠道状态（无配置入口）→ 停用警示（新微信登录将被拒绝 CHANNEL_DISABLED）→
    客户/客服/未登录访问被拒（401/403）→ 未配置默认停用。
    口径（R-CHN-001~009 + Q3/Q4/Q5）：写权限仅运营（扩展 R-ADM）；appsecret 脱敏
    （前 4 + 掩码 + 后 4，不读回明文）；商户号纯配置预留（不校验不参与支付）；配置落盘
    data/channel-config.json 即时生效；停用拒绝新登录、既有会话照常；未配置默认停用。

  @e2e
  Scenario: 运营配置并启用小程序渠道（脱敏 + 即时生效）
    Given 运营陈晓芸已登录并进入小程序渠道页面
    When 运营填写渠道配置（appid=wx4a2b8c9d0e1f2345 与 appsecret 与 商户号=1900001234）并打开启用开关保存
    Then 页面展示「已保存并即时生效」与「已启用」徽标
    And AppSecret 显示为掩码（前 4 + 掩码 + 后 4），无明文泄露
    And 渠道配置接口返回 appsecretConfigured=true 且启用状态生效

  @e2e
  Scenario: 老板只读小程序渠道状态（无配置入口）
    Given 系统已配置小程序渠道（appid=wx4a2b8c9d0e1f2345，已启用）
    And 老板李老板（user_1003）已登录并进入小程序渠道页面
    Then 页面展示渠道启用状态与脱敏配置（无明文）
    And 页面标注「纯只读 · 无配置入口」且无 AppID 输入框、无 AppSecret 输入框、无保存按钮
    And 老板调用渠道配置写接口返回 403

  @e2e
  Scenario: 渠道停用后新登录被拒绝（Q5 契约 + 客户客服越权 403）
    Given 系统已配置小程序渠道（appid=wx4a2b8c9d0e1f2345，已启用）
    And 运营陈晓芸已登录并进入小程序渠道页面
    When 运营停用小程序渠道并保存
    Then 渠道配置接口返回 enabled=false（停用状态即时生效）
    And 客户访问渠道配置接口返回 403、未登录访问返回 403

  @e2e
  Scenario: 未配置默认停用（R-CHN-009）
    Given 系统重置后无任何渠道配置记录
    And 运营陈晓芸已登录并进入小程序渠道页面
    Then 渠道配置接口返回 enabled=false（默认停用，防止未配置即开放）
