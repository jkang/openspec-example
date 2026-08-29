import fs from 'fs'
import path from 'path'

/**
 * FileStore：JSON 文件存储（Map 语义 + 全量落盘）
 *
 * 增强（fix-data-persistence）：
 * - 首次启动：data/ 目录不存在时自动创建（mkdir -p）
 * - 首次启动：数据文件缺失时自动创建为空数据集（[]），不抛异常
 * - 加载失败（损坏/格式不符）：不覆盖原文件，重命名备份为 `<file>.corrupt-<timestamp>`
 *   保留现场，并以空数据集启动，不崩溃
 * - 写操作原子落盘：先写 `<file>.tmp`，成功后 `rename` 原子替换目标文件，
 *   避免崩溃窗口留下截断文件
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
   * 加载数据集；文件缺失 → 自动创建空数据集；解析失败 → 备份损坏文件后以空数据集启动（不崩溃）
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
      // 损坏/格式不符：重命名备份保留现场，不覆盖原文件；以空数据集启动（不崩溃）。
      // 后续首次写操作会通过原子写重建有效文件。
      const backupPath = `${this.filePath}.corrupt-${Date.now()}`
      try {
        fs.renameSync(this.filePath, backupPath)
        console.error(`[FileStore] 数据文件 ${this.filePath} 解析失败，已备份为 ${backupPath} 并以空数据集启动: ${e.message}`)
      } catch (backupErr) {
        // 备份失败（极端场景）也绝不原地覆盖销毁原数据：仅降级为空数据集
        console.error(`[FileStore] 数据文件 ${this.filePath} 解析失败且备份失败（${backupErr.message}），仅以空数据集启动，保留原文件: ${e.message}`)
      }
      this.data = new Map()
    }
  }

  /** 将当前数据集全量写回文件（原子写：tmp + rename，避免崩溃窗口留下截断文件） */
  saveAll(items) {
    const json = Array.from(items)
    const tmpPath = `${this.filePath}.tmp`
    fs.writeFileSync(tmpPath, JSON.stringify(json, null, 2))
    fs.renameSync(tmpPath, this.filePath)
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

  clear() {
    this.data.clear()
    this.saveAll([])
  }
}
