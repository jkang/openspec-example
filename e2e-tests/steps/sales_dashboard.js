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

Given('系统存在混合销售订单数据（已支付、待支付与已取消）', async function () {
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
  // 等数据刷新完成：今日仅 1 个日期标签（避免旧近7日数据未刷新的竞态）
  await this.page.waitForFunction(
    () => [...document.querySelectorAll('svg + div span')].length === 1,
    { timeout: 10000 }
  );
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

// ==================== dashboard_ranking_ 命名空间（story-sales-dashboard-ranking / R-RANK-001~005，防 ambiguous） ====================

/** 商品快照价表（对齐 server 种子）：订单快照价 = 下单时价格，软删除不改动历史订单快照 */
const RANKING_PRODUCT_SNAPSHOTS = { '1': 29900, '2': 8900, '3': 129900, '4': 4500, '5': 6800 };

Given('系统存在跨多商品的近7日成交订单（含软删除商品历史订单）', async function () {
  // 商品 4 置为未分类（categoryId=null）：验证 R-RANK-005 未分类聚合行
  const patchRes = await fetch(`${API_URL}/api/products/4`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ categoryId: null })
  });
  expect(patchRes.status).to.equal(200);
  // 商品 1/2/3 正常成交；商品 4（未分类）成交；商品 5 成交后软删除（历史订单仍计入排行）
  const paid1 = await dashboardCreateOrder('13800000041', '排行买家甲', '1', true);
  const paid2 = await dashboardCreateOrder('13800000042', '排行买家乙', '2', true);
  const paid3 = await dashboardCreateOrder('13800000043', '排行买家丙', '3', true);
  const paid4 = await dashboardCreateOrder('13800000044', '排行买家丁', '4', true);
  const paid5 = await dashboardCreateOrder('13800000045', '排行买家戊', '5', true);
  // 软删除商品 5（下架）：历史订单仍须计入排行（R-RANK-004）
  const delRes = await fetch(`${API_URL}/api/products/5`, { method: 'DELETE' });
  expect(delRes.status).to.equal(200);

  this._dashboardRanking = {
    orders: [paid1, paid2, paid3, paid4, paid5],
    // 期望商品排行（快照价 × 数量，quantity=1）：按销售额降序
    expectedProduct: Object.entries(RANKING_PRODUCT_SNAPSHOTS)
      .map(([productId, priceCents]) => ({ productId, priceCents, quantity: 1 }))
      .sort((a, b) => b.priceCents - a.priceCents)
  };
});

When('运营请求近7日商品与分类排行', async function () {
  const res = await fetch(`${API_URL}/api/admin/dashboard/ranking?dimension=week`, {
    headers: { Authorization: `Bearer ${this._dashboardOperatorToken}` }
  });
  this._dashboardRankingResp = { status: res.status, body: await res.json() };
});

Then('返回商品 TOP10 且按销售额降序', async function () {
  const { status, body } = this._dashboardRankingResp;
  expect(status).to.equal(200);
  expect(body.productRanking.length).to.be.at.most(10);
  for (let i = 1; i < body.productRanking.length; i++) {
    expect(body.productRanking[i - 1].salesCents).to.be.at.least(body.productRanking[i].salesCents);
  }
});

Then('商品销售额等于该商品订单明细快照价之和（含软删除商品）', async function () {
  const { body } = this._dashboardRankingResp;
  // 每个商品的排行销售额 = 订单明细快照 priceCents × quantity 之和（quantity=1 → 快照单价）
  const byId = Object.fromEntries(body.productRanking.map(p => [p.productId, p]));
  const { orders, expectedProduct } = this._dashboardRanking;
  for (const exp of expectedProduct) {
    expect(byId[exp.productId], `商品 ${exp.productId} 应出现在排行中`).to.exist;
    const detailSum = orders
      .filter(o => o.items.some(it => String(it.productId) === exp.productId))
      .reduce((n, o) => n + o.items.find(it => String(it.productId) === exp.productId).priceCents * 1, 0);
    expect(byId[exp.productId].salesCents, `商品 ${exp.productId} 销售额应与明细快照一致`).to.equal(detailSum);
    expect(byId[exp.productId].salesCents).to.equal(exp.priceCents);
  }
  // 软删除商品 5 的历史成交仍计入（R-RANK-004）
  expect(byId['5']).to.exist;
  expect(byId['5'].salesCents).to.equal(6800);
});

Then('分类排行占比合计为100%（含未分类行）', async function () {
  const { body } = this._dashboardRankingResp;
  // 未分类商品（商品 4，categoryId=null）归「未分类」行（R-RANK-005）
  const unclassified = body.categoryRanking.find(c => c.categoryId === null);
  expect(unclassified).to.exist;
  expect(unclassified.salesCents).to.equal(4500);
  // 分类销售额 = 明细快照价汇总（与商品排行同源）
  const categorySum = body.categoryRanking.reduce((n, c) => n + c.salesCents, 0);
  expect(categorySum).to.equal(this._dashboardRanking.orders.reduce(
    (n, o) => n + o.items.reduce((m, it) => m + it.priceCents * it.quantity, 0), 0
  ));
  // 占比合计 ≈ 100%（1 位小数四舍五入容差 ±0.2）
  const ratioSum = body.categoryRanking.reduce((n, c) => n + c.ratio, 0);
  expect(Math.abs(ratioSum - 100)).to.be.at.most(0.2);
});

When('运营在销售看板切换到「今日」查看排行', async function () {
  await this.page.locator('button:has-text("今日")').click();
  // 总览与排行区块标题均切换为今日区间（联动刷新）
  await this.page.waitForFunction(() =>
    document.body.textContent.includes('销售趋势（今日）') &&
    document.body.textContent.includes('商品销售 TOP10（今日）') &&
    document.body.textContent.includes('分类销售排行（今日）')
  );
});

Then('商品与分类排行按今日区间重新聚合且与总览口径一致', async function () {
  // 排行与总览使用同一时间口径（resolveDashboardRange；from 精确一致，to=now 容忍请求间毫秒差）
  const ranking = await (await fetch(`${API_URL}/api/admin/dashboard/ranking?dimension=today`, {
    headers: { Authorization: `Bearer ${this._dashboardOperatorToken}` }
  })).json();
  const sales = await (await fetch(`${API_URL}/api/admin/dashboard/sales?dimension=today`, {
    headers: { Authorization: `Bearer ${this._dashboardOperatorToken}` }
  })).json();
  expect(ranking.range.dimension).to.equal(sales.range.dimension);
  expect(ranking.range.from).to.equal(sales.range.from);
  const toDiff = Math.abs(new Date(ranking.range.to).getTime() - new Date(sales.range.to).getTime());
  expect(toDiff).to.be.at.most(2000); // 同一 resolveDashboardRange 换算，仅 now 毫秒差
  // 今日商品 TOP10 含今日订单商品（商品 1，快照价 29900）
  expect(ranking.productRanking.some(p => p.productId === '1' && p.salesCents === 29900)).to.equal(true);
  // 等待 UI 排行表格渲染今日数据后断言（数据异步刷新，标题先变数据后到）
  await this.page.waitForFunction(() =>
    [...document.querySelectorAll('table tr')].some(r => r.textContent.includes('极简机械键盘'))
  );
  const productCell = await this.page.evaluate(() => {
    const rows = [...document.querySelectorAll('table tr')];
    const row = rows.find(r => r.textContent.includes('极简机械键盘'));
    return row ? row.textContent : null;
  });
  expect(productCell).to.contain('¥299.00');
  expect(productCell).to.contain('1');
});
