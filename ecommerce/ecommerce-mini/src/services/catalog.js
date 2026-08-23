import { validateProductInput, normalizeStatus, assertCategoryActive } from '../domain/logic.js'

export class CatalogService {
  constructor(productRepo, categoryRepo) {
    this.repo = productRepo
    this.categoryRepo = categoryRepo
  }

  list(name, sort, categoryId) {
    // 默认只返回上架商品（软删除：status !== 'deleted'）
    let products = this.repo.findAll().filter(p => normalizeStatus(p) === 'active')

    // Optional name filter (case-insensitive substring match)
    if (name) {
      const keyword = name.toLowerCase()
      products = products.filter(p => p.name.toLowerCase().includes(keyword))
    }

    // Optional category filter
    if (categoryId) {
      products = products.filter(p => p.categoryId === categoryId)
    }

    // Optional sort by price (whitelist: price_asc / price_desc)
    if (sort === 'price_asc') {
      products.sort((a, b) => a.priceCents - b.priceCents)
    } else if (sort === 'price_desc') {
      products.sort((a, b) => b.priceCents - a.priceCents)
    }

    return products
  }

  getProduct(id) {
    const product = this.repo.findById(id)
    // 已下架商品对外视为不存在
    if (!product || normalizeStatus(product) === 'deleted') return undefined
    return product
  }

  addProduct(product) {
    if (!product.id) product.id = `prod_${Math.random().toString(36).substr(2, 9)}`
    // 校验新商品合法性
    validateProductInput(product)
    // categoryId 可空；非空时必须指向存在的 active 分类
    if (product.categoryId != null) {
      assertCategoryActive(this.categoryRepo.findById(product.categoryId))
    }
    // 新增默认上架
    if (!product.status) product.status = 'active'
    this.repo.save(product)
    return product
  }

  /**
   * 修改商品（局部更新）：仅更新提供的字段 name/priceCents/stock/imageUrl/description
   * @param {string} id
   * @param {Object} patch
   * @returns {import('../domain/types.js').Product}
   * @throws {Error} PRODUCT_NOT_FOUND
   * @throws {Error} INVALID_PRICE / INVALID_STOCK
   */
  updateProduct(id, patch) {
    const product = this.repo.findById(id)
    if (!product || normalizeStatus(product) === 'deleted') throw new Error('PRODUCT_NOT_FOUND')

    validateProductInput(patch)

    // categoryId 可空；非空时必须指向存在的 active 分类
    if (patch.categoryId !== undefined && patch.categoryId != null) {
      assertCategoryActive(this.categoryRepo.findById(patch.categoryId))
    }

    const editableFields = ['name', 'priceCents', 'stock', 'imageUrl', 'description', 'categoryId']
    for (const field of editableFields) {
      if (patch[field] !== undefined) product[field] = patch[field]
    }
    this.repo.save(product)
    return product
  }

  /**
   * 删除商品（软删除）：置 status = deleted，不物理移除
   * @param {string} id
   * @throws {Error} PRODUCT_NOT_FOUND
   */
  deleteProduct(id) {
    const product = this.repo.findById(id)
    if (!product || normalizeStatus(product) === 'deleted') throw new Error('PRODUCT_NOT_FOUND')
    product.status = 'deleted'
    this.repo.save(product)
    return product
  }

  // Atomic deduction simulation
  deductStock(id, quantity) {
    const product = this.repo.findById(id)
    if (!product) throw new Error('PRODUCT_NOT_FOUND')
    if (product.stock < quantity) throw new Error('OUT_OF_STOCK')

    product.stock -= quantity
    this.repo.save(product)
  }
}
