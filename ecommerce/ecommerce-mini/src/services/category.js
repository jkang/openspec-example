import { assertCategoryNameUnique, assertCategoryActive } from '../domain/logic.js'

export class CategoryService {
  constructor(categoryRepo, productRepo) {
    this.categoryRepo = categoryRepo
    this.productRepo = productRepo
  }

  /** 分类列表：仅 active，按 sortOrder 升序 */
  list() {
    return this.categoryRepo
      .findAll()
      .filter(c => c.status !== 'deleted')
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
  }

  /** 新增分类；同名 active 分类拒绝 */
  create({ name, sortOrder = 0 }) {
    if (!name || !String(name).trim()) throw new Error('CATEGORY_NAME_REQUIRED')
    const cleanName = String(name).trim()
    assertCategoryNameUnique(this.categoryRepo.findAll(), cleanName)
    const id = `cat_${Math.random().toString(36).substr(2, 9)}`
    const category = { id, name: cleanName, sortOrder: Number(sortOrder) || 0, status: 'active' }
    this.categoryRepo.save(category)
    return category
  }

  /** 编辑分类（局部更新 name/sortOrder） */
  update(id, patch) {
    const category = this.categoryRepo.findById(id)
    assertCategoryActive(category)
    if (patch.name !== undefined) {
      if (!String(patch.name).trim()) throw new Error('CATEGORY_NAME_REQUIRED')
      assertCategoryNameUnique(this.categoryRepo.findAll(), String(patch.name).trim(), id)
      category.name = String(patch.name).trim()
    }
    if (patch.sortOrder !== undefined) category.sortOrder = Number(patch.sortOrder) || 0
    this.categoryRepo.save(category)
    return category
  }

  /** 删除（软删除）：置 deleted，并清空该分类下商品的 categoryId */
  delete(id) {
    const category = this.categoryRepo.findById(id)
    assertCategoryActive(category)
    category.status = 'deleted'
    this.categoryRepo.save(category)
    // 关联商品置空
    this.productRepo.findAll().forEach(p => {
      if (p.categoryId === id) {
        p.categoryId = null
        this.productRepo.save(p)
      }
    })
    return category
  }
}
