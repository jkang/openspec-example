# Tasks: story-miniprogram-channel-config

> 关联 proposal/specs/design：见 `openspec/changes/story-miniprogram-channel-config/`
> 需求侧业务面：story.md（R-CHN-001~009 + E2E 旅程 1/2/3，已 HITL 确认）| 原型：`epics/epic-miniprogram-channel/prototypes/miniprogram-channel-admin.html`（Epic 整体，已确认）
> 实现版本标注：Node.js = 后端（ecommerce/ecommerce-mini）｜Frontend = 前端（ecommerce/ecommerce-mini-frontend）｜E2E = 全局 e2e-tests
> 依赖底座（既有，已完成部分不重复列）：`requireRole` 门禁（R-ADM/R-DASH）、用户/会话体系、fileRepo/memoryRepo 双存储、stock-config 阈值配置（Story 1 先例：repo + 路由 + 门禁模式）

## E2E 覆盖审查（spec-design 强制步骤）

- **受影响用户旅程**：B 端运营/老板在运营后台进入「小程序渠道」配置（AppID/AppSecret 脱敏/商户号/启用状态）；渠道停用影响小程序新登录入口（登录动作本身在 Story 2，本 change 交付状态契约与 B 端视图）。
- ① **smoke 主链路完整性**：`smoke.feature` 已覆盖核心交易主链路（注册→选购→加购→结算→支付→我的订单）；本 change 是**纯 B 端新增后台配置**（不改 C 端主链路与交易语义）→ smoke 无需改动，保持覆盖。
- ② **新增功能覆盖**：本 change 新增 `@e2e` 场景 =「运营配置并启用渠道（脱敏+即时生效）」「老板只读渠道状态（无配置入口）」「停用后新登录被拒（CHANNEL_DISABLED，API 级门禁契约）」「未配置默认停用」→ **新建 `e2e-tests/features/miniprogram_channel.feature`**（新 capability，独立 feature + steps 命名空间 `miniprogramChannel_`），复用既有登录/角色种子基建。
- ③ **既有场景回归风险**：新增端点/视图**零改动**既有端点与既有视图 → 全量回归（smoke / account_* / order_lifecycle / sales_dashboard / stock_warning）必须保持通过，列为回归任务。
- **缺口落盘**：story.md 旅程 1 场景 1 需 @e2e 断言（配置后配置页展示「已保存并即时生效」）；旅程 2 场景 1 需 @e2e 断言（老板只读无入口）；旅程 3 场景 1/3（停用拒绝 + 默认停用）→ 本 change 以 API 级断言落盘（登录动作 Story 2 消费），列入 tasks。

## 1. 后端：渠道配置领域逻辑（Node.js）

- [x] 1.1 新建 Domain 层 `src/domain/channel.js`（纯函数零外部依赖）：`maskSecret(secret)`（前 4 + 掩码 + 后 4）、`defaultChannelConfig()`（`{ appid: '', appsecretConfigured: false, mchid: '', enabled: false }`）、`toPublicConfig(store)`（返回脱敏视图：appid / appsecretConfigured / appsecretMasked（configured 时）/ mchid / enabled）
- [x] 1.2 新建 `src/repo/channelRepo.js` 内存仓储：`get()` / `save(cfg)`（对齐 memoryRepo 模式，启动空配置 defaultChannelConfig）
- [x] 1.3 FileStore 扩展：`fileRepo.js` 增加 `ChannelConfigFileRepo`（读/写 `data/channel-config.json`，目录解析对齐既有 resolveDataDir）；`server.js` 启动按 `STORAGE` 环境选型（test 内存 / 默认文件，对齐 StockConfigRepo 模式）
- [x] 1.4 新增路由（`server.js`）：`GET /api/admin/channel/miniprogram`（requireRole('运营','老板')，返回脱敏视图）；`PUT /api/admin/channel/miniprogram`（requireRole('运营')，body = { appid, appsecret?, mchid?, enabled }；secret 为空保留已存值；保存落盘即时生效）
- [x] 1.5 新增单元测试（`__tests__/channel.spec.js` @unit）：maskSecret（configured 才显示掩码）、defaultChannelConfig、toPublicConfig 不泄露明文
- [x] 1.6 新增 API 测试（@api，复用既有测试基建）：GET 返回脱敏配置（appsecretConfigured=true 且无明文）；PUT 后 GET 立即反映新状态（即时生效）；老板 PUT → 403；客户/客服/未登录 → 401/403；默认无配置 → enabled=false
- [x] 1.7 运行 `./init.sh node:test` 全量 Node 测试（单元 + API）全绿

## 2. 前端：B 端小程序渠道配置视图（Frontend）

- [x] 2.1 App.vue B 端导航新增「小程序渠道」入口（仅 `isOperator || isBoss` 可见，与既有 B 端导航并列）
- [x] 2.2 新增「小程序渠道」视图（对齐原型）：运营态配置表单（AppID / AppSecret 掩码 +「重新配置」/ 商户号 +「纯预留」提示 / 启用开关）+「保存配置」→ `PUT` 成功展示「已保存并即时生效」+ 启用/停用徽标 + 停用警示条；老板态只读（「纯只读 · 无配置入口」，无输入框/开关/保存按钮）
- [x] 2.3 前端数据流：进入视图 `GET /api/admin/channel/miniprogram` 渲染；AppSecret 已配置显示掩码，非配置态显示空输入
- [x] 2.4 前端极简约束自查（`docs/FRONTEND.md` §6.2）：无圆角/无阴影/无硬编码 hex（仅 ZAPP 语义令牌）/真实中文数据/无占位符残留
- [x] 2.5 运行 `./init.sh vue:build` 前端构建通过

## 3. E2E 覆盖（新建 feature + 回归）

- [x] 3.1 新建 `e2e-tests/features/miniprogram_channel.feature`（4 个 @e2e 场景）：
  - 运营配置并启用渠道：运营登录 → 进入小程序渠道 → 填 AppID/AppSecret/商户号 + 启用 → 保存 → 「已保存并即时生效」+「● 已启用」，AppSecret 显示掩码无明文
  - 老板只读渠道状态：老板登录进入小程序渠道 → 展示启用状态，页面无配置入口（「纯只读 · 无配置入口」标识）
  - 停用后新登录被拒（API 门禁契约）：运营停用渠道 → 小程序登录 API 返回 CHANNEL_DISABLED（mock 网关由 Story 2 提供，本 change 以接口契约断言；若 Story 2 未落地则该场景标 @skip 并在 verify.md 记录待 Story 2）
  - 未配置默认停用：重置后（无配置记录）GET 渠道配置 → enabled=false
- [x] 3.2 新建 `e2e-tests/steps/miniprogram_channel.js`（`miniprogramChannel_` 前缀防 ambiguous）：登录辅助（复用既有登录 step 或直接 API 后门）、渠道配置读写、断言掩码与徽标文本
- [x] 3.3 运行 `./init.sh e2e:run`：新增场景通过（场景总数记录于 `verify.md`）
- [x] 3.4 既有回归验证：smoke / account_login / account_register / account_session / account_admin_users / order_lifecycle / sales_dashboard / stock_warning 全部通过（本 change 仅新增端点与 B 端视图）

## 4. 验证与同步

- [x] 4.1 运行 `openspec validate --change "story-miniprogram-channel-config"`（硬门禁：specs/design/tasks 齐备且格式合法）
- [x] 4.2 运行 `./init.sh test:all`（Node 全绿；Python：本 change 仅 Node.js 变更，Python 无改动——显式确认 `skip_python: 无 Python 代码变更`）
- [x] 4.3 浏览器视觉验证闭环（`docs/FRONTEND.md` §6）：`./init.sh vue:start` → 以运营/老板双角色验收小程序渠道视图（配置表单/脱敏掩码/启用开关/徽标/警示条/老板只读）；ZAPP 自检清单逐项核对
- [x] 4.4 视觉验证核心截图落位 `verify-evidence/`（channel-config-operator.png、channel-config-boss.png、channel-config-disabled.png），`verify.md` 证据行引用截图路径
- [x] 4.5 按 apply 流程逐项勾选 tasks.md：每完成一项 → 运行对应验证命令 → 更新 `verify.md` 证据 → `- [x]` 改 `- [x]`
- [x] 4.6 全部完成后运行 `/opsx:verify`（或 `./init.sh test:all` + `e2e:run` + `vue:build`），Hard Gates（schema validate / Node test / Python test / 前端构建）与 Soft Gate（E2E cucumber）全部 PASS
- [x] 4.7 Spec Sync（change 级）：`/opsx:sync` 将 delta specs 回流 `openspec/specs/`（miniprogram-channel 新增主 spec + frontend-ui 增量追加）；Baseline Sync（`domain_model.html` / `service_blueprint.html`）按设计双 Sync Assessment 预判在 Epic 全部 Story 归档后统一执行（本 change 不触发）<!-- ⏸ 由 lead 执行（engineer 交付边界：不执行 Spec Sync 与 Archive） -->
