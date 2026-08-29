# Verify: fix-data-persistence

> 验证门禁证据（apply 流程产物）。硬门禁 + E2E 摘要 + 技术债登记。

## 硬门禁 (Hard Gates)

| 门禁 | 命令 | 状态 | 证据 |
| :--- | :--- | :--- | :--- |
| OpenSpec 规划校验 | `openspec validate fix-data-persistence` | ⏳ | 待运行 |
| Node 测试套件 | `cd ecommerce/ecommerce-mini && npm test` | ⏳ | 待运行 |
| 全站测试回归 | `./init.sh test:all` | ⏳ | 待运行 |
| Vue 前端构建 | `./init.sh vue:build` | ⏳ | 待运行 |

## E2E

| 门禁 | 命令 | 状态 | 证据 |
| :--- | :--- | :--- | :--- |
| 既有 E2E 回归（24 场景） | `./init.sh e2e:run` | ⏳ | 待运行 |
| 持久化 E2E（进程级重启） | `./init.sh e2e:persist` | ⏳ | 待运行 |

## 技术债登记

- [ ] **Python 端持久化**（`ecommerce-mini-python`）：同为 MemoryRepo，功能不完整且非 E2E 依赖，持久化纳入后续 change（范围外，见 proposal Impact）。
- [ ] **双文件历史遗留清理**：`server.prod.js` 已收敛为薄壳；后续若不再需要 3002 兼容入口，可整体移除该文件并清理 `start:prod` 脚本。
- [ ] **运行态数据产物**：`data/carts.json` / `orders.json` / `users.json` / `sessions.json` / `issuances.json` 为 FileStore 落盘产物，已加入 `.gitignore`（种子基线 products/categories/coupons 保留跟踪）。
