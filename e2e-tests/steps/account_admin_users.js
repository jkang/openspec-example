const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');

const STORE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3000';

// 前置状态辅助：注册（或登录）→ 测试后门提升角色 → 重新登录获取含 role 的最新用户 → 写 localStorage
// 复用 ISSUE-012 模式（/api/__test/user-status 同构的角色后门），保证运营/客服账号在 reset 后确定性可建
async function ensureLoggedInWithRole(page, phone, nickname, password, role) {
  const reg = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: String(phone), nickname, password: String(password) })
  });
  if (reg.status !== 201) {
    // 已存在（reset 间隔异常）：登录确认存在
    const preLogin = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: String(phone), password: String(password) })
    });
    expect(preLogin.status).to.equal(201);
  }
  // 角色后门：提升/确认角色（运营/客服），仅 NODE_ENV=test 可用
  const roleRes = await fetch(`${API_URL}/api/__test/user-role`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: String(phone), role })
  });
  expect(roleRes.status).to.equal(200);
  // 重新登录：获取含最新 role 的用户信息（否则前端 isOperator 读到过期 role=客户）
  const login = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: String(phone), password: String(password) })
  });
  expect(login.status).to.equal(201);
  const body = await login.json();
  await page.evaluate(({ token, user }) => {
    localStorage.setItem('ecommerce_session', token);
    localStorage.setItem('ecommerce_user', JSON.stringify(user));
  }, { token: body.sessionToken, user: body.user });
  return { token: body.sessionToken, user: body.user };
}

Given('运营陈晓芸已登录 B 端后台（运营角色）', async function () {
  await this.page.goto(STORE_URL);
  await this.page.waitForSelector('button:has-text("加入购物车")');
  await ensureLoggedInWithRole(this.page, '13600000001', '陈晓芸', 'admin123', '运营');
  // 刷新模拟重开浏览器：登录态由 localStorage 保持（R-SES-001）
  await this.page.reload();
  await this.page.waitForSelector('button:has-text("加入购物车")');
});

Given('客服小赵已登录 B 端后台（客服角色）', async function () {
  await this.page.goto(STORE_URL);
  await this.page.waitForSelector('button:has-text("加入购物车")');
  await ensureLoggedInWithRole(this.page, '13600000002', '客服小赵', 'service123', '客服');
  await this.page.reload();
  await this.page.waitForSelector('button:has-text("加入购物车")');
  // 进入运营后台（既有入口无需登录态，但用户管理入口按角色渲染）
  await this.page.locator('button:has-text("运营后台")').click();
  await this.page.waitForSelector('text=新建优惠券规则');
});

Given('系统存在买家林晓明（手机号 {int}）且有订单', async function (phone) {
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: String(phone), nickname: '林晓明', password: '123456' })
  });
  expect(res.status).to.equal(201);
  const body = await res.json();
  const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${body.sessionToken}` };
  // 加购 → 下单（归属会话用户 林晓明）
  await fetch(`${API_URL}/api/cart/items`, {
    method: 'POST', headers: authHeaders, body: JSON.stringify({ productId: '1', quantity: 1 })
  });
  const orderRes = await fetch(`${API_URL}/api/orders`, {
    method: 'POST', headers: authHeaders, body: JSON.stringify({})
  });
  expect(orderRes.status).to.equal(201);
  this._buyerOrderId = (await orderRes.json()).id;
});

Given('用户王强（手机号 {int}）已登录且会话有效', async function (phone) {
  await this.page.goto(STORE_URL);
  await this.page.waitForSelector('button:has-text("加入购物车")');
  // 王强为普通客户（role=客户），保留其会话凭证供禁用后失效断言
  this._wangSession = await ensureLoggedInWithRole(this.page, String(phone), '王强', '123456', '客户');
  await this.page.reload();
  await this.page.waitForSelector('button:has-text("加入购物车")');
});

// ---------- 用户管理交互（R-ADM-001/002/003） ----------

When('运营进入「用户管理」并输入手机号 {int} 搜索', async function (phone) {
  await this.page.locator('button:has-text("运营后台")').click();
  await this.page.waitForSelector('nav a:has-text("用户管理")');
  await this.page.locator('nav a:has-text("用户管理")').click();
  await this.page.waitForSelector('h2:has-text("用户管理")');
  const input = this.page.locator('input[placeholder*="按手机号或昵称搜索"]');
  await input.waitFor({ state: 'visible' });
  await input.fill(String(phone));
  await this.page.locator('section button:has-text("搜索")').click();
  await this.page.waitForSelector('tbody tr', { timeout: 10000 });
});

Then('用户列表返回 林晓明（状态正常，展示手机号 13888217536）', async function () {
  const row = this.page.locator('tbody tr', { hasText: '林晓明' }).first();
  await row.waitFor({ timeout: 10000 });
  const text = await row.textContent();
  expect(text).to.contain('林晓明');
  expect(text).to.contain('13888217536');
  expect(text).to.contain('正常');
});

Then('点击用户详情展示林晓明的订单', async function () {
  const row = this.page.locator('tbody tr', { hasText: '林晓明' }).first();
  await row.locator('button:has-text("详情")').click();
  await this.page.waitForSelector('h2:has-text("用户详情：林晓明")', { timeout: 10000 });
  const detailText = await this.page.locator('section', { hasText: '用户详情：林晓明' }).first().textContent();
  expect(detailText).to.contain('该用户的订单');
  expect(detailText).to.contain(this._buyerOrderId);
});

// ---------- 禁用联动会话失效（R-ADM-005 + R-SES-006） ----------

When('运营在用户管理界面中将王强禁用', async function () {
  await this.page.locator('button:has-text("运营后台")').click();
  await this.page.waitForSelector('nav a:has-text("用户管理")');
  await this.page.locator('nav a:has-text("用户管理")').click();
  await this.page.waitForSelector('h2:has-text("用户管理")');
  const input = this.page.locator('input[placeholder*="按手机号或昵称搜索"]');
  await input.waitFor({ state: 'visible' });
  await input.fill('15876543210');
  await this.page.locator('section button:has-text("搜索")').click();
  const row = this.page.locator('tbody tr', { hasText: '15876543210' }).first();
  await row.waitFor({ timeout: 10000 });
  await row.locator('button:has-text("禁用")').click();
  // 状态刷新：该行操作按钮从「禁用」变为「启用」（列表已重新拉取，状态=禁用）
  await this.page.waitForSelector('tbody tr:has-text("15876543210") button:has-text("启用")', { timeout: 10000 });
});

Then('王强状态变为"已禁用"', async function () {
  const row = this.page.locator('tbody tr', { hasText: '15876543210' }).first();
  await row.waitFor({ timeout: 10000 });
  const text = await row.textContent();
  expect(text).to.contain('禁用');
});

When('王强恢复其会话并再次访问{string}', async function (target) {
  // 模拟王强自己的浏览器：写回其会话凭证并刷新
  await this.page.evaluate(({ token, user }) => {
    localStorage.setItem('ecommerce_session', token);
    localStorage.setItem('ecommerce_user', JSON.stringify(user));
  }, { token: this._wangSession.token, user: this._wangSession.user });
  await this.page.reload();
  await this.page.waitForSelector('button:has-text("加入购物车")');
  await this.page.locator('header button:has-text("我的订单")').click();
});

// ---------- 客服权限拦截（R-ADM-001/007） ----------

When('客服查看后台侧边栏', async function () {
  // 记录客服会话凭证，供越权接口断言
  this._serviceToken = await this.page.evaluate(() => localStorage.getItem('ecommerce_session'));
});

Then('侧边栏不显示「用户管理」入口', async function () {
  const count = await this.page.locator('nav a:has-text("用户管理")').count();
  expect(count).to.equal(0);
});

Then('调用用户列表接口被拒绝且不返回任何手机号', async function () {
  const res = await fetch(`${API_URL}/api/admin/users`, {
    headers: { Authorization: `Bearer ${this._serviceToken}` }
  });
  expect(res.status).to.equal(403);
  const raw = await res.text();
  expect(raw).to.not.contain('13888217536');
  expect(raw).to.not.contain('13600000001');
});
