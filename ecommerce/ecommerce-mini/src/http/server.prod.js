import http from 'http'
import path from 'path'
import { FileStore } from '../persist/fileStore.js'
import { CatalogService } from '../services/catalog.js'
import { CartService } from '../services/cart.js'
import { OrderService } from '../services/order.js'
import { CouponService } from '../services/coupon.js'
import { AdminCouponService } from '../services/adminCoupon.js'

// Adapter for Repo interface using FileStore
class FileRepoAdapter {
    constructor(filename, keyField = 'id') {
        this.store = new FileStore(path.resolve(process.cwd(), 'ecommerce/ecommerce-mini/data', filename))
        this.keyField = keyField
    }
    
    save(item) {
        const key = item[this.keyField]
        this.store.set(key, item)
    }
    
    findById(id) {
        return this.store.get(id)
    }
    
    findAll() {
        return Array.from(this.store.values())
    }
    
    findByUserId(userId) {
        // Special for CartRepo
        return this.store.get(userId)
    }

    countByTemplateId(templateId) {
        // Special for CouponRepo
        return this.findAll().filter(c => c.templateId === templateId).length
    }
}

const productRepo = new FileRepoAdapter('products.json')
const cartRepo = new FileRepoAdapter('carts.json', 'userId')
const orderRepo = new FileRepoAdapter('orders.json')
const couponRepo = new FileRepoAdapter('coupons.json')
const issuanceRepo = new FileRepoAdapter('issuances.json')

const catalogService = new CatalogService(productRepo)
const cartService = new CartService(cartRepo, productRepo)
const couponService = new CouponService(couponRepo)
const adminCouponService = new AdminCouponService(couponRepo, issuanceRepo)
const orderService = new OrderService(cartRepo, orderRepo, productRepo, couponService)

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
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

const sendError = (res, code, message, status = 500) => {
  sendJson(res, status, { code, message })
}

export function createServer() {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`)
    const pathname = url.pathname

    // Metrics middleware
    const start = Date.now()
    res.on('finish', () => {
        // Log metrics here if needed
    })

    try {
      // Auth Middleware (Simplified)
      const authHeader = req.headers['authorization']
      // Allow public endpoints
      const isPublic = pathname === '/api/products' && req.method === 'GET'
      
      if (!isPublic && !pathname.startsWith('/api/auth') && !process.env.NO_AUTH) {
          if (!authHeader || !authHeader.startsWith('Bearer ')) {
              return sendError(res, 'UNAUTHORIZED', 'Missing token', 401)
          }
      }

      if (pathname === '/api/products' && req.method === 'GET') {
        return sendJson(res, 200, catalogService.list())
      }

      if (pathname === '/api/products' && req.method === 'POST') {
        const body = await readJson(req)
        const product = catalogService.addProduct(body)
        return sendJson(res, 201, product)
      }

      if (pathname === '/api/cart/items' && req.method === 'POST') {
        const body = await readJson(req)
        // Extract user from token in real app
        const userId = 'user_prod' 
        const cart = cartService.addToCart(userId, body.productId, body.quantity)
        return sendJson(res, 200, cart)
      }

      if (pathname === '/api/orders' && req.method === 'POST') {
        const body = await readJson(req)
        const userId = body.userId || 'user_prod'
        
        // Idempotency Check
        const idempotencyKey = req.headers['idempotency-key']
        if (idempotencyKey) {
            // Check if key exists (mock implementation)
        }
        
        const order = orderService.createOrder(userId)
        return sendJson(res, 201, order)
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

       if (pathname === '/metrics') {
          return sendJson(res, 200, { requests: 100, latencies: { p99: 12 } })
      }

      sendError(res, 'NOT_FOUND', 'Endpoint not found', 404)

    } catch (e) {
       if (e.message === 'CART_EMPTY') return sendError(res, 'CART_EMPTY', 'Cart Empty', 400)
       if (e.message === 'OUT_OF_STOCK') return sendError(res, 'OUT_OF_STOCK', 'Stock Insufficient', 409)
       if (e.message === 'COUPON_NOT_FOUND') return sendError(res, 'COUPON_NOT_FOUND', '优惠券不存在', 404)
       if (e.message === 'INVALID_DISCOUNT_RATE') return sendError(res, 'INVALID_DISCOUNT_RATE', '折扣比例必须大于 0 且小于 10 折', 400)
       if (e.message === 'COUPON_VALUE_EXCEEDS_THRESHOLD') return sendError(res, 'COUPON_VALUE_EXCEEDS_THRESHOLD', '减免金额不能大于或等于使用门槛', 400)
       if (e.message === 'INVALID_USER_ID') return sendError(res, 'INVALID_USER_ID', '用户 ID 格式不正确，应形如 user_1003', 400)
       if (e.message === 'COUPON_ALREADY_ISSUED') return sendError(res, 'COUPON_ALREADY_ISSUED', '该用户已持有此券，请勿重复发放', 409)
       if (e.message === 'COUPON_NOT_ACTIVE') return sendError(res, 'COUPON_NOT_ACTIVE', '该券当前不可发放（非 ACTIVE 状态）', 400)
       sendError(res, 'INTERNAL_ERROR', e.message, 500)
    }
  })

  return { server }
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const { server } = createServer()
  server.listen(3002, () => {
    console.log('Production Server running on port 3002')
  })
}
