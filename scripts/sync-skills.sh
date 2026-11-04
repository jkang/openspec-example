#!/usr/bin/env bash
set -euo pipefail

# 同步 SDD 工作流技能与命令，避免跨工具漂移。
# 权威源：.agents/skills（技能）、.agents/commands（命令）
# 目标：.cursor/skills、.trae/commands、.cursor/commands
# 说明：Trae 不再保存 skills 目录，仅保留 commands，减少重复占用。

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "[sync] skills: .agents/skills -> .cursor/skills"
rsync -a --delete .agents/skills/ .cursor/skills/

echo "[sync] commands: .agents/commands -> .trae/commands"
rsync -a .agents/commands/ .trae/commands/

echo "[sync] commands: .agents/commands -> .cursor/commands"
rsync -a .agents/commands/ .cursor/commands/

echo "[check] skills parity"
diff -rq .agents/skills .cursor/skills

echo "[check] commands parity"
diff -rq .agents/commands .trae/commands
diff -rq .agents/commands .cursor/commands

echo "[ok] sync complete"
