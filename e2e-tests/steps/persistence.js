const { Given, When, Then, Before, After } = require('@cucumber/cucumber');
const { expect } = require('chai');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

// ==================== 持久化旅程（@persist）====================
// 独立端口 + 独立临时数据目录，进程级 spawn/重启，验证文件持久化与重启恢复。
// 不依赖 Vue 前端（直接用 HTTP API 携带会话凭证），与 e2e:run 的内存语义完全隔离。

const PORT = 3011;
const BASE = `http://127.0.0.1:${PORT}`;
const SERVER_ENTRY = path.resolve(__dirname, '../../ecommerce/ecommerce-mini/src/http/server.js');
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-persist-'));

let backend = null;
const ctx = {};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function stopBackend() {
  if (backend) {
    backend.kill('SIGKILL');
    backend = null;
  }
}

async function startBackend() {
  stopBackend();
  backend = spawn('node', [SERVER_ENTRY], {
    env: { ...process.env, STORAGE: 'file', DATA_DIR, PORT: String(PORT) },
    stdio: 'ignore',
  });
  // 等待后端就绪（最多 20s）
  for (let i = 0; i < 100; i++) {
    try {
      const res = await fetch(`${BASE}/api/products`);
      if (res.ok) return;
    } catch (e) { /* 未就绪，重试 */ }
    await sleep(200);
  }
  throw new Error('文件存储后端启动超时');
}

async function api(method, p, body, headers = {}) {
  const res = await fetch(`${BASE}${p}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch (e) { /* 非 JSON 响应 */ }
  return { status: res.status, body: json };
}

const readJsonFile = (file) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf-8'));

Before({ tags: '@persist' }, async function () {
  // 清空上下文（每次场景独立）
  Object.keys(ctx).forEach(k => delete ctx[k]);
});

After({ tags: '@persist' }, async function () {
  stopBackend();
  // 清理临时数据目录，避免每次运行残留 /tmp/e2e-persist-*
  if (DATA_DIR) {
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
  }
});

// ---------- 生命周期与写操作 ----------

Given('文件存储后端已启动（临时数据目录）', async function () {
  await startBackend();
});

When('买家注册新账号并自动登录', async function () {
  const phone = `139${String(Date.now()).slice(-8)}`;
  const res = await api('POST', '/api/auth/register', { phone, nickname: '持久化买家', password: '123456' });
  expect(res.status).to.equal(201);
  expect(res.body.sessionToken).to.be.a('string').and.not.empty;
  ctx.phone = phone;
  ctx.userId = res.body.user.id;
  ctx.sessionToken = res.body.sessionToken;
  ctx.authHeaders = { Authorization: `Bearer ${ctx.sessionToken}` };
});

When('买家将商品加入购物车并完成下单与支付', async function () {
  const cart = await api('POST', '/api/cart/items', { productId: '1', quantity: 1 }, ctx.authHeaders);
  expect(cart.status).to.equal(200);
  const order = await api('POST', '/api/orders', {}, ctx.authHeaders);
  expect(order.status).to.equal(201);
  ctx.orderId = order.body.id;
  const pay = await api('POST', `/api/payments/${ctx.orderId}`);
  expect(pay.status).to.equal(200);
  expect(pay.body.status).to.equal('PAID');
  ctx.expectedStatus = 'PAID';
});

Then('数据文件已真实落盘（用户、会话、订单文件均含对应记录）', function () {
  const users = readJsonFile('users.json');
  expect(users.some(u => u.phone === ctx.phone)).to.be.true;
  const sessions = readJsonFile('sessions.json');
  expect(sessions.some(s => s.token === ctx.sessionToken)).to.be.true;
  const orders = readJsonFile('orders.json');
  const stored = orders.find(o => o.id === ctx.orderId);
  expect(stored, 'orders.json 应含订单').to.exist;
  expect(stored.status).to.equal('PAID');
});

// ---------- 进程级重启与恢复验证 ----------

When('后端进程停止并再次启动（同一数据目录）', async function () {
  stopBackend();
  await sleep(300); // 确保端口释放
  await startBackend();
});

Then('原会话凭证访问我的订单仍返回该订单', async function () {
  const mine = await api('GET', '/api/orders', undefined, ctx.authHeaders);
  expect(mine.status).to.equal(200);
  const found = mine.body.find(o => o.id === ctx.orderId);
  expect(found, '重启后历史订单应可见').to.exist;
});

Then('订单状态与重启前一致（已支付）', async function () {
  const mine = await api('GET', '/api/orders', undefined, ctx.authHeaders);
  const found = mine.body.find(o => o.id === ctx.orderId);
  expect(found.status).to.equal(ctx.expectedStatus);
});

Then('注册用户可用原手机号重新登录', async function () {
  const login = await api('POST', '/api/auth/login', { phone: ctx.phone, password: '123456' });
  expect(login.status).to.equal(201);
  expect(login.body.user.id).to.equal(ctx.userId);
  expect(login.body.sessionToken).to.be.a('string').and.not.empty;
});
