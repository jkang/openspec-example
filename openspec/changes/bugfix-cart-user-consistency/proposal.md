## Why

当前电商系统存在核心交易链路的可靠性缺陷：前端购物车与后端状态在网络失败或手动操作时容易发生漂移，且 Node 后端购物车接口硬编码了 `user_dev`，导致无法支持多用户隔离。修复这些 Bug 是确保 Phase 2 营销功能（如最优券推荐）准确性的前提。

## What Changes

- **前端同步增强**：修改 `App.vue` 中的 `addToCart` 和 `removeFromCart` 逻辑，确保它们严格同步后端状态，禁止在接口失败时模拟本地成功。
- **Node 后端契约修正**：修改 Node 端的 `/api/cart/items` 接口，使其从请求体中读取 `userId`，并正确传递给 `CartService`。
- **集成测试补全**：增加针对 Node 后端的多用户隔离验证测试，确保其语义与 Python 版本一致。

## Capabilities

### New Capabilities
- 无

### Modified Capabilities
- `cart-management`: 修正加购接口对 `userId` 的处理契约，并增加服务端驱动的同步要求。
- `order-management`: 确保结算逻辑依赖的购物车数据是经过同步确认的最新版本。

## Impact

- **Frontend**: `App.vue` 的 `cart` 状态更新逻辑。
- **Node Backend**: `src/http/server.js` 中的路由处理。
- **Integration Tests**: `__tests__/integration.spec.js` 增加多用户测试场景。
- **Contract**: 前后端关于 `userId` 和购物车同步的交互契约。
