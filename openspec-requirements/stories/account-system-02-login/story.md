# Story: 用户登录

<!--
Story 是需求侧唯一冻结交付物（业务面）。
开发侧通过 openspec-handoff 以本 Story 为输入，在 openspec/changes/<name>/ 合成 proposal.md，
随后在开发侧按 capability 拆分生成行为规格 specs（Story-specs）。
需求侧不生成 specs/，行为规格一律由开发侧在 proposal 之后产出。
-->

> Story Key: `account-system-02-login` | 优先级: P0 | 依赖: `account-system-01-register`
> 关联 Storymap: `storymaps/account-system/storymap.md`
> 关联 Idea: `ideas/idea-account-system.md`

## 用户场景 (User Scenario)

**目标用户（C 端）**：已注册、需要再次进入账户的买家（如"张采购"，邮箱 `buyer@trade-demo.com`）。

**使用动机**：回到商城后要查看属于自己的「我的订单」、用券或继续下单；需要安全地用邮箱+密码登录，确认"我是谁"。

**关键目标**：登录成功后进入个人区；**登录后新下的订单 `userId` 归属当前登录用户**；「我的订单」仅返回当前登录用户本人的订单，可继续下单。

**B 端视角**：登录动作本身不需要后台配置；但登录来源用户的账户生命周期由 B 端在「用户管理」掌控——若账户被 B 端置为 `DISABLED`，登录被拒（提示"账户已被禁用，请联系管理员"）。登录也是 B 端追踪"谁在系统里活跃"的入口。

## 范围 (Scope)

### In Scope
- 登录表单：邮箱 + 密码。
- 登录成功：校验通过下发会话令牌，进入个人区（展示昵称/邮箱）。
- 登录失败：明确错误提示（"邮箱或密码错误，请重试"）。
- 账户禁用拦截：`DISABLED` 账户拒绝登录（"账户已被禁用，请联系管理员"）。
- 订单归属：**登录后新下单 `Order.userId` 为当前登录用户**；「我的订单」按登录用户查询，**仅返回本人订单**（新订单不再以 `user_dev` 作为归属）。

### Out of Scope
- 第三方 OAuth 登录。
- 密码找回 / 重置。
- 记住密码 / 免密登录。
- **存量 `user_dev` 订单的归属迁移**（存量订单保留并视为无归属，不显示在任何用户「我的订单」中；详见 idea 存量数据处置决策）。

## 原型参考 (Prototype Reference)

> ⚠️ UI 门禁：本 Story 涉及前端登录表单 UI，原型尚未生成（`req-prototype` 未产出），故「交接状态」不勾选待开发交接。原型经用户 HITL 确认后补充链接。

- 原型链接：`stories/account-system-02-login/prototypes/account-login.html`（待 `req-prototype` 生成并经用户 HITL 确认后链接）
- 关键交互点：登录表单（邮箱/密码）、错误态（账号密码错误 / 账户禁用）、登录成功跳转个人区、顶部用户区显示昵称。
- UI 约束（`docs/FRONTEND.md`）：无圆角、无阴影、slate 色系、真实数据、全中文。

## 业务规则 (Business Rules)

| 规则ID | 规则描述 | 触发条件 | 期望结果 | 备注 |
| --- | --- | --- | --- | --- |
| R-LOGIN-001 | 登录凭邮箱+密码 | 提交登录表单 | 校验通过 → 下发会话令牌 | 邮箱+密码匹配 |
| R-LOGIN-002 | 账号或密码错误统一提示 | 邮箱不存在或密码不匹配 | 提示"邮箱或密码错误，请重试" | 不泄露具体字段 |
| R-LOGIN-003 | DISABLED 账户禁止登录 | 账户状态为 `DISABLED` | 拒绝登录，提示"账户已被禁用，请联系管理员" | B 端生命周期控制 |
| R-LOGIN-004 | 登录后新下单归属当前用户 | 登录后提交订单 | 新订单 `Order.userId` = 当前登录用户 id | 新订单真实归属本人，不做存量迁移 |
| R-LOGIN-005 | 我的订单仅返回本人订单 | 登录用户访问「我的订单」 | 仅返回 `Order.userId` = 当前用户 的订单 | 归属隔离、倒序 |
| R-LOGIN-006 | 登录成功下发会话令牌 | 校验通过 | 返回 `token + user` 信息 | 衔接 session story |
| R-LOGIN-007 | 登录后回到原操作 | 登录前从加购/下单引导而来 | 登录成功后返回原操作 | 与未登录拦截（session story）协同 |

## 验收标准 (E2E 用户旅程)

### 旅程 1：已注册用户登录后我的订单仅返回本人订单 (Ref: L1-06 履约与完成 | SB-STAGE-06, SB-CUSTOMER-06, SB-BACKSTAGE-04)
#### 场景：正常登录主流程（新订单归属本人、我的订单仅本人）
- @e2e
- **GIVEN** 买家"张采购"（`buyer@trade-demo.com`）已注册且账户 ACTIVE，登录后新下一笔订单（MacBook Pro 14英寸，actualPaidCents 1299900，该订单 `userId` 为本人）
- **WHEN** 他用邮箱 `buyer@trade-demo.com` 与密码 `trade1234` 登录，并进入「我的订单」
- **THEN** 登录成功后下发会话令牌，「我的订单」仅返回归属本人（`userId` = 当前登录用户）的订单，顶部显示昵称"张采购"

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

## 治理映射对齐 (Governance Mapping)

- **Source of Truth**: docs/baseline/domain_model.html
- **Bounded Context**: `account`（**新增 BC**，认证）；`order`（Order Context：订单 `userId` 真实归属 + 按 userId 查询）；`shared`（`domain-model` 归属语义）。
- **Capability Taxonomy**: `account-management`（**新增**，登录校验）；复用 `order-management`（按 userId 查询我的订单）、`domain-model`。
- **Related Process Nodes**: `L1-06 履约与完成`（我的订单按登录用户查询）、`L1-03 加购与准备`（登录准入前置身份）；登录/认证为新增 L3 环节（基线补充，设计中）。
- **Related Service Blueprint Nodes**: `SB-STAGE-06`（成功回流/我的订单）、`SB-CUSTOMER-06`（我的订单按用户）、`SB-BACKSTAGE-04`（`GET /api/orders?userId=` 按用户查询，归属隔离）；`SB-STAGE-01`、`SB-CUSTOMER-01`（登录入口）、`SB-OPS-06`（禁用账户的 B 端操作来源）；`SB-BACKSTAGE-02`（Session 一致性）。
- **Sync Assessment**: **Yes**（`Order.userId` 真实化——新订单归属本人、我的订单归属隔离，影响 domain_model 与 service_blueprint 的归属语义）。

## 交接状态 (Handoff Status)

<!--
UI 门禁：本 Story 涉及前端 UI（登录表单），原型未生成并经用户 HITL 确认，禁止勾选「待开发交接」。
-->

- [ ] 待开发交接 (openspec-handoff)
- [ ] 已交接 (changeName: <change-name> 记录于 epic/storymap/story-list.json)
