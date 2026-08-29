const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');

const STORE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3000';

// ---------- 前置状态 ----------

Given('买家打开店铺首页且当前无账户', async function () {
  await this.page.goto(STORE_URL);
  await this.page.waitForSelector('button:has-text("加入购物车")');
  // 清空本地会话，确保"无账户"初始态
  await this.page.evaluate(() => localStorage.clear());
});

Given('买家打开店铺首页', async function () {
  await this.page.goto(STORE_URL);
  await this.page.waitForSelector('button:has-text("加入购物车")');
});

Given(/^系统已存在用户手机号 (\d+)（昵称 (.+)）$/, async function (phone, nickname) {
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: String(phone), nickname, password: '123456' })
  });
  expect(res.status).to.equal(201);
});

// ---------- 进入注册页 ----------

When('用户点击"注册 \\/ 登录"进入注册页', async function () {
  await this.page.locator('header button:has-text("注册 / 登录")').click();
  await this.page.waitForSelector('h2:has-text("注册新账户")');
});

// ---------- 填写注册表单 ----------

When(/^在注册页输入手机号 (\d+)、昵称 (.+?)、密码 (\d+)$/, async function (phone, nickname, password) {
  await this.page.locator('input[type="tel"]').fill(String(phone));
  const inputs = this.page.locator('main input:not([type="tel"]):not([type="password"]):not([type="checkbox"])');
  // 昵称输入框（唯一文本输入框）
  await inputs.nth(0).fill(nickname);
  // 密码输入框
  await this.page.locator('input[type="password"]').fill(String(password));
});

When('在注册页输入手机号 {int}、密码 {int} 并提交', async function (phone, password) {
  await this.page.locator('input[type="tel"]').fill(String(phone));
  await this.page.locator('input[type="password"]').fill(String(password));
  await this.page.locator('button:has-text("注册并登录")').click();
});

When('用户点击"注册并登录"', async function () {
  await this.page.locator('button:has-text("注册并登录")').click();
});

// ---------- 断言 ----------

Then('页面显示"注册成功，已自动登录"横幅', async function () {
  await this.page.waitForSelector('text=注册成功，已自动登录');
});

Then('顶部导航显示用户昵称{string}', async function (nickname) {
  const header = this.page.locator('header.h-16');
  const text = await header.textContent();
  expect(text).to.contain(nickname);
});

Then('页面提示"该手机号已注册，请直接登录"', async function () {
  await this.page.waitForSelector('text=该手机号已注册，请直接登录');
});

Then('页面提供跳转登录入口', async function () {
  const banner = this.page.locator('div.bg-red-50').first();
  const text = await banner.textContent();
  expect(text).to.contain('去登录');
});

Then('页面分别提示"请输入 11 位有效手机号"与"密码至少 6 位"', async function () {
  await this.page.waitForSelector('text=请输入 11 位有效手机号');
  await this.page.waitForSelector('text=密码至少 6 位');
});

Then('页面停留注册页，未发起注册请求', async function () {
  await this.page.waitForSelector('h2:has-text("注册新账户")');
  const hasSuccess = await this.page.locator('text=注册成功，已自动登录').count();
  expect(hasSuccess).to.equal(0);
});
