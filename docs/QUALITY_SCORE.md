# 质量与评估标准 (Quality & Evaluation Standards)

本文档确立了 OpenSpec-Practice 项目的质量基线和 Agent 工作评估标准。

## 1. 核心方法论

- **代码即规范 (Code as Spec)**: 每一行代码都必须有对应的规格说明，严禁无需求开发。确保开发产出与 OpenSpec 的要求绝对一致。
- **AI 协作模式**: 坚持 **"AI 生成初稿 -> 人类审查把关" (HITL)** 的模式。特别是在架构设计和 UI 交互上，未获人类确认前严禁抢跑。
- **业务价值导向**: 技术实现必须服务于业务需求。
- **可视即价值**: 尤其是前端功能，必须通过交互式原型 (Prototype) 直观展现业务价值。

## 2. 验收标准 (Acceptance Criteria)

Agent 在完成任意 `/opsx:apply` 任务前，必须进行以下自检：

### 2.1 架构依从性检查
- [ ] 检查代码是否违反单向依赖（如 HTTP 层直连 Repo）。
- [ ] 检查金额计算是否严格采用了整型分 (`priceCents`)。
- [ ] 检查 Node.js 侧是否引入了未经允许的 npm 依赖。

### 2.2 前端规范检查
- [ ] UI 元素是否存在圆角 (`border-radius`) 或阴影 (`box-shadow`)？(如果有，则不合格)
- [ ] 是否使用了标准色板 (`slate-900`, `slate-50`, `slate-200`)？
- [ ] 数据展示是否使用了真实的业务数据？

### 2.3 验证与测试 (E2E Validation)
- [ ] **跨端联调**: 严禁在未调通前端页面与后端 API 的跨端交互的情况下关闭任务。
- [ ] 自动化测试覆盖:
  - Node.js 必须通过 `npm test` (Unit + Integration + Performance)。
  - Python 必须通过 `pytest` (Smoke Tests)。

## 3. 规范防漂移

如果在执行任务时，发现代码实现与 OpenSpec 中 `openspec/specs/` 定义的规范产生偏离，Agent 必须：
1. 暂停编码。
2. 通过 `/opsx:sync` 或提议修改 Spec。
3. 保证 **代码即规范，规范即代码** 的绝对一致性。
