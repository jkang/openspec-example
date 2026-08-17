# OpenSpec Practise

本项目是基于 **OpenSpec** 规范驱动开发 (Spec-Driven Development, SDD) 的实战案例库。它演示了如何通过“先定义规范，后编写代码”的流程，实现人与 AI 在复杂业务场景下的高效协作。

---

🚀 **核心亮点**
- **规范驱动 (SDD)**：通过 Proposal → Design → Specs → Tasks 的标准路径，确保需求无歧义落地
- **多端实现**：同一套 OpenSpec 规范，同时驱动 Node.js、Python 和 Vue 3 三套代码实现
- **AI 原生协作**：深度集成 `/opsx` 斜杠命令，适配 Claude Code、Cursor 等 20+ AI 编程助手

---

## 快速开始

### 1. 前置准备
确保你的开发环境满足以下要求：
- **Node.js**: v20.19.0 或更高版本
- **Python**: v3.10 或更高版本 (用于运行 Python 示例)

### 2. 安装 OpenSpec
OpenSpec 工具链用于管理变更、验证文档以及同步规范。
```bash
# 全局安装 OpenSpec 命令行工具
npm install -g @fission-ai/openspec@latest

# 验证安装
openspec --version
```

### 3. 初始化项目 (针对 AI 工具)
如果你是第一次在此仓库中使用 AI 助手（如 Trae 或 Claude Code），请运行以下命令生成协作技能：
```bash
# 为 Trae 生成 /opsx 指令集 (推荐)
openspec init --tools trae

# 或者为 codex 生成
openspec init --tools codex
```

---

## 运行示例应用

本项目包含一个完整的电商 MVP，分为三个模块：

### 📦 Node.js 后端 (`ecommerce-mini`)
零依赖的纯净实现，支持内存存储与文件持久化。
```bash
cd ecommerce/ecommerce-mini

# 运行测试
npm test

# 启动开发服务器 (端口 3000, 内存存储)
npm start

# 启动生产模式 (端口 3002, 文件持久化 + JWT 鉴权)
npm run start:prod
```

### 🐍 Python 后端 (`ecommerce-mini-python`)
基于 FastAPI 和 Pydantic 的高性能实现。
```bash
cd ecommerce/ecommerce-mini-python

# 安装依赖
pip install -r requirements.txt

# 运行测试
pytest

# 启动服务 (端口 8000)
python -m uvicorn src.api.server:app --reload
```

### 🎨 Vue 前端 (`ecommerce-mini-frontend`)
现代扁平化风格的单屏 UI 界面。
```bash
cd ecommerce/ecommerce-mini-frontend

# 安装依赖
npm install

# 启动开发环境 (端口 5173)
npm run dev
```

---

## SDD 工作流指南

在本仓库中，推荐使用 `/opsx` 斜杠命令驱动开发任务。

| 指令 | 阶段 | 描述 |
| :--- | :--- | :--- |
| `/opsx:explore` | **探索** | 在动工前，让 AI 调查代码库、对比方案、澄清需求 |
| `/opsx:propose <name>` | **提案** | 初始化一个新的变更，自动生成结构化的规划文档 |
| `/opsx:apply` | **实施** | 让 AI 依据规划文档（Tasks）逐步编写代码并验证 |
| `/opsx:sync` | **同步** | 归档前，将当前的增量规范同步至主规范目录 |
| `/opsx:archive` | **归档** | 完成变更后，将记录移至 `openspec/changes/archive/` |

---

## 项目结构

```text
 project/
 ├── openspec/                # OpenSpec 核心规范目录
 │   ├── config.yaml          # 项目上下文配置（技术栈、规则、Store）
 │   ├── specs/               # 归档后的主规范（单一事实来源）
 │   └── changes/             # 活跃中的变更与归档记录
 ├── ecommerce/               # 示例应用实现
 │   ├── ecommerce-mini/      # Node.js 版本
 │   ├── ecommerce-mini-python/ # Python 版本
 │   └── ecommerce-mini-frontend/ # Vue 3 前端版本
 ├── learning-sdd/            # 核心文档（手册、指南、分析）
 └── .trae/                   # Trae 专属 AI 技能与斜杠命令 (同样支持 .cursor, .claude 等)
 ```

---

## 学习资源

1.  **入门**: [OpenSpec 使用手册](learning-sdd/openspec-user-manual.md) — 了解基本概念与 CLI 用法
2.  **实战**: [OpenSpec 实战指南](learning-sdd/openspec-practical-guide.md) — 掌握 SDD 工程实践
3.  **进阶**: [AI 辅助软件工程全流程复盘](learning-sdd/openspec-ai-workflow-analysis.md) — 深入 AI 协作的最佳实践
4.  **演进**: [v1.8.0 工作流实践](learning-sdd/openspec-v1.8.0-workflow-practice.md) — 学习如何处理需求迭代

---

## 相关链接

- [OpenSpec 官方仓库](https://github.com/Fission-AI/OpenSpec)
- [DDD 技能库](https://github.com/ForceInjection/domain-driven-design-skills)
- [CHANGELOG](./CHANGELOG.md)
