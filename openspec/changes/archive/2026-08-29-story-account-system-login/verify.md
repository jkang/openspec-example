# Verify: 用户登录（story-account-system-login）

> 验证证据随实施进度实时记录。Hard Gates（validate / Node 测试 / Python 测试 / 前端构建）全 PASS 方可收尾。

## 验证矩阵

| 任务 | 验证命令 | 结果 | 证据 |
| --- | --- | --- | --- |
| 规划制品校验 | `openspec validate story-account-system-login` | ✅ PASS | Change 'story-account-system-login' is valid（proposal/specs/design/tasks 4/4） |
| 领域层测试（@unit） | `npm test`（`__tests__/auth.spec.js`） | ✅ PASS | assertUserEnabled 禁用门禁 / verifyPassword 比对与非法格式容错 |
| 服务层测试（@unit） | `npm test`（`__tests__/auth.spec.js`） | ✅ PASS | login 成功返 user+sessionToken；密码错误/账号不存在 统一 INVALID_CREDENTIALS；禁用（含错误密码）USER_DISABLED；数字型手机号归一回归（ISSUE-011）；DTO 无密码字段；会话不复用 |
| 集成测试（@api） | `npm test`（`__tests__/integration.spec.js`） | ✅ PASS | 正确凭证 201 含 sessionToken 无泄露；错误密码 401；账号不存在 401（提示一致）；禁用 403；非法手机号 400 |
| Node 全量测试 | `./init.sh test:all`（[1/2]） | ✅ PASS | **104 tests / 104 pass / 0 fail**（18 suites，注册 88 基线 + 16 新增） |
| Python 冒烟 | `./init.sh test:all`（[2/2]） | ✅ PASS | **12 passed** in 0.29s |
| 前端构建 | `./init.sh vue:build` | ✅ PASS | vite build ✓（dist 产出 index-CScBsLEn.js） |
| E2E 全量回归 | `./init.sh e2e:run` | ✅ PASS | **17 scenarios / 91 steps 全部通过**（13 既有 + 4 新增登录场景） |
| 视觉约束（FRONTEND.md §6.2 自检） | Playwright 计算样式校验 | ✅ PASS | 无圆角违规 / 无阴影违规 / 无占位符 / 无非中文界面文本；登录/禁用/成功全流程交互验证通过 |

## E2E 门禁（TESTING_STRATEGY §2 Archive Gating）

- **E2E 覆盖落地**：`specs/account-management/spec.md` 中 4 条 @e2e 场景 → `e2e-tests/features/account_login.feature` 对应 4 条场景（正常主流程凭证正确登录成功 / 凭证错误不创建会话 / 禁用用户登录拦截 / 字段校验失败不提交）
- **实际场景数**：`17 scenarios / 91 steps`（`./init.sh e2e:run` 输出，含既有 13 场景回归）
- **场景数不得倒退**：E2E 场景数由 13 → 17，随变更增长 ✅

## 实现链路（登录 → 恢复身份）

```
Vue 登录视图 (App.vue viewMode='login'，入口：header「注册/登录」→ 注册页「直接登录」)
  → POST /api/auth/login  (Vite 代理 → Node 3000)
    → HTTP 层 server.js 路由（错误码映射 INVALID_PHONE→400 / INVALID_CREDENTIALS→401 / USER_DISABLED→403）
      → Service AuthService.login（String(phone).trim() 输入归一 → assertPhoneFormat → findByPhone
                                   → assertUserEnabled(禁用门禁) → verifyPassword(scrypt) → sessionRepo.create）
        → Domain logic.js（assertPhoneFormat / assertUserEnabled / verifyPassword）
        → Repo UserRepo / SessionRepo（内存 Map，生产 FileStore users.json/sessions.json）
  ← 201 { user(脱敏 DTO), sessionToken }
  → 前端 persistSession() → localStorage（ecommerce_session / ecommerce_user）→ 登录态（header 昵称 + 我的订单入口）
```

## 实施中发现并处理的问题

- **登录拦截与既有订单 E2E 冲突**：login 本 Story 若在「我的订单」按钮加未登录跳转（R-LOG-006 回跳），会破坏既有 `order_lifecycle.feature`（`user_dev` 未登录链路）。经核对需求侧 story：R-SES-004（未登录访问受保护页拦截）归 story-account-system-session 承接，本 Story 不抢占。前端 `goToOrders` 保持直进订单页，登录页入口走 header「注册/登录」→ 注册页「直接登录」。已记录至 `learning-sdd/flow-issues-log.md`（ISSUE-013）。

## 流程问题记录

- 执行中发现的 spec flow 问题已追加至 `learning-sdd/flow-issues-log.md`（ISSUE-012/013，详见该文件）。

## 结论

Hard Gates 全部 PASS：`openspec validate` ✅ / Node 测试 ✅（104 pass）/ Python 测试 ✅（12 pass）/ 前端构建 ✅ / E2E 全量 ✅（17 scenarios, 91 steps）。满足归档条件。
