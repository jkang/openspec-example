# frontend-ui Specification (Delta)

> 增量文件：追加于主 specs `openspec/specs/frontend-ui/spec.md`（本 change 对既有能力的增量修改）。治理归属：`bc-shared → cap-ui`（Cross-Context 横切支撑）。

## ADDED Requirements

### Requirement: B 端小程序渠道配置视图

系统 SHALL 提供 B 端「小程序渠道」配置视图（对齐原型 `miniprogram-channel-admin.html`，遵循 ZAPP 暗黑令牌 / 无圆角 / 无阴影 / 全中文真实数据）：

- **入口与角色可见性**：B 端后台导航新增「小程序渠道」入口（仅 `role=运营 / 老板` 可见；老板视图标注「纯只读 · 无配置入口」）。
- **配置表单（运营可写）**：AppID / AppSecret / 商户号 / 启用开关；AppSecret 若已配置显示掩码（前 4 + 掩码 + 后 4）+「已配置」标记，运营可点「重新配置」覆盖（保存后仍只显掩码，不读回明文）；商户号输入框带「本期纯配置预留」提示。
- **启用状态展示**：启用 → `border-success text-success`「● 已启用」；停用 → `border-accent text-accent`「○ 已停用」+ 停用警示条（新微信登录将被拒绝 CHANNEL_DISABLED）。
- **保存反馈**：「保存配置」→ 保存成功「✓ 已保存并即时生效」反馈。
- **老板只读态**：老板视图只读展示启用状态与脱敏配置，**不渲染**任何配置输入框与保存按钮。

- **Priority**: P0
- **Rationale**: 「可视即价值」——渠道状态对老板"看得见"（research 访谈 1）；Q4 脱敏与 Q5 停用警示的 UI 落点（原型 `miniprogram-channel-admin.html`）。

#### Scenario: 运营配置并启用渠道（前端交互）
- @e2e
- **GIVEN** 运营（陈晓芸）已登录并进入「小程序渠道」视图
- **WHEN** 运营填写 AppID/AppSecret/商户号并打开启用开关、点击「保存配置」
- **THEN** 页面展示「✓ 已保存并即时生效」与「● 已启用」徽标
- **AND** AppSecret 显示为掩码（前 4 + 掩码 + 后 4），无明文

#### Scenario: 老板只读渠道状态
- @e2e
- **GIVEN** 老板（李老板）已登录并进入「小程序渠道」视图
- **THEN** 展示渠道启用状态与脱敏配置，标题旁「纯只读 · 无配置入口」
- **AND** 页面无 AppID/AppSecret/商户号输入框、无启用开关、无「保存配置」按钮

## Governance Mapping

- **Bounded Context**: Shared / Cross（`domain_model.html` 映射表：`bc-shared → cap-ui`，Cross-Context）
- **Capability Taxonomy**: `frontend-ui`（复用既有横切支撑映射，无新增 taxonomy）
- **Process Alignment**: `L1-01` 触达与发现（渠道触点可用性展示）；`L2-01` 进入结算（登录前置联动）
- **Service Blueprint**: `SB-OPS-*`（B 端渠道配置界面）、`SB-STAGE-01`（小程序触点可用性）
- **实现版本**: Frontend（Vue B 端运营后台）
