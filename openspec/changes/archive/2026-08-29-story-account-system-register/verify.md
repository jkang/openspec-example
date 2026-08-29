# Verify: 用户注册（story-account-system-register）

> 验证证据随实施进度实时记录。Hard Gates（validate / Node 测试 / 前端构建）全 PASS 方可收尾。

## 验证矩阵

| 任务 | 验证命令 | 结果 | 证据 |
| --- | --- | --- | --- |
| 规划制品校验 | `openspec validate story-account-system-register` | ✅ PASS | Change 'story-account-system-register' is valid |
| 领域层测试（@unit） | `npm test`（`__tests__/auth.spec.js`） | ✅ PASS | 手机号格式/密码边界/昵称/默认昵称/哈希不可逆 + 数字型手机号归一（E2E 发现的缺陷回归） |
| 仓储层测试（@unit） | `npm test`（`__tests__/auth.spec.js`） | ✅ PASS | UserRepo 序列自增/按手机号查找；SessionRepo 创建/解析 |
| 服务层测试（@unit） | `npm test`（`__tests__/auth.spec.js`） | ✅ PASS | 注册成功返回 user+sessionToken；重复手机号抛错；哈希入库无明文 |
| 集成测试（@api） | `npm test`（`__tests__/integration.spec.js`） | ✅ PASS | 合法注册 201；重复 409 `PHONE_ALREADY_REGISTERED`；非法手机号/短密码 400；响应无密码泄露 |
| Node 全量测试 | `./init.sh test:all`（[1/2]） | ✅ PASS | **88 tests / 88 pass / 0 fail**（15 suites） |
| Python 冒烟 | `./init.sh test:all`（[2/2]） | ✅ PASS | **12 passed** in 0.24s |
| 前端构建 | `./init.sh vue:build` | ✅ PASS | vite build ✓ (dist 产出 index-BgSWHpWM.js) |
| E2E 全量回归 | `./init.sh e2e:run` | ✅ PASS | **13 scenarios / 63 steps 全部通过**（10 既有 + 3 新增注册场景） |
| 视觉约束（FRONTEND.md §6.2 自检） | Playwright 计算样式校验 | ✅ PASS | 无圆角违规 / 无阴影违规 / 无占位符；注册视图全中文 |

## E2E 门禁（TESTING_STRATEGY §2 Archive Gating）

- **E2E 覆盖落地**：`specs/account-management/spec.md` 中 3 条 @e2e 场景 → `e2e-tests/features/account_register.feature` 对应 3 条场景（正常主流程注册自动登录 / 手机号已注册冲突处理 / 非法输入校验）
- **实际场景数**：`13 scenarios / 63 steps`（`./init.sh e2e:run` 输出，含既有 10 场景回归）
- **场景数不得倒退**：E2E 场景数由 10 → 13，随变更增长 ✅

## 实现链路（注册 → 自动登录）

```
Vue 注册视图 (App.vue viewMode='register')
  → POST /api/auth/register  (Vite 代理 → Node 3000)
    → HTTP 层 server.js 路由（错误码映射 INVALID_PHONE/PHONE_ALREADY_REGISTERED/...）
      → Service AuthService.register（格式校验 → 手机号唯一 → scrypt 哈希 → 建用户 status=正常 → 建会话）
        → Domain logic.js（assertPhoneFormat/assertPasswordRule/assertNicknameRule/defaultNickname/hashPassword）
        → Repo UserRepo / SessionRepo（内存 Map，生产 FileStore users.json/sessions.json）
  ← 201 { user(脱敏), sessionToken }
  → 前端 persistSession() → localStorage（ecommerce_session / ecommerce_user）→ 登录态（header 昵称 + 可继续结算）
```

## 实施中发现并修复的缺陷

- **数字型手机号导致唯一性校验失效**（E2E 冲突场景暴露）：客户端以 JSON 数字提交手机号时，`findByPhone` 严格相等（number vs string）失配，可重复注册。修复：`AuthService.register` 输入归一 `String(phone).trim()`，并新增 @unit 回归测试。已记录至 `learning-sdd/flow-issues-log.md`（ISSUE-011）。

## 流程问题记录

- 执行中发现的 spec flow 问题已追加至 `learning-sdd/flow-issues-log.md`（ISSUE-008/009/010/011），详见该文件。

## 结论

Hard Gates 全部 PASS：`openspec validate` ✅ / Node 测试 ✅（88 pass）/ Python 测试 ✅（12 pass）/ 前端构建 ✅ / E2E 全量 ✅（13 scenarios, 63 steps）。满足归档条件。
