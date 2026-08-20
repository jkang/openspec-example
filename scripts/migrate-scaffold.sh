#!/bin/bash

# OpenSpec Scaffold Migration Tool
# 用于将本项目的 SDD 脚手架迁移并初始化到新的业务项目中

set -e

SOURCE_DIR=$(pwd)
TARGET_DIR=$1

if [ -z "$TARGET_DIR" ]; then
    echo "用法: $0 <目标项目绝对路径>"
    exit 1
fi

if [ ! -d "$TARGET_DIR" ]; then
    echo "错误: 目标目录 $TARGET_DIR 不存在。"
    exit 1
fi

echo "🚀 开始迁移 OpenSpec SDD 脚手架到: $TARGET_DIR"

# 1. 拷贝核心脚手架目录
echo "-> 1. 拷贝核心脚手架配置 (.trae, .cursor, .agents)..."
cp -r "$SOURCE_DIR/.trae" "$TARGET_DIR/"
cp -r "$SOURCE_DIR/.cursor" "$TARGET_DIR/"
cp -r "$SOURCE_DIR/.agents" "$TARGET_DIR/"

# 2. 拷贝 SDD 引擎工作区 (仅保留配置与模板)
echo "-> 2. 初始化 openspec 工作区..."
mkdir -p "$TARGET_DIR/openspec/changes/ideas"
mkdir -p "$TARGET_DIR/openspec/changes/archive"
mkdir -p "$TARGET_DIR/openspec/specs"
cp "$SOURCE_DIR/openspec/config.yaml" "$TARGET_DIR/openspec/"
cp "$SOURCE_DIR/openspec/schemas/spec-driven.yaml" "$TARGET_DIR/openspec/schemas/" 2>/dev/null || mkdir -p "$TARGET_DIR/openspec/schemas" && cp "$SOURCE_DIR/openspec/schemas/spec-driven.yaml" "$TARGET_DIR/openspec/schemas/"
cp -r "$SOURCE_DIR/openspec/templates" "$TARGET_DIR/openspec/"

# 3. 初始化业务基线文档结构 (使用干净模板)
echo "-> 3. 初始化业务基线模板 (docs/)..."
mkdir -p "$TARGET_DIR/docs/baseline"
mkdir -p "$TARGET_DIR/docs/SOPS"
mkdir -p "$TARGET_DIR/docs/governance"

cp "$SOURCE_DIR/docs/SOPS/SDD_WORKFLOW.md" "$TARGET_DIR/docs/SOPS/"

# 生成初始化的规划文档
cat <<EOF > "$TARGET_DIR/docs/PRODUCT_SENSE.md"
---
name: Product Sense
purpose: 定义产品定位、核心理念及 AI 决策准则
updated_at: $(date +%Y-%m-%d)
---

# 产品定位

## 1. 产品定位/电梯演讲
- **目标用户**: [填写目标用户]
- **痛点问题**: [填写用户痛点]
- **产品及类型**: [填写产品名称及类型]
- **解决方案**: [填写核心解决方案]
- **竞争优势**: [填写竞争优势]

## 2. 核心产品理念
- **可视即价值**: 所有功能变更必须有对应的前端体现。
- **业务闭环优先**: 任何模块必须考虑完整生命周期。

## 3. AI 决策准则
1. **强制 B/C 双端视角**: 设计新功能时必须同时考虑买家端与管理后台逻辑。
2. **拒绝空洞占位符**: 原型必须使用真实的业务数据示例。
EOF

cat <<EOF > "$TARGET_DIR/docs/ROADMAP.md"
---
name: Product Roadmap
purpose: 定义项目当前阶段目标、已完成能力及未来滚动规划
updated_at: $(date +%Y-%m-%d)
---

# 产品路线图 (Product Roadmap)

## 📅 当前状态与滚动计划 (Rolling Plan)

### 🏆 当前 Baseline (已完成能力)
- [能力1: 工程环境初始化]

### 📍 当前阶段 (Current Phase): Phase 1 - 基础能力建设
- **目标**: 建立最小可行性产品 (MVP) 核心链路。
EOF

# 拷贝架构与规范模板 (用户需根据新项目修改)
cp "$SOURCE_DIR/docs/ARCHITECTURE.md" "$TARGET_DIR/docs/"
cp "$SOURCE_DIR/docs/FRONTEND.md" "$TARGET_DIR/docs/"
cp "$SOURCE_DIR/docs/QUALITY_SCORE.md" "$TARGET_DIR/docs/"
cp "$SOURCE_DIR/docs/TESTING_STRATEGY.md" "$TARGET_DIR/docs/"

# 4. 初始化基线 HTML (拷贝带样式的空白模板)
echo "-> 4. 初始化业务基线 HTML..."
cp "$SOURCE_DIR/docs/baseline/domain_model.html" "$TARGET_DIR/docs/baseline/"
cp "$SOURCE_DIR/docs/baseline/business_process.html" "$TARGET_DIR/docs/baseline/"
cp "$SOURCE_DIR/docs/baseline/service_blueprint.html" "$TARGET_DIR/docs/baseline/"

# 5. 生成项目引导文件
cp "$SOURCE_DIR/AGENTS.md" "$TARGET_DIR/"

echo "✅ 迁移完成！"
echo "下一步建议："
echo "1. 进入 $TARGET_DIR 修改 openspec/config.yaml 中的项目名称。"
echo "2. 根据新业务需求修改 docs/ 中的规划与规范文档。"
echo "3. 在 docs/baseline/ 中录入当前系统的真实边界与流程。"
