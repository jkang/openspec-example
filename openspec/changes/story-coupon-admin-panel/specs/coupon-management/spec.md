## MODIFIED Requirements

### Requirement: 最优券自动推荐
结算引擎 SHALL 从**全场通用券与用户已持有的未使用券**所构成的候选集合中，自动推荐减免金额最高的一张券。发放给指定用户的券仅对该用户可见。
- **Priority**: P0
- **Rationale**: 发放行为建立券与用户的持有关系后，推荐输入集必须按用户归属过滤，避免错推他人之券。

#### Scenario: 自动推荐减免额最高的券
- @e2e
- **GIVEN** 用户购物车总额为 ¥1000.00 (100000分)
- **AND** 用户持有一张已发放的“满 100 减 50” (FLAT, 5000分) 券和一张已发放的“9折” (PERCENTAGE, 9) 券
- **WHEN** 系统执行最优券推荐逻辑
- **THEN** 系统计算满减券减免 5000 分，折扣券减免 10000 分
- **THEN** 系统 SHALL 自动推荐并选中“9折”券
- **AND** 提示“已自动选择最优方案” (基于 prototype.html 交互)

#### Scenario: 他人持有的券不进入推荐候选集
- @api
- **GIVEN** 用户 user_A 被发放了「老客回馈券」（UNUSED），而用户 user_B 未持有该券
- **WHEN** 用户 user_B 进入结算并触发最优券推荐
- **THEN** 「老客回馈券」SHALL NOT 出现在 user_B 的可用券集合中

## ADDED Requirements

### Requirement: 券规则创建（运营后台）
系统 SHALL 支持运营人员通过后台创建优惠券规则，字段包括：名称、类型（FLAT / PERCENTAGE）、优惠值、使用门槛（minSpendCents，0 表示无门槛）与有效期。创建的规则状态 SHALL 立即为 ACTIVE，可被发放并参与全场最优推荐。
- **Priority**: P0
- **Rationale**: 打通“运营配置 → 发放 → 结算核销”闭环，规则创建即生效，不引入草稿态。

#### Scenario: 创建折扣券成功生效
- @api
- **GIVEN** 运营人员填写：名称“中秋特惠 8.5 折券”、类型 PERCENTAGE、折扣 8.5、门槛 ¥300、有效期 2026-10-15
- **WHEN** 运营人员提交创建请求
- **THEN** 系统创建该规则并返回状态为 ACTIVE 的券
- **AND** 该券出现在后台券列表中，已发放数量为 0

#### Scenario: 满减金额超过门槛被拒绝
- @api
- **GIVEN** 运营人员填写：类型 FLAT、减免金额 ¥120、使用门槛 ¥100
- **WHEN** 运营人员提交创建请求
- **THEN** 系统拒绝创建并返回错误 `COUPON_VALUE_EXCEEDS_THRESHOLD`
- **AND** 券列表不新增任何记录

#### Scenario: 折扣比例非法被拒绝
- @api
- **GIVEN** 运营人员填写：类型 PERCENTAGE、折扣值 10（表示 10 折）
- **WHEN** 运营人员提交创建请求
- **THEN** 系统拒绝创建并返回错误 `INVALID_DISCOUNT_RATE`
- **AND** 券列表不新增任何记录

### Requirement: 手动单人发放
系统 SHALL 支持运营人员将一张 ACTIVE 的券手动发放给单个用户（userId），每次仅限一个用户。发放成功生成一张绑定该用户的 `UNUSED` 券实例；同一用户对同一券重复发放时 SHALL 被拒绝。
- **Priority**: P0
- **Rationale**: 发放是建立“用户持有关系”的唯一途径，是结算时识别候选券（L3-01）的输入来源。

#### Scenario: 发放成功生成用户持有券
- @api
- **GIVEN** 券「新客专享满减券」状态为 ACTIVE
- **WHEN** 运营人员将「新客专享满减券」发放给 userId `user_1003`
- **THEN** 系统生成一张绑定 `user_1003`、状态为 `UNUSED` 的券实例
- **AND** 该券的已发放数量增加 1

#### Scenario: 重复发放被拒绝
- @api
- **GIVEN** 用户 `user_1003` 已持有「新客专享满减券」（UNUSED）
- **WHEN** 运营人员再次对 `user_1003` 发放同一张券
- **THEN** 系统拒绝发放并返回错误 `COUPON_ALREADY_ISSUED`
- **AND** 已发放数量与发放记录均不变化

#### Scenario: 用户 ID 格式非法被拒绝
- @api
- **WHEN** 运营人员向 userId `unknown123` 发放券
- **THEN** 系统拒绝发放并返回错误 `INVALID_USER_ID`

### Requirement: 发放记录沉淀
系统 SHALL 在每次发放成功时沉淀一条发放记录（时间、券、目标用户、操作人），供后台最近发放列表回读。
- **Priority**: P1
- **Rationale**: 发放动作需可追溯，作为运营审计的轻量依据。

#### Scenario: 发放记录回流
- @e2e
- **GIVEN** 运营人员对 `user_1003` 成功发放「新客专享满减券」
- **WHEN** 运营人员查看最近发放记录
- **THEN** 记录列表顶部 SHALL 出现一条新记录：发放时间、券名称、用户 ID 与操作人

## Governance Mapping

- **Bounded Context**: Coupon Context（`domain_model.html` BC → Capability 映射表：`bc-coupon → cap-coupon`）
- **Capability Taxonomy**: `coupon-management`（复用既有映射，无新增 taxonomy）
- **Process Alignment**: `L3-01` 识别候选券（发放归属决定候选集）；`L2-02` 加载结算上下文
- **Service Blueprint**: `SB-STAGE-03`（结算确认消费券）、`SB-OPS-03`（运营配置与发放活动）、`SB-BACKSTAGE-03`（券规则持久化与发放接口）
- **实现版本**: Node.js / Python（后端 API）＋ Frontend（后台页面）
