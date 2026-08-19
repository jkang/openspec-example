## Purpose

<!-- 为本次变更的 apply 提供可审计的本地验证证据，防止 sync 之前仍存在编译失败或核心链路 bug -->

## Scope

<!-- 记录验证覆盖的模块、接口以及关键风险目标 -->

## Hard Gates

- **Schema validate**: PENDING (运行 `openspec validate`)
- **Node test**: PENDING (运行 `./init.sh node:test`)
- **Python test**: PENDING (运行 `./init.sh python:test`)
- **Frontend build**: PENDING (运行 `./init.sh vue:build`)

## Soft Gates

- **E2E cucumber**: PENDING (运行 `./init.sh e2e:run`)

## Evidence Index

<!-- 记录验证过程中的关键证据，如关联测试文件、关键断言、手动测试截图/日志链接等 -->
- **关联测试文件**:
  - [path/to/test.js](file:///path/to/test.js)
- **关键断言**:
  - [ ] 核心逻辑 X 在 Y 场景下返回 Z
