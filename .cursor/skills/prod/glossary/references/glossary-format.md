# Glossary 格式与纪律

## 文件位置

- 单上下文：仓库根 `GLOSSARY.md`
- 多上下文：根 `GLOSSARY-MAP.md` 指向各上下文术语表
- 本仓库默认：`docs/baseline/GLOSSARY.md`，与 `domain_model.html` 并列

## 格式

```md
# {上下文名称}

{一两句话说明该上下文是什么、为什么存在。}

## Language

**Order**:
{一两句话定义该术语}
_Avoid_: Purchase, transaction

**Invoice**:
A request for payment sent to a customer after delivery.
_Avoid_: Bill, payment request
```

## 规则

1. **有观点**：同一概念多个词时选一个，其余列在 `_Avoid_`。
2. **定义短**：一两句话，定义「是什么」，不定义「怎么做」。
3. **只收本项目特有术语**：通用编程概念（超时、错误类型、工具函数）不收。
4. **按子领域分组**（自然聚类时）；单一内聚领域可平铺。
5. **不含实现细节**：不写类名、表名、接口、代码结构。
6. **术语解析后立即写入**，不批量补。

## 与其他基线的关系

- `docs/baseline/domain_model.html` 是领域模型（BC / Capability / Event Storming）的权威。
- `GLOSSARY.md` 是**统一语言**的权威，服务于 domain_model 与 story 的命名一致性。
- 两者冲突时，以 `domain_model.html` 的模型事实为准，回写 Glossary 修正措辞。
