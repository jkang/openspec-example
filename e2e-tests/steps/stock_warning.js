const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');

const STORE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3000';

// ==================== stock_warning_ 命名空间辅助（防 ambiguous，对齐 dashboard_ 先例） ====================

/** 预警场景库存基线（story.md 旅程 1）：{ productId: stock } */
const STOCK_BASELINE = { '1': 3, '2': 8, '3': 5, '4': 0, '5': 15, '6': 40 };

/** 预警场景近7日销量构造（订单明细 quantity 求和 → dailyAvg = ceil(sales7d÷7, 0.1)）：键盘 1.2→2.5 天 / 鼠标 2.0→4 天 / 显示器 0.3→16.7 天 / 收纳架售罄 / 支架 0.2→75 天 */
const SALES_QTY = { '1': 8, '2': 14, '3': 2, '4': 28, '5': 1, '6': 0 };

/** 注册（幂等）→ 角色后门 → 登录，返回含最新 role 的会话（对齐 dashboardSetupRole） */
async function stockWarningSetupRole(phone, nickname, password, role) {
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

/** 构造一笔已支付订单（quantity 件），返回订单对象（paidAt=now 落入近7日窗口） */
async function stockWarningCreatePaidOrder(phone, productId, quantity) {
  const { token } = await stockWarningSetupRole(phone, `买家${String(phone).slice(-4)}`, '123456', '客户');
  const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  await fetch(`${API_URL}/api/cart/items`, {
    method: 'POST', headers: authHeaders, body: JSON.stringify({ productId: String(productId), quantity })
  });
  const orderRes = await fetch(`${API_URL}/api/orders`, {
    method: 'POST', headers: authHeaders, body: JSON.stringify({})
  });
  expect(orderRes.status).to.equal(201);
  const order = await orderRes.json();
  const payRes = await fetch(`${API_URL}/api/payments/${order.id}`, { method: 'POST' });
  expect(payRes.status).to.equal(200);
  return payRes.json();
}

/** 将会话写入浏览器 localStorage（模拟该角色的浏览器，供 UI 链路） */
async function stockWarningWriteSession(page, token, user) {
  await page.evaluate(({ token, user }) => {
    localStorage.setItem('ecommerce_session', token);
    localStorage.setItem('ecommerce_user', JSON.stringify(user));
  }, { token, user });
}

/**
 * 构造 story 旅程 1 场景数据（对齐 story.md 数据口径）：
 * ① 先建已支付订单（支付即扣库存）→ ② 后门精确设置库存（PUT /api/products/:id 开放后门）→
 * ③ 商品级覆盖阈值 15（仅运营可写，内联运营会话）。返回运营会话供后续断言。
 */
async function stockWarningSetupScenarioData() {
  for (const [pid, qty] of Object.entries(SALES_QTY)) {
    if (qty > 0) await stockWarningCreatePaidOrder(`1380000310${pid}`, pid, qty);
  }
  for (const [pid, stock] of Object.entries(STOCK_BASELINE)) {
    const res = await fetch(`${API_URL}/api/products/${pid}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stock })
    });
    expect(res.status).to.equal(200);
  }
  const op = await stockWarningSetupRole('13600003201', '数据运营', 'admin123', '运营');
  const cfgRes = await fetch(`${API_URL}/api/admin/products/5/stock-config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${op.token}` },
    body: JSON.stringify({ threshold: 15 })
  });
  expect(cfgRes.status).to.equal(200);
  return op;
}

/**
 * 老板只读视角场景数据（user_1003 种子保全版）：
 * memory 模式种子不推进序列（既有行为），注册第 3 个用户会覆盖种子 user_1003（老板）。
 * 故本场景仅构造 2 笔订单（2 次注册 → user_1001/user_1002，不触碰 user_1003）：
 * 键盘 8 件 / 鼠标 14 件 → 预警 4 项（收纳架已售罄 + 键盘/鼠标超卖风险 + 显示器低库存），健康度可算。
 */
async function stockWarningSetupBossData() {
  await stockWarningCreatePaidOrder('13800003108', '1', 8); // 键盘 1.2 件/日 → 2.5 天 → 超卖风险
  await stockWarningCreatePaidOrder('13800003109', '2', 14); // 鼠标 4 天 → 超卖风险
  const stocks = { '1': 3, '2': 8, '3': 5, '4': 0, '6': 40 };
  for (const [pid, stock] of Object.entries(stocks)) {
    const res = await fetch(`${API_URL}/api/products/${pid}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stock })
    });
    expect(res.status).to.equal(200);
  }
}

/** 后门精确设置商品库存（测试链路开放端点 PUT /api/products/:id） */
async function stockWarningSetStock(productId, stock) {
  const res = await fetch(`${API_URL}/api/products/${productId}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stock })
  });
  expect(res.status).to.equal(200);
}

/** 读取指定商品行指定列单元格文本（8 列：0 商品名 / 1 当前库存 / 2 预警阈值 / 3 近7日日均销量 / 4 预计售罄天数 / 5 超卖风险标识 / 6 建议补货量 / 7 状态） */
async function stockWarningRowCellText(page, productName, cellIndex) {
  const row = page.locator('tbody tr', { hasText: productName }).first();
  await row.waitFor({ timeout: 10000 });
  return (await row.locator('td').nth(cellIndex).textContent()).trim();
}

/** 运营登录并进入库存预警页面（陈晓芸种子手机号对应操作人） */
async function stockWarningEnterOperatorPage(page, this_) {
  const { token, user } = await stockWarningSetupRole('13600000020', '陈晓芸', 'admin123', '运营');
  this_._stockOperatorToken = token;
  // 只读聚合断言基线：在数据构造完成、进入巡检（页面加载）前捕获，验证巡检过程零写操作
  this_._stockBefore = {
    products: await (await fetch(`${API_URL}/api/products`)).json(),
    orders: await (await fetch(`${API_URL}/api/admin/orders`)).json()
  };
  await page.goto(STORE_URL);
  await page.waitForSelector('button:has-text("加入购物车")');
  await stockWarningWriteSession(page, token, user);
  await page.reload();
  await page.waitForSelector('button:has-text("加入购物车")');
  await page.locator('button:has-text("运营后台")').click();
  await page.locator('nav a:has-text("库存预警")').click();
  await page.waitForSelector('h2:has-text("库存预警")');
  await page.waitForFunction(() => document.querySelectorAll('tbody tr').length >= 0);
}

// ==================== 前置：数据与角色会话 ====================

Given('系统存在预警场景库存与订单数据（键盘3·鼠标8·显示器5·收纳架0·支架15覆盖15·氛围灯40）', async function () {
  await stockWarningSetupScenarioData();
});

Given('系统存在老板只读视角库存与订单数据（键盘3·鼠标8·显示器5·收纳架0·氛围灯40）', async function () {
  // 保全 user_1003 种子：仅 2 笔订单（见 stockWarningSetupBossData 注释）
  await stockWarningSetupBossData();
});

Given('运营陈晓芸已登录并进入库存预警页面', async function () {
  await stockWarningEnterOperatorPage(this.page, this);
});

Given('无线办公鼠标以全局阈值 10 入列预警', async function () {
  // 先于运营进入页面：后门精确设置库存 8（支付链路已扣库存后回写基线）
  const res = await fetch(`${API_URL}/api/products/2`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stock: 8 })
  });
  expect(res.status).to.equal(200);
  // API 级确认：8 ≤ 全局 10 → 入列（thresholdSource=global）
  const op = await stockWarningSetupRole('13600000020', '陈晓芸', 'admin123', '运营');
  const stock = await (await fetch(`${API_URL}/api/admin/dashboard/stock`, {
    headers: { Authorization: `Bearer ${op.token}` }
  })).json();
  const mouse = stock.items.find(i => i.productId === '2');
  expect(mouse).to.exist;
  expect(mouse.listed).to.equal(true);
  expect(mouse.thresholdSource).to.equal('global');
});

Given('客服小李已登录（客服角色）', async function () {
  const { token, user } = await stockWarningSetupRole('13600000022', '客服小李', 'service123', '客服');
  await this.page.goto(STORE_URL);
  await this.page.waitForSelector('button:has-text("加入购物车")');
  await stockWarningWriteSession(this.page, token, user);
  await this.page.reload();
  await this.page.waitForSelector('button:has-text("加入购物车")');
  await this.page.locator('button:has-text("运营后台")').click();
  await this.page.waitForSelector('text=新建优惠券规则');
  this._stockServiceToken = token;
});

Given('客户小林已登录（客户角色）', async function () {
  const { token, user } = await stockWarningSetupRole('13600000023', '客户小林', 'customer123', '客户');
  await this.page.goto(STORE_URL);
  await this.page.waitForSelector('button:has-text("加入购物车")');
  await stockWarningWriteSession(this.page, token, user);
  await this.page.reload();
  await this.page.waitForSelector('button:has-text("加入购物车")');
  await this.page.locator('button:has-text("运营后台")').click();
  await this.page.waitForSelector('text=新建优惠券规则');
  this._stockCustomerToken = token;
});

Given('老板李老板（user_1003）已登录并进入库存预警页面', async function () {
  // 复用种子账号 user_1003（role=老板，昵称 李老板，密码 boss123）
  const login = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '13612345678', password: 'boss123' })
  });
  expect(login.status).to.equal(201);
  const body = await login.json();
  expect(body.user.id).to.equal('user_1003');
  expect(body.user.role).to.equal('老板');
  this._stockBossToken = body.sessionToken;
  await this.page.goto(STORE_URL);
  await this.page.waitForSelector('button:has-text("加入购物车")');
  await stockWarningWriteSession(this.page, body.sessionToken, body.user);
  await this.page.reload();
  await this.page.waitForSelector('button:has-text("加入购物车")');
  await this.page.locator('button:has-text("运营后台")').click();
  await this.page.locator('nav a:has-text("库存预警")').click();
  await this.page.waitForSelector('h2:has-text("库存预警")');
});

// ==================== 场景一：运营巡检预警列表主流程 ====================

When('运营查看预警列表', async function () {
  // 等待预警列表数据渲染（异步拉取 GET /api/admin/dashboard/stock）
  await this.page.waitForFunction(() => document.querySelectorAll('tbody tr').length > 0, { timeout: 10000 });
  this._stockRows = await this.page.locator('tbody tr').allTextContents();
});

Then('预警中列表共 5 项且已售罄商品置顶（accent 已售罄 Badge）', async function () {
  const rows = this._stockRows;
  expect(rows.length).to.equal(5);
  // 桌面收纳架（stock=0）置顶且展示 accent「已售罄」Badge
  const firstRow = await this.page.locator('tbody tr').first();
  const firstText = await firstRow.textContent();
  expect(firstText).to.contain('桌面收纳架');
  expect(firstText).to.contain('已售罄');
  expect(firstText).to.contain('0 件');
});

Then('键盘与鼠标展示超卖风险 Badge（预计售罄天数 < 7 天）', async function () {
  // API 级风险断言（硬断言：R-STOCK-003 语义）
  const stock = await (await fetch(`${API_URL}/api/admin/dashboard/stock`, {
    headers: { Authorization: `Bearer ${this._stockOperatorToken}` }
  })).json();
  const keyboard = stock.items.find(i => i.productId === '1');
  const mouse = stock.items.find(i => i.productId === '2');
  expect(keyboard.risk).to.equal(true); // 2.625 天 < 7
  expect(mouse.risk).to.equal(true); // 4 天 < 7
  expect(keyboard.daysToSellout).to.be.within(2.4, 2.8); // ≈2.5~2.6 取近似
  expect(mouse.daysToSellout).to.equal(4);
  // UI 级：预警中 Tab 键盘/鼠标行展示琥珀「超卖风险」Badge
  await this.page.waitForFunction(() =>
    document.body.textContent.includes('超卖风险')
  );
  const kbRow = await this.page.locator('tbody tr', { hasText: '极简机械键盘' }).first().textContent();
  const msRow = await this.page.locator('tbody tr', { hasText: '无线办公鼠标' }).first().textContent();
  expect(kbRow).to.contain('超卖风险');
  expect(msRow).to.contain('超卖风险');
});

Then('支架以「覆盖」阈值入列而氛围灯位于健康水位', async function () {
  // 支架：覆盖阈值 15 入列（15 ≤ 15），阈值标注「覆盖」
  const standRow = await this.page.locator('tbody tr', { hasText: '铝合金笔记本支架' }).first().textContent();
  expect(standRow).to.contain('覆盖');
  expect(standRow).to.contain('15');
  // 氛围灯：40 > 10 不入列 → 切健康水位 Tab 可见
  await this.page.locator('button:has-text("健康水位")').click();
  await this.page.waitForFunction(() => document.body.textContent.includes('桌面拾音氛围灯'));
  const lampRow = await this.page.locator('tbody tr', { hasText: '桌面拾音氛围灯' }).first().textContent();
  expect(lampRow).to.contain('库存充足');
  // 切回预警中 Tab（恢复后续断言上下文）
  await this.page.locator('button:has-text("预警中")').click();
  await this.page.waitForFunction(() => document.body.textContent.includes('桌面收纳架'));
});

Then('预警列表按已售罄置顶 → 预计售罄天数升序排序', async function () {
  const names = [];
  const rows = this.page.locator('tbody tr');
  const count = await rows.count();
  for (let i = 0; i < count; i++) {
    names.push((await rows.nth(i).textContent()).trim());
  }
  // 已售罄置顶 → 2.625 → 4 → 17.5 → 105（升序）
  expect(names[0]).to.contain('桌面收纳架');
  expect(names[1]).to.contain('极简机械键盘');
  expect(names[2]).to.contain('无线办公鼠标');
  expect(names[3]).to.contain('高清显示器');
  expect(names[4]).to.contain('铝合金笔记本支架');
});

Then('本次巡检后商品库存与订单无任何变更（只读聚合）', async function () {
  const after = {
    products: await (await fetch(`${API_URL}/api/products`)).json(),
    orders: await (await fetch(`${API_URL}/api/admin/orders`)).json()
  };
  expect(after.products).to.deep.equal(this._stockBefore.products);
  expect(after.orders).to.deep.equal(this._stockBefore.orders);
});

// ==================== 场景二：阈值配置即时生效 ====================

When('运营将无线办公鼠标的商品级覆盖阈值设为 5 并保存', async function () {
  // 预警中 Tab 找到鼠标行 → 行内覆盖阈值输入（aria-label=商品级覆盖阈值）填 5 → 行内「保存」
  const row = this.page.locator('tbody tr', { hasText: '无线办公鼠标' }).first();
  await row.waitFor({ timeout: 10000 });
  const input = row.locator('input[aria-label="商品级覆盖阈值"]');
  await input.waitFor({ state: 'visible', timeout: 10000 });
  await input.fill('5');
  await row.locator('button:has-text("保存")').click();
  // 等待保存反馈 + 列表刷新（鼠标移出预警）
  await this.page.waitForFunction(() =>
    document.body.textContent.includes('✓ 已保存 · 阈值已即时生效'), { timeout: 10000 }
  );
});

Then('页面展示「✓ 已保存 · 阈值已即时生效」', async function () {
  const body = await this.page.locator('body').textContent();
  expect(body).to.contain('✓ 已保存 · 阈值已即时生效');
});

Then('无线办公鼠标（8 > 5）移出预警列表', async function () {
  // 预警中 Tab 不再包含鼠标行
  await this.page.waitForFunction(() => {
    const rows = [...document.querySelectorAll('tbody tr')];
    return !rows.some(r => r.textContent.includes('无线办公鼠标'));
  }, { timeout: 10000 });
  // API 级：8 > 5 → listed=false（覆盖 5）
  const stock = await (await fetch(`${API_URL}/api/admin/dashboard/stock`, {
    headers: { Authorization: `Bearer ${this._stockOperatorToken}` }
  })).json();
  const mouse = stock.items.find(i => i.productId === '2');
  expect(mouse.listed).to.equal(false);
  expect(mouse.thresholdSource).to.equal('override');
});

When('运营将无线办公鼠标的覆盖阈值改回 10 并保存', async function () {
  // 鼠标已移出预警 → 切健康水位 Tab 找到其行 → 改回 10 → 保存
  await this.page.locator('button:has-text("健康水位")').click();
  await this.page.waitForFunction(() => {
    const rows = [...document.querySelectorAll('tbody tr')];
    return rows.some(r => r.textContent.includes('无线办公鼠标'));
  }, { timeout: 10000 });
  const row = this.page.locator('tbody tr', { hasText: '无线办公鼠标' }).first();
  const input = row.locator('input[aria-label="商品级覆盖阈值"]');
  await input.waitFor({ state: 'visible', timeout: 10000 });
  await input.fill('10');
  await row.locator('button:has-text("保存")').click();
  await this.page.waitForFunction(() =>
    document.body.textContent.includes('✓ 已保存 · 阈值已即时生效'), { timeout: 10000 }
  );
});

Then('无线办公鼠标重新按 8 ≤ 10 入列预警（即时生效双向调整）', async function () {
  // 切回预警中 Tab：鼠标重新入列
  await this.page.locator('button:has-text("预警中")').click();
  await this.page.waitForFunction(() => {
    const rows = [...document.querySelectorAll('tbody tr')];
    return rows.some(r => r.textContent.includes('无线办公鼠标'));
  }, { timeout: 10000 });
  const row = await this.page.locator('tbody tr', { hasText: '无线办公鼠标' }).first().textContent();
  expect(row).to.contain('覆盖'); // 覆盖 10 标注
});

Then('配置已持久化且下一次查询生效（覆盖值 10）', async function () {
  // 内存模式 E2E：落盘语义由 @unit/@api（StockConfigFileRepo）覆盖；
  // 此处断言持久化配置在下一次查询中生效（overrides 含覆盖值 10 且阈值标注为覆盖）
  const stock = await (await fetch(`${API_URL}/api/admin/dashboard/stock`, {
    headers: { Authorization: `Bearer ${this._stockOperatorToken}` }
  })).json();
  expect(stock.overrides['2']).to.equal(10);
  const mouse = stock.items.find(i => i.productId === '2');
  expect(mouse.listed).to.equal(true);
  expect(mouse.thresholdSource).to.equal('override');
});

// ==================== 场景三：权限门禁（403 / 401 + 导航不可见） ====================

When('客服访问库存预警接口', async function () {
  const res = await fetch(`${API_URL}/api/admin/dashboard/stock`, {
    headers: { Authorization: `Bearer ${this._stockServiceToken}` }
  });
  this._stockForbidden = { status: res.status, raw: await res.text() };
});

Then('返回 403 且不返回任何库存与预警数据', async function () {
  expect(this._stockForbidden.status).to.equal(403);
  expect(JSON.parse(this._stockForbidden.raw).code).to.equal('FORBIDDEN');
  expect(this._stockForbidden.raw).to.not.contain('items');
  expect(this._stockForbidden.raw).to.not.contain('dailyAvg');
  expect(this._stockForbidden.raw).to.not.contain('globalThreshold');
});

Then('B 端导航不展示「库存预警」入口', async function () {
  const count = await this.page.locator('nav a:has-text("库存预警")').count();
  expect(count).to.equal(0);
});

When('客户访问库存预警接口', async function () {
  const res = await fetch(`${API_URL}/api/admin/dashboard/stock`, {
    headers: { Authorization: `Bearer ${this._stockCustomerToken}` }
  });
  this._stockCustomerForbidden = { status: res.status, raw: await res.text() };
});

Then('客户访问同样返回 403 且不返回任何库存与预警数据', async function () {
  expect(this._stockCustomerForbidden.status).to.equal(403);
  expect(JSON.parse(this._stockCustomerForbidden.raw).code).to.equal('FORBIDDEN');
  expect(this._stockCustomerForbidden.raw).to.not.contain('items');
  expect(this._stockCustomerForbidden.raw).to.not.contain('dailyAvg');
  expect(this._stockCustomerForbidden.raw).to.not.contain('globalThreshold');
});

Then('客户侧 B 端导航也不展示「库存预警」入口', async function () {
  const count = await this.page.locator('nav a:has-text("库存预警")').count();
  expect(count).to.equal(0);
});

Then('未登录访问库存预警接口返回 401', async function () {
  const res = await fetch(`${API_URL}/api/admin/dashboard/stock`);
  expect(res.status).to.equal(401);
  const body = await res.json();
  expect(body.code).to.equal('UNAUTHORIZED');
  expect(body.message).to.equal('请先登录');
});

// ==================== 场景四：老板只读视角（user_1003 种子） ====================

Then('页面展示「纯只读 · 无配置入口」标识且无「保存配置」按钮与阈值输入框', async function () {
  const body = await this.page.locator('body').textContent();
  expect(body).to.contain('纯只读 · 无配置入口');
  expect(await this.page.locator('button:has-text("保存配置")').count()).to.equal(0);
  expect(await this.page.locator('input[aria-label="全局默认阈值"]').count()).to.equal(0);
  expect(await this.page.locator('input[aria-label="商品级覆盖阈值"]').count()).to.equal(0);
});

Then('展示全局库存健康度总览卡片（预警商品数、已售罄数、超卖风险数）', async function () {
  // 场景数据（老板保全版）：预警 4 项（含收纳架已售罄 1 项、键盘/鼠标超卖风险 2 项）
  await this.page.waitForSelector('text=全局库存健康度总览');
  const body = await this.page.locator('body').textContent();
  expect(body).to.contain('预警商品数');
  expect(body).to.contain('已售罄数');
  expect(body).to.contain('超卖风险数');
  // 数值与 API 一致（健康度卡片框架：可算 3 项计数）
  const stock = await (await fetch(`${API_URL}/api/admin/dashboard/stock`, {
    headers: { Authorization: `Bearer ${this._stockBossToken}` }
  })).json();
  const warningCount = stock.items.filter(i => i.listed).length;
  const soldOutCount = stock.items.filter(i => i.stock === 0).length;
  const riskCount = stock.items.filter(i => i.risk).length;
  expect(warningCount).to.equal(4);
  expect(soldOutCount).to.equal(1);
  expect(riskCount).to.equal(2);
  // UI 卡片数值渲染（数字对应；预警中 Tab 计数「预警中 · 4」亦含 4）
  await this.page.waitForFunction((expected) =>
    document.body.textContent.includes(String(expected[0])) &&
    document.body.textContent.includes(String(expected[1])) &&
    document.body.textContent.includes(String(expected[2]))
  , [warningCount, soldOutCount, riskCount]);
});

Then('老板可只读访问销售看板（200）', async function () {
  const res = await fetch(`${API_URL}/api/admin/dashboard/sales`, {
    headers: { Authorization: `Bearer ${this._stockBossToken}` }
  });
  expect(res.status).to.equal(200);
  expect((await res.json()).metrics).to.exist;
});

// ==================== 场景五~八：补货建议增量（story-stock-replenish-suggestion，R-STOCK-101~107） ====================

// ---- 场景五：运营补货建议主流程（公式与订单明细一致） ----

Then('极简机械键盘行展示日均 1.2 件\\/日、售罄 2.5 天、建议补货量 6 件（primary）', async function () {
  const daily = await stockWarningRowCellText(this.page, '极简机械键盘', 3);
  expect(daily).to.contain('1.2 件/日');
  expect(daily).to.contain('近7日 8 件');
  expect(await stockWarningRowCellText(this.page, '极简机械键盘', 4)).to.equal('2.5 天');
  const replenishCell = this.page.locator('tbody tr', { hasText: '极简机械键盘' }).first().locator('td').nth(6);
  expect((await replenishCell.textContent()).trim()).to.equal('6 件');
  expect(await replenishCell.locator('span.text-primary').count()).to.equal(1); // replenish>0 → primary
});

Then('无线办公鼠标行展示日均 2.0 件\\/日、售罄 4 天、建议补货量 6 件（primary）', async function () {
  const daily = await stockWarningRowCellText(this.page, '无线办公鼠标', 3);
  expect(daily).to.contain('2.0 件/日');
  expect(daily).to.contain('近7日 14 件');
  expect(await stockWarningRowCellText(this.page, '无线办公鼠标', 4)).to.equal('4 天');
  const replenishCell = this.page.locator('tbody tr', { hasText: '无线办公鼠标' }).first().locator('td').nth(6);
  expect((await replenishCell.textContent()).trim()).to.equal('6 件');
  expect(await replenishCell.locator('span.text-primary').count()).to.equal(1);
});

Then('桌面收纳架（已售罄）行展示日均 4.0 件\\/日、售罄 0 天、建议补货量 28 件（accent）', async function () {
  const daily = await stockWarningRowCellText(this.page, '桌面收纳架', 3);
  expect(daily).to.contain('4.0 件/日');
  expect(daily).to.contain('近7日 28 件');
  expect(await stockWarningRowCellText(this.page, '桌面收纳架', 4)).to.equal('0 天');
  const replenishCell = this.page.locator('tbody tr', { hasText: '桌面收纳架' }).first().locator('td').nth(6);
  expect((await replenishCell.textContent()).trim()).to.equal('28 件');
  expect(await replenishCell.locator('span.text-accent').count()).to.equal(1); // stock=0 → accent
});

Then('高清显示器行展示日均 0.3 件\\/日、售罄 16.7 天、建议补货量「无需补货」（muted）', async function () {
  const daily = await stockWarningRowCellText(this.page, '高清显示器', 3);
  expect(daily).to.contain('0.3 件/日');
  expect(daily).to.contain('近7日 2 件');
  expect(await stockWarningRowCellText(this.page, '高清显示器', 4)).to.equal('16.7 天');
  const replenishCell = this.page.locator('tbody tr', { hasText: '高清显示器' }).first().locator('td').nth(6);
  expect((await replenishCell.textContent()).trim()).to.equal('无需补货'); // R-STOCK-106 铁律
  expect(await replenishCell.locator('span.text-muted-foreground').count()).to.equal(1);
});

Then('建议补货量与公式 max\\(0, ⌈日均销量×7⌉ − 库存\\) 逐一吻合且列表标题展示真实公式', async function () {
  // API 级：replenish 与公式 max(0, ⌈dailyAvg×7⌉ − stock) 逐一吻合（与订单明细一致）
  const stock = await (await fetch(`${API_URL}/api/admin/dashboard/stock`, {
    headers: { Authorization: `Bearer ${this._stockOperatorToken}` }
  })).json();
  const expectations = { '1': 6, '2': 6, '4': 28, '3': 0, '5': 0 };
  for (const [pid, expected] of Object.entries(expectations)) {
    const item = stock.items.find(i => i.productId === pid);
    expect(item).to.exist;
    const formula = Math.max(0, Math.ceil(item.dailyAvg * 7) - item.stock);
    expect(item.replenish).to.equal(expected);
    expect(item.replenish).to.equal(formula, `商品 ${pid} replenish 与公式不一致`);
  }
  // UI 级：列表标题口径说明为真实公式（移除「待 P1 补齐」占位）
  const body = await this.page.locator('body').textContent();
  expect(body).to.contain('建议补货量 = max(0, ⌈日均销量×7⌉ − 当前库存)');
  expect(body).to.not.contain('建议补货量待「补货建议」Story 补齐');
});

Then('表格底部脚注保留「到货周期固定 7 天（MVP）」', async function () {
  const body = await this.page.locator('body').textContent();
  expect(body).to.contain('到货周期固定 7 天（MVP）· 无销量商品不计算售罄天数');
});

// ---- 场景六：无销量商品处理 ----

Given('系统存在无销量低库存商品（氛围灯 stock=5）与健康水位商品（高清显示器 stock=40）', async function () {
  // 无销量（SALES_QTY 中商品 6 无订单）stock=5 ≤ 全局 10 → 入列；健康水位 stock=40 → 不入列
  await stockWarningSetStock('6', 5);
  await stockWarningSetStock('3', 40);
});

Then('无销量商品仍按 stock ≤ 阈值 入列预警且日均销量列显示「暂无销量」', async function () {
  const row = this.page.locator('tbody tr', { hasText: '桌面拾音氛围灯' }).first();
  await row.waitFor({ timeout: 10000 });
  const daily = await row.locator('td').nth(3).textContent();
  expect(daily).to.contain('暂无销量'); // R-STOCK-105
});

Then('无销量商品售罄天数列显示「—」且无「超卖风险」Badge', async function () {
  const row = this.page.locator('tbody tr', { hasText: '桌面拾音氛围灯' }).first();
  const days = await row.locator('td').nth(4).textContent();
  expect(days.trim()).to.equal('—'); // 无销量不计算售罄天数
  const risk = await row.locator('td').nth(5).textContent();
  expect(risk).to.not.contain('超卖风险');
  const status = await row.locator('td').nth(7).textContent();
  expect(status).to.not.contain('已售罄'); // 仅低库存入列，非售罄
});

Then('无销量商品建议补货量列展示「无需补货」（公式结果为 0）', async function () {
  const row = this.page.locator('tbody tr', { hasText: '桌面拾音氛围灯' }).first();
  const replenish = await row.locator('td').nth(6).textContent();
  expect(replenish.trim()).to.equal('无需补货'); // R-STOCK-106 铁律
});

Then('健康水位商品不入列预警', async function () {
  // 预警中 Tab 仅无销量低库存商品 1 项；高清显示器（stock=40）不在预警中
  await this.page.waitForFunction(() => document.querySelectorAll('tbody tr').length === 1, { timeout: 10000 });
  const rows = await this.page.locator('tbody tr').allTextContents();
  expect(rows.length).to.equal(1);
  expect(rows[0]).to.contain('桌面拾音氛围灯');
  expect(rows[0]).to.not.contain('高清显示器');
});

// ---- 场景七：老板健康度总览（数值与 API 一致） ----

Then('全局库存健康度总览三卡片数值与 API healthOverview 一致（预警 4 \\/ 已售罄 1 \\/ 超卖风险 2）', async function () {
  await this.page.waitForSelector('text=全局库存健康度总览');
  // API 级：healthOverview 后端权威数值
  const stock = await (await fetch(`${API_URL}/api/admin/dashboard/stock`, {
    headers: { Authorization: `Bearer ${this._stockBossToken}` }
  })).json();
  expect(stock.healthOverview).to.deep.equal({ warningCount: 4, soldOutCount: 1, riskCount: 2 });
  // UI 级：三卡片数值与 API 一致（定位健康度卡片区，避免与列表计数混淆）
  const section = this.page.locator('section').filter({ hasText: '全局库存健康度总览' });
  await section.waitFor({ timeout: 10000 });
  const numbers = await section.locator('div.text-4xl').allTextContents();
  expect(numbers.map(n => n.trim())).to.deep.equal(['4', '1', '2']);
});

Then('预警列表可见且页面无任何阈值配置区', async function () {
  // 预警列表可见（含已售罄置顶与超卖风险标识）
  await this.page.waitForFunction(() => document.querySelectorAll('tbody tr').length > 0, { timeout: 10000 });
  const body = await this.page.locator('body').textContent();
  expect(body).to.contain('桌面收纳架');
  expect(body).to.contain('超卖风险');
  // 无任何阈值配置区（R-STOCK-107 老板只读最小权限）
  expect(await this.page.locator('button:has-text("保存配置")').count()).to.equal(0);
  expect(await this.page.locator('input[aria-label="全局默认阈值"]').count()).to.equal(0);
  expect(await this.page.locator('input[aria-label="商品级覆盖阈值"]').count()).to.equal(0);
  expect(body).to.contain('纯只读 · 无配置入口');
});

// ---- 场景八：老板写阈值配置被拒 ----

Given('老板李老板（user_1003）已登录', async function () {
  // 场景隔离（Before 每场景 reset）：种子 user_1003 恒可登录（不注册新用户覆盖种子）
  const login = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '13612345678', password: 'boss123' })
  });
  expect(login.status).to.equal(201);
  const body = await login.json();
  expect(body.user.id).to.equal('user_1003');
  expect(body.user.role).to.equal('老板');
  this._stockBossToken = body.sessionToken;
});

When('老板调用写阈值配置接口（PUT \\/api\\/admin\\/stock-config）', async function () {
  const res = await fetch(`${API_URL}/api/admin/stock-config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this._stockBossToken}` },
    body: JSON.stringify({ threshold: 20 })
  });
  this._stockBossWrite = { status: res.status, body: await res.json() };
});

Then('返回 403 FORBIDDEN 且配置文件无任何变更', async function () {
  expect(this._stockBossWrite.status).to.equal(403);
  expect(this._stockBossWrite.body.code).to.equal('FORBIDDEN');
  // 配置文件无任何变更（全局仍 10、覆盖表为空）
  const stock = await (await fetch(`${API_URL}/api/admin/dashboard/stock`, {
    headers: { Authorization: `Bearer ${this._stockBossToken}` }
  })).json();
  expect(stock.globalThreshold).to.equal(10);
  expect(stock.overrides).to.deep.equal({});
});
