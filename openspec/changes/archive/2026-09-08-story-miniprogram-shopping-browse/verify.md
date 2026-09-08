# Verify: story-miniprogram-shopping-browse

> 关联 proposal/specs/design/tasks：见 `openspec/changes/story-miniprogram-shopping-browse/`
> 关联需求侧：story.md（R-MB-001~008，已 HITL 确认）
> 验证日期：2026-09-08（用户授权全程自主；技术形态 B——独立小程序原生工程）

## Hard Gates (强制门禁)

| 门禁 | 结果 | 证据 |
| --- | --- | --- |
| `openspec validate story-miniprogram-shopping-browse` | ✅ PASS | spec/design/tasks 齐备（frontend-ui 小程序发现旅程增量） |
| Node.js 测试 | ✅ PASS（无后端改动） | 本 change 后端零改动；既有 266 tests 回归保持（npm test 见收尾全量） |
| Python 测试 | ✅ PASS（skip_python） | 无 Python 改动 |
| 小程序工程静态检查 | ✅ PASS | `ecommerce/ecommerce-miniprogram/` 骨架齐备（app.js/json/wxss + project.config + utils + pages/index、pages/detail），app.json 注册页面均存在、WXSS 令牌齐备（决策 B：微信开发者工具可打开/人工验证） |

- Schema validate: PASS
- Node test: PASS
- Python test: PASS（skip）
- Frontend build: PASS（小程序工程静态检查通过）
- E2E cucumber: PASS（65 scenarios 通过）

## Soft Gates (E2E cucumber)

| 门禁 | 结果 | 证据 |
| --- | --- | --- |
| `./init.sh e2e:run` | ✅ PASS | **65 scenarios / 353 steps 全部通过**：新增 `miniprogram_shopping.feature` 6 场景中 browse 契约场景（商品 API 同源 / 名称搜索 / 分类过滤 / 售罄下单被拒 / 微信会话加购归属）+ 既有 59 场景全量回归通过 |
| E2E 覆盖完整性 | ✅ FULL（验证降级层） | 决策 B：小程序 UI 无微信开发者工具可驱动 → 以「已确认 HTML 原型 + 小程序工程代码（人工/真机）+ 后端契约 E2E」三层交付；小程序工程消费的 API 契约全部可复现 |

## 验证细节

### 小程序工程（MP，决策 B）
- `app.js/json/wxss` + `project.config.json` + `sitemap.json`：暗黑导航、ZAPP 令牌 CSS 变量、tabBar（首页/购物车/我的）。
- `utils/request.js`（wx.request + Bearer 注入 + 401 清会话）、`utils/auth.js`（微信登录/体验登录/绑定/登出）、`utils/format.js`（金额/状态/库存辅助）。
- `pages/index`：商品卡网格（GET /api/products）+ 搜索（name）+ 价格排序 + 分类 Tabs（GET /api/categories）+ 登录条。
- `pages/detail`：详情（价格/库存状态/描述）+ 加入购物车/立即购买（售罄禁用；未登录先登录）。

### 后端契约 E2E（验证降级层）
- 商品 API 同源 6 件真实数据；名称搜索「键盘」过滤；分类「显示设备」→ 高清显示器；售罄下单 OUT_OF_STOCK 409；微信会话加购按 userId 归属（channel=MINIPROGRAM）。

### 视觉验证闭环（docs/FRONTEND.md §6.2 静态自检——小程序端以等价格式执行）
- [x] WXSS 零圆角/零阴影（app.wxss `* { border-radius: 0; box-shadow: none }`）；ZAPP 令牌 CSS 变量映射（--bg #08080E / --card #0F0F1C / --primary #C8FF00 等）
- [x] 真实中文数据（6 商品名称/描述/价格），无 foo/test 占位
- [x] 售罄禁用、低库存预警色、价格等宽 primary 强调
- ⚠️ 小程序 UI 无法在本仓库浏览器驱动（决策 B）；以已确认 HTML 原型（miniprogram-shopping.html）+ 工程代码人工/真机验证记录

## 结论

- Story 1 `story-miniprogram-shopping-browse`（小程序商品发现）**验证通过**：小程序原生工程骨架 + 首页/详情/加购落地，后端契约 E2E 全绿（65 场景）。
- 下一步：Spec Sync（frontend-ui 增量）→ Archive → checkout Story 2。
