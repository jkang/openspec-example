import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import { ProductRepo, CartRepo, OrderRepo, CouponRepo, IssuanceRepo, CategoryRepo } from '../src/repo/memoryRepo.js'
import { CatalogService } from '../src/services/catalog.js'
import { CartService } from '../src/services/cart.js'
import { OrderService } from '../src/services/order.js'
import { CouponService } from '../src/services/coupon.js'
import { AdminCouponService } from '../src/services/adminCoupon.js'
import { CategoryService } from '../src/services/category.js'
import { validateCouponRule, validateIssue } from '../src/domain/logic.js'

describe('领域与服务单元测试', () => {
  let productRepo
  let cartRepo
  let orderRepo
  let couponRepo
  let categoryRepo
  let catalog
  let cart
  let coupon
  let orders
  let categories

  beforeEach(() => {
    productRepo = new ProductRepo()
    cartRepo = new CartRepo()
    orderRepo = new OrderRepo()
    couponRepo = new CouponRepo()
    categoryRepo = new CategoryRepo()
    catalog = new CatalogService(productRepo, categoryRepo)
    cart = new CartService(cartRepo, productRepo)
    coupon = new CouponService(couponRepo)
    orders = new OrderService(cartRepo, orderRepo, productRepo, coupon)
    categories = new CategoryService(categoryRepo, productRepo)
  })

  it('商品上架与列表', () => {
    const p = catalog.addProduct({ name: 'T-Shirt', priceCents: 1999, stock: 10 })
    assert.ok(p.id)
    assert.strictEqual(catalog.list().length, 1)
  })

  it('购物车添加逻辑', () => {
    const p = catalog.addProduct({ name: 'Hat', priceCents: 100, stock: 10 })
    cart.addToCart('u1', p.id, 2)
    const c = cart.getCart('u1')
    assert.strictEqual(c.items.length, 1)
    assert.strictEqual(c.items[0].quantity, 2)
  })

  it('下单扣减库存', () => {
    const p = catalog.addProduct({ name: 'Hat', priceCents: 100, stock: 10 })
    cart.addToCart('u1', p.id, 2)
    const order = orders.createOrder('u1')
    
    assert.ok(order.id)
    assert.strictEqual(order.totalCents, 200)
    assert.strictEqual(order.actualPaidCents, 200)
    assert.strictEqual(catalog.getProduct(p.id).stock, 8)
  })

  it('智能最优券推荐逻辑', () => {
    // 设置商品: 100元
    const p = catalog.addProduct({ name: 'Tech', priceCents: 10000, stock: 10 })
    cart.addToCart('u1', p.id, 1)
    
    // 设置优惠券
    // c1: 满100减20 (FLAT)
    couponRepo.save({ id: 'c1', name: 'FLAT20', type: 'FLAT', value: 2000, minSpendCents: 10000, status: 'UNUSED' })
    // c2: 9.5折 (PERCENTAGE) -> 减5元
    couponRepo.save({ id: 'c2', name: 'PERCENT9.5', type: 'PERCENTAGE', value: 9.5, minSpendCents: 0, status: 'UNUSED' })
    // c3: 满500减10 (不可用)
    couponRepo.save({ id: 'c3', name: 'FLAT10', type: 'FLAT', value: 1000, minSpendCents: 50000, status: 'UNUSED' })

    // 自动下单
    const order = orders.createOrder('u1')
    
    // 应该选中 c1 (减20比减5多)
    assert.strictEqual(order.couponId, 'c1')
    assert.strictEqual(order.discountCents, 2000)
    assert.strictEqual(order.actualPaidCents, 8000)
    assert.strictEqual(order.totalCents, 10000)
  })
  
  it('库存不足抛错', () => {
    const p = catalog.addProduct({ name: 'Rare', priceCents: 100, stock: 1 })
    cart.addToCart('u1', p.id, 2)
    assert.throws(() => orders.createOrder('u1'), /OUT_OF_STOCK/)
  })

  it('结算流程 (checkout)', () => {
    const p = catalog.addProduct({ name: 'Checkout Item', priceCents: 500, stock: 5 })
    cart.addToCart('u2', p.id, 1)
    const order = orders.checkout('u2')
    
    assert.ok(order.id)
    assert.strictEqual(order.totalCents, 500)
    assert.strictEqual(catalog.getProduct(p.id).stock, 4)
    assert.strictEqual(cart.getCart('u2').items.length, 0)
  })

  it('按ID查询单个商品', () => {
    const p = catalog.addProduct({ name: 'Single', priceCents: 999, stock: 5 })
    const found = catalog.getProduct(p.id)
    assert.ok(found)
    assert.strictEqual(found.name, 'Single')
  })

  it('查询不存在的商品返回undefined', () => {
    const found = catalog.getProduct('non-existent')
    assert.strictEqual(found, undefined)
  })

  it('按名称模糊搜索', () => {
    catalog.addProduct({ name: 'iPhone 15', priceCents: 5999, stock: 10 })
    catalog.addProduct({ name: 'iPad Pro', priceCents: 7999, stock: 5 })
    catalog.addProduct({ name: 'MacBook', priceCents: 9999, stock: 3 })

    const hits = catalog.list('ipad')
    assert.strictEqual(hits.length, 1)
    assert.strictEqual(hits[0].name, 'iPad Pro')

    const all = catalog.list()
    assert.strictEqual(all.length, 3)

    const none = catalog.list('nonexistent')
    assert.strictEqual(none.length, 0)
  })

  it('按价格排序', () => {
    catalog.addProduct({ name: 'A', priceCents: 300, stock: 1 })
    catalog.addProduct({ name: 'B', priceCents: 100, stock: 1 })
    catalog.addProduct({ name: 'C', priceCents: 200, stock: 1 })

    const asc = catalog.list(undefined, 'price_asc')
    assert.deepStrictEqual(asc.map(p => p.priceCents), [100, 200, 300])

    const desc = catalog.list(undefined, 'price_desc')
    assert.deepStrictEqual(desc.map(p => p.priceCents), [300, 200, 100])

    // Invalid sort value falls back to natural order
    const invalid = catalog.list(undefined, 'invalid')
    assert.strictEqual(invalid.length, 3)

    // Search + sort combination: only "A" contains 'a'
    const combo = catalog.list('a', 'price_desc')
    assert.deepStrictEqual(combo.map(p => p.priceCents), [300])
  })

  it('商品修改: 局部更新价格与库存后生效', () => {
    const p = catalog.addProduct({ name: '极简机械键盘', priceCents: 29900, stock: 99, imageUrl: 'u.jpg' })
    const updated = catalog.updateProduct(p.id, { priceCents: 27900, stock: 50 })
    assert.strictEqual(updated.priceCents, 27900)
    assert.strictEqual(updated.stock, 50)
    // 未提供字段保持不变
    assert.strictEqual(updated.name, '极简机械键盘')
    assert.strictEqual(catalog.getProduct(p.id).priceCents, 27900)
  })

  it('商品修改: 非法价格与负库存被拒绝', () => {
    const p = catalog.addProduct({ name: 'A', priceCents: 100, stock: 5 })
    assert.throws(() => catalog.updateProduct(p.id, { priceCents: 0 }), /INVALID_PRICE/)
    assert.throws(() => catalog.updateProduct(p.id, { stock: -1 }), /INVALID_STOCK/)
    // 原值不变
    assert.strictEqual(catalog.getProduct(p.id).priceCents, 100)
    assert.strictEqual(catalog.getProduct(p.id).stock, 5)
  })

  it('商品修改: 不存在或已删除商品抛 PRODUCT_NOT_FOUND', () => {
    assert.throws(() => catalog.updateProduct('nope', { priceCents: 100 }), /PRODUCT_NOT_FOUND/)
    const p = catalog.addProduct({ name: 'B', priceCents: 100, stock: 5 })
    catalog.deleteProduct(p.id)
    assert.throws(() => catalog.updateProduct(p.id, { priceCents: 200 }), /PRODUCT_NOT_FOUND/)
  })

  it('商品删除: 软删除后从列表消失且不可查', () => {
    const p = catalog.addProduct({ name: '桌面收纳架', priceCents: 4500, stock: 10 })
    assert.strictEqual(catalog.list().length, 1)
    const removed = catalog.deleteProduct(p.id)
    assert.strictEqual(removed.status, 'deleted')
    assert.strictEqual(catalog.list().length, 0)
    assert.strictEqual(catalog.getProduct(p.id), undefined)
  })

  it('商品删除: 重复删除已下架商品抛 PRODUCT_NOT_FOUND', () => {
    const p = catalog.addProduct({ name: 'C', priceCents: 100, stock: 1 })
    catalog.deleteProduct(p.id)
    assert.throws(() => catalog.deleteProduct(p.id), /PRODUCT_NOT_FOUND/)
  })

  it('商品状态归一: 缺省 status 视为 active 并进入列表', () => {
    const p = catalog.addProduct({ name: 'D', priceCents: 100, stock: 1 })
    assert.strictEqual(p.status, 'active')
    assert.strictEqual(catalog.list().length, 1)
  })

  it('分类: 新增后出现在列表（按排序号）', () => {
    const c1 = categories.create({ name: '键鼠外设', sortOrder: 2 })
    const c2 = categories.create({ name: '显示设备', sortOrder: 1 })
    assert.strictEqual(c1.status, 'active')
    const list = categories.list()
    assert.strictEqual(list.length, 2)
    assert.deepStrictEqual(list.map(c => c.name), ['显示设备', '键鼠外设'])
  })

  it('分类: 同名 active 分类被拒绝', () => {
    categories.create({ name: '键鼠外设' })
    assert.throws(() => categories.create({ name: '键鼠外设' }), /CATEGORY_NAME_EXISTS/)
  })

  it('分类: 软删除后从列表消失', () => {
    const c = categories.create({ name: '音频设备' })
    categories.delete(c.id)
    assert.strictEqual(categories.list().length, 0)
    assert.strictEqual(c.status, 'deleted')
  })

  it('分类: 删除后该分类商品 categoryId 置空', () => {
    const c = categories.create({ name: '键鼠外设' })
    const p = catalog.addProduct({ name: '机械键盘', priceCents: 29900, stock: 10, categoryId: c.id })
    assert.strictEqual(p.categoryId, c.id)
    categories.delete(c.id)
    // 商品 categoryId 被清空，仍可在售
    assert.strictEqual(catalog.getProduct(p.id).categoryId, null)
  })

  it('商品: 按分类过滤列表', () => {
    const kb = categories.create({ name: '键鼠外设' })
    const disp = categories.create({ name: '显示设备' })
    catalog.addProduct({ name: '键盘', priceCents: 100, stock: 1, categoryId: kb.id })
    catalog.addProduct({ name: '鼠标', priceCents: 50, stock: 1, categoryId: kb.id })
    catalog.addProduct({ name: '显示器', priceCents: 200, stock: 1, categoryId: disp.id })
    const filtered = catalog.list(undefined, undefined, kb.id)
    assert.deepStrictEqual(filtered.map(p => p.name).sort(), ['键盘', '鼠标'])
  })

  it('商品: 挂不存在的分类被拒绝', () => {
    assert.throws(() => catalog.addProduct({ name: 'X', priceCents: 100, stock: 1, categoryId: 'cat-nope' }), /CATEGORY_NOT_FOUND/)
  })
})

describe('优惠券运营后台领域校验 (@unit)', () => {
  let couponRepo
  let issuanceRepo
  let adminCoupon
  let couponService

  beforeEach(() => {
    couponRepo = new CouponRepo()
    issuanceRepo = new IssuanceRepo()
    adminCoupon = new AdminCouponService(couponRepo, issuanceRepo)
    couponService = new CouponService(couponRepo)
  })

  it('折扣比例边界: 10 折与 0 折被拒绝', () => {
    assert.throws(() => validateCouponRule({ type: 'PERCENTAGE', value: 10, minSpendCents: 0 }), /INVALID_DISCOUNT_RATE/)
    assert.throws(() => validateCouponRule({ type: 'PERCENTAGE', value: 0, minSpendCents: 0 }), /INVALID_DISCOUNT_RATE/)
    assert.throws(() => validateCouponRule({ type: 'PERCENTAGE', value: 10.5, minSpendCents: 0 }), /INVALID_DISCOUNT_RATE/)
    // 合法边界: 9.9 折通过
    assert.doesNotThrow(() => validateCouponRule({ type: 'PERCENTAGE', value: 9.9, minSpendCents: 0 }))
  })

  it('满减金额大于等于门槛被拒绝', () => {
    assert.throws(() => validateCouponRule({ type: 'FLAT', value: 10000, minSpendCents: 10000 }), /COUPON_VALUE_EXCEEDS_THRESHOLD/)
    assert.throws(() => validateCouponRule({ type: 'FLAT', value: 12000, minSpendCents: 10000 }), /COUPON_VALUE_EXCEEDS_THRESHOLD/)
    // 减免小于门槛通过；无门槛 (0) 不校验该规则
    assert.doesNotThrow(() => validateCouponRule({ type: 'FLAT', value: 5000, minSpendCents: 10000 }))
    assert.doesNotThrow(() => validateCouponRule({ type: 'FLAT', value: 5000, minSpendCents: 0 }))
  })

  it('创建规则即 ACTIVE 且出现在规则列表', () => {
    const coupon = adminCoupon.create({ name: '中秋特惠 8.5 折券', type: 'PERCENTAGE', value: 8.5, minSpendCents: 30000, expiryDate: '2026-10-15' })
    assert.strictEqual(coupon.status, 'ACTIVE')
    assert.strictEqual(coupon.userId, null)
    const list = adminCoupon.list()
    assert.strictEqual(list.length, 1)
    assert.strictEqual(list[0].issuedCount, 0)
  })

  it('发放校验: 非法用户 ID 与非 ACTIVE 模板被拒绝', () => {
    const template = adminCoupon.create({ name: '新客券', type: 'FLAT', value: 2000, minSpendCents: 10000 })
    assert.throws(() => adminCoupon.issue(template.id, 'unknown123'), /INVALID_USER_ID/)

    couponRepo.save({ id: 'SEED1', name: '种子券', type: 'FLAT', value: 1000, minSpendCents: 5000, status: 'UNUSED', userId: null })
    assert.throws(() => adminCoupon.issue('SEED1', 'user_1003'), /COUPON_NOT_ACTIVE/)
  })

  it('发放成功生成用户归属实例，重复发放被拒绝', () => {
    const template = adminCoupon.create({ name: '新客券', type: 'FLAT', value: 2000, minSpendCents: 10000 })
    const { instance, issuance } = adminCoupon.issue(template.id, 'user_1003')
    assert.strictEqual(instance.status, 'UNUSED')
    assert.strictEqual(instance.userId, 'user_1003')
    assert.strictEqual(instance.templateId, template.id)
    assert.strictEqual(issuance.userId, 'user_1003')
    assert.strictEqual(adminCoupon.list()[0].issuedCount, 1)
    assert.strictEqual(adminCoupon.listIssuances().length, 1)

    assert.throws(() => adminCoupon.issue(template.id, 'user_1003'), /COUPON_ALREADY_ISSUED/)
    // 拒绝后数量与记录不变
    assert.strictEqual(adminCoupon.list()[0].issuedCount, 1)
    assert.strictEqual(adminCoupon.listIssuances().length, 1)
  })

  it('最优券推荐: 他人持有的券不进入候选集', () => {
    const template = adminCoupon.create({ name: '8 折券', type: 'PERCENTAGE', value: 8, minSpendCents: 0 })
    const { instance } = adminCoupon.issue(template.id, 'user_1003')

    // user_1003 可见并推荐该券 (10000 * 0.2 = 2000)
    const bestForHolder = couponService.getBestCoupon('user_1003', 10000)
    assert.strictEqual(bestForHolder.id, instance.id)

    // user_1004 不可见该券
    const bestForOther = couponService.getBestCoupon('user_1004', 10000)
    assert.strictEqual(bestForOther, null)

    // C 端列表可见性: 实例仅持有人可见, ACTIVE 模板不在 C 端展示
    assert.ok(couponService.list('user_1003').some(c => c.id === instance.id))
    assert.ok(!couponService.list('user_1004').some(c => c.id === instance.id))
    assert.ok(!couponService.list('user_1003').some(c => c.id === template.id))
  })
})
