---
name: grilling
description: 需求盘问（跨切面方法）。在产出 research/idea/storymap/story 之前，用设计树 + frontier 分轮提问，把模糊需求、业务规则与决策边界问清。使用场景：需求含糊、方案有分歧、任务类型不确定，或某个 HITL 检查点需要更充分澄清时。
allowed-tools: Read, SearchCodebase, Grep, LS
license: MIT
compatibility: 需求侧工作流 (req-sdd)
metadata:
  author: sdd-team
  version: "1.0"
---

Grilling 是**跨切面方法**，不是漏斗阶段。它不产出文件，只产出共识，供 `research` / `explore` / `storymap` / `story` 与 `lead` 在关键节点调用。

## 何时使用

- `research`：访谈提纲设计前，澄清调研对象、范围与关键未知。
- `explore`：澄清业务意图、B/C 双端规则、To-Be 边界、候选 Capability 前。
- `storymap`：澄清拆分粒度、依赖关系、优先级冲突时。
- `story`：业务规则存在歧义、验收标准无法闭合时。
- `lead`：任务类型路由（Epic / Feature / Bug Fix / Tech Debt）不确定时。

## 步骤

1. **读上下文**：读已确认的上游制品与治理基线（research.md / idea.md / domain_model.html 等）。
2. **建设计树**：把待定事项拆成决策节点，标注前置依赖。
3. **计算 frontier**：只保留前置已确定的决策。
4. **分轮提问**：每题编号、给推荐答案，等用户回答。
5. **重算 frontier**：已定决策解锁下一轮；依赖未定项的问题留到后续轮。
6. **停止**：frontier 为空，记录共识结论，交回调用方。

## 事实与决策

- 事实由 AI 自己查（文件、基线、必要时 subagent），不问用户。
- 决策逐题交用户；用户回答「按推荐」即接受推荐答案。

## 护栏

- 每轮 3–7 题，最多 3–4 轮。
- 每题必须有推荐答案与依据。
- 不把盘问变成审问，不重复已答问题。
- 输出只进对话与调用方的制品，不单独建文件。

## 方法参考

- `references/grilling.md`
