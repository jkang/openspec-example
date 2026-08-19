# Idea: Cart Consistency and User Isolation Fixes

## 1. 澄清业务意图
修复两个影响系统可靠性的关键缺陷：
- **前端购物车状态漂移**：前端 `App.vue` 在加购/删减商品时存在本地状态与后端状态不同步的问题（特别是接口失败或手动删除时）。
- **Node 后端用户隔离失效**：Node 后端 `/api/cart/items` 接口硬编码了 `user_dev`，忽略了请求中的 `userId`，导致无法支持多用户购物车。

## 2. Roadmap Alignment
- **状态**：对齐 Baseline 稳定性要求。
- **说明**：在 Phase 2 引入更多营销工具前，必须确保核心交易链路（购物车与用户维度）的准确性。这为后续 Phase 4 的 JWT 认证打下基础。

## 3. 业务设计思路
- **以服务端为准**：前端不再尝试“模拟”加购成功，而是等待服务端返回最新的购物车明细。
- **显式同步**：`removeFromCart` 也需要调用后端接口（需新增或完善接口语义）。
- **契约对齐**：Node 后端必须像 Python 版本一样，从请求体中提取 `userId` 并使用它来定位 `CartRepo` 中的数据。

## 4. 任务类型与后续策略
- **任务类型**：Bug Fix
- **策略**：
    - 跳过原型 (Prototype) 阶段（仅逻辑修正）。
    - 更新 `specs/cart-management` 和 `specs/order-management` 以反映正确的 `userId` 契约。
    - 在 `design.md` 中记录修复方案。
    - 在 `tasks.md` 中包含多用户集成验证任务。

## 5. 需求拆分建议
- 第一步：修复 Node 后端接口，使其支持 `userId` 传参。
- 第二步：重构前端购物车逻辑，实现服务端驱动同步。

## 6. 架构影响分析
- **Repository 层**：Node 的 `CartRepo` 已经支持 `userId`（Map 结构），主要是 HTTP 层未透传。
- **前端状态管理**：`cart.value` 的更新逻辑需要从本地计算改为 API 响应回填。

## 7. 确认结论
用户已确认按 Bug 处理，并走 OpenSpec 变更流程。
