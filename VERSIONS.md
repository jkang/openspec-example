# 版本演进导航 (Versions & Evolution)

本仓库完整保留了三代 **SDD（规格驱动开发）脚手架**。三者位于**同一条提交线**上，按时间递进：

```
v1 极简交付  ──►  v2 轻量版  ──►  v3 完整版
2026-08-17       2026-08-28       2026-09-18
```

> 每一步的差异都可以用 GitHub 的 `compare` 直接看出（见下方「看演进」）。

---

## 1. 三个版本

| 版本 | Tag | 日期 | 定位 | 相对上一代新增 | 提案文档 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **v1 极简交付**<br/>Minimalist Delivery | [`v1.0-minimal-delivery`](https://github.com/jkang/openspec-example/tree/v1.0-minimal-delivery) | 2026-08-17 | OpenSpec 原生单 Change 管线 | 三件最小扩展：跨工具脚手架（`.trae` / `.cursor` / `.agents`）、仓库内 Schema 与模板、原型能力 | [极简交付脚手架全景图](https://github.com/jkang/openspec-example/blob/v3.0-full-sdd/learning-sdd/ai4se-minimal-delivery-scaffold.md) |
| **v2 轻量版**<br/>Lightweight SDD | [`v2.0-lightweight-sdd`](https://github.com/jkang/openspec-example/tree/v2.0-lightweight-sdd) | 2026-08-28 | 单条知识闭环的最小集 | 规划层（Product / ROADMAP）、业务基线（Blueprint / Process / Domain）、Story、Harness / E2E | [轻量级 SDD 脚手架提案](https://github.com/jkang/openspec-example/blob/v3.0-full-sdd/learning-sdd/ai4se-lightweight-sdd-proposal.md) |
| **v3 完整版**<br/>Full SDD | [`v3.0-full-sdd`](https://github.com/jkang/openspec-example/tree/v3.0-full-sdd) | 2026-09-18 | 复杂业务端到端 | 需求侧 / 交付侧两级解耦（`openspec-requirements/`）、需求工程链路（调研 → 探索 → 原型 → 拆分 → Story → 交接）、分层 Sync、4 角色协同 | [SDD 完整版提案](https://github.com/jkang/openspec-example/blob/v3.0-full-sdd/learning-sdd/ai4se-sdd-proposal.md) |

**一句话选型**：

- **v1 极简交付** —— 只想跑通「想法 → 规格 → 代码 → 归档」单 Change 闭环，零治理、最轻。
- **v2 轻量版** —— 需要把产品规划与业务基线接进闭环，但不需要需求侧工作区。
- **v3 完整版** —— 多 Epic / 多 Story 并行、需要需求漏斗与分层 Sync 的规模化协作。

---

## 2. 看演进：两两对比

| 对比 | 链接 |
| :--- | :--- |
| 极简 → 轻量：加了什么 | [compare/v1.0-minimal-delivery...v2.0-lightweight-sdd](https://github.com/jkang/openspec-example/compare/v1.0-minimal-delivery...v2.0-lightweight-sdd) |
| 轻量 → 完整：加了什么 | [compare/v2.0-lightweight-sdd...v3.0-full-sdd](https://github.com/jkang/openspec-example/compare/v2.0-lightweight-sdd...v3.0-full-sdd) |
| 极简 → 完整：全量差异 | [compare/v1.0-minimal-delivery...v3.0-full-sdd](https://github.com/jkang/openspec-example/compare/v1.0-minimal-delivery...v3.0-full-sdd) |

---

## 3. 跑起来

| 版本 | 启动方式 |
| :--- | :--- |
| **v1 极简交付** | 无统一 `init.sh`，直接进入 `ecommerce/` 下子模块启动：`ecommerce-mini`（Node）、`ecommerce-mini-frontend`（Vue + Vite）、`ecommerce-mini-python`（Python） |
| **v2 轻量版** | `./init.sh` 查看帮助 → `./init.sh vue:start` / `node:start` / `python:start` / `test:all` |
| **v3 完整版** | 同 v2（`./init.sh`），额外包含需求侧工作区 `openspec-requirements/` |

检出任意版本：

```bash
# 用 tag 检出（推荐）
git clone -b v1.0-minimal-delivery https://github.com/jkang/openspec-example.git
git clone -b v2.0-lightweight-sdd  https://github.com/jkang/openspec-example.git
git clone -b v3.0-full-sdd         https://github.com/jkang/openspec-example.git

# 或用只读分支
git clone -b release/v2-lightweight https://github.com/jkang/openspec-example.git
```

> v1 无 `init.sh`，需按各子模块自身的 `package.json` / `requirements.txt` 启动。

---

## 4. 分支一览

| 分支 | 内容 |
| :--- | :--- |
| `main` | 默认分支。承载本导航文档，代码内容为 **v2 轻量版** |
| `full-sdd` | **v3 完整版**开发线（最新） |
| `release/v1-minimal` | v1 只读快照（= tag `v1.0-minimal-delivery`） |
| `release/v2-lightweight` | v2 只读快照（= tag `v2.0-lightweight-sdd`） |
| `release/v3-full` | v3 只读快照（= tag `v3.0-full-sdd`） |

---

## 5. 提案文档索引

三份提案文档位于 `learning-sdd/`，是三个版本的**设计依据与取舍说明**：

| 文档 | 描述版本 | 说明 |
| :--- | :--- | :--- |
| [`ai4se-minimal-delivery-scaffold.md`](https://github.com/jkang/openspec-example/blob/v3.0-full-sdd/learning-sdd/ai4se-minimal-delivery-scaffold.md) | v1 极简交付 | 脚手架目录组织全景图，含提交历史证据与逐件详解 |
| [`ai4se-lightweight-sdd-proposal.md`](https://github.com/jkang/openspec-example/blob/v3.0-full-sdd/learning-sdd/ai4se-lightweight-sdd-proposal.md) | v2 轻量版 | 把产品规划、原型与需求分析接到开发闭环 |
| [`ai4se-sdd-proposal.md`](https://github.com/jkang/openspec-example/blob/v3.0-full-sdd/learning-sdd/ai4se-sdd-proposal.md) | v3 完整版 | 复杂业务端到端流程与脚手架（需求侧 / 交付侧两级解耦 + 分层 Sync） |
