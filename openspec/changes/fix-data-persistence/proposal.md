# Proposal: fix-data-persistence

## Why (背景原因)

ROADMAP 将「JSON 文件持久化（products/categories/coupons/orders/carts/users/sessions）真实数据落地」列为**已交付的 Baseline 能力**，且 `openspec/specs/` 已明确承诺「生产环境 `sessions.json` FileStore 持久化」（user-session）与「商品/分类/券规则持久化」（SB-BACKSTAGE-01/03/04/06）。但当前**主运行链路（前端 → Vite 代理 → `npm start` 的 `server.js` 端口 3000 → `memoryRepo.js`）纯内存态**：加购、下单、支付、注册、登录、商品/分类/券 CRUD 全部不落盘，服务重启即清零（实测：注册成功但 `data/` 目录零变化，`users.json`/`sessions.json` 从未产生）。`server.prod.js`（FileStore 实现）存在但未接线且已与 dev 版漂移（缺 categories CRUD、product PUT/DELETE、cart/remove、checkout、payments、admin orders 等路由）。这是「规范已承诺、实现未兑现」的 Bug Fix，需让 JSON 持久化真正接入运行链路。

## What Changes (变更内容)

- [FIX] 主运行链路接入文件持久化：`server.js` 统一支持存储后端选择（`STORAGE=file|memory`），**运行链路（`npm start`）默认启用 FileStore 落盘**；`memory` 模式仅保留给测试隔离（`NODE_ENV=test`）。
- [FIX] 对齐 `server.prod.js` 与 dev 版路由/服务注入，消除双文件漂移：补齐 categories CRUD、`GET /api/products/:id`、`PUT/DELETE /api/products/:id`、`POST /api/cart/remove`、`POST /api/checkout`、`POST /api/payments/:id`、`GET /api/admin/orders`（含 ship/cancel）、`GET /api/orders/:id`、admin coupons/issuances 等已存在于 dev 的全部端点。
- [FIX] `sessions.json`/`users.json`/`issuances.json` 在运行链路首次启动时正确初始化，`data/` 目录 8 类业务数据全部真实落盘。
- [TEST] 新增持久化 E2E 旅程：注册/下单/支付后**重启服务**，数据（用户/订单/购物车/会话）仍可恢复；既有 memory 模式的测试隔离语义保持不变。

## Capabilities (系统能力)

### 受影响边界 (Impacted Bounded Contexts)

- [x] Catalog Context（商品/分类持久化）
- [x] Cart Context（购物车持久化）
- [x] Coupon Context（券规则/发放持久化）
- [x] Order Context（订单/支付持久化）
- [x] User Context（用户/会话持久化）

### 流程对齐 (Process Alignment)

- [x] 横切支撑：持久化承载全部业务事实，覆盖 L1-01 触达与发现 / L1-02 评估与决策 / L1-03 加购与准备 / L1-04 下单结算 / L1-05 支付确认 / L1-06 履约与完成，及 L2-01~06 / L3-01~06 全部数据读写环节（对齐 `business_process.html`）。

### 服务蓝图对齐 (Service Blueprint Alignment)

- [x] `SB-BACKSTAGE-01/03/04/06`（商品/分类/券规则/订单接口持久化）：**REUSE** 既有蓝图语义，本次是修复这些节点已承诺的「持久化」支撑未在运行链路生效的缺陷。
- [x] `SB-STAGE-01~06` 与 `SB-CUSTOMER-*` / `SB-OPS-*`：**REUSE**，C 端/B 端用户可观察行为不变（接口语义不变），仅数据生命周期从「进程内」变为「文件级」。

### 新增能力 (New Capabilities)

- [x] `specs/data-persistence/spec.md` —— **新增 taxonomy（横切支撑）**：既有 specs 将持久化语义零散分布于 catalog/coupon/order/user-session 各 capability，但无统一行为契约声明「运行链路默认文件持久化 + 服务重启后数据可恢复」。本次修复将该契约统一为独立横切 capability（对齐 `domain_model.html` 中 5 个 BC 以「事实」协作的语义），避免在各域 spec 重复声明。理由充分，属基线新增 taxonomy，将触发 Domain Model Sync Assessment。

### 修改能力 (Modified Capabilities)

- [ ] 无（既有 user-session/catalog/coupon/order 的持久化承诺保持成立，`data-persistence` 作为其统一支撑契约，不改变既有 Requirement 语义）

## Impact (影响范围)

- **Node.js 实现（主要）**：`ecommerce/ecommerce-mini/src/http/server.js`（存储后端选择 + 路由单一来源）、`src/http/server.prod.js`（收敛为复用 `server.js` 的 file 存储入口，消除漂移）、`src/repo/fileRepo.js`（新增：FileStore 适配层，从 server.prod.js 提取共享）、`src/repo/memoryRepo.js`（保留，测试隔离）、`src/persist/fileStore.js`（复用）、`data/*.json`（运行态产物，gitignore 需确认）。
- **E2E**：`e2e-tests/features/` 新增持久化旅程（重启后数据可恢复）；`init.sh`/`e2e-tests` 需支持以 file 存储拉起后端以验证重启恢复。
- **文档同步（本次一并更新）**：
  - `docs/ARCHITECTURE.md` 第 37-39 行「持久化」章节：由「开发=内存 / 生产=文件」更新为「运行链路默认 FileStore 文件持久化，`NODE_ENV=test` 内存隔离」。
  - **判定无需同步**：`AGENTS.md`（SDD 流程引导，不描述存储实现）；`.trae/`、`.cursor/`、`.agents/` 三目录（仅含 SDD skills/commands，不涉存储实现，跨工具一致性约束不触发）；`opencode.jsonc`（仅 MCP 配置）；repo 内**无 `.config` 目录**（若指 `~/.config/opencode/` 全局配置，项目级不触碰）。
- **Python 实现 / Vue 前端**：无行为变更（API 契约不变）；Python 端（`ecommerce-mini-python`）同为 MemoryRepo 但功能不完整且 E2E 不依赖，持久化纳入后续技术债登记，不在本 change 范围。
- **流程分支**：Bug Fix，不涉及 UI 变更 → 跳过 Prototype；有行为变更（数据生命周期）→ 生成 specs（新增 `data-persistence`），随后 spec-design → apply → verify → sync → archive。
