import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { UserRepo, OrderRepo, SessionRepo } from '../src/repo/memoryRepo.js'
import { AuthService } from '../src/services/auth.js'
import { AdminUserService } from '../src/services/userAdmin.js'
import { assertUserStatusValue, assertUserEnabled } from '../src/domain/logic.js'
import { initialUsers } from '../src/http/server.js'

describe('老板角色种子演示账号 user_1003（@unit，user-admin delta spec）', () => {
  it('代码种子包含 user_1003（role=老板 昵称 李老板 状态 正常），与 user_1001（运营）并存', () => {
    const boss = initialUsers.find(u => u.id === 'user_1003')
    assert.ok(boss, '代码种子应包含 user_1003')
    assert.strictEqual(boss.role, '老板')
    assert.strictEqual(boss.nickname, '李老板')
    assert.strictEqual(boss.status, '正常')
    assert.ok(initialUsers.some(u => u.id === 'user_1001' && u.role === '运营'), 'user_1001（运营）应并存')
  })

  it('运行时数据层三者并存：data/users.json 含 user_1001（运营）/ user_1002（客户）/ user_1003（老板）', () => {
    // user_1002（客户·林晓明）为既有运行时账户（file 模式首次启动后注册/补录），
    // 与代码种子 user_1001/user_1003 在运行态数据层三者并存（user-admin delta spec）
    const dataDir = fileURLToPath(new URL('../data', import.meta.url))
    const usersPath = path.join(dataDir, 'users.json')
    if (!fs.existsSync(usersPath)) return // 干净环境无运行时数据文件：跳过（种子口径由代码种子保证）
    const users = JSON.parse(fs.readFileSync(usersPath, 'utf-8'))
    const byId = Object.fromEntries(users.map(u => [u.id, u]))
    assert.strictEqual(byId['user_1001']?.role, '运营')
    assert.strictEqual(byId['user_1002']?.role, '客户')
    assert.strictEqual(byId['user_1003']?.role, '老板')
  })
})

describe('B 端用户管理 - 领域规则（@unit）', () => {
  it('状态值校验：正常/禁用通过', () => {
    assert.doesNotThrow(() => assertUserStatusValue('正常'))
    assert.doesNotThrow(() => assertUserStatusValue('禁用'))
  })

  it('状态值校验：非法状态值被拒绝', () => {
    assert.throws(() => assertUserStatusValue('冻结'), /INVALID_STATUS/)
    assert.throws(() => assertUserStatusValue(''), /INVALID_STATUS/)
    assert.throws(() => assertUserStatusValue(undefined), /INVALID_STATUS/)
  })

  it('禁用门禁回归：status=禁用 抛 USER_DISABLED（R-ADM-005 联动）', () => {
    assert.throws(() => assertUserEnabled({ id: 'user_1001', status: '禁用' }), /USER_DISABLED/)
    assert.doesNotThrow(() => assertUserEnabled({ id: 'user_1001', status: '正常' }))
  })
})

describe('B 端用户管理 - AdminUserService（@unit）', () => {
  let userRepo
  let orderRepo
  let adminUser

  beforeEach(() => {
    userRepo = new UserRepo()
    orderRepo = new OrderRepo()
    adminUser = new AdminUserService(userRepo, orderRepo)
    // 预置用户（复用 AuthService.register 保证哈希格式与 role 默认值一致）
    const auth = new AuthService(userRepo, new SessionRepo())
    auth.register({ phone: '13888217536', nickname: '林晓明', password: '123456' })
    auth.register({ phone: '15876543210', nickname: '王强', password: '123456' })
    auth.register({ phone: '13600000001', nickname: '陈晓芸', password: 'admin123' })
    // 显式设置不同注册时间，验证注册时间倒序（同分钟注册时 sort 稳定保持插入序）
    userRepo.findById('user_1001').createdAt = '2026-08-20 09:00'
    userRepo.findById('user_1002').createdAt = '2026-08-21 09:00'
    userRepo.findById('user_1003').createdAt = '2026-08-22 09:00'
    // 预置订单：林晓明 2 笔，王强 0 笔
    orderRepo.save({ id: 'o1', userId: 'user_1001', status: 'PAID', createdAt: '2026-08-20T10:00:00.000Z', items: [], totalCents: 100, discountCents: 0, actualPaidCents: 100 })
    orderRepo.save({ id: 'o2', userId: 'user_1001', status: 'PENDING_PAYMENT', createdAt: '2026-08-21T10:00:00.000Z', items: [], totalCents: 200, discountCents: 0, actualPaidCents: 200 })
    orderRepo.save({ id: 'o3', userId: 'user_1002', status: 'COMPLETED', createdAt: '2026-08-22T10:00:00.000Z', items: [], totalCents: 300, discountCents: 0, actualPaidCents: 300 })
  })

  it('列表：返回全量用户 + 订单数聚合（R-ADM-002）', () => {
    const list = adminUser.list()
    assert.strictEqual(list.length, 3)
    const byNick = Object.fromEntries(list.map(u => [u.nickname, u]))
    assert.strictEqual(byNick['林晓明'].orderCount, 2)
    assert.strictEqual(byNick['王强'].orderCount, 1)
    assert.strictEqual(byNick['陈晓芸'].orderCount, 0)
  })

  it('列表：按注册时间倒序', () => {
    const list = adminUser.list()
    assert.strictEqual(list[0].nickname, '陈晓芸') // 最后注册，最新在前
    assert.strictEqual(list[2].nickname, '林晓明') // 最先注册，最旧在后
  })

  it('检索：按手机号关键词过滤（R-ADM-003）', () => {
    const list = adminUser.list({ keyword: '1388821' })
    assert.strictEqual(list.length, 1)
    assert.strictEqual(list[0].nickname, '林晓明')
  })

  it('检索：按昵称关键词过滤（R-ADM-003）', () => {
    const list = adminUser.list({ keyword: '王' })
    assert.strictEqual(list.length, 1)
    assert.strictEqual(list[0].nickname, '王强')
  })

  it('检索：空关键词返回全量（R-ADM-003）', () => {
    assert.strictEqual(adminUser.list({ keyword: '' }).length, 3)
    assert.strictEqual(adminUser.list({ keyword: '   ' }).length, 3)
    assert.strictEqual(adminUser.list().length, 3)
  })

  it('列表：响应不泄露密码字段（R-ADM-007 关联）', () => {
    const list = adminUser.list()
    list.forEach(u => {
      assert.ok(!('passwordHash' in u))
      assert.ok(!('password' in u))
    })
  })

  it('详情：基础信息 + 该用户订单聚合（R-ADM-004）', () => {
    const detail = adminUser.getDetail('user_1001')
    assert.strictEqual(detail.nickname, '林晓明')
    assert.strictEqual(detail.phone, '13888217536')
    assert.strictEqual(detail.orders.length, 2)
    // 倒序：o2 在前
    assert.strictEqual(detail.orders[0].id, 'o2')
    assert.strictEqual(detail.orders[1].id, 'o1')
  })

  it('详情：仅展示该用户自己的订单（不混入他人订单）', () => {
    const detail = adminUser.getDetail('user_1001')
    assert.ok(detail.orders.every(o => o.userId === 'user_1001'))
    assert.strictEqual(detail.orders.length, 2)
  })

  it('详情：用户不存在抛 USER_NOT_FOUND', () => {
    assert.throws(() => adminUser.getDetail('user_9999'), /USER_NOT_FOUND/)
  })

  it('禁用：状态置为禁用（R-ADM-005）', () => {
    const result = adminUser.setStatus('user_1002', '禁用')
    assert.strictEqual(result.status, '禁用')
    assert.strictEqual(userRepo.findById('user_1002').status, '禁用')
    // 禁用后门禁生效
    assert.throws(() => assertUserEnabled(userRepo.findById('user_1002')), /USER_DISABLED/)
  })

  it('启用：状态恢复为正常（R-ADM-006）', () => {
    adminUser.setStatus('user_1002', '禁用')
    const result = adminUser.setStatus('user_1002', '正常')
    assert.strictEqual(result.status, '正常')
    assert.doesNotThrow(() => assertUserEnabled(userRepo.findById('user_1002')))
  })

  it('幂等：重复禁用同值不报错', () => {
    adminUser.setStatus('user_1002', '禁用')
    assert.doesNotThrow(() => adminUser.setStatus('user_1002', '禁用'))
    assert.strictEqual(userRepo.findById('user_1002').status, '禁用')
  })

  it('非法状态值：抛 INVALID_STATUS，状态不变', () => {
    assert.throws(() => adminUser.setStatus('user_1002', '冻结'), /INVALID_STATUS/)
    assert.strictEqual(userRepo.findById('user_1002').status, '正常')
  })

  it('用户不存在：setStatus 抛 USER_NOT_FOUND', () => {
    assert.throws(() => adminUser.setStatus('user_9999', '禁用'), /USER_NOT_FOUND/)
  })

  it('角色字段：注册默认 role=客户，setStatus 不影响角色', () => {
    assert.strictEqual(userRepo.findById('user_1001').role, '客户')
    adminUser.setStatus('user_1001', '禁用')
    assert.strictEqual(userRepo.findById('user_1001').role, '客户')
  })
})
