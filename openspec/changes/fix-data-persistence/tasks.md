# Tasks: fix-data-persistence

> 版本标注：本变更全部为 **Node.js**（`ecommerce/ecommerce-mini`）+ **E2E**（`e2e-tests/`）+ **文档**。无 Vue / Python 变更。
> 门禁：每个开发任务完成后运行 `npm test`（Node 测试套件）；全部完成后执行 `./init.sh test:all` + `openspec validate fix-data-persistence` + E2E。

## 1. 共享仓储适配层 (Shared File Repo Layer)

- [x] 1.1 [Node.js] 新增 `src/repo/fileRepo.js`：将 `server.prod.js` 中的 `FileRepoAdapter` / `UserFileRepo` / `SessionFileRepo` 迁移并泛化（支持 8 类数据：products/categories/coupons/issuances/orders/carts(keyField=userId)/users/sessions）
- [x] 1.2 [Node.js] 增强 `src/persist/fileStore.js`：首次启动自动创建缺失数据文件（含 `users.json`/`sessions.json`/`issuances.json`）；`data/` 目录不存在时自动创建；JSON 解析失败时安全降级（空数据集启动，不崩溃）
- [x] 1.3 [Node.js] 编写 `fileStore`/`fileRepo` 单元测试（`__tests__/persistence.spec.js` 或独立 spec）：文件初始化、写后一致性、损坏文件降级

## 2. 服务统一入口与存储选择 (Server Unified Entry)

- [x] 2.1 [Node.js] 改造 `server.js`：`createServer({ storage })` 支持存储后端选择；缺省解析规则 = `NODE_ENV=test` → memory，否则 file；显式 `STORAGE=memory|file` 环境变量优先；路由逻辑保持单一来源不动
- [x] 2.2 [Node.js] file 模式下注入共享 fileRepo（含种子数据对齐：products/categories/coupons 沿用既有种子、users 注入演示用户 `user_1001`、carts/orders/issuances/sessions 空文件初始化）
- [x] 2.3 [Node.js] memory 模式（`NODE_ENV=test`）保留既有行为：`/api/__test/reset`、`/api/__test/user-status`、`/api/__test/user-role` 测试后门仅 test 生效
- [x] 2.4 [Node.js] 收敛 `server.prod.js` 为薄壳：复用 `server.js` 的 `createServer({ storage: 'file' })`，保留端口 3002 与 `node:prod` 入口；删除其内部重复路由/仓储定义（消除漂移）

## 3. 持久化集成测试 (Persistence Integration Tests)

- [x] 3.1 [Node.js] `__tests__/persistence.spec.js`（@api）：临时 `data/` 目录 + 两次 `createServer({storage:'file'})` 模拟进程重启 → 断言注册用户/会话/订单/购物车重启后可恢复、登录可成功
- [x] 3.2 [Node.js] 断言运行链路写操作落盘：注册/下单/支付后 `users.json`/`sessions.json`/`orders.json` 含对应记录；`NODE_ENV=test` 时 `data/` 零写入

## 4. 持久化 E2E 旅程 (Persistence E2E Journey)

- [x] 4.1 [E2E] 新增 `e2e-tests/features/persistence.feature`：以 `STORAGE=file` 拉起后端 → 注册/登录/下单支付 → **进程级重启** → 验证登录态保持（原会话凭证有效）、历史订单可见、状态与重启前一致
- [x] 4.2 [E2E] 实现对应 cucumber steps（spawn/restart/清理），并新增 `init.sh e2e:persist`（或等价脚本入口）负责文件存储后端的拉起/重启编排
- [x] 4.3 [E2E] 既有 `init.sh e2e:run`（`NODE_ENV=test` 内存语义）回归全绿，与新持久化 E2E 互不干扰
- [ ] 4.4 [E2E] **补齐 smoke 完整主链路**（smoke 覆盖缺陷修复）：`smoke.feature` 由「仅 storefront load」扩展为覆盖**交易主链路一体化场景**——注册新账户自动登录 → 选购加购两件商品 → 自动推荐最优优惠券并结算 → 模拟支付 → 我的订单显示已支付订单。复用/补齐既有 steps（注册/加购/结算/支付/我的订单），在 `NODE_ENV=test` + reset 隔离下运行，`./init.sh e2e:run` 回归全绿

## 5. 文档同步 (Docs Sync)

- [x] 5.1 [文档] 更新 `docs/ARCHITECTURE.md` 第 37-39 行持久化章节：由「开发=内存 / 生产=文件」改为「运行链路默认 FileStore 文件持久化（`npm start` 即落盘 `data/*.json` 全部 8 类数据）；`NODE_ENV=test` 内存隔离；`server.prod.js` 为 file 存储兼容入口（端口 3002）」
- [x] 5.2 [文档] 确认 `.gitignore` 对 `data/*.json` 运行态产物的处理（保留种子或忽略运行数据，随实施现状调整并说明）
- [x] 5.3 [文档] 判定记录：`AGENTS.md` / `.trae`·`.cursor`·`.agents` 三目录 / `opencode.jsonc` 无需同步（不涉 SDD 工作流与存储实现），写入归档说明

## 6. 全链路验证 (Full Verification)

- [x] 6.1 [全部] 运行 `openspec validate fix-data-persistence`（含 spec delta 校验）PASS
- [x] 6.2 [Node.js] `./init.sh node:test`（Node 测试套件全绿，含新增持久化集成测试）
- [x] 6.3 [全部] `./init.sh test:all`（Node + Python 回归全绿，Python 无行为变更）
- [x] 6.4 [Vue] `./init.sh vue:build` 前端构建 PASS（无 UI 变更，回归确认）
- [x] 6.5 [E2E] `./init.sh e2e:run` 既有 24 场景回归全绿；`./init.sh e2e:persist` 持久化旅程 PASS
- [x] 6.6 [Node.js] 手动/脚本验证：`npm start` 后执行注册+下单，确认 `data/` 下 8 类文件（含 users/sessions/issuances）真实生成且内容正确

## 7. 收尾 (Closure)

- [x] 7.1 [全部] 将结果写入 `verify.md`（硬门禁证据 + E2E 摘要 + 技术债登记：Python 端持久化、双文件历史遗留清理）
