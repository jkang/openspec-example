## 1. C 端首页文案中文化 (Frontend)

- [x] 1.1 [Frontend] `App.vue` store 视图：购物车按钮 `BAG` → 「购物车」，商品卡片按钮 `ADD TO CART` → 「加入购物车」
- [x] 1.2 [Frontend] `App.vue` Cart 侧栏：标题 `Cart (n)` → 「购物车 (n)」、`CLOSE` → 「关闭」、空状态 `Empty` → 「购物车为空」、删除 `Del` → 「删除」
- [x] 1.3 [Frontend] `App.vue` 结算区：`Complete Checkout` → 「确认结算」、`Processing...` → 「处理中...」；空结果区删除英文 `No Results Found`（保留中文「未找到相关商品」）

## 2. 结算弹窗与 B 端后台中文化 (Frontend)

- [x] 2.1 [Frontend] `App.vue` 成功弹窗标识 `SUCCESS` → 「下单成功」
- [x] 2.2 [Frontend] `App.vue` 新增 `statusLabel(status)` 枚举映射（`ACTIVE→生效中`、`USED→已使用`、`UNUSED→未使用`、`EXPIRED→已过期`），优惠券列表状态列由 `{{ coupon.status }}` 改为映射输出
- [x] 2.3 [Frontend] `App.vue` 最近发放记录券状态 `UNUSED` → 「未使用」

## 3. 页面语言声明与标题 (Frontend)

- [x] 3.1 [Frontend] `index.html`：`lang="en"` → `lang="zh-CN"`，`<title>` 改为中文（如「极简电商」）

## 4. 浏览器验证闭环 (Frontend / Harness)

- [x] 4.1 [Harness] 运行 `./init.sh vue:start` 启动 Vite，无报错
- [x] 4.2 [Frontend] 浏览器快照核对：首页/Cart 侧栏/结算按钮/成功弹窗/后台状态列均无英文交互文案（品牌名与 FLAT/PERCENTAGE/ACTIVE 括号标注除外）
- [x] 4.3 [Frontend] 交互验证：搜索无结果空状态、加购/删减、结算成功弹窗、后台状态列显示
- [x] 4.4 [Harness] 回归验证：运行 `./init.sh test:all` 确保 Node/Python 后端测试不受影响
- [x] 4.5 生成 `verify.md` 记录验证证据（快照与截图）
