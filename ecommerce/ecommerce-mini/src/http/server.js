import http from 'http'
import fs from 'fs'
import path from 'path'
import { ProductRepo, CartRepo, OrderRepo, CouponRepo, IssuanceRepo, CategoryRepo } from '../repo/memoryRepo.js'
import { CatalogService } from '../services/catalog.js'
import { CartService } from '../services/cart.js'
import { OrderService } from '../services/order.js'
import { CouponService } from '../services/coupon.js'
import { AdminCouponService } from '../services/adminCoupon.js'
import { CategoryService } from '../services/category.js'
import { PaymentService } from '../services/payment.js'

// 注入初始商品数据
const initialProducts = [
  { 
    id: '1', name: '极简机械键盘', description: '84键紧凑布局，红轴', priceCents: 29900, stock: 99,
    imageUrl: 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?auto=format&fit=crop&q=80&w=800', categoryId: 'cat-keyboard'
  },
  { 
    id: '2', name: '无线办公鼠标', description: '静音按键，人体工学设计', priceCents: 8900, stock: 99,
    imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&q=80&w=800', categoryId: 'cat-keyboard'
  },
  { 
    id: '3', name: '高清显示器', description: '27英寸 4K分辨率', priceCents: 129900, stock: 99,
    imageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&q=80&w=800', categoryId: 'cat-display'
  },
  { 
    id: '4', name: '桌面收纳架', description: '实木材质，双层结构', priceCents: 4500, stock: 99,
    imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&q=80&w=800', categoryId: 'cat-desk'
  },
  { 
    id: '5', name: '铝合金笔记本支架', description: '折叠便携，多档调节', priceCents: 6800, stock: 99,
    imageUrl: 'https://images.unsplash.com/photo-1527443154391-507e9dc6c5cc?auto=format&fit=crop&q=80&w=800', categoryId: 'cat-desk'
  },
  { 
    id: '6', name: '桌面拾音氛围灯', description: 'RGB色彩，支持音频同步', priceCents: 12800, stock: 99,
    imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252728f?auto=format&fit=crop&q=80&w=800', categoryId: 'cat-audio'
  }
]

// 注入初始分类数据
const initialCategories = [
  { id: 'cat-keyboard', name: '键鼠外设', sortOrder: 1, status: 'active' },
  { id: 'cat-display', name: '显示设备', sortOrder: 2, status: 'active' },
  { id: 'cat-desk', name: '桌面收纳', sortOrder: 3, status: 'active' },
  { id: 'cat-audio', name: '音频设备', sortOrder: 4, status: 'active' }
]

// 注入初始优惠券数据
const initialCoupons = [
  { id: 'FLAT10', name: '满 50 减 10', type: 'FLAT', value: 1000, minSpendCents: 5000, status: 'UNUSED', expiryDate: '2026-12-31', userId: null },
  { id: 'PERCENT9', name: '9 折数码券', type: 'PERCENTAGE', value: 9, minSpendCents: 10000, status: 'UNUSED', expiryDate: '2026-12-31', userId: null }
]

const readJson = async (req) => {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => body += chunk)
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch (e) {
        reject(e)
      }
    })
  })
}

const sendJson = (res, status, data) => {
  res.writeHead(status, { 
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  })
  res.end(JSON.stringify(data))
}

const sendError = (res, code, message, status = 500) => {
  res.writeHead(status, { 
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  })
  res.end(JSON.stringify({ code, message }))
}

export function createServer() {
  // 每个 server 实例独立的仓储与服务（保证测试套件间状态隔离）
  const productRepo = new ProductRepo()
  const cartRepo = new CartRepo()
  const orderRepo = new OrderRepo()
  const couponRepo = new CouponRepo()
  const issuanceRepo = new IssuanceRepo()
  const categoryRepo = new CategoryRepo()

  // 克隆种子对象，避免跨 server 实例共享引用导致状态污染
  initialProducts.forEach(p => productRepo.save({ ...p }))
  initialCoupons.forEach(c => couponRepo.save({ ...c }))
  initialCategories.forEach(c => categoryRepo.save({ ...c }))

  const catalogService = new CatalogService(productRepo, categoryRepo)
  const cartService = new CartService(cartRepo, productRepo)
  const couponService = new CouponService(couponRepo)
  const adminCouponService = new AdminCouponService(couponRepo, issuanceRepo)
  const orderService = new OrderService(cartRepo, orderRepo, productRepo, couponService)
  const categoryService = new CategoryService(categoryRepo, productRepo)
  const paymentService = new PaymentService(orderRepo, productRepo, couponService)

  const server = http.createServer(async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      })
      res.end()
      return
    }

    const url = new URL(req.url, `http://${req.headers.host}`)
    const pathname = url.pathname

    try {
      // 测试后门：仅在 NODE_ENV=test 下启用，用于 E2E 数据隔离
      if (pathname === '/api/__test/reset' && req.method === 'POST') {
        if (process.env.NODE_ENV !== 'test')
          return sendError(res, 'NOT_FOUND', 'Endpoint not found', 404)
        productRepo.products.clear()
        cartRepo.carts.clear()
        orderRepo.orders.clear()
        couponRepo.coupons.clear()
        issuanceRepo.issuances.clear()
        categoryRepo.categories.clear()
        initialProducts.forEach(p => productRepo.save({ ...p }))
        initialCoupons.forEach(c => couponRepo.save({ ...c }))
        initialCategories.forEach(c => categoryRepo.save({ ...c }))
        return sendJson(res, 200, { ok: true })
      }

      if (pathname === '/api/products' && req.method === 'GET') {
        const name = url.searchParams.get('name')
        const sort = url.searchParams.get('sort')
        const categoryId = url.searchParams.get('categoryId')
        return sendJson(res, 200, catalogService.list(name, sort, categoryId))
      }

      if (pathname === '/api/categories' && req.method === 'GET') {
        return sendJson(res, 200, categoryService.list())
      }

      if (pathname === '/api/categories' && req.method === 'POST') {
        const body = await readJson(req)
        const category = categoryService.create(body)
        return sendJson(res, 201, category)
      }

      if (pathname.startsWith('/api/categories/') && req.method === 'PUT') {
        const id = pathname.split('/').pop()
        const body = await readJson(req)
        const category = categoryService.update(id, body)
        return sendJson(res, 200, category)
      }

      if (pathname.startsWith('/api/categories/') && req.method === 'DELETE') {
        const id = pathname.split('/').pop()
        const category = categoryService.delete(id)
        return sendJson(res, 200, category)
      }

      if (pathname === '/api/products' && req.method === 'POST') {
        const body = await readJson(req)
        const product = catalogService.addProduct(body)
        return sendJson(res, 201, product)
      }

      if (pathname.startsWith('/api/products/') && req.method === 'GET') {
        const id = pathname.split('/').pop()
        const product = catalogService.getProduct(id)
        if (!product) return sendError(res, 'NOT_FOUND', 'Product not found', 404)
        return sendJson(res, 200, product)
      }

      if (pathname.startsWith('/api/products/') && req.method === 'PUT') {
        const id = pathname.split('/').pop()
        const body = await readJson(req)
        const product = catalogService.updateProduct(id, body)
        return sendJson(res, 200, product)
      }

      if (pathname.startsWith('/api/products/') && req.method === 'DELETE') {
        const id = pathname.split('/').pop()
        const product = catalogService.deleteProduct(id)
        return sendJson(res, 200, product)
      }

      if (pathname === '/api/cart/items' && req.method === 'POST') {
        const body = await readJson(req)
        const userId = body.userId || 'user_dev'
        const cart = cartService.addToCart(userId, body.productId, body.quantity)
        return sendJson(res, 200, cart)
      }

      if (pathname === '/api/cart/remove' && req.method === 'POST') {
        const body = await readJson(req)
        const userId = body.userId || 'user_dev'
        const cart = cartService.removeFromCart(userId, body.productId)
        return sendJson(res, 200, cart)
      }

      if (pathname === '/api/orders' && req.method === 'POST') {
        const body = await readJson(req)
        const userId = body.userId || 'user_dev'
        const order = orderService.createOrder(userId, body.couponId)
        return sendJson(res, 201, order)
      }

      if (pathname === '/api/checkout' && req.method === 'POST') {
        const body = await readJson(req)
        const userId = body.userId || 'user_dev'
        const order = orderService.checkout(userId, body.couponId)
        return sendJson(res, 200, order)
      }

      if (pathname.startsWith('/api/payments/') && req.method === 'POST') {
        const id = pathname.split('/').pop()
        const order = paymentService.pay(id)
        return sendJson(res, 200, order)
      }

      if (pathname === '/api/admin/orders' && req.method === 'GET') {
        const status = url.searchParams.get('status')
        const keyword = url.searchParams.get('keyword')
        return sendJson(res, 200, orderService.listAdmin({ status, keyword }))
      }

      if (pathname.startsWith('/api/admin/orders/') && pathname.endsWith('/ship') && req.method === 'POST') {
        const id = pathname.split('/')[4]
        const order = orderService.markShipped(id)
        return sendJson(res, 200, order)
      }

      if (pathname.startsWith('/api/admin/orders/') && pathname.endsWith('/cancel') && req.method === 'POST') {
        const id = pathname.split('/')[4]
        const order = orderService.cancelOrder(id)
        return sendJson(res, 200, order)
      }

      if (pathname === '/api/coupons' && req.method === 'GET') {
        const userId = url.searchParams.get('userId')
        return sendJson(res, 200, couponService.list(userId))
      }

      if (pathname === '/api/admin/coupons' && req.method === 'POST') {
        const body = await readJson(req)
        const coupon = adminCouponService.create({
          name: body.name,
          type: body.type,
          value: body.value,
          minSpendCents: body.minSpendCents ?? 0,
          expiryDate: body.expiryDate
        })
        return sendJson(res, 201, coupon)
      }

      if (pathname === '/api/admin/coupons' && req.method === 'GET') {
        return sendJson(res, 200, adminCouponService.list())
      }

      if (pathname.startsWith('/api/admin/coupons/') && pathname.endsWith('/issue') && req.method === 'POST') {
        const templateId = pathname.split('/')[4]
        const body = await readJson(req)
        const { instance, issuance } = adminCouponService.issue(templateId, body.userId, body.operator)
        return sendJson(res, 201, { instance, issuance })
      }

      if (pathname === '/api/admin/issuances' && req.method === 'GET') {
        return sendJson(res, 200, adminCouponService.listIssuances())
      }
      
      if (pathname.startsWith('/api/orders/') && req.method === 'GET') {
        const id = pathname.split('/').pop()
        const order = orderRepo.findById(id)
        if (!order) return sendError(res, 'NOT_FOUND', 'Order not found', 404)
        return sendJson(res, 200, order)
      }

      if (pathname === '/api/orders' && req.method === 'GET') {
        // 按用户查询我的订单（带 userId 参数）；否则回落 404
        const userId = url.searchParams.get('userId')
        if (!userId) return sendError(res, 'BAD_REQUEST', 'userId is required', 400)
        return sendJson(res, 200, orderService.listByUser(userId))
      }

      sendError(res, 'NOT_FOUND', 'Endpoint not found', 404)

    } catch (e) {
      if (e.message === 'CART_EMPTY')
        return sendError(res, 'CART_EMPTY', '购物车为空', 400)
      if (e.message === 'OUT_OF_STOCK')
        return sendError(res, 'OUT_OF_STOCK', '库存不足', 409)
      if (e.message === 'PRODUCT_NOT_FOUND')
        return sendError(res, 'PRODUCT_NOT_FOUND', '商品不存在', 404)
      if (e.message === 'INVALID_PRICE')
        return sendError(res, 'INVALID_PRICE', '价格必须大于 0 元', 400)
      if (e.message === 'INVALID_STOCK')
        return sendError(res, 'INVALID_STOCK', '库存不能为负数', 400)
      if (e.message === 'CATEGORY_NAME_EXISTS')
        return sendError(res, 'CATEGORY_NAME_EXISTS', '分类名称已存在', 409)
      if (e.message === 'CATEGORY_NAME_REQUIRED')
        return sendError(res, 'CATEGORY_NAME_REQUIRED', '分类名称不能为空', 400)
      if (e.message === 'CATEGORY_NOT_FOUND')
        return sendError(res, 'CATEGORY_NOT_FOUND', '分类不存在', 404)
      if (e.message === 'ORDER_STATUS_INVALID')
        return sendError(res, 'ORDER_STATUS_INVALID', '非法的订单状态流转', 400)
      if (e.message === 'ORDER_NOT_CANCELLABLE')
        return sendError(res, 'ORDER_NOT_CANCELLABLE', '该订单当前不可取消', 400)
      if (e.message === 'ORDER_ALREADY_PAID')
        return sendError(res, 'ORDER_ALREADY_PAID', '该订单已支付，请勿重复支付', 200)
      if (e.message === 'ORDER_NOT_FOUND')
        return sendError(res, 'ORDER_NOT_FOUND', '订单不存在', 404)
      if (e.message === 'COUPON_NOT_FOUND')
        return sendError(res, 'COUPON_NOT_FOUND', '优惠券不存在', 404)
      if (e.message === 'COUPON_ALREADY_USED')
        return sendError(res, 'COUPON_ALREADY_USED', '优惠券已使用', 400)
      if (e.message === 'COUPON_THRESHOLD_NOT_MET')
        return sendError(res, 'COUPON_THRESHOLD_NOT_MET', '未达优惠券使用门槛', 400)
      if (e.message === 'INVALID_DISCOUNT_RATE')
        return sendError(res, 'INVALID_DISCOUNT_RATE', '折扣比例必须大于 0 且小于 10 折', 400)
      if (e.message === 'COUPON_VALUE_EXCEEDS_THRESHOLD')
        return sendError(res, 'COUPON_VALUE_EXCEEDS_THRESHOLD', '减免金额不能大于或等于使用门槛', 400)
      if (e.message === 'INVALID_USER_ID')
        return sendError(res, 'INVALID_USER_ID', '用户 ID 格式不正确，应形如 user_1003', 400)
      if (e.message === 'COUPON_ALREADY_ISSUED')
        return sendError(res, 'COUPON_ALREADY_ISSUED', '该用户已持有此券，请勿重复发放', 409)
      if (e.message === 'COUPON_NOT_ACTIVE')
        return sendError(res, 'COUPON_NOT_ACTIVE', '该券当前不可发放（非 ACTIVE 状态）', 400)

      console.error(e)
      sendError(res, 'INTERNAL_ERROR', e.message, 500)
    }
  })

  return { server, services: { catalogService, cartService, orderService } }
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const { server } = createServer()
  server.listen(3000, () => {
    console.log('Server running on port 3000')
  })
}
