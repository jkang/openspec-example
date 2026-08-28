# StorySpecs: account-system-02-login 用户登录

> Story Key: `account-system-02-login` | 优先级 P0 | 依赖：`account-system-01-register`
> 关联 Storymap: `storymaps/account-system/storymap.md`

## 用户场景 (User Scenario)

**目标用户（C 端）**：已注册、需要再次进入账户的买家（如"张采购"，邮箱 `buyer@trade-demo.com`）。

**使用动机**：回到商城后要查看属于自己的「我的订单」、用券或继续下单；需要安全地用邮箱+密码登录，确认"我是谁"。

**关键目标**：登录成功后进入个人区，订单 `userId` 归属当前登录用户，「我的订单」按登录用户查询，可继续下单。

**B 端视角**：登录动作本身不需要后台配置；但登录来源用户的账户生命周期由 B 端在「用户管理」掌控——若账户被 B 端置为 `DISABLED`，登录被拒（提示"账户已被禁用，请联系管理员"）。登录也是 B 端追踪"谁在系统里活跃"的入口。

## 范围 (Scope)

### In Scope
- 登录表单：邮箱 + 密码。
- 登录成功：校验通过下发会话令牌，进入个人区（展示昵称/邮箱）。
- 登录失败：明确错误提示（"邮箱或密码错误，请重试"）。
- 账户禁用拦截：`DISABLED` 账户拒绝登录（"账户已被禁用，请联系管理员"）。
- 订单归属：登录后下单 `Order.userId` 为当前用户；`GET /api/orders?userId=` 按登录用户返回「我的订单」。
- 新增 `/api/auth/login` 接口。

### Out of Scope
- 第三方 OAuth 登录。
- 密码找回 / 重置。
- 记住密码 / 免密登录。

## 原型参考 (Prototype Reference)

- 原型链接：`stories/account-system-02-login/prototypes/account-login.html`（待 `req-prototype` 生成并经用户 HITL 确认后链接）
- 关键交互点：登录表单（邮箱/密码）、错误态（账号密码错误 / 账户禁用）、登录成功跳转个人区、顶部用户区显示昵称。
- UI 约束（`docs/FRONTEND.md`）：无圆角、无阴影、slate 色系、真实数据、全中文。

## 业务规则 (Business Rules)

| 规则ID | 规则描述 | 触发条件 | 期望结果 | 备注 |
| --- | --- | --- | --- | --- |
| R-LOGIN-001 | 登录凭邮箱+密码 | 提交登录表单 | 校验通过 → 下发会话令牌 | 邮箱+密码匹配 |
| R-LOGIN-002 | 账号或密码错误统一提示 | 邮箱不存在或密码不匹配 | 提示"邮箱或密码错误，请重试" | 不泄露具体字段 |
| R-LOGIN-003 | DISABLED 账户禁止登录 | 账户状态为 `DISABLED` | 拒绝登录，提示"账户已被禁用，请联系管理员" | B 端生命周期控制 |
| R-LOGIN-004 | 登录订单归属当前用户 | 登录后下单 | `Order.userId` = 当前登录用户 id | 替换 `user_dev` |
| R-LOGIN-005 | 我的订单按登录用户查询 | `GET /api/orders?userId=` | 仅返回当前用户订单 | 归属隔离、倒序 |
| R-LOGIN-006 | 登录成功下发会话令牌 | 校验通过 | 返回 `token + user` 信息 | 衔接 session story |
| R-LOGIN-007 | 登录后回到原操作 | 登录前从加购/下单引导而来 | 登录成功后返回原操作 | 与未登录拦截（session story）协同 |

## 验收标准 (E2E 用户旅程)

### 旅程 1：已注册用户登录后订单归属本人 (Ref: L1-06 履约与完成 | SB-STAGE-06, SB-CUSTOMER-06, SB-BACKSTAGE-04)
#### 场景：正常登录主流程（订单归属本人）
- @e2e
- **GIVEN** 买家"张采购"（`buyer@trade-demo.com`）已注册且账户 ACTIVE，系统存在一笔订单（MacBook Pro 14英寸，actualPaidCents 1299900）归属 `user_dev`
- **WHEN** 他用邮箱 `buyer@trade-demo.com` 与密码 `trade1234` 登录，并进入「我的订单」
- **THEN** 登录成功后下发会话令牌，`GET /api/orders?userId=<当前用户id>` 返回该笔订单并被归属到当前登录用户，顶部显示昵称"张采购"

#### 场景：账号或密码错误登录失败
- @e2e
- **GIVEN** 买家输入邮箱 `buyer@trade-demo.com`，密码 `wrongpass1`
- **WHEN** 点击登录
- **THEN** 系统拒绝登录，提示"邮箱或密码错误，请重试"，不下发会话令牌

#### 场景：被禁用账户无法登录
- @e2e
- **GIVEN** 用户在 B 端「用户管理」被置为 `DISABLED`
- **WHEN** 该用户用正确邮箱 `buyer@trade-demo.com` 与密码 `trade1234` 登录
- **THEN** 系统拒绝登录，提示"账户已被禁用，请联系管理员"

## 行为规格 (Behavioral Specs)

### ADDED Requirements

#### Requirement: 用户登录（校验凭据与会话下发）(Ref: L2-06 发起支付 · 归属校验在支付与订单读取节点强化；登录/认证为新 L3 环节)
##### Scenario: 合法凭据登录成功并下发令牌 (@api)
- **GIVEN** 已存在 `User(email="buyer@trade-demo.com", password="trade1234", status="ACTIVE")`
- **WHEN** `POST /api/auth/login` 提交 `{ email: "buyer@trade-demo.com", password: "trade1234" }`
- **THEN** 返回 `200`，含 `token` 与 `user{ email, nickname:"张采购", status:"ACTIVE" }`

##### Scenario: 凭据错误返回统一提示 (@api)
- **GIVEN** 邮箱 `buyer@trade-demo.com` 存在，密码 `wrongpass1` 不匹配
- **WHEN** `POST /api/auth/login`
- **THEN** 返回 `401`，错误码 `INVALID_CREDENTIALS`，提示"邮箱或密码错误，请重试"

##### Scenario: 禁用账户登录被拒绝 (@api)
- **GIVEN** `User(email="buyer@trade-demo.com", status="DISABLED")`
- **WHEN** `POST /api/auth/login` 提交正确凭据
- **THEN** 返回 `403`，错误码 `ACCOUNT_DISABLED`，提示"账户已被禁用，请联系管理员"

##### Scenario: 我的订单按 userId 归属隔离 (@api)
- **GIVEN** 当前登录用户 id 与一笔已支付订单（`Order.userId=当前用户id`，状态 `PAID`）
- **WHEN** `GET /api/orders?userId=<当前用户id>`
- **THEN** 返回该用户订单列表（倒序），不返回其他用户订单；订单 `userId` 不再是 `user_dev`

## 治理映射对齐 (Governance Mapping)

- **Source of Truth**: docs/baseline/domain_model.html
- **Bounded Context**: `account`（新增 BC，认证）；`order`（Order Context：订单 `userId` 真实归属 + 按 userId 查询）；`shared`（`domain-model` 归属语义）。
- **Capability Taxonomy**: `user-session`（新增）；复用 `order-management`、`domain-model`。
- **Related Process Nodes**: `L2-06 发起支付`（归属校验）、`L1-06 履约与完成`（我的订单查询）；登录/认证为新增 L3 环节。
- **Related Service Blueprint Nodes**: `SB-STAGE-06`、`SB-CUSTOMER-06`（我的订单按用户）、`SB-BACKSTAGE-04`（`GET /api/orders?userId=`）；`SB-BACKSTAGE-02`（Session 一致性）。
- **Sync Assessment**: **Yes**（`Order.userId` 真实化，`Coupon.userId` 非空，影响 domain_model 与 service_blueprint 的归属语义）。

## 交接状态 (Handoff Status)

- [x] 待开发交接 (openspec-handoff)
- [ ] 已交接 (changeName 记录于 epic/storymap)
