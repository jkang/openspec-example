# UI 验证闭环 SOP (UI Validation Loop)

本 SOP 规范了 AI Agent 在进行前端开发或修改时，必须遵循的视觉与交互验证流程。
单纯的单元测试无法保障视觉约束，必须通过浏览器验证。

## 适用场景
- 新增 Vue 组件
- 修改 CSS 样式
- 调整页面布局或交互链路

## 验证步骤

### 第一步：启动前端服务
使用 `init.sh` 脚本启动 Vite 服务器，并确保没有报错。
```bash
./init.sh vue:start
```

### 第二步：获取页面快照 (Snapshot)
Agent 必须使用相关的 Browser MCP 工具（如 `browser_navigate`, `browser_snapshot`，或通过 OpenPreview 工具）访问 `http://localhost:5173`。

### 第三步：核对视觉与数据约束 (Check Constraints)
对照 `FRONTEND.md` 进行审查：
1. **圆角与阴影检查**: 检查 DOM 树或计算样式中是否存在 `border-radius` (应为 0) 或 `box-shadow`。
2. **色系检查**: 确认主色调是否为 `slate` 家族，边框是否为 1px 实线。
3. **真实数据检查**: 页面上是否存在 `foo`, `bar`, `test` 等无意义的占位符？如果有，必须修改源码填充真实业务数据。
4. **单屏布局**: 检查是否存在破坏单屏体验的无节制纵向滚动，或不当的卡片堆叠。

### 第四步：交互验证 (Interaction Test)
使用 Browser MCP 的点击 (`browser_click`) 和输入 (`browser_type`) 功能，模拟目标用户画像（核心买家）完成一次核心链路操作。

### 第五步：修复与人类确认 (Fix & HITL)
- 如果发现任何偏离，Agent 必须立即修改代码并回到第二步重新验证。
- 验证通过后，将最终的渲染结果或截图反馈给用户，请求人类确认。
