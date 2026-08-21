const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');

const STORE_URL = 'http://localhost:5173';

// ---------- 商品列表查看 ----------

Given('用户打开店铺首页', async function () {
  await this.page.goto(STORE_URL);
  await this.page.waitForSelector('button:has-text("加入购物车")');
});

Then('应看到商品列表', async function () {
  const count = await this.page.locator('button:has-text("加入购物车")').count();
  expect(count).to.be.greaterThan(0);
});

Then('每个商品卡片应包含商品图片', async function () {
  const firstImage = this.page.locator('main section img').first();
  await firstImage.waitFor();
  const src = await firstImage.getAttribute('src');
  expect(src).to.be.a('string').and.not.empty;
});

// ---------- 加入购物车 ----------

When('用户将第一个商品加入购物车', async function () {
  await this.page.locator('button:has-text("加入购物车")').first().click();
  // 等待服务端驱动状态同步回前端
  await this.page.waitForSelector('header button:has-text("购物车") span');
});

Then('购物车角标数量应变为 {int}', async function (count) {
  const badge = this.page.locator('header button:has-text("购物车") span');
  const text = await badge.textContent();
  expect(parseInt(text.trim(), 10)).to.equal(count);
});

Then('购物车侧边栏应显示该商品', async function () {
  const aside = this.page.locator('aside').first();
  const text = await aside.textContent();
  expect(text).to.not.contain('购物车为空');
});

// ---------- 结算 ----------

Given('用户已将商品加入购物车', async function () {
  await this.page.goto(STORE_URL);
  await this.page.waitForSelector('button:has-text("加入购物车")');
  await this.page.locator('button:has-text("加入购物车")').first().click();
  await this.page.waitForSelector('header button:has-text("购物车") span');
});

When('用户点击"确认结算"', async function () {
  await this.page.locator('button:has-text("确认结算")').click();
});

Then('系统应展示包含订单号的成功模态框', async function () {
  await this.page.waitForSelector('text=订单提交成功');
  const modalText = await this.page.locator('div.fixed.inset-0').textContent();
  expect(modalText).to.contain('订单编号');
  expect(modalText).to.match(/#\S+/);
});

Then('模态框中应有"继续购物"按钮', async function () {
  const button = this.page.locator('button:has-text("继续购物")');
  await button.waitFor();
  expect(await button.isVisible()).to.be.true;
});

// ---------- 优惠券结算 ----------

Then('结算侧边栏应自动推荐{string}为最优方案', async function (couponName) {
  const aside = this.page.locator('aside').first();
  const couponCard = aside.locator('button', { hasText: couponName });
  await couponCard.waitFor();
  const cardText = await couponCard.textContent();
  expect(cardText).to.contain('最优方案');
});

Then('优惠减免金额应为 {string}', async function (expected) {
  const discountRow = this.page.locator('aside').first().locator('div', { hasText: '优惠减免' }).first();
  await discountRow.waitFor();
  const text = await discountRow.textContent();
  expect(text.replace(/\s/g, '')).to.contain(expected.replace(/\s/g, ''));
});

Then('最终总额应为 {string}', async function (expected) {
  const total = this.page.locator('aside').first().locator('div', { hasText: '最终总额' }).first();
  await total.waitFor();
  const text = await total.textContent();
  expect(text.replace(/\s/g, '')).to.contain(expected.replace(/\s/g, ''));
});

// ---------- 运营后台（发券与发放记录回流） ----------

Given('用户进入运营后台', async function () {
  await this.page.goto(STORE_URL);
  await this.page.waitForSelector('button:has-text("加入购物车")');
  await this.page.locator('button:has-text("运营后台")').click();
  await this.page.waitForSelector('text=新建优惠券规则');
  await this.page.waitForSelector('tbody tr button:has-text("发券")');
});

When('运营人员创建一张折扣券规则{string}', async function (couponName) {
  this._issue = { couponName };
  const section = this.page.locator('section', { hasText: '新建优惠券规则' }).first();
  await section.locator('input[placeholder*="新客专享满减券"]').fill(couponName);
  await section.locator('button:has-text("折扣券 (PERCENTAGE)")').click();
  await section.locator('input[placeholder*="9 (表示 9 折)"]').fill('8');
  await section.locator('input[type="date"]').fill('2026-12-31');
  await this.page.locator('button:has-text("创建并生效")').click();
  // 创建成功后列表刷新，等待新券行出现
  await this.page.waitForSelector(`tbody tr:has-text("${couponName}")`, { timeout: 10000 });
});

When('将该券发放给用户{string}', async function (userId) {
  const { couponName } = this._issue || {};
  expect(couponName, '缺少已创建的券名上下文').to.be.a('string');
  this._issue = { couponName, userId };
  const row = this.page.locator('tbody tr', { hasText: couponName }).first();
  await row.locator('button:has-text("发券")').click();
  const issueSection = this.page.locator('section', { hasText: '手动发券' }).first();
  const userIdInput = issueSection.locator('input[type="text"]');
  await userIdInput.waitFor({ state: 'visible' });
  await userIdInput.fill(userId);
  await this.page.locator('button:has-text("确认发放")').click();
  await this.page.waitForSelector('text=发放给用户', { timeout: 10000 });
});

Then('应提示发放成功', async function () {
  const msg = this.page.locator('div:has-text("发放给用户")').first();
  await msg.waitFor();
  expect(await msg.isVisible()).to.be.true;
});

Then('最近发放记录顶部应出现该条记录', async function () {
  const { couponName, userId } = this._issue || {};
  expect(couponName, '缺少已发放的券名上下文').to.be.a('string');
  const section = this.page.locator('section', { hasText: '最近发放记录' }).first();
  const firstRow = section.locator('tbody tr').first();
  await firstRow.waitFor();
  const text = await firstRow.textContent();
  expect(text).to.contain(couponName);
  expect(text).to.contain(userId);
  expect(text).to.contain('王琳');
});
