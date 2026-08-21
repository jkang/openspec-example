## Purpose
为 story-coupon-admin-panel 的 apply 提供可审计的本地验证证据，覆盖 Node/Python 双后端、Vue 前端与 E2E 闭环，防止 sync 之前仍存在编译失败或核心链路 bug。

## Scope
- 变更模块: ecommerce-mini (Node)、ecommerce-mini-python、ecommerce-mini-frontend
- 风险关键目标: 券规则创建校验、单人发放幂等（重复拒绝）、getBestCoupon 归属过滤、发放记录沉淀与持久化、B 端后台极简 UI。

## Hard Gates
- Schema validate: PASS (`openspec validate story-coupon-admin-panel` → valid)
- Node test (./init.sh node:test): PASS (23 passed, 0 failed)
- Python test (./init.sh python:test): PASS (12 passed)
- Frontend build (./init.sh vue:build): PASS (vite build success)
- 浏览器 E2E: PASS
  - B 端: 创建「中秋特惠 8.5 折券」(ACTIVE) → 列表生效 issuedCount=0 → 发放 user_1003 成功 → issuedCount=1 → 发放记录回流（2026-08-21 11:09 / user_1003 / 王琳 / UNUSED）→ 重复发放返回「该用户已持有此券，请勿重复发放」(409)
  - C 端: user_1003 (?user=user_1003) 结算页可见该券实例并标「最优方案」，选中后减免 -¥58.20、实付 ¥329.80；结算成功订单 #order_vpbyaeiw6 (couponId=CPN-003-1, discountCents=5820)，实例状态转为 USED
  - 归属隔离: user_1004 的 /api/coupons 不含该实例；ACTIVE 模板不在 C 端展示

## Soft Gates
- 极简 UI 自检: PASS — store/admin 两视图 DOM 全量扫描 borderRadius=0、boxShadow=none；slate 色系；1px 实线边框；全中文；列表/记录均为服务端真实数据

## Evidence Index
- 关联测试文件
  - ecommerce/ecommerce-mini/__tests__/unit.spec.js (新增「优惠券运营后台领域校验 (@unit)」6 例)
  - ecommerce/ecommerce-mini/__tests__/integration.spec.js (新增「优惠券运营后台 API (@api)」4 例)
  - ecommerce/ecommerce-mini-python/tests/test_admin_coupons.py (新增 @unit 3 例 + @api 4 例)
- 关键断言
  - INVALID_DISCOUNT_RATE (10 折/0 折拒绝)、COUPON_VALUE_EXCEEDS_THRESHOLD (满减 ≥ 门槛拒绝)
  - 发放: INVALID_USER_ID (unknown123)、COUPON_NOT_ACTIVE (种子券)、COUPON_ALREADY_ISSUED (409)
  - getBestCoupon 候选集 = 全场 UNUSED 通用券 + 本人 UNUSED 持有券；他人实例不可见、不推荐
  - issuedCount 按 templateId 聚合；发放记录最新在前
- 实施期修复（超出原计划但必要）
  - server.js 模块级仓储/种子对象跨 createServer 共享导致测试间状态污染 → 实例化移入 createServer() 并克隆种子对象
  - C 端 /api/coupons 泄漏 ACTIVE 规则模板（与实例重名且不可核销）→ CouponService.list 排除 ACTIVE 模板
