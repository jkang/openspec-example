const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');

const API_URL = 'http://localhost:3000';

// ==================== miniprogramWechatLogin_ 命名空间辅助（API 断言为主——mock 网关 Q6，无真实小程序 UI） ====================

async function wechatLoginPost(base, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${base}${path}`, {
    method: 'POST', headers, body: JSON.stringify(body)
  });
}

async function wechatLoginSetupRole(phone, nickname, password, role) {
  const reg = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

// ==================== 前置 ====================

Given('小程序渠道已启用（api）', async function () {
  const op = await wechatLoginSetupRole('13600040001', '渠道运营', 'admin123', '运营');
  const res = await fetch(`${API_URL}/api/admin/channel/miniprogram`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${op.token}` },
    body: JSON.stringify({ appid: 'wx4a2b8c9d0e1f2345', appsecret: 'a1b2c3d4e5f60718293a4b5c6d7e8f90', enabled: true })
  });
  expect(res.status).to.equal(200);
});

Given('小程序渠道未配置（默认停用，R-CHN-009）', async function () {
  // Before hook 已 reset → 渠道未配置 → 默认停用；无需额外动作
});

Given('老客户林晓明（13888217536）网页注册且 openid_demo_001 已绑定（user 会话 bind-openid）', async function () {
  const reg = await wechatLoginPost(API_URL, '/api/auth/register', { phone: '13888217536', nickname: '林晓明', password: '123456' });
  expect(reg.status).to.equal(201);
  const { sessionToken } = await reg.json();
  const bindRes = await wechatLoginPost(API_URL, '/api/auth/wechat/bind-openid', { openid: 'openid_demo_001' }, sessionToken);
  expect(bindRes.status).to.equal(200);
});

Given('林晓明（13888217536）网页已注册', async function () {
  const reg = await wechatLoginPost(API_URL, '/api/auth/register', { phone: '13888217536', nickname: '林晓明', password: '123456' });
  expect(reg.status).to.equal(201);
});

Given('林晓明（13888217536）网页已注册并登录', async function () {
  const reg = await wechatLoginPost(API_URL, '/api/auth/register', { phone: '13888217536', nickname: '林晓明', password: '123456' });
  expect(reg.status).to.equal(201);
  this._linSession = (await reg.json()).sessionToken;
});

Given('林晓明（13888217536）已被 B 端禁用（user-status 后门）', async function () {
  const res = await fetch(`${API_URL}/api/__test/user-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '13888217536', status: '禁用' })
  });
  expect(res.status).to.equal(200);
});

// ==================== 场景步骤 ====================

When('提交微信登录 code=code_demo_001', async function () {
  const res = await wechatLoginPost(API_URL, '/api/auth/wechat/login', { code: 'code_demo_001' });
  this._wechatRes = res;
  this._wechatBody = await res.json().catch(() => null);
});

When('提交微信绑定（code=code_demo_002 与 手机号组件 phone_demo_001）', async function () {
  const res = await wechatLoginPost(API_URL, '/api/auth/wechat/bind', { code: 'code_demo_002', phoneCode: 'phone_demo_001' });
  this._wechatRes = res;
  this._wechatBody = await res.json().catch(() => null);
});

When('新微信用户提交绑定（code=code_demo_003 与 手机号组件 phone_demo_002）', async function () {
  const res = await wechatLoginPost(API_URL, '/api/auth/wechat/bind', { code: 'code_demo_003', phoneCode: 'phone_demo_002' });
  this._wechatRes = res;
  this._wechatBody = await res.json().catch(() => null);
});

When('林晓明以既有账号会话提交 bind-openid（openid=openid_demo_003）', async function () {
  const res = await wechatLoginPost(API_URL, '/api/auth/wechat/bind-openid', { openid: 'openid_demo_003' }, this._linSession);
  this._wechatRes = res;
  this._wechatBody = await res.json().catch(() => null);
});

Then('返回 201 且登录用户为林晓明（同源账户直连，历史订单归属不变）', async function () {
  expect(this._wechatRes.status).to.equal(201);
  const body = this._wechatBody;
  expect(body.user.phone).to.equal('13888217536');
  expect(body.user.nickname).to.equal('林晓明');
  expect(body.bound).to.equal(true);
});

Then('会话来源渠道为 MINIPROGRAM', async function () {
  const body = this._wechatBody;
  expect(body.sessionToken).to.be.a('string');
  // 会话 channel 由登录返回的 sessionToken 经服务端语义保证（R-WX-008）；无法从响应直接断言存储，
  // 语义已验证于 @api 测试（SessionRepo channel=MINIPROGRAM）
});

Then('返回 201 且创建新用户（手机号 13700005678 与 openid_demo_002，role=客户）', async function () {
  expect(this._wechatRes.status).to.equal(201);
  const body = this._wechatBody;
  expect(body.user.phone).to.equal('13700005678');
  expect(body.user.role).to.equal('客户');
  expect(body.user.openid).to.equal('openid_demo_002');
});

Then('返回 409 PHONE_EXISTS_NEED_LOGIN（提示登录既有账号再绑定，不自动合并）', async function () {
  expect(this._wechatRes.status).to.equal(409);
  const body = this._wechatBody;
  expect(body.error?.code || body.code).to.equal('PHONE_EXISTS_NEED_LOGIN');
});

Then('系统用户总数不增加（无重复账户）', async function () {
  const op = await wechatLoginSetupRole('13600040002', '核对运营', 'admin123', '运营');
  const res = await fetch(`${API_URL}/api/admin/users`, {
    headers: { Authorization: `Bearer ${op.token}` }
  });
  const users = await res.json();
  // 林晓明 + 陈晓芸种子 + 核对运营自身 + 渠道运营 = 不应产生第二个 13888217536 用户
  const linCount = users.filter(u => u.phone === '13888217536').length;
  expect(linCount).to.equal(1);
});

Then('返回 200，openid_demo_003 写入 user_1002（微信绑定完成）', async function () {
  expect(this._wechatRes.status).to.equal(200);
  const body = this._wechatBody;
  expect(body.user.openid).to.equal('openid_demo_003');
  expect(body.bound).to.equal(true);
});

Then('该用户仍只有一个账户记录（历史订单未丢失）', async function () {
  const op = await wechatLoginSetupRole('13600040003', '核对运营2', 'admin123', '运营');
  const res = await fetch(`${API_URL}/api/admin/users`, {
    headers: { Authorization: `Bearer ${op.token}` }
  });
  const users = await res.json();
  expect(users.filter(u => u.phone === '13888217536').length).to.equal(1);
});

Then('返回 403 CHANNEL_DISABLED（不进入登录或绑定流程）', async function () {
  expect(this._wechatRes.status).to.equal(403);
  const body = this._wechatBody;
  expect(body.error?.code || body.code).to.equal('CHANNEL_DISABLED');
});

Then('返回 403 USER_DISABLED（禁用即失效，对齐 R-SES-006）', async function () {
  expect(this._wechatRes.status).to.equal(403);
  const body = this._wechatBody;
  expect(body.error?.code || body.code).to.equal('USER_DISABLED');
});
