Feature: MVP 核心交易链路
  提取自 catalog-management / cart-management / checkout-management 规格中标记 @e2e 的场景，
  通过 Vue 前端 (5173) + Node 后端 (3000) 全链路验证。

  @e2e
  Scenario: 浏览商品列表（catalog-management）
    Given 用户打开店铺首页
    Then 应看到商品列表
    And 每个商品卡片应包含商品图片

  @e2e
  Scenario: 添加商品到购物车（cart-management）
    Given 用户打开店铺首页
    When 用户将第一个商品加入购物车
    Then 购物车角标数量应变为 1
    And 购物车侧边栏应显示该商品

  @e2e
  Scenario: 成功发起结算（checkout-management）
    Given 用户已将商品加入购物车
    When 用户点击"确认结算"
    Then 系统应展示包含订单号的成功模态框
    And 模态框中应有"继续购物"按钮

  @e2e
  Scenario: 使用优惠券结算（coupon-management）
    Given 用户打开店铺首页
    When 用户将第一个商品加入购物车
    Then 结算侧边栏应自动推荐"9 折数码券"为最优方案
    And 优惠减免金额应为 "-¥29.90"
    And 最终总额应为 "¥269.10"
    When 用户点击"确认结算"
    Then 系统应展示包含订单号的成功模态框

  @e2e
  Scenario: 运营后台创建并发放优惠券，发放记录回流（coupon-management）
    Given 用户进入运营后台
    When 运营人员创建一张折扣券规则"新客专享 8 折券"
    And 将该券发放给用户"user_1003"
    Then 应提示发放成功
    And 最近发放记录顶部应出现该条记录
