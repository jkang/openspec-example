---
name: Product Roadmap
purpose: 定义项目当前阶段目标、已完成能力及未来滚动规划
updated_at: 2026-08-23
---

# 产品路线图 (Product Roadmap)

本文档定义了 OpenSpec-Practice 极简电商系统的高阶业务规划。
AI Agent 在执行 `/opsx:explore`（需求探索）阶段时，**必须首先查阅此文档**，确保新构思的需求符合当前所处的业务阶段。

---

## 📅 当前状态与滚动计划 (Rolling Plan)
最后刷新时间: 2026-08-23

### 🏆 当前 Baseline (已完成能力)
- **核心交易链路**: 实现了从商品浏览、购物车到模拟下单的完整 C 端流程。
- **内存存储系统**: 建立了基于内存的仓储层，支持业务逻辑的快速迭代验证。
- **SDD 工作流**: 建立了基于 OpenSpec 的规格驱动开发流程，支持 Epic/Story/Bug Fix/Tech Debt 的闭环管理。
- **B 端运营后台**: 商品管理完整 CRUD（增删改查 + 软删除）、商品分类管理（分类 CRUD + 商品挂分类 + C 端分类筛选）。
- **营销工具**: 优惠券系统闭环（B 端规则配置 + 单人发放 + C 端最优券结算核销）。
- **持久化与真实数据**: JSON 文件持久化（products/categories/coupons/orders/carts），真实商品与分类数据落地。

### 📍 当前阶段 (Current Phase): Phase 2 - 运营闭环与营销增强 ✅ 已完成
- **目标**: 建设 B 端（管理后台）配置能力，引入基础营销工具，实现业务逻辑持久化。
- **In Scope**: 优惠券系统闭环 ✅、商品分类管理 ✅、文件/数据库持久化 ✅。
- **Out of Scope**: 支付网关集成、多级分销、复杂推荐算法。
- **Exit Criteria**: ① 优惠券核销链路 E2E 100% 通过 ✅（6 scenarios / 25 steps 全绿）；② 商品管理后台支持增删改查 ✅。
- **阶段状态**: 全部 In Scope 与 Exit Criteria 已达成，Phase 2 完成，进入 Phase 3 规划。

---

## 🛣️ 滚动规划 (Future Plan)

### 🚀 未来 +1 个月 (2026-09): 订单生命周期与支付 (Phase 3)
- **目标**: 处理资金流并追踪货物状态，从“模拟系统”向“生产系统”跨越。
- **范围**: 接入 Stripe 模拟环境、订单状态机（待支付->已发货->已完成）、B 端发货管理。
- **代表性 Epic**: `epic-payment-integration`, `epic-order-lifecycle`.

### 🚀 未来 +2 个月 (2026-10): 用户账户与 CRM (Phase 4)
- **目标**: 沉淀用户资产，提供个性化服务与忠诚度管理。
- **范围**: JWT 身份认证、多地址管理、基础积分系统。
- **代表性 Epic**: `epic-auth-system`, `epic-crm-basics`.

### 🚀 未来 +X 个月 (远期规划): 数据洞察与效率工具
- **目标**: 帮助企业通过数据优化经营决策。
- **范围**: 销售报表看板、自动补货建议、库存预警通知。
- **代表性 Epic**: `epic-data-dashboard`.
