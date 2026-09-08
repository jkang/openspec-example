# frontend-ui Specification (Delta)

> 增量文件：追加于主 specs `openspec/specs/frontend-ui/spec.md`（本 change 对既有能力的增量修改）。治理归属：`bc-shared → cap-ui`（Cross-Context 横切支撑）。

## ADDED Requirements

### Requirement: 小程序登录入口 UI（微信授权登录）

系统 SHALL 提供小程序登录入口 UI（对齐原型 `miniprogram-wechat-login.html`，Q8：Epic 6.1 含小程序登录入口 UI；ZAPP 极简约束 / 全中文 / 真实数据）：

- **微信一键登录**：小程序首页提供「微信一键登录」（wx.login() 授权动作），openid 命中老客户 → 展示登录成功态与「我的订单 · 历史延续」（同源账户）；渠道停用时入口隐藏 / 展示「渠道已停用」提示。
- **手机号绑定页**：openid 未命中 → 引导绑定手机号（微信手机号快捷绑定 或 手动输入）；新手机号绑定成功自动登录。
- **撞号引导（Q2）**：绑定手机号已注册 → 提示「该手机号已注册：请登录既有账号完成微信绑定」，引导输入既有账号（手机号+密码）登录并完成绑定。
- **登录成功态**：展示用户标识（昵称/手机号）+ 历史订单延续提示。

- **Priority**: P0
- **Rationale**: 「可视即价值」——授权即登录、少填表是买家核心诉求（research 访谈 3）；Q8 已确认小程序登录入口 UI 属本 Epic 交付（6.2 承载完整购物旅程）。

#### Scenario: 微信授权登录成功（老客户历史订单延续）
- @e2e
- **GIVEN** 小程序渠道已启用，openid=openid_demo_001 已绑定用户 林晓明（user_1002，有历史订单）
- **WHEN** 买家在小程序点击「微信一键登录」（code=mock code_demo_001）
- **THEN** 展示登录成功态（林晓明 + 历史订单可见，同源账户未丢失）

#### Scenario: 撞号引导登录既有账号
- @e2e
- **GIVEN** openid=openid_demo_003 未绑定，绑定手机号 13888217536 已注册（林晓明）
- **WHEN** 买家尝试绑定该手机号
- **THEN** 提示「该手机号已注册：请登录既有账号完成微信绑定」
- **AND** 输入既有账号（13888217536 + 密码）校验通过后完成绑定并自动登录（Q2，不合并账户）

## Governance Mapping

- **Bounded Context**: Shared / Cross（`domain_model.html` 映射表：`bc-shared → cap-ui`，Cross-Context）
- **Capability Taxonomy**: `frontend-ui`（复用既有横切支撑映射，无新增 taxonomy）
- **Process Alignment**: `L1-01` 触达与发现（小程序登录触点）；`L2-01` 进入结算（身份前置：登录/绑定引导）
- **Service Blueprint**: `SB-STAGE-01`（小程序登录入口触点）、`SB-CUSTOMER-01`（微信授权登录/绑定 UI）
- **实现版本**: Frontend（小程序登录 UI，技术栈未锁定；Q8 以可交互原型 + 登录 API 打通交付）
