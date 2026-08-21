# Tasks: B 端极简运营后台 (story-coupon-admin-panel)

> 版本标注：`[Node]` / `[Python]` / `[Frontend]` / `[全部]`。测试入口统一使用 `./init.sh`。

## 1. Domain 层：Coupon 归属模型与发放校验

- [x] 1.1 `[Node]` 在 `ecommerce-mini/src/domain/types.js` 中扩展 Coupon 类型：新增 `expiryDate`、可空 `userId`、可空 `templateId`（JSDoc）
- [x] 1.2 `[Node]` 在 `ecommerce-mini/src/domain/logic.js` 中新增创建券规则校验：`INVALID_DISCOUNT_RATE`（PERCENTAGE 值 ≤0 或 ≥10）、`COUPON_VALUE_EXCEEDS_THRESHOLD`（FLAT 减免 ≥ 门槛）
- [x] 1.3 `[Node]` 在 `ecommerce-mini/src/domain/logic.js` 中新增发放校验：`INVALID_USER_ID`（不匹配 `user_\d+`）、`COUPON_ALREADY_ISSUED`（同 templateId + userId 且 UNUSED）、`COUPON_NOT_ACTIVE`（模板非 ACTIVE）
- [x] 1.4 `[Python]` 在 `ecommerce-mini-python/src/domain/models.py` 中扩展 `Coupon` 模型：新增 `expiryDate`、可空 `userId`、可空 `templateId`（Pydantic 字段）
- [x] 1.5 `[Python]` 在 `ecommerce-mini-python/src/domain/` 中对齐 1.2 / 1.3 的校验规则与错误码
- [x] 1.6 `[全部]` 为 Domain 校验补充单元测试（`@unit`）：折扣比例边界、满减超门槛、发放重复拒绝

## 2. Repository 层：实例聚合与发放记录存储

- [x] 2.1 `[Node]` 在 `ecommerce-mini/src/repo/memoryRepo.js` 中确认 `findAll` / `findById` 支持，新增按 `templateId` 统计实例数的查询方法（或等价聚合）
- [x] 2.2 `[Python]` 在 `ecommerce-mini-python/src/repo/memory.py` 中对齐 2.1 的聚合查询能力
- [x] 2.3 `[Node]` 在 `ecommerce-mini/data/coupons.json` 中为既有种子券补齐 `expiryDate`（可选，缺省时运行期归一为 null 语义）
- [x] 2.4 `[Node]` 处理生产 `FileStore` 持久化：发放/创建写入 `coupons.json`，发放记录追加写入 `issuances.json`

## 3. Service 层：CouponService 归属过滤与 AdminCouponService

- [x] 3.1 `[Node]` 修改 `ecommerce-mini/src/services/coupon.js` 的 `getBestCoupon`：过滤条件改为 `UNUSED && (userId === null || userId === 目标用户)`
- [x] 3.2 `[Node]` 新增 `ecommerce-mini/src/services/adminCoupon.js`：`create`（规则创建，返回 ACTIVE 券）、`list`（含 issuedCount 聚合）、`issue`（生成用户归属实例 + 发放记录）、`listIssuances`
- [x] 3.3 `[Python]` 修改 `ecommerce-mini-python/src/services/coupon.py` 的最优券过滤逻辑（对齐 3.1）
- [x] 3.4 `[Python]` 新增 `ecommerce-mini-python/src/services/admin_coupon.py`（对齐 3.2 的四方法）

## 4. HTTP 层：Admin 端点（Node / Python 契约一致）

- [x] 4.1 `[Node]` 在 `ecommerce-mini/src/http/server.js` 新增 `POST /api/admin/coupons`（创建规则，校验失败返回对应错误码 400）
- [x] 4.2 `[Node]` 在 `ecommerce-mini/src/http/server.js` 新增 `GET /api/admin/coupons`（规则列表 + issuedCount）
- [x] 4.3 `[Node]` 在 `ecommerce-mini/src/http/server.js` 新增 `POST /api/admin/coupons/:id/issue`（单人发放，重复发放 409 / COUPON_ALREADY_ISSUED）
- [x] 4.4 `[Node]` 在 `ecommerce-mini/src/http/server.js` 新增 `GET /api/admin/issuances`（最近发放记录）
- [x] 4.5 `[Python]` 在 `ecommerce-mini-python/src/api/server.py` 新增对应四个 admin 端点（与 Node 契约一致，含错误码）
- [x] 4.6 `[全部]` 为 admin 端点补充 API 测试（`@api`）：创建成功/非法拒绝、发放成功/重复拒绝/非法 userId

## 5. Frontend：B 端运营视图（对齐已确认原型）

- [x] 5.1 `[Frontend]` 在 `ecommerce-mini-frontend/src/App.vue` 增加顶层 `viewMode`（store / admin）切换入口（顶部导航）
- [x] 5.2 `[Frontend]` 实现新建券规则表单：FLAT / PERCENTAGE 类型切换联动优惠值语义、内联校验反馈
- [x] 5.3 `[Frontend]` 实现券列表表格：类型 / 优惠内容 / 门槛 / 有效期 / 状态 / 已发放数量 / 「发券」按钮
- [x] 5.4 `[Frontend]` 实现手动发券面板：列表「发券」联动滚动定位、目标用户输入、成功 / 重复拒绝反馈
- [x] 5.5 `[Frontend]` 实现最近发放记录表：发放成功由服务端返回列表回填
- [x] 5.6 `[Frontend]` 严格遵循极简规范自检：无圆角 / 无阴影 / slate 色系 / 1px 实线边框 / 全中文 / 真实数据

## 6. E2E 全链路验证

- [x] 6.1 `[全部]` 运行 `./init.sh test:all`，确认 Node 与 Python 全量测试通过
- [x] 6.2 `[Frontend]` 运行 `./init.sh vue:start`，通过浏览器验证：创建折扣券 → 列表生效 → 发放给 user_1003 → 发放记录回流
- [x] 6.3 `[Frontend]` 通过浏览器完成 C 端闭环验证：以 user_1003 进入结算页，确认新发放的券出现在可用券集合且参与最优推荐（对应 story.md 旅程 3）
- [x] 6.4 `[Frontend]` 浏览器自检清单：DOM 无 `border-radius` / `box-shadow`、数据无占位符、单屏布局无卡片堆叠
- [x] 6.5 `[全部]` 运行 `openspec validate` 确认变更规格合规

## 7. 基线同步（归档前）

- [x] 7.1 `[全部]` 执行 `/opsx:sync` 回写 `service_blueprint.html`：`SB-OPS-03` 补充“手动单人发券”活动、`SB-BACKSTAGE-03` 补充 admin 接口活动（依据 design.md Service Blueprint Sync Assessment）
- [x] 7.2 `[全部]` 回写 `domain_model.html`：Coupon Aggregate 补充 `expiryDate / userId / templateId`，Event Storming 补充 `IssueCoupon` 命令与发放归属策略（依据 design.md Domain Model Sync Assessment）
