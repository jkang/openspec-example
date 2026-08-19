## 1. 领域模型与核心逻辑升级 (Domain & Logic)

- [ ] 1.1 扩展 `Coupon` 和 `Order` 实体定义，增加 `PERCENTAGE` 类型及实付金额字段 (Node.js)
- [ ] 1.2 在 `domain/logic.js` 中实现策略模式折扣计算函数，处理向下取整逻辑 (Node.js)
- [ ] 1.3 在 `domain/models.py` 中同步扩展实体与计算逻辑 (Python)
- [ ] 1.4 为折扣计算逻辑编写单元测试 (@unit) (Node.js/Python)

## 2. 服务层与智能推荐实现 (Services)

- [ ] 2.1 在 `CouponService` 中实现可用券筛选与 `getBestCoupon` 最优推荐算法 (Node.js)
- [ ] 2.2 在 `OrderService` 结算流程中集成最优推荐，并强制持久化 `actualPaidCents` (Node.js)
- [ ] 2.3 同步在 Python 版 `CouponService` 和 `OrderService` 中实现上述逻辑 (Python)
- [ ] 2.4 编写集成测试验证智能推荐与实付金额持久化 (@api) (Node.js/Python)

## 3. 前端结算页优化 (Frontend)

- [ ] 3.1 在结算页集成后端“最优券”推荐接口展示 (Frontend)
- [ ] 3.2 实现手动切换优惠券时的实时金额重算逻辑，遵循极简 UI 规范 (Frontend)
- [ ] 3.3 确保 UI 元素（无圆角、Slate 色系）与 prototype.html 完全一致 (Frontend)

## 4. 全链路验证 (Verification)

- [ ] 4.1 运行 `./init.sh test:all` 确保 Node.js 和 Python 后端单元/集成测试全部通过
- [ ] 4.2 执行 E2E 测试场景：验证“自动推荐 9 折券”及“手动切换”流程 (@e2e)
- [ ] 4.3 通过浏览器验证 UI 约束：检查是否彻底消除了 `border-radius` (Frontend)
