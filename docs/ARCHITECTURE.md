---
name: Backend Architecture
purpose: 定义后端分层架构、核心设计决策及 Node.js/Python 实现规范
updated_at: 2026-08-20
---

# Backend Architecture Guidelines

本文档定义了 OpenSpec-Practice 项目的后端架构原则。当前包含 Node.js 和 Python 两种实现，两者必须保持架构对齐。

## 1. 分层架构 (Layered Architecture)

所有后端系统必须严格遵循四层架构，并保持**单向依赖**：

`HTTP Layer` -> `Service Layer` -> `Domain Layer` -> `Repository Layer`

| 层级 | 职责描述 | 依赖限制 |
| --- | --- | --- |
| **HTTP Layer** | 处理路由、HTTP 请求解析、鉴权、返回 JSON 响应。 | 只能调用 Service，严禁直接调用 Repo 或 Domain 逻辑。 |
| **Service Layer** | 业务用例编排 (Use-case orchestration)，如 CartService, CatalogService。 | 调用 Domain 模型进行计算，调用 Repo 进行持久化。 |
15→| **Domain Layer** | 纯业务逻辑、实体定义、状态流转规则。 | **零外部依赖**。不依赖 HTTP，不依赖数据库，不包含 IO 操作。其认知基线应与 [domain_model.html](file:///Users/superkkk/MyCoding/OpenSpec-practice/docs/baseline/domain_model.html) 保持一致。 |
| **Repository Layer** | 数据的存取实现（内存或文件）。 | 仅实现数据接口，不包含业务判断。 |

## 2. 核心设计决策 (Key Design Decisions)

- **货币处理**: 所有涉及价格和金额的字段必须使用**整型分**（`priceCents`），严禁使用浮点数，以避免精度丢失问题。
- **命名规范**: 统一使用业务领域词汇，避免技术词汇泛滥。
- **仓储接口约定**:
  - Python 和 Node.js 的 Repository 实现必须标准化。
  - 特别是 `MemoryRepo`，必须统一提供 `find_by_id` 和 `find_all` 等基础方法（参考 Python 端约定）。

## 3. Node.js 实现规范 (`ecommerce-mini`)

- **运行时**: Node.js (v20+)
- **依赖限制**: **Zero npm dependencies**（零第三方依赖），仅使用 Node 原生模块（`http`, `fs`, `node:test`）。
- **类型定义**: 强制使用 JSDoc 进行实体和类型定义，替代 TypeScript。
- **持久化**:
  - 开发环境: In-memory Map-based repositories (`server.js`)
  - 生产环境: 基于文件的 JSON 持久化 (`FileStore`) + 模拟 JWT (`server.prod.js`)

## 4. Python 实现规范 (`ecommerce-mini-python`)

- **运行时**: Python 3.10+
- **核心框架**: FastAPI (API 层) + Pydantic (领域模型层)。
- **测试框架**: `pytest`，使用 `TestClient` 进行端到端 (E2E) 烟雾测试。
- **数据管理**: 使用 Generic 类型的 `MemoryRepo[T]` 进行内存级数据管理。
