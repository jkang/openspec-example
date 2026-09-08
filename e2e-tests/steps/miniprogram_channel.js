const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');

const STORE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3000';

// ==================== miniprogramChannel_ 命名空间辅助（防 ambiguous，对齐 stock_warning_ 先例） ====================

const CHANNEL_SECRET = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';

/** 注册（幂等）→ 角色后门 → 登录，返回含最新 role 的会话 */
async function miniprogramChannelSetupRole(phone, nickname, password, role) {
  await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: String(phone), nickname, password: String(password) })
  });
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

/** 会话写入前端 localStorage（对齐 stock_warning_ 先例） */
async function miniprogramChannelWriteSession(page, token, user) {
  await page.evaluate(({ token, user }) => {
    localStorage.setItem('ecommerce_session', token);
    localStorage.setItem('ecommerce_user', JSON.stringify(user));
  }, { token, user });
}

/** 运营登录并进入小程序渠道页面 */
async function miniprogramChannelEnterOperatorPage(page, this_) {
  const { token, user } = await miniprogramChannelSetupRole('13600030001', '陈晓芸', 'admin123', '运营');
  this_._channelOperatorToken = token;
  await page.goto(STORE_URL);
  await page.waitForSelector('button:has-text("加入购物车")');
  await miniprogramChannelWriteSession(page, token, user);
  await page.reload();
  await page.waitForSelector('button:has-text("加入购物车")');
  await page.locator('button:has-text("运营后台")').click();
  await page.locator('nav a:has-text("小程序渠道")').click();
  await page.waitForSelector('h2:has-text("小程序渠道")');
}

// ==================== 前置 ====================

Given('运营陈晓芸已登录并进入小程序渠道页面', async function () {
  await miniprogramChannelEnterOperatorPage(this.page, this);
});

Given('运营陈晓芸已登录', async function () {
  const { token, user } = await miniprogramChannelSetupRole('13600030001', '陈晓芸', 'admin123', '运营');
  this._channelOperatorToken = token;
  await this.page.goto(STORE_URL);
  await this.page.waitForSelector('button:has-text("加入购物车")');
  await miniprogramChannelWriteSession(this.page, token, user);
  await this.page.reload();
  await this.page.waitForSelector('button:has-text("加入购物车")');
  await this.page.locator('button:has-text("运营后台")').click();
  await this.page.waitForSelector('text=新建优惠券规则');
});

Given('老板李老板（user_1003）已登录并进入小程序渠道页面', async function () {
  const login = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '13612345678', password: 'boss123' })
  });
  expect(login.status).to.equal(201);
  const body = await login.json();
  expect(body.user.id).to.equal('user_1003');
  expect(body.user.role).to.equal('老板');
  this._channelBossToken = body.sessionToken;
  await this.page.goto(STORE_URL);
  await this.page.waitForSelector('button:has-text("加入购物车")');
  await miniprogramChannelWriteSession(this.page, body.sessionToken, body.user);
  await this.page.reload();
  await this.page.waitForSelector('button:has-text("加入购物车")');
  await this.page.locator('button:has-text("运营后台")').click();
  await this.page.locator('nav a:has-text("小程序渠道")').click();
  await this.page.waitForSelector('h2:has-text("小程序渠道")');
});

Given('系统已配置小程序渠道（appid=wx4a2b8c9d0e1f2345，已启用）', async function () {
  const op = await miniprogramChannelSetupRole('13600030001', '陈晓芸', 'admin123', '运营');
  const res = await fetch(`${API_URL}/api/admin/channel/miniprogram`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${op.token}` },
    body: JSON.stringify({
      appid: 'wx4a2b8c9d0e1f2345',
      appsecret: CHANNEL_SECRET,
      mchid: '1900001234',
      enabled: true
    })
  });
  expect(res.status).to.equal(200);
});

Given('系统重置后无任何渠道配置记录', async function () {
  // world.js Before 已调用 /api/__test/reset 清空仓储；无需额外动作（未配置默认停用 R-CHN-009）
});

// ==================== 场景一：运营配置并启用 ====================

When('运营填写渠道配置（appid=wx4a2b8c9d0e1f2345 与 appsecret 与 商户号=1900001234）并打开启用开关保存', async function () {
  const inputs = this.page.locator('section:has(h2:has-text("小程序渠道")) input, h2:has-text("小程序渠道") ~ * input, input[placeholder^="例如 wx4a2b8c9d0e1f2345"]');
  // 填 AppID
  const appidInput = this.page.locator('input[placeholder^="例如 wx4a2b8c9d0e1f2345"]');
  await appidInput.fill('wx4a2b8c9d0e1f2345');
  // 重新配置 → 填 AppSecret
  await this.page.locator('button:has-text("重新配置")').click();
  const secretInput = this.page.locator('input[placeholder^="输入新的 AppSecret"]');
  await secretInput.fill(CHANNEL_SECRET);
  // 商户号
  const mchidInput = this.page.locator('input[placeholder^="例如 1900001234"]');
  await mchidInput.fill('1900001234');
  // 启用开关（checkbox）
  const enabledBox = this.page.locator('input[type="checkbox"]');
  const checked = await enabledBox.isChecked();
  if (!checked) await enabledBox.check();
  await this.page.locator('button:has-text("保存配置")').click();
});

Then('页面展示「已保存并即时生效」与「已启用」徽标', async function () {
  await this.page.waitForSelector('text=已保存并即时生效', { timeout: 8000 });
  await this.page.waitForSelector('text=已启用', { timeout: 8000 });
});

Then('AppSecret 显示为掩码（前 4 + 掩码 + 后 4），无明文泄露', async function () {
  const allText = await this.page.locator('section:has(h2:has-text("小程序渠道"))').textContent().catch(() => '');
  expect(allText).not.to.contain(CHANNEL_SECRET);
  const maskedInput = await this.page.locator('input[readonly]').first().inputValue().catch(() => '');
  expect(maskedInput).to.contain('a1b2'); // 前 4 位可见
  expect(maskedInput).to.contain('8f90'); // 后 4 位可见
});

Then('渠道配置接口返回 appsecretConfigured=true 且启用状态生效', async function () {
  const res = await fetch(`${API_URL}/api/admin/channel/miniprogram`, {
    headers: { Authorization: `Bearer ${this._channelOperatorToken}` }
  });
  expect(res.status).to.equal(200);
  const body = await res.json();
  expect(body.appsecretConfigured).to.equal(true);
  expect(body.enabled).to.equal(true);
  expect(body.appsecretMasked).to.contain('a1b2');
  expect(JSON.stringify(body)).not.to.contain(CHANNEL_SECRET);
});

// ==================== 场景二：老板只读 ====================

Then('页面展示渠道启用状态与脱敏配置（无明文）', async function () {
  await this.page.waitForSelector('text=已启用', { timeout: 8000 });
  const bodyText = await this.page.locator('body').textContent();
  expect(bodyText).not.to.contain(CHANNEL_SECRET);
});

Then('页面标注「纯只读 · 无配置入口」且无 AppID 输入框、无 AppSecret 输入框、无保存按钮', async function () {
  await this.page.waitForSelector('text=纯只读 · 无配置入口');
  const countInputs = await this.page.locator('input[placeholder^="例如 wx"], input[placeholder^="输入新的"], input[placeholder^="例如 1900001234"]').count();
  expect(countInputs).to.equal(0);
  const saveBtnCount = await this.page.locator('button:has-text("保存配置")').count();
  expect(saveBtnCount).to.equal(0);
});

Then('老板调用渠道配置写接口返回 403', async function () {
  const res = await fetch(`${API_URL}/api/admin/channel/miniprogram`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this._channelBossToken}` },
    body: JSON.stringify({ enabled: true })
  });
  expect(res.status).to.equal(403);
});

// ==================== 场景三：停用 + 越权 403 ====================

When('运营停用小程序渠道并保存', async function () {
  const enabledBox = this.page.locator('input[type="checkbox"]');
  const checked = await enabledBox.isChecked();
  if (checked) await enabledBox.uncheck();
  await this.page.locator('button:has-text("保存配置")').click();
  await this.page.waitForSelector('text=已保存并即时生效', { timeout: 8000 });
});

Then('渠道配置接口返回 enabled=false（停用状态即时生效）', async function () {
  const res = await fetch(`${API_URL}/api/admin/channel/miniprogram`, {
    headers: { Authorization: `Bearer ${this._channelOperatorToken}` }
  });
  const body = await res.json();
  expect(body.enabled).to.equal(false);
});

Then('客户访问渠道配置接口返回 403、未登录访问返回 403', async function () {
  const customer = await miniprogramChannelSetupRole('13600030002', '客户小王', 'customer123', '客户');
  const res = await fetch(`${API_URL}/api/admin/channel/miniprogram`, {
    headers: { Authorization: `Bearer ${customer.token}` }
  });
  expect(res.status).to.equal(403);
  const anon = await fetch(`${API_URL}/api/admin/channel/miniprogram`);
  expect(anon.status).to.equal(403);
});

// ==================== 场景四：未配置默认停用 ====================

Then('渠道配置接口返回 enabled=false（默认停用，防止未配置即开放）', async function () {
  const res = await fetch(`${API_URL}/api/admin/channel/miniprogram`, {
    headers: { Authorization: `Bearer ${this._channelOperatorToken}` }
  });
  const body = await res.json();
  expect(body.enabled).to.equal(false);
  expect(body.appsecretConfigured).to.equal(false);
});
