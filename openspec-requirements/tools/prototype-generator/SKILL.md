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

承接 `ai-canvas-generator`（AI 场景定义）与 `ai-product-journey-generator`（To-be 旅程设计），
以 **AI 产品 MVP 架构师** 的视角，编译出一个**可一键启动、前后端一体、UI 专业**的 MVP 应用。

```
AI Canvas YAML + To-be Journey YAML（+ 用户偏好：前端框架/配色）
        │
        ▼
【LLM】推演 MVP 设计规格 mvp_spec.yaml
        │
        ▼
【Python 脚手架】scaffold_mvp.py 编译 → <案例>/<场景>/mvp-prototype/
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
| ⑥ 输出目录 | `<客户案例目录>/<场景目录>/mvp-prototype/`（脚手架 `--case` / `--scenario` 指定） |
| ⑦ 启动验证 | 安装依赖 → 启动 → curl API 实测 + 浏览器打开前端验证 UI 与 AI 交互 |

---

## 工作流 SOP

### Step 0 · 需求澄清（必问）
1. **前端框架**：React 还是 Vue？
2. **配色**：是否有指定主色/强调色/Logo？（无则按业务域自动推导）
3. **端口偏好**：默认 Vite `:5173` / API `:8080`，是否冲突？

### Step 1 · 解析输入
- **优先**：读取 AI Canvas YAML + To-be Journey YAML（同为 `examples/` 中已生成的场景）。
- **兜底**：用户仅提供自然语言场景描述时，先按 AI Canvas 十维结构推演画布，再进入 Step 2。

### Step 2 · 推演 mvp_spec.yaml（LLM 产物）
- 严格遵循 `references/mvp_prompts.md` 铁律（承接规则、元素类型白名单、主题推导表、防呆结构）。
- 保存至 `examples/<标识>_mvp_spec.yaml`。

### Step 3 · 脚手架编译
```bash
# 在项目根目录（含 客户案例目录 的层级）执行：
python3 .opencode/skills/ai4pm-skills/prototype-generator/scripts/scaffold_mvp.py \
  .opencode/skills/ai4pm-skills/prototype-generator/examples/<标识>_mvp_spec.yaml \
  --case "<客户案例目录>" --scenario "<场景目录>"
```
- 产物位于 **`<客户案例目录>/<场景目录>/mvp-prototype/`**。
- 也可用 `--output <显式路径>` 覆盖；`--force` 覆盖已存在目录。

### Step 4 · 启动验证（必须执行）
```bash
cd "<客户案例目录>/<场景目录>/mvp-prototype"
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
    └── dreame_mvp_spec.yaml        # 演示：dreame 采购订单场景
```

---

## 与上下游 Skill 的关系

| 关系 | Skill | 说明 |
|------|-------|------|
| 上游输入 | `ai-canvas-generator` | AI 场景定义（Canvas YAML） |
| 上游输入 | `ai-product-journey-generator` | To-be 旅程设计（personas/scenarios/AI 交互细节） |
| 下游/协作 | `story-map-generator` | MVP 功能可进一步拆解为用户故事地图 |
| 调用方 | `prototype-designer`（Subagent） | 方案设计顾问，负责调度本 Skill 全流程 |
