Feature: 回款与应收账款闭环（story-ar-credit-customer）
    提取自 specs/accounts-receivable/spec.md @e2e 场景与 story-ar-credit-customer.md E2E 验收旅程，
    Node 后端 (3000) 契约验证（Phase 7 Story 1：账期客户与应收生成）：
    账期客户（creditDays>0）订单免现结 → 发货 SHIPPED 自动生成应收
    （金额=actualPaidCents、到期日=发货日+账期、未回款）→ 现结客户回归 → 账期配置仅运营。
    口径（R-AR-001~005 + 决策 Q1=A / Q2=B）：应收金额 priceCents；到期日=发货日+creditDays；
    服务端判定不信任客户端；C 端零改动。

  @e2e
  Scenario: 账期客户订单发货后自动生成应收
    Given 客户 账期客户甲 被运营配置为账期客户（creditDays=45）
    And 账期客户甲 提交一笔订单（免现结，无需模拟支付）
    When 运营对该订单执行发货
    Then 自动生成应收（金额=订单实付、已回=0、到期日=发货日+45 天、状态=未回款）
    And 运营查看该客户用户详情可见账期 45 天

  @api
  Scenario: 现结客户发货不生成应收（回归）
    Given 现结客户（creditDays=0）提交订单并模拟支付
    When 运营对该订单执行发货
    Then 不生成应收（现结先付后货语义不变）

  @api
  Scenario: 账期配置权限（仅运营）
    Given 存在某客户（未配置账期）
    When 运营修改该客户 creditDays=30 且 老板与客服也尝试修改
    Then 运营成功；老板与客服返回 403

  @e2e
  Scenario: 回款登记（部分 + 结清 + 逾期过滤）
    Given 存在账期客户应收单（应收 ¥356.00、未回款）与一笔已逾期应收
    When 运营登记部分回款（一半剩余金额）
    Then 该应收单已回增加、剩余递减、状态为部分回款
    When 运营再次登记回款结清剩余
    Then 该应收单剩余 0、状态已结清且不可再登记
    And 逾期应收单在「仅逾期」过滤中展示「已逾期」

  @api
  Scenario: 回款金额校验与权限门禁
    Given 存在账期客户应收单（剩余 ¥100.00）
    When 运营登记超剩余金额或零金额
    Then 返回校验错误，应收与已回不变
    And 客服与老板调用回款登记返回 403

  @e2e
  Scenario: 老板应收看板（指标与登记同源）
    Given 存在多笔账期应收（含部分已回与逾期）
    When 老板访问应收看板聚合
    Then 指标卡（应收总额、已回款、未回余额、逾期金额）与应收单逐笔汇总一致
    And 客户欠款集中度列出各客户应收单数、未回余额、账期

  @api
  Scenario: 回款登记后看板联动 + 看板权限
    Given 运营登记一笔部分回款
    Given 老板再次访问应收看板聚合
    Then 已回款与未回余额即时反映登记（无漂移）
    And 客服访问应收看板聚合返回 403、未登录返回 403

