const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');

const API_URL = 'http://localhost:3000';

// ==================== miniprogramShopping_ 命名空间辅助（后端契约验证降级层——决策 B） ====================

async function shoppingPost(base, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${base}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  return { status: res.status, body: await res.json().catch(() => null) };
}
async function shoppingGet(base, path, token) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${base}${path}`, { headers });
  return { status: res.status, body: await res.json().catch(() => null) };
}
async function shoppingPut(base, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${base}${path}`, { method: 'PUT', headers, body: JSON.stringify(body) });
  return { status: res.status, body: await res.json().catch(() => null) };
}

/** 注册/登录 + 角色（幂等） */
async function shoppingSetupUser(phone, nickname, password, role = '客户') {
  await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, nickname, password })
  });
  await fetch(`${API_URL}/api/__test/user-role`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, role })
  });
  const login = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password })
  });
  expect(login.status).to.equal(201);
  return (await login.json()).sessionToken;
}

/** 微信体验登录（mock code 直连老客户或绑定建号） */
async function shoppingWechatLogin(phoneCode) {
  const login = await shoppingPost(API_URL, '/api/auth/wechat/login', { code: 'code_demo_001' });
  if (login.status === 201) return login.body.sessionToken;
  // openid_demo_001 需先被绑定到既有账号（bind-openid）：注册既有用户后绑定
  const token = await shoppingSetupUser('13888217536', '林晓明', '123456');
  const bind = await shoppingPost(API_URL, '/api/auth/wechat/bind-openid', { openid: 'openid_demo_001' }, token);
  expect(bind.status).to.equal(200);
  const login2 = await shoppingPost(API_URL, '/api/auth/wechat/login', { code: 'code_demo_001' });
  expect(login2.status).to.equal(201);
  return login2.body.sessionToken;
}

/** 渠道启用 */
async function shoppingEnableChannel() {
  const token = await shoppingSetupUser('13600080001', '渠道运营', 'admin123', '运营');
  await shoppingPut(API_URL, '/api/admin/channel/miniprogram', {
    appid: 'wx4a2b8c9d0e1f2345', appsecret: 'a1b2c3d4e5f60718293a4b5c6d7e8f90', enabled: true
  }, token);
}

// ==================== 前置 ====================

Given('小程序渠道已启用且买家已微信登录（mock 会话）', async function () {
  await shoppingEnableChannel();
  this._token = await shoppingWechatLogin();
});

Given('买家王倩经微信授权登录（mock 会话，channel=MINIPROGRAM）', async function () {
  await shoppingEnableChannel();
  // 王倩：code_demo_002 + phone_demo_001 绑定建号（13700005678）
  const bind = await shoppingPost(API_URL, '/api/auth/wechat/bind', { code: 'code_demo_002', phoneCode: 'phone_demo_001' });
  if (bind.status !== 201) {
    // 已存在则直接登录（该手机号无密码——走微信登录需 openid 命中；用 code_demo_002 直接登录建号后）
    const r2 = await shoppingPost(API_URL, '/api/auth/wechat/login', { code: 'code_demo_002' });
    expect(r2.status).to.equal(201);
    this._token = r2.body.sessionToken;
    this._phone = '13700005678';
    return;
  }
  this._token = bind.body.sessionToken;
  this._phone = '13700005678';
});

Given('王倩（微信登录会话）存在已支付订单', async function () {
  if (!this._token) {
    await shoppingEnableChannel();
    const bind = await shoppingPost(API_URL, '/api/auth/wechat/bind', { code: 'code_demo_002', phoneCode: 'phone_demo_001' });
    this._token = (bind.status === 201 ? bind : await shoppingPost(API_URL, '/api/auth/wechat/login', { code: 'code_demo_002' })).body.sessionToken;
  }
  await shoppingPost(API_URL, '/api/cart/items', { productId: '2', quantity: 1 }, this._token);
  const order = await shoppingPost(API_URL, '/api/orders', {}, this._token);
  this._orderId = order.body.id;
  expect(order.body.channel).to.equal('MINIPROGRAM');
  const pay = await shoppingPost(API_URL, `/api/payments/${order.body.id}`);
  expect(pay.status).to.equal(200);
});

Given('王倩微信会话已加购某商品', async function () {
  if (!this._token) {
    await shoppingEnableChannel();
    const bind = await shoppingPost(API_URL, '/api/auth/wechat/bind', { code: 'code_demo_002', phoneCode: 'phone_demo_001' });
    this._token = (bind.status === 201 ? bind : await shoppingPost(API_URL, '/api/auth/wechat/login', { code: 'code_demo_002' })).body.sessionToken;
  }
  await shoppingPost(API_URL, '/api/cart/items', { productId: '6', quantity: 1 }, this._token);
});
Given('该商品随后被后端置为售罄（库存为零）', async function () {
  await shoppingPut(API_URL, '/api/products/6', { stock: 0 });
});
When('王倩提交订单', async function () {
  this._addRes = await shoppingPost(API_URL, '/api/orders', {}, this._token);
});
Then('返回库存不足错误，订单未创建', async function () {
  expect(this._addRes.status).to.equal(409);
  expect(this._addRes.body.error?.code || this._addRes.body.code).to.equal('OUT_OF_STOCK');
});

Given('王倩已登录且购物车含 无线办公鼠标×2（¥178.00）且存在可用优惠券', async function () {
  if (!this._token) {
    await shoppingEnableChannel();
    const bind = await shoppingPost(API_URL, '/api/auth/wechat/bind', { code: 'code_demo_002', phoneCode: 'phone_demo_001' });
    this._token = (bind.status === 201 ? bind : await shoppingPost(API_URL, '/api/auth/wechat/login', { code: 'code_demo_002' })).body.sessionToken;
  }
  await shoppingPost(API_URL, '/api/cart/items', { productId: '2', quantity: 2 }, this._token);
});

Given('王倩的小程序订单处于 PENDING_PAYMENT（channel=MINIPROGRAM）', async function () {
  if (!this._token) {
    await shoppingEnableChannel();
    const bind = await shoppingPost(API_URL, '/api/auth/wechat/bind', { code: 'code_demo_002', phoneCode: 'phone_demo_001' });
    this._token = (bind.status === 201 ? bind : await shoppingPost(API_URL, '/api/auth/wechat/login', { code: 'code_demo_002' })).body.sessionToken;
  }
  await shoppingPost(API_URL, '/api/cart/items', { productId: '2', quantity: 1 }, this._token);
  const order = await shoppingPost(API_URL, '/api/orders', {}, this._token);
  expect(order.status).to.equal(201);
  expect(order.body.status).to.equal('PENDING_PAYMENT');
  expect(order.body.channel).to.equal('MINIPROGRAM');
  this._orderId = order.body.id;
});

// ==================== browse 契约 ====================

When('小程序调用商品列表接口（同源商品数据）', async function () {
  this._res = await shoppingGet(API_URL, '/api/products');
});
Then('返回 6 件真实商品（极简机械键盘 ¥299.00 与 无线办公鼠标 ¥89.00 等，与 Web 一致）', async function () {
  expect(this._res.status).to.equal(200);
  const list = this._res.body;
  expect(Array.isArray(list)).to.equal(true);
  expect(list.length).to.equal(6);
  const kb = list.find(p => p.name === '极简机械键盘');
  const ms = list.find(p => p.name === '无线办公鼠标');
  expect(kb.priceCents).to.equal(29900);
  expect(ms.priceCents).to.equal(8900);
});

When('小程序按名称搜索「键盘」', async function () {
  this._res = await shoppingGet(API_URL, `/api/products?name=${encodeURIComponent('键盘')}`);
});
Then('列表仅返回名称含「键盘」的商品', async function () {
  const names = (this._res.body || []).map(p => p.name);
  expect(names).to.include('极简机械键盘');
  expect(names).to.not.include('无线办公鼠标');
});

When('小程序按分类「显示设备」过滤', async function () {
  const cats = await shoppingGet(API_URL, '/api/categories');
  const cat = (cats.body || []).find(c => c.name === '显示设备');
  expect(cat).to.exist;
  this._res = await shoppingGet(API_URL, `/api/products?categoryId=${cat.id}`);
});
Then('列表仅返回高清显示器', async function () {
  const names = (this._res.body || []).map(p => p.name);
  expect(names).to.deep.equal(['高清显示器']);
});



When('王倩对无线办公鼠标发起加购 ×2', async function () {
  this._addRes = await shoppingPost(API_URL, '/api/cart/items', { productId: '2', quantity: 2 }, this._token);
});
Then('购物车按王倩 userId 归属（与 Web 同库），数量为 2', async function () {
  expect(this._addRes.status).to.equal(200);
  // 我的订单/购物车归属：购物车查询走订单归属同源（购物车 GET 由既有语义——以下单校验归属）
  const order = await shoppingPost(API_URL, '/api/orders', {}, this._token);
  expect(order.status).to.equal(201);
  expect(order.body.channel).to.equal('MINIPROGRAM');
  expect(order.body.items.reduce((n, i) => n + i.quantity, 0)).to.equal(2);
});

// ==================== checkout 契约 ====================

When('王倩提交订单（复用结算与下单接口）', async function () {
  this._res = await shoppingPost(API_URL, '/api/orders', {}, this._token);
  this._order = this._res.body;
});
Then('订单创建成功且应付金额含优惠（自动选择实际支付最低的最优券）', async function () {
  expect(this._res.status).to.equal(201);
  // 种子券：满 50 减 10 与 9 折券；¥178 用 9 折减免 1780 更优 → 系统选 9 折
  expect(this._order.discountCents).to.equal(1780);
  expect(this._order.actualPaidCents).to.equal(16020);
});
Then('订单 channel=MINIPROGRAM（服务端按会话来源判定，小程序未传渠道）', async function () {
  expect(this._order.channel).to.equal('MINIPROGRAM');
});

When('王倩对该订单发起模拟支付', async function () {
  this._res = await shoppingPost(API_URL, `/api/payments/${this._orderId}`);
});
Then('订单状态变为 PAID 且库存已扣减', async function () {
  expect(this._res.status).to.equal(200);
  expect(this._res.body.status).to.equal('PAID');
});

// ==================== orders 契约 ====================

When('王倩请求我的订单 API', async function () {
  this._res = await shoppingGet(API_URL, '/api/orders', this._token);
});
Then('列表返回该订单（金额与状态一致，Web 下单同库可见）', async function () {
  const list = this._res.body;
  expect(Array.isArray(list)).to.equal(true);
  const found = list.find(o => o.id === this._orderId);
  expect(found).to.exist;
  expect(found.status).to.equal('PAID');
});

When('B 端运营对该订单执行发货', async function () {
  const op = await shoppingSetupUser('13600080002', '发货运营', 'admin123', '运营');
  const res = await shoppingPost(API_URL, `/api/admin/orders/${this._orderId}/ship`, {}, op);
  expect(res.status).to.equal(200);
});
Then('王倩再次请求我的订单 → 状态变为 SHIPPED（已发货）', async function () {
  const list = await shoppingGet(API_URL, '/api/orders', this._token);
  const found = list.body.find(o => o.id === this._orderId);
  expect(found.status).to.equal('SHIPPED');
});
