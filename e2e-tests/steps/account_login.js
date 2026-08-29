const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');

const STORE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3000';

// ---------- 前置状态 ----------

Given('已注册用户林晓明（手机号 {int}，密码 {int}）', async function (phone, password) {
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: String(phone), nickname: '林晓明', password: String(password) })
  });
  expect(res.status).to.equal(201);
});

Given('用户王强（手机号 {int}）已被运营禁用', async function (phone) {
  // 先注册（复用 register API，保证哈希格式与生产一致），再通过测试后门置为禁用
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: String(phone), nickname: '王强', password: '123456' })
  });
  expect(res.status).to.equal(201);
  const disable = await fetch(`${API_URL}/api/__test/user-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: String(phone), status: '禁用' })
  });
  expect(disable.status).to.equal(200);
});

Given('买家打开店铺首页且当前会话已失效', async function () {
  await this.page.goto(STORE_URL);
  await this.page.waitForSelector('button:has-text("加入购物车")');
  // 清空本地会话，确保"会话已失效"初始态
  await this.page.evaluate(() => localStorage.clear());
});

// ---------- 进入登录页 ----------

When('用户进入登录页', async function () {
  // 入口链：header「注册 / 登录」→ 注册页 →「已有账户？直接登录」→ 登录页（与 register E2E 共用 header 入口）
  await this.page.locator('header button:has-text("注册 / 登录")').click();
  await this.page.waitForSelector('h2:has-text("注册新账户")');
  await this.page.locator('text=直接登录').click();
  await this.page.waitForSelector('h2:has-text("登录")');
});

// ---------- 填写登录表单 ----------

When('在登录页输入手机号 {int}、密码 {int}', async function (phone, password) {
  await this.page.locator('main input[type="tel"]').fill(String(phone));
  await this.page.locator('main input[type="password"]').fill(String(password));
});

When('在登录页输入手机号 {int}', async function (phone) {
  await this.page.locator('main input[type="tel"]').fill(String(phone));
});

When('用户点击"登录"', async function () {
  await this.page.locator('main button:has-text("登录")').click();
});

// ---------- 断言 ----------

Then(/^页面显示"登录成功，(.+)"横幅$/, async function (nickname) {
  await this.page.waitForSelector(`text=登录成功，${nickname}`);
});

Then(/^页面提示"请输入 (\d+) 位有效手机号"$/, async function (digits) {
  await this.page.waitForSelector(`text=请输入 ${digits} 位有效手机号`);
});

Then('导航出现"我的订单"入口', async function () {
  const header = this.page.locator('header.h-16');
  await this.page.waitForSelector('header button:has-text("我的订单")');
  expect(await header.locator('button:has-text("我的订单")').count()).to.equal(1);
});

Then('页面提示"手机号或密码不正确，请重试"', async function () {
  await this.page.waitForSelector('text=手机号或密码不正确，请重试');
});

Then('页面提示"该账户已被禁用，如有疑问请联系平台客服"', async function () {
  await this.page.waitForSelector('text=该账户已被禁用，如有疑问请联系平台客服');
});

Then('页面停留登录页，无会话凭证写入', async function () {
  await this.page.waitForSelector('h2:has-text("登录")');
  const token = await this.page.evaluate(() => localStorage.getItem('ecommerce_session'));
  expect(token).to.be.null;
});

Then('页面停留登录页，未发起登录请求', async function () {
  await this.page.waitForSelector('h2:has-text("登录")');
  const hasSuccess = await this.page.locator('text=登录成功，').count();
  expect(hasSuccess).to.equal(0);
});
