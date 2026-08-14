import http from 'http'
import { ProductRepo, CartRepo, OrderRepo } from '../repo/memoryRepo.js'
import { CatalogService } from '../services/catalog.js'
import { CartService } from '../services/cart.js'
import { OrderService } from '../services/order.js'

const productRepo = new ProductRepo()
const cartRepo = new CartRepo()
const orderRepo = new OrderRepo()

// 注入初始商品数据，确保与前端同步
const initialProducts = [
  { 
    id: '1', name: '极简机械键盘', description: '84键紧凑布局，红轴', priceCents: 29900, stock: 99,
    imageUrl: 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?auto=format&fit=crop&q=80&w=800'
  },
  { 
    id: '2', name: '无线办公鼠标', description: '静音按键，人体工学设计', priceCents: 8900, stock: 99,
    imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&q=80&w=800'
  },
  { 
    id: '3', name: '高清显示器', description: '27英寸 4K分辨率', priceCents: 129900, stock: 99,
    imageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&q=80&w=800'
  },
  { 
    id: '4', name: '桌面收纳架', description: '实木材质，双层结构', priceCents: 4500, stock: 99,
    imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&q=80&w=800'
  },
  { 
    id: '5', name: '铝合金笔记本支架', description: '折叠便携，多档调节', priceCents: 6800, stock: 99,
    imageUrl: 'https://images.unsplash.com/photo-1527443154391-507e9dc6c5cc?auto=format&fit=crop&q=80&w=800'
  },
  { 
    id: '6', name: '桌面拾音氛围灯', description: 'RGB色彩，支持音频同步', priceCents: 12800, stock: 99,
    imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252728f?auto=format&fit=crop&q=80&w=800'
  }
]
initialProducts.forEach(p => productRepo.save(p))

const catalogService = new CatalogService(productRepo)
const cartService = new CartService(cartRepo, productRepo)
const orderService = new OrderService(cartRepo, orderRepo, productRepo)

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
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  })
  res.end(JSON.stringify(data))
}

const sendError = (res, code, message, status = 500) => {
  res.writeHead(status, { 
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  })
  res.end(JSON.stringify({ code, message }))
}

export function createServer() {
  const server = http.createServer(async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      })
      res.end()
      return
    }

    const url = new URL(req.url, `http://${req.headers.host}`)
    const pathname = url.pathname

    try {
      if (pathname === '/api/products' && req.method === 'GET') {
        const name = url.searchParams.get('name')
        const sort = url.searchParams.get('sort')
        return sendJson(res, 200, catalogService.list(name, sort))
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

      if (pathname === '/api/cart/items' && req.method === 'POST') {
        const body = await readJson(req)
        // Mock user ID for dev
        const userId = 'user_dev'
        const cart = cartService.addToCart(userId, body.productId, body.quantity)
        return sendJson(res, 200, cart)
      }

      if (pathname === '/api/orders' && req.method === 'POST') {
        const body = await readJson(req)
        // Mock user ID for dev if not provided
        const userId = body.userId || 'user_dev'
        const order = orderService.createOrder(userId)
        return sendJson(res, 201, order)
      }

      if (pathname === '/api/checkout' && req.method === 'POST') {
        const body = await readJson(req)
        const userId = body.userId || 'user_dev'
        const order = orderService.checkout(userId)
        return sendJson(res, 200, order)
      }
      
      if (pathname.startsWith('/api/orders/') && req.method === 'GET') {
          const id = pathname.split('/').pop()
          const order = orderRepo.findById(id)
          if (!order) return sendError(res, 'NOT_FOUND', 'Order not found', 404)
          return sendJson(res, 200, order)
      }

      sendError(res, 'NOT_FOUND', 'Endpoint not found', 404)

    } catch (e) {
      if (e.message === 'CART_EMPTY')
        return sendError(res, 'CART_EMPTY', '购物车为空', 400)
      if (e.message === 'OUT_OF_STOCK')
        return sendError(res, 'OUT_OF_STOCK', '库存不足', 409)
      if (e.message === 'PRODUCT_NOT_FOUND')
        return sendError(res, 'PRODUCT_NOT_FOUND', '商品不存在', 404)
        
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
