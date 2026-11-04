#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""PM 工作台只读扫描器（openspec-pm-board / pm-board-scanner v0.1.0）。

定位
----
把 OpenSpec 仓库里的「PM 侧事实」聚合成一份确定性 JSON（`PmBoardSnapshot`），
供 DSH Web UI 插件 `@local/dsh-openspec-pm-board` 的 Host 半身通过
`python3 scripts/pm_board_scan.py --root <repoRoot> --json` 调用。

数据源（只读）
--------------
  - docs/ROADMAP.md                       规划层：阶段进度 / 当前阶段 / 规划 Epic / draft Story
  - docs/PRODUCT.md、docs/baseline/*.html  业务知识资产（Last Updated / 内容计数 / 漂移候选）
  - docs/baseline/design-system/          设计系统（无日期，只能 mtime）
  - docs/governance/reviews/              治理评审归档（今天为空）
  - openspec-requirements/epics/          需求侧活跃 Epic（STATUS.md 为唯一状态源）
  - openspec-requirements/archive/        需求侧历史 Epic（历史豁免 v6 MUST）
  - openspec/epic-*.story-list.json       Epic 队列（R14 孤儿检测）
  - openspec/changes/                     交付侧活跃 change（只读）
  - openspec/changes/archive/             交付侧归档 change + story-list
  - openspec/specs/                       主规格目录（capability 口径核对）

复用
----
仓库聚合器 `scripts/generate_delivery_board.py`（纯标准库，714 行）作为底层：
以 importlib 从文件路径载入（**不写 __pycache__、不修改该文件**），注入
`module.ROOT = <repoRoot>` / `module.TODAY = <snapshot date>` 后调用
`scan_roadmap / scan_epics / scan_ideas / scan_active_changes / scan_verify /
scan_archives / scan_baseline`，在其结果上叠加 PM 语义层（R01–R18 规则引擎、
Story 追踪、HITL 检查点、资产 review、数据卫生）。

已知缺陷在本层修正（**不回改仓库脚本**）
----------------------------------------
  - `🔄 部分 done` 不得被当成 `done`（旧脚本按子串判 done）；
  - ROADMAP 规划 Epic 正则只匹配 `**Epic N ...`，漏掉「代表性 Epic: 'epic-key'」与 draft 表；
  - `PHASE_NAMES` 兜底表 Phase 6/7/8 名称与 ROADMAP 相反（本层换成正确兜底表）。

安全 / 约束
-----------
  - 纯标准库；只读，不写被扫描目录（不生成 __pycache__、不传 --out、不落盘）；
  - 单数据源失败 → `sourceHealth[].issues` + `warnings[]` + `generator.mode="degraded"`，
    不整体失败；仓库根非法 / 聚合器载入失败 → stderr + exit 2；
  - 除 `generatedAt` 外输出确定（无随机、无本地时间戳散落）；
  - 目标性能 < 1.5s（实测约 0.2–0.4s，其中 git 调用约 0.1s）。

用法
----
  python3 scripts/pm_board_scan.py --root <repoRoot> --json [--days 7]
"""

import argparse
import datetime
import glob
import importlib.util
import json
import os
import re
import subprocess
import sys
from pathlib import Path

# 重要：importlib 载入仓库聚合器时不要写 __pycache__（保持被扫描仓库只读）。
sys.dont_write_bytecode = True

# ─────────────────────────────── 常量 ───────────────────────────────

SCHEMA_VERSION = 1
GENERATOR_NAME = "pm-board-scanner"
GENERATOR_VERSION = "0.1.0"

#: ROADMAP 中缺失阶段标题时的正确兜底名称（修正旧脚本 Phase 6/7/8 名称错位）。
PHASE_FALLBACK = {
    1: "MVP 交易闭环",
    2: "营销与运营后台",
    3: "订单履约闭环",
    4: "用户账户体系",
    5: "数据洞察与经营决策",
    6: "微信小程序渠道",
    7: "回款与应收账款闭环",
    8: "运营效率增强",
    9: "会员与复购",
}

STAGE_ORDER = ["research", "explore", "prototype", "arch", "storymap", "stories", "test-design"]

STAGE_LABELS = {
    "research": "需求调研（research.md）",
    "explore": "探索（idea.md）",
    "prototype": "原型（prototypes/，Epic 整体）",
    "arch": "架构影响（architecture-impact.md，OPT）",
    "storymap": "需求拆分（storymap.md）",
    "stories": "Story 交付（stories/*/story.md）",
    "test-design": "测试设计（test-design.md，MUST）",
}

STAGE_CHECKPOINTS = {
    "research": "H1",
    "explore": "H2",
    "prototype": "H3",
    "arch": "H4",
    "storymap": "H5",
    "stories": "H6",
    "test-design": "H7",
}

#: 无 durable 持久记录的 HITL 检查点（prototype H3 / storymap H5）→ 只能推断。
INVISIBLE_CHECKPOINT_STAGES = ("prototype", "storymap")

REQUIRED_STAGES = {"research", "explore", "storymap", "stories", "test-design"}
OPTIONAL_STAGES = {"prototype", "arch"}  # prototype 仅 UI Epic 必做；arch 为 OPT

UI_KEYWORDS = ("小程序", "页面", "后台", "看板", "Web", "UI", "原型", "H5", "前端", "C 端", "B 端")

WAIVER_RE = re.compile(r"授权跳过|全程自主|lead\s*已授权|已授权\s*全程|授权自主")
DATE_RE = re.compile(r"(20\d{2}-\d{2}-\d{2})")
STAGE_ROW_RE = re.compile(r"^\|\s*([a-z][a-z-]*)（[^）]*）\s*\|(.*)$")
STORY_ROW_RE = re.compile(r"^\|\s*(story-[a-z0-9-]+)\s*\|(.*)$")
LIFECYCLE_RE = re.compile(r"^\s*-\s*\[([ xX])\]\s*\*\*(active|all-handoff|all-done|archived)\*\*")
EPIC_KEY_LINE_RE = re.compile(r"Epic Key:\s*`([^`]+)`")
EPIC_TITLE_RE = re.compile(r"^#\s+Epic 状态机[:：]\s*(.+?)\s*$", re.M)
ROADMAP_HEADER_RE = re.compile(r"^(#{2,4})\s+(.*?Phase\s*(\d+)\s*:\s*(.+?))\s*$", re.M)
MD_EMPHASIS_RE = re.compile(r"[*`]+")

BOARD_ORDER = [
    ("pmTodo", "PM 待启动", 1),
    ("aiInProgress", "AI 正在做（推断）", 2),
    ("waitingConfirm", "产出已就绪 · 等待 PM 确认", 3),
    ("confirmed", "已确认", 4),
    ("handoffDone", "已交接开发", 5),
    ("devInProgress", "开发中", 6),
    ("done", "已完成", 7),
    ("na", "不适用", 8),
    ("blocked", "阻塞 / 告警", 9),
    ("unknown", "未知", 10),
]
BOARD_TITLES = {key: title for key, title, _ in BOARD_ORDER}
BOARD_KEYS = [key for key, _, _ in BOARD_ORDER]

SEVERITY_RANK = {"blocker": 0, "warning": 1, "info": 2}

DEFAULT_DAYS = 7


class FatalError(RuntimeError):
    """整体失败（仓库根非法 / 聚合器载入失败）→ stderr + exit 2。"""


# ─────────────────────────────── 工具函数 ───────────────────────────────


def _rel(root, path):
    """绝对/相对路径 → 仓库相对 posix 路径。"""
    try:
        return os.path.relpath(os.path.abspath(path), os.path.abspath(root)).replace(os.sep, "/")
    except ValueError:
        return str(path)


def _read(path):
    """安全读取 UTF-8 文本（不存在 / 读取失败返回空串）。"""
    try:
        with open(path, "r", encoding="utf-8") as fh:
            return fh.read()
    except (OSError, UnicodeDecodeError):
        return ""


def _read_json(path):
    try:
        with open(path, "r", encoding="utf-8") as fh:
            return json.load(fh)
    except (OSError, ValueError, UnicodeDecodeError):
        return None


def _exists(path):
    try:
        return os.path.exists(path)
    except OSError:
        return False


def _mtime_date(path):
    try:
        return datetime.date.fromtimestamp(os.path.getmtime(path))
    except OSError:
        return None


def _latest_mtime(paths):
    dates = [d for d in (_mtime_date(p) for p in paths) if d]
    return max(dates) if dates else None


def _line_no(text, index):
    return text.count("\n", 0, max(0, index)) + 1


def _dedupe_evidence(items):
    """EvidenceRef 去重（同 path+kind+locator 只保留首个）。"""
    seen = set()
    result = []
    for item in items or []:
        key = (item.get("path"), item.get("kind"), item.get("locator"), item.get("value"))
        if key in seen:
            continue
        seen.add(key)
        result.append(item)
    return result


def _ev(path, kind, locator=None, value=None):
    item = {"path": path, "kind": kind}
    if locator:
        item["locator"] = locator
    if value is not None:
        item["value"] = value
    return item


def _clean_title(text):
    """去掉 markdown 强调/反引号与首尾空白。"""
    if not text:
        return ""
    return MD_EMPHASIS_RE.sub("", text).strip()


def _parse_iso_date(text):
    if not text:
        return None
    try:
        return datetime.date.fromisoformat(text)
    except (TypeError, ValueError):
        match = DATE_RE.search(str(text))
        if match:
            try:
                return datetime.date.fromisoformat(match.group(1))
            except ValueError:
                return None
    return None


def _action(label, kind="session", prompt=None, command=None, enabled=True, action_id=None,
            requires_hitl=False, eta_minutes=None):
    """构造 nextAction（UI 一键开会话 / 提示信息）。"""
    item = {"label": label, "kind": kind}
    if kind == "session":
        item["agentPreset"] = "sdd-pm"
    if prompt is not None:
        item["prompt"] = prompt
    if command is not None:
        item["command"] = command
    item["enabled"] = bool(enabled)
    if action_id:
        item["id"] = action_id
    item["requiresHitl"] = bool(requires_hitl)
    if eta_minutes is not None:
        item["etaMinutes"] = eta_minutes
    return item


def _freshness(age_days):
    if age_days is None:
        return "unknown"
    if age_days <= 30:
        return "fresh"
    if age_days <= 60:
        return "aging"
    return "stale"


class HealthLog:
    """sourceHealth 收集器。"""

    def __init__(self, generated_at):
        self.generated_at = generated_at
        self.entries = []

    def add(self, source_id, path, ok=True, issues=None, counts=None):
        entry = {
            "id": source_id,
            "path": path,
            "ok": bool(ok),
            "parsedAt": self.generated_at,
            "issues": list(issues or []),
        }
        if counts:
            entry["counts"] = counts
        self.entries.append(entry)
        return entry

    @property
    def degraded(self):
        return any(not entry["ok"] for entry in self.entries)


# ─────────────────────────────── 载入仓库聚合器 ───────────────────────────────


def load_generator(root):
    """从文件路径载入仓库聚合器（不修改它、不写 pycache）。"""
    path = os.path.join(str(root), "scripts", "generate_delivery_board.py")
    if not os.path.isfile(path):
        raise FatalError("找不到仓库聚合器脚本：%s" % path)
    try:
        spec = importlib.util.spec_from_file_location("dsh_pm_board_generator", path)
        if spec is None or spec.loader is None:
            raise FatalError("无法为仓库聚合器创建 import spec：%s" % path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
    except FatalError:
        raise
    except Exception as exc:  # noqa: BLE001 - 载入失败即整体失败（exit 2）
        raise FatalError("无法载入仓库聚合器 scripts/generate_delivery_board.py：%s" % exc)
    return module


def _default_repo_root():
    """从本文件位置向上找仓库根（含 docs/ROADMAP.md + openspec-requirements/）。"""
    here = Path(__file__).resolve().parent
    for candidate in [here] + list(here.parents):
        if (candidate / "docs" / "ROADMAP.md").is_file() and (candidate / "openspec-requirements").is_dir():
            return candidate
    return None


# ─────────────────────────────── git 元信息（可选） ───────────────────────────────


def _git(root, *args):
    try:
        proc = subprocess.run(
            ["git", "-C", str(root)] + list(args),
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            timeout=3.0,
            check=False,
        )
        if proc.returncode != 0:
            return None
        return proc.stdout.decode("utf-8", "replace").strip()
    except (OSError, subprocess.SubprocessError):
        return None


def scan_git(root):
    """git 信息（可选：仓库无 git / 无 git 命令时全部为 null）。"""
    commit = _git(root, "rev-parse", "--short", "HEAD")
    commit_date = _git(root, "log", "-1", "--format=%cs")
    branch = _git(root, "branch", "--show-current") or None
    status = _git(root, "status", "--porcelain")
    dirty = bool(status) if status is not None else False
    return {
        "gitCommit": commit or None,
        "gitCommitDate": commit_date or None,
        "gitBranch": branch,
        "dirty": dirty,
    }


# ─────────────────────────────── ROADMAP 规划层 ───────────────────────────────


def _split_phase_sections(text):
    """切分 ROADMAP 阶段章节（按标题层级决定章节结束位置）。"""
    headers = []
    for match in ROADMAP_HEADER_RE.finditer(text):
        headers.append({
            "level": len(match.group(1)),
            "no": int(match.group(3)),
            "raw": match.group(2).strip(),
            "name_raw": match.group(4).strip(),
            "start": match.start(),
            "header_end": match.end(),
            "line": _line_no(text, match.start()),
        })
    for header in headers:
        # 章节结束 = 之后第一个「层级 <= 本标题」的 markdown 标题（含无 Phase 编号的 `##`）
        end = len(text)
        boundary = re.search(r"^#{1,%d}\s+" % header["level"], text[header["header_end"]:], re.M)
        if boundary:
            end = header["header_end"] + boundary.start()
        header["section"] = text[header["header_end"]:end]
    return headers


def _phase_subsection(section, heading_keyword):
    """取阶段章节内某 `###` 子章节正文（heading_keyword 命中标题）。"""
    lines = section.splitlines()
    start = None
    for idx, line in enumerate(lines):
        if re.match(r"^###\s+", line) and heading_keyword in line:
            start = idx + 1
            continue
        if start is not None and re.match(r"^#{2,4}\s+", line):
            return "\n".join(lines[start:idx]).strip()
    if start is None:
        return ""
    return "\n".join(lines[start:]).strip()


def _bullets(block):
    """从 markdown 段落抽取 bullet / 编号列表文本。"""
    items = []
    for line in block.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        match = re.match(r"^[-*]\s+(.*)$", stripped)
        if match:
            items.append(match.group(1).strip())
            continue
        match = re.match(r"^(\d+)[.、]\s+(.*)$", stripped)
        if match:
            items.append(match.group(2).strip())
    return items


def _phase_draft_rows(section):
    """解析阶段章节内的 draft Story 拆分表（`epic-key` | `story-key` | 说明 | P0）。"""
    rows = []
    pattern = re.compile(
        r"^\|\s*`([a-z0-9-]+)`\s*\|\s*`([a-z0-9-]+)`\s*\|\s*([^|]*?)\s*\|\s*(P[0-3])\s*\|",
        re.M,
    )
    for match in pattern.finditer(section):
        rows.append({
            "epicKey": match.group(1),
            "storyId": match.group(2),
            "title": match.group(3).strip(),
            "priority": match.group(4),
        })
    return rows


def _epic_refs(section):
    """抽取章节内出现的 Epic key（反引号 / 代表性 Epic 行 / draft 表）。"""
    refs = []
    for key in re.findall(r"`(epic-[a-z0-9-]+)`", section):
        if key not in refs:
            refs.append(key)
    for match in re.finditer(r"代表性\s*Epics?\s*[:：]?\s*([^\n]+)", section):
        for key in re.findall(r"epic-[a-z0-9-]+", match.group(1)):
            if key not in refs:
                refs.append(key)
    return refs


def _epic_title_from_section(section, key):
    """从 ROADMAP 文本抽取 Epic 的中文标题（**Epic 9.1 `key` — 标题**）。"""
    pattern = r"\*\*Epic\s*[\d.]*\s*`%s`\s*[—\-–]\s*([^*]+)\*\*" % re.escape(key)
    match = re.search(pattern, section)
    if match:
        return _clean_title(match.group(1))
    return ""


def scan_roadmap(root, gb_mod, health):
    """规划层：阶段进度 / 当前阶段 / 规划 Epic / draft Story（修正旧脚本三处缺陷）。"""
    path = os.path.join(str(root), "docs", "ROADMAP.md")
    text = _read(path)
    issues = []
    if not text:
        issues.append("ROADMAP.md 不存在或为空，规划层降级")
        health.add("roadmap", "docs/ROADMAP.md", False, issues)
        return {
            "current": {"no": None, "name": "", "status": "current"},
            "phases": [],
            "planned": [],
            "frontMatter": {},
            "base": {"current": {"no": None, "name": ""}, "phases": [], "planned": []},
        }

    # 1) 旧脚本兜底（status 计算可复用）；其 phase 名称/planned 有已知缺陷，由本层覆盖。
    try:
        base = gb_mod.scan_roadmap()
    except Exception as exc:  # noqa: BLE001 - 单源解析异常 → degraded，不整体失败
        base = {"current": {"no": None, "name": ""}, "phases": [], "planned": []}
        issues.append("旧扫描器 scan_roadmap 异常：%s" % exc)
        health.add("roadmap", "docs/ROADMAP.md", False, issues)
    base_by_no = {phase["no"]: phase for phase in base.get("phases", [])}

    # 2) 本层权威解析：阶段标题 → 名称/状态/章节
    sections = _split_phase_sections(text)
    section_by_no = {}
    stale_fallback_notes = []
    for header in sections:
        name = header["name_raw"]
        # 名称清理：去掉状态后缀与括号说明（Phase 6 有嵌套括号，需从第一个括号截断）
        name = re.sub(r"[（(].*$", "", name).strip()
        name = re.sub(r"[✅✓].*$", "", name).strip()
        status_marker = header["raw"]
        if "当前阶段" in status_marker or "Current Phase" in status_marker:
            status = "current"
        elif "✅" in status_marker or "已完成" in status_marker or "已交付" in status_marker:
            status = "done"
        elif "未来" in status_marker or "未启动" in status_marker or "下一阶段" in status_marker:
            status = "future"
        else:
            status = None
        section_by_no[header["no"]] = {
            "no": header["no"],
            "name": name,
            "status": status,
            "section": header["section"],
            "line": header["line"],
        }

    # 3) 阶段列表：编号以 ROADMAP 实际最大编号 + 旧脚本兜底为准
    max_no = max(list(base_by_no.keys()) + list(section_by_no.keys()) + [0])
    phases = []
    for no in range(1, max_no + 1):
        header = section_by_no.get(no)
        base_phase = base_by_no.get(no)
        name = (header["name"] if header and header["name"] else "") or PHASE_FALLBACK.get(no) \
            or ((base_phase or {}).get("name") or "Phase %d" % no)
        status = (header or {}).get("status") or (base_phase or {}).get("status") or "future"
        if header and header["name"] and base_phase and base_phase.get("name") != header["name"]:
            stale_fallback_notes.append((no, base_phase.get("name"), header["name"]))
        section = (header or {}).get("section", "")
        draft_stories = [
            {"storyId": row["storyId"], "title": _clean_title(row["title"]), "priority": row["priority"],
             "epicKey": row["epicKey"]}
            for row in _phase_draft_rows(section)
        ]
        planned_epics = [
            {"key": key, "title": _epic_title_from_section(section, key), "registered": False,
             "enteredRequirements": False, "phaseNo": no}
            for key in _epic_refs(section)
        ]
        phases.append({
            "no": no,
            "name": name,
            "status": status,
            "line": (header or {}).get("line"),
            "plannedEpics": planned_epics,
            "draftStories": draft_stories,
            "exitCriteria": _bullets(_phase_subsection(section, "Exit Criteria")),
            "inScope": _bullets(_phase_subsection(section, "In Scope")),
            "outOfScope": _bullets(_phase_subsection(section, "Out of Scope")),
            "evidence": [
                _ev("docs/ROADMAP.md", "artifact", "line:%d" % header["line"],
                    "Phase %d: %s" % (no, name))
            ] if header else [],
            "links": {"openPath": "docs/ROADMAP.md"},
        })
    phases.sort(key=lambda item: item["no"])

    # 3b) 旧脚本 PHASE_NAMES 兜底表已过期（G7）：与 ROADMAP 标题名逐相位比对，保留告警证据
    gb_phase_names = getattr(gb_mod, "PHASE_NAMES", {}) or {}
    for phase in phases:
        header = section_by_no.get(phase["no"])
        gb_name = gb_phase_names.get(phase["no"])
        if header and header["name"] and gb_name and gb_name != header["name"]:
            stale_fallback_notes.append((phase["no"], gb_name, header["name"]))
    # 去重（保持稳定顺序）
    seen_notes = set()
    unique_notes = []
    for note in stale_fallback_notes:
        if note in seen_notes:
            continue
        seen_notes.add(note)
        unique_notes.append(note)
    stale_fallback_notes = unique_notes

    current_no = base.get("current", {}).get("no")
    current_phase = next((phase for phase in phases if phase["no"] == current_no), None)
    if current_phase is None:
        current_phase = next((phase for phase in phases if phase["status"] == "current"), None)
    if current_phase is None:
        current_phase = {"no": None, "name": "", "status": "current"}

    # 4) 修正旧脚本「规划中 Epic」正则漏解析：Phase 8/9 的 `代表性 Epic` / draft 表
    planned = []
    for phase in phases:
        if phase["status"] in ("future", "current"):
            for item in phase["plannedEpics"]:
                planned.append({"key": item["key"], "title": item["title"],
                                "phaseNo": phase["no"], "phaseName": phase["name"]})
    if base.get("planned") and not planned:
        planned = [{"key": item["key"], "title": item.get("title", ""), "phaseNo": None, "phaseName": ""}
                   for item in base["planned"]]

    front_matter = {}
    fm_match = re.search(r"^---\s*\n(.*?)\n---", text, re.S | re.M)
    if fm_match:
        for line in fm_match.group(1).splitlines():
            pair = re.match(r"^([a-zA-Z_]+)\s*:\s*(.*)$", line)
            if pair:
                front_matter[pair.group(1)] = pair.group(2).strip()

    health.add(
        "roadmap", "docs/ROADMAP.md", True, issues,
        {
            "phases": len(phases),
            "currentPhase": current_phase.get("no") or 0,
            "plannedEpics": len(planned),
            "draftStories": sum(len(phase["draftStories"]) for phase in phases),
        },
    )
    return {
        "current": {"no": current_phase.get("no"), "name": current_phase.get("name", ""),
                    "status": "current"},
        "phases": phases,
        "planned": planned,
        "frontMatter": front_matter,
        "base": base,
        "basePhases": base_by_no,
        "staleFallbackNotes": stale_fallback_notes,
        "text": text,
    }


# ─────────────────────────────── 需求侧 Epic 扫描 ───────────────────────────────


def _stage_artifacts(epic_dir, stage):
    """阶段制品存在性（与需求侧 Schema 制品映射一致）。"""
    stories_dir = os.path.join(epic_dir, "stories")
    if stage == "research":
        candidates = [os.path.join(epic_dir, "research.md")]
    elif stage == "explore":
        candidates = [os.path.join(epic_dir, "idea.md")]
    elif stage == "prototype":
        candidates = glob.glob(os.path.join(epic_dir, "prototypes", "**", "*.html"), recursive=True)
    elif stage == "arch":
        candidates = [os.path.join(epic_dir, "architecture-impact.md")]
    elif stage == "storymap":
        candidates = [os.path.join(epic_dir, "storymap.md")]
    elif stage == "stories":
        candidates = glob.glob(os.path.join(stories_dir, "*", "story.md"))
    elif stage == "test-design":
        candidates = [os.path.join(epic_dir, "test-design.md")] + glob.glob(
            os.path.join(stories_dir, "*", "test-design.md")
        )
    else:
        candidates = []
    return sorted({os.path.abspath(path) for path in candidates if os.path.isfile(path)})


def _parse_status_md(text):
    """解析 STATUS.md：阶段表 / Story 表 / Epic 生命周期（唯一状态源）。"""
    info = {
        "title": "",
        "key": "",
        "stage_rows": {},
        "story_rows": [],
        "lifecycle": {"active": False, "allHandoff": False, "allDone": False, "archived": False},
    }
    title_match = EPIC_TITLE_RE.search(text)
    if title_match:
        info["title"] = _clean_title(title_match.group(1))
    key_match = EPIC_KEY_LINE_RE.search(text)
    if key_match:
        info["key"] = key_match.group(1).strip()
    for idx, line in enumerate(text.splitlines(), 1):
        match = STAGE_ROW_RE.match(line)
        if match:
            cells = [cell.strip() for cell in match.group(2).split("|")]
            if cells:
                info["stage_rows"][match.group(1).lower()] = {
                    "cell": cells[0],
                    "note": cells[1] if len(cells) > 1 else "",
                    "line": idx,
                }
            continue
        match = STORY_ROW_RE.match(line)
        if match:
            cells = [cell.strip() for cell in match.group(2).split("|")]
            info["story_rows"].append({
                "id": match.group(1),
                "status": cells[0] if cells else "",
                "changeName": (cells[1] if len(cells) > 1 else "").strip(" `"),
                "devArchive": cells[2] if len(cells) > 2 else "",
                "line": idx,
            })
            continue
        match = LIFECYCLE_RE.match(line)
        if match:
            checked = match.group(1).lower() == "x"
            label = match.group(2)
            if label == "active":
                info["lifecycle"]["active"] = checked
            elif label == "all-handoff":
                info["lifecycle"]["allHandoff"] = checked
            elif label == "all-done":
                info["lifecycle"]["allDone"] = checked
            elif label == "archived":
                info["lifecycle"]["archived"] = checked
    return info


def _parse_signoff(text, rel_path):
    """解析制品文末 sign-off 段落（只认 `- [x]` / `- [ ]` 行 + 标题关键词）。"""
    if not text:
        return None
    headings = [(idx, match) for idx, match in enumerate(re.finditer(r"^##\s+(.+?)\s*$", text, re.M))]
    chosen = None
    for idx, match in headings:
        if re.search(r"HITL|Sign-[Oo]ff|确认结论", match.group(1)):
            chosen = (idx, match)
    if chosen is None:
        return None
    idx, match = chosen
    start = match.end()
    end = len(text)
    for later_idx, later in headings:
        if later_idx > idx:
            end = later.start()
            break
    segment = text[start:end]
    rows = []
    for row in re.finditer(r"^\s*[-*]\s*\[([ xX])\]\s*(.+?)\s*$", segment, re.M):
        rows.append({"checked": row.group(1).lower() == "x", "text": row.group(2),
                     "line": _line_no(text, start + row.start())})
    checked = sum(1 for row in rows if row["checked"])
    dates = DATE_RE.findall(segment)
    confirmed_at = dates[0] if dates else None
    if not rows:
        # §3.3 兜底：有段落但 0 个 checkbox → 视为「无 sign-off 结构」，降级为 medium 推断
        return {
            "path": rel_path,
            "section": match.group(1).strip(),
            "visible": False,
            "traceKind": "free-text",
            "checked": 0,
            "total": 0,
            "confirmed": None,
            "confirmedAt": confirmed_at,
            "line": _line_no(text, match.start()),
        }
    return {
        "path": rel_path,
        "section": match.group(1).strip(),
        "visible": True,
        "traceKind": "checkbox",
        "checked": checked,
        "total": len(rows),
        "confirmed": checked == len(rows),
        "confirmedAt": confirmed_at,
        "line": _line_no(text, match.start()),
    }


def _stage_signoff(epic_dir, rel_dir, stage):
    """读取某阶段制品的 sign-off 段落。"""
    if stage in ("research", "explore", "arch"):
        filename = {"research": "research.md", "explore": "idea.md",
                    "arch": "architecture-impact.md"}[stage]
        path = os.path.join(epic_dir, filename)
        text = _read(path)
        return _parse_signoff(text, rel_dir + "/" + filename) if text else None
    if stage == "test-design":
        candidates = [(os.path.join(epic_dir, "test-design.md"), rel_dir + "/test-design.md")]
        for path in sorted(glob.glob(os.path.join(epic_dir, "stories", "*", "test-design.md"))):
            candidates.append((path, rel_dir + "/stories/" + os.path.basename(os.path.dirname(path))
                               + "/test-design.md"))
        for path, rel in candidates:
            text = _read(path)
            if text:
                return _parse_signoff(text, rel)
        return None
    return None


def _stage_hitl_signal(stage, epic_dir, rel_dir, row, waiver):
    """构造阶段 HitlSignal（visible / traceKind / confirmed / waived）。"""
    signal = {
        "checkpointId": STAGE_CHECKPOINTS.get(stage, ""),
        "visible": False,
        "tracePath": None,
        "traceKind": "none",
        "confirmed": None,
        "confirmedAt": None,
        "waived": False,
    }
    if waiver["waived"]:
        signal["waived"] = True
        signal["waiverEvidence"] = waiver["evidence"]
    if stage == "stories":
        # H6（Story 验收标准确认）：无独立 sign-off，间接证据 = story.md 交接状态已勾选
        story_paths = sorted(glob.glob(os.path.join(epic_dir, "stories", "*", "story.md")))
        if story_paths:
            handoff = [_story_handoff_info(path) for path in story_paths]
            checked = [item for item in handoff if item["checked"]]
            if len(checked) == len(handoff):
                signal.update({
                    "visible": True,
                    "tracePath": rel_dir + "/stories/",
                    "traceKind": "checkbox",
                    "confirmed": True,
                    "evidence": _ev(rel_dir + "/stories/", "signoff-checkbox", None,
                                    "H6 间接证据：%d/%d 份 story.md『已交接』勾选（隐含验收标准已确认）"
                                    % (len(checked), len(handoff))),
                })
        return signal
    parsed = _stage_signoff(epic_dir, rel_dir, stage)
    if parsed:
        signal.update({
            "visible": bool(parsed["visible"]),
            "tracePath": parsed["path"],
            "traceKind": parsed["traceKind"],
            "confirmed": parsed["confirmed"],
            "confirmedAt": parsed["confirmedAt"],
            "evidence": _ev(parsed["path"], "signoff-checkbox", "line:%d" % parsed["line"],
                            "%d/%d 已勾选" % (parsed["checked"], parsed["total"])),
        })
        return signal
    # 无 sign-off 制品时：STATUS 说明列的自由文本可作降级证据（中-低置信）
    note = (row or {}).get("note", "")
    if row and re.search(r"HITL\s*(已确认|确认)|并经\s*HITL\s*确认", note):
        signal.update({
            "visible": True,
            "tracePath": rel_dir + "/STATUS.md",
            "traceKind": "free-text",
            "confirmed": True,
            "evidence": _ev(rel_dir + "/STATUS.md", "status-cell", "line:%d" % row.get("line", 0), note),
        })
    return signal


def _waiver_for_epic(status_text, extra_texts, rel_dir):
    """检测「授权跳过 HITL / 全程自主」语义（G17）→ hitlWaived 副标签。"""
    result = {"waived": False, "evidence": None}
    for match in WAIVER_RE.finditer(status_text):
        line = _line_no(status_text, match.start())
        result["waived"] = True
        result["evidence"] = _ev(rel_dir + "/STATUS.md", "text", "line:%d" % line,
                                 _line_at(status_text, line))
        break
    if result["waived"]:
        return result
    for text_name, text in extra_texts:
        if not text:
            continue
        match = WAIVER_RE.search(text)
        if match:
            result["waived"] = True
            result["evidence"] = _ev(text_name, "text", "line:%d" % _line_no(text, match.start()),
                                     _line_at(text, _line_no(text, match.start())))
            break
    return result


def _line_at(text, number):
    lines = text.splitlines()
    if 1 <= number <= len(lines):
        return lines[number - 1].strip()
    return ""


def _cell_is_done(cell):
    if not cell:
        return False
    value = cell.strip()
    if re.fullmatch(r"[✅✓]\s*(all\s+)?done", value, re.I):
        return True
    return value.lower() == "done"


def _cell_is_all_handoff(cell):
    return bool(cell) and bool(re.fullmatch(r"[✅✓]\s*all[- ]?handoff", cell.strip(), re.I))


def _cell_is_partial(cell):
    return bool(cell) and ("部分 done" in cell or "partial" in cell.lower() or "🔄" in cell)


def _cell_is_na(cell):
    return bool(cell) and bool(re.search(r"(?<![a-z0-9])n\s*/\s*a(?![a-z0-9])", cell.lower()))


def _cell_is_in_progress(cell):
    return bool(cell) and bool(re.search(
        r"researching|exploring|prototyping|arching|splitting|storying|test-designing", cell.lower()))


def _epic_ui_involved(epic_dir, roadmap_current, research_text):
    if glob.glob(os.path.join(epic_dir, "prototypes", "**", "*.html"), recursive=True):
        return True
    scope = " ".join(roadmap_current.get("inScope", [])) if roadmap_current else ""
    haystack = scope + " " + (research_text or "")[:6000]
    return any(keyword in haystack for keyword in UI_KEYWORDS)


def _next_stage(stage):
    try:
        idx = STAGE_ORDER.index(stage)
    except ValueError:
        return None
    return STAGE_ORDER[idx + 1] if idx + 1 < len(STAGE_ORDER) else None


def _stage_prompt(root, epic_key, stage):
    """阶段行动提示词（唯一写入口 = PM Agent 会话）。"""
    epic_dir = "openspec-requirements/epics/%s/" % epic_key
    common = ("你是 SDD 产品经理（PM）。仓库：%s。Epic：%s（目录：%s）。\n" % (root, epic_key, epic_dir))
    if stage == "explore":
        questions = "Q3/Q4-附/Q5/Q6/Q7/Q9/Q10/Q11/Q12/Q13"
        body = (
            "看板状态：explore = PM 待启动（research 已于 2026-10-20 经 HITL 确认，"
            "STATUS.md 中『待 Phase 9 登记 ROADMAP』的说明已过期）。\n"
            "请先读 STATUS.md、research.md、docs/SOPS/SDD_WORKFLOW.md 与 openspec-requirements/config.yaml，"
            "然后按 /req:explore 的规范产出 idea.md；进入前先收口 research 里 10 个待定项：%s。\n"
            "硬约束：B/C 双端视角、真实数据、治理映射（domain_model / business_process / service_blueprint）；"
            "产出后暂停并给我 HITL 确认清单，不要擅自进入 prototype。\n"
            "完成后回报：产出路径 + 覆盖对账 + 待我确认项。" % questions
        )
    elif stage == "prototype":
        body = ("explore（idea.md）确认后再启动 /req:prototype：产出 Epic 整体可交互原型（小程序/Web 双端），"
                "遵循 docs/FRONTEND.md 与 design-system，完成后暂停待 HITL 确认。")
    elif stage == "arch":
        body = ("prototype 确认后执行 /req:arch（OPT）产出 architecture-impact.md；若判定无架构影响，"
                "在文件中显式记录 no-op 结论，不要静默跳过。")
    elif stage == "storymap":
        body = ("explore 与原型确认后执行 /req:storymap：产出 storymap.md 并完成覆盖对账"
                "（6 条 Exit Criteria + B/C 双端承诺逐项承接，无 ❌）。")
    elif stage == "stories":
        body = ("storymap 确认后逐 Story 执行 /req:story，产出 stories/<story-key>/story.md"
                "（业务面冻结交付物：用户场景/业务规则/E2E 验收/治理映射）。")
    elif stage == "test-design":
        body = ("每个 Story 确认后、handoff 前执行 /req:test-design（MUST），产出 test-design.md"
                "（分层 @unit/@api/@e2e + 追溯矩阵 + E2E 命名空间 + HITL sign-off）。")
    else:
        body = "按 /req:%s 规范推进该阶段。" % stage
    return common + body


def _derive_stage(stage, ctx):
    """R01–R18 规则引擎（按 inputs-repo §2.4 优先级）→ 阶段状态 + statusBecause。"""
    cell = (ctx["row"] or {}).get("cell", "")
    artifacts = ctx["artifacts"]
    artifact = bool(artifacts)
    sig = ctx["sig"]
    archived = ctx["archived"]
    prev_stage = ctx["prev_stage"]
    prev_status = ctx["prev_status"]
    downstream = ctx["downstream"]
    tags = []
    rules = []
    reasons = []
    status = None
    confidence = "high"
    note = (ctx["row"] or {}).get("note", "")

    if _cell_is_na(cell):
        status, confidence, rules = "na", "high", ["R01"]
        reasons.append("R01: 阶段单元格显式 `n/a` → 不适用（只认显式跳过，不推断）")
    elif _cell_is_partial(cell):
        rules.append("R03")
        reasons.append(
            "R03: 阶段单元格为 `%s`（partial）——不按 `done` 处理；"
            "既有交付看板脚本按子串误判为 done，本层已修正" % cell
        )
        if archived:
            rules.append("R11")
            if artifact:
                status, confidence = "confirmed", "medium"
                reasons.append("R11: Epic 已归档（%s），Story 已交接/开发归档 → "
                               "历史回填为完成，但 STATUS 单元格未回填" % ctx["archived_at"])
            else:
                status, confidence = "na", "medium"
                reasons.append("R11: Epic 已归档且阶段制品缺失 → 按历史豁免处理")
        elif artifact and sig and sig["visible"] and sig["confirmed"]:
            status, confidence, rules = "confirmed", "medium", rules + ["R05"]
            reasons.append("R05: 制品存在且 sign-off 已勾选 → 已确认（partial 单元格证据冲突）")
        elif artifact:
            status, confidence, rules = "waitingConfirm", "medium", rules + ["R04"]
            reasons.append("R04: 制品存在、sign-off 未勾选、下游制品缺失 → 等待 PM 确认")
        else:
            status, confidence, rules = "aiInProgress", "low", rules + ["R18"]
            reasons.append("R18: 单元格声称部分完成但无制品 → 推断 AI 正在做（无心跳，低置信）")
    elif _cell_is_done(cell) or _cell_is_all_handoff(cell):
        rules.append("R02")
        reasons.append("R02: 阶段单元格 `%s`" % cell)
        if not artifact:
            status, confidence = "unknown", "low"
            reasons.append("数据源不一致：STATUS 声称完成但制品不存在 → 标记未知并告警")
        elif archived:
            status, confidence, rules = "done", "high", rules + ["R11"]
            reasons.append("R11: Epic 已归档（%s）→ 历史完成" % ctx["archived_at"])
        elif _cell_is_all_handoff(cell):
            status, confidence, rules = "handoffDone", "high", rules + ["R08"]
            reasons.append("R08: 全部 Story 已交接开发侧（`all-handoff`）")
        elif sig and sig["visible"]:
            if sig["confirmed"]:
                if downstream:
                    status, confidence, rules = "done", "high", rules + ["R05"]
                    reasons.append("R05: sign-off 全勾且下游制品已存在 → 完成")
                else:
                    status, confidence, rules = "confirmed", "high", rules + ["R05"]
                    reasons.append(
                        "R05: sign-off 全勾（%s/%s%s）且下游制品未产出 → 已确认待启动" % (
                            sig.get("checkpointId", ""), sig["confirmedAt"] or "已勾选",
                            "" if sig["confirmedAt"] else "")
                    )
            elif not downstream:
                status, confidence, rules = "waitingConfirm", "high", rules + ["R04"]
                reasons.append("R04: sign-off 未全勾且下游制品缺失 → 等待 PM 确认")
            else:
                status, confidence = "done", "medium"
                reasons.append("sign-off 未全勾但下游已存在 → 按 STATUS/下游推断完成（置信度中）")
        else:
            status, confidence = "done", "medium"
            reasons.append("无 sign-off 结构可查，完成态仅由 STATUS 单元格支撑（置信度中）")
    elif artifact:
        if sig and sig["visible"]:
            if sig["confirmed"]:
                if downstream:
                    status, confidence, rules = "done", "high", ["R05"]
                    reasons.append("R05: sign-off 全勾且下游制品已存在 → 完成")
                else:
                    status, confidence, rules = "confirmed", "high", ["R05"]
                    reasons.append("R05: sign-off 全勾、下游未产出 → 已确认待启动")
            else:
                status, confidence, rules = "waitingConfirm", "high", ["R04"]
                reasons.append("R04: 制品存在、sign-off 未勾选、下游缺失 → 等待 PM 确认")
        elif archived:
            status, confidence, rules = "done", "high", ["R11"]
            reasons.append("R11: Epic 已归档（%s）→ 历史完成" % ctx["archived_at"])
        elif downstream:
            status, confidence, rules = "confirmed", "medium", ["R17"]
            reasons.append("R17: 该阶段无 sign-off 段（确认态不可区分），下游制品已存在 → 推断已确认（medium）")
        else:
            status, confidence, rules = "waitingConfirm", "medium", ["R17"]
            reasons.append("R17: 产物已就绪但无 durable 确认记录 → 待确认（推断，medium）")
    else:
        if archived:
            if stage in ("arch", "test-design"):
                status, confidence, rules = "na", "high", ["R01", "R11"]
                reasons.append(
                    "历史豁免: 归档 Epic 的阶段表未含 `%s` 行且无制品 → "
                    "%s，v6 漏斗要求不追溯历史" % (
                        stage, "arch 为 OPT 阶段" if stage == "arch" else "test-design 为 v6 新增 MUST")
                )
            elif cell:
                status, confidence, rules = "na", "medium", ["R11"]
                reasons.append("R11: 归档 Epic 无制品且单元格为 `%s` → 按历史豁免处理" % cell)
            else:
                status, confidence, rules = "na", "medium", ["R11"]
                reasons.append("R11: 归档 Epic 无该阶段记录 → 按历史豁免处理")
        elif _cell_is_in_progress(cell):
            status, confidence, rules = "aiInProgress", "low", ["R18"]
            reasons.append("R18: STATUS 使用进行时词表 `%s`（无持久心跳，低置信）" % cell)
        elif stage == "prototype" and not ctx["required"]:
            status, confidence, rules = "na", "medium", ["R01"]
            reasons.append("R01(推断): 无 UI 证据（无原型 / ROADMAP In Scope 无 UI 关键词）→ prototype 不适用")
        elif prev_status in ("done", "confirmed", "na"):
            status, confidence, rules = "pmTodo", "high", ["R06"]
            reasons.append("R06: 前序阶段 %s 已 %s 且本阶段制品不存在 → 轮到 PM 启动"
                           % (prev_stage, prev_status))
        else:
            status, confidence, rules = "pmTodo", "high", ["R06"]
            reasons.append("R06: 前序阶段 %s 尚未完成（%s）→ 本阶段暂不可启动（链式依赖）"
                           % (prev_stage, prev_status))
            tags.append("waiting-chain")

    if status is None:
        status, confidence = "unknown", "low"
        reasons.append("未能匹配任何确定性规则 → 未知（sourceHealth 记录）")

    if stage == "test-design":
        tags.append("must")
    if stage == "arch":
        tags.append("optional")
    if stage == "prototype" and ctx["required"]:
        tags.append("ui-gate")
    if status in ("pmTodo", "waitingConfirm") and not tags:
        tags.append("pm-action")

    return {
        "status": status,
        "confidence": confidence,
        "ruleIds": rules,
        "statusBecause": reasons,
        "tags": tags,
        "note": note or ctx["derived_note"] or None,
    }


def scan_epics(root, roadmap, health):
    """需求侧 Epic 漏斗（活跃 + 归档；修正 `部分 done` 误判 / PHASE_NAMES 过期）。"""
    epics_dir = os.path.join(str(root), "openspec-requirements", "epics")
    archive_dir = os.path.join(str(root), "openspec-requirements", "archive")
    current_phase = next((phase for phase in roadmap["phases"]
                          if phase["no"] == roadmap["current"]["no"]), None)
    partial_cells = []
    epic_items = []

    directories = []
    for status_path in sorted(glob.glob(os.path.join(epics_dir, "*/STATUS.md"))):
        directories.append((os.path.dirname(status_path), False, None))
    for status_path in sorted(glob.glob(os.path.join(archive_dir, "*", "STATUS.md"))):
        epic_dir = os.path.dirname(status_path)
        dir_name = os.path.basename(epic_dir)
        date_match = re.match(r"(\d{4}-\d{2}-\d{2})-(.+)$", dir_name)
        archived_at = date_match.group(1) if date_match else None
        directories.append((epic_dir, True, archived_at))

    for epic_dir, archived, archived_at in directories:
        rel_dir = _rel(root, epic_dir)
        status_path = os.path.join(epic_dir, "STATUS.md")
        status_text = _read(status_path)
        status_info = _parse_status_md(status_text)
        key = status_info["key"] or os.path.basename(epic_dir)
        if archived:
            dir_name = os.path.basename(epic_dir)
            date_match = re.match(r"(\d{4}-\d{2}-\d{2})-(.+)$", dir_name)
            if date_match:
                key = status_info["key"] or date_match.group(2)
        title = status_info["title"] or _clean_title(key.replace("-", " "))
        extra_texts = [(rel_dir + "/research.md", _read(os.path.join(epic_dir, "research.md"))),
                       (rel_dir + "/idea.md", _read(os.path.join(epic_dir, "idea.md")))]
        waiver = _waiver_for_epic(status_text, extra_texts, rel_dir)
        lifecycle = dict(status_info["lifecycle"])
        lifecycle["archived"] = archived or lifecycle["archived"]
        lifecycle["source"] = "status-checkboxes"
        if lifecycle["archived"]:
            lifecycle["active"] = False
        ui_involved = _epic_ui_involved(epic_dir, current_phase, extra_texts[0][1])

        # 阶段状态推导（顺序依赖 → 按 STAGE_ORDER 一次算完）
        artifacts_map = {stage: _stage_artifacts(epic_dir, stage) for stage in STAGE_ORDER}
        stage_rows = status_info["stage_rows"]
        stages = []
        prev_status = None
        prev_stage = None
        for stage in STAGE_ORDER:
            row = stage_rows.get(stage)
            cell = (row or {}).get("cell", "")
            if _cell_is_partial(cell):
                partial_cells.append({"epicKey": key, "stage": stage, "cell": cell,
                                      "path": rel_dir + "/STATUS.md", "line": row.get("line")})
            sig = _stage_hitl_signal(stage, epic_dir, rel_dir, row, waiver)
            downstream = bool(artifacts_map.get(_next_stage(stage) or "", []))
            if stage == "test-design":
                downstream = bool(glob.glob(os.path.join(epic_dir, "stories", "*", "handoff.md")))
            ctx = {
                "row": row,
                "artifacts": artifacts_map[stage],
                "sig": sig,
                "archived": archived,
                "archived_at": archived_at,
                "prev_stage": prev_stage,
                "prev_status": prev_status,
                "downstream": downstream,
                "required": (stage in REQUIRED_STAGES) or (stage == "prototype" and ui_involved),
                "derived_note": "",
            }
            derived = _derive_stage(stage, ctx)
            stage_item = _build_stage_item(root, rel_dir, key, stage, row, artifacts_map[stage], sig,
                                           derived, waiver, archived, ui_involved)
            stages.append(stage_item)
            prev_status = derived["status"]
            prev_stage = stage

        # Epic 级规划门禁 / 数据矛盾（R15 / R16 / R12）
        evidence = [_ev(rel_dir + "/STATUS.md", "artifact")]
        blockers = []
        phase_no = None
        for phase in roadmap["phases"]:
            if any(item["key"] == key for item in phase["plannedEpics"]):
                phase_no = phase["no"]
                break
        if phase_no is None:
            for header in _split_phase_sections(roadmap.get("text", "")):
                if ("`%s`" % key) in header["section"] or key in header["section"]:
                    phase_no = header["no"]
                    break
        if not archived and phase_no is None:
            blockers.append({
                "id": "planning-basis-missing",
                "code": "PLANNING_BASIS_MISSING",
                "severity": "warning",
                "message": "Epic 目录存在但 key 未出现在 docs/ROADMAP.md（规划依据缺失，R15）",
                "evidence": [_ev(rel_dir + "/STATUS.md", "artifact"), _ev("docs/ROADMAP.md", "artifact")],
            })
        # R16：STATUS 说明与 ROADMAP 矛盾（今天真实存在：explore 行称「待 Phase 9 登记」）
        conflict = _status_roadmap_conflict(status_text, roadmap)
        if conflict and not archived:
            blockers.append(conflict["blocker"])
            # 规则 R16 只降置信 / 加告警，不改变状态；把证据挂到 explore 阶段（今天真实存在的位置）
            for stage_item in stages:
                if stage_item["key"] == "explore":
                    stage_item["statusBecause"].append(
                        "R16: STATUS.md 说明与 ROADMAP 登记事实冲突（告警，不改变阶段状态）")
                    stage_item["evidence"].append(_ev(rel_dir + "/STATUS.md", "status-cell",
                                                      None, "explore 行说明已过期"))
        # R12：活跃 Epic 的 Story 已 handoff/开发中但 test-design 缺失（MUST 前置）
        if not archived:
            story_rows = [row for row in status_info["story_rows"] if row["id"].startswith("story-")]
            handoff_rows = [row for row in story_rows
                            if row["status"] in ("handoff", "dev-in-progress")
                            and not _story_test_design_exists(epic_dir, row["id"])]
            if handoff_rows:
                blockers.append({
                    "id": "missing-must-artifact",
                    "code": "MISSING_MUST_ARTIFACT",
                    "severity": "blocker",
                    "message": "Story %s 已 handoff/开发中但 test-design.md 缺失（v6 MUST 前置不成立，R12）"
                               % "、".join(row["id"] for row in handoff_rows),
                    "evidence": [_ev(rel_dir + "/STATUS.md", "status-table-row",
                                     "line:%d" % handoff_rows[0]["line"], handoff_rows[0]["id"])],
                })

        story_stats = _epic_story_stats(epic_dir, status_info["story_rows"], archived)
        next_action = _epic_next_action(root, key, stages, archived)
        lifecycle_status = "archived" if lifecycle["archived"] else (
            "all-done" if lifecycle["allDone"] else ("all-handoff" if lifecycle["allHandoff"] else "active"))

        epic_items.append({
            "key": key,
            "title": title,
            "dir": rel_dir,
            "phaseNo": phase_no,
            "lifecycle": lifecycle,
            "status": lifecycle_status,
            "stages": stages,
            "storyStats": story_stats,
            "nextAction": next_action,
            "blockers": blockers,
            "evidence": evidence,
            "meta": {
                "statusPath": rel_dir + "/STATUS.md",
                "statsmtime": _iso_or_none(_mtime_date(status_path)),
                "lastArtifactMtime": _iso_or_none(_latest_mtime(
                    [path for paths in artifacts_map.values() for path in paths])),
                "archivedAt": archived_at,
                "uiInvolved": ui_involved,
                "waiver": waiver,
                "questions": _unresolved_questions(epic_dir) if not archived else None,
                "unresolvedQuestions": _open_question_count(epic_dir) if not archived else None,
                "openQuestions": _open_question_list(epic_dir) if not archived else None,
                "tags": (["archived"] if archived else ["active"]),
            },
        })

    epic_items.sort(key=lambda item: (-(item["phaseNo"] or 0), item["key"]))
    active = [item for item in epic_items if item["lifecycle"]["active"] and not item["lifecycle"]["archived"]]
    archived_items = [item for item in epic_items if item["lifecycle"]["archived"]]
    health.add(
        "requirements-epics", "openspec-requirements/epics", True,
        [] if epic_items else ["未发现任何需求侧 Epic 目录"],
        {"epics": len(epic_items), "active": len(active), "archived": len(archived_items)},
    )
    health.add(
        "epic-status", "openspec-requirements/epics/*/STATUS.md", True,
        ["%d 个阶段单元格为 `🔄 部分 done`，本层不按 done 处理（旧脚本缺陷）" % len(partial_cells)]
        if partial_cells else [],
        {"partialCells": len(partial_cells)},
    )
    return {"items": epic_items, "active": active, "archived": archived_items,
            "partialCells": partial_cells}


def _iso_or_none(date_value):
    return date_value.isoformat() if date_value else None


def _unresolved_questions(epic_dir):
    """从 research.md 抽取疑问清单：全部 Q 编号 + explore 需收口的待定项。"""
    text = _read(os.path.join(epic_dir, "research.md"))
    if not text:
        return None
    questions = []
    for match in re.finditer(r"^###\s*(Q\d+(?:[-－]附)?)[.、:：\s]", text, re.M):
        if match.group(1) not in questions:
            questions.append(match.group(1))
    open_questions = []
    open_match = re.search(r"剩余待定项([^\n]+)", text)
    if open_match:
        for extra in re.findall(r"Q\d+(?:[-－]附)?", open_match.group(1)):
            if extra not in open_questions:
                open_questions.append(extra)
    return {
        "all": questions,
        "open": open_questions or questions,
        "openCount": len(open_questions or questions),
    }


def _open_question_list(epic_dir):
    info = _unresolved_questions(epic_dir)
    return info["open"] if info else None


def _open_question_count(epic_dir):
    info = _unresolved_questions(epic_dir)
    return info["openCount"] if info else None


def _story_test_design_exists(epic_dir, story_id):
    return os.path.isfile(os.path.join(epic_dir, "test-design.md")) or os.path.isfile(
        os.path.join(epic_dir, "stories", story_id, "test-design.md"))


def _status_roadmap_conflict(status_text, roadmap):
    """G11 / R16：STATUS 说明与 ROADMAP 已登记事实矛盾。"""
    if not status_text:
        return None
    evidence = []
    messages = []
    match = re.search(r"待\s*Phase\s*(\d+)\s*登记", status_text)
    if match:
        no = int(match.group(1))
        phase = next((item for item in roadmap["phases"] if item["no"] == no), None)
        if phase and phase["status"] in ("current", "done"):
            line = _line_no(status_text, match.start())
            evidence.append(_ev("openspec-requirements/epics/%s/STATUS.md" % _epic_key_hint(status_text),
                                "status-cell", "line:%d" % line, _line_at(status_text, line)))
            evidence.append(_ev("docs/ROADMAP.md", "artifact",
                                "line:%d" % phase["line"] if phase.get("line") else None,
                                "Phase %d 已登记（%s）" % (no, phase["name"])))
            messages.append("STATUS.md:%d 称『待 Phase %d 登记 ROADMAP』，但 ROADMAP 已登记该阶段（%s）"
                            % (line, no, phase["name"]))
    if "未裁定" in status_text:
        line_match = re.search(r"^.*未裁定.*$", status_text, re.M)
        if line_match:
            line = _line_no(status_text, line_match.start())
            evidence.append(_ev("openspec-requirements/epics/%s/STATUS.md" % _epic_key_hint(status_text),
                                "text", "line:%d" % line, line_match.group(0).strip()))
            messages.append("STATUS.md:%d 备注仍称『ROADMAP 登记方式未裁定』，与 research.md 已裁定结论矛盾"
                            % line)
    if not messages:
        return None
    epic_key = _epic_key_hint(status_text)
    return {
        "blocker": {
            "id": "status-roadmap-conflict",
            "code": "STATUS_ROADMAP_CONFLICT",
            "severity": "warning",
            "message": "；".join(messages),
            "evidence": evidence,
        },
        "messages": messages,
        "evidence": evidence,
        "epicKey": epic_key,
    }


def _epic_key_hint(status_text):
    match = EPIC_KEY_LINE_RE.search(status_text or "")
    return match.group(1).strip() if match else "__epic__"


def _build_stage_item(root, rel_dir, epic_key, stage, row, artifacts, sig, derived, waiver,
                      archived, ui_involved):
    artifact_rels = [_rel(root, path) for path in artifacts]
    evidence = []
    if row:
        evidence.append(_ev(rel_dir + "/STATUS.md", "status-cell",
                            "line:%d" % row.get("line", 0), row.get("cell", "")))
    for artifact in artifact_rels[:3]:
        evidence.append(_ev(artifact, "artifact"))
    if sig.get("evidence"):
        evidence.append(sig["evidence"])

    next_action = None
    stage_index = STAGE_ORDER.index(stage) + 1
    if derived["status"] in ("pmTodo", "waitingConfirm"):
        if "waiting-chain" in derived["tags"]:
            next_action = _action(
                "阶段说明：待前序阶段完成后启动 /req:%s" % stage,
                kind="session",
                prompt=_stage_prompt(root, epic_key, stage),
                enabled=False,
                action_id="req:%s" % stage,
                requires_hitl=True,
                eta_minutes=stage_index * 10,
            )
        elif derived["status"] == "waitingConfirm":
            next_action = _action(
                "用 PM Agent 核对并确认 `%s` 产出" % STAGE_LABELS.get(stage, stage),
                kind="session",
                prompt=_stage_prompt(root, epic_key, stage) +
                "\n当前看板状态为『产出已就绪 · 等待 PM 确认』：先核对产物与小节 sign-off，再走 HITL 确认。",
                enabled=True,
                action_id="confirm:%s" % stage,
                requires_hitl=True,
                eta_minutes=stage_index * 10,
            )
        else:
            next_action = _action(
                _stage_action_label(stage),
                kind="session",
                prompt=_stage_prompt(root, epic_key, stage),
                enabled=True,
                action_id="req:%s" % stage,
                requires_hitl=True,
                eta_minutes=stage_index * 10,
            )

    required = (stage in REQUIRED_STAGES) or (stage == "prototype" and ui_involved)
    stage_item = {
        "key": stage,
        "stage": stage,
        "title": STAGE_LABELS[stage],
        "label": STAGE_LABELS[stage],
        "status": derived["status"],
        "confidence": derived["confidence"],
        "statusConfidence": derived["confidence"],
        "ruleIds": derived["ruleIds"],
        "statusBecause": derived["statusBecause"],
        "cellRaw": (row or {}).get("cell"),
        # artifact 用「首个人类可读产物路径」而非布尔（Client 的 stageExpectedArtifact 会直接渲染它）；
        # 需要布尔判断时看 artifactExists / artifacts。
        "artifact": artifact_rels[0] if artifact_rels else None,
        "artifactExists": bool(artifacts),
        "artifactPath": artifact_rels[0] if artifact_rels else None,
        "artifacts": artifact_rels,
        "required": bool(required),
        "hitl": sig,
        "hitlWaived": bool(waiver["waived"]),
        "note": derived["note"],
        "tags": derived["tags"],
        "nextAction": next_action,
        "evidence": _dedupe_evidence(evidence),
    }
    return stage_item


def _stage_action_label(stage):
    labels = {
        "research": "用 PM Agent 继续：执行 /req:research（需求调研）",
        "explore": "用 PM Agent 继续：执行 /req:explore 产出 idea.md（先收口 10 个待定项）",
        "prototype": "用 PM Agent 继续：执行 /req:prototype 产出 Epic 整体原型",
        "arch": "用 PM Agent 继续：执行 /req:arch（OPT）产出架构影响评估",
        "storymap": "用 PM Agent 继续：执行 /req:storymap 完成需求拆分与覆盖对账",
        "stories": "用 PM Agent 继续：逐个 Story 执行 /req:story",
        "test-design": "用 PM Agent 继续：执行 /req:test-design（MUST）",
    }
    return labels.get(stage, "用 PM Agent 继续：执行 /req:%s" % stage)


def _epic_next_action(root, epic_key, stages, archived):
    if archived:
        return None
    for stage in stages:
        if stage["status"] == "pmTodo" and "waiting-chain" not in stage["tags"] and stage["nextAction"]:
            return stage["nextAction"]
    for stage in stages:
        if stage["status"] == "waitingConfirm" and stage["nextAction"]:
            return stage["nextAction"]
    return None


def _epic_story_stats(epic_dir, story_rows, archived):
    story_ids = []
    for row in story_rows:
        if row["id"].startswith("story-"):
            story_ids.append(row["id"])
    for story_path in sorted(glob.glob(os.path.join(epic_dir, "stories", "*", "story.md"))):
        story_id = os.path.basename(os.path.dirname(story_path))
        if story_id not in story_ids:
            story_ids.append(story_id)
    done = 0
    handoff = 0
    in_dev = 0
    missing_must = 0
    for story_id in story_ids:
        row = next((item for item in story_rows if item["id"] == story_id), None)
        status = (row or {}).get("status", "")
        if status == "done":
            done += 1
        elif status == "handoff":
            handoff += 1
        elif status in ("dev-in-progress", "in-progress"):
            in_dev += 1
        if not _story_test_design_exists(epic_dir, story_id) and not archived:
            missing_must += 1
    return {
        "total": len(story_ids),
        "ready": max(0, len(story_ids) - done - handoff - in_dev),
        "handoff": handoff,
        "inDev": in_dev,
        "done": done,
        "missingMust": missing_must,
        "missingMustExempt": len(story_ids) if archived else 0,
    }


# ─────────────────────────────── Story 追踪 ───────────────────────────────


def scan_story_lists(root, health):
    """Epic 队列（story-list.json）：活跃位 / 归档位 / R14 孤儿检测。"""
    lists = []
    records = 0
    orphan = []
    missing_requirement = []
    story_statuses = {}

    active_files = sorted(glob.glob(os.path.join(str(root), "openspec", "epic-*.story-list.json")))
    archived_files = sorted(glob.glob(os.path.join(str(root), "openspec", "changes", "archive",
                                                   "*.story-list.json")))
    requirement_story_ids = set()
    for epic_dir in glob.glob(os.path.join(str(root), "openspec-requirements", "epics", "*")):
        for story_path in glob.glob(os.path.join(epic_dir, "stories", "*", "story.md")):
            requirement_story_ids.add(os.path.basename(os.path.dirname(story_path)))
    for epic_dir in glob.glob(os.path.join(str(root), "openspec-requirements", "archive", "*")):
        for story_path in glob.glob(os.path.join(epic_dir, "stories", "*", "story.md")):
            requirement_story_ids.add(os.path.basename(os.path.dirname(story_path)))

    for path, archived in ([(item, False) for item in active_files] + [(item, True) for item in archived_files]):
        payload = _read_json(path)
        rel = _rel(root, path)
        if not isinstance(payload, dict):
            health.add("story-list", rel, False, ["story-list.json 无法解析"])
            continue
        stories = payload.get("stories") or []
        story_entries = [item for item in stories if isinstance(item, dict)]
        all_done = bool(story_entries) and all(item.get("status") == "done" for item in story_entries)
        epic_key = payload.get("epicKey") or os.path.basename(path).replace("epic-", "").replace(
            ".story-list.json", "")
        lists.append({
            "file": rel,
            "epicKey": epic_key,
            "title": payload.get("title") or "",
            "stories": len(story_entries),
            "allDone": all_done,
            "archived": archived,
            "updatedAt": payload.get("updatedAt"),
        })
        records += len(story_entries)
        for item in story_entries:
            story_id = item.get("id") or ""
            if story_id:
                story_statuses.setdefault(story_id, item.get("status"))
            if story_id and story_id not in requirement_story_ids:
                missing_requirement.append(story_id)
            change_name = item.get("changeName") or ""
            change_archived = bool(change_name) and bool(glob.glob(os.path.join(
                str(root), "openspec", "changes", "archive", "*-%s" % change_name)))
            if not archived and item.get("status") == "in_progress" and change_archived:
                orphan.append({"file": rel, "storyId": story_id, "reason": "in_progress 但 change 已归档"})
    health.add(
        "story-list", "openspec/epic-*.story-list.json", True,
        (["%d 份 story-list 全部 done 但未归档到 openspec/changes/archive/（SOP 要求）"
          % len([item for item in lists if item["allDone"] and not item["archived"]])]
         if any(item["allDone"] and not item["archived"] for item in lists) else [])
        + (["%d 个 Story 记录只存在于 story-list，需求侧无 story.md（历史口径差异）"
            % len(missing_requirement)] if missing_requirement else []),
        {"lists": len(lists), "stories": records, "unarchived": len([item for item in lists if not item["archived"]])},
    )
    return {"lists": lists, "records": records, "orphan": orphan,
            "missingRequirement": missing_requirement,
            "storyStatuses": story_statuses,
            "unarchived": [item for item in lists if item["allDone"] and not item["archived"]]}


def _story_find_change(root, change_name):
    """Story → 开发侧 change（活跃目录 / 归档目录）。"""
    if not change_name:
        return {"changeExists": False, "changePhase": "none", "devArchiveDate": None}
    active_dir = os.path.join(str(root), "openspec", "changes", change_name)
    if os.path.isdir(active_dir):
        if os.path.isfile(os.path.join(active_dir, "tasks.md")):
            phase = "coding"
        elif os.path.isfile(os.path.join(active_dir, "verify.md")):
            phase = "verify"
        elif os.path.isfile(os.path.join(active_dir, "design.md")):
            phase = "design"
        elif os.path.isfile(os.path.join(active_dir, "proposal.md")):
            phase = "proposal"
        else:
            phase = "proposal"
        return {"changeExists": True, "changePhase": phase, "devArchiveDate": None}
    archived = sorted(glob.glob(os.path.join(str(root), "openspec", "changes", "archive",
                                             "*-%s" % change_name)))
    if archived:
        dir_name = os.path.basename(archived[0])
        date_match = re.match(r"(\d{4}-\d{2}-\d{2})", dir_name)
        return {"changeExists": False, "changePhase": "synced",
                "devArchiveDate": date_match.group(1) if date_match else None}
    return {"changeExists": False, "changePhase": "none", "devArchiveDate": None}


def _story_handoff_info(story_path):
    """解析 story.md 交接状态 checkbox + changeName。"""
    text = _read(story_path)
    result = {"checked": False, "changeName": None}
    if not text:
        return result
    section = re.search(r"##\s*交接状态.*?(?=\n##\s|\Z)", text, re.S)
    block = section.group(0) if section else text
    for match in re.finditer(r"^\s*-\s*\[[xX]\]\s*(.+)$", block, re.M):
        result["checked"] = True
        name_match = re.search(r"changeName:\s*`([^`]+)`", match.group(1))
        if not name_match:
            name_match = re.search(r"changeName[:：]\s*([A-Za-z0-9._-]+)", match.group(1))
        if name_match:
            result["changeName"] = name_match.group(1).strip()
    return result


def _story_header(story_path):
    """解析 story.md 头部：标题 / Story Key / 优先级 / 依赖。"""
    text = _read(story_path)
    info = {"title": "", "storyId": "", "priority": None, "dependsOn": []}
    if not text:
        return info
    title_match = re.search(r"^#\s+Story[:：]\s*(.+)$", text, re.M)
    if title_match:
        info["title"] = _clean_title(title_match.group(1))
    key_match = re.search(r"Story Key:\s*`([^`]+)`", text)
    if key_match:
        info["storyId"] = key_match.group(1).strip()
    priority_match = re.search(r"优先级[:：]\s*(P[0-3])", text)
    if priority_match:
        info["priority"] = priority_match.group(1)
    depends_match = re.search(r"依赖[:：]\s*([^|\n]+)", text)
    if depends_match:
        raw = depends_match.group(1).strip()
        if raw and raw not in ("无", "—", "-"):
            info["dependsOn"] = [item.strip() for item in re.split(r"[、,，+ ]+", raw) if item.strip()]
    return info


def scan_story_tracking(root, roadmap, epic_ctx, story_ctx, health):
    """Story spec 追踪（ROADMAP draft + STATUS Story 表 + story.md/test-design/change/archive）。"""
    records = []
    draft_count = 0
    active_keys = {item["key"] for item in epic_ctx["active"]}
    archived_keys = {item["key"] for item in epic_ctx["archived"]}

    # 1) ROADMAP draft Story（当前/未来阶段、未拆分）→ 活跃 Epic 的 PM 待办
    for phase in roadmap["phases"]:
        if phase["status"] not in ("current", "future"):
            continue
        for draft in phase["draftStories"]:
            if draft.get("epicKey") not in active_keys:
                continue
            if _story_exists_on_disk(root, draft["storyId"]):
                continue
            draft_count += 1
            records.append({
                "id": draft["storyId"],
                "storyId": draft["storyId"],
                "epicKey": draft["epicKey"],
                "title": draft["title"] or draft["storyId"],
                "priority": draft["priority"],
                "dependsOn": [],
                "source": "roadmap-draft",
                "stage": "draft",
                "status": "pmTodo",
                "confidence": "high",
                "statusBecause": [
                    "R07: 仅存在于 ROADMAP Phase %s draft 表；storymap.md 未产出 → 尚未拆分" % phase["no"],
                    "MUST 缺失: story.md / test-design.md（handoff 前置不成立）",
                ],
                "artifacts": {"story": False, "testDesign": False, "prototypeGate": "n/a"},
                "hitl": {
                    "storyConfirm": {"checkpointId": "H6", "visible": False, "traceKind": "none",
                                     "confirmed": None, "waived": False},
                    "testDesignConfirm": {"checkpointId": "H7", "visible": False, "traceKind": "none",
                                          "confirmed": None, "waived": False},
                },
                "handoff": {"status": None, "changeName": None, "changeExists": False,
                            "changePhase": "none", "devArchiveDate": None, "storyListStatus": None},
                "gates": None,
                "review": {"verdict": None, "p0": 0, "p1": 0, "path": None},
                "readiness": {"ready": False,
                              "missingMust": ["story.md", "test-design.md"],
                              "missingOptional": ["storymap.md"]},
                "nextAction": _action(
                    "先完成 /req:storymap 拆分，再逐个 Story 执行 /req:story",
                    kind="session",
                    prompt=_stage_prompt(root, draft["epicKey"], "storymap"),
                    enabled=False,
                    action_id="req:storymap",
                    requires_hitl=True,
                ),
                "blockers": [],
                "evidence": [_ev("docs/ROADMAP.md", "artifact",
                                 "line:%d" % (phase.get("line") or 0),
                                 "draft Story %s（%s）" % (draft["storyId"], draft["priority"]))],
                "tags": ["roadmap-draft", "not-split", "missing-must"],
            })

    # 2) 活跃 Epic 的 STATUS Story 表 / stories 目录（今天为 0）
    for epic in epic_ctx["active"]:
        epic_dir = os.path.join(str(root), epic["dir"])
        status_text = _read(os.path.join(epic_dir, "STATUS.md"))
        status_info = _parse_status_md(status_text)
        story_rows = [row for row in status_info["story_rows"] if row["id"].startswith("story-")]
        rows_by_id = {row["id"]: row for row in story_rows}
        for story_path in sorted(glob.glob(os.path.join(epic_dir, "stories", "*", "story.md"))):
            story_id = os.path.basename(os.path.dirname(story_path))
            rows_by_id.setdefault(story_id, {"id": story_id, "status": "", "changeName": "",
                                             "devArchive": "", "line": 0})
        for story_id, row in sorted(rows_by_id.items()):
            if any(item["id"] == story_id for item in records):
                continue
            story_file = os.path.join(epic_dir, "stories", story_id, "story.md")
            header = _story_header(story_file)
            handoff = _story_handoff_info(story_file)
            change = _story_find_change(root, row.get("changeName") or handoff["changeName"])
            test_design = _story_test_design_exists(epic_dir, story_id)
            story_artifact = os.path.isfile(story_file)
            if change["devArchiveDate"] or change["changePhase"] == "synced" or row.get("status") == "done":
                status = "done"
                confidence = "high"
            elif change["changeExists"] or row.get("status") in ("dev-in-progress", "in-progress"):
                status, confidence = "devInProgress", "high"
            elif change["changePhase"] != "none" or handoff["checked"] or row.get("status") == "handoff":
                status, confidence = "handoffDone", "high"
            elif story_artifact and not test_design:
                status, confidence = "blocked", "high"
            elif story_artifact:
                status, confidence = "confirmed", "medium"
            else:
                status, confidence = "pmTodo", "high"
            missing_must = []
            if not story_artifact:
                missing_must.append("story.md")
            if not test_design:
                missing_must.append("test-design.md")
            records.append({
                "id": story_id,
                "storyId": story_id,
                "epicKey": epic["key"],
                "title": header["title"] or story_id,
                "priority": header["priority"],
                "dependsOn": header["dependsOn"],
                "source": "status-table" if row.get("line") else "storymap",
                "stage": "stories",
                "status": status,
                "confidence": confidence,
                "statusBecause": (["R11: 开发侧 change 已归档（%s）→ done" % change["devArchiveDate"]]
                                  if status == "done" else
                                  ["R12: Story 已交接/开发中但 test-design.md 缺失（MUST 前置）"]
                                  if status == "blocked" else
                                  ["R08: story.md 交接状态已勾选 → 已交接开发"]),
                "artifacts": {"story": story_artifact, "testDesign": test_design, "prototypeGate": "ok"},
                "hitl": {
                    "storyConfirm": {"checkpointId": "H6", "visible": handoff["checked"],
                                     "traceKind": "checkbox" if handoff["checked"] else "none",
                                     "confirmed": True if handoff["checked"] else None, "waived": False},
                    "testDesignConfirm": {"checkpointId": "H7", "visible": test_design,
                                          "traceKind": "checkbox" if test_design else "none",
                                          "confirmed": None, "waived": False},
                },
                "handoff": {
                    "status": row.get("status") or None,
                    "changeName": row.get("changeName") or handoff["changeName"],
                    "changeExists": change["changeExists"],
                    "changePhase": change["changePhase"],
                    "devArchiveDate": change["devArchiveDate"],
                    "storyListStatus": _story_list_status(story_ctx, story_id),
                },
                "gates": None,
                "review": {"verdict": None, "p0": 0, "p1": 0, "path": None},
                "readiness": {"ready": not missing_must, "missingMust": missing_must,
                              "missingOptional": []},
                "nextAction": None,
                "blockers": [],
                "evidence": [_ev("%s/STATUS.md" % epic["dir"], "status-table-row",
                                 "line:%d" % row.get("line", 0), story_id)],
                "tags": [tag for tag in ("status-table", "missing-must") if
                         (tag == "status-table" or missing_must)],
            })

    health.add(
        "stories", "openspec-requirements/epics/*/stories/*/story.md", True, [],
        {"tracked": len(records), "draft": draft_count},
    )
    return records


def _story_exists_on_disk(root, story_id):
    patterns = [
        os.path.join(str(root), "openspec-requirements", "epics", "*", "stories", story_id, "story.md"),
        os.path.join(str(root), "openspec-requirements", "archive", "*", "stories", story_id, "story.md"),
    ]
    return any(glob.glob(pattern) for pattern in patterns)


def _story_list_status(story_ctx, story_id):
    return (story_ctx.get("storyStatuses") or {}).get(story_id)


# ─────────────────────────────── HITL 检查点 ───────────────────────────────


def scan_hitl(root, epic_ctx, health):
    """HITL 检查点：sign-off 可见性 / waiver / 不可见清单（H1–H17 子集）。"""
    checkpoints = []
    invisible = []
    waived = []
    for epic in epic_ctx["active"]:
        for stage in epic["stages"]:
            signal = stage["hitl"]
            checkpoints.append({
                "epicKey": epic["key"],
                "stage": stage["key"],
                "checkpointId": signal.get("checkpointId"),
                "visible": signal.get("visible"),
                "traceKind": signal.get("traceKind"),
                "tracePath": signal.get("tracePath"),
                "confirmed": signal.get("confirmed"),
                "confirmedAt": signal.get("confirmedAt"),
                "waived": signal.get("waived", False),
            })
            if (not signal.get("visible") and stage["key"] in INVISIBLE_CHECKPOINT_STAGES
                    and stage["status"] not in ("done", "na")):
                invisible.append({"epicKey": epic["key"], "stage": stage["key"],
                                  "checkpointId": signal.get("checkpointId"),
                                  "reason": "无 durable HITL 记录，只能以『待确认(推断)』呈现"})
            if signal.get("waived"):
                waived.append({"epicKey": epic["key"], "stage": stage["key"],
                               "checkpointId": signal.get("checkpointId")})
    health.add("hitl", "openspec-requirements/**", True,
               (["%d 个检查点无 durable trace（H3 prototype / H5 storymap）" % len(invisible)]
                if invisible else []),
               {"checkpoints": len(checkpoints), "invisible": len(invisible), "waived": len(waived)})
    return {"checkpoints": checkpoints, "invisible": invisible, "waived": waived}


# ─────────────────────────────── 业务知识资产 review ───────────────────────────────


def _archive_story_list_count(archives_ctx):
    """归档块中 story-list 数量（兼容 list / int 两种形状）。"""
    value = archives_ctx.get("storyListCount", archives_ctx.get("storyLists", 0))
    if isinstance(value, list):
        return len(value)
    return int(value or 0)


def _html_last_updated(text, rel_path):
    match = re.search(r"Last Updated:\s*(\d{4}-\d{2}-\d{2})", text)
    if match:
        return match.group(1), "html-meta", match
    return None, "none", None


def _blueprint_capabilities(text):
    """服务蓝图 capability 节点状态（data-capability + class planned/support）。"""
    states = {}
    pattern = re.compile(r'<div class="capability([^"]*)"[^>]*data-capability="([^"]+)"[^>]*>(.*?)</div>', re.S)
    for match in pattern.finditer(text):
        classes = match.group(1).split()
        capability = match.group(2).strip()
        if "planned" in classes:
            states[capability] = "planned"
        elif "support" in classes:
            states[capability] = "crossStage"
        else:
            states[capability] = "landed"
        desc_match = re.search(r'<span class="capability-desc">([^<]*)</span>', match.group(3))
        if desc_match and "规划中" in desc_match.group(1) and states.get(capability) != "planned":
            states[capability] = "planned"
    return states


def _count_requirements(spec_path):
    text = _read(spec_path)
    return len(re.findall(r"^###\s+Requirement:", text, re.M))


def scan_asset_review(root, roadmap, archives_ctx, today, gb_mod, health):
    """业务知识资产（3 baseline HTML + design-system + PRODUCT + ROADMAP）review 模型。"""
    baseline_dir = os.path.join(str(root), "docs", "baseline")
    specs_dir = os.path.join(str(root), "openspec", "specs")
    assets = []
    # 旧脚本 scan_baseline 作为兜底 base 层（HTML meta 解析失败时用它）
    try:
        baseline_base = {item["file"]: item for item in gb_mod.scan_baseline()}
    except Exception as exc:  # noqa: BLE001 - 兜底源失败不阻断
        baseline_base = {}
        health.add("baseline-base", "docs/baseline/", False,
                   ["旧脚本 scan_baseline 异常：%s" % exc])

    blueprint_path = os.path.join(baseline_dir, "service_blueprint.html")
    blueprint_text = _read(blueprint_path)
    bp_caps = _blueprint_capabilities(blueprint_text)
    bp_counts = {
        "stages": len(re.findall(r'class="stage-name">([^<]+)', blueprint_text)),
        "lanes": len(set(re.findall(r'class="row-title">([^<]+)', blueprint_text))),
        "crossCards": len(set(re.findall(r'class="cross-card-title">([^<]+)', blueprint_text))),
        "capabilityNodes": len(bp_caps),
    }
    bp_states = {"landed": 0, "planned": 0, "crossStage": 0}
    for state in bp_caps.values():
        bp_states[state] = bp_states.get(state, 0) + 1

    process_path = os.path.join(baseline_dir, "business_process.html")
    process_text = _read(process_path)
    process_nodes = sorted(set(re.findall(r"L[123]-\d{2}", process_text)))
    process_counts = {
        "sections": len(set(re.findall(r'class="section-title">([^<]+)', process_text))),
        "nodes": len(process_nodes),
        "L1": len([node for node in process_nodes if node.startswith("L1")]),
        "L2": len([node for node in process_nodes if node.startswith("L2")]),
        "L3": len([node for node in process_nodes if node.startswith("L3")]),
        "receivableKeywords": len(re.findall(r"应收|receivable", process_text, re.I)),
    }

    domain_path = os.path.join(baseline_dir, "domain_model.html")
    domain_text = _read(domain_path)
    bc_ids = sorted(set(re.findall(r"id: 'bc-([a-z0-9-]+)'", domain_text)))
    cap_ids = sorted(set(re.findall(r"cap-[a-z0-9-]+", domain_text)))
    spec_dirs = sorted(
        os.path.basename(path) for path in glob.glob(os.path.join(specs_dir, "*")) if os.path.isdir(path)
    )
    domain_counts = {"boundedContexts": len(bc_ids), "capabilities": len(cap_ids),
                     "specDirs": len(spec_dirs)}
    bp_receivable = len(re.findall(r"应收|receivable", blueprint_text, re.I))
    domain_receivable = len(re.findall(r"应收|receivable", domain_text, re.I))

    last_epic = _last_archived_epic(archives_ctx)

    def add_asset(asset_id, title, kind, rel_path, updated, source, counts, drift, extra=None):
        base = baseline_base.get(os.path.basename(rel_path))
        if not updated and base and base.get("updated") not in ("未知", "", None):
            updated, source = base["updated"], "html-meta"
        age = None
        updated_date = _parse_iso_date(updated)
        if updated_date:
            age = (today - updated_date).days
        last_synced = None
        if updated_date and kind == "baseline-html":
            matches = [item for item in archives_ctx.get("requirementEpics", [])
                       if item.get("archivedAt") == updated_date.isoformat()]
            if matches:
                last_synced = {"epicKey": matches[-1]["key"], "date": updated_date.isoformat(),
                               "confidence": "low",
                               "note": "按 Last Updated 与需求侧 Epic 归档日期推断，非持久同步记录"}
        asset = {
            "assetId": asset_id,
            "id": asset_id,
            "title": title,
            "kind": kind,
            "path": rel_path,
            "updatedAt": updated,
            "updatedAtSource": source,
            "updatedSource": source,
            "ageDays": age,
            "freshness": _freshness(age),
            "lastEpicSynced": last_synced,
            "contentCounts": counts,
            "driftCandidates": drift,
            "reviewStatus": "none" if not _governance_reviews(root) else "recorded",
            "review": {"status": "none", "lastPath": None, "lastAt": None},
            "expectedAfterEpic": last_epic,
            "nextAction": _asset_next_action(root, asset_id, title, updated, age, drift),
            "evidence": [_ev(rel_path, "artifact", None, updated)],
            "links": {"openPath": rel_path},
        }
        if extra:
            asset.update(extra)
        assets.append(asset)
        return asset

    # 1) 服务蓝图：D1 capability 状态过期
    drift_blueprint = []
    for capability, state in sorted(bp_caps.items()):
        if state != "planned":
            continue
        spec_path = os.path.join(specs_dir, capability, "spec.md")
        if os.path.isfile(spec_path):
            requirement_count = _count_requirements(spec_path)
            drift_blueprint.append({
                "code": "capability-status-stale",
                "severity": "high",
                "message": "服务蓝图把 capability `%s` 标为『规划中』，但主规格 %s 已存在（%d 条 Requirement）"
                           % (capability, _rel(root, spec_path), requirement_count),
                "evidence": [
                    _ev("docs/baseline/service_blueprint.html", "html-meta", None,
                       "capability planned: %s" % capability),
                    _ev(_rel(root, spec_path), "artifact", None, "%d Requirement" % requirement_count),
                ],
                "fixHint": "执行 /opsx:baseline/sync 更新 capability 状态（或登记显式 no-op 判定）",
            })
    updated, source, match = _html_last_updated(blueprint_text, "docs/baseline/service_blueprint.html")
    add_asset("service-blueprint", "服务蓝图 (service_blueprint.html)", "baseline-html",
              "docs/baseline/service_blueprint.html", updated, source, bp_counts, drift_blueprint,
              {"capabilityStates": bp_states})

    # 2) 业务流程：D2 应收支流未回流
    drift_process = []
    if process_counts["receivableKeywords"] == 0 and (bp_receivable or domain_receivable):
        drift_process.append({
            "code": "process-baseline-missing-branch",
            "severity": "high",
            "message": "business_process.html 全文 0 处『应收 / receivable』，Phase 7 应收闭环未回流流程基线"
                       "（service_blueprint %d 处 / domain_model %d 处）" % (bp_receivable, domain_receivable),
            "evidence": [
                _ev("docs/baseline/business_process.html", "artifact", None, "应收关键词 0 命中"),
                _ev("docs/baseline/service_blueprint.html", "artifact", None,
                   "应收/receivable %d 处" % bp_receivable),
                _ev("docs/baseline/domain_model.html", "artifact", None,
                   "应收/receivable %d 处" % domain_receivable),
            ],
            "fixHint": "执行 /opsx:baseline/sync 的 process-flow 分支，补齐 L1-07 应收支流",
        })
    updated, source, _ = _html_last_updated(process_text, "docs/baseline/business_process.html")
    add_asset("business-process", "业务流程 (business_process.html)", "baseline-html",
              "docs/baseline/business_process.html", updated, source, process_counts, drift_process)

    # 3) 领域模型：D3 capability 口径差 1
    drift_domain = []
    if domain_counts["capabilities"] != len(spec_dirs):
        drift_domain.append({
            "code": "capability-count-mismatch",
            "severity": "medium",
            "message": "domain_model.html 有 %d 个 cap-* 节点，openspec/specs/ 有 %d 个主规格目录"
                       "（口径差 %d，多出目录：%s），需人工确认 capability 归属，不自动判错"
                       % (domain_counts["capabilities"], len(spec_dirs),
                          abs(len(spec_dirs) - domain_counts["capabilities"]),
                          "、".join(sorted(set(spec_dirs) - set()) or []) or "见 specs/"),
            "evidence": [
                _ev("docs/baseline/domain_model.html", "artifact", None,
                   "%d cap-* / %d bc-*" % (len(cap_ids), len(bc_ids))),
                _ev("openspec/specs/", "artifact", None, "%d 个主规格目录" % len(spec_dirs)),
            ],
            "fixHint": "人工确认 capability 归属后，在 domain-model baseline sync 中登记 no-op 或补齐节点",
        })
        drift_domain[-1]["message"] = (
            "domain_model.html 有 %d 个 cap-* 节点，openspec/specs/ 有 %d 个主规格目录（口径差 1），"
            "需人工确认 capability 归属，不自动判错" % (domain_counts["capabilities"], len(spec_dirs))
        )
    updated, source, _ = _html_last_updated(domain_text, "docs/baseline/domain_model.html")
    add_asset("domain-model", "领域模型 (domain_model.html)", "baseline-html",
              "docs/baseline/domain_model.html", updated, source, domain_counts, drift_domain)

    # 4) 设计系统（无日期，只能 mtime）
    ds_dir = os.path.join(baseline_dir, "design-system")
    ds_files = sorted(glob.glob(os.path.join(ds_dir, "**", "*"), recursive=True))
    ds_files = [path for path in ds_files if os.path.isfile(path)]
    ds_mtime = _latest_mtime(ds_files)
    ds_guidelines = _read(os.path.join(ds_dir, "guidelines", "Guidelines.md"))
    ds_css = _read(os.path.join(ds_dir, "src", "index.css"))
    ds_counts = {
        "files": len(ds_files),
        "readmeLines": len(_read(os.path.join(ds_dir, "README.md")).splitlines()),
        "guidelinesLines": len(ds_guidelines.splitlines()),
        "tokenFiles": 1 if ds_css else 0,
        "tokens": len(re.findall(r"--[a-z0-9-]+\s*:", ds_css)),
        "hasVersionRecord": 1 if re.search(r"Version\s", ds_guidelines) else 0,
    }
    # design-system 无日期只能 mtime（作为 freshness 证据，不计入 D1–D4 漂移候选）
    drift_ds = []
    add_asset("design-system", "设计系统 (design-system/)", "design-system",
              "docs/baseline/design-system/", _iso_or_none(ds_mtime), "mtime", ds_counts, drift_ds)

    # 5) 产品定位（front-matter）
    product_text = _read(os.path.join(str(root), "docs", "PRODUCT.md"))
    product_updated = _frontmatter_value(product_text, "updated_at") or _iso_or_none(
        _mtime_date(os.path.join(str(root), "docs", "PRODUCT.md")))
    product_counts = {"sections": len(re.findall(r"^##\s+", product_text, re.M)),
                      "headings": len(re.findall(r"^#{1,3}\s+", product_text, re.M))}
    drift_product = []
    add_asset("product", "产品定位 (PRODUCT.md)", "planning-md", "docs/PRODUCT.md", product_updated,
              "frontmatter", product_counts, drift_product)

    # 6) 路线图（front-matter + 计数漂移 D4）
    roadmap_updated = roadmap["frontMatter"].get("updated_at") or _iso_or_none(
        _mtime_date(os.path.join(str(root), "docs", "ROADMAP.md")))
    roadmap_text = roadmap.get("text", "")
    archive_claim_match = re.search(r"共\s*(\d+)\s*个变更已归档", roadmap_text)
    archive_claim = int(archive_claim_match.group(1)) if archive_claim_match else None
    change_dirs = archives_ctx.get("changeDirs", 0)
    story_lists = _archive_story_list_count(archives_ctx)
    draft_total = sum(len(phase["draftStories"]) for phase in roadmap["phases"])
    roadmap_counts = {
        "phases": len(roadmap["phases"]),
        "currentPhase": roadmap["current"]["no"] or 0,
        "reviewRows": len(re.findall(r"^\|\s*[^|]+\s*\|\s*(?:✅|⚠️|❌)", roadmap_text, re.M)),
        "draftStories": draft_total,
        "plannedEpics": len(roadmap["planned"]),
        "archivedClaimed": archive_claim or 0,
        "archivedActual": change_dirs,
        "archiveStoryLists": story_lists,
    }
    drift_roadmap = []
    if archive_claim is not None and archive_claim != change_dirs:
        line = _line_no(roadmap_text, archive_claim_match.start())
        drift_roadmap.append({
            "code": "roadmap-count-stale",
            "severity": "medium",
            "message": "ROADMAP.md:%d 称『共 %d 个变更已归档』，实际 openspec/changes/archive/ 有 %d 个 change 目录"
                       "（另有 %d 个 story-list 文件，合计 %d 项）"
                       % (line, archive_claim, change_dirs, story_lists, change_dirs + story_lists),
            "evidence": [
                _ev("docs/ROADMAP.md", "artifact", "line:%d" % line, "%d 个变更" % archive_claim),
                _ev("openspec/changes/archive/", "archive-dir", None,
                   "%d 个 change 目录 + %d 个 story-list" % (change_dirs, story_lists)),
            ],
            "fixHint": "更新 ROADMAP 归档计数，或修正计数口径（change 目录 vs story-list）",
        })
    add_asset("roadmap", "产品路线图 (ROADMAP.md)", "planning-md", "docs/ROADMAP.md", roadmap_updated,
              "frontmatter", roadmap_counts, drift_roadmap)

    asset_summary = {
        "total": len(assets),
        "fresh": len([item for item in assets if item["freshness"] == "fresh"]),
        "aging": len([item for item in assets if item["freshness"] == "aging"]),
        "stale": len([item for item in assets if item["freshness"] == "stale"]),
        "unknown": len([item for item in assets if item["freshness"] == "unknown"]),
        "driftCandidates": sum(len(item["driftCandidates"]) for item in assets),
    }
    health.add("baseline", "docs/baseline/", True,
               (["3 份 baseline HTML 的 Last Updated 均早于最近 Epic 归档（%s）" % last_epic["date"]]
                if last_epic else []),
               {"assets": len(assets), "baselineHtml": 3,
                "driftCandidates": asset_summary["driftCandidates"]})
    return {"assets": assets, "summary": asset_summary, "lastEpic": last_epic}


def _frontmatter_value(text, key):
    match = re.search(r"^%s\s*:\s*(.+)$" % re.escape(key), text or "", re.M)
    return match.group(1).strip() if match else None


def _last_archived_epic(archives_ctx):
    epic_dirs = archives_ctx.get("requirementEpics", [])
    if not epic_dirs:
        return None
    latest = max(epic_dirs, key=lambda item: item.get("archivedAt") or "")
    return {"epicKey": latest["key"], "date": latest.get("archivedAt")}


def _governance_reviews(root):
    reviews = []
    for path in sorted(glob.glob(os.path.join(str(root), "docs", "governance", "reviews", "*.md"))):
        reviews.append(path)
    for path in sorted(glob.glob(os.path.join(str(root), "openspec", "changes", "archive", "*", "review.md"))):
        reviews.append(path)
    return reviews


def _asset_next_action(root, asset_id, title, updated, age, drift):
    codes = ",".join(item["code"] for item in drift) or "无漂移候选"
    prompt = (
        "你是 SDD 产品经理（PM）。仓库：%s。请复核业务知识资产：%s（Last Updated %s，距今 %s 天；"
        "漂移候选：%s）。\n步骤：1) 对照 openspec/specs/、openspec-requirements/ 与 ROADMAP 核对资产是否过期；"
        "2) 需要更新则执行 /opsx:baseline/sync（blueprint / process-flow / domain-model），"
        "无变化则记录显式 no-op 结论；3) 输出待确认清单后暂停（HITL）。"
        % (root, title, updated or "未知", age if age is not None else "?", codes)
    )
    return _action("用 PM Agent 复核：%s" % title, kind="session", prompt=prompt,
                   enabled=True, action_id="opsx:baseline/sync", requires_hitl=True)


# ─────────────────────────────── 归档 / 治理 / 变更 ───────────────────────────────


ARCHIVE_TYPE_MAP = {"Epic 大需求": "epic", "Story 用户故事": "story", "缺陷修复": "bugfix", "功能": "feature"}


def scan_archives(root, days, gb_mod, health, story_list_ctx=None):
    """归档块：复用旧脚本 scan_archives，补结构统计 / 门禁口径（未执行 ≠ FAIL）。"""
    try:
        recent_raw, history_raw = gb_mod.scan_archives(days)
    except Exception as exc:  # noqa: BLE001 - 单源异常 → degraded
        health.add("archive", "openspec/changes/archive", False,
                   ["旧脚本 scan_archives 异常：%s" % exc])
        recent_raw, history_raw = [], []

    def convert(item, ui_aliases=False):
        verify = item.get("verify")
        key = item.get("key")
        entry = {
            "key": key,
            "date": item.get("date"),
            "type": item.get("type"),
            "typeKey": ARCHIVE_TYPE_MAP.get(item.get("type"), "other"),
            "gateResult": verify,
        }
        if ui_aliases:
            # Client 的 normalizeArchiveEntry 读 name / gates.allPass —— 仅 recent（会被 UI 渲染）带别名
            entry.update({"name": key, "gates": verify,
                          "allPass": bool(verify and verify.get("all_pass"))})
        return entry

    recent = [convert(item, ui_aliases=True) for item in recent_raw]
    history = [convert(item) for item in history_raw]
    change_dirs = [item for item in history + recent if not str(item["key"]).endswith(".json")]
    story_lists_all = (story_list_ctx or {}).get("lists")
    if not story_lists_all:
        story_lists_all = [
            {"file": _rel(root, os.path.join(str(root), "openspec", "changes", "archive", item["key"])),
             "epicKey": "", "title": "", "stories": 0, "allDone": True, "archived": True,
             "updatedAt": None}
            for item in history + recent if str(item["key"]).endswith(".json")
        ]
    # 归档块只统计「已归档」的 story-list；未归档的由 ORPHAN_STORY_LIST 告警单独暴露。
    story_lists = [entry for entry in story_lists_all if entry.get("archived", True)]
    gate_total = len(change_dirs)
    gate_all_pass = 0
    gate_failed = 0
    for item in change_dirs:
        verify = item.get("gateResult") or {}
        if verify.get("all_pass"):
            gate_all_pass += 1
        hard = [verify.get(key, "") for key in ("schema", "node", "python", "frontend")]
        if any("FAIL" in str(value) for value in hard) or "FAIL" in str(verify.get("e2e", "")):
            gate_failed += 1
    # `未执行` ≠ FAIL：未达「4 项 Hard Gate 全 PASS」且无 FAIL 的，按旧格式/未记录口径统计
    gate_not_recorded = max(0, gate_total - gate_all_pass - gate_failed)
    dates = [item["date"] for item in recent + history if item.get("date") and item["date"] != "—"]
    last_date = max(dates) if dates else None
    requirement_epics = []
    for epic_dir in sorted(glob.glob(os.path.join(str(root), "openspec-requirements", "archive", "*"))):
        dir_name = os.path.basename(epic_dir)
        date_match = re.match(r"(\d{4}-\d{2}-\d{2})-(.+)$", dir_name)
        if not date_match:
            continue
        status_text = _read(os.path.join(epic_dir, "STATUS.md"))
        requirement_epics.append({
            "key": status_info_key(status_text) or date_match.group(2),
            "dir": _rel(root, epic_dir),
            "archivedAt": date_match.group(1),
            "stories": len(glob.glob(os.path.join(epic_dir, "stories", "*", "story.md"))),
        })
    health.add(
        "archive", "openspec/changes/archive", True,
        (["%d 个归档 change 的 verify.md 为旧格式 / 未记录（`未执行` ≠ `FAIL`），不计入阻塞"
          % gate_not_recorded] if gate_not_recorded else []),
        {"entries": len(recent) + len(history), "changeDirs": gate_total,
         "storyLists": len(story_lists), "recent": len(recent)},
    )
    return {
        "recent": recent,
        "recentCount": len(recent),
        "historyCount": len(history),
        "history": history,
        "lastDate": last_date,
        "days": days,
        "changeDirs": gate_total,
        "storyLists": story_lists,
        "storyListCount": len(story_lists),
        "totals": {
            "requirementsEpics": len(requirement_epics),
            "changes": gate_total,
            "storyLists": len(story_lists),
            "recentCount": len(recent),
            "historyCount": len(history),
        },
        "requirementEpics": requirement_epics,
        "requirementsEpics": requirement_epics,
        "total": len(recent) + len(history),
        "gateSummary": {
            "changes": gate_total,
            "hardGatesAllPass": gate_all_pass,
            "failed": gate_failed,
            "notRecorded": gate_not_recorded,
            "note": "`未执行` 不等于 `FAIL`；0 个 FAIL 时不得判阻塞",
        },
        "requirementEpics": requirement_epics,
    }


def status_info_key(status_text):
    match = EPIC_KEY_LINE_RE.search(status_text or "")
    return match.group(1).strip() if match else ""


def scan_governance(root, archives_ctx, health):
    """治理评审（change review.md + docs/governance/reviews/）——今天恒为 0 份。"""
    reviews = []
    for path in sorted(glob.glob(os.path.join(str(root), "docs", "governance", "reviews", "*.md"))):
        reviews.append(_parse_review(root, path, "repo"))
    for path in sorted(glob.glob(os.path.join(str(root), "openspec", "changes", "archive",
                                              "*", "review.md"))):
        reviews.append(_parse_review(root, path, "change"))
    changes_archived = archives_ctx.get("changeDirs", 0)
    epics = len(archives_ctx.get("requirementEpics", []))
    changes_with_review = len([item for item in reviews if item.get("scope") == "change"])
    epics_with_review = len([item for item in reviews if item.get("scope") == "epic"])
    health.add("review", "docs/governance/reviews/", True,
               (["%d 个归档 change 均无 review.md；docs/governance/reviews/ 为空（review 门禁从未执行）"
                 % changes_archived] if changes_archived and not reviews else []),
               {"reviews": len(reviews), "changesArchived": changes_archived})
    return {
        "reviews": reviews,
        "count": len(reviews),
        "reviewCoverage": {
            "changesArchived": changes_archived,
            "changesWithReview": changes_with_review,
            "epics": epics,
            "epicsWithReview": epics_with_review,
        },
        "acceptedRisks": [],
        "lastReviewAt": None,
    }


def _parse_review(root, path, scope):
    text = _read(path)
    rel = _rel(root, path)
    date_match = DATE_RE.search(os.path.basename(path)) or DATE_RE.search(text)
    verdict_match = re.search(r"Verdict[:：]\s*(PASS|WARN|FAIL)", text, re.I)
    p0 = len(re.findall(r"\bP0\b", text))
    p1 = len(re.findall(r"\bP1\b", text))
    return {
        "path": rel,
        "scope": scope,
        "date": date_match.group(1) if date_match else None,
        "verdict": verdict_match.group(1).upper() if verdict_match else None,
        "p0": p0,
        "p1": p1,
    }


def scan_active_changes(root, gb_mod, health):
    """开发侧活跃 change（只读；今天 0 个）。"""
    try:
        active = gb_mod.scan_active_changes()
    except Exception as exc:  # noqa: BLE001
        health.add("changes", "openspec/changes", False, ["旧脚本 scan_active_changes 异常：%s" % exc])
        active = []
    items = []
    for change in active:
        rel = _rel(root, change["dir"])
        items.append({
            "key": change["key"],
            "dir": rel,
            "devPhase": change["phase"],
            "phase": change["phase"],
            "status": "devInProgress",
            "confidence": "high",
            "statusBecause": ["R09/R10: openspec/changes/%s/ 存在且阶段推断为 %s" % (
                change["key"], change["phase"])],
        })
    health.add("changes", "openspec/changes", True, [],
               {"active": len(items), "design": len([i for i in items if i["phase"] == "design"]),
                "coding": len([i for i in items if i["phase"] == "coding"])})
    return {"items": items, "count": len(items)}


# ─────────────────────────────── 数据卫生 warnings ───────────────────────────────


def scan_data_hygiene(root, ctx):
    """G11–G14 + 扫描器缺陷 + 治理缺口 → warnings[]（§7.1）。"""
    warnings = []
    roadmap = ctx["roadmap"]
    epics = ctx["epics"]["items"]
    archives_ctx = ctx["archives"]
    story_ctx = ctx["storyLists"]
    roadmap_text = roadmap.get("text", "")

    # G11 / R16：STATUS ↔ ROADMAP 矛盾
    for epic in epics:
        if epic["lifecycle"]["archived"]:
            continue
        status_text = _read(os.path.join(str(root), epic["dir"], "STATUS.md"))
        conflict = _status_roadmap_conflict(status_text, roadmap)
        if conflict:
            warnings.append({
                "code": "STATUS_ROADMAP_CONFLICT",
                "severity": "warning",
                "message": "；".join(conflict["messages"]),
                "itemId": "epic:%s" % epic["key"],
                "evidence": conflict["evidence"],
            })

    # G12：归档计数漂移
    archive_claim = re.search(r"共\s*(\d+)\s*个变更已归档", roadmap_text)
    if archive_claim and int(archive_claim.group(1)) != archives_ctx["changeDirs"]:
        warnings.append({
            "code": "ARCHIVE_COUNT_DRIFT",
            "severity": "warning",
            "message": "ROADMAP.md:%d 称『共 %d 个变更已归档』，实际 archive 有 %d 个 change 目录"
                       "（+%d 个 story-list）" % (
                           _line_no(roadmap_text, archive_claim.start()),
                           int(archive_claim.group(1)), archives_ctx["changeDirs"],
                           _archive_story_list_count(archives_ctx)),
            "evidence": [
                _ev("docs/ROADMAP.md", "artifact",
                    "line:%d" % _line_no(roadmap_text, archive_claim.start())),
                _ev("openspec/changes/archive/", "archive-dir"),
            ],
        })

    # G13：未归档 story-list / R14 孤儿
    for item in story_ctx["unarchived"]:
        warnings.append({
            "code": "ORPHAN_STORY_LIST",
            "severity": "warning",
            "message": "%s 全部 done 但未按 SOP 归档到 openspec/changes/archive/（活跃位虚高）" % item["file"],
            "evidence": [_ev(item["file"], "json-field", "stories[*].status", "全部 done")],
        })
    for orphan in story_ctx["orphan"]:
        warnings.append({
            "code": "ORPHAN_STORY_LIST",
            "severity": "warning",
            "message": "%s 中 Story %s 为 in_progress 但其 change 已归档（R14 状态漂移，需对账）"
                       % (orphan["file"], orphan["storyId"]),
            "evidence": [_ev(orphan["file"], "json-field", "stories[*].status", orphan["reason"])],
        })

    # G14：legacy idea 池路径
    expected_ideas = os.path.join(str(root), "openspec", "changes", "ideas", "idea.md")
    legacy_idea = os.path.join(str(root), "openspec", "idea.md")
    if not _exists(expected_ideas) and _exists(legacy_idea):
        warnings.append({
            "code": "LEGACY_IDEA_PATH",
            "severity": "info",
            "message": "期望的 openspec/changes/ideas/idea.md 不存在；legacy openspec/idea.md 存在但无状态/无 owner，"
                       "交付看板的『想法池』会永远显示 0",
            "evidence": [_ev("openspec/idea.md", "artifact"),
                         _ev("openspec/changes/ideas/idea.md", "artifact", None, "不存在")],
        })

    # 治理评审缺口
    if archives_ctx["changeDirs"] and not ctx["governance"]["reviews"]:
        warnings.append({
            "code": "MISSING_REVIEWS",
            "severity": "warning",
            "message": "%d 个归档 change 均无 review.md；docs/governance/reviews/ 为空（review / P0-P1 裁决门禁从未执行）"
                       % archives_ctx["changeDirs"],
            "evidence": [_ev("docs/governance/reviews/", "artifact", None, "仅 .gitkeep"),
                         _ev("openspec/changes/archive/", "archive-dir")],
        })

    # 扫描器缺陷（本层已修正，但保留告警便于对齐交付看板口径）
    base = roadmap.get("base", {})
    if base.get("planned") == [] and roadmap["planned"]:
        warnings.append({
            "code": "SCANNER_REGEX_MISS",
            "severity": "info",
            "message": "既有交付看板脚本的『规划中 Epic』正则（只匹配 `**Epic N`）未命中 ROADMAP Phase 8/9 的"
                       "`代表性 Epic: \\`key\\`` 与 draft 表；本扫描器已修正（planned=%d）" % len(roadmap["planned"]),
            "evidence": [_ev("scripts/generate_delivery_board.py", "artifact", "line:132-136"),
                         _ev("docs/ROADMAP.md", "artifact")],
        })
    partial = ctx["epics"]["partialCells"]
    if partial:
        warnings.append({
            "code": "SCANNER_PARTIAL_DONE",
            "severity": "info",
            "message": "发现 %d 个 `🔄 部分 done` 单元格（%s）；旧脚本按 `done` 子串误判为完成，"
                       "本扫描器按 partial 降级处理（不标 done）" % (
                           len(partial), "、".join("%s/%s" % (item["epicKey"], item["stage"])
                                                 for item in partial[:3])),
            "evidence": [_ev(item["path"], "status-cell", "line:%d" % (item["line"] or 0), item["cell"])
                         for item in partial[:3]],
        })
    stale_names = roadmap.get("staleFallbackNotes") or []
    if stale_names:
        warnings.append({
            "code": "SCANNER_PHASE_NAMES_STALE",
            "severity": "info",
            "message": "既有脚本 PHASE_NAMES 兜底表与 ROADMAP 名称不一致：%s；"
                       "本扫描器已改用正确兜底表（Phase 6=微信小程序渠道 / 7=回款与应收账款闭环 / 8=运营效率增强）"
                       % "；".join("Phase %d 旧=%s 新=%s" % item for item in stale_names),
            "evidence": [_ev("scripts/generate_delivery_board.py", "artifact", "line:31-39")],
        })

    # HITL 不可见 / v6 MUST 历史豁免 / verify 未执行口径
    if ctx["hitl"]["invisible"]:
        warnings.append({
            "code": "HITL_INVISIBLE_CHECKPOINTS",
            "severity": "info",
            "message": "%d 个检查点无 durable 记录（%s）：prototype/storymap 文件里没有 sign-off 段，"
                       "看板只能以『待确认(推断)』呈现，置信度封顶 medium（G1）" % (
                           len(ctx["hitl"]["invisible"]),
                           "、".join("%s:%s" % (item["epicKey"], item["stage"])
                                     for item in ctx["hitl"]["invisible"])),
            "evidence": [_ev(item["epicKey"] and "openspec-requirements/epics/%s/" % item["epicKey"] or
                             "openspec-requirements/", "artifact")
                         for item in ctx["hitl"]["invisible"][:2]],
        })
    if ctx["testDesign"]["historyExempt"]:
        warnings.append({
            "code": "TEST_DESIGN_HISTORY_EXEMPT",
            "severity": "info",
            "message": "test-design.md 当前 0 份产出（v6 于 2026-11-02 才加入 MUST）；%d 份历史 Story"
                       "（%d 个已归档 Epic）按历史豁免，不标阻塞；MUST 仅对活跃 Epic 生效（G10）" % (
                           ctx["testDesign"]["historyStories"], ctx["testDesign"]["archivedEpics"]),
            "evidence": [_ev("openspec-requirements/epics/", "artifact", None, "0 份 test-design.md")],
        })
    gate = archives_ctx["gateSummary"]
    if gate["notRecorded"] and not gate["failed"]:
        warnings.append({
            "code": "VERIFY_NOT_EXECUTED",
            "severity": "info",
            "message": "%d 个归档 change 的 verify.md 为旧格式/未记录（`未执行` ≠ `FAIL`）；%d 个 Hard Gate 全 PASS，"
                       "0 个 FAIL → 不构成阻塞（R13 不能把未执行误判为失败）" % (
                           gate["notRecorded"], gate["hardGatesAllPass"]),
            "evidence": [_ev("openspec/changes/archive/", "archive-dir", None,
                             "%d 个 change" % gate["changes"])],
        })
    if story_ctx["missingRequirement"]:
        warnings.append({
            "code": "STORY_LIST_GAP",
            "severity": "info",
            "message": "story-list 共 %d 条 Story 记录，其中 %d 条只存在于开发侧 story-list"
                       "（%s），需求侧无 story.md——历史口径差异，不影响活跃 Epic" % (
                           story_ctx["records"], len(story_ctx["missingRequirement"]),
                           "、".join(story_ctx["missingRequirement"][:6])),
            "evidence": [_ev("openspec/changes/archive/", "archive-dir"),
                         _ev("openspec-requirements/archive/", "archive-dir")],
        })
    return warnings


# ─────────────────────────────── 看板规则引擎 ───────────────────────────────


def _stage_board_item(epic, stage):
    item = {
        "id": "stage:%s:%s" % (epic["key"], stage["key"]),
        "kind": "stage",
        "title": stage["title"],
        "subtitle": "%s · 阶段 %d/7%s" % (
            epic["key"], STAGE_ORDER.index(stage["key"]) + 1,
            "（MUST）" if "must" in stage["tags"] else ("（OPT）" if "optional" in stage["tags"] else "")),
        "owner": "pm",
        "status": stage["status"],
        "statusConfidence": stage["confidence"],
        "statusBecause": stage["statusBecause"] or ["未命中规则 → 未知"],
        "evidence": _dedupe_evidence(stage["evidence"]),
        "links": {"openPath": epic["dir"] + "/"},
        "tags": stage["tags"],
        "blockers": [],
        "meta": {
            "epicKey": epic["key"],
            "stage": stage["key"],
            "ruleIds": stage["ruleIds"],
            "cellRaw": stage.get("cellRaw"),
            "artifactPath": stage.get("artifactPath"),
            "note": stage.get("note"),
        },
    }
    if stage.get("hitlWaived"):
        item["hitlWaived"] = True
    if stage.get("nextAction"):
        item["nextAction"] = stage["nextAction"]
    if stage["key"] == "explore":
        questions = epic["meta"].get("openQuestions")
        if questions:
            item["meta"]["openQuestions"] = questions
            item["meta"]["unresolvedQuestions"] = len(questions)
    return item


RULE_PREFIX = {
    "STATUS_ROADMAP_CONFLICT": "R16",
    "PLANNING_BASIS_MISSING": "R15",
    "MISSING_MUST_ARTIFACT": "R12",
    "STORY_LIST_ORPHAN": "R14",
    "VERIFY_GATE_FAILED": "R13",
}


def _epic_hygiene_item(root, epic):
    blockers = epic["blockers"]
    messages = [blocker["message"] for blocker in blockers]
    reasons = ["%s: %s" % (RULE_PREFIX.get(blocker["code"], blocker["code"][:6]), blocker["message"])
               for blocker in blockers]
    item = {
        "id": "epic:%s" % epic["key"],
        "kind": "epic",
        "title": "%s · 状态自相矛盾 / 数据卫生" % epic["key"],
        "subtitle": "数据卫生告警：%s" % "、".join(sorted({blocker["code"] for blocker in blockers})),
        "owner": "pm",
        "status": "blocked",
        "statusConfidence": "medium",
        "statusBecause": reasons or ["数据卫生告警（规则引擎未给出具体原因）"],
        "nextAction": _action(
            "用 PM Agent 修正 STATUS.md 的过期说明（manual:fix-status-note）",
            kind="session",
            prompt=(
                "你是 SDD 产品经理（PM）。仓库：%s。Epic：%s 的 STATUS.md 存在与 ROADMAP 矛盾的过期说明：%s。\n"
                "请：1) 核对 docs/ROADMAP.md 的当前阶段与 Epic 登记事实；2) 修正 STATUS.md 对应阶段行的说明"
                "（去掉已过期的规划门禁理由，不改阶段状态）；3) 同步检查 Epic 备注是否过期；"
                "4) 输出改动清单后暂停（HITL）。"
                % (root, epic["key"], "；".join(messages))
            ),
            enabled=True,
            action_id="manual:fix-status-note",
            requires_hitl=False,
        ),
        "blockers": blockers,
        "evidence": [evidence for blocker in blockers for evidence in blocker["evidence"]],
        "links": {"openPath": epic["meta"]["statusPath"]},
        "tags": ["data-hygiene"],
        "meta": {"blockerCodes": [blocker["code"] for blocker in blockers]},
    }
    return item


def _draft_story_board_item(root, epic, stories):
    ids = "、".join("%s(%s)" % (story["id"], story["priority"]) for story in stories)
    return {
        "id": "stories:%s:roadmap-draft" % epic["key"],
        "kind": "story",
        "title": "ROADMAP draft Story ×%d（未拆分）" % len(stories),
        "subtitle": ids,
        "owner": "pm",
        "status": "pmTodo",
        "statusConfidence": "high",
        "statusBecause": [
            "R07: %d 条 Story 仅存在于 ROADMAP Phase 9 draft 表（storymap.md 未产出 → 尚未拆分）" % len(stories),
            "MUST 缺失: 每条 Story 的 story.md / test-design.md 均未产出（handoff 前置不成立）",
        ],
        "nextAction": _action(
            "用 PM Agent 继续：先完成 /req:storymap 拆分，再逐个 Story 执行 /req:story",
            kind="session",
            prompt=_stage_prompt(root, epic["key"], "storymap"),
            enabled=False,
            action_id="req:storymap",
            requires_hitl=True,
            eta_minutes=55,
        ),
        "evidence": [_ev("docs/ROADMAP.md", "artifact", None, ids)],
        "links": {"openPath": "docs/ROADMAP.md"},
        "tags": ["roadmap-draft", "not-split", "missing-must"],
        "blockers": [],
        "meta": {"epicKey": epic["key"], "draftStories": [
            {"storyId": story["id"], "title": story["title"], "priority": story["priority"]}
            for story in stories
        ]},
    }


def _change_board_item(change):
    return {
        "id": "change:%s" % change["key"],
        "kind": "change",
        "title": change["key"],
        "subtitle": "开发侧 change 活跃（%s）" % change["phase"],
        "owner": "lead",
        "status": "devInProgress",
        "statusConfidence": "high",
        "statusBecause": ["R09/R10: openspec/changes/%s/ 存在，阶段=%s" % (change["key"], change["phase"])],
        "nextAction": _action(
            "查看开发侧 change 进度（只读；异常找 lead 处理）",
            kind="info",
            enabled=False,
            action_id="opsx:verify",
        ),
        "evidence": [_ev(change["dir"], "artifact")],
        "links": {"openPath": change["dir"] + "/"},
        "tags": ["dev-side", "read-only"],
        "blockers": [],
        "meta": {"changePhase": change["phase"]},
    }


def _item_sort_key(item):
    action = item.get("nextAction") or {}
    return (
        0 if item.get("owner") == "pm" else 1,
        0 if item.get("status") == "blocked" else 1,
        action.get("etaMinutes", 999),
        item.get("id", ""),
    )


def scan_board_state(root, epic_ctx, story_records, active_changes):
    """R01–R18 看板聚合：boards（10 列）+ summary.counts（严格一致）。"""
    items = []
    for epic in epic_ctx["active"]:
        for stage in epic["stages"]:
            items.append(_stage_board_item(epic, stage))
        if epic["blockers"]:
            items.append(_epic_hygiene_item(root, epic))
        drafts = [story for story in story_records
                  if story["epicKey"] == epic["key"] and story["source"] == "roadmap-draft"]
        if drafts:
            items.append(_draft_story_board_item(root, epic, drafts))
    for change in active_changes["items"]:
        items.append(_change_board_item(change))

    boards = {}
    for key, title, order in BOARD_ORDER:
        column_items = [item for item in items if item["status"] == key]
        column_items.sort(key=_item_sort_key)
        boards[key] = {
            "key": key,
            "title": title,
            "order": order,
            "count": len(column_items),
            "items": column_items,
        }
    return boards, items


# ─────────────────────────────── 顶层 collect ───────────────────────────────


def collect(root, days=DEFAULT_DAYS):
    """构建完整 PmBoardSnapshot（单数据源失败降级，不整体失败）。"""
    root = Path(str(root)).resolve()
    now = datetime.datetime.now().astimezone()
    generated_at = now.isoformat(timespec="seconds")
    today = now.date()
    health = HealthLog(generated_at)
    warnings = []

    # 聚合器：载入失败 → 整体失败（exit 2）
    gb_mod = load_generator(root)
    gb_mod.ROOT = str(root)
    gb_mod.TODAY = today

    repo = scan_git(root)
    repo["root"] = str(root)

    # 想法池（旧脚本 scan_ideas）：期望路径不存在时降级为 n/a，而不是静默 0（G14）
    try:
        ideas_title = gb_mod.scan_ideas()
    except Exception:  # noqa: BLE001
        ideas_title = ""
    expected_ideas = os.path.join(str(root), "openspec", "changes", "ideas", "idea.md")
    legacy_idea = os.path.join(str(root), "openspec", "idea.md")
    health.add(
        "ideas", "openspec/changes/ideas/idea.md", True,
        ([] if ideas_title else
         (["期望路径不存在；legacy openspec/idea.md 存在但无状态/无 owner（想法池不参与 PM 状态）"]
          if _exists(legacy_idea) else ["想法池路径不存在且无 legacy idea"])),
        {"title": ideas_title or None, "legacyPath": "openspec/idea.md" if _exists(legacy_idea) else None},
    )

    # 规划层
    try:
        roadmap = scan_roadmap(root, gb_mod, health)
    except Exception as exc:  # noqa: BLE001
        health.add("roadmap", "docs/ROADMAP.md", False, ["规划层解析失败：%s" % exc])
        roadmap = {"current": {"no": None, "name": "", "status": "current"}, "phases": [],
                   "planned": [], "frontMatter": {}, "base": {}, "text": ""}

    # 需求侧 Epic / HITL
    try:
        epic_ctx = scan_epics(root, roadmap, health)
    except Exception as exc:  # noqa: BLE001
        health.add("requirements-epics", "openspec-requirements/epics", False,
                   ["Epic 漏斗解析失败：%s" % exc])
        epic_ctx = {"items": [], "active": [], "archived": [], "partialCells": []}
    try:
        hitl_ctx = scan_hitl(root, epic_ctx, health)
    except Exception as exc:  # noqa: BLE001
        health.add("hitl", "openspec-requirements/**", False, ["HITL 解析失败：%s" % exc])
        hitl_ctx = {"checkpoints": [], "invisible": [], "waived": []}

    # Story / story-list
    try:
        story_list_ctx = scan_story_lists(root, health)
    except Exception as exc:  # noqa: BLE001
        health.add("story-list", "openspec/epic-*.story-list.json", False,
                   ["story-list 解析失败：%s" % exc])
        story_list_ctx = {"lists": [], "records": 0, "orphan": [], "missingRequirement": [],
                          "unarchived": []}
    try:
        story_records = scan_story_tracking(root, roadmap, epic_ctx, story_list_ctx, health)
    except Exception as exc:  # noqa: BLE001
        health.add("stories", "openspec-requirements/**/stories", False,
                   ["Story 追踪解析失败：%s" % exc])
        story_records = []

    # 归档（先于资产：资产需要最近归档 Epic）
    try:
        archives_ctx = scan_archives(root, days, gb_mod, health, story_list_ctx)
    except Exception as exc:  # noqa: BLE001
        health.add("archive", "openspec/changes/archive", False, ["归档解析失败：%s" % exc])
        archives_ctx = {"recent": [], "recentCount": 0, "historyCount": 0, "history": [],
                        "lastDate": None, "changeDirs": 0, "storyLists": 0, "total": 0,
                        "gateSummary": {"changes": 0, "hardGatesAllPass": 0, "failed": 0,
                                        "notRecorded": 0, "note": ""},
                        "requirementEpics": []}

    # 业务知识资产
    try:
        asset_ctx = scan_asset_review(root, roadmap, archives_ctx, today, gb_mod, health)
    except Exception as exc:  # noqa: BLE001
        health.add("baseline", "docs/baseline/", False, ["资产 review 解析失败：%s" % exc])
        asset_ctx = {"assets": [], "summary": {"total": 0, "fresh": 0, "aging": 0, "stale": 0,
                                               "unknown": 0, "driftCandidates": 0}}

    # 治理 / 活跃 change
    try:
        governance = scan_governance(root, archives_ctx, health)
    except Exception as exc:  # noqa: BLE001
        health.add("review", "docs/governance/reviews/", False, ["治理评审解析失败：%s" % exc])
        governance = {"reviews": [], "count": 0, "reviewCoverage": {}, "acceptedRisks": [],
                      "lastReviewAt": None}
    try:
        active_changes = scan_active_changes(root, gb_mod, health)
    except Exception as exc:  # noqa: BLE001
        health.add("changes", "openspec/changes", False, ["活跃 change 解析失败：%s" % exc])
        active_changes = {"items": [], "count": 0}

    # 其余数据源的健康度（verify / design-system / governance）——供 UI 的数据源健康表
    gate_summary = archives_ctx.get("gateSummary", {})
    health.add("verify", "openspec/changes/archive/*/verify.md", True,
               (["%d/%d 个归档 change 的 verify.md 为旧格式/未记录（`未执行` ≠ `FAIL`），0 个 FAIL"
                 % (gate_summary.get("notRecorded", 0), gate_summary.get("changes", 0))]
                if gate_summary.get("changes") else []),
               {"files": gate_summary.get("changes", 0),
                "hardGatesAllPass": gate_summary.get("hardGatesAllPass", 0),
                "failed": gate_summary.get("failed", 0),
                "notRecorded": gate_summary.get("notRecorded", 0)})
    ds_asset = next((asset for asset in asset_ctx.get("assets", [])
                     if asset["assetId"] == "design-system"), None)
    health.add("design-system", "docs/baseline/design-system/", True,
               (["无 Last Updated / 版本记录，新鲜度只能按 mtime（%s）推断"
                 % (ds_asset["updatedAt"] if ds_asset else "未知")]
                if ds_asset else ["design-system 目录缺失"]),
               {"files": (ds_asset or {}).get("contentCounts", {}).get("files", 0),
                "mtime": (ds_asset or {}).get("updatedAt")})
    health.add("governance", "docs/governance/reviews/", True,
               (["0 份治理评审记录（目录仅 .gitkeep，review 门禁从未执行）"]
                if not governance.get("reviews") else []),
               {"reviews": governance.get("count", 0),
                "changesWithReview": governance.get("reviewCoverage", {}).get("changesWithReview", 0)})

    # 测试设计历史豁免统计（G10）
    history_stories = 0
    for epic in epic_ctx["archived"]:
        history_stories += len(glob.glob(os.path.join(str(root), epic["dir"], "stories", "*", "story.md")))
    test_design_ctx = {
        "historyStories": history_stories,
        "archivedEpics": len(epic_ctx["archived"]),
        "historyExempt": history_stories > 0,
    }

    # 数据卫生 warnings（需要 epics/archives/hitl 等）
    context = {
        "roadmap": roadmap,
        "epics": epic_ctx,
        "stories": story_records,
        "hitl": hitl_ctx,
        "archives": archives_ctx,
        "assets": asset_ctx,
        "governance": governance,
        "storyLists": story_list_ctx,
        "testDesign": test_design_ctx,
    }
    try:
        warnings.extend(scan_data_hygiene(root, context))
    except Exception as exc:  # noqa: BLE001
        warnings.append({
            "code": "HYGIENE_SCAN_FAILED",
            "severity": "warning",
            "message": "数据卫生扫描异常：%s" % exc,
            "evidence": [],
        })

    # 单数据源失败 → warnings[]（degraded 时必须留痕，不阻断整份快照）
    for entry in health.entries:
        if entry["ok"]:
            continue
        warnings.append({
            "code": "SOURCE_FAILED",
            "severity": "warning",
            "message": "数据源 %s 解析失败（generator.mode=degraded）：%s"
                       % (entry["id"], "；".join(entry["issues"]) or "未知原因"),
            "evidence": [_ev(entry["path"], "artifact")],
        })

    # 看板 + summary
    boards, board_items = scan_board_state(root, epic_ctx, story_records, active_changes)
    counts = {key: boards[key]["count"] for key in BOARD_KEYS}
    done_phases = len([phase for phase in roadmap["phases"] if phase["status"] == "done"])
    total_phases = len(roadmap["phases"])
    current_phase = roadmap["current"]
    active_epic = epic_ctx["active"][0]["key"] if epic_ctx["active"] else None
    story_summary = {
        "total": len([story for story in story_records
                      if story["epicKey"] in {epic["key"] for epic in epic_ctx["active"]}]),
        "ready": len([story for story in story_records if story["readiness"]["ready"]]),
        "missingMust": len([story for story in story_records if story["readiness"]["missingMust"]]),
        "inDev": len([story for story in story_records if story["status"] == "devInProgress"]),
        "done": len([story for story in story_records if story["status"] == "done"]),
    }
    summary = {
        "counts": counts,
        "pmActionCount": counts["pmTodo"] + counts["waitingConfirm"],
        "blockedCount": counts["blocked"],
        "activeEpicKey": active_epic,
        "currentPhase": {
            "no": current_phase.get("no"),
            "name": current_phase.get("name", ""),
            "status": "current",
        },
        "phaseProgress": {
            "done": done_phases,
            "total": total_phases,
            "percent": int(round(done_phases * 100.0 / total_phases)) if total_phases else 0,
        },
        "activeChanges": active_changes["count"],
        "archivedChanges": archives_ctx["changeDirs"],
        "stories": story_summary,
        "assets": asset_ctx["summary"],
        "hitl": {
            "waitingConfirm": counts["waitingConfirm"],
            "confirmed": counts["confirmed"],
            "invisible": len(hitl_ctx["invisible"]),
        },
        "boardItems": len(board_items),
        "warnings": len(warnings),
    }

    # 阶段间依赖进度（补齐 phases[].plannedEpics 的注册/进漏斗事实）
    registered_keys = {epic["key"] for epic in epic_ctx["items"]}
    for phase in roadmap["phases"]:
        for item in phase["plannedEpics"]:
            item["registered"] = item["key"] in registered_keys
            item["enteredRequirements"] = item["registered"]
            if not item.get("title"):
                epic = next((epic for epic in epic_ctx["items"] if epic["key"] == item["key"]), None)
                item["title"] = epic["title"] if epic else phase["name"]

    generator_mode = "degraded" if health.degraded else "full"
    snapshot = {
        "schemaVersion": SCHEMA_VERSION,
        "generatedAt": generated_at,
        "generator": {
            "name": GENERATOR_NAME,
            "version": GENERATOR_VERSION,
            "mode": generator_mode,
        },
        "repo": repo,
        "sourceHealth": health.entries,
        "summary": summary,
        "boards": boards,
        "phases": roadmap["phases"],
        "epics": epic_ctx["items"],
        "stories": story_records,
        "assets": asset_ctx["assets"],
        "governance": governance,
        "archives": archives_ctx,
        "hitl": hitl_ctx,
        "warnings": sorted(warnings, key=lambda item: (SEVERITY_RANK.get(item.get("severity"), 9),
                                                       item.get("code", ""), item.get("message", ""))),
    }
    # 清掉内部字段（__ 前缀）且保证可 JSON 序列化
    return _jsonable(snapshot)


def _jsonable(value):
    if isinstance(value, dict):
        return {str(key): _jsonable(item) for key, item in value.items() if not str(key).startswith("__")}
    if isinstance(value, (list, tuple)):
        return [_jsonable(item) for item in value]
    if isinstance(value, (datetime.date, datetime.datetime)):
        return value.isoformat()
    return value


# ─────────────────────────────── CLI ───────────────────────────────


def _human_summary(snapshot, days=DEFAULT_DAYS):
    summary = snapshot["summary"]
    phase = summary["currentPhase"]
    progress = summary["phaseProgress"]
    counts = summary["counts"]
    lines = [
        "PM 工作台快照 %s · generator=%s(%s)" % (
            snapshot["generatedAt"], snapshot["generator"]["name"], snapshot["generator"]["mode"]),
        "仓库 %s · commit %s%s" % (
            snapshot["repo"]["root"], snapshot["repo"].get("gitCommit"),
            " · 工作区脏" if snapshot["repo"].get("dirty") else ""),
        "阶段 Phase %s · %s（%d/%d，%d%%）" % (
            phase.get("no"), phase.get("name"), progress["done"], progress["total"], progress["percent"]),
        "活跃 Epic: %s" % (summary["activeEpicKey"] or "无"),
        "看板: PM 待启动 %d · 待确认 %d · 已确认 %d · 阻塞 %d · 共 %d 项" % (
            counts["pmTodo"], counts["waitingConfirm"], counts["confirmed"], counts["blocked"],
            summary["boardItems"]),
        "Story: %d（MUST 缺失 %d）· 资产 %d（fresh %d / aging %d / stale %d，漂移 %d）" % (
            summary["stories"]["total"], summary["stories"]["missingMust"],
            summary["assets"]["total"], summary["assets"]["fresh"], summary["assets"]["aging"],
            summary["assets"]["stale"], summary["assets"]["driftCandidates"]),
        "归档: change %d + story-list %d，最近 %d 天 %d 条（lastDate %s）" % (
            snapshot["archives"]["changeDirs"], _archive_story_list_count(snapshot["archives"]),
            days, snapshot["archives"]["recentCount"], snapshot["archives"]["lastDate"]),
        "warnings: %d（%s）" % (len(snapshot["warnings"]),
                              "、".join(sorted({item["code"] for item in snapshot["warnings"]}))),
    ]
    return "\n".join(lines)


def main(argv=None):
    # 保证 UTF-8 输出（Host 调用时也会注入 PYTHONIOENCODING=utf-8，这里再兜底一次）
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8")
        except (AttributeError, ValueError):
            pass
    parser = argparse.ArgumentParser(
        description="PM 工作台只读扫描器（输出 PmBoardSnapshot JSON，供 openspec-pm-board Host 调用）",
    )
    parser.add_argument("--root", default=None, help="仓库根目录（默认从本文件位置推导）")
    parser.add_argument("--json", action="store_true", help="输出单行 JSON（Host 调用方式）")
    parser.add_argument("--days", type=int, default=DEFAULT_DAYS, help="归档窗口天数（默认 7）")
    args = parser.parse_args(argv)

    if args.root:
        root = Path(args.root).expanduser()
        if not root.is_dir():
            sys.stderr.write("错误：--root 不是有效目录：%s\n" % root)
            return 2
    else:
        root = _default_repo_root()
        if root is None:
            sys.stderr.write(
                "错误：无法从本文件位置推导仓库根（也未经 --root 指定）。\n"
                "用法：python3 scripts/pm_board_scan.py --root <repoRoot> --json\n")
            return 2
    root = root.resolve()
    if not (root / "docs" / "ROADMAP.md").is_file() or not (root / "openspec-requirements").is_dir():
        sys.stderr.write(
            "错误：--root 不是有效的 OpenSpec 仓库（缺少 docs/ROADMAP.md 或 openspec-requirements/）：%s\n"
            % root)
        return 2

    try:
        snapshot = collect(root, max(0, args.days))
    except FatalError as exc:
        sys.stderr.write("错误：%s\n" % exc)
        return 2
    except Exception as exc:  # noqa: BLE001 - 兜底：整体失败 exit 2（stderr 只进 Host 的 detail.stderrTail）
        sys.stderr.write("错误：扫描器内部异常：%s\n" % exc)
        return 2

    if args.json:
        sys.stdout.write(json.dumps(snapshot, ensure_ascii=False, separators=(",", ":")) + "\n")
    else:
        sys.stdout.write(_human_summary(snapshot, max(0, args.days)) + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
