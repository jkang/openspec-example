# Design: fix-data-persistence

## Context (上下文)

提案 `proposal.md`（Why/What）已明确：ROADMAP 与主 specs 承诺「JSON 文件持久化真实数据落地」，但运行链路（前端 → Vite 代理 `localhost:3000` → `npm start` → `server.js`）注入的是 `memoryRepo.js` 纯内存仓储，用户操作全部不落盘；`server.prod.js` 虽有 FileStore 实现却未接线且与 dev 版严重漂移。

**现状事实**（代码勘察）：
- `server.js`：`createServer()` 硬编码实例化 8 个 memoryRepo（Product/Cart/Order/Coupon/Issuance/Category/User/Session），启动时注入种子数据；路由功能最新最全（含 categories CRUD、checkout、payments、admin orders、admin users、auth、测试后门）。
- `server.prod.js`：自建 `FileRepoAdapter`/`UserFileRepo`/`SessionFileRepo`，用 `FileStore` 落盘 `data/*.json`；但路由明显落后（缺 categories CRUD、product PUT/DELETE、cart/remove、checkout、payments、admin orders ship/cancel、orders/:id），`CatalogService` 注入不完整，且**从未产生 `users.json`/`sessions.json`/`issuances.json`**。
- `data/`：仅 products/categories/coupons 有数据（8 月 22 日前），carts/orders 为空数组，无 users/sessions/issuances。
- 前端 Vite 代理固定指向 `localhost:3000`；`init.sh node:start` = `npm start`（内存），`node:prod` = `start:prod`（端口 3002，从未被前端消费）。
- `init.sh e2e:run` 以 `NODE_ENV=test npm start` 拉起后端（内存 + reset 后门），E2E 全部依赖内存语义。

## Root Cause Analysis (根本原因分析)

**Bug：规范已承诺持久化，运行链路未兑现。**

1. **主链路未接线（根因）**：`server.js` 只提供内存仓储实现，`FileStore`/FileRepo 逻辑孤立存在于 `server.prod.js`；前端与默认启动链路只访问 3000（内存），3002（文件）从未被消费。持久化是「写了但没接通」的僵尸能力。
2. **双文件漂移（结构性根因）**：`server.js` 与 `server.prod.js` 各维护一份路由/服务实例化，Phase 4（账户体系）只增强 dev 版，prod 版未同步 → 即使接线 3002 也会缺路由，无法作为可用入口。
3. **无验证兜底**：无任何测试（单测/集成/E2E）覆盖「写操作落盘」「重启后恢复」，`users.json`/`sessions.json` 从未被创建却无人察觉 → ROADMAP 声称已交付。
4. **文档漂移**：`docs/ARCHITECTURE.md` 记载「开发=内存/生产=文件」，默认启动链路（`npm start`）被文档归类为「开发」→ 团队默认内存态合理，掩盖了「运行链路应落盘」的契约。

**修复策略**：以「单一服务实现 + 存储后端选择」消除结构性根因（不再维护两份路由），默认运行链路启用文件存储，`NODE_ENV=test` 保留内存隔离，并补持久化验证兜底。

## Domain Boundary Impact (领域边界影响)

- 本能力为**横切基础设施**，不改变任何 BC 的业务规则（`domain_model.html` 的 5 个 BC 及 edges 语义不变：Catalog 提供价格/库存事实、Cart 快照、Coupon 决策、Order 审计锁定、User 归属主体）。
- 持久化承载各 BC 的「事实」读写（`sb-*` 已隐含 SB-BACKSTAGE 持久化语义），本次仅修复这些事实的落盘机制，治理边界归属不迁移。
- **新增 taxonomy**：`data-persistence` 作为横切 capability 登记到治理层（Domain Model Sync Assessment 见下），不抢占任何 BC 的专属 capability 路径。

## Process Delta (流程影响)

- 无新增/修改业务流程节点：L1-01~L1-06 / L2-01~06 / L3-01~06 的行为语义不变。
- **支撑修复**：L3 各「规则环节」依赖的数据读写从「进程内存」变为「文件持久化」，流程终点（数据沉淀）真正成立——这是对既有流程的事实支撑修复，非流程变更。

## Service Blueprint Sync Assessment (服务蓝图同步评估)

- **Needs Sync**: **No**（显式 No-op）
- **Trigger Type**: N/A
- **Evidence Source**: `proposal.md` / `specs/data-persistence/spec.md`
- **理由**：本变更修复的是 `SB-BACKSTAGE-01/03/04/06` 已声明的「持久化」支撑未在运行链路生效的缺陷，**不新增、不移除、不重排任何蓝图节点，capability 分布与状态不变**（持久化在蓝图中早已存在）。蓝图无需更新，仅 ARCHITECTURE 文档需同步。

## Domain Model Sync Assessment (领域模型同步评估)

- **Needs Sync**: **Yes**
- **Trigger Type**: Capability taxonomy 新增（横切支撑）
- **Evidence Source**: `proposal.md` Capabilities 章节 / `specs/data-persistence/spec.md` Governance Mapping
- **Planned Baseline Update**: 在 `docs/baseline/domain_model.html` 的「Bounded Context → Capability Mapping」治理层新增一条横切 taxonomy 条目 `data-persistence`（挂载说明：横切支撑 Catalog/Cart/Coupon/Order/User 的事实读写），并同步 Last Updated 时间戳。
- **执行时机**：遵循分层 Sync 原则，本 change 归档时由 lead 评估执行轻量回流（独立 Bug Fix，无进行中 Epic 可依附；为保证基线与 specs 一致，归档时触发一次最小 Domain Model 更新）。

## Goals / Non-Goals (目标与非目标)

- **Goals**:
  - 运行链路（`npm start` / `init.sh node:start`）默认 FileStore 落盘全部 8 类业务数据。
  - 消除 `server.js`/`server.prod.js` 双文件路由漂移（路由单一来源，存储可切换）。
  - 新增持久化验证：写操作落盘 + 服务重启后数据可恢复（集成 + E2E）。
  - 同步更新 `docs/ARCHITECTURE.md` 持久化章节。
- **Non-Goals**:
  - 不引入第三方数据库/ORM（保持零依赖，JSON 文件存储）。
  - 不改变任何 API 契约与前端行为（C 端/B 端可观察行为不变）。
  - 不做 Python 端（`ecommerce-mini-python`）持久化（功能不完整且非 E2E 依赖，登记后续技术债）。
  - 不修改 SDD 工作流 skills/commands（`.trae`/`.cursor`/`.agents` 三目录无需同步）。

## Architecture (架构方案)

### 存储后端选择（Server.js 统一入口）

```
NODE_ENV=test ──────────────► storage = memory   （测试隔离，保留 reset 后门）
STORAGE=file / 默认（运行）──► storage = file     （FileStore 落盘 data/*.json）
STORAGE=memory（显式）──────► storage = memory
```

- `server.js`：`createServer({ storage })`，storage 缺省时按上述规则解析；repo 实例化按 storage 分支（memory → `memoryRepo.js`；file → `fileRepo.js` 共享适配层）。**路由逻辑保持单一来源不动**。
- `server.prod.js`：收敛为薄壳——`createServer({ storage: 'file' })`，保留端口 3002 与 `node:prod` 入口兼容；不再维护第二份路由。

### 共享仓储适配层（新增 `src/repo/fileRepo.js`）

从 `server.prod.js` 提取并泛化：

- `FileRepoAdapter`：通用 FileStore 适配（`save/findById/findAll/findByUserId/countByTemplateId`），覆盖 products/categories/coupons/orders/carts(keyField=userId)/issuances。
- `UserFileRepo`（序列续号 + `findByPhone`）与 `SessionFileRepo`（token 键控 + create/findByToken/delete）迁移至此，供 AuthService 消费。
- `FileStore` 增强：首次启动自动初始化缺失文件；目录不存在时创建；加载失败安全降级。

### 测试与 E2E

- **集成测试**（`__tests__/persistence.spec.js`，@api）：临时 `data/` 目录 + 两次 `createServer({storage:'file'})` 模拟进程重启，断言用户/会话/订单/购物车恢复。
- **E2E 持久化旅程**（`e2e-tests/features/persistence.feature`，@e2e）：以 `STORAGE=file` 拉起后端 → 写数据 → **进程级重启** → 验证登录态与历史订单。编排：`init.sh e2e:persist`（或独立脚本）负责文件存储后端的拉起/重启/清理。
- 既有 E2E（`init.sh e2e:run`）保持 `NODE_ENV=test` 内存语义不变，互不干扰。

### 种子数据与数据文件

- file 模式首次启动：products/categories/coupons 沿用既有种子（对齐现有 `data/*.json` 内容）；users 注入演示用户 `user_1001`（对齐现有 `initialUsers`）；carts/orders/issuances/sessions 初始为空文件。

## Key Decisions (关键决策)

| 决策 | 选项 | 选择 | 理由 |
| :--- | :--- | :--- | :--- |
| 存储入口 | A. 双文件分别维护 B. server.js 统一 + 存储可切换 | **B** | 消除结构性漂移根因；路由单一来源，未来增强只改一处 |
| 默认存储 | A. 默认 memory（保持现状） B. 运行默认 file | **B** | 兑现 ROADMAP/规范承诺；`NODE_ENV=test` 显式回退内存保测试隔离 |
| server.prod.js 处置 | A. 删除 B. 收敛为 file 薄壳 | **B** | 保留 `node:prod`/3002 入口兼容，避免破坏既有调用习惯 |
| 验证形式 | A. 仅集成测试 B. 集成 + 进程级重启 E2E | **B** | 重启恢复是验收核心，须有真实进程级证据 |
| Python 端持久化 | A. 本次纳入 B. 登记技术债 | **B** | 功能不完整、非 E2E 依赖，控制 scope |

## 受影响文件清单

- `ecommerce/ecommerce-mini/src/http/server.js`（存储选择 + 统一入口）
- `ecommerce/ecommerce-mini/src/http/server.prod.js`（收敛薄壳）
- `ecommerce/ecommerce-mini/src/repo/fileRepo.js`（新增共享适配层）
- `ecommerce/ecommerce-mini/src/persist/fileStore.js`（初始化/降级增强）
- `ecommerce/ecommerce-mini/data/`（运行态产物；确认 `.gitignore` 是否应忽略运行数据）
- `ecommerce/ecommerce-mini/__tests__/persistence.spec.js`（新增集成测试）
- `e2e-tests/features/persistence.feature` + steps（新增 E2E 旅程）
- `init.sh`（新增 `e2e:persist` 入口 / 或持久化启动编排）
- `docs/ARCHITECTURE.md`（持久化章节更新）
