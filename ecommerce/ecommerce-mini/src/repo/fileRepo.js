import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import { FileStore } from '../persist/fileStore.js'

/**
 * 共享文件仓储适配层（fix-data-persistence）
 *
 * 从 `server.prod.js` 迁移并泛化：以 FileStore 为底座，实现与 `memoryRepo.js`
 * 完全一致的内存仓储接口（save/findAll/findById/findByUserId/countByTemplateId），
 * 支持 8 类数据：products / categories / coupons / issuances / orders /
 * carts（keyField=userId）/ users / sessions。
 *
 * 仓储层仅实现数据存取接口，不含业务判断（对齐四层架构 Repository Layer）。
 */

/** 默认数据目录：ecommerce/ecommerce-mini/data（基于模块位置解析，不依赖 cwd） */
export const DEFAULT_DATA_DIR = fileURLToPath(new URL('../../data', import.meta.url))

/** 数据目录解析：显式 dataDir 参数 > DATA_DIR 环境变量 > 模块默认目录 */
export function resolveDataDir(dataDir) {
  if (dataDir) return dataDir
  if (process.env.DATA_DIR) return process.env.DATA_DIR
  return DEFAULT_DATA_DIR
}

function resolveDataFile(filename, dataDir) {
  return path.join(resolveDataDir(dataDir), filename)
}

/**
 * 通用 FileStore 适配器：覆盖 products/categories/coupons/issuances/orders/carts
 * @template T
 */
export class FileRepoAdapter {
  /**
   * @param {{ filename: string, keyField?: string, dataDir?: string }} options
   */
  constructor({ filename, keyField = 'id', dataDir } = { filename: '' }) {
    this.store = new FileStore(resolveDataFile(filename || 'default.json', dataDir), keyField)
    this.keyField = keyField
  }

  /** 保存/更新（按 keyField 键控，全量落盘） */
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

  /** 购物车按归属用户键控（CartRepo 接口语义） */
  findByUserId(userId) {
    return this.store.get(userId)
  }

  /** 券规则发放实例计数（CouponRepo 接口语义） */
  countByTemplateId(templateId) {
    return this.findAll().filter(c => c.templateId === templateId).length
  }

  clear() {
    this.store.clear()
  }
}

/**
 * 用户仓储（users.json 持久化）：在 FileStore 基础上补齐 UserRepo 接口
 * 序列续号：从现有数据最大 user_<n> 继续，避免覆盖种子演示用户
 */
export class UserFileRepo extends FileRepoAdapter {
  /**
   * @param {{ dataDir?: string }} [options]
   */
  constructor({ dataDir } = { dataDir: undefined }) {
    super({ filename: 'users.json', keyField: 'id', dataDir })
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

  /**
   * 同步序列续号：种子/既有数据注入后调用，避免新注册用户覆盖已存在的 user_<n>
   * （构造时 FileStore 尚未含种子，故 findMaxSeq 须在种子写入后再同步一次）
   */
  syncSequence() {
    this.sequence = this.findMaxSeq()
  }

  nextId() {
    this.sequence += 1
    return `user_${this.sequence}`
  }

  findByPhone(phone) {
    return this.findAll().find(u => u.phone === String(phone))
  }

  /** 微信 openid 命中查询（wechat-auth，Q1：openid 单小程序一对一） */
  findByOpenid(openid) {
    if (!openid) return undefined
    return this.findAll().find(u => u.openid === openid)
  }

  clear() {
    this.store.clear()
  }
}

/**
 * 库存阈值配置仓储（stock-config.json 持久化，R-STOCK-007）：
 * 单对象文件 `{ globalThreshold: 10, overrides: { "<productId>": <threshold> } }`，
 * 接口与 memory `StockConfigRepo` 一致（getConfig / setGlobalThreshold / setOverride / clear）。
 * 原子写（tmp + rename），损坏/缺失自愈为默认配置，不抛异常。
 */
export class StockConfigFileRepo {
  /**
   * @param {{ dataDir?: string }} [options]
   */
  constructor({ dataDir } = { dataDir: undefined }) {
    this.filePath = resolveDataFile('stock-config.json', dataDir)
    /** @type {{ globalThreshold: number, overrides: Record<string, number> }} */
    this.config = { globalThreshold: 10, overrides: {} }
    this.load()
  }

  /** 加载配置；文件缺失 → 自动创建默认配置；解析失败 → 备份损坏文件后以默认配置启动（不崩溃） */
  load() {
    if (!fs.existsSync(this.filePath)) {
      this.saveAll()
      return
    }
    try {
      const json = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'))
      this.config = {
        globalThreshold:
          typeof json.globalThreshold === 'number' && json.globalThreshold >= 0
            ? json.globalThreshold
            : 10,
        overrides: json.overrides && typeof json.overrides === 'object' ? json.overrides : {}
      }
    } catch (e) {
      const backupPath = `${this.filePath}.corrupt-${Date.now()}`
      try {
        fs.renameSync(this.filePath, backupPath)
        console.error(`[StockConfigFileRepo] 配置文件解析失败，已备份为 ${backupPath} 并以默认配置启动: ${e.message}`)
      } catch (backupErr) {
        console.error(`[StockConfigFileRepo] 配置文件解析失败且备份失败（${backupErr.message}），仅以默认配置启动: ${e.message}`)
      }
      this.config = { globalThreshold: 10, overrides: {} }
    }
  }

  /** 原子落盘当前配置（tmp + rename，避免崩溃窗口留下截断文件） */
  saveAll() {
    const tmpPath = `${this.filePath}.tmp`
    fs.writeFileSync(tmpPath, JSON.stringify(this.config, null, 2))
    fs.renameSync(tmpPath, this.filePath)
  }

  getConfig() {
    return this.config
  }

  setGlobalThreshold(threshold) {
    this.config.globalThreshold = threshold
    this.saveAll()
    return this.config
  }

  setOverride(productId, threshold) {
    this.config.overrides[String(productId)] = threshold
    this.saveAll()
    return this.config
  }

  clear() {
    this.config = { globalThreshold: 10, overrides: {} }
    this.saveAll()
  }
}

/**
 * 会话仓储（sessions.json 持久化）：token 键控 + SessionRepo 接口
 */
export class SessionFileRepo {
  /**
   * @param {{ dataDir?: string }} [options]
   */
  constructor({ dataDir } = { dataDir: undefined }) {
    // sessions.json 以 token 为键（显式 keyField='token'，覆盖缺省 id/userId 推断）
    this.store = new FileStore(resolveDataFile('sessions.json', dataDir), 'token')
  }

  create(userId, channel = 'WEB') {
    const session = {
      token: crypto.randomUUID(),
      userId,
      channel,
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' ')
    }
    this.store.set(session.token, session)
    return session
  }

  findByToken(token) {
    return this.store.get(token)
  }

  /** 删除会话；返回是否存在并删除（对齐 memory SessionRepo.delete 语义） */
  delete(token) {
    if (token && this.store.has(token)) {
      this.store.delete(token)
      return true
    }
    return false
  }

  clear() {
    this.store.clear()
  }
}

/**
 * 小程序渠道配置仓储（channel-config.json 持久化，story-miniprogram-channel-config）：
 * 单对象文件 `{ appid, appsecret, mchid, enabled }`，
 * 接口与 memory `ChannelConfigRepo` 一致（getConfig / save / clear）。
 * 原子写（tmp + rename），损坏/缺失自愈为默认配置（appid 空 / appsecret 空 / mchid 空 / enabled=false，R-CHN-009 默认停用），不抛异常。
 * ⚠️ appsecret 明文仅存服务端文件，读取 API 由 Domain `toPublicConfig` 脱敏（永不回显明文，Q4）。
 */
export class ChannelConfigFileRepo {
  /**
   * @param {{ dataDir?: string }} [options]
   */
  constructor({ dataDir } = { dataDir: undefined }) {
    this.filePath = resolveDataFile('channel-config.json', dataDir)
    /** @type {{ appid: string, appsecret: string, mchid: string, enabled: boolean }} */
    this.config = { appid: '', appsecret: '', mchid: '', enabled: false }
    this.load()
  }

  /** 加载配置；文件缺失 → 自动创建默认配置；解析失败 → 备份损坏文件后以默认配置启动（不崩溃） */
  load() {
    if (!fs.existsSync(this.filePath)) {
      this.saveAll()
      return
    }
    try {
      const json = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'))
      this.config = {
        appid: typeof json.appid === 'string' ? json.appid : '',
        appsecret: typeof json.appsecret === 'string' ? json.appsecret : '',
        mchid: typeof json.mchid === 'string' ? json.mchid : '',
        enabled: json.enabled === true
      }
    } catch (e) {
      const backupPath = `${this.filePath}.corrupt-${Date.now()}`
      try {
        fs.renameSync(this.filePath, backupPath)
        console.error(`[ChannelConfigFileRepo] 配置文件解析失败，已备份为 ${backupPath} 并以默认配置启动: ${e.message}`)
      } catch (backupErr) {
        console.error(`[ChannelConfigFileRepo] 配置文件解析失败且备份失败（${backupErr.message}），仅以默认配置启动: ${e.message}`)
      }
      this.config = { appid: '', appsecret: '', mchid: '', enabled: false }
    }
  }

  /** 原子落盘当前配置（tmp + rename，避免崩溃窗口留下截断文件） */
  saveAll() {
    const tmpPath = `${this.filePath}.tmp`
    fs.writeFileSync(tmpPath, JSON.stringify(this.config, null, 2))
    fs.renameSync(tmpPath, this.filePath)
  }

  getConfig() {
    return this.config
  }

  save(cfg) {
    this.config = cfg
    this.saveAll()
    return this.config
  }

  clear() {
    this.config = { appid: '', appsecret: '', mchid: '', enabled: false }
    this.saveAll()
  }
}

/**
 * 应收账款仓储（receivables.json 持久化，story-ar-credit-customer）：
 * 数组文件 `[{ id, userId, orderId, amountCents, receivedCents, dueDate, createdAt }]`，
 * 接口与 memory `ReceivableRepo` 一致。原子写 + 自愈（空数组）。
 */
export class ReceivableFileRepo {
  constructor({ dataDir } = { dataDir: undefined }) {
    this.filePath = resolveDataFile('receivables.json', dataDir)
    this.data = []
    this.load()
  }

  load() {
    if (!fs.existsSync(this.filePath)) { this.saveAll(); return }
    try {
      const json = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'))
      this.data = Array.isArray(json) ? json : []
    } catch (e) {
      try { fs.renameSync(this.filePath, `${this.filePath}.corrupt-${Date.now()}`) } catch (_) { /* ignore */ }
      console.error(`[ReceivableFileRepo] 解析失败，已重置为空数组: ${e.message}`)
      this.data = []
    }
  }

  saveAll() {
    const tmp = `${this.filePath}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2))
    fs.renameSync(tmp, this.filePath)
  }

  save(r) {
    const i = this.data.findIndex(x => x.id === r.id)
    if (i >= 0) this.data[i] = r; else this.data.push(r)
    this.saveAll()
    return r
  }

  findAll() { return this.data }

  findById(id) { return this.data.find(x => x.id === id) }

  findByUserId(userId) { return this.data.filter(x => x.userId === userId) }

  findByOrderId(orderId) { return this.data.find(x => x.orderId === orderId) }

  clear() { this.data = []; this.saveAll() }
}

/**
 * 回款流水仓储（receipts.json 持久化，story-ar-receipt-entry）：
 * 数组文件 `[{ id, receivableId, amountCents, recordedAt, operator }]`，接口与 memory `ReceiptRepo` 一致。
 */
export class ReceiptFileRepo {
  constructor({ dataDir } = { dataDir: undefined }) {
    this.filePath = resolveDataFile('receipts.json', dataDir)
    this.data = []
    this.load()
  }

  load() {
    if (!fs.existsSync(this.filePath)) { this.saveAll(); return }
    try {
      const json = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'))
      this.data = Array.isArray(json) ? json : []
    } catch (e) {
      try { fs.renameSync(this.filePath, `${this.filePath}.corrupt-${Date.now()}`) } catch (_) { /* ignore */ }
      console.error(`[ReceiptFileRepo] 解析失败，已重置为空数组: ${e.message}`)
      this.data = []
    }
  }

  saveAll() {
    const tmp = `${this.filePath}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2))
    fs.renameSync(tmp, this.filePath)
  }

  save(r) {
    const i = this.data.findIndex(x => x.id === r.id)
    if (i >= 0) this.data[i] = r; else this.data.push(r)
    this.saveAll()
    return r
  }

  findAll() { return this.data }

  findByReceivableId(receivableId) { return this.data.filter(x => x.receivableId === receivableId) }

  clear() { this.data = []; this.saveAll() }
}
