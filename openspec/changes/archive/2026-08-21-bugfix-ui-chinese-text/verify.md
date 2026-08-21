## Purpose

为本次变更（全站 UI 英文文案中文化）的 apply 提供可审计的本地验证证据，防止 sync 之前仍存在英文文案残留或核心链路回归。

## Scope

- 覆盖：`ecommerce/ecommerce-mini-frontend/src/App.vue`、`ecommerce/ecommerce-mini-frontend/index.html`
- 验证目标：C 端首页 / 结算成功弹窗 / B 端后台全部用户可见文案为中文；页面语言声明为 `zh-CN`；后端回归无损。

## Hard Gates

- **Schema validate**: PASS (2026-08-21, `openspec validate bugfix-ui-chinese-text` → valid, 0 issues)
- **Node test**: PASS (23 passed, `./init.sh test:all`)
- **Python test**: PASS (12 passed, `./init.sh test:all`)
- **Frontend dev server**: PASS (`./init.sh vue:start` → Vite ready, 无报错)

## Soft Gates

- **E2E cucumber**: SKIPPED — 环境未安装 cucumber-js（需 `./init.sh e2e:install`，超出本变更范围）；其断言（storefront 加载 + `Minimal Store` 品牌名）已由 Playwright 全链路验证等价覆盖。

## Evidence Index

- **关联文件**:
  - [App.vue](file:///Users/superkkk/MyCoding/OpenSpec-practice/ecommerce/ecommerce-mini-frontend/src/App.vue)
  - [index.html](file:///Users/superkkk/MyCoding/OpenSpec-practice/ecommerce/ecommerce-mini-frontend/index.html)
- **浏览器验证脚本**: `/tmp/verify_zh_ui.py`（Playwright，headless chromium，1440×900）
- **截图证据**: `/tmp/homepage_zh.png`（首页）、`/tmp/admin_zh.png`（B 端后台）、`/tmp/success_modal_zh.png`（结算成功弹窗）
- **关键断言**（Playwright 实测结果）:
  - [x] 首页无 `BAG` / `ADD TO CART` / `Cart (n)` / `CLOSE` / `Empty` / `Del` / `Complete Checkout` / `Processing...` / `No Results Found` → 英文 UI 文案残留：无
  - [x] 搜索空状态仅显示「未找到相关商品」，无 `No Results Found`
  - [x] 成功弹窗显示「下单成功」，无 `SUCCESS`
  - [x] B 端后台发放记录显示「未使用」，无原始 `UNUSED`；券列表状态经 `statusLabel()` 映射（种子数据均为 UNUSED，ACTIVE 映射已实现：`ACTIVE→生效中`）
  - [x] `index.html` `lang="zh-CN"` 且标题为「极简电商」
  - [x] 品牌名 `Minimal Store` 与 `(FLAT)` / `(PERCENTAGE)` / `(ACTIVE)` 括号标注保留（豁免项）
  - [x] 控制台无 error 日志（Node 后端 3000 已启动，`/api` 代理 502 消除）
