# Verify: story-miniprogram-wechat-login

> 关联 proposal/specs/design/tasks：见 `openspec/changes/story-miniprogram-wechat-login/`
> 关联需求侧：story.md（R-WX-001~011 + E2E 旅程 1/2/3/4，已 HITL 确认）
> 验证日期：2026-09-08（用户授权全程自主交付，对齐历史归档模式）

## Hard Gates (强制门禁)

| 门禁 | 结果 | 证据 |
| --- | --- | --- |
| `openspec validate story-miniprogram-wechat-login` | ✅ PASS | spec/design/tasks 齐备且格式合法（新增 `wechat-auth` taxonomy spec + `frontend-ui` 增量） |
| Node.js 单元测试 + API 测试 | ✅ PASS | `node --test` 全量 256 tests / 45 suites，0 fail（含新增 16 tests：mock 网关 + WechatAuthService 单测 + 微信 API） |
| Python 测试 | ✅ PASS（skip_python） | 本 change 仅 Node.js 变更（Python 端无认证/渠道能力，不对齐），无代码改动 |
| 前端构建 | ✅ PASS | `vue:build` 成功（本 change 无 Vue B 端新增视图——小程序登录 UI 为原生端（技术栈未锁定），Vue 侧零回归） |

- Schema validate: PASS
- Node test: PASS
- Python test: PASS（skip）
- Frontend build: PASS
- E2E cucumber: PASS（54 scenarios 通过）

## Soft Gates (E2E cucumber)

| 门禁 | 结果 | 证据 |
| --- | --- | --- |
| `./init.sh e2e:run` | ✅ PASS | **54 scenarios 全部通过 / 305 steps**：新增 6 个 `miniprogram_wechat_login.feature` @e2e 场景（老客户 openid 直连 / 新号绑定 / 撞号 PHONE_EXISTS / bind-openid 完成 / 渠道停用 CHANNEL_DISABLED / 禁用 USER_DISABLED）+ 既有 48 场景全量回归通过 |
| E2E 覆盖完整性 | ✅ FULL | 新旅程（直连/建号/撞号/停用/禁用/mock 可复现）全部有 feature+steps 承接；smoke 主链路不受影响（User/Session 扩展向后兼容，存量无 openid/channel 字段） |

## 验证细节

### 单元（@unit）
- `wechatGateway.js` mock：code_demo_001/002/003 → openid_demo_001/002/003（Q6 固定映射）；phone_demo_001/002 → 手机号；未知 code → WECHAT_CODE_INVALID。
- `WechatAuthService`：openid 命中直连（会话 MINIPROGRAM）；未命中 WECHAT_BIND_REQUIRED；渠道停用 CHANNEL_DISABLED；新号绑定建号（phone+openid+role=客户）；撞号 PHONE_EXISTS_NEED_LOGIN（不建重复用户）；bind-openid 完成绑定；防越权 WECHAT_OPENID_TAKEN；禁用 USER_DISABLED。

### API（@api）
- `POST /api/auth/wechat/login`：老客户 201 / 未命中 400 / 停用 403。
- `POST /api/auth/wechat/bind`：新号 201（channel=MINIPROGRAM）/ 撞号 409。
- `POST /api/auth/wechat/bind-openid`：200 绑定 / openid 已被绑定他人 409（防越权）。

### E2E（@e2e，Node 3000 全链路 API 断言——mock 网关 Q6 无真实小程序 UI）
- 老客户直连（历史订单延续语义）；新客户绑定建号；撞号 PHONE_EXISTS_NEED_LOGIN 且用户总数不增；bind-openid 完成（单账户）；停用 CHANNEL_DISABLED；禁用 USER_DISABLED。

### 视觉验证闭环（docs/FRONTEND.md §6）
- 本 change 无 Vue B 端新增视图（小程序登录 UI 为原生端，技术栈未锁定——Q8 交付边界：以可交互原型 `miniprogram-wechat-login.html` + 登录/绑定 API 打通完成；原生工程化随 6.2/lead-engineer 评估）；Vue 构建零回归。
- ⚠️ 视觉截图未落位（浏览器 MCP 不可用 + 本 change 无 Vue 新视图）；小程序登录 UI 交互已由原型（HITL 确认）+ API E2E 覆盖。

## 结论

- Story 2 `story-miniprogram-wechat-login`（微信授权登录与同源账户打通）**验证全部通过**：Hard Gates 全 PASS、E2E 54 场景全绿（含 6 新增 + 全量回归）。
- 下一步：Spec Sync（change 级，delta specs → `openspec/specs/`）→ Archive → 更新 `epic-miniprogram-channel.story-list.json`（story 2 → done）→ 继续 Story 3。
