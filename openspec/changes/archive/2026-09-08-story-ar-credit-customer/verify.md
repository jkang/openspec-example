# Verify: story-ar-credit-customer

> 关联 proposal/specs/design/tasks：见 `openspec/changes/story-ar-credit-customer/`
> 关联需求侧：story.md（R-AR-001~005，已 HITL 确认）
> 验证日期：2026-09-08（用户授权全程自主；Phase 7 Story 1）

## Hard Gates (强制门禁)

| 门禁 | 结果 | 证据 |
| --- | --- | --- |
| `openspec validate story-ar-credit-customer` | ✅ PASS | spec/design/tasks 齐备（accounts-receivable 新增 taxonomy 主 spec + user-admin/frontend-ui 增量） |
| Node.js 单元 + API 测试 | ✅ PASS | 全量 275 tests / 49 suites 0 fail（含新增 9：应收生成单测 + 账期 API） |
| Python 测试 | ✅ PASS（skip_python） | 无 Python 改动 |
| 前端构建 | ✅ PASS | `vue:build` 成功（客户详情账期配置区） |

- Schema validate: PASS
- Node test: PASS
- Python test: PASS（skip）
- Frontend build: PASS
- E2E cucumber: PASS（72 scenarios 通过）

## Soft Gates (E2E cucumber)

| 门禁 | 结果 | 证据 |
| --- | --- | --- |
| `./init.sh e2e:run` | ✅ PASS | **68 scenarios / 364 steps 全部通过**：新增 `accounts_receivable.feature` 3 个 credit-customer 契约场景（账期发货自动转应收 / 现结回归 / 账期配置权限）+ 既有 65 场景全量回归 |
| E2E 覆盖完整性 | ✅ FULL | 新旅程（账期客户免现结 → 发货 → 应收生成 + 权限）全部有 feature+steps 承接；smoke/现结回归不受影响 |

## 验证细节

### 单元/API（@unit/@api）
- `AccountsReceivableService.onOrderShipped`：账期客户（creditDays>0）发货 → 生成应收（金额=actualPaidCents、dueDate=发货日+creditDays、receivedCents=0、一单一应收幂等）；现结（0）不生成。
- `assertCreditDays`（0~365 整数校验）；`addDaysYMD`。
- API：`PUT /api/admin/users/:id/credit-days`（仅运营，老板/客服/未登录 403）；下单/checkout 路由对账期客户自动信用放行（免客户端模拟支付 → PAID）；users list/detail 返回 creditDays；发货路由 ship 响应含 receivable。

### E2E（@e2e）
- 账期客户订单发货 → 应收生成（金额/已回 0/到期日=发货日+45/未回款）；用户详情可见账期；现结回归；配置权限。

### 视觉验证闭环（静态自检）
- [x] 客户详情「账期（应收）」配置区（现结客户/账期客户 N 天徽标 + 数字输入 + 保存）；ZAPP 令牌、无圆角阴影、真实中文数据
- ⚠️ 浏览器 MCP 不可用，以静态自检 + E2E DOM/API 断言覆盖

## 结论

- Story 1 `story-ar-credit-customer`（账期客户与应收生成）**验证通过**：Hard Gates 全 PASS、E2E 68 场景全绿。
- 下一步：Spec Sync → Archive → receipt-entry Story 2。
