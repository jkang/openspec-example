# BDD (Cucumber) 自动化 E2E 测试集成方案设计

## 1. 为什么引入 Cucumber？(Why BDD?)

在目前的 SDD (规格驱动开发) 流程中，我们虽然在 `openspec/specs/` 中编写了大量采用 Given/When/Then (Gherkin 格式) 的业务规格，但在 `/opsx:apply` 阶段，AI 往往只是“看着”这些文档写代码，最终的验收（特别是在 `/opsx:archive` 之前）严重依赖于人工通过浏览器或接口进行测试。这导致了回归 Bug 的产生和归档前的阵痛。

**核心痛点解决**：
引入 Cucumber，能够直接将 `openspec/specs/` 下的 `.md` 规范（内嵌的 Gherkin 场景）转化为**可执行的测试用例**。这完美契合了 SDD 的“代码即规范”理念，实现了真正的**活文档 (Living Documentation)**。

---

## 2. 架构与选型设计 (Architecture & Tech Stack)

### 2.1 测试框架选型
- **测试执行器**: `@cucumber/cucumber` (Node.js 生态)。
- **断言库**: 内置 `assert` 或 `chai`。
- **浏览器驱动 (E2E UI 测试)**: `Playwright` (支持 Vue 3 前端的跨浏览器交互测试)。
- **接口测试驱动 (API 测试)**: `axios` 或 原生 `fetch` (用于直接绕过 UI 测试 Node.js/Python 后端 API)。

### 2.2 独立测试模块 (Independent Test Module)
为了不污染现有的 `ecommerce-mini` (Node) 和 `ecommerce-mini-python` 目录，建议建立一个**全局级别的独立 E2E 测试目录**。因为真正的 E2E 测试是跨越前后端的，它应该把整个电商系统视为一个“黑盒”。

**目录结构设计**:
```text
OpenSpec-practice/
├── ecommerce/                # 业务代码 (Node, Python, Vue)
├── openspec/
│   └── specs/                # 现有的业务规格 (包含 Gherkin 场景)
├── e2e-tests/                # 新增：全局 BDD 测试工程
│   ├── package.json          # Cucumber & Playwright 依赖
│   ├── cucumber.js           # Cucumber 配置文件
│   ├── features/             # 存放被抽取出来的 .feature 文件
│   ├── steps/                # 步骤定义 (Step Definitions)
│   │   ├── ui_steps.js       # Playwright 驱动的前端步骤
│   │   └── api_steps.js      # 直接调用后端的 API 步骤
│   └── support/              # 钩子 (Hooks，如启动浏览器、清空数据库等)
```

---

## 3. 测试金字塔与 SDD 分层策略 (Testing Pyramid Strategy)

如果将 `spec.md` 中的所有 Gherkin 场景都通过 Cucumber + Playwright 转化为 E2E 测试，会导致极高的维护成本和缓慢的执行速度（即“冰淇淋蛋卷”反模式）。
在 SDD 流程中，必须对场景进行**分层映射**。AI Agent 在生成 `tasks.md` 时，需根据场景特性决定其自动化测试的归属：

### 3.1 单元测试层 (Unit Tests - 占比 70%)
- **适用场景**: 纯领域逻辑、复杂的业务规则排列组合、边界条件和异常处理。
- **Gherkin 特征**: 关注计算结果和状态机流转。例如：“Given 购物车有商品A且满减券(满100减20)可用, When 计算购物车总价, Then 最终价格应为80”。
- **执行载体**: 后端原生的 `node:test` 或 `pytest`。直接实例化 Domain 模型或调用 Service 层，极速运行，无需启动 HTTP 服务器。
- **Spec 标记**: `@unit`

### 3.2 接口/集成测试层 (API/Integration Tests - 占比 20%)
- **适用场景**: 路由鉴权、请求参数校验、数据持久化 (Repository) 集成。
- **Gherkin 特征**: 关注系统边界和 HTTP 协议。例如：“Given 缺少有效 JWT 令牌, When 发起 POST /api/orders, Then 系统返回 401 Unauthorized”。
- **执行载体**: 后端测试框架的 HTTP 客户端（如 Python 的 `TestClient`）。
- **Spec 标记**: `@api`

### 3.3 端到端测试层 (E2E Tests - 占比 10%)
- **适用场景**: 用户的**核心交易链路 (Happy Paths)**、跨端交互、UI 状态响应。
- **Gherkin 特征**: 关注用户真实操作和视觉反馈。例如：“Given 用户处于首页, When 点击商品 'MacBook Pro' 的 '加入购物车' 按钮, Then 顶部导航栏的购物车角标应变为 1”。
- **执行载体**: 全局 `e2e-tests/` 目录下的 Cucumber + Playwright。
- **Spec 标记**: `@e2e`

**防腐策略**: 在 `/opsx:propose` 阶段，AI 必须主动在 `spec.md` 的场景 (Scenario) 上方添加 `@unit`, `@api`, `@e2e` 等 Cucumber Tag，并在 `/opsx:apply` 阶段将它们精准分配到对应的测试工程中，坚决抵制将底层逻辑推到 E2E 层验证。

---

## 4. SDD 工作流整合方案 (Workflow Integration)

引入 BDD 后，原有的 `/opsx` 流程将被极大增强，形成严密的闭环：

### 环节一：规范生成 (Propose)
AI 在 `/opsx:propose` 阶段生成的 `spec.md` 中，必须严格使用标准的 Gherkin 语法区块：
```gherkin
Feature: 购物车管理
  Scenario: 用户成功将商品加入购物车
    Given 系统中存在商品 "MacBook Pro" 且库存充足
    When 用户在前端点击 "MacBook Pro" 的 "加入购物车" 按钮
    Then 购物车角标数量应该变为 1
```

### 环节二：测试生成 (Tasks)
在生成 `tasks.md` 时，AI 会增加一项核心任务：**“编写 Cucumber Step Definitions”**。
AI 会将 Spec 中的 Gherkin 场景提取为 `.feature` 文件，并在 `e2e-tests/steps/` 中使用 Playwright 实现对应的自动化逻辑。

### 环节三：实施与验证 (Apply)
在 `/opsx:apply` 阶段，AI 编写完业务代码后，必须在终端执行：
```bash
cd e2e-tests && npm run test:e2e
```
**强制约束**：只有当 Cucumber 测试全绿通过时，AI 才能将 `tasks.md` 中的 E2E 任务勾选完成。

### 环节四：归档防线 (Archive Checkpoint)
在执行 `/opsx:archive` 前，`init.sh` 或人工检查流程将强制触发一次全局 BDD 回归测试，确保新代码没有破坏任何现有的 `openspec/specs/` 规则。

---

## 5. `init.sh` 改造计划

将在 `init.sh` 中新增 BDD 相关的快捷命令，统一入口：
```bash
./init.sh e2e:install   # 初始化 BDD 和 Playwright 环境
./init.sh e2e:run       # 启动前后端服务，并执行全局 Cucumber 测试
```

---

## 6. 落地步骤建议 (Next Steps)

1. **环境初始化**: 创建 `e2e-tests` 目录，安装 `@cucumber/cucumber` 和 `playwright`。
2. **打通第一个 Spec**: 选取 `openspec/specs/cart-management/spec.md`，将其中的场景提取为 `.feature`，并编写对应的 `steps.js`，跑通 Playwright 链路。
3. **更新 Harness 文档**: 修改 `QUALITY_SCORE.md` 和 `docs/sops/sdd-workflow.md`，将 BDD 测试通过作为 Archive 的硬性前置条件。
