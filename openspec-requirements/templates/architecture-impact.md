# 架构影响分析 (Architecture Impact): <Epic 名称>

> Epic Key: `<epic-key>` | 关联 Idea: `epics/<epic-key>/idea.md`
> 关联原型（Epic 整体）: `epics/<epic-key>/prototypes/*.html`
> 产出后需用户确认（HITL）

## 1. 结论摘要

- 影响等级：高 / 中 / 低
- 架构变更：需要 / 不需要（no-op 理由：）

## 2. Bounded Context 与 Capability 影响

| Bounded Context | 受影响 Capability | 变化类型（新增/修改/复用） | taxonomy 标注 | 依据节点 |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |

## 3. 四层架构影响

| 层 | 影响点 | 说明 | 风险 |
| --- | --- | --- | --- |
| HTTP |  |  |  |
| Service |  |  |  |
| Domain |  |  |  |
| Repo |  |  |  |

## 4. 数据与存储

- 新增字段/实体：
- 迁移兼容：
- 双实现（FileStore / MemoryRepo）：
- 旧数据 / 旧客户端兼容：

## 5. 渠道同源（Web / 小程序）

- 是否共用账户：
- 是否共用 API：
- 是否共用数据：
- 渠道分裂风险：

## 6. API 契约

| 端点 | 变化 | 兼容性 | 备注 |
| --- | --- | --- | --- |
|  |  |  |  |

## 7. 安全与权限

- 服务端鉴权 / 授权：
- 对象级授权（IDOR）：
- 输入输出校验：
- 测试后门隔离：

## 8. 非功能（性能 / 可观测性 / 并发幂等）

- 请求内同步 IO：
- 全量读写：
- 审计记录：
- 并发与幂等：

## 9. 迁移与演进

- 旧客户端 / 旧数据兼容路径：
- 是否分阶段交付：

## 10. 对后续阶段的输入（storymap / handoff）

- 对 storymap 拆分的输入：
- 对 handoff proposal Impact 章节的结论：
- 需开发侧 design.md 重点评估的项：

## 11. HITL 确认

- [ ] 已覆盖 Bounded Context / Capability / 四层 / 数据 / 渠道 / API / 安全 / 非功能
- [ ] 治理映射引用了真实基线节点（无证据不写结论）
- [ ] 无影响项已显式记录（no-op 及理由）
- [ ] 用户确认，可进入 `/req:storymap`
