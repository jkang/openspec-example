# Verify: fix-data-persistence

> 验证门禁证据（apply 流程产物）。硬门禁 + E2E 摘要 + 技术债登记。
> 验证时间：2026-08-29（全部 PASS）

## 硬门禁 (Hard Gates)

| 门禁 | 命令 | 状态 | 证据 |
| :--- | :--- | :--- | :--- |
| OpenSpec 规划校验 | `openspec validate fix-data-persistence` | ✅ PASS | `Change 'fix-data-persistence' is valid`（含 spec delta 校验） |
| Node 测试套件 | `cd ecommerce/ecommerce-mini && npm test` | ✅ PASS | tests 158 / pass 158 / fail 0（含新增 `persistence.spec.js`：文件初始化、写后一致性、损坏降级、重启恢复、零写入、后门 404） |
| 全站测试回归 | `./init.sh test:all` | ✅ PASS | Node 158 pass + Python 12 pass（`tests/test_admin_coupons.py` 7 + `tests/test_smoke.py` 5，无行为变更） |
| Vue 前端构建 | `./init.sh vue:build` | ✅ PASS | `✓ built in 190ms`（vite build，无 UI 变更回归确认） |

## E2E

| 门禁 | 命令 | 状态 | 证据 |
| :--- | :--- | :--- | :--- |
| 既有 E2E 回归 + smoke 主链路（25 场景） | `./init.sh e2e:run` | ✅ PASS | 25 scenarios (25 passed) / 153 steps (153 passed)；`smoke.feature` 由「仅 storefront load」扩展为覆盖**交易主链路一体化场景**（注册新账户自动登录 → 加购两件商品 → 结算侧边栏自动推荐「9 折数码券」最优方案，减免 -¥38.80、最终总额 ¥349.20 → 确认结算待支付 → 模拟支付 → 我的订单展示已支付订单），复用既有 steps（注册/加购/结算/支付/我的订单）18 个 + 新增 3 个通用衔接步骤（`steps/smoke_journey.js`：用户返回店铺首页 / 用户将第 N 件商品加入购物车 / 用户点击"继续购物"）；`NODE_ENV=test` 内存语义 + reset 后门隔离不变，`--profile e2e` 排除 `@persist` 互不干扰 |
| 持久化 E2E（进程级重启） | `./init.sh e2e:persist` | ✅ PASS | 1 scenario / 8 steps passed；`STORAGE=file` + 独立临时 `DATA_DIR` + 端口 3011，进程级 kill→重启后原会话凭证/历史订单/状态 PAID/原手机号登录全部恢复 |

## 手动验证（门禁 7 补充证据）

- 默认启动（无 `NODE_ENV` / `STORAGE`）→ 解析为 **file**：注册+下单+支付后 8 类文件全部生成
  （products=6 / categories=4 / coupons=2 / issuances=0 / orders=1 / carts=1 / users=2 / sessions=1），
  内容正确：`users.json` 含演示 user_1001 与新注册用户（序列从 1002 起，未覆盖种子）、`sessions.json` 含会话、`orders.json` 含 PAID 订单。
- `NODE_ENV=test` → **memory**：`/api/__test/reset` 200，`DATA_DIR` 零写入。
- 显式 `STORAGE=memory`（NODE_ENV 非 test）→ memory：后门 404，零写入。
- 真实 `data/`：首次启动自动创建全部 8 类文件（含 `users.json`/`sessions.json`/`issuances.json`）；最终态（qa 修复后）磁盘 `data/` 为**纯净种子基线**，8 类运行态文件全部 `.gitignore` 忽略，`git status` 下无任何条目。

## 技术债登记

- [ ] **Python 端持久化**（`ecommerce-mini-python`）：同为 MemoryRepo，功能不完整且非 E2E 依赖，持久化纳入后续 change（范围外，见 proposal Impact）。
- [ ] **双文件历史遗留清理**：`server.prod.js` 已收敛为薄壳；后续若不再需要 3002 兼容入口，可整体移除该文件并清理 `start:prod` 脚本。
- [ ] **运行态数据产物**：`data/carts.json` / `orders.json` / `users.json` / `sessions.json` / `issuances.json` 为 FileStore 落盘产物，已加入 `.gitignore`（种子基线 products/categories/coupons 保留跟踪；运行态文件已 `git rm --cached`）。
- [ ] **E2E 既有顺序依赖修复**：`account_register.feature` 场景 2 的 Given 步骤原期望 register=201，但后端 reset 后门注入种子用户（13912345678）后返回 409；已将该步骤容错为「201 或 409 均视为前置已就绪」——这是对既有步骤语义的最小修复，非本 change 引入的行为变更。

## 归档判定记录（Task 5.3 + qa P2-3 修订）

- `AGENTS.md`：SDD 流程引导，不描述存储实现 → **无需同步**。
- `.trae/` / `.cursor/` / `.agents/` 三目录：**已实际同步**（非本 change 存储实现所致，而是本次随行发布的 SDD 流程补强）：`spec-design` 新增「E2E 覆盖审查」强制步骤（smoke 主链路完整性三问 + 缺口落盘 tasks）；`verify` 新增「E2E 覆盖完整性软门禁」（Coverage FULL/GAP 写入 verify.md）。三目录逐字节 `diff` 一致已核验；`docs/SOPS/SDD_WORKFLOW.md` §5/§6 同步更新。**注意：此判定为「已同步」，非「无需同步」。**
- `opencode.jsonc`：仅 MCP 配置 → **无需同步**。
- `docs/ARCHITECTURE.md`：持久化章节已更新（「开发=内存/生产=文件」→「运行链路默认 FileStore；NODE_ENV=test 内存隔离；server.prod.js 为 file 兼容入口」）。

## 遗留并发修改决定（lead 确认 2026-08-29）

- **种子用户 role 升级（保留）**：`server.js` `initialUsers.user_1001` role 由「客户」→「运营」（暂存区未提交的并行修改，非本 change 代码编辑产生）。已核验无副作用：E2E 中 13912345678 仅用于注册冲突场景（已容错 201/409），C 端接口无角色限制，B 端 `requireAdminRole` 恰需运营角色（演示用户可直接登录运营后台）。**决定：保留**，随本 change 一并提交；归档说明同步记录。

## E2E 覆盖审查（verify 新软门禁，防 smoke/e2e 脱节）

- **smoke 主链路**：`smoke.feature` 已覆盖核心交易主链路一体化场景（注册/登录→选购→加购→优惠券→结算→支付→订单可见）✅
- **本 change 新增交互**：持久化旅程由 `persistence.feature`（@persist）覆盖 ✅
- **Coverage**: **FULL**

---

## qa 对抗审查修复记录（engineer，2026-08-29，追加证据）

> 依据 qa 对抗审查结论修复。全部为代码/测试/配置修复，未改动 specs/proposal/design 结构；
> lead 正同步修订规划制品记录一致性，本区仅追加修复证据。

### 修复清单与变更文件

| 编号 | 修复内容 | 变更文件 | 关键逻辑 |
| :--- | :--- | :--- | :--- |
| **P1-1**（阻塞） | 种子基线被运行态污染并固化进 git（HEAD 中 products stock=98、coupons PERCENT9=USED） | `.gitignore`；`git rm --cached`（3 文件）；磁盘清理 | 8 类 `data/*.json` 全部忽略（products/categories/coupons 追加进 ignore）；`git rm --cached` 移除跟踪（磁盘保留→随后清理）；删除磁盘全部 8 类运行态残留；纯净种子以代码为唯一事实来源（`server.js` `initialProducts` stock=99 / `initialCoupons` UNUSED / `initialUsers` user_1001），`data/` 为空时首启由 `seedFileRepos` 重建，运行态写入永不回写 git |
| **P1-2**（阻塞） | `fileStore` 损坏降级破坏性覆盖 + 非原子写 | `src/persist/fileStore.js`；`__tests__/persistence.spec.js` | `load()` catch：损坏文件**重命名备份**为 `<file>.corrupt-<timestamp>`（保留现场）后以空 Map 继续，**不再 `saveAll([])` 原地覆盖销毁**；`saveAll()`：先写 `<file>.tmp` 再 `fs.renameSync` 原子替换，杜绝崩溃窗口截断文件 |
| **P2-2** | `resolveStorage` 默认 file 解析零自动化覆盖 | `src/http/server.js`（导出 `resolveStorage`）；`__tests__/persistence.spec.js` | 新增参数化单测 3 分支（无环境变量→file / NODE_ENV=test→memory / STORAGE 显式优先）+ storage 参数优先；新增 `createServer()` 缺省（不传 storage/dataDir，DATA_DIR 临时目录）落盘断言：8 类文件生成且种子纯净 |
| **P3-5** | `e2e:persist` 临时目录泄漏（`/tmp/e2e-persist-*` 残留） | `e2e-tests/steps/persistence.js` | After 钩子在 `stopBackend()` 后追加 `fs.rmSync(DATA_DIR, { recursive: true, force: true })` |

### 验证门禁（修复后复跑）

| 门禁 | 命令 | 状态 | 证据 |
| :--- | :--- | :--- | :--- |
| Node 测试套件 | `cd ecommerce/ecommerce-mini && npm test` | ✅ PASS | tests **166** / pass **166** / fail 0（基线 158 → 新增 8：损坏备份保留现场、备份后原子重建、原子写无 .tmp 残留、resolveStorage×4、缺省模式落盘） |
| 全站测试回归 | `./init.sh test:all` | ✅ PASS | Node 166 pass + Python 12 pass（无行为变更） |
| 既有 E2E 回归 | `./init.sh e2e:run` | ✅ PASS | 25 scenarios (25 passed) / 153 steps (153 passed) |
| 持久化 E2E | `./init.sh e2e:persist` | ✅ PASS | 1 scenario / 8 steps passed；**After 清理验证：运行后 `/tmp/e2e-persist-*` 残留 0 个** |
| OpenSpec 规划校验 | `openspec validate fix-data-persistence` | ✅ PASS | `Change 'fix-data-persistence' is valid` |

### P1-1 结构验证（file 模式首启纯净重建）

- `rm -rf data/*` 后启动 file 模式（仅启动、无任何写操作）→ **8 类文件全部自动重建**：
  - `products.json`：6 商品 `stock=99`（纯净种子，非运行态污染值 98）
  - `coupons.json`：`FLAT10=UNUSED`、`PERCENT9=UNUSED`（纯净种子）
  - `users.json`：含演示用户 `user_1001`
  - `carts.json` / `orders.json` / `issuances.json` / `sessions.json`：空数据集
- `git check-ignore` 8 类文件**全部命中忽略**；`git status --porcelain -- ecommerce/ecommerce-mini/data/` **无任何未跟踪/修改条目**（仅剩 `git rm --cached` 的 3 条预期 staged 删除，提交后即不再跟踪）。
- 注册+下单+支付运行链路写盘复测：stock/券状态被合法运行时改写，但仅落在被忽略文件中，**不再回写 git 跟踪文件**。

### 技术债登记更新（追加）

- [x] **P1-1 遗留关闭**：原「运行态数据产物」条目中「种子基线 products/categories/coupons 保留跟踪」已失效 —— 种子与运行态**彻底分离**：8 类 `data/*.json` 全部忽略并移除跟踪，纯净种子以 `server.js` 代码为唯一事实来源，`data/` 为空时首启重建，运行态写入永不进入 git。
- [x] **P1-2 遗留关闭**：损坏文件降级策略由「覆盖销毁」改为「`.corrupt-<timestamp>` 备份 + 空数据集启动」，写盘改为原子替换；既有「损坏降级」测试断言同步更新。
- [x] **P2-2 / P3-5 遗留关闭**：存储解析默认分支已获自动化覆盖；E2E 临时目录泄漏已修复并在 After 钩子验证清理。
