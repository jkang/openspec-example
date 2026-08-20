# OpenSpec 使用手册

基于项目的实践经验总结。

## 目录

- [OpenSpec 使用手册](#openspec-使用手册)
  - [目录](#目录)
  - [1. 简介](#1-简介)
    - [1.1 什么是规范驱动开发？](#11-什么是规范驱动开发)
    - [1.2 核心理念](#12-核心理念)
    - [1.3 核心价值](#13-核心价值)
  - [2. 安装](#2-安装)
    - [2.1 前置要求](#21-前置要求)
    - [2.2 安装命令](#22-安装命令)
    - [2.3 验证安装](#23-验证安装)
    - [2.4 配置 Shell 自动补全（可选）](#24-配置-shell-自动补全可选)
  - [3. 项目初始化](#3-项目初始化)
    - [3.1 初始化命令](#31-初始化命令)
    - [3.2 交互式配置](#32-交互式配置)
    - [3.3 非交互模式](#33-非交互模式)
    - [3.4 初始化后的目录结构](#34-初始化后的目录结构)
    - [3.5 各文件说明](#35-各文件说明)
    - [3.6 业务基线治理 (Baseline Governance)](#36-业务基线治理-baseline-governance)
  - [4. 创建变更提案](#4-创建变更提案)
    - [4.1 创建新变更](#41-创建新变更)
    - [4.2 示例：创建 AI Infrastructure CMDB 核心变更](#42-示例创建-ai-infrastructure-cmdb-核心变更)
    - [4.3 变更目录结构详解](#43-变更目录结构详解)
    - [4.4 各文件作用](#44-各文件作用)
    - [4.5 变更的生命周期](#45-变更的生命周期)
  - [5. 文档结构规范](#5-文档结构规范)
    - [5.1 proposal.md - 提案文档](#51-proposalmd---提案文档)
    - [5.2 specs/ 目录 - 能力规范](#52-specs-目录---能力规范)
    - [5.3 spec.md - 能力规范格式](#53-specmd---能力规范格式)
    - [5.4 design.md - 技术设计](#54-designmd---技术设计)
    - [5.5 tasks.md - 任务清单](#55-tasksmd---任务清单)
  - [6. 验证与常见错误](#6-验证与常见错误)
    - [6.1 验证命令](#61-验证命令)
    - [6.2 常见错误及解决方案](#62-常见错误及解决方案)
    - [6.3 调试技巧](#63-调试技巧)
  - [7. 常用命令参考](#7-常用命令参考)
  - [8. 最佳实践](#8-最佳实践)
  - [9. 实战案例：小型电商网站](#9-实战案例小型电商网站)
    - [9.1 核心域与上下文](#91-核心域与上下文)
    - [9.2 架构设计与分层](#92-架构设计与分层)
    - [9.3 规范驱动实现示例](#93-规范驱动实现示例)
  - [10. 验证、评估与测试设计](#10-验证评估与测试设计)
    - [10.1 追踪矩阵](#101-追踪矩阵)
    - [10.2 从 Scenario 到测试用例](#102-从-scenario-到测试用例)
    - [10.3 性能基线与 SLO](#103-性能基线与-slo)
  - [11. 生产级扩展实践](#11-生产级扩展实践)
    - [11.1 持久化、鉴权与幂等性](#111-持久化鉴权与幂等性)
  - [12. 附录](#12-附录)

---

## 1. 简介

OpenSpec 是一个**规范驱动开发（Spec-Driven Development, SDD）框架**，专为 AI 编程助手设计。它通过在编写代码之前先定义规范，确保人与 AI 对需求达成一致。

### 1.1 什么是规范驱动开发？

传统开发流程通常是：需求 → 直接编码 → 测试 → 交付。

规范驱动开发的流程是：**需求 → 编写规范 → 验证规范 → 编码实现**。

这种方式的优势在于：
- 人与 AI 先就"做什么"达成一致，避免返工
- 规范文档作为契约，减少沟通成本
- 规范可以版本化管理，便于追溯

### 1.2 核心理念

| 理念 | 含义 |
| :--- | :--- |
| **流动而非僵化** | 文档可以随时更新，没有严格的阶段门槛 |
| **迭代而非瀑布** | 支持增量添加需求，逐步完善 |
| **简单而非复杂** | 只需要 Markdown 文件，无复杂工具链 |
| **兼顾存量与新建项目** | 既适用于已有代码库（Brownfield），也适用于全新项目（Greenfield） |

### 1.3 核心价值

1. **先达成一致再构建**：在编写代码之前，人与 AI 先就规范达成共识，避免 AI 理解偏差导致的返工。
2. **保持组织性**：每个变更都有自己的文件夹，包含 proposal、specs、design、tasks。
3. **流动迭代**：随时更新任何文档，没有僵化的阶段门槛。
4. **工具兼容**：支持 20+ AI 编程助手（Claude Code、Cursor、Junie、Lingma IDE 等）。

---

## 2. 安装

### 2.1 前置要求
- **Node.js**：20.19.0 或更高版本
- **包管理器**：npm、pnpm、yarn 或 bun

### 2.2 安装命令
```bash
npm install -g @fission-ai/openspec@latest
```

### 2.3 验证安装
```bash
openspec --version
openspec --help
```

---

## 3. 项目初始化

### 3.1 初始化命令
```bash
openspec init
```

### 3.2 交互式配置
`openspec init` 会引导选择集成的 AI 工具。

### 3.3 非交互模式
```bash
openspec init --tools claude,cursor
```

### 3.4 初始化后的目录结构
```text
your-project/
├── openspec/                     # OpenSpec 工作目录
│   ├── config.yaml               # 项目配置
│   ├── changes/                  # 活跃变更
│   └── specs/                    # 主规范（基线）
├── .trae/                        # Trae 专属目录
│   ├── commands/opsx/            # /opsx 斜杠命令
│   └── skills/                   # Agent Skills
└── ...
```

### 3.5 各文件说明
- `config.yaml`: 项目背景、技术栈、约束条件。
- `changes/`: 存放活跃的变更提案。
- `specs/`: 存放已归档的规范（Source of Truth）。

### 3.6 业务基线治理 (Baseline Governance)
自 v2.0+ 起，OpenSpec 引入了结构化的业务基线体系。这些文档位于 `docs/baseline/` 目录下：

- `docs/baseline/business_process.html`: 核心流程图
- `docs/baseline/domain_model.html`: 领域模型图
- `docs/baseline/service_blueprint.html`: 服务蓝图

**基线回流 (Baseline Sync)**: 在执行 `/opsx:sync` 时，AI 自动从当前 Change 的认知中提取增量并回流至基线文档，最后自动渲染为 HTML 视图。

---

## 4. 创建变更提案

### 4.1 创建新变更
推荐使用斜杠命令：
```text
/opsx:propose <description>
```

### 4.2 示例
```text
/opsx:propose "实现优惠券结算引擎升级"
```

### 4.3 变更目录结构
```text
openspec/changes/<change-name>/
├── proposal.md        # Why 和 What
├── design.md          # How (技术方案)
├── tasks.md           # 实现步骤
└── specs/             # 变更的规格 (Deltas)
```

---

## 5. 文档结构规范

### 5.1 proposal.md
必须包含 `## Why` 和 `## What Changes` 章节。

### 5.2 specs/ 目录
必须使用能力文件夹（Capability folders），如 `specs/catalog-management/spec.md`。

### 5.3 spec.md
必须使用 Delta Header (`## ADDED/MODIFIED/REMOVED Requirements`) + `### Requirement:` + `#### Scenario:` (Gherkin 格式)。

---

## 6. 验证与常见错误

### 6.1 验证命令
```bash
openspec validate <change-name>
```

### 6.2 常见错误
- **未找到 Delta**: 检查 `specs/` 目录下是否有能力文件夹及 `spec.md` 是否有 Delta Header。
- **需求解析失败**: 确保使用 `### Requirement: <标题>`。
- **缺少场景**: 每个需求必须至少有一个 `#### Scenario:` 块。

---

## 7. 常用命令参考

| 命令 | 说明 |
| :--- | :--- |
| `openspec init` | 初始化项目 |
| `openspec validate <name>` | 验证变更格式 |
| `openspec archive <name>` | 归档变更（合并规格并清理目录） |
| `/opsx:explore` | 深度探索（不写代码） |
| `/opsx:apply` | 执行任务实施 |
| `/opsx:sync` | 同步规格与业务基线 |
| `/opsx:baseline/render` | 渲染可视化基线 HTML |

---

## 8. 最佳实践

- **先探索后提案**: 不确定时先用 `/opsx:explore`。
- **一个能力一个文件夹**: 保持规格组织清晰。
- **增量迭代**: 随时更新文档，不要等全部完成才 validate。
- **人工主导逻辑**: AI 辅助生成，但核心业务规则必须人工评审。

---

## 9. 实战案例：小型电商网站

本案例构建一个名为 `ecommerce-mini` 的微型电商系统，演示如何从规格到落地。

### 9.1 核心域与上下文
- **Catalog (商品)**: 管理商品信息与库存。
- **User (用户)**: 身份识别与认证。
- **Cart (购物车)**: 临时存放欲购买商品。
- **Order (订单)**: 交易的核心单据与状态流转。
- **Payment (支付)**: 资金结算模拟。

### 9.2 架构设计与分层
采用经典的四层架构，确保关注点分离：

| 层级 | 职责 | 依赖方向 |
| :--- | :--- | :--- |
| **接口层 (http/)** | 处理 HTTP 请求，参数解析，鉴权 | -> Application |
| **应用层 (services/)** | 用例编排（Orchestration），如“下单” | -> Domain, Repo |
| **领域层 (domain/)** | 纯净的业务实体与逻辑，无外部依赖 | None |
| **基础设施 (repo/)** | 数据持久化实现 (Memory/File) | Detail |

### 9.3 规范驱动实现示例
**Spec 定义 (`specs/domain-model/spec.md`)**:
```markdown
### Requirement: 商品实体定义
系统 SHALL 定义商品实体，包含唯一标识、名称、价格和库存。
#### Scenario: 创建有效商品
Given 需要创建新商品
When 提供商品信息 { id, name, priceCents, stock }
Then 商品实体创建成功
```

**代码实现 (`src/domain/types.js`)**:
```javascript
/**
 * @typedef {Object} Product
 * @property {string} id
 * @property {number} priceCents
 */
```

---

## 10. 验证、评估与测试设计

### 10.1 追踪矩阵
建立 Spec ↔ 代码 ↔ 测试 的映射关系。建议在代码注释中引用 Spec 章节，如 `// 对应 Spec: POST /api/orders`。

### 10.2 从 Scenario 到测试用例
OpenSpec 的 Gherkin 格式场景天然适合转化为测试用例。AI 可以直接读取 Scenario 并生成测试骨架。

### 10.3 性能基线与 SLO
在开发阶段运行性能基准测试（如 `performance.spec.js`），确保核心接口（如支付）的 p99 延迟符合预期。

---

## 11. 生产级扩展实践

为了演示 OpenSpec 如何应对复杂性，我们在案例中引入了以下高级特性：
- **持久化存储**: 实现 `FileStore` 类，确保服务重启后订单数据不丢失。
- **鉴权与安全**: 增加 `Bearer Token` 校验，拦截未授权请求。
- **幂等性 (Idempotency)**: 客户端发送 `Idempotency-Key`，服务端实现查重，防止重复扣款。

---

## 12. 附录

### 12.1 支持的 AI 工具
支持 Cursor, Claude Code, Qoder, Lingma IDE, Windsurf 等 20+ 工具。

### 12.2 遥测设置
设置 `OPENSPEC_TELEMETRY=0` 可完全关闭匿名遥测。

### 12.3 常见问题 (FAQ)
- **Q: 与 OpenAPI 有什么区别？** A: OpenSpec 侧重业务行为约束，OpenAPI 侧重技术契约，两者互补。
- **Q: 存量项目如何引入？** A: 从一个小变更开始，逐步建立规格体系。
- **Q: AI 不遵循规范怎么办？** A: 运行 `openspec update` 刷新 Skills，或在 `config.yaml` 中增加强制规则。

---
_文档版本: 4.0_
_最后更新: 2026-08-19_
_基于 v2.0+ 更新：集成业务基线回流、实战案例与生产级扩展指南_
