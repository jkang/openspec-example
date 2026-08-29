const { When } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');

// ==================== 冒烟交易主链路（smoke.feature 完整闭环）====================
// 仅补足 smoke 主链路缺的衔接步骤，命名通用、不与既有 feature 步骤冲突。
// 其余链路步骤全部复用：注册（account_register.js）、加购/结算/支付/我的订单（ui_steps.js）。
// 运行于 ./init.sh e2e:run（NODE_ENV=test 内存 + reset 隔离）。

// 注册成功横幅页「返回店铺」：回到 C 端店铺并等待商品列表加载（供后续选购/加购衔接）
When('用户返回店铺首页', async function () {
  await this.page.locator('button:has-text("返回店铺")').click();
  await this.page.waitForSelector('button:has-text("加入购物车")');
});

// 通用多件加购：第 N 件商品（N 从 1 起）。与既有「第一个商品加入购物车」步骤互补，
// 供两件及以上加购场景复用。以购物车角标数量断言等待服务端同步，避免与后续断言竞态。
When(/^用户将第 (\d+) 件商品加入购物车$/, async function (n) {
  const index = parseInt(n, 10) - 1;
  expect(index).toBeGreaterThanOrEqual(0);
  await this.page.locator('button:has-text("加入购物车")').nth(index).click();
  await expect(this.page.locator('header button:has-text("购物车") span')).toHaveText(String(n), { timeout: 10000 });
});

// 关闭下单成功模态框（继续购物）→ 返回店铺，供「我的订单」等后续步骤衔接
When('用户点击"继续购物"', async function () {
  const modal = this.page.locator('div.fixed.inset-0');
  await modal.locator('button:has-text("继续购物")').click();
  await modal.waitFor({ state: 'detached' });
});
