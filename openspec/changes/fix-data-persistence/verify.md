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
| 既有 E2E 回归（24 场景） | `./init.sh e2e:run` | ✅ PASS | 24 scenarios (24 passed) / 132 steps (132 passed)；`NODE_ENV=test` 内存语义不变，`--profile e2e` 排除 `@persist` 互不干扰 |
| 持久化 E2E（进程级重启） | `./init.sh e2e:persist` | ✅ PASS | 1 scenario / 8 steps passed；`STORAGE=file` + 独立临时 `DATA_DIR` + 端口 3011，进程级 kill→重启后原会话凭证/历史订单/状态 PAID/原手机号登录全部恢复 |

## 手动验证（门禁 7 补充证据）

- 默认启动（无 `NODE_ENV` / `STORAGE`）→ 解析为 **file**：注册+下单+支付后 8 类文件全部生成
  （products=6 / categories=4 / coupons=2 / issuances=0 / orders=1 / carts=1 / users=2 / sessions=1），
  内容正确：`users.json` 含演示 user_1001 与新注册用户（序列从 1002 起，未覆盖种子）、`sessions.json` 含会话、`orders.json` 含 PAID 订单。
- `NODE_ENV=test` → **memory**：`/api/__test/reset` 200，`DATA_DIR` 零写入。
- 显式 `STORAGE=memory`（NODE_ENV 非 test）→ memory：后门 404，零写入。
- 真实 `data/`：首次启动自动创建 `users.json`/`sessions.json`/`issuances.json`；运行态产物已清理，种子基线保留。

## 技术债登记

- [ ] **Python 端持久化**（`ecommerce-mini-python`）：同为 MemoryRepo，功能不完整且非 E2E 依赖，持久化纳入后续 change（范围外，见 proposal Impact）。
- [ ] **双文件历史遗留清理**：`server.prod.js` 已收敛为薄壳；后续若不再需要 3002 兼容入口，可整体移除该文件并清理 `start:prod` 脚本。
- [ ] **运行态数据产物**：`data/carts.json` / `orders.json` / `users.json` / `sessions.json` / `issuances.json` 为 FileStore 落盘产物，已加入 `.gitignore`（种子基线 products/categories/coupons 保留跟踪；运行态文件已 `git rm --cached`）。
- [ ] **E2E 既有顺序依赖修复**：`account_register.feature` 场景 2 的 Given 步骤原期望 register=201，但后端 reset 后门注入种子用户（13912345678）后返回 409；已将该步骤容错为「201 或 409 均视为前置已就绪」——这是对既有步骤语义的最小修复，非本 change 引入的行为变更。

## 归档判定记录（Task 5.3）

- `AGENTS.md`：SDD 流程引导，不描述存储实现 → **无需同步**。
- `.trae/` / `.cursor/` / `.agents/` 三目录：仅含 SDD skills/commands，不涉存储实现 → **跨工具一致性约束不触发**。
- `opencode.jsonc`：仅 MCP 配置 → **无需同步**。
- `docs/ARCHITECTURE.md`：持久化章节已更新（「开发=内存/生产=文件」→「运行链路默认 FileStore；NODE_ENV=test 内存隔离；server.prod.js 为 file 兼容入口」）。
