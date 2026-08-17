---
name: "Prototype"
description: "生成或更新 OpenSpec 交互式原型。调用 openspec-prototype 技能进行设计。"
allowed-tools: Bash(openspec:*)
---

Propose or update an interactive OpenSpec prototype.

**Workflow**

1. **确定变更上下文**
   - 运行 `openspec status --json` 获取当前活跃的变更。
   - 如果没有活跃变更，要求用户先运行 `/opsx:propose` 或指定变更名称。

2. **获取原型指令**
   - 运行 `openspec instructions prototype --change "<name>" --json` 获取生成原型的具体要求和模板。

3. **调用原型技能**
   - 调用 `openspec-prototype` 技能，基于 `proposal.md` 和指令要求生成 `prototypes/<capability-path>.html`。
   - 确保生成的原型符合“现代扁平化 (Modern Flat)”规范：1px 边框、纯色背景、无阴影、单屏紧凑布局。

4. **验证与确认**
   - 生成后，通知用户进行预览。
   - 询问用户是否需要进一步调整。

5. **同步到规范 (可选)**
   - 如果原型已确认，建议用户更新 `specs/spec.md` 以嵌入最新的原型代码和交互场景。
