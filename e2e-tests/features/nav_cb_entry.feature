Feature: C 端/B 端顶部导航作用域分离（fix-nav-cb-entry）
   提取自 openspec/changes/fix-nav-cb-entry/specs/frontend-ui/spec.md 中标记 @e2e 的场景：
   1) C 端店铺视图 header 仅承载顾客操作（搜索/购物车/我的订单/登录态昵称/退出登录）+ 独立「运营后台」入口按钮，
      不再使用「店铺 | 运营后台」分段切换控件；
   2) B 端运营后台视图 header 为独立运营作用域（分层面包屑 + 运营专员真实角色标签 + 「返回店铺」出口），
      不混排购物车/我的订单/退出登录等 C 端顾客操作；
   3) 顶部路径以「运营后台 / 当前模块」分层面包屑呈现；
   4) B 端「运营专员」标签显示会话运营用户的真实昵称。
   运行于 ./init.sh e2e:run（NODE_ENV=test 内存模式 + reset 后门隔离）。

  @e2e
  Scenario: C 端店铺视图 header 不混排运营后台顾客操作
    Given 买家登录并停留在 C 端店铺视图
    When 查看 C 端店铺顶部 header
    Then C 端 header 仅展示顾客操作（搜索/购物车/我的订单/登录态昵称/退出登录）
    And B 端入口为独立「运营后台」按钮
    And C 端 header 不存在「店铺 | 运营后台」分段切换控件

  @e2e
  Scenario: B 端运营后台视图 header 为独立作用域
    Given 运营陈晓芸已登录 B 端后台（运营角色）
    And 运营人员进入 B 端运营后台（admin）视图
    When 查看 B 端后台顶部 header
    Then B 端 header 展示「运营后台 / 当前模块」分层面包屑
    And B 端 header 提供「返回店铺」出口
    And B 端 header 不包含购物车/我的订单/退出登录等 C 端顾客操作

  @e2e
  Scenario: 顶部路径以分层面包屑呈现
    Given 运营陈晓芸已登录 B 端后台（运营角色）
    And 运营人员进入 B 端运营后台（admin）视图
    When 查看 B 端后台顶部路径
    Then 路径呈现为「运营后台 / 营销中心 / 优惠券管理」分层面包屑

  @e2e
  Scenario: B 端作用域角色标签表达
    Given 运营陈晓芸已登录 B 端后台（运营角色）
    And 运营人员进入 B 端运营后台（admin）视图
    When 查看 B 端后台「运营专员」标签
    Then 标签显示该运营用户真实昵称
