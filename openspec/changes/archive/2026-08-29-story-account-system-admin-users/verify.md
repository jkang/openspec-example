# Verify: B 端用户管理（story-account-system-admin-users）

> 验证证据随实施进度实时记录。Hard Gates（validate / Node 测试 / Python 测试 / 前端构建）全 PASS 方可收尾。

## Purpose
为 story-account-system-admin-users 的 apply 提供可审计的本地验证证据，避免在 sync 或归档前仍存在编译失败或核心链路缺陷（用户列表/检索/详情聚合/启停/运营权限门禁）。

## Scope
- 变更模块: Node.js 后端（AdminUserService + 运营角色门禁 + 用户管理路由）＋ Vue 前端（用户管理 tab）＋ E2E（B 端用户管理旅程）
- 风险关键目标: 列表检索（R-ADM-002/003）、详情聚合（R-ADM-004）、禁用联动会话失效（R-ADM-005 + R-SES-006）、启用恢复（R-ADM-006）、运营权限门禁与敏感信息保护（R-ADM-001/007）

## Gates
### Hard Gates
- Schema validate: PASS
- Node test: PASS
- Python test: PASS
- Frontend build: PASS

### Soft Gates
- E2E cucumber: PASS（24 scenarios / 132 steps）

## 验证矩阵

| 任务 | 验证命令 | 结果 | 证据 |
| --- | --- | --- | --- |
| 规划制品校验 | `openspec validate story-account-system-admin-users` | ✅ PASS | Change is valid（proposal/specs/design/tasks 4/4） |
| 1.1-1.3 领域层 | `npm test`（`__tests__/userAdmin.spec.js`） | ✅ PASS | `assertUserStatusValue` 合法/非法；`assertUserEnabled` 禁用门禁回归；`role` 字段落位 |
| 2.1-2.2 服务层 | `npm test`（`__tests__/userAdmin.spec.js`） | ✅ PASS | 列表订单数聚合+倒序；手机号/昵称检索；空关键词全量；详情聚合仅本用户订单；`USER_NOT_FOUND`；setStatus 禁用/启用/幂等/非法；DTO 无密码字段 |
| 3.1-3.4 HTTP 层 | `npm test`（`__tests__/integration.spec.js`） | ✅ PASS | 运营列表/检索/详情/启停全通过；客服 403 无敏感数据；未登录 403；禁用后持会话访问订单 403 `USER_DISABLED`；启用可重新登录；`INVALID_STATUS` 400；`USER_NOT_FOUND` 404 |
| Node 全量测试 | `./init.sh test:all`（[1/2]） | ✅ PASS | **150 tests / 150 pass / 0 fail**（23 suites，含新增 userAdmin 10 项 + 集成 10 项） |
| Python 冒烟 | `./init.sh test:all`（[2/2]） | ✅ PASS | **12 passed** in 0.26s |
| 前端构建 | `./init.sh vue:build` | ✅ PASS | vite build ✓（dist 产出 index-BRyqkoEx.js） |
| E2E 全量回归 | `./init.sh e2e:run` | ✅ PASS | **24 scenarios / 132 steps 全部通过**（21 既有 + 3 新增用户管理场景） |
| 视觉约束（FRONTEND.md §6.2 自检） | Playwright 计算样式校验 | ✅ PASS | 无圆角违规（0）/ 无阴影违规（0）/ 无占位符；侧边栏用户管理可见（运营角色）；按手机号检索返回林晓明含真实手机号；详情抽屉展示订单聚合 |

## E2E 门禁（TESTING_STRATEGY §2 Archive Gating）

- **E2E 覆盖落地**：3 条 @e2e 场景（user-admin 权限入口 ×1 + story.md 旅程 1/2/3 拆 3 条）→ `e2e-tests/features/account_admin_users.feature` 对应 3 条场景（检索下钻 / 禁用联动会话失效 / 客服权限拦截）
- **实际场景数**：`24 scenarios / 132 steps`（`./init.sh e2e:run` 输出，含既有 21 场景回归）
- **场景数不得倒退**：E2E 场景数由 21 → 24，随变更增长 ✅

## 实现链路（B 端用户管理闭环）

```
Vue 前端（运营登录态 role=运营 → 侧边栏「账户中心/用户管理」）
  → GET /api/admin/users?keyword=（Bearer）→ requireAdminRole（getSessionUser → role===运营，否则 403 FORBIDDEN）
    → AdminUserService.list（Order.userId 订单数聚合 + 注册时间倒序 + 手机号/昵称过滤，DTO 脱敏）
  → GET /api/admin/users/:id → AdminUserService.getDetail（基础信息 + 该用户订单聚合，R-ADM-004）
  → PATCH /api/admin/users/:id/status { status } → assertUserStatusValue → setStatus（正常↔禁用，幂等）
    → 禁用后：该用户登录 403 USER_DISABLED（R-LOG-003）+ 既有会话访问受保护接口 403 USER_DISABLED（R-SES-006）
  → 非运营（客服/未登录/普通客户）→ 403 FORBIDDEN，响应不含任何手机号（R-ADM-001/007）
```

## 实施中发现并处理的问题

- **requireAdminRole 未登录场景返回 401 而非约定的 403**：`getSessionUser(null)` 抛 `UNAUTHORIZED`（401），导致「未登录访问用户列表」集成测试断言 401≠403 失败。已修复：`requireAdminRole` 将 `UNAUTHORIZED` 统一转换为 `FORBIDDEN`（403）——admin 端点不区分未登录与越权（防探测，对齐 R-ADM-001 拒绝访问语义）；运营被禁用则保留 `USER_DISABLED` 专属提示。
- **集成测试共享 server 实例导致手机号复用冲突**：`15876543210`（王强）在前序「禁用」测试中被置为禁用后，「启用」测试登录阶段返回 403 导致 403≠201。已修复：每个测试使用独立手机号（`1377777777x` 系列），避免跨测试状态污染。
- **E2E 步骤与既有 account_session 步骤名冲突（ambiguous）**：`运营在用户管理中将王强禁用` 同时匹配新 UI 步骤与旧后门步骤。已修复：新步骤改名 `运营在用户管理界面中将王强禁用`（UI 真实链路），旧步骤保留（历史后门链路，两个 Story 场景契约各自成立）。
- **E2E 断言等待「已禁用」文本失败**：领域状态值为 `禁用`（前端显示 `{{ u.status }}`），非原型的「已禁用」。已修复：等待该行操作按钮从「禁用」变为「启用」（列表刷新完成信号）。

## 流程问题记录

- 执行中发现的新流程问题已追加至 `learning-sdd/flow-issues-log.md`（ISSUE-015，详见该文件）。

## 结论

Hard Gates 全部 PASS：`openspec validate` ✅ / Node 测试 ✅（150 pass）/ Python 测试 ✅（12 pass）/ 前端构建 ✅ / E2E 全量 ✅（24 scenarios, 132 steps）。满足归档条件。
