Feature: Ecommerce Smoke Test
  冒烟级全链路保障：
  1) 基础设施可达（店铺加载 + 商品列表可见）；
  2) 交易主链路一体化闭环——注册新账户自动登录 → 选购加购两件商品 → 结算侧边栏自动推荐最优优惠券并计算最终总额 → 确认结算生成待支付订单 → 模拟支付 → 我的订单可见已支付订单。
  运行于 ./init.sh e2e:run（NODE_ENV=test 内存模式 + reset 后门隔离）。

  @e2e
  Scenario: Basic storefront load
    Given I open the storefront
    Then I should see the product list

  @e2e
  Scenario: 交易主链路一体化——从注册到支付成功的完整闭环
    Given 买家打开店铺首页且当前无账户
    When 用户点击"注册 / 登录"进入注册页
    And 在注册页输入手机号 13788820001、昵称 冒烟测试买家、密码 123456
    And 用户点击"注册并登录"
    Then 页面显示"注册成功，已自动登录"横幅
    And 顶部导航显示用户昵称"冒烟测试买家"
    When 用户返回店铺首页
    And 用户将第一个商品加入购物车
    And 用户将第 2 件商品加入购物车
    Then 购物车角标数量应变为 2
    And 结算侧边栏应自动推荐"9 折数码券"为最优方案
    And 优惠减免金额应为 "-¥38.80"
    And 最终总额应为 "¥349.20"
    When 用户点击"确认结算"
    Then 成功模态框应显示订单状态"待支付"
    And 模态框中应有"模拟支付"按钮
    When 用户点击"模拟支付"
    Then 模态框应显示"已支付成功，库存已扣减"
    When 用户点击"继续购物"
    And 用户点击"我的订单"
    Then 我的订单列表应包含该订单且状态为"已支付"
