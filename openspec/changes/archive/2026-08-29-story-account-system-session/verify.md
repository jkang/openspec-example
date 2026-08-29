# Verify: 会话保持与退出（story-account-system-session）

> 验证证据随实施进度实时记录。Hard Gates（validate / Node 测试 / Python 测试 / 前端构建）全 PASS 方可收尾。

## Purpose
为 story-account-system-session 的 apply 提供可审计的本地验证证据，避免在 sync 或归档前仍存在编译失败或核心链路缺陷（会话持久化 / 订单归属隔离 / 退出销毁）。

## Scope
- 变更模块: Node.js 后端（会话中间件/退出登录/归属收口）＋ Vue 前端（退出按钮/登录拦截回跳）＋ E2E（会话用户旅程）
- 风险关键目标: 未登录拦截（R-SES-002/004）、订单归属隔离（R-SES-003）、退出销毁（R-SES-005）、禁用会话失效（R-SES-006）、下单绑定会话 userId（R-SES-007）

## Gates
### Hard Gates
- Schema validate: PASS
- Node test: PASS
- Python test: PASS
- Frontend build: PASS

### Soft Gates
- E2E cucumber: PASS（21 scenarios / 116 steps）

## 验证矩阵

| 任务 | 验证命令 | 结果 | 证据 |
| --- | --- | --- | --- |
| 规划制品校验 | `openspec validate story-account-system-session` | ✅ PASS | Change is valid（proposal/specs/design/tasks 4/4） |
| 1.1/1.2 仓储层 | `npm test`（`__tests__/auth.spec.js`） | ✅ PASS | SessionRepo.delete 幂等删除；findByToken 销毁后 undefined |
| 2.1-2.3 服务层 | `npm test`（`__tests__/auth.spec.js`） | ✅ PASS | getSessionUser 有效/伪造/禁用/用户删除；logout 销毁/幂等/仅目标会话；DTO 无密码字段 |
| 3.1-3.6 集成 | `npm test`（`__tests__/integration.spec.js`） | ✅ PASS | 未登录 GET/POST orders 401；下单绑定会话 userId（自报被忽略）；归属隔离（?userId=他人不越权）；logout 后原凭证 401；禁用持会话 403 且无订单数据 |
| 购物车读取防污染 | `npm test`（`__tests__/unit.spec.js`） | ✅ PASS | qty=0 不写入空购物车；订单快照不含零数量条目（实施中发现并修复） |
| Node 全量测试 | `./init.sh test:all`（[1/2]） | ✅ PASS | **122 tests / 122 pass / 0 fail**（20 suites） |
| Python 冒烟 | `./init.sh test:all`（[2/2]） | ✅ PASS | **12 passed** in 0.23s |
| 前端构建 | `./init.sh vue:build` | ✅ PASS | vite build ✓（dist 产出 index-DEnyDxGS.js） |
| E2E 全量回归 | `./init.sh e2e:run` | ✅ PASS | **21 scenarios / 116 steps 全部通过**（17 既有 + 4 新增会话场景） |
| 视觉约束（FRONTEND.md §6.2 自检） | Playwright 计算样式校验 | ✅ PASS | 无圆角违规 / 无阴影违规 / 无占位符；登录态 header 含昵称+退出按钮，退出后回未登录态并拦截回跳 |

## E2E 门禁（TESTING_STRATEGY §2 Archive Gating）

- **E2E 覆盖落地**：4 条 @e2e 场景（user-session ×3 + order-management ×1）→ `e2e-tests/features/account_session.feature` 对应 4 条场景（刷新保持+归属隔离 / 未登录拦截回跳 / 退出销毁 / 禁用失效）
- **实际场景数**：`21 scenarios / 116 steps`（`./init.sh e2e:run` 输出，含既有 17 场景回归）
- **场景数不得倒退**：E2E 场景数由 17 → 21，随变更增长 ✅

## 实现链路（会话生命周期闭环）

```
Vue 前端（登录态 localStorage → header 昵称+退出登录；我的订单/结算未登录拦截+回跳 loginRedirect）
  → POST /api/auth/logout（Bearer）→ HTTP 层销毁 sessionRepo.delete（服务端凭证不可复用）
  → GET /api/orders（Bearer）→ requireSession 中间件
    → AuthService.getSessionUser（findByToken → 用户存在 → assertUserEnabled 禁用门禁）
      → OrderService.listByUser(会话 userId)（归属隔离，替代客户端 ?userId=）
  → POST /api/orders / POST /api/checkout（Bearer）→ requireSession → createOrder(会话 userId)（R-SES-007 替代 user_dev）
  → 购物车归属：有会话按会话 userId，无会话游客 user_dev（D3）
```

## 实施中发现并处理的问题

- **fetchCart 的 qty=0 探测污染订单快照**：`fetchCart` 用 `POST /api/cart/items { quantity: 0 }` 读取购物车；登录后会话购物车为空时，该调用会把 qty=0 的商品条目写入购物车，随后下单时该条目进入订单快照（items[0] 被空条目占据，导致 E2E「我的订单」断言失败）。已修复：`CartService.addToCart` 对空购物车 + `quantity <= 0` 不写入条目（既有条目 qty=0 不变），并新增 @unit 回归测试。属会话归属改造暴露的既有边界缺陷。
- **`switchToLogin()` 会清空 `loginServerError`**：禁用用户会话失效（403）引导重新登录时，若先设错误提示再调 `switchToLogin()`，提示会被清空导致 E2E 断言超时。已修复：先 `switchToLogin()` 再设置 `loginServerError`（fetchMyOrders 与 checkout 两处）。
- **登录 API 集成测试的 user_1001 硬断言**：本变更新增测试在「C 端我的订单」describe 内先注册用户，打破既有「首个注册即 user_1001」的隐式假设。已放宽为动态断言（`id.startsWith('user_')` / 与注册响应一致）。

## 流程问题记录

- 执行中发现的 spec flow 问题已追加至 `learning-sdd/flow-issues-log.md`（ISSUE-014，详见该文件）。

## 结论

Hard Gates 全部 PASS：`openspec validate` ✅ / Node 测试 ✅（122 pass）/ Python 测试 ✅（12 pass）/ 前端构建 ✅ / E2E 全量 ✅（21 scenarios, 116 steps）。满足归档条件。
