Feature: 微信授权登录与同源账户打通（story-miniprogram-wechat-login）
    提取自 specs/wechat-auth/spec.md @e2e 场景与 story.md E2E 验收旅程（旅程 1/2/3/4），
    Node 后端 (3000) 全链路 API 验证（mock 微信网关 Q6，无真实小程序 UI 可点，以 API 断言为主）：
    老客户 openid 命中直连（历史订单延续，同源账户）→ 新客户微信快捷绑定建号 →
    撞号提示登录既有账号再绑定（Q2）→ 渠道停用拒绝（CHANNEL_DISABLED，Q5）→ 禁用用户拒绝。
    口径（R-WX-001~011 + Q1/Q2/Q5/Q6/Q7）：openid 存 User（一对一）；绑定手机号未注册建号 /
    撞号 PHONE_EXISTS_NEED_LOGIN（不合并）；会话 channel=MINIPROGRAM（Q7）；停用拒绝新登录；
    mock 网关固定映射（code_demo_* → openid_demo_*，phone_demo_* → 手机号）。

  @e2e
  Scenario: 老客户微信一键登录（openid 命中直连，历史订单延续）
    Given 小程序渠道已启用（api）
    And 老客户林晓明（13888217536）网页注册且 openid_demo_001 已绑定（user 会话 bind-openid）
    When 提交微信登录 code=code_demo_001
    Then 返回 201 且登录用户为林晓明（同源账户直连，历史订单归属不变）
    And 会话来源渠道为 MINIPROGRAM

  @e2e
  Scenario: 新客户微信快捷绑定建号并登录
    Given 小程序渠道已启用（api）
    When 提交微信绑定（code=code_demo_002 与 手机号组件 phone_demo_001）
    Then 返回 201 且创建新用户（手机号 13700005678 与 openid_demo_002，role=客户）
    And 会话来源渠道为 MINIPROGRAM

  @e2e
  Scenario: 撞号——提示登录既有账号再绑定（Q2，不合并）
    Given 小程序渠道已启用（api）
    And 林晓明（13888217536）网页已注册
    When 新微信用户提交绑定（code=code_demo_003 与 手机号组件 phone_demo_002）
    Then 返回 409 PHONE_EXISTS_NEED_LOGIN（提示登录既有账号再绑定，不自动合并）
    And 系统用户总数不增加（无重复账户）

  @e2e
  Scenario: 撞号完成绑定——既有账号登录后 bind-openid
    Given 小程序渠道已启用（api）
    And 林晓明（13888217536）网页已注册并登录
    When 林晓明以既有账号会话提交 bind-openid（openid=openid_demo_003）
    Then 返回 200，openid_demo_003 写入 user_1002（微信绑定完成）
    And 该用户仍只有一个账户记录（历史订单未丢失）

  @e2e
  Scenario: 渠道停用拒绝新微信登录（Q5）
    Given 小程序渠道未配置（默认停用，R-CHN-009）
    When 提交微信登录 code=code_demo_001
    Then 返回 403 CHANNEL_DISABLED（不进入登录或绑定流程）

  @e2e
  Scenario: 禁用用户微信登录被拒绝（R-WX-010）
    Given 小程序渠道已启用（api）
    And 老客户林晓明（13888217536）网页注册且 openid_demo_001 已绑定（user 会话 bind-openid）
    And 林晓明（13888217536）已被 B 端禁用（user-status 后门）
    When 提交微信登录 code=code_demo_001
    Then 返回 403 USER_DISABLED（禁用即失效，对齐 R-SES-006）
