---
name: prototype-generator
description: |
  高级 MVP 原型生成器 —— 输入 AI Canvas + To-be Journey 设计，
  编译输出可启动运行的前后端一体化 MVP 应用（React/Vue + Express + Mock AI/业务服务）。

  Triggers when user mentions:
  - "生成 MVP 原型"
  - "生成高级原型"
  - "MVP 应用设计"
  - "前后端原型"
  - "generate MVP prototype"
  - "create interactive prototype"
  - "原型生成"
author: KK
---

# Prototype Generator (MVP 原型生成器)

承接需求侧 **`epics/<epic-key>/idea.md`（To-Be Process / To-Be Journey 章节）与 `docs/baseline/design-system/`（design tokens）**，
以 **产品 MVP 架构师** 的视角，编译出一个**可一键启动、前后端一体、UI 专业**的可工作原型。

> [!IMPORTANT]
> **本仓库适配说明 (本仓库用法)**:
> - 本工具在需求侧 **prototype 阶段**使用，**仅用于复杂业务产品**（多角色/多流程/需真实数据交互验证）。
> - 简单 UI 场景仍走既有 `Vue3+Tailwind CDN` HTML 原型（见 `prototype` skill 分支 A）。
> - **上游输入适配**：原设计输入为 "AI Canvas + To-be Journey YAML"；本仓库统一改为 `epics/<key>/idea.md` 的 To-Be 章节（用户场景/流程/旅程）+ `docs/baseline/design-system/` tokens。
> - **输出落位**：`epics/<epic-key>/prototypes/working/mvp-prototype/`。
> - **UI 约束**：原型仍须遵循 `docs/FRONTEND.md` 极简约束（slate 色系、真实中文数据、禁装饰 Emoji）；圆角/阴影规则对可工作原型**放宽**（组件库默认样式），但配色强制使用 design-system tokens。

```
idea.md To-Be 章节 + design-system tokens（+ 用户偏好：前端框架/配色）
        │
        ▼
【LLM】推演 MVP 设计规格 mvp_spec.yaml
        │
        ▼
【Python 脚手架】scaffold_mvp.py 编译 → epics/<epic-key>/prototypes/working/mvp-prototype/
        │
        ▼
【验证】npm install → npm run dev → curl + 浏览器实测
```

---

## 核心能力

| 需求 | 实现 |
|------|------|
| ① 前端 React 或 Vue | Step 0 必问用户；React→Ant Design，Vue→Arco Design |
| ② AI 功能独立 service | `server/services/aiService.js` 独立模块（识别/推荐/审批/对话，含模拟延迟，可抽离微服务） |
| ③ 业务系统交互 mock | `server/services/businessMock.js` 独立模块（ERP/SRM/HR 数据接口） |
| ④ 专业设计系统 | AntD / Arco 工作台布局（侧边栏+顶栏+卡片/表格/表单/对话组件） |
| ⑤ 主题配色 | 用户提供配色→直接用；否则按业务域自动推导（供应链→蓝+橙；金融→深蓝+金…） |
| ⑥ 输出目录 | `epics/<epic-key>/prototypes/working/mvp-prototype/`（脚手架 `--output` 指定） |
| ⑦ 启动验证 | 安装依赖 → 启动 → curl API 实测 + 浏览器打开前端验证 UI 与 AI 交互 |

---

## 工作流 SOP

### Step 0 · 需求澄清（必问）
1. **前端框架**：React 还是 Vue？
2. **配色**：是否有指定主色/强调色/Logo？（无则按业务域自动推导）
3. **端口偏好**：默认 Vite `:5173` / API `:8080`，是否冲突？

### Step 1 · 解析输入
- **本仓库输入**：读取 `epics/<epic-key>/idea.md` 的 To-Be 章节（用户场景 / To-Be Process / To-Be Journey）+ `docs/baseline/design-system/` tokens。
- **兜底**：用户仅提供自然语言场景描述时，先按 idea 结构推演，再进入 Step 2。

### Step 2 · 推演 mvp_spec.yaml（LLM 产物）
- 严格遵循 `references/mvp_prompts.md` 铁律（承接规则、元素类型白名单、主题推导表、防呆结构）。
- 保存至 `epics/<epic-key>/analysis/prototype/mvp_spec.yaml`（或 `prototypes/working/mvp_spec.yaml`）。

### Step 3 · 脚手架编译
```bash
# 在仓库根目录执行：
python3 openspec-requirements/tools/prototype-generator/scripts/scaffold_mvp.py \
  epics/<epic-key>/analysis/prototype/mvp_spec.yaml \
  --output epics/<epic-key>/prototypes/working/mvp-prototype
```
- 产物位于 **`epics/<epic-key>/prototypes/working/mvp-prototype/`**。
- `--force` 覆盖已存在目录。

### Step 4 · 启动验证（必须执行）
```bash
cd "epics/<epic-key>/prototypes/working/mvp-prototype"
npm install          # 一次性安装全部依赖
npm run dev          # 开发模式：API(:8080) + Vite 前端(:5173)
```
验证清单：
1. `curl http://localhost:8080/api/health` → `{"status":"ok",...}`
2. `curl -X POST http://localhost:8080/api/purchase/parse` → 返回 Mock AI 识别结果
3. 浏览器打开 `http://localhost:5173` → 逐页验证（工作台/上传/AI推荐/审批/下单）UI 与 AI 交互
4. 验证失败 → 定位修复后重新验证

### Step 5 · 交付
- 输出 `README.md`（含快速开始、架构图、接口清单）。
- 生产模式说明：`npm run build && npm start` 单端口 `:8080` 一体化运行。

---

## 页面元素模型（元素类型白名单）

| 元素 | AntD / Arco 组件 | 用途 |
|------|-----------------|------|
| `steps` | Steps / a-steps | To-be 旅程进度 |
| `uploadCard` | Upload.Dragger | 上传文件（承接 userInputs） |
| `aiResultCard` | Card + Table/描述 | AI 结果（承接 visibleData，支持 table/kv 两种渲染） |
| `table` | Table / a-table | 数据表格（状态列 Tag 着色） |
| `statRow` | Row + Statistic | 指标卡（承接 userGains 量化指标） |
| `buttonRow` | Space + Button | 操作区（navigate / 触发 AI action） |
| `alert` | Alert / a-alert | 业务告警 |
| `timeline` | Timeline / a-timeline | 状态流转 |
| `chatPanel` | 模拟对话 + 推荐指令 chips | AI 对话（承接 aiInteraction.suggestions） |
| `formCard` | Form + Input/Select | 表单录入 |
| `tagRow` | Tag / a-tag | 标签 |

---

## 目录结构

```
prototype-generator/
├── SKILL.md                        # 本指南
├── references/
│   ├── mvp_prompts.md              # LLM 铁律（承接规则、元素白名单、主题推导表）
│   └── mvp_spec_schema.yaml        # mvp_spec 数据契约示例
├── templates/
│   ├── common/                     # 根 package.json / README / .gitignore
│   ├── server/                     # Express 一体化（index/config/routes/services）
│   ├── frontend_react/             # Vite+React+antd 基座
│   └── frontend_vue/               # Vite+Vue+arco 基座
├── scripts/
│   └── scaffold_mvp.py             # 脚手架编译引擎（--case/--scenario/--output/--force）
├── assets/_legacy/                 # 旧 Next.js 模板归档
└── examples/
    └── dreame_mvp_spec.yaml        # 演示：mvp_spec 数据契约参考（非产物目录）
```

---

## 与上下游 Skill 的关系

| 关系 | Skill/制品 | 说明 |
|------|-------|------|
| 上游输入 | `epics/<key>/idea.md` | To-Be 章节（用户场景 / Process / Journey） |
| 上游输入 | `docs/baseline/design-system/` | design tokens（brand-design-system 产物） |
| 下游/协作 | `story-map-generator` | 可工作原型的功能可进一步拆解为用户故事地图 |
| 编排方 | `prototype` skill（需求侧） | 负责分支决策（简单 UI→HTML；复杂业务→本工具） |
