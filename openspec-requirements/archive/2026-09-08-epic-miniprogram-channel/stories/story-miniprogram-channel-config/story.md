# Story: 小程序渠道配置（B 端）

<!--
Story 是需求侧唯一冻结交付物（业务面）。
开发侧通过 /req:handoff（skill: handoff）以本 Story 为输入，在 openspec/changes/<name>/ 合成 proposal.md，
随后在开发侧按 capability 拆分生成行为规格 specs（Story-specs）。
需求侧不生成 specs/，行为规格一律由开发侧在 proposal 之后产出。
-->

> Story Key: `story-miniprogram-channel-config` | 优先级: P0 | 依赖: 无（Epic 6.1 依赖根，为 wechat-login / order-channel 提供渠道底座）
> 关联 Storymap: `epics/epic-miniprogram-channel/storymap.md`
> 关联 Idea: `epics/epic-miniprogram-channel/idea.md`
> 关联原型（Epic 整体）: `epics/epic-miniprogram-channel/prototypes/miniprogram-channel-admin.html`（已 HITL 确认）

## 用户场景 (User Scenario)

- **目标用户（B 端）**：运营（渠道配置负责人，陈晓芸）、老板（只读监督渠道状态，李老板）。
- **使用动机**：把"生意搬进微信"的第一步——小程序渠道必须先"立起来、可看见、能停用"。老板要确认渠道真实可用才让客户使用（避免资质未办成误导下单），运营要能安全录入微信凭证（appsecret 敏感）并随时关停渠道。
- **关键目标**：运营在 B 端后台完成小程序渠道配置（appid / appsecret / 商户号 / 启用状态）；配置落盘即时生效；渠道停用后小程序登录入口不可用（新微信登录被拒绝）；老板只读查看渠道启用状态。
- **B 端视角**：
  - 后台怎么配置？——「小程序渠道」配置页：AppID、AppSecret、商户号（mchid）、启用开关；仅 `role=运营` 可写；低频写操作。
  - 生命周期如何？—— 配置落盘（`data/channel-config.json`）即时生效；启用状态控制小程序登录入口可用性；停用后新微信登录拒绝（CHANNEL_DISABLED）、既有会话照常（Q5）。
  - 谁有权限？—— 配置写权限仅 `role=运营`（扩展 R-ADM 权限门禁家族）；`role=老板` 只读查看启用状态（无配置入口）。

## 范围 (Scope)

### In Scope
- B 端小程序渠道配置 API（读 + 写）：AppID / AppSecret（**脱敏回显**：写入后仅显示掩码 + 「已配置」标记，不读回明文，支持重新配置覆盖，Q4）/ 商户号 mchid（**纯配置预留**：不校验资质、不参与支付、不接真实回调，Q3）/ 启用状态（bool）。
- 配置写操作**仅 `role=运营`**（扩展 R-ADM 门禁家族，白名单 `requireRole('运营')`）；老板只读查看渠道启用状态。
- 配置持久化落盘 `data/channel-config.json`（对齐既有 JSON 文件存储风格），保存**即时生效**。
- **启用状态生命周期（Q5）**：渠道停用 → 小程序登录入口隐藏 + 新微信登录拒绝（`CHANNEL_DISABLED`）；**既有会话访问不受影响**。
- B 端「小程序渠道」配置视图（frontend-ui 修改，对齐原型 `miniprogram-channel-admin.html`：运营可写表单 + 老板只读态 + 启用开关 + 脱敏掩码交互）。
- mock 网关依赖准备：本 Story 交付配置读写；微信网关 mock（code2session）由 story-miniprogram-wechat-login 承载（Q6），本 Story 不引入。

### Out of Scope
- 微信授权登录 / 手机号绑定（story-miniprogram-wechat-login）。
- 订单渠道标识（story-miniprogram-order-channel）。
- 真实微信支付接入（商户资质/证书/回调，交付后 +X 评估；商户号仅字段预留）。
- 多小程序/多商户支持（单企业私有部署，单渠道配置）。
- unionid / 开放平台绑定（Q10：MVP 不引入）。
- C 端任何购物旅程（Epic 6.2）。

## 原型参考 (Prototype Reference)

- 原型链接：`epics/epic-miniprogram-channel/prototypes/miniprogram-channel-admin.html`
- 关键交互点：
  - 「小程序渠道」导航视图（左侧导航 + 主区配置表单）。
  - AppID 输入框；AppSecret「已配置 → 掩码显示（前 4 + 掩码 + 后 4）」，运营可点「重新配置」覆盖（保存后仍只显掩码）；商户号输入框（含"本期纯配置预留"提示）。
  - 启用开关：开启 → `bg-success` 绿色「● 已启用」徽标；关闭 → `bg-accent` 红色「○ 已停用」徽标 + 停用警示条（新微信登录将被拒绝）。
  - 角色切换：运营 · 陈晓芸（可写）/ 老板 · 李老板（只读，标题旁「纯只读 · 无配置入口」）。
  - 「保存配置」按钮 → 保存成功「✓ 已保存并即时生效」反馈。

## 业务规则 (Business Rules)

| 规则ID | 规则描述 | 触发条件 | 期望结果 | 备注 |
| --- | --- | --- | --- | --- |
| R-CHN-001 | B 端小程序渠道配置仅 `role=运营` 可写 | 运营调用渠道配置写 API | 允许读写配置；返回脱敏后的配置 | 扩展 R-ADM 门禁家族（requireRole('运营') 白名单） |
| R-CHN-002 | 老板仅可**只读**查看渠道启用状态 | 老板调用渠道配置读 API | 返回启用状态与脱敏配置；写操作返回 403 | 对齐老板"看得见、可关停"监督诉求（关停由运营执行） |
| R-CHN-003 | 客户/客服/未登录无权访问渠道配置 | 客户/客服/未登录调用渠道配置 API | 返回 403（未登录 401） | 渠道配置属敏感 B 端写操作 |
| R-CHN-004 | AppSecret **脱敏回显**：写入后不读回明文 | 读取渠道配置 / 配置页加载 | 仅返回掩码（前 4 + 掩码 + 后 4）+ `configured=true` 标记 | Q4；重新配置覆盖后仍只显掩码 |
| R-CHN-005 | 商户号（mchid）为**纯配置预留** | 保存渠道配置 | 允许为空或填任意字符串，不校验资质、不参与支付 | Q3；真实支付资质后置 +X |
| R-CHN-006 | 配置落盘 `data/channel-config.json`，**保存即时生效** | 运营保存渠道配置 | 写文件成功，下一次读/登录门禁立即反映新状态 | 对齐既有 JSON 文件存储风格 |
| R-CHN-007 | 渠道**停用**后：小程序登录入口隐藏 + 新微信登录拒绝（`CHANNEL_DISABLED`） | 运营关闭启用开关并保存 | 登录 API 对小程序渠道新登录返回渠道停用错误；**既有会话访问照常** | Q5 |
| R-CHN-008 | 渠道**启用**后：小程序登录能力恢复 | 运营打开启用开关并保存 | 新微信登录可正常发起 | Q5 |
| R-CHN-009 | 未配置过渠道时默认**停用**状态 | 首次部署 / 无配置记录 | 渠道默认停用，小程序登录默认拒绝 | 防止未配置即开放（对齐老板"可关停/防误导"） |

## 验收标准 (E2E 用户旅程)

### 旅程 1：运营配置并启用小程序渠道 (Ref: L1-01 | SB-STAGE-01, SB-CUSTOMER-01, SB-OPS)
#### 场景：正常主流程——运营保存渠道配置并启用
- @e2e
- **GIVEN** 存在 `role=运营` 登录会话（陈晓芸，user_1001），已进入「小程序渠道」配置页
- **WHEN** 运营填写 AppID=`wx4a2b8c9d0e1f2345`、AppSecret=`a1b2c3d4e5f60718293a4b5c6d7e8f90`、商户号=`1900001234`，打开启用开关并保存
- **THEN** 系统返回 200，配置落盘 `data/channel-config.json`
- **AND** 页面显示「✓ 已保存并即时生效」与「● 已启用」徽标
- **AND** AppSecret 回显为掩码（前 4 位 + 掩码 + 后 4 位），不显示明文

#### 场景：AppSecret 脱敏——重新读取不返回明文
- @api
- **GIVEN** 渠道已配置（AppSecret 已保存）
- **WHEN** 运营再次读取渠道配置（GET）
- **THEN** 返回 AppID/启用状态/商户号与 `appsecretConfigured=true`
- **AND** 响应不含 AppSecret 明文（仅掩码字段）

#### 场景：商户号为纯预留——不校验资质
- @api
- **GIVEN** 运营登录会话
- **WHEN** 运营保存商户号=``（空）或任意测试字符串
- **THEN** 保存成功（200），无资质/格式校验报错（Q3 纯预留语义）

### 旅程 2：权限门禁——老板只读 / 客户客服拒绝 (Ref: L1-01 | SB-STAGE-01, SB-OPS)
#### 场景：老板只读查看渠道启用状态
- @e2e
- **GIVEN** 存在 `role=老板` 登录会话（李老板，user_1003）
- **WHEN** 老板进入「小程序渠道」
- **THEN** 可查看渠道启用状态与脱敏配置，页面无任何配置入口（标题旁「纯只读 · 无配置入口」）

#### 场景：老板写渠道配置被拒
- @api
- **GIVEN** 存在 `role=老板` 登录会话
- **WHEN** 老板调用渠道配置写 API（PUT）
- **THEN** 返回 403（错误码 FORBIDDEN），配置文件不发生任何变更

#### 场景：客户/客服/未登录访问被拒
- @api
- **GIVEN** 存在 `role=客户` / `role=客服` 会话，或未登录请求
- **WHEN** 访问渠道配置 API（读或写）
- **THEN** 返回 401（未登录）或 403（客户/客服），不泄露任何配置内容

### 旅程 3：渠道启用状态生命周期 (Ref: L1-01 | SB-STAGE-01)
#### 场景：停用渠道——登录入口关闭（Q5）
- @e2e
- **GIVEN** 渠道处于启用状态，存在运营登录会话
- **WHEN** 运营关闭启用开关并保存
- **THEN** 配置显示「○ 已停用」+ 停用警示条
- **AND** 小程序端登录入口隐藏；携带小程序渠道发起新微信登录返回 `CHANNEL_DISABLED` 拒绝
- **AND** 既有会话访问受保护 API 仍正常（不因渠道停用失效）

#### 场景：重新启用渠道——登录恢复（Q5）
- @api
- **GIVEN** 渠道处于停用状态
- **WHEN** 运营打开启用开关并保存
- **THEN** 小程序登录能力恢复，新微信登录可正常发起

#### 场景：未配置默认停用（R-CHN-009）
- @api
- **GIVEN** 系统无任何渠道配置记录（首次部署/重置后）
- **WHEN** 发起小程序渠道新微信登录
- **THEN** 返回 `CHANNEL_DISABLED`（默认停用），防止未配置即开放

## 治理映射对齐 (Governance Mapping)

- Source of Truth: docs/baseline/domain_model.html
- Bounded Context: **新增 `Channel Context`**（`bc-channel` 节点，B 端渠道配置边界，ROADMAP Phase 6 Guardrails 明确新增）；复用 `Shared / Cross`（frontend-ui 横切支撑）
- Capability Taxonomy: **`miniprogram-channel`（新增 taxonomy）**——`bc-channel → cap-miniprogram-channel` Governs 边（Baseline Sync 时落位 domain_model）；`frontend-ui`（**修改**，bc-shared → cap-ui：小程序渠道配置视图）
- Related Process Nodes: L1-01 触达与发现（渠道启用状态决定小程序触点的可用性）；L2-01 进入结算 / 登录前置（渠道停用阻断新登录入口）；本 Story 不改变交易节点语义
- Related Service Blueprint Nodes: SB-STAGE-01（小程序触点可用性由渠道状态控制）；SB-CUSTOMER-01（微信登录入口可用性联动）；SB-OPS-*（B 端渠道配置后台活动，新增落位 **Baseline Sync 时确认**，参照 account-system SB-BACKSTAGE-07 先例）；SB-BACKSTAGE-*（渠道配置存储为后台支撑活动）
- Sync Assessment: **Yes** — 新增 `Channel Context` BC + `miniprogram-channel` capability taxonomy 与蓝图后台活动（Epic 级变化）；按分层 Sync 机制在 Epic 全部 Story 归档后统一执行 Baseline Sync（本阶段仅预判不执行）

## 分析制品索引 (Analysis Artifacts)

- 故事详述: `epics/epic-miniprogram-channel/analysis/narrative/story-miniprogram-channel-config/narrative.md` — ❌ 未生成（业务规则与 E2E 验收已完整，不额外生成，对齐既有 Story 先例）

## 交接状态 (Handoff Status)

- [x] 待开发交接 (openspec-handoff)
- [x] 已交接 (changeName: `story-miniprogram-channel-config` 记录于 openspec/epic-miniprogram-channel.story-list.json)
