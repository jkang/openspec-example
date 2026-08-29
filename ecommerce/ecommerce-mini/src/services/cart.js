export class CartService {
  constructor(cartRepo, productRepo) {
    this.cartRepo = cartRepo
    this.productRepo = productRepo
  }

  getCart(userId) {
    let cart = this.cartRepo.findByUserId(userId)
    if (!cart) {
      cart = { userId, items: [] }
      this.cartRepo.save(cart)
    }
    return cart
  }

  addToCart(userId, productId, quantity) {
    const product = this.productRepo.findById(productId)
    if (!product) throw new Error('PRODUCT_NOT_FOUND')
    
    const cart = this.getCart(userId)
    const existing = cart.items.find(i => i.productId === productId)
    
    if (existing) {
      if (existing.quantity + quantity > 99) throw new Error('MAX_QUANTITY_EXCEEDED')
      existing.quantity += quantity
    } else {
      // 读取型调用（quantity <= 0，如 fetchCart 的 qty=0 探测）不向空购物车写入零数量条目
      // （避免污染后续订单：qty=0 条目会以 items[0] 进入订单快照，见 story-account-system-session 验证发现）
      if (quantity <= 0) return cart
      if (quantity > 99) throw new Error('MAX_QUANTITY_EXCEEDED')
      cart.items.push({
        id: `item_${Math.random().toString(36).substr(2, 9)}`,
        productId,
        quantity
      })
    }
    
    this.cartRepo.save(cart)
    return cart
  }

  clearCart(userId) {
    const cart = { userId, items: [] }
    this.cartRepo.save(cart)
  }

  removeFromCart(userId, productId) {
    const cart = this.getCart(userId)
    cart.items = cart.items.filter(i => i.productId !== productId)
    this.cartRepo.save(cart)
    return cart
  }
}
