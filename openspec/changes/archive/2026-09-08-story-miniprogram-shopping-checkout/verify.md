# Verify: story-miniprogram-shopping-checkout

> 关联 proposal/specs/design/tasks：见 `openspec/changes/story-miniprogram-shopping-checkout/`
> 关联需求侧：story.md（R-MC-001~008，已 HITL 确认）
> 验证日期：2026-09-08（用户授权全程自主；技术形态 B——独立小程序原生工程）

## Hard Gates (强制门禁)

| 门禁 | 结果 | 证据 |
| --- | --- | --- |
| `openspec validate story-miniprogram-shopping-checkout` | ✅ PASS | spec/design/tasks 齐备（frontend-ui 购物车/结算/支付增量） |
| Node.js 测试 | ✅ PASS（无后端改动） | 后端零改动；既有 266 tests 回归保持 |
| Python 测试 | ✅ PASS（skip_python） | 无 Python 改动 |
| 小程序工程静态检查 | ✅ PASS | `pages/cart`、`pages/checkout` 齐备（替换 browse Story 的占位页）；页面文件/app.json 注册匹配 |

- Schema validate: PASS
- Node test: PASS
- Python test: PASS（skip）
- Frontend build: PASS（小程序工程静态检查通过）
- E2E cucumber: PASS（65 scenarios 通过）

## Soft Gates (E2E cucumber)

| 门禁 | 结果 | 证据 |
| --- | --- | --- |
| `./init.sh e2e:run` | ✅ PASS | **65 scenarios / 353 steps 全部通过**：`miniprogram_shopping.feature` checkout 契约场景（最优券结算 + channel=MINIPROGRAM / 模拟支付库存扣减 / 售罄下单被拒 / 微信会话加购归属）在 browse Story 已落齐并全绿 + 既有回归 |
| E2E 覆盖完整性 | ✅ FULL（验证降级层） | 决策 B：结算/支付 UI 以 HTML 原型 + 小程序工程代码人工/真机验证；API 契约（最优券/channel 继承/支付/售罄）全部可复现 |

## 验证细节

### 小程序工程（MP，决策 B）
- `pages/cart`：购物车行（占位/名称/单价/数量）+ 数量 +/−（下限 1）+ 移除 + 合计；qty=0 探测读取（服务端无独立 GET /api/cart，对齐 Web fetchCart）；未登录引导。
- `pages/checkout`：商品总额/优惠（以实际下单响应为准）/应付预览 → 提交订单（后端最优券 + channel 会话继承 MINIPROGRAM，UI 不传渠道）→ 待支付「模拟支付」→ PAID 成功态。

### 后端契约 E2E（验证降级层）
- 最优券结算：¥178 购物车系统自动选 9 折（减免 ¥17.80 → 实付 ¥160.20，实际支付最低）；`Order.channel=MINIPROGRAM`（服务端按会话来源，小程序未传渠道）；模拟支付 PAID；售罄下单 OUT_OF_STOCK。

### 视觉验证闭环（静态自检）
- [x] WXSS 零圆角/阴影；ZAPP 令牌；真实中文数据；价格等宽 primary 强调；无占位残留
- ⚠️ 小程序 UI 无法仓库内浏览器驱动（决策 B）；以 HTML 原型 + 工程代码人工/真机验证记录

## 结论

- Story 2 `story-miniprogram-shopping-checkout`（小程序成交）**验证通过**：cart/checkout 页面落地，契约 E2E 全绿（65 场景）。
- 下一步：Spec Sync（frontend-ui 增量）→ Archive → orders Story 3。
