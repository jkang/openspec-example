import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import { ProductRepo, CartRepo, OrderRepo, CouponRepo } from '../src/repo/memoryRepo.js'
import { CatalogService } from '../src/services/catalog.js'
import { CartService } from '../src/services/cart.js'
import { OrderService } from '../src/services/order.js'
import { CouponService } from '../src/services/coupon.js'

describe('领域与服务单元测试', () => {
  let productRepo
  let cartRepo
  let orderRepo
  let couponRepo
  let catalog
  let cart
  let coupon
  let orders

  beforeEach(() => {
    productRepo = new ProductRepo()
    cartRepo = new CartRepo()
    orderRepo = new OrderRepo()
    couponRepo = new CouponRepo()
    catalog = new CatalogService(productRepo)
    cart = new CartService(cartRepo, productRepo)
    coupon = new CouponService(couponRepo)
    orders = new OrderService(cartRepo, orderRepo, productRepo, coupon)
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
})
