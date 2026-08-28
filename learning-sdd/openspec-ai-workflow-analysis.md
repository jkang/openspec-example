# OpenSpec 实战指南：AI 辅助软件工程全流程深度复盘

## 1. 引言：软件工程的新范式

在 AI 辅助编程（AI-Assisted Programming）日益普及的今天，开发者面临的核心挑战已从“如何写代码”转变为“如何与 AI 协作以获得确定性的结果”。传统的开发模式是 **需求 -> 人 -> 代码**，而 OpenSpec 倡导的新范式正在演变为一套“可分支的规格驱动闭环”：以规划层作为护栏，需求侧完成需求调研与探索，交付侧按任务类型进入提案、原型、业务评审、规格与设计、实施、验证、分层 Sync 与归档的闭环。

本图与 [SDD_WORKFLOW.md](file:///Users/superkkk/MyCoding/OpenSpec-practice/docs/SOPS/SDD_WORKFLOW.md) 的 SDD 动态分支工作流保持一致，也与 [ai4se-sdd-proposal.md](./ai4se-sdd-proposal.md) 的总体流程一致。

```mermaid
graph TD
    A[产品感 /opsx:planning:product-sense] --> B[路线图规划 /opsx:planning:product-planning]
    B --> C((上下文注入 config.yaml))

    C --> E{确认任务类型}

    E -->|史诗| R1[需求调研 /req:research]
    R1 --> R2[探索 /req:explore<br/>To-Be 设计 + 候选 Capabilities]
    R2 --> R3{涉及 UI 变更?}
    R3 -->|是| R4[原型（Epic 整体）/req:prototype]
    R4 --> R5{视觉/交互确认?}
    R5 -->|否| R4
    R5 -->|是| R6[需求拆分 /req:storymap<br/>覆盖对账]
    R3 -->|否| R6
    R6 --> R7[Story 交付物 /req:story<br/>业务面 + HITL]
    R7 --> H[交接 /req:handoff<br/>合成开发侧 proposal]

    E -->|功能 / BugFix / TechDebt| F1[提案 /opsx:propose]
    F1 --> F2{涉及 UI 变更?}
    F2 -->|是| F3[原型 /opsx:prototype]
    F3 --> F4{视觉/交互确认?}
    F4 -->|否| F3
    F4 -->|是| F6[规格与设计与任务清单 /opsx:spec-design]
    F2 -->|否| F5{Tech Debt 无外部行为变更?}
    F5 -->|是| F6[规格与设计与任务清单 /opsx:spec-design<br/>skip_specs: true]
    F5 -->|否| F6

    H --> U((实施阶段 /opsx:apply))
    F6 --> U

    U --> V((验证门禁 /opsx:verify))
    V --> W{需要更新规划?}
    W -->|是| X[更新规划 /opsx:update]
    X --> U
    W -->|否| Y[Spec Sync /opsx:sync<br/>change 级]

    Y --> Z[归档 /opsx:archive]

    Z -->|Epic 还有下一个 Story| R7
    Z -->|Epic 全部完成| K2[Baseline Sync /opsx:baseline/sync<br/>Epic 级 +HITL]
    K2 --> AA((完成))```

> **分层 Sync 说明**：每个 change 归档前只做 **Spec Sync**（`/opsx:sync`，change 级）；**Baseline Sync**（`/opsx:baseline/sync`）在 Epic 全部 Story 归档后统一执行（+ Roadmap 更新）。

本文以一个 **小型电商系统** 的从零构建到生产级演进为例，深度复盘基于 OpenSpec v2.0 的 AI 协同开发全流程。我们将展示 OpenSpec 如何作为“治理驱动的桥梁”，确保每一个变更都长在产品规划的护栏内。

---

## 2. 完整迭代流程复盘（Node.js 版）

### 2.0 阶段零：规划与治理 (Planning Layer)

**用户输入**:

> `/opsx:planning:product-sense` "定义积分商城的 Elevator Pitch..."
> `/opsx:planning:product-planning` "制定未来 3 个月的滚动路线图..."

**AI 思考与动作**:

在 v2.0 中，`Planning` 是整个项目的根基：

1.  **产品感定义**: AI 协助 PM 明确目标用户、痛点与核心竞争优势。
2.  **路线图划定**: AI 基于当前 Baseline 划定本月 In-Scope 边界，并将月度滚动计划持久化到 `ROADMAP.md`。

**价值分析**:

-   **护栏机制**: 为后续的 Explore 提供了强制的“对齐基准”。
-   **阶段感知**: AI 知道什么是现在该做的，什么是未来才做的。

### 2.1 阶段一：探索、对齐与原型 (Explore & Prototype)

**用户输入**:

> `/opsx:propose` "构建一个小型电商网站 MVP，包含商品、购物车、订单、支付核心能力。"

**AI 思考与动作**:

在此阶段，AI 不急于编写具体代码，而是首先进行 **领域建模**、**视觉原型设计** 与 **规格定义**。这是 OpenSpec 方法论的核心——先想清楚（并看清楚），再动手。AI 通过运行 `openspec instructions proposal --json` 动态获取当前项目的规划背景。

1.  **架构设计**: AI 分析出电商系统的核心上下文：商品 (Catalog)、用户 (User)、购物车 (Cart)、订单 (Order)、支付 (Payment)；
2.  **生成交互式原型 (New!)**: 
    - AI 调用 `prototype` 技能（需求侧 `prod/prototype`），生成基于 Vue 3 + Tailwind CSS 的 `prototypes/*.html` 单文件原型。
    - 原型遵循 **Modern Flat** 极简规范（1px 边框、无阴影、无渐变），并使用真实的公开资源图片而非 AI 生成图，确保视觉专业度。
3.  **断点确认机制 (Checkpoint)**: 
    - 流程在此处暂停。AI 通知用户预览原型：“*视觉效果和交互流程是否符合预期？*”
    - 用户确认后，AI 才继续生成后续的 `design.md` 和 `tasks.md`。这确保了技术设计是建立在已达成共识的 UI/UX 基础之上的。
4.  **规格产出**: 生成 `proposal.md`、`design.md`、`specs/` 及 `tasks.md`：
    - **Proposal**: 明确变更的 Why 和系统能力边界。
    - **Spec**: 此时的 Spec 不再只是文字，它通过 `<details>` 标签嵌入了原型代码，并将原型中的交互行为转化为 Gherkin (Given/When/Then) 场景。
5.  **配套文章**: 后续基于这些规范文档，撰写了配套的实战指南，已合并入 [OpenSpec 使用手册](./openspec-user-manual.md)。

**价值分析**:

-   **Schema 驱动**: 指令不再是硬编码的，AI 能根据 `config.yaml` 动态调整生成策略。
-   **视觉对齐**: 解决了纯文本需求导致的“买家秀与卖家秀”偏差，通过原型让用户在写代码前就看到成品。
-   **确定性契约**: 交互规则从原型中提取并沉淀到 Spec 中，成为前端实现的硬约束。
-   **防止返工**: 确认断点有效避免了 AI 在错误的技术方向上生成大量垃圾代码和任务。

### 2.2 阶段二：规范驱动的实现生成 (Spec to Code)

**用户输入**:

> `/opsx:apply` "请根据规范实现代码。"

**AI 动作**:

基于已确定的 Spec，AI 生成了 `ecommerce/ecommerce-mini` 下的完整代码结构。

1. **领域层 (Domain)**: 定义纯粹的类型定义 (JSDoc) [types.js](../ecommerce/ecommerce-mini/src/domain/types.js)，无任何外部依赖。
2. **基础设施层 (Infra)**: 实现了内存版的 [memoryRepo.js](../ecommerce/ecommerce-mini/src/repo/memoryRepo.js)，符合接口隔离原则。
3. **服务层 (Service)**: 实现了 [order.js](../ecommerce/ecommerce-mini/src/services/order.js) 等核心逻辑，负责编排领域对象。
4. **接口层 (Interface)**: 实现了 [server.js](../ecommerce/ecommerce-mini/src/http/server.js)，处理 HTTP 协议解析与错误映射。

**价值分析**:

- **一致性**: 代码严格遵循 Spec 中的接口定义与错误码约定。
- **模块化**: AI 生成的代码天然具备良好的分层结构，因为这是 Spec 设计阶段就确定的。

### 2.3 阶段三：自动化验证闭环

**用户输入**: (AI 主动动作) 验证生成的代码是否符合预期。

**AI 动作**:

AI 不仅仅生成功能代码，还生成了配套的测试脚本来验证代码行为符合预期。

1. **集成测试 (E2E)**: [integration.spec.js](../ecommerce/ecommerce-mini/__tests__/integration.spec.js) 模拟了用户从"上架商品"到"下单成功（PENDING_PAYMENT）"的全链路操作，验证业务逻辑闭环。
2. **性能基线**: [performance.spec.js](../ecommerce/ecommerce-mini/__tests__/performance.spec.js) 测量了接口的 p50/p99 延迟，确保满足 Spec 中的性能指标（输出 p99 < 100ms）。
3. **单元测试**: [unit.spec.js](../ecommerce/ecommerce-mini/__tests__/unit.spec.js) 覆盖了库存扣减等边界情况。

**价值分析**:

- **确定性交付**: 不止交付代码，还交付了“代码可工作”的证据。
- **快速反馈**: 通过脚本快速发现逻辑漏洞（如库存并发扣减问题）。

### 2.4 阶段四：生产级演进

**用户输入**:

> `/opsx:propose` “将此示例拓展为生产级实现（持久化、鉴权、幂等与观测）...”

**AI 动作**:

这是 AI 协同开发中最精彩的部分——**增量演进**。AI 并没有推翻重写，而是基于现有的 Spec 架构进行扩展。

1. **持久化扩展**: 引入 [fileStore.js](../ecommerce/ecommerce-mini/src/persist/fileStore.js) 替换内存 Repo，接口契约保持不变。
2. **鉴权与安全**: 在 [server.prod.js](../ecommerce/ecommerce-mini/src/http/server.prod.js) 中增加了 `Bearer Token` 鉴权中间件（简化实现；完整 HMAC 签名逻辑可在此处扩展）。
3. **幂等性设计**: 在接口层预留了 `Idempotency-Key` 请求头解析入口（stub，完整去重逻辑可接入 Redis 或内存缓存实现）。
4. **可观测性**: 集成了 Metrics 埋点，并在测试脚本中验证了指标收集。

**价值分析**:

- **架构韧性**: 良好的初始 Spec 设计使得后续引入复杂特性（如鉴权）时，业务逻辑层（Services）几乎无需改动。
- **测试驱动**: 新的生产级测试脚本成为了新特性的验收标准。

### 2.5 阶段五：同步与归档 (Sync & Archive)

**用户输入**:

> `/opsx:sync` -> `/opsx:archive`

**AI 动作**:

在 v2.0 中，归档流程更加严谨：

1.  **规格同步 (Sync)**: AI 运行 `openspec sync`，将当前变更中的 Delta Specs（增量规格）同步回主规格库（`openspec/specs/`）。
2.  **路线图更新 (Roadmap Update)**: 归档完成后，AI 会提示更新 `ROADMAP.md` 中的当前 Baseline。
3.  **正式归档 (Archive)**: 移动变更文档到 `archive/` 目录。

**价值分析**:

-   **主规格一致性**: 避免了“实现已上线但文档未更新”的常见问题。
-   **知识沉淀**: 归档后的文档成为项目的“外部存储器”，为下一次迭代提供上下文。

---

## 3. 核心洞察：OpenSpec 在 AI 编程中的角色

通过上述案例，我们可以总结出 OpenSpec v2.0 在 AI 软件工程中的进化——从“执行工具”变成了“治理框架”。

### 3.1 上下文锚点

在长对话或跨会话开发中，AI 容易丢失上下文。OpenSpec 的文档体系充当了 **外部存储器**：

- **`openspec/config.yaml`**（v2.0 起）：项目级持久上下文——包含对 `docs/PRODUCT_SENSE.md` 和 `docs/ROADMAP.md` 的引用。

  ```yaml
  context: |
    Project: ecommerce-mini - A minimal e-commerce system demonstrating OpenSpec Spec-Driven Development.
    Architecture: Layered (HTTP -> Service -> Domain -> Repository), single-process monolith.
    Storage: In-memory Map (dev), file-based JSON persistence (prod, Node.js only).
  rules:
    specs:
      - Use Given/When/Then (Gherkin) format for all Scenarios
      - Every Requirement must include Priority (P0/P1/P2) and Rationale
  ```

  当 AI 执行 `/opsx:apply` 时，这些信息会被自动注入，确保生成的代码符合预设约束。

- **变更文档（Proposal/Design/Spec）**：单个变更的意图、技术方案与行为定义。当用户要求“添加持久化”时，AI 不需要重新分析“什么是订单”，而是直接引用已有的 Spec 进行扩展。

### 3.2 契约守护者

AI 生成代码往往具有随机性。OpenSpec 定义的接口契约（Schema）约束了 AI 的输出空间。在案例中，无论后端实现如何变化（内存 vs 文件），HTTP 接口的 JSON 结构始终保持一致，保证了客户端的兼容性。

### 3.3 协作中间件

- **人 -> AI (Planning)**: 人定义感性目标，AI 协助将其转化为理性的路线图与护栏。
- **AI -> 人 (Explore)**: AI 在护栏内探索需求，并执行 **规划对齐 (Roadmap Alignment)**。
- **AI -> 人 (Propose)**: AI 生成提案与原型供人评审。
- **人 -> AI (Approve)**: 人通过确认断点给出反馈或批准设计。
- **AI -> 代码 (Apply)**: AI 基于已确认的原型和 Spec 生成代码与测试。
- **测试 -> 验证 (Verify)**: 测试结果反向验证实现与规格的达成情况。
- **AI -> 规格库/路线图 (Sync & Archive)**: 最终同步规格并刷新 Baseline。

---

## 4. 跨语言实战：Python 复刻

OpenSpec 的核心价值之一是 **语言无关性 (Language Agnostic)**。为了验证这一点，我们记录了一次完整的实验：使用与 Node.js 版本完全相同的 Spec 文件，驱动 AI 从零生成一套全新的 Python 实现（基于 FastAPI + Pydantic）。

### 4.1 环境与目标

- **目标**: 复刻 `ecommerce-mini` 的核心功能。
- **输入**: 仅提供 `openspec/` 目录下的 Markdown 定义。
- **技术栈**: Python 3.10+, FastAPI, Pydantic, Pytest。
- **约束**: 必须严格通过现有的测试用例逻辑。

### 4.2 步骤一：领域模型生成

**交互意图**: 基于 `docs/baseline/domain_model.html` 的治理基线，以及对应 capability spec，生成 Python 数据类，确保类型定义与业务边界一致。

**User Prompt**:

> 请先读取 [domain_model.html](file:///Users/superkkk/MyCoding/OpenSpec-practice/docs/baseline/domain_model.html) 中的领域对象、状态与边界映射，
> 再结合对应 capability spec，使用 Python 的 Pydantic 库定义 Domain Models。
> 要求：
>
> 1. 文件路径：[src/domain/models.py](../ecommerce/ecommerce-mini-python/src/domain/models.py)
> 2. 严格遵循 Spec 中的字段类型和约束（如 non-negative）。
> 3. 不包含任何业务逻辑，仅定义数据结构。

**AI Response (代码片段)**:

```python
# src/domain/models.py
from pydantic import BaseModel, Field
from typing import List, Literal

class Product(BaseModel):
    id: str
    name: str
    # 对应 Spec: Requirement "商品实体定义"
    # 使用 Field(..., ge=0) 确保非负约束
    price_cents: int = Field(..., ge=0, alias="priceCents")
    stock: int = Field(..., ge=0)

class CartItem(BaseModel):
    id: str
    product_id: str = Field(..., alias="productId")
    # 对应 Spec: Requirement "购物车数量限制" - quantity <= 99
    quantity: int = Field(..., gt=0, le=99)

class OrderItem(BaseModel):
    product_id: str = Field(..., alias="productId")
    # 对应 Spec: Requirement "订单条目定义" - 记录下单时的商品单价与数量
    price_cents: int = Field(..., alias="priceCents")
    quantity: int

class Order(BaseModel):
    id: str
    # 对应 Spec: Requirement "订单实体定义" - status 只能是 PENDING_PAYMENT 或 PAID
    status: Literal["PENDING_PAYMENT", "PAID"]
    total_cents: int = Field(..., ge=0, alias="totalCents")
    items: List[OrderItem]
```

_注：通过 `alias` 实现了 Python 命名规范（snake_case）与 API 契约（camelCase）的解耦，确保内外一致性。_

### 4.3 步骤二：业务逻辑实现

**交互意图**: 实现核心业务规则，如库存扣减和订单创建。

**User Prompt**:

> 请基于 [src/domain/models.py](../ecommerce/ecommerce-mini-python/src/domain/models.py) 和 [design.md](../openspec/changes/archive/2025-01-27-v1-mvp/design.md)，实现 Service 层。（注：v1-mvp 已归档）
> 包含三个服务：
>
> 1. `CatalogService`: 处理库存扣减（原子性模拟）。
> 2. `CartService`: 处理购物车增删。
> 3. `OrderService`: 编排下单流程（检查购物车 -> 扣库存 -> 生成订单 -> 清空购物车）。
>    需实现一个简单的 `MemoryRepo` 用于数据存储。

**AI Response (代码片段)**:

```python
# src/services/order.py
class OrderService:
    def create_order(self, user_id: str) -> Order:
        # 1. 获取购物车
        cart = self.cart_svc.get_cart(user_id)
        if not cart.items:
            raise ValueError("CART_EMPTY")

        order_items = []
        total_cents = 0

        # 2. 验证并扣减库存 (Stock Check Rule)
        for item in cart.items:
            product = self.catalog.get_product(item.product_id)
            if product.stock < item.quantity:
                raise ValueError("OUT_OF_STOCK")

            # 执行扣减
            self.catalog.deduct_stock(product.id, item.quantity)

            # 构建订单项
            order_items.append(OrderItem(
                productId=product.id,
                priceCents=product.price_cents,
                quantity=item.quantity
            ))
            total_cents += product.price_cents * item.quantity

        # 3. 生成订单与清空购物车
        order = Order(
            id=f"order_{uuid.uuid4().hex[:8]}",
            status="PENDING_PAYMENT",
            totalCents=total_cents,
            items=order_items
        )
        self.repo.save(order.id, order)
        self.cart_svc.clear_cart(user_id)
        return order
```

### 4.4 步骤三：接口实现

**交互意图**: 将业务逻辑暴露为 RESTful API，并处理错误码映射。

**User Prompt**:

> 请基于 `src/services/` 和 `specs/catalog-management/spec.md`、`specs/order-management/spec.md` 等能力规范，使用 FastAPI 实现 Web 接口。
> 要求：
>
> 1. 映射所有 Spec 定义的路由。
> 2. 处理错误码映射（如库存不足返回 409）。
> 3. 在启动时初始化测试数据。

**AI Response (代码片段)**:

```python
# src/api/server.py
@app.post("/api/orders", status_code=201)
def create_order(req: CreateOrderRequest):
    try:
        order = order_svc.create_order(req.userId)
        return order
    except ValueError as e:
        # Spec 要求: 通过异常消息字符串区分错误类型
        if str(e) == "OUT_OF_STOCK":
            # Spec 要求: 库存不足返回 409 Conflict
            raise HTTPException(status_code=409, detail="Out of stock")
        # Spec 要求: 购物车为空返回 400 Bad Request
        raise HTTPException(status_code=400, detail=str(e))
```

_注：此处为示例简洁采用字符串比较；生产环境建议定义 `OutOfStockError` 等自定义异常类，以获得更清晰的错误语义与可维护性。_

### 4.5 步骤四：验证与测试

**交互意图**: 编写自动化测试，验证实现是否符合 Spec 定义的行为。

**User Prompt**:

> 请编写 [tests/test_smoke.py](../ecommerce/ecommerce-mini-python/tests/test_smoke.py)，使用 `pytest` 模拟用户行为。
> 测试场景：
>
> 1. 正常下单流程：加购 -> 下单 -> 验库存。
> 2. 异常场景：库存不足时下单，预期返回 409。

**AI Response (代码片段)**:

```python
# tests/test_smoke.py
def test_out_of_stock():
    user_id = "user_2"
    # Add product with stock of 5
    res = client.post("/api/products", json={
        "name": "Limited Item",
        "priceCents": 200,
        "stock": 5
    })
    pid = res.json()["id"]

    # 尝试购买 6 个 (库存仅 5 个)
    client.post("/api/cart/items", json={
        "userId": user_id,
        "productId": pid,
        "quantity": 6
    })

    # 验证是否返回 409
    # 这证明了系统正确处理了业务规则边界
    resp = client.post("/api/orders", json={"userId": user_id})
    assert resp.status_code == 409
    assert "out of stock" in resp.json()["detail"].lower()
```

**执行结果**:

```bash
$ pytest ecommerce/ecommerce-mini-python/tests/test_smoke.py
...
ecommerce/ecommerce-mini-python/tests/test_smoke.py ..           [100%]
==================== 2 passed in 0.35s ====================
```

这证实了 Python 实现完全符合 Spec 的行为预期。

---

## 5. 结论

本案例展示了基于 OpenSpec 的 AI 开发并非简单的“提示词工程”，而是一套严谨的 **工程方法论**。它通过：

1. **显式化** 用户的模糊意图；
2. **原型化** 视觉与交互共识，建立确认断点；
3. **结构化** 系统的设计规格；
4. **自动化** 代码与测试的生成验证；

最终实现了从“视觉原型”到“生产级系统”的平滑演进。在未来的软件开发中，掌握这种 **Prototype-Driven SDD** 模式，将是每一位工程师的核心竞争力。

---

## 附录：项目资产清单

> **快速导航**：想了解 CLI 命令细节与实战案例？→ [OpenSpec 使用手册](./openspec-user-manual.md)　|　想复盘 AI 协作过程？→ 本文档

- OpenSpec CLI 参考: [OpenSpec 使用手册](./openspec-user-manual.md)（init、validate、archive 等命令详解）
- 交互式原型目录: `openspec/changes/<change-name>/prototypes/`（Vue 3 + Tailwind CSS）
- 综合使用手册与实战案例: [openspec-user-manual.md](./openspec-user-manual.md)
- OpenSpec 项目配置: `openspec/config.yaml`（技术栈、架构约束与规则，自动注入每次 AI 规划请求）
- 业务治理基线: `docs/baseline/domain_model.html`（Bounded Context、Capability 映射、状态机、对象关系与 Event-Storming 看板）
- OpenSpec 规范文件: `openspec/changes/archive/2025-01-27-v1-mvp/`（已归档）
  - `proposal.md`: 变更提案
  - `design.md`: 架构设计
  - `specs/catalog-management/spec.md`: 商品目录管理规范
  - `specs/cart-management/spec.md`: 购物车管理规范
  - `specs/order-management/spec.md`: 订单管理规范
  - `specs/payment/spec.md`: 支付规范
  - `specs/error-handling/spec.md`: 错误处理规范
- Node.js 基础实现: `ecommerce/ecommerce-mini/src/{domain,repo,services,http}`
- Python 复刻实现: `ecommerce/ecommerce-mini-python/src/{domain,services,api}`
- 验证脚本: `ecommerce/ecommerce-mini/__tests__/` 及 `ecommerce/ecommerce-mini-python/tests/`
- 演示文稿: [OpenSpec 使用手册](./openspec-user-manual.pptx)（适合培训与分享）
