#!/usr/bin/env bash
# OpenSpec Scaffold Migration Tool (v3+)
# 用于将本仓库的 SDD 引擎迁移到新的业务项目。
#
# 用法:
#   ./scripts/migrate-scaffold.sh <目标项目绝对路径> [--force]
#
# 说明:
#   - 只复制「引擎」文件；不复制本仓库的 specs / changes / epics / baseline 示例。
#   - 不会替目标项目重写 config rules、AGENTS.md 与 init.sh；迁移后按 README §4.3 / §4.4 处理。

set -euo pipefail

SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_DIR="${1:-}"
FORCE="${2:-}"
TODAY="$(date +%Y-%m-%d)"

usage() {
    echo "用法: $0 <目标项目绝对路径> [--force]"
    echo ""
    echo "  --force  目标目录已存在脚手架路径时，允许合并/覆盖"
}

if [ -z "$TARGET_DIR" ]; then
    usage
    exit 1
fi

if [ ! -d "$TARGET_DIR" ]; then
    echo "错误: 目标目录 $TARGET_DIR 不存在。"
    exit 1
fi

if [ -n "$FORCE" ] && [ "$FORCE" != "--force" ]; then
    usage
    exit 1
fi

if [ "$FORCE" != "--force" ]; then
    existing=""
    for path in .opencode .agents .trae .cursor openspec openspec-requirements docs AGENTS.md opencode.jsonc; do
        if [ -e "$TARGET_DIR/$path" ]; then
            existing="$existing $path"
        fi
    done
    if [ -n "$existing" ]; then
        echo "错误: 目标目录已存在以下脚手架路径:$existing"
        echo "确认要合并/覆盖时请追加 --force。"
        exit 1
    fi
fi

if [ "$FORCE" = "--force" ]; then
    echo "警告: --force 会覆盖目标项目中同名文件（含 AGENTS.md / docs / config），请确认已备份。"
fi

echo "开始迁移 OpenSpec SDD 引擎到: $TARGET_DIR"

# 1. opencode 权威入口（只复制 agents / commands / skills，不复制 node_modules）
echo "-> 1. 复制 opencode 入口与跨工具镜像..."
mkdir -p "$TARGET_DIR/.opencode"
for dir in agents commands skills; do
    if [ -d "$SOURCE_DIR/.opencode/$dir" ]; then
        cp -R "$SOURCE_DIR/.opencode/$dir" "$TARGET_DIR/.opencode/"
    fi
done
if [ -f "$SOURCE_DIR/.opencode/.gitignore" ]; then
    cp "$SOURCE_DIR/.opencode/.gitignore" "$TARGET_DIR/.opencode/"
fi
if [ -f "$SOURCE_DIR/opencode.jsonc" ]; then
    cp "$SOURCE_DIR/opencode.jsonc" "$TARGET_DIR/"
fi

for dir in .agents .trae .cursor; do
    if [ -d "$SOURCE_DIR/$dir" ]; then
        cp -R "$SOURCE_DIR/$dir" "$TARGET_DIR/"
    fi
done
if [ -f "$SOURCE_DIR/AGENTS.md" ]; then
    cp "$SOURCE_DIR/AGENTS.md" "$TARGET_DIR/"
fi

# 2. 交付侧引擎（只保留 config / schema / templates）
echo "-> 2. 初始化 openspec 交付侧引擎..."
mkdir -p \
    "$TARGET_DIR/openspec/changes/archive" \
    "$TARGET_DIR/openspec/specs" \
    "$TARGET_DIR/openspec/schemas" \
    "$TARGET_DIR/openspec/templates"
cp "$SOURCE_DIR/openspec/config.yaml" "$TARGET_DIR/openspec/"
cp "$SOURCE_DIR/openspec/schemas/"*.yaml "$TARGET_DIR/openspec/schemas/"
cp -R "$SOURCE_DIR/openspec/templates/." "$TARGET_DIR/openspec/templates/"
touch "$TARGET_DIR/openspec/specs/.gitkeep" "$TARGET_DIR/openspec/changes/archive/.gitkeep"

# 3. 需求侧引擎（config / schema / templates / tools / README）
echo "-> 3. 初始化 openspec-requirements 需求侧引擎..."
mkdir -p \
    "$TARGET_DIR/openspec-requirements/epics" \
    "$TARGET_DIR/openspec-requirements/archive" \
    "$TARGET_DIR/openspec-requirements/schemas" \
    "$TARGET_DIR/openspec-requirements/templates" \
    "$TARGET_DIR/openspec-requirements/tools"
cp "$SOURCE_DIR/openspec-requirements/config.yaml" "$TARGET_DIR/openspec-requirements/"
cp "$SOURCE_DIR/openspec-requirements/README.md" "$TARGET_DIR/openspec-requirements/"
cp "$SOURCE_DIR/openspec-requirements/schemas/"*.yaml "$TARGET_DIR/openspec-requirements/schemas/"
cp -R "$SOURCE_DIR/openspec-requirements/templates/." "$TARGET_DIR/openspec-requirements/templates/"
cp -R "$SOURCE_DIR/openspec-requirements/tools/." "$TARGET_DIR/openspec-requirements/tools/"
touch "$TARGET_DIR/openspec-requirements/epics/.gitkeep" "$TARGET_DIR/openspec-requirements/archive/.gitkeep"

# 4. 治理文档与项目级模板
echo "-> 4. 初始化 docs 治理文档与项目级模板..."
mkdir -p \
    "$TARGET_DIR/docs/SOPS" \
    "$TARGET_DIR/docs/governance" \
    "$TARGET_DIR/docs/baseline/design-system"
cp "$SOURCE_DIR/docs/SOPS/SDD_WORKFLOW.md" "$TARGET_DIR/docs/SOPS/"

cat > "$TARGET_DIR/docs/PRODUCT.md" <<EOF
---
name: Product Vision
purpose: 定义产品定位与价值主张、核心理念及 AI 决策准则
updated_at: $TODAY
---

# 产品定位与价值主张

## 1. 产品定位 / 电梯演讲
- **目标用户**: [填写目标用户]
- **痛点问题**: [填写用户痛点]
- **产品及类型**: [填写产品名称及类型]
- **解决方案**: [填写核心解决方案]
- **竞争优势**: [填写竞争优势]

## 2. 核心产品理念
- [填写产品理念 1]
- [填写产品理念 2]

## 3. AI 决策准则
1. [填写 AI 决策准则 1]
2. [填写 AI 决策准则 2]
EOF

cat > "$TARGET_DIR/docs/ROADMAP.md" <<EOF
---
name: Product Roadmap
purpose: 定义项目当前阶段目标、已完成能力及未来滚动规划
updated_at: $TODAY
---

# 产品路线图 (Product Roadmap)

## 📅 当前状态与滚动计划 (Rolling Plan)

### 🏆 当前 Baseline (已完成能力)
- [能力 1: 工程环境初始化]

## 📍 当前阶段 (Current Phase) — Phase 1: 基础能力建设

### 🎯 目标 (Target)
[填写本阶段目标]

### 📥 In Scope
- **Epic 1.1 \`<epic-key>\` — [Epic 名称]**：[一句话描述]

### 🚫 Out of Scope
- [明确不做的内容]

### ✅ Exit Criteria（可度量）
- [ ] [可度量退出标准 1]
- [ ] [可度量退出标准 2]
EOF

write_doc_placeholder() {
    local file="$1"
    local name="$2"
    local purpose="$3"
    cat > "$TARGET_DIR/docs/$file" <<EOF
---
name: $name
purpose: $purpose
updated_at: $TODAY
---

# $name

> **迁移占位**：请按目标项目重写本文件。可参考源仓库同名文档的结构，但不要沿用电商业务规则、ZAPP 设计令牌或 Node/Python 示例。

## TODO
- [ ] 补充目标项目的具体规范
- [ ] 与 \`openspec/config.yaml\`、\`openspec-requirements/config.yaml\` 的对应 rules 对齐
EOF
}

write_doc_placeholder "ARCHITECTURE.md" "Backend Architecture" "定义目标项目的分层架构与技术栈"
write_doc_placeholder "FRONTEND.md" "Frontend Governance" "定义目标项目的 UI 规范与设计系统引用"
write_doc_placeholder "TESTING_STRATEGY.md" "Testing Strategy" "定义分层测试、BDD 标签与 E2E 入口"
write_doc_placeholder "QUALITY_SCORE.md" "Quality Score" "定义交付质量底线与验证门禁"

cat > "$TARGET_DIR/docs/baseline/design-system/README.md" <<EOF
# Design System（待初始化）

本目录是目标项目的**唯一 UI 事实来源**。当前为迁移占位，尚未生成设计系统。

## 初始化时机

首个涉及 UI 的 Epic 在进入原型阶段前，调用 \`openspec-requirements/tools/brand-design-system/\` 生成：

- 三层 design tokens（primitive → semantic → component）
- 组件规格与 Do / Don't
- 供原型与正式实现消费的令牌映射

## 约束

- 原型、specs 与正式实现必须以本目录为准。
- 修改本目录时，需同步评估 \`docs/FRONTEND.md\`、两个 \`config.yaml\` 的 \`rules.prototype\` 与相关 skills。
EOF

write_baseline_placeholder() {
    local file="$1"
    local title="$2"
    local hint="$3"
    cat > "$TARGET_DIR/docs/baseline/$file" <<EOF
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>$title（待初始化）</title>
</head>
<body>
  <h1>$title（待初始化）</h1>
  <p>Last Updated: $TODAY</p>
  <p>$hint</p>
  <p>请使用对应 baseline 技能初始化真实内容后，再进入需求/交付流程。</p>
</body>
</html>
EOF
}

write_baseline_placeholder "service_blueprint.html" "Service Blueprint" "请使用 baseline/blueprint 技能初始化 SB-STAGE-* / SB-<LANE>-* 稳定锚点。"
write_baseline_placeholder "business_process.html" "Business Process" "请使用 baseline/process-flow 技能初始化 L1 / L2 / L3 流程节点。"
write_baseline_placeholder "domain_model.html" "Domain Model" "请使用 baseline/domain-model 技能初始化 Bounded Context → Capability 映射。"

# 5. 通用脚本
echo "-> 5. 复制交付看板与迁移脚本..."
mkdir -p "$TARGET_DIR/scripts"
cp "$SOURCE_DIR/scripts/generate_delivery_board.py" "$TARGET_DIR/scripts/"
cp "$SOURCE_DIR/scripts/migrate-scaffold.sh" "$TARGET_DIR/scripts/"

# 清理 macOS 元数据
find "$TARGET_DIR" -name '.DS_Store' -type f -delete 2>/dev/null || true

echo ""
echo "✅ 迁移完成: $TARGET_DIR"
echo ""
echo "已复制:"
echo "  - .opencode/{agents,commands,skills} + opencode.jsonc"
echo "  - .agents/ .trae/ .cursor/ + AGENTS.md"
echo "  - openspec/{config.yaml,schemas,templates} + 空 specs/changes"
echo "  - openspec-requirements/{config.yaml,schemas,templates,tools,README.md} + 空 epics/archive"
echo "  - docs/SOPS/SDD_WORKFLOW.md + 项目级文档占位"
echo "  - docs/baseline/{service_blueprint,business_process,domain_model}.html 占位 + design-system/README.md"
echo "  - scripts/{generate_delivery_board.py,migrate-scaffold.sh}"
echo ""
echo "下一步:"
echo "1. 重写 openspec/config.yaml 与 openspec-requirements/config.yaml 的 context/planning/rules（不要只改项目名）。"
echo "2. 重写 AGENTS.md 的项目名、模块路径、测试入口与角色契约；按目标项目调整 docs/SOPS/SDD_WORKFLOW.md 的命令入口与示例。"
echo "3. 重写 docs/PRODUCT.md、docs/ROADMAP.md；用 baseline 技能初始化 docs/baseline/ 三个 HTML。"
echo "4. 首个 UI Epic 前用 brand-design-system 生成 docs/baseline/design-system/。"
echo "5. 按需接入 init.sh 与 e2e-tests；运行 python3 scripts/generate_delivery_board.py 生成看板。"
echo "6. 运行 README §4.7 的迁移自检清单。"
