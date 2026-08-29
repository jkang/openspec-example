import http from 'http'
import path from 'path'
import crypto from 'crypto'
import { FileStore } from '../persist/fileStore.js'
import { CatalogService } from '../services/catalog.js'
import { CartService } from '../services/cart.js'
import { OrderService } from '../services/order.js'
import { CouponService } from '../services/coupon.js'
import { AdminCouponService } from '../services/adminCoupon.js'
import { AuthService } from '../services/auth.js'
import { AdminUserService } from '../services/userAdmin.js'

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

// 用户仓储（users.json 持久化）：在 FileStore 基础上补 UserRepo 接口
class UserFileRepo extends FileRepoAdapter {
    constructor() {
        super('users.json', 'id')
        this.sequence = this.findMaxSeq()
    }

    findMaxSeq() {
        let max = 1000
        for (const u of this.findAll()) {
            const m = /^user_(\d+)$/.exec(u.id || '')
            if (m) max = Math.max(max, parseInt(m[1], 10))
        }
        return max
    }

    nextId() {
        this.sequence += 1
        return `user_${this.sequence}`
    }

    findByPhone(phone) {
        return this.findAll().find(u => u.phone === String(phone))
    }
}

// 会话仓储（sessions.json 持久化）：token 键 + SessionRepo 接口
class SessionFileRepo {
    constructor() {
        this.store = new FileStore(path.resolve(process.cwd(), 'ecommerce/ecommerce-mini/data', 'sessions.json'))
    }

    create(userId) {
        const session = {
            token: crypto.randomUUID(),
            userId,
            createdAt: new Date().toISOString().slice(0, 16).replace('T', ' ')
        }
        this.store.set(session.token, session)
        return session
    }

    findByToken(token) {
        return this.store.get(token)
    }

    delete(token) {
        if (token && this.store.has(token)) {
            this.store.delete(token)
            return true
        }
        return false
    }
}

const productRepo = new FileRepoAdapter('products.json')
const cartRepo = new FileRepoAdapter('carts.json', 'userId')
const orderRepo = new FileRepoAdapter('orders.json')
const couponRepo = new FileRepoAdapter('coupons.json')
const issuanceRepo = new FileRepoAdapter('issuances.json')
const userRepo = new UserFileRepo()
const sessionRepo = new SessionFileRepo()

const catalogService = new CatalogService(productRepo)
const cartService = new CartService(cartRepo, productRepo)
const couponService = new CouponService(couponRepo)
const adminCouponService = new AdminCouponService(couponRepo, issuanceRepo)
const authService = new AuthService(userRepo, sessionRepo)
const orderService = new OrderService(cartRepo, orderRepo, productRepo, couponService)
const adminUserService = new AdminUserService(userRepo, orderRepo)

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

/**
 * B 端运营角色门禁（R-ADM-001）：解析 Bearer 会话 → 归属用户须 role=运营
 * 复用 AuthService.getSessionUser（含禁用门禁：运营被禁用保留 USER_DISABLED 专属提示）
 * 缺失/无效会话统一按 FORBIDDEN 403 处理：admin 端点不区分未登录与越权（防探测，对齐 R-ADM-001 拒绝访问语义）
 * @param {import('http').IncomingMessage} req
 * @returns {Omit<import('../domain/types.js').User, 'passwordHash'>} 运营用户 DTO
 */
function requireAdminRole(req) {
  const authHeader = req.headers['authorization'] || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  let user
  try {
    user = authService.getSessionUser(token)
  } catch (e) {
    if (e.message === 'UNAUTHORIZED') throw new Error('FORBIDDEN')
    throw e // USER_DISABLED：运营被禁用，保留专属提示
  }
  if (!user || user.role !== '运营') {
    throw new Error('FORBIDDEN')
  }
  return user
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
      // 会话校验（R-SES-002）：需登录接口（下单/结算/我的订单）强制校验 Bearer 会话凭证
      // 公开端点：商品列表 / 商品详情 / 分类 / 认证（register/login/logout）/ B 端管理
      const isPublic =
        (pathname === '/api/products') ||
        (pathname === '/api/categories') ||
        pathname.startsWith('/api/products/') ||
        pathname.startsWith('/api/auth') ||
        pathname.startsWith('/api/admin') ||
        pathname === '/metrics'

      const isProtected = pathname === '/api/orders' || pathname === '/api/checkout'

      if (isProtected && !process.env.NO_AUTH) {
        // 会话解析 + 禁用失效判定（R-SES-006），无有效会话抛 UNAUTHORIZED
        const authHeader = req.headers['authorization'] || ''
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
        const sessionUser = authService.getSessionUser(token)
        req.sessionUserId = sessionUser.id
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
        // 购物车归属：有会话按会话 userId（D3），无会话按 body.userId / 游客
        let userId = body.userId || 'user_dev'
        if (req.sessionUserId) userId = req.sessionUserId
        const cart = cartService.addToCart(userId, body.productId, body.quantity)
        return sendJson(res, 200, cart)
      }

      if (pathname === '/api/orders' && req.method === 'POST') {
        const body = await readJson(req)
        const order = orderService.createOrder(req.sessionUserId, body.couponId)
        return sendJson(res, 201, order)
      }

      if (pathname === '/api/orders' && req.method === 'GET') {
        // 我的订单：归属从会话解析（R-SES-003，替代客户端 ?userId=）
        return sendJson(res, 200, orderService.listByUser(req.sessionUserId))
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

      // ===== B 端用户管理（user-admin capability，运营角色门禁 R-ADM-001） =====
      if (pathname === '/api/admin/users' && req.method === 'GET') {
        requireAdminRole(req)
        const keyword = url.searchParams.get('keyword')
        return sendJson(res, 200, adminUserService.list({ keyword }))
      }

      if (pathname.startsWith('/api/admin/users/') && pathname.endsWith('/status') && req.method === 'PATCH') {
        requireAdminRole(req)
        const id = pathname.split('/')[4]
        const body = await readJson(req)
        const result = adminUserService.setStatus(id, body.status)
        return sendJson(res, 200, result)
      }

      if (pathname.startsWith('/api/admin/users/') && req.method === 'GET') {
        requireAdminRole(req)
        const id = pathname.split('/').pop()
        const detail = adminUserService.getDetail(id)
        return sendJson(res, 200, detail)
      }

      if (pathname === '/api/auth/register' && req.method === 'POST') {
        const body = await readJson(req)
        const { user, sessionToken } = authService.register({
          phone: body.phone,
          nickname: body.nickname,
          password: body.password
        })
        return sendJson(res, 201, { user, sessionToken })
      }

      if (pathname === '/api/auth/login' && req.method === 'POST') {
        const body = await readJson(req)
        const { user, sessionToken } = authService.login({
          phone: body.phone,
          password: body.password
        })
        return sendJson(res, 201, { user, sessionToken })
      }

      if (pathname === '/api/auth/logout' && req.method === 'POST') {
        // 退出登录：销毁服务端会话凭证（R-SES-005，幂等）
        const authHeader = req.headers['authorization'] || ''
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
        authService.logout(token)
        return sendJson(res, 200, { ok: true })
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
       if (e.message === 'INVALID_PHONE') return sendError(res, 'INVALID_PHONE', '请输入 11 位有效手机号', 400)
       if (e.message === 'PHONE_ALREADY_REGISTERED') return sendError(res, 'PHONE_ALREADY_REGISTERED', '该手机号已注册，请直接登录', 409)
       if (e.message === 'PASSWORD_TOO_SHORT') return sendError(res, 'PASSWORD_TOO_SHORT', '密码至少 6 位', 400)
       if (e.message === 'PASSWORD_TOO_LONG') return sendError(res, 'PASSWORD_TOO_LONG', '密码最多 32 位', 400)
       if (e.message === 'NICKNAME_REQUIRED') return sendError(res, 'NICKNAME_REQUIRED', '请输入昵称', 400)
       if (e.message === 'NICKNAME_TOO_LONG') return sendError(res, 'NICKNAME_TOO_LONG', '昵称最多 20 字', 400)
       if (e.message === 'INVALID_CREDENTIALS') return sendError(res, 'INVALID_CREDENTIALS', '手机号或密码不正确，请重试', 401)
       if (e.message === 'UNAUTHORIZED') return sendError(res, 'UNAUTHORIZED', '请先登录', 401)
       if (e.message === 'USER_DISABLED') return sendError(res, 'USER_DISABLED', '该账户已被禁用，如有疑问请联系平台客服', 403)
       if (e.message === 'FORBIDDEN') return sendError(res, 'FORBIDDEN', '无权限，仅运营角色可访问用户管理', 403)
       if (e.message === 'USER_NOT_FOUND') return sendError(res, 'USER_NOT_FOUND', '用户不存在', 404)
       if (e.message === 'INVALID_STATUS') return sendError(res, 'INVALID_STATUS', '用户状态不合法，仅支持正常/禁用', 400)
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
