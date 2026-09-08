# frontend-ui Specification (Delta)

> 增量文件：追加于主 specs `openspec/specs/frontend-ui/spec.md`（本 change 对既有能力的增量修改）。治理归属：`bc-shared → cap-ui`（Cross-Context 横切支撑）。技术形态：**决策 B——独立小程序原生工程**（`ecommerce/ecommerce-miniprogram/`，微信开发者工具可打开；仓库无小程序 E2E 基建 → 后端契约 E2E + UI 人工/真机验证降级）。

## ADDED Requirements

### Requirement: 小程序商品发现旅程 UI（首页/搜索/分类/详情/加购）

系统 SHALL 在小程序原生工程提供**商品发现旅程**（story-miniprogram-shopping-browse，移动端极简，ZAPP 暗黑令牌以 WXSS 变量映射，全中文真实数据）：

- **首页**（`pages/index`）：真实在售商品卡片网格（与 Web 同源 `GET /api/products`，仅 active 且非 deleted）；顶部关键词搜索（名称/描述匹配）；「价格↑/↓」排序切换（按 priceCents）；分类 Tabs（全部 / 键鼠外设 / 显示设备 / 桌面收纳 / 音频设备，数据同源 `GET /api/categories`）。
- **详情页**（`pages/detail`）：商品占位图 + 名称 / 描述 / 价格（等价 `font-mono font-bold` primary）/ 库存状态（有货 / 低库存 / 售罄 accent「已售罄」）+ 「加入购物车」（售罄禁用，加购成功 toast + 角标 +1，会话 userId 归属）。
- **数据一致性（R-MB-008）**：小程序消费与 Web 完全同源的后端 API（localhost:3000 开发环境），无独立数据源；商品/价格/库存实时一致。
- **渠道门禁联动（R-MB-007）**：旅程可达依赖渠道启用（6.1 CHANNEL_DISABLED 语义）；UI 不暴露渠道概念。

- **Priority**: P0
- **Rationale**: 买家微信内快捷找货（research 访谈 1 林采购）；后端 100% 复用（访谈 4 周工）；决策 B 独立原生工程（用户裁定）。

#### Scenario: 小程序首页浏览与选品（同源数据）
- @e2e（后端契约）
- **GIVEN** 后端服务 Web 与小程序同源，小程序渠道已启用
- **WHEN** 小程序调用商品列表 / 分类 / 详情 API（wx.request 语义）
- **THEN** 返回与 Web 端完全一致的商品数据（6 商品真实价格/库存；无小程序独立数据源）
- **AND** 搜索 / 排序 / 分类过滤语义与 Web 列表一致（R-MB-001~004）

#### Scenario: 详情加购（会话归属）
- @e2e（后端契约）
- **GIVEN** 买家已微信授权登录（会话 userId）
- **WHEN** 小程序发起加购（商品 + 数量，会话凭证）
- **THEN** 购物车按会话 userId 归属更新（与 Web 同库），售罄商品加购被拒

## Governance Mapping

- **Bounded Context**: Shared / Cross（`bc-shared → cap-ui`，Cross-Context）
- **Capability Taxonomy**: `frontend-ui`（复用既有横切支撑映射，无新增 taxonomy）
- **Process Alignment**: `L1-01` 触达与发现（小程序浏览/搜索/分类/详情）；`L1-02` 评估与决策
- **Service Blueprint**: `SB-STAGE-01`（小程序触点）、`SB-CUSTOMER-01`（首页/详情 UI）、`SB-BACKSTAGE-01`（商品/分类 API 消费）
- **实现版本**: 小程序原生工程（`ecommerce/ecommerce-miniprogram/`，决策 B；后端零改动）

## 原型参考 (Prototype Reference)

- `openspec-requirements/epics/epic-miniprogram-shopping/prototypes/miniprogram-shopping.html`（已确认）：首页 2 列商品卡 + 搜索 + 排序 + 分类 Tabs + 详情页 + 加购反馈。
