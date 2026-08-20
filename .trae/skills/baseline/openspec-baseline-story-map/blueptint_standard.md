# Service Blueprint Standard

本文档定义 `docs/baseline/service_blueprint.html` 的治理口径、引用方式与回流规则。所有涉及 Service Blueprint 的 Skill、Command、Schema 与 Sync 流程，必须以本文件为准。

## 1. 角色定位

`service_blueprint.html` 不是普通的 Story Map，而是业务基线中的服务蓝图视图，用于把以下三个层次放到同一张图里：

- 买家视角的端到端旅程
- 运营视角的支撑活动
- 后台系统的核心活动与 capability 编排

它回答三个治理问题：

- 当前变更落在哪个旅程阶段
- 该阶段由哪些 capability 支撑
- 本次 change 是否改变了蓝图中的阶段、泳道、能力分布或状态

## 2. 唯一事实来源

Service Blueprint 的生成与回写，必须联合参考以下输入：

- `docs/baseline/service_blueprint.html`
- `docs/baseline/domain_model.html`
- `docs/baseline/business_process.html`
- change 下的 `ideas/idea.md`
- change 下的 `proposal.md`
- change 下的 `story.md`（若存在）
- change 下的 `specs/**/*.md`
- change 下的 `design.md`
- change 下的 `verify.md`

其中：

- `domain_model.html` 决定 capability taxonomy 与治理归属
- `business_process.html` 决定 L1/L2/L3 流程语义
- `service_blueprint.html` 决定阶段、泳道、能力分布与“已落地/规划中/横切支撑”的可视化表达

## 3. 标准引用方式

后续 planning artifacts 在引用 Service Blueprint 时，必须使用稳定锚点，而不是只写自然语言描述。

### 3.1 Stage 引用

- `SB-STAGE-01` 触达与发现
- `SB-STAGE-02` 选购与加购
- `SB-STAGE-03` 结算确认
- `SB-STAGE-04` 提交订单
- `SB-STAGE-05` 模拟支付
- `SB-STAGE-06` 成功回流

### 3.2 Lane 引用

- `SB-LANE-CUSTOMER` 客户视角 E2E 流程
- `SB-LANE-OPS` 电商运营层
- `SB-LANE-BACKSTAGE` 后台核心活动

### 3.3 Cell 引用

每个泳道与阶段交叉点都必须使用稳定节点 ID：

- `SB-CUSTOMER-01` ... `SB-CUSTOMER-06`
- `SB-OPS-01` ... `SB-OPS-06`
- `SB-BACKSTAGE-01` ... `SB-BACKSTAGE-06`

planning artifacts 引用时推荐写法：

- `Service Blueprint Alignment: SB-STAGE-03, SB-CUSTOMER-03, SB-BACKSTAGE-03`

## 4. Capability 约束

Service Blueprint 中出现的 capability 必须遵循以下规则：

- 优先复用 `domain_model.html` 中既有 taxonomy 名称
- 若出现未映射 capability，必须在 `proposal.md` 中标注为“新增 taxonomy”
- capability 的治理归属必须与 `domain_model.html` 一致
- 不允许在蓝图中发明与 proposal/specs 不一致的 capability 命名

状态口径：

- `已落地`：已有主 specs 或已验证实现证据
- `规划中`：治理上已识别，但尚未形成当前主规格或实现闭环
- `横切支撑`：跨多个阶段复用的共性能力

## 5. Planning 阶段引用要求

### 5.1 Explore / idea.md

必须识别：

- 受影响的 `SB-STAGE-*`
- 受影响的 `SB-<LANE>-*`
- 是否可能触发 Service Blueprint Sync

### 5.2 Proposal / proposal.md

必须包含 `Service Blueprint Alignment` 章节，说明：

- 本次 change 主要影响哪些阶段
- 影响哪些泳道节点
- 是新增、修改还是仅复用现有 capability 布局

### 5.3 Story / story.md

E2E 旅程必须同时映射：

- `business_process.html` 中的 L1/L2 节点
- `service_blueprint.html` 中的 `SB-STAGE-*` 与 `SB-CUSTOMER-*`

### 5.4 Specs / specs/**/*.md

每个 capability spec 必须记录：

- 关联的 `SB-STAGE-*`
- 关联的 `SB-<LANE>-*`

如果某个 capability 只改变后台规则但不改变买家旅程，也必须至少引用对应 `SB-BACKSTAGE-*`。

### 5.5 Design / design.md

必须包含 `Service Blueprint Sync Assessment`，明确：

- `Needs Sync: Yes / No`
- `Trigger Type`
- `Evidence Source`
- `Planned Baseline Update`

## 6. Sync 触发规则

`/opsx:sync` 在回流 `service_blueprint.html` 前，必须先判断是否命中以下任一触发项：

- 变更新增、移除或重排了 `SB-STAGE-*` 中的旅程覆盖
- 变更新增、移除或重排了某个 `SB-<LANE>-*` 节点中的 capability
- capability 的状态从“规划中”变为“已落地”，或反向变化
- 新增了跨阶段支撑能力，或横切能力职责发生变化
- `story.md` 新增/修改了需要体现到蓝图的 E2E 旅程阶段映射
- `proposal.md` 或 `specs/**/*.md` 引入了新的 blueprint 引用节点
- `design.md` 的 `Service Blueprint Sync Assessment` 明确写为 `Needs Sync: Yes`

## 7. 显式 No-op 规则

若本次 change 不命中 Service Blueprint Sync 触发项，`/opsx:sync` 必须在结果中明确记录：

- `无需更新 service_blueprint.html`
- 本次未触发的原因
- 已检查的依据文件

禁止静默跳过。

## 8. 更新方式

更新 `service_blueprint.html` 时必须：

- 优先直接修改 HTML 中的稳定结构与 capability 节点
- 保持既有阶段顺序与泳道顺序稳定
- 保持 capability taxonomy 与 `domain_model.html` 一致
- 更新 `Baseline / Last Updated` 日期
- 不得只改可视化文本而不改对应 capability 分布

## 9. 最小模板

后续生成或重构 service blueprint 时，至少保证以下结构稳定存在：

- Header / Purpose / Legend / Scope Summary
- 6 个 `SB-STAGE-*`
- 3 个 `SB-LANE-*`
- 18 个 `SB-<LANE>-<NN>` 交叉节点
- Cross-stage support section
- Capability mapping table
- capability 过滤交互

## 10. Cross-Tool Consistency

任何对 Service Blueprint 工作流规则的修改，必须同步更新以下目录中的相关 Skill/Command：

- `.trae/`
- `.cursor/`
- `.agents/`

严禁只改其中一个入口。
