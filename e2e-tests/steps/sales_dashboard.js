const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');

const STORE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3000';

// ==================== dashboard_ 命名空间辅助（防步骤 ambiguous） ====================

/** 注册（幂等）→ 角色后门 → 登录，返回含最新 role 的会话（对齐 account_admin_users.js 的 ensureLoggedInWithRole 模式） */
async function dashboardSetupRole(phone, nickname, password, role) {
  const reg = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: String(phone), nickname, password: String(password) })
  });
  if (reg.status !== 201) {
    // reset 间隔异常：登录确认存在
    await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: String(phone), password: String(password) })
    });
  }
  const roleRes = await fetch(`${API_URL}/api/__test/user-role`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: String(phone), role })
  });
  expect(roleRes.status).to.equal(200);
  const login = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: String(phone), password: String(password) })
  });
  expect(login.status).to.equal(201);
  const body = await login.json();
  return { token: body.sessionToken, user: body.user };
}

/** 构造一笔订单（可选支付），返回订单对象（下单归属会话用户） */
async function dashboardCreateOrder(phone, nickname, productId, pay = true) {
  const { token } = await dashboardSetupRole(phone, nickname, '123456', '客户');
  const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  await fetch(`${API_URL}/api/cart/items`, {
    method: 'POST', headers: authHeaders, body: JSON.stringify({ productId, quantity: 1 })
  });
  const orderRes = await fetch(`${API_URL}/api/orders`, {
    method: 'POST', headers: authHeaders, body: JSON.stringify({})
  });
  expect(orderRes.status).to.equal(201);
  const order = await orderRes.json();
  if (pay) {
    const payRes = await fetch(`${API_URL}/api/payments/${order.id}`, { method: 'POST' });
    expect(payRes.status).to.equal(200);
    order.paidAt = (await payRes.json()).paidAt;
  }
  return order;
}

/** 将会话写入浏览器 localStorage（模拟该角色的浏览器，供 UI 链路） */
async function dashboardWriteSession(page, token, user) {
  await page.evaluate(({ token, user }) => {
    localStorage.setItem('ecommerce_session', token);
    localStorage.setItem('ecommerce_user', JSON.stringify(user));
  }, { token, user });
}

// ==================== 前置：数据与角色会话 ====================

Given('系统存在混合销售订单数据（已支付/待支付/已取消）', async function () {
  const paid1 = await dashboardCreateOrder('13800000031', '看板买家甲', '1', true);
  const paid2 = await dashboardCreateOrder('13800000032', '看板买家乙', '2', true);
  const pending = await dashboardCreateOrder('13800000033', '看板买家丙', '4', false);
  const cancelled = await dashboardCreateOrder('13800000034', '看板买家丁', '6', false);
  // 取消待支付订单 → CANCELLED（不计入销售）
  const cancelRes = await fetch(`${API_URL}/api/admin/orders/${cancelled.id}/cancel`, { method: 'POST' });
  expect(cancelRes.status).to.equal(200);
  this._dashboard = {
    paid: [paid1, paid2],
    expectedSales: paid1.actualPaidCents + paid2.actualPaidCents,
    expectedDiscount: (paid1.discountCents || 0) + (paid2.discountCents || 0),
    pendingIds: [pending.id],
    cancelledIds: [cancelled.id]
  };
});

Given('运营陈晓芸已登录销售看板（近7日）', async function () {
  const { token, user } = await dashboardSetupRole('13600000020', '陈晓芸', 'admin123', '运营');
  this._dashboardOperatorToken = token;
  await this.page.goto(STORE_URL);
  await this.page.waitForSelector('button:has-text("加入购物车")');
  await dashboardWriteSession(this.page, token, user);
  await this.page.reload();
  await this.page.waitForSelector('button:has-text("加入购物车")');
  // 进入运营后台 → 销售看板（默认近7日）
  await this.page.locator('button:has-text("运营后台")').click();
  await this.page.locator('nav a:has-text("销售看板")').click();
  await this.page.waitForSelector('h2:has-text("销售看板")');
});

Given('系统存在今日已支付订单数据', async function () {
  const paid = await dashboardCreateOrder('13800000035', '今日买家', '1', true);
  this._dashboardToday = paid;
});

Given('客服小赵已登录（客服角色）', async function () {
  const { token } = await dashboardSetupRole('13600000021', '客服小赵', 'service123', '客服');
  this._dashboardServiceToken = token;
});

// ==================== 场景一：近7日指标与订单一致（API 断言） ====================

When('运营请求近7日销售总览', async function () {
  const res = await fetch(`${API_URL}/api/admin/dashboard/sales?dimension=week`, {
    headers: { Authorization: `Bearer ${this._dashboardOperatorToken}` }
  });
  this._dashboardWeek = { status: res.status, body: await res.json() };
});

Then('返回状态码 200 且销售额等于已支付订单实付之和', async function () {
  const { status, body } = this._dashboardWeek;
  expect(status).to.equal(200);
  expect(body.metrics.sales).to.equal(this._dashboard.expectedSales);
});

Then('优惠让利等于已支付订单让利之和且为独立字段', async function () {
  const { body } = this._dashboardWeek;
  expect(body.metrics.discount).to.equal(this._dashboard.expectedDiscount);
  expect(body.coupon.discountCents).to.equal(this._dashboard.expectedDiscount);
});

Then('客单价等于销售额除以订单量', async function () {
  const { body } = this._dashboardWeek;
  expect(body.metrics.orders).to.equal(this._dashboard.paid.length);
  expect(body.metrics.avgOrder).to.equal(Math.round(body.metrics.sales / body.metrics.orders));
});

Then('已取消与待支付订单不计入任何指标', async function () {
  const { body } = this._dashboardWeek;
  // 看板订单量 = 仅成交订单数（PAID/SHIPPED/COMPLETED），待支付与已取消均不计入
  const all = await (await fetch(`${API_URL}/api/admin/orders`)).json();
  const paidCount = all.filter(o => ['PAID', 'SHIPPED', 'COMPLETED'].includes(o.status)).length;
  expect(body.metrics.orders).to.equal(paidCount);
  expect(paidCount).to.equal(this._dashboard.paid.length);
  // 销售额仅含成交订单实付（待支付/取消金额未混入）
  expect(body.metrics.sales).to.equal(this._dashboard.expectedSales);
});

Then('近7日趋势序列合计等于区间销售额总额', async function () {
  const { body } = this._dashboardWeek;
  expect(body.trend.length).to.equal(7); // 近7个自然日桶
  const trendSum = body.trend.reduce((n, t) => n + t.salesCents, 0);
  expect(trendSum).to.equal(body.metrics.sales);
});

// ==================== 场景二：切换今日维度（UI 联动） ====================

When('运营在销售看板切换到「今日」', async function () {
  await this.page.locator('button:has-text("今日")').click();
  await this.page.waitForFunction(() => document.body.textContent.includes('销售趋势（今日）'));
});

Then('趋势标题与日期标签按今日区间刷新', async function () {
  const trendTitle = await this.page.locator('h3:has-text("销售趋势")').textContent();
  expect(trendTitle).to.contain('今日');
  // 今日仅 1 个日期标签
  const labelCount = await this.page.locator('svg + div span').count();
  expect(labelCount).to.equal(1);
});

Then('今日销售额等于今日已支付订单实付之和', async function () {
  // UI 展示值与 API（dimension=today）一致，且 API 与今日订单明细一致
  const api = await (await fetch(`${API_URL}/api/admin/dashboard/sales?dimension=today`, {
    headers: { Authorization: `Bearer ${this._dashboardOperatorToken}` }
  })).json();
  expect(api.metrics.sales).to.equal(this._dashboardToday.actualPaidCents);
  expect(api.metrics.orders).to.equal(1);
  const expectedYuan = (api.metrics.sales / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const uiText = await this.page.evaluate(() => {
    const divs = [...document.querySelectorAll('div')];
    const label = divs.find(d => d.textContent.trim() === '销售额');
    return label ? label.parentElement.textContent : null;
  });
  expect(uiText).to.contain(expectedYuan);
});

// ==================== 场景三：客服 403 ====================

When('客服请求销售看板接口', async function () {
  const res = await fetch(`${API_URL}/api/admin/dashboard/sales?dimension=week`, {
    headers: { Authorization: `Bearer ${this._dashboardServiceToken}` }
  });
  this._dashboardServiceResp = { status: res.status, raw: await res.text() };
});

Then('返回状态码 403 且响应不包含任何销售数据', async function () {
  expect(this._dashboardServiceResp.status).to.equal(403);
  expect(this._dashboardServiceResp.raw).to.not.contain('metrics');
  expect(this._dashboardServiceResp.raw).to.not.contain('trend');
  expect(this._dashboardServiceResp.raw).to.not.contain('actualPaidCents');
});
