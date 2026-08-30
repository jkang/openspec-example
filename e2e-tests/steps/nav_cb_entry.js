const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');

const STORE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3000';

// 注册（或登录）一个买家并写入会话（保持 C 端店铺视图，不作任何跳转）
async function registerCustomer(page, phone, nickname, password) {
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
}

// ==================== 场景一：C 端 header 作用域 ====================

Given('买家登录并停留在 C 端店铺视图', async function () {
  await this.page.goto(STORE_URL);
  await this.page.waitForSelector('button:has-text("加入购物车")');
  await registerCustomer(this.page, '13500000001', '前端导航测试', '123456');
  await this.page.reload();
  await this.page.waitForSelector('button:has-text("加入购物车")');
});

Given('运营人员进入 B 端运营后台（admin）视图', async function () {
  // 复用既有的「运营后台」独立入口按钮（非分段切换控件）
  await this.page.locator('button:has-text("运营后台")').click();
  await this.page.waitForSelector('text=新建优惠券规则');
});

When('查看 C 端店铺顶部 header', async function () {
  this._cbHeader = this.page.locator('header.h-16');
  await this._cbHeader.waitFor({ state: 'visible' });
});

Then('C 端 header 仅展示顾客操作（搜索\\/购物车\\/我的订单\\/登录态昵称\\/退出登录）', async function () {
  const header = this._cbHeader;
  const text = await header.textContent();
  expect(text).to.contain('Minimal Store');
  // 顾客操作：购物车 / 我的订单 / 登录态昵称 / 退出登录
  expect(text).to.contain('购物车');
  expect(text).to.contain('我的订单');
  expect(text).to.contain('前端导航测试');
  expect(text).to.contain('退出登录');
  // 店铺商品搜索框
  await header.locator('input[placeholder="搜索商品..."]').waitFor({ state: 'visible' });
});

Then('B 端入口为独立「运营后台」按钮', async function () {
  const header = this._cbHeader;
  const btn = header.locator('button:has-text("运营后台")');
  await btn.waitFor({ state: 'visible' });
  expect(await btn.count()).to.equal(1);
});

Then('C 端 header 不存在「店铺 | 运营后台」分段切换控件', async function () {
  const header = this._cbHeader;
  // 分段切换控件（店铺 | 运营后台）已移除：header 中不应存在「店铺」独立切换按钮
  expect(await header.locator('button:has-text("店铺")').count()).to.equal(0);
  // 分段容器（含「店铺」按钮且并列「运营后台」按钮）不应存在
  const segment = header.locator('div.flex.items-center.border.border-border.text-xs.font-bold');
  expect(await segment.count()).to.equal(0);
});

// ==================== 场景二/三/四：B 端 header 作用域 ====================

When(/^查看 B 端后台顶部\s*(header|路径)$/, async function (_) {
  this._cbHeader = this.page.locator('header.h-16');
  await this._cbHeader.waitFor({ state: 'visible' });
});

Then('B 端 header 展示「运营后台 \\/ 当前模块」分层面包屑', async function () {
  const text = await this._cbHeader.textContent();
  expect(text).to.contain('运营后台 /');
});

Then('B 端 header 提供「返回店铺」出口', async function () {
  const btn = this._cbHeader.locator('button:has-text("返回店铺")');
  await btn.waitFor({ state: 'visible' });
  expect(await btn.count()).to.equal(1);
});

Then('B 端 header 不包含购物车\\/我的订单\\/退出登录等 C 端顾客操作', async function () {
  const header = this._cbHeader;
  const text = await header.textContent();
  expect(text).to.not.contain('购物车');
  expect(text).to.not.contain('我的订单');
  expect(text).to.not.contain('退出登录');
  expect(await header.locator('button:has-text("我的订单")').count()).to.equal(0);
  expect(await header.locator('button:has-text("购物车")').count()).to.equal(0);
  expect(await header.locator('button:has-text("退出登录")').count()).to.equal(0);
});

Then('路径呈现为「运营后台 \\/ 营销中心 \\/ 优惠券管理」分层面包屑', async function () {
  const text = await this._cbHeader.textContent();
  expect(text.replace(/\s+/g, ' ')).to.contain('运营后台 / 营销中心 / 优惠券管理');
});

When('查看 B 端后台「运营专员」标签', async function () {
  this._cbHeader = this.page.locator('header', { hasText: '运营专员' }).first();
  await this._cbHeader.waitFor({ state: 'visible' });
});

Then('标签显示该运营用户真实昵称', async function () {
  const text = await this._cbHeader.textContent();
  expect(text).to.contain('运营专员');
  expect(text).to.contain('陈晓芸');
  expect(text).to.not.contain('王琳');
});
