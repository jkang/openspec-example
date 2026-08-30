Feature: B 端销售总览看板（story-sales-dashboard-overview）
  提取自 specs/sales-dashboard/spec.md 中标记 @e2e 的场景与 story.md E2E 验收旅程，
  通过 Vue 前端 (5173) + Node 后端 (3000) 全链路验证：销售总览指标与订单明细一致 →
  时间切换联动刷新 → 客服访问被拒（403 无数据）。
  数据口径（R-DASH-001~005）：销售额 = SUM(actualPaidCents)，仅 status ∈ {PAID, SHIPPED, COMPLETED}
  且 paidAt ∈ [from, to)；CANCELLED / PENDING_PAYMENT 不计入；优惠让利 = SUM(discountCents) 单列。

  @e2e
  Scenario: 近7日销售总览指标与订单一致
    Given 系统存在混合销售订单数据（已支付、待支付与已取消）
    And 运营陈晓芸已登录销售看板（近7日）
    When 运营请求近7日销售总览
    Then 返回状态码 200 且销售额等于已支付订单实付之和
    And 优惠让利等于已支付订单让利之和且为独立字段
    And 客单价等于销售额除以订单量
    And 已取消与待支付订单不计入任何指标
    And 近7日趋势序列合计等于区间销售额总额

  @e2e
  Scenario: 切换今日维度刷新指标
    Given 运营陈晓芸已登录销售看板（近7日）
    And 系统存在今日已支付订单数据
    When 运营在销售看板切换到「今日」
    Then 趋势标题与日期标签按今日区间刷新
    And 今日销售额等于今日已支付订单实付之和

  @e2e
  Scenario: 客服角色访问看板被拒绝
    Given 客服小赵已登录（客服角色）
    When 客服请求销售看板接口
    Then 返回状态码 403 且响应不包含任何销售数据
