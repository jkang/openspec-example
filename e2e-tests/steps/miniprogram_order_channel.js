const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');

const STORE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3000';

// ==================== miniprogramOrderChannel_ 命名空间辅助（防 ambiguous） ====================

async function orderChannelPost(base, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${base}${path}`, {
    method: 'POST', headers, body: JSON.stringify(body)
  });
}

/** 注册（幂等）→ 角色后门 → 登录 */
async function orderChannelSetupRole(phone, nickname, password, role) {
  const reg = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, nickname, password })
  });
  if (reg.status !== 201) {
    await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password })
    });
  }
  await fetch(`${API_URL}/api/__test/user-role`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, role })
  });
  const login = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password })
  });
  expect(login.status).to.equal(201);
  const body = await login.json();
  return { token: body.sessionToken, user: body.user };
}

/** 微信 bind 建号（王倩，会话 MINIPROGRAM） */
async function orderChannelWechatBind(phone, nickname) {
  const res = await orderChannelPost(API_URL, '/api/auth/wechat/bind', { code: 'code_demo_002', phoneCode: 'phone_demo_001' });
  expect(res.status).to.equal(201);
  const body = await res.json();
  // 若 phone 冲突（复用场景），直接登录/跳过（E2E 每场景 reset，通常 201）
  if (res.status === 409) {
    const login = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password: '123456' })
    });
    return { token: (await login.json()).sessionToken };
  }
  return { token: body.sessionToken };
}

/** 加购 + 下单，返回订单 */
async function orderChannelAddAndOrder(token, productId, qty = 1, extraBody = {}) {
  const auth = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  await orderChannelPost(API_URL, '/api/cart/items', { productId: String(productId), quantity: qty }, token);
  const res = await orderChannelPost(API_URL, '/api/orders', extraBody, token);
  return { status: res.status, order: await res.json(), auth };
}

// ==================== 前置 ====================

Given('小程序渠道已启用（order-channel）', async function () {
  const op = await orderChannelSetupRole('13600070001', '渠道运营', 'admin123', '运营');
  await fetch(`${API_URL}/api/admin/channel/miniprogram`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${op.token}` },
    body: JSON.stringify({ appid: 'wx4a2b8c9d0e1f2345', appsecret: 'a1b2c3d4e5f60718293a4b5c6d7e8f90', enabled: true })
  });
});

Given('买家王倩经微信授权登录（bind 建号，会话 MINIPROGRAM）', async function () {
  const { token } = await orderChannelWechatBind('13700005678', '王倩');
  this._wangToken = token;
});

Given('买家林晓明网页注册并登录（会话 WEB）', async function () {
  const { token } = await orderChannelSetupRole('13888217536', '林晓明', '123456', '客户');
  this._linToken = token;
});

Given('运营陈晓芸已登录 B 端订单管理', async function () {
  const { token } = await orderChannelSetupRole('13600070002', '陈晓芸', 'admin123', '运营');
  this._opToken = token;
  await this.page.goto(STORE_URL);
  await this.page.waitForSelector('button:has-text("加入购物车")');
  await this.page.evaluate(({ token }) => {
    localStorage.setItem('ecommerce_session', token);
  }, { token });
  // 获取用户对象供登录态使用
  const me = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '13600070002', password: 'admin123' })
  });
  const user = (await me.json()).user;
  await this.page.evaluate(({ user }) => {
    localStorage.setItem('ecommerce_user', JSON.stringify(user));
  }, { user });
  await this.page.reload();
  await this.page.waitForSelector('button:has-text("加入购物车")');
  await this.page.locator('button:has-text("运营后台")').click();
  await this.page.locator('nav a:has-text("订单列表")').click();
  await this.page.waitForSelector('h2:has-text("订单列表")');
});

// ==================== 场景步骤 ====================

When('王倩加购无线办公鼠标并提交订单', async function () {
  const r = await orderChannelAddAndOrder(this._wangToken, '2');
  this._lastOrder = r.order;
  this._lastStatus = r.status;
});

Then('订单创建成功且 channel=MINIPROGRAM（服务端按会话来源判定）', async function () {
  expect(this._lastStatus).to.equal(201);
  expect(this._lastOrder.channel).to.equal('MINIPROGRAM');
});

When('林晓明加购极简机械键盘并提交订单', async function () {
  const r = await orderChannelAddAndOrder(this._linToken, '1');
  this._lastOrder = r.order;
  this._lastStatus = r.status;
});

Then('订单创建成功且 channel=WEB（默认值）', async function () {
  expect(this._lastStatus).to.equal(201);
  expect(this._lastOrder.channel).to.equal('WEB');
});

When('林晓明加购并提交订单（请求体恶意携带 channel=MINIPROGRAM）', async function () {
  const r = await orderChannelAddAndOrder(this._linToken, '1', 1, { channel: 'MINIPROGRAM' });
  this._lastOrder = r.order;
  this._lastStatus = r.status;
});

Then('订单创建成功且 channel 仍为 WEB（服务端判定，忽略客户端传参）', async function () {
  expect(this._lastStatus).to.equal(201);
  expect(this._lastOrder.channel).to.equal('WEB');
});

Given('买家王倩经微信授权登录（bind 建号，会话 MINIPROGRAM）并已下单（channel=MINIPROGRAM）', async function () {
  const { token } = await orderChannelWechatBind('13700005678', '王倩');
  const r = await orderChannelAddAndOrder(token, '2');
  expect(r.status).to.equal(201);
  expect(r.order.channel).to.equal('MINIPROGRAM');
  this._wangToken = token;
  this._lastOrder = r.order; // 供支付/发货步骤消费
});

Given('买家林晓明网页注册并登录并已下单（channel=WEB）', async function () {
  const { token } = await orderChannelSetupRole('13888217536', '林晓明', '123456', '客户');
  const r = await orderChannelAddAndOrder(token, '1');
  expect(r.order.channel).to.equal('WEB');
  this._linToken = token;
});

When('运营查看订单列表', async function () {
  await this.page.waitForFunction(() => document.querySelectorAll('tbody tr').length >= 1, { timeout: 10000 });
});

Then('列表展示渠道标识：小程序单「小程序」与 网页单「网页」（渠道不影响金额与状态）', async function () {
  const rows = await this.page.locator('tbody tr').allTextContents();
  const hasMini = rows.some(t => t.includes('小程序'));
  const hasWeb = rows.some(t => t.includes('网页'));
  expect(hasMini).to.equal(true);
  expect(hasWeb).to.equal(true);
});

Given('王倩已支付该订单（PAID）', async function () {
  const payRes = await orderChannelPost(API_URL, `/api/payments/${this._lastOrder.id}`);
  expect(payRes.status).to.equal(200);
  const paid = await payRes.json();
  expect(paid.status).to.equal('PAID');
  expect(paid.channel).to.equal('MINIPROGRAM');
});

When('运营对该小程序订单执行发货', async function () {
  const shipRes = await orderChannelPost(API_URL, `/api/admin/orders/${this._lastOrder.id}/ship`, {}, this._opToken);
  expect(shipRes.status).to.equal(200);
  this._shippedOrder = await shipRes.json();
});

Then('订单状态流转为 SHIPPED 且 channel 保持 MINIPROGRAM（同一状态机，不因渠道分流）', async function () {
  expect(this._shippedOrder.status).to.equal('SHIPPED');
  expect(this._shippedOrder.channel).to.equal('MINIPROGRAM');
});
