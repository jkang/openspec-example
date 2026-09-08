# miniprogram-channel Specification

## Purpose

承载 B 端**小程序渠道配置**能力（Phase 6 Epic 6.1）：AppID / AppSecret（脱敏回显，不读回明文）/ 商户号（纯配置预留，不参与支付）/ 启用状态开关。配置写操作仅 `role=运营`（扩展 R-ADM 权限门禁家族）；`role=老板` 只读监督渠道状态（无配置入口）；配置落盘 `data/channel-config.json` 即时生效；渠道停用后小程序新登录被拒绝（`CHANNEL_DISABLED`）且既有会话不受影响（Q5）；未配置默认停用。治理归属：**新增 `Channel Context`**（ROADMAP Phase 6 Guardrails，新增 taxonomy；`bc-channel → cap-miniprogram-channel` Governs 边待 Epic 归档后 Baseline Sync 落位）。

## Requirements

### Requirement: 小程序渠道配置读写

系统 SHALL 提供 B 端小程序渠道配置 API：

- `GET /api/admin/channel/miniprogram`（读）：返回当前渠道配置（AppID / AppSecret 掩码 / 商户号 / 启用状态），供 B 端渠道配置视图渲染。
- `PUT /api/admin/channel/miniprogram`（写）：保存 AppID / AppSecret / 商户号 / 启用状态。
- **写权限（R-CHN-001/002/003）**：仅 `role=运营` 可写（扩展 R-ADM 门禁家族，复用 `requireRole('运营')` 白名单基建）；`role=老板` 仅可读；`客户 / 客服 / 未登录` 读写均拒绝（401 / 403 FORBIDDEN）。
- **配置字段**：`appid`（字符串）、`appsecretConfigured`（bool，派生自是否已保存 secret）、`mchid`（商户号，**纯配置预留**：不校验资质、不参与支付、不接真实回调，R-CHN-005）、`enabled`（启用状态 bool）。
- **落盘即时生效（R-CHN-006）**：写操作持久化至 `data/channel-config.json`（对齐既有 JSON 文件存储风格）；保存后下一次读 / 登录门禁立即反映新状态。
- **默认停用（R-CHN-009）**：无任何配置记录时渠道默认停用（防止未配置即开放）。

- **Priority**: P0
- **Rationale**: 老板要求渠道"可用可停用、配置收敛运营权限"（research 访谈 1）；渠道配置是 Epic 6.1 依赖链根，wechat-login / order-channel 消费其启用状态。

#### Scenario: 运营配置并启用渠道（主流程）
- @e2e
- **GIVEN** 存在 `role=运营` 登录会话（陈晓芸 user_1001）
- **WHEN** 运营提交 AppID=`wx4a2b8c9d0e1f2345`、AppSecret=`a1b2c3d4e5f60718293a4b5c6d7e8f90`、商户号=`1900001234`、启用=true
- **THEN** 返回 200，配置持久化至 `data/channel-config.json`
- **AND** 响应中 `appsecretConfigured=true`，不含 AppSecret 明文
- **AND** 渠道启用状态生效（新微信登录门禁读取到 enabled=true）

#### Scenario: 权限门禁——老板只读 / 客户客服拒绝
- @api
- **GIVEN** 存在 `role=老板` 登录会话（user_1003）
- **WHEN** 老板调用 `GET /api/admin/channel/miniprogram`
- **THEN** 返回 200（只读可见启用状态与脱敏配置）
- **AND** 老板调用 `PUT /api/admin/channel/miniprogram` 返回 403 FORBIDDEN
- **AND** `role=客户` / `role=客服` / 未登录访问读写接口返回 403 / 401

### Requirement: AppSecret 脱敏回显

系统 SHALL 对 AppSecret 执行**脱敏回显**（写入后不读回明文，R-CHN-004）：读取响应仅返回掩码形式（前 4 位 + 掩码 + 后 4 位）与 `appsecretConfigured=true` 标记；明文仅存在于服务端持久化与当次写入请求中。

- **Priority**: P0
- **Rationale**: appsecret 是微信平台敏感凭证，严禁明文回显（research 访谈 4）；Q4 已确认脱敏方案。

#### Scenario: 脱敏回显不泄露明文
- @api
- **GIVEN** 渠道已配置（AppSecret 已保存）
- **WHEN** 运营再次读取渠道配置 `GET /api/admin/channel/miniprogram`
- **THEN** 响应含 `appsecretConfigured=true` 与掩码字段（前 4 + 掩码 + 后 4）
- **AND** 响应任何字段不包含完整 AppSecret 明文

#### Scenario: 重新配置覆盖
- @api
- **GIVEN** 渠道已配置（存在旧 AppSecret）
- **WHEN** 运营 PUT 提交新 AppSecret（重新配置）
- **THEN** 保存成功，旧密钥不可回读，新密钥生效后仍仅显示掩码（Q4）

### Requirement: 渠道启用状态生命周期（停用拒绝新登录）

系统 SHALL 依据渠道启用状态控制小程序登录能力（R-CHN-007/008，Q5）：

- **停用**：小程序登录入口隐藏 + 新微信登录返回 `CHANNEL_DISABLED` 错误（拒绝进入登录/绑定流程）；**既有会话访问不受影响**（渠道停用不使既有会话失效）。
- **启用**：小程序登录能力恢复（新微信登录可正常发起）。
- 状态来源为渠道配置 `enabled` 字段（落盘即时生效），由 wechat-auth 登录 API 消费；本 Requirement 声明状态语义与门禁契约。

- **Priority**: P0
- **Rationale**: 老板"可关停、防误导"诉求（research 访谈 1）；Q5 已确认停用只拦新流量、既有会话照常（MVP 简化）。

#### Scenario: 停用后新登录被拒绝
- @e2e
- **GIVEN** 渠道配置 `enabled=false`（运营已停用）
- **WHEN** 发起小程序渠道微信登录
- **THEN** 返回 `CHANNEL_DISABLED` 错误（渠道停用）
- **AND** 既有会话访问受保护 API 仍正常（不因渠道停用失效）

#### Scenario: 重新启用后登录恢复
- @api
- **GIVEN** 渠道配置 `enabled=false`
- **WHEN** 运营 PUT 将启用状态改为 true
- **THEN** 保存成功，下一次微信登录不再返回 `CHANNEL_DISABLED`

## Governance Mapping

- **Bounded Context**: **新增 `Channel Context`**（`domain_model.html` 映射表当前无此 BC，需新增 `bc-channel` 节点与 `bc-channel → cap-miniprogram-channel` Governs 边——Epic 归档后 Baseline Sync 时落位）；复用 `Shared / Cross`（frontend-ui 横切支撑）
- **Capability Taxonomy**: **`miniprogram-channel`（新增 taxonomy）**
- **Process Alignment**: `L1-01` 触达与发现（渠道启用状态决定小程序触点可用性）；`L2-01` 进入结算（登录前置：渠道停用阻断新登录入口）；交易节点语义零改动
- **Service Blueprint**: `SB-STAGE-01`（小程序触点可用性控制）、`SB-CUSTOMER-01`（登录入口可用性联动）、`SB-OPS-*`（新增 B 端渠道配置后台活动节点，落位 Sync 时确认）、`SB-BACKSTAGE-*`（渠道配置数据存储后台支撑活动）
- **实现版本**: Node.js（后端权威实现，Python 不对齐）；Frontend（Vue B 端渠道配置视图）
