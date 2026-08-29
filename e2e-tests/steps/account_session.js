const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');

const STORE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3000';

// ---------- 前置状态 ----------

/**
 * 注册并登录：优先注册（全新用户），已存在则登录；将会话凭证写入 localStorage（前端登录态）。
 * 供既有下单类 E2E 与会话场景共用（R-SES-007 落地后未登录不可下单）。
 */
async function ensureLoggedIn(page, phone, nickname, password) {
  const reg = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: String(phone), nickname, password: String(password) })
  });
  let body;
  if (reg.status === 201) {
    body = await reg.json();
  } else {
    const login = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: String(phone), password: String(password) })
    });
    expect(login.status).to.equal(201);
    body = await login.json();
  }
  await page.evaluate(({ token, user }) => {
    localStorage.setItem('ecommerce_session', token);
    localStorage.setItem('ecommerce_user', JSON.stringify(user));
  }, { token: body.sessionToken, user: body.user });
  return body.user;
}

Given('已登录买家林晓明（手机号 {int}，密码 {int}）持有持久会话凭证', async function (phone, password) {
  await this.page.goto(STORE_URL);
  await this.page.waitForSelector('button:has-text("加入购物车")');
  await ensureLoggedIn(this.page, phone, '林晓明', String(password));
  // 刷新模拟重开浏览器：登录态由 localStorage 保持（R-SES-001）
  await this.page.reload();
  await this.page.waitForSelector('button:has-text("加入购物车")');
});

// 通用前置：注册并登录（供既有下单类场景复用，R-SES-002 落地后未登录不可下单）
Given('买家已注册并登录（手机号 {int}，密码 {int}）', async function (phone, password) {
  await this.page.goto(STORE_URL);
  await this.page.waitForSelector('button:has-text("加入购物车")');
  await ensureLoggedIn(this.page, phone, '林晓明', String(password));
  await this.page.reload();
  await this.page.waitForSelector('button:has-text("加入购物车")');
});

Given('已登录用户王强（手机号 {int}，密码 {int}）', async function (phone, password) {
  await this.page.goto(STORE_URL);
  await this.page.waitForSelector('button:has-text("加入购物车")');
  await ensureLoggedIn(this.page, phone, '王强', String(password));
  await this.page.reload();
  await this.page.waitForSelector('button:has-text("加入购物车")');
});

Given('林晓明已支付 1 笔订单（纯棉圆领T恤）', async function () {
  const token = await this.page.evaluate(() => localStorage.getItem('ecommerce_session'));
  const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  // 上架商品"纯棉圆领T恤"
  const prodRes = await fetch(`${API_URL}/api/products`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ name: '纯棉圆领T恤', priceCents: 7900, stock: 99 })
  });
  const product = await prodRes.json();
  // 加购 → 下单（绑定会话 userId）→ 支付
  await fetch(`${API_URL}/api/cart/items`, {
    method: 'POST', headers: authHeaders, body: JSON.stringify({ productId: product.id, quantity: 1 })
  });
  const orderRes = await fetch(`${API_URL}/api/orders`, {
    method: 'POST', headers: authHeaders, body: JSON.stringify({})
  });
  expect(orderRes.status).to.equal(201);
  const order = await orderRes.json();
  const payRes = await fetch(`${API_URL}/api/payments/${order.id}`, { method: 'POST' });
  expect(payRes.status).to.equal(200);
  this._orderId = order.id;
});

Given('浏览器无任何会话凭证（未登录）', async function () {
  await this.page.goto(STORE_URL);
  await this.page.waitForSelector('button:has-text("加入购物车")');
  await this.page.evaluate(() => localStorage.clear());
});

Given('系统已存在用户林晓明（手机号 {int}，密码 {int}）', async function (phone, password) {
  // 仅注册不登录（登录留在回跳场景中执行）
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: String(phone), nickname: '林晓明', password: String(password) })
  });
  expect(res.status).to.equal(201);
});

// ---------- 刷新保持 ----------

When('刷新浏览器页面', async function () {
  await this.page.reload();
  await this.page.waitForSelector('button:has-text("加入购物车")');
});

Then('登录态保持，顶部导航仍显示昵称{string}', async function (nickname) {
  const header = this.page.locator('header.h-16');
  await header.locator(`text=${nickname}`).waitFor();
  expect(await header.locator(`text=${nickname}`).count()).to.equal(1);
});

Then('进入{string}仅展示林晓明的订单', async function (ordersTitle) {
  await this.page.locator('header button:has-text("我的订单")').click();
  await this.page.waitForSelector('h2:has-text("我的订单")');
  await this.page.waitForSelector('main section', { timeout: 10000 });
  const section = this.page.locator('main section').first();
  const text = await section.textContent();
  expect(text).to.contain('纯棉圆领T恤');
  expect(text).to.contain('已支付');
});

Then('林晓明新提交订单时订单归属其账户（Order.userId 绑定当前登录用户）', async function () {
  const token = await this.page.evaluate(() => localStorage.getItem('ecommerce_session'));
  const user = JSON.parse(await this.page.evaluate(() => localStorage.getItem('ecommerce_user')));
  const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  await fetch(`${API_URL}/api/cart/items`, {
    method: 'POST', headers: authHeaders, body: JSON.stringify({ productId: '1', quantity: 1 })
  });
  const orderRes = await fetch(`${API_URL}/api/orders`, {
    method: 'POST', headers: authHeaders, body: JSON.stringify({})
  });
  expect(orderRes.status).to.equal(201);
  const order = await orderRes.json();
  expect(order.userId).to.equal(user.id); // 替代 user_dev 占位（R-SES-007）
});

// ---------- 未登录拦截回跳（R-SES-004） ----------

When('直接访问{string}', async function (target) {
  await this.page.locator('header button:has-text("我的订单")').click();
});

Then('系统拦截并跳转登录页', async function () {
  await this.page.waitForSelector('h2:has-text("登录")');
});

Then('登录成功后回到{string}页面', async function (target) {
  await this.page.waitForSelector('h2:has-text("我的订单")', { timeout: 10000 });
});

// ---------- 退出登录（R-SES-005） ----------

When('用户点击"退出登录"', async function () {
  await this.page.locator('header button:has-text("退出登录")').click();
});

Then('会话凭证被销毁，页面回到未登录态', async function () {
  // 前端清除 localStorage 登录态
  await this.page.waitForSelector('header button:has-text("注册 / 登录")');
  const token = await this.page.evaluate(() => localStorage.getItem('ecommerce_session'));
  expect(token).to.be.null;
});

Then('再次访问{string}被引导登录', async function (target) {
  await this.page.locator('header button:has-text("我的订单")').click();
  await this.page.waitForSelector('h2:has-text("登录")');
});

// ---------- 禁用用户会话失效（R-SES-006） ----------

When('测试后门：运营已将王强禁用', async function () {
  // 命名空间化（ISSUE-015）：后门步骤显式加「测试后门」前缀，与 UI 操作步骤（account_admin_users.js）区分
  const res = await fetch(`${API_URL}/api/__test/user-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '15876543210', status: '禁用' })
  });
  expect(res.status).to.equal(200);
});

When('王强访问{string}', async function (target) {
  await this.page.locator('header button:has-text("我的订单")').click();
});

Then('会话校验失败并被引导重新登录', async function () {
  await this.page.waitForSelector('h2:has-text("登录")');
  const token = await this.page.evaluate(() => localStorage.getItem('ecommerce_session'));
  expect(token).to.be.null;
});

Then('登录页提示{string}', async function (message) {
  await this.page.waitForSelector(`text=${message}`);
});
