import fs from 'fs'
import path from 'path'

/**
 * FileStore：JSON 文件存储（Map 语义 + 全量落盘）
 *
 * 增强（fix-data-persistence）：
 * - 首次启动：data/ 目录不存在时自动创建（mkdir -p）
 * - 首次启动：数据文件缺失时自动创建为空数据集（[]），不抛异常
 * - 加载失败（损坏/格式不符/空文件）：安全降级为空数据集启动，不崩溃
 *
 * 每次写操作将完整数据集同步写回文件，保证文件与内存状态一致。
 */
export class FileStore {
  /**
   * @param {string} filePath JSON 文件路径
   * @param {string} [keyField] 显式键字段；缺省时自动推断（id 优先，userId 兜底）。
   *   sessions.json 为 token 键控、carts.json 为 userId 键控，须由适配层显式传入。
   */
  constructor(filePath, keyField = null) {
    this.filePath = filePath
    this.keyField = keyField
    this.data = new Map()
    this.ensureDir()
    this.load()
  }

  /** 数据目录不存在时递归创建 */
  ensureDir() {
    const dir = path.dirname(this.filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }

  /**
   * 加载数据集；文件缺失 → 自动创建空数据集；解析失败 → 安全降级为空数据集（不崩溃）
   */
  load() {
    if (!fs.existsSync(this.filePath)) {
      this.saveAll([])
      return
    }
    try {
      const content = fs.readFileSync(this.filePath, 'utf-8')
      const json = JSON.parse(content)
      if (Array.isArray(json)) {
        json.forEach(item => {
          if (!item) return
          if (this.keyField) {
            const key = item[this.keyField]
            if (key != null) this.data.set(key, item)
          } else if (item.id != null) {
            this.data.set(item.id, item)
          } else if (item.userId != null) {
            this.data.set(item.userId, item)
          }
        })
      }
    } catch (e) {
      // 损坏/格式不符：以空数据集启动并重建文件，保证后续写操作一致（不崩溃）
      console.error(`[FileStore] 数据文件 ${this.filePath} 解析失败，安全降级为空数据集启动: ${e.message}`)
      this.data = new Map()
      this.saveAll([])
    }
  }

  /** 将当前数据集全量写回文件（写后一致性） */
  saveAll(items) {
    const json = Array.from(items)
    fs.writeFileSync(this.filePath, JSON.stringify(json, null, 2))
  }

  get(id) {
    return this.data.get(id)
  }

  has(id) {
    return this.data.has(id)
  }

  set(id, item) {
    this.data.set(id, item)
    this.saveAll(this.data.values())
  }

  delete(id) {
    const existed = this.data.delete(id)
    if (existed) this.saveAll(this.data.values())
    return existed
  }

  values() {
    return this.data.values()
  }
}
