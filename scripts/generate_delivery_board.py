#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
交付看板生成器 (Delivery Board Generator)

定位：团队需求管理平台的可视化核心（替代 Jira/Linear 等外部平台的看板视图）。
数据源（唯一事实来源）：
  - docs/ROADMAP.md              规划层：阶段进度、当前阶段、规划中 Epic
  - openspec-requirements/epics/ 需求侧：Epic 漏斗状态（research→explore→prototype→storymap→story）
  - openspec/changes/ideas/      交付侧：想法池
  - openspec/changes/            交付侧：活跃变更（探索/设计/开发）
  - openspec/changes/archive/    交付侧：归档变更（最近 7 天 / 历史）
  - */verify.md                  质量门禁：Hard Gates + E2E
  - docs/baseline/*.html         业务基线：更新时间 + 内容摘要

用法：
  python3 scripts/generate_delivery_board.py [--out docs/governance/delivery_board.html] [--days 7]

纯标准库实现，无第三方依赖，可在 CI 中直接调用。
"""
import argparse
import datetime
import glob
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TODAY = datetime.date.today()

PHASE_NAMES = {
    1: "MVP 交易闭环",
    2: "营销与运营后台",
    3: "订单履约闭环",
    4: "用户账户体系",
    5: "数据洞察与经营决策",
    6: "回款与应收账款闭环",
    7: "运营效率增强",
}

# ─────────────────────────── 数据采集 ───────────────────────────

def read(path):
    """安全读取文本文件（不存在返回空串）。"""
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except OSError:
        return ""


def scan_roadmap():
    """解析 ROADMAP.md：当前阶段、未来阶段、规划中 Epic。"""
    text = read(os.path.join(ROOT, "docs", "ROADMAP.md"))
    current = re.search(r"## 📍 当前阶段[^\n]*—\s*(Phase\s*\d+)\s*:\s*([^\n]+)", text)
    current_no = int(re.search(r"Phase\s*(\d+)", current.group(1)).group(1)) if current else 5
    current_name = current.group(2).strip() if current else "数据洞察与经营决策"

    phases = []
    for no in range(1, 8):
        status = "done" if no < current_no else ("current" if no == current_no else "future")
        name = PHASE_NAMES.get(no, f"Phase {no}")
        phases.append({"no": no, "name": name, "status": status})

    # 当前阶段 In Scope 中的 Epic（规划中/待启动）
    planned = []
    scope_match = re.search(r"### 📥 In Scope(.*?)### 🚫", text, re.S)
    if scope_match:
        for m in re.finditer(r"\*\*Epic\s+[\d.]+[^\n]*`([a-z0-9-]+)`\s*—\s*([^\n]+)", scope_match.group(1)):
            planned.append({"key": m.group(1), "title": m.group(2).strip()})
    return {"current": {"no": current_no, "name": current_name}, "phases": phases, "planned": planned}


def scan_epics():
    """解析需求侧 Epic 漏斗状态（openspec-requirements/epics/*/STATUS.md）。"""
    epics_dir = os.path.join(ROOT, "openspec-requirements", "epics")
    result = []
    for status_path in sorted(glob.glob(os.path.join(epics_dir, "*/STATUS.md"))):
        key = os.path.basename(os.path.dirname(status_path))
        epic_dir = os.path.dirname(status_path)
        text = read(status_path)
        stages = {}
        # 阶段制品映射：判断"有制品"即为进行中
        artifact_map = {
            "research": os.path.exists(os.path.join(epic_dir, "research.md")),
            "explore": os.path.exists(os.path.join(epic_dir, "idea.md")),
            "prototype": os.path.isdir(os.path.join(epic_dir, "prototypes")),
            "storymap": os.path.exists(os.path.join(epic_dir, "storymap.md")),
            "stories": os.path.isdir(os.path.join(epic_dir, "stories")),
        }
        for m in re.finditer(r"\|\s*([a-z]+)（[^）]*）\s*\|\s*([^|]*?)\s*\|", text):
            stage, cell = m.group(1).lower(), m.group(2).lower()
            if stage not in artifact_map:
                continue
            if "done" in cell:
                stages[stage] = "done"
            elif artifact_map.get(stage):
                stages[stage] = "active"
            else:
                stages[stage] = "pending"
        # 兜底：有制品但 STATUS 未记录
        for stage, has in artifact_map.items():
            if stage not in stages:
                stages[stage] = "done" if has else "pending"
        all_done = all(stages.get(s) == "done" for s in artifact_map)
        result.append({
            "key": key, "stages": stages,
            "status": "done" if all_done else "active",
            "stage_order": ["research", "explore", "prototype", "storymap", "stories"],
        })
    return result


def scan_ideas():
    """想法池：读取 idea.md 标题。"""
    text = read(os.path.join(ROOT, "openspec", "changes", "ideas", "idea.md"))
    m = re.search(r"^#\s+(.+)$", text, re.M)
    return m.group(1).strip() if m else "全局想法池"


def classify(key):
    """按目录名推断变更类型。"""
    if "epic-" in key:
        return "Epic 大需求", "bg-purple-100 text-purple-800"
    if "story-" in key:
        return "Story 用户故事", "bg-blue-100 text-blue-800"
    if "bugfix-" in key or "-fix-" in key or key.startswith("fix-"):
        return "缺陷修复", "bg-red-100 text-red-800"
    return "功能", "bg-slate-200 text-slate-700"


def scan_active_changes():
    """交付侧活跃变更：无 proposal → 探索；有 proposal/design → 设计；有 tasks → 开发。"""
    changes_dir = os.path.join(ROOT, "openspec", "changes")
    result = []
    for d in sorted(os.listdir(changes_dir)):
        full = os.path.join(changes_dir, d)
        if not os.path.isdir(full) or d in ("archive", "ideas"):
            continue
        has = lambda *names: any(os.path.exists(os.path.join(full, n)) for n in names)
        if has("tasks.md"):
            phase = "coding"
        elif has("proposal.md", "design.md"):
            phase = "design"
        else:
            phase = "explore"
        result.append({"key": d, "phase": phase, "dir": full})
    return result


def parse_date_from_key(key):
    """从归档目录名提取日期前缀。"""
    m = re.match(r"(\d{4}-\d{2}-\d{2})", key)
    try:
        return datetime.date.fromisoformat(m.group(1)) if m else None
    except ValueError:
        return None


def scan_verify(change_dir):
    """解析 verify.md 的门禁结果（兼容列表式 ## Gates 与表格式验证矩阵两种格式）。"""
    text = read(os.path.join(change_dir, "verify.md"))
    gates = {"schema": "未执行", "node": "未执行", "python": "未执行", "frontend": "未执行", "e2e": "未执行"}
    # 1) 列表格式（新版：## Gates 下 "- Schema validate: PASS"）
    for m in re.finditer(r"-\s*(Schema validate|Node test|Python test|Frontend build|E2E cucumber)\s*:\s*(PASS|FAIL)(?:（([^）]*)）)?", text):
        label = m.group(1).lower().split()[0]
        key = {"schema": "schema", "node": "node", "python": "python", "frontend": "frontend", "e2e": "e2e"}[label]
        gates[key] = m.group(2) + (f"（{m.group(3)}）" if m.group(3) else "")
    # 2) 表格格式（旧版：验证矩阵 "| 任务 | 命令 | ✅ PASS | 证据 |"）
    for m in re.finditer(r"\|\s*([^|]+?)\s*\|\s*[^|]*?\s*\|\s*✅?\s*(PASS|FAIL)", text):
        task, result = m.group(1).lower(), m.group(2)
        if any(k in task for k in ("schema", "validate", "制品校验")) and gates["schema"] == "未执行":
            gates["schema"] = result
        elif any(k in task for k in ("node", "全量测试", "后端")) and gates["node"] == "未执行":
            gates["node"] = result
        elif "python" in task and gates["python"] == "未执行":
            gates["python"] = result
        elif any(k in task for k in ("frontend", "前端", "构建")) and gates["frontend"] == "未执行":
            gates["frontend"] = result
        elif "e2e" in task and gates["e2e"] == "未执行":
            gates["e2e"] = result
    # 3) E2E 场景数提取（"17 scenarios / 91 steps"）
    m = re.search(r"(\d+)\s*scenarios?\s*/\s*(\d+)\s*steps?", text)
    if m and "PASS" in gates["e2e"]:
        gates["e2e"] = f"通过（{m.group(1)} 场景 / {m.group(2)} 步）"
    elif m and "PASS" in gates["e2e"] or (m and "通过" in text and gates["e2e"] == "未执行"):
        gates["e2e"] = f"通过（{m.group(1)} 场景 / {m.group(2)} 步）"
    # 4) 结论兜底（无结构化门禁时读取结论段）
    if all(gates[g] == "未执行" for g in ("schema", "node", "python", "frontend")):
        if "Hard Gates 全部 PASS" in text or "满足归档条件" in text or "全部 PASS" in text:
            for g in ("schema", "node", "python", "frontend"):
                gates[g] = "通过（结论）"
            if gates["e2e"] == "未执行":
                gates["e2e"] = "通过（结论）"
    ok = sum(1 for g in ("schema", "node", "python", "frontend") if "PASS" in gates[g] or "通过" in gates[g])
    gates["conclusion"] = "全部通过" if ok == 4 else f"{ok}/4 项通过"
    gates["all_pass"] = ok == 4
    return gates


def scan_archives(days):
    """归档变更：按日期窗口切分最近/历史。"""
    archive_dir = os.path.join(ROOT, "openspec", "changes", "archive")
    recent, history = [], []
    for key in sorted(os.listdir(archive_dir), reverse=True):
        full = os.path.join(archive_dir, key)
        if not os.path.isdir(full) and not key.endswith(".json"):
            continue
        d = parse_date_from_key(key)
        ttype, badge = classify(key)
        item = {
            "key": key, "date": d.isoformat() if d else "—",
            "type": ttype, "badge": badge,
            "verify": scan_verify(full) if os.path.isdir(full) else None,
        }
        if d and (TODAY - d).days <= max(days, 0):
            recent.append(item)
        else:
            history.append(item)
    recent.sort(key=lambda x: x["date"], reverse=True)
    history.sort(key=lambda x: x["date"], reverse=True)
    return recent, history


def scan_baseline():
    """业务基线：更新时间 + 内容摘要（从 HTML 中提取）。"""
    base = os.path.join(ROOT, "docs", "baseline")
    result = []
    specs = [
        ("service_blueprint.html", "服务蓝图", "旅程阶段与泳道协同结构"),
        ("business_process.html", "业务流程", "L1 价值流 / L2 协同 / L3 规则"),
        ("domain_model.html", "领域模型", "Bounded Context 与能力映射"),
    ]
    for fname, title, desc in specs:
        text = read(os.path.join(base, fname))
        updated = "未知"
        m = re.search(r"Last Updated:\s*(\d{4}-\d{2}-\d{2})", text)
        if m:
            updated = m.group(1)
        else:
            mtime = datetime.date.fromtimestamp(os.path.getmtime(os.path.join(base, fname)))
            updated = mtime.isoformat()
        detail = ""
        if "service_blueprint" in fname:
            stages = len(set(re.findall(r'class="stage-name">([^<]+)', text)))
            lanes = len(set(re.findall(r'class="row-title">([^<]+)', text)))
            cross = len(set(re.findall(r'class="cross-card-title">([^<]+)', text)))
            detail = f"{stages} 个旅程阶段 · {lanes} 条泳道 · {cross} 项跨阶段支撑"
        elif "business_process" in fname:
            nodes = len(set(re.findall(r"L[123]-[0-9]{2}", text)))
            sections = len(re.findall(r'class="section-title">([^<]+)', text))
            detail = f"{sections} 个分层章节 · {nodes} 个流程节点引用"
        elif "domain_model" in fname:
            bcs = len(set(re.findall(r"Bounded Context", text)))
            caps = len(set(re.findall(r"capabilit(y|ies)", text, re.I)))
            detail = f"{bcs} 个 Bounded Context · {caps} 处能力引用"
        result.append({"file": fname, "title": title, "desc": desc, "updated": updated, "detail": detail})
    return result


# ─────────────────────────── HTML 渲染 ───────────────────────────

def esc(s):
    return (s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def badge_html(text, cls):
    return f'<span class="inline-block px-2 py-0.5 text-[10px] font-bold uppercase bg-{cls.split()[0]} text-{cls.split()[-1]} mb-2">{esc(text)}</span>'


def stage_light(status):
    """需求漏斗阶段灯：done=黑实心, active=灰半实, pending=空心。"""
    if status == "done":
        return '<span class="inline-block w-2.5 h-2.5 bg-slate-900 mr-1" title="已完成"></span>'
    if status == "active":
        return '<span class="inline-block w-2.5 h-2.5 bg-slate-400 mr-1" title="进行中"></span>'
    return '<span class="inline-block w-2.5 h-2.5 border border-slate-300 bg-white mr-1" title="待开始"></span>'


def render_html(data, refreshed):
    """渲染全中文专业看板。"""
    r = data["roadmap"]
    phases_row = "".join(
        f'<div class="flex-1 text-center py-3 px-2 {"bg-slate-900 text-white" if p["status"] == "current" else "bg-white border border-slate-200 text-slate-700"}">'
        f'<div class="text-[10px] uppercase font-bold mb-1">阶段 {p["no"]}</div>'
        f'<div class="text-xs font-bold truncate" title="{esc(p["name"])}">{esc(p["name"])}</div>'
        f'<div class="text-[10px] mt-1 {"text-slate-300" if p["status"] == "current" else "text-slate-400"}">'
        f'{"当前" if p["status"] == "current" else ("已完成" if p["status"] == "done" else "未来")}</div></div>'
        for p in r["phases"]
    )
    done_count = sum(1 for p in r["phases"] if p["status"] == "done")
    total_phases = len(r["phases"])
    phase_pct = round(done_count / total_phases * 100)

    # 指标卡
    planning_n = len(r["planned"])
    explore_n = sum(1 for c in data["active"] if c["phase"] == "explore")
    exploring_n = len(data["epics"]) + (1 if data["ideas"] else 0) + explore_n
    design_n = sum(1 for c in data["active"] if c["phase"] == "design")
    coding_n = sum(1 for c in data["active"] if c["phase"] == "coding")
    archived_n = len(data["recent"])
    # 质量信号：最近归档中带 verify 的变更全通过占比
    verified = [x for x in data["recent"] if x.get("verify")]
    quality_pct = round(sum(1 for x in verified if x["verify"]["all_pass"]) / len(verified) * 100) if verified else 100
    metrics = [
        ("规划中", f'{planning_n} 项', "路线图待启动 Epic"),
        ("需求探索中", f'{exploring_n} 项', "需求侧 Epic 漏斗 + 想法池"),
        ("设计中", f'{design_n} 项', "提案/技术设计阶段"),
        ("开发中", f'{coding_n} 项', "任务实施与验证阶段"),
        ("已归档（近7天）", f'{archived_n} 项', f"最近 {data["days"]} 天完成的变更"),
        ("质量信号", f'{quality_pct}%', f"最近 {len(verified)} 个变更验证门禁通过率"),
    ]
    metrics_html = ""
    for title, val, sub in metrics:
        metrics_html += (
            f'<div class="bg-white border border-slate-200 p-5">'
            f'<div class="text-xs text-slate-500 font-bold mb-1">{title}</div>'
            f'<div class="text-3xl font-black text-slate-900">{val}</div>'
            f'<div class="text-[10px] text-slate-400 mt-1">{sub}</div></div>'
        )

    # 基线卡片（含内容摘要）
    baseline_html = ""
    for b in data["baseline"]:
        baseline_html += (
            f'<a href="../baseline/{b["file"]}" class="flex-1 bg-white border border-slate-200 p-5 group hover:border-slate-900 block min-w-[240px]">'
            f'<div class="flex justify-between items-start mb-2">'
            f'<span class="text-[10px] text-slate-400 uppercase font-bold group-hover:text-slate-900">{esc(b["title"])}</span>'
            f'<span class="text-[10px] text-slate-400 font-mono">更新 {esc(b["updated"])}</span></div>'
            f'<div class="text-slate-900 font-bold text-sm mb-1 truncate">{esc(b["file"])}</div>'
            f'<div class="text-[10px] text-slate-500 mb-2">{esc(b["desc"])}</div>'
            f'<div class="text-xs font-bold text-slate-900 border-t border-slate-200 pt-2">{esc(b["detail"])}</div>'
            f'<div class="text-[10px] text-slate-400 mt-2 group-hover:text-slate-900">查看文档 →</div></a>'
        )

    # 需求漏斗
    if data["epics"]:
        funnel_rows = ""
        for ep in data["epics"]:
            lights = "".join(stage_light(ep["stages"].get(s)) for s in ep["stage_order"])
            st_map = {"pending": "待开始", "active": "进行中", "done": "已完成"}
            status_txt = "完成" if ep["status"] == "done" else "进行中"
            funnel_rows += (
                f'<tr class="border-b border-slate-100">'
                f'<td class="py-3 px-4 font-mono text-xs text-slate-900">{esc(ep["key"])}</td>'
                f'<td class="py-3 px-4">{lights}<span class="text-[10px] text-slate-400 ml-1">调研 · 探索 · 原型 · 拆分 · 故事</span></td>'
                f'<td class="py-3 px-4 text-xs"><span class="{"text-slate-900 font-bold" if ep["status"] == "done" else "text-slate-500"}">{status_txt}</span></td></tr>'
            )
        funnel_html = (
            f'<div class="bg-white border border-slate-200 p-6 mb-8">'
            f'<h2 class="text-lg font-bold text-slate-900 mb-1 flex items-center"><span class="w-2 h-2 bg-slate-900 mr-2"></span>需求漏斗（需求侧工作区）</h2>'
            f'<p class="text-[10px] text-slate-400 mb-4">来源：openspec-requirements/epics/*/STATUS.md · 大块需求以 Epic 为单位推进，业务面冻结交付物为 Story</p>'
            f'<table class="w-full text-left"><thead><tr class="bg-slate-50 border-b border-slate-200">'
            f'<th class="py-2 px-4 text-[10px] text-slate-500 font-bold uppercase">Epic</th>'
            f'<th class="py-2 px-4 text-[10px] text-slate-500 font-bold uppercase">漏斗阶段</th>'
            f'<th class="py-2 px-4 text-[10px] text-slate-500 font-bold uppercase">状态</th></tr></thead><tbody>{funnel_rows}</tbody></table></div>'
        )
    else:
        funnel_html = ""

    # 交付看板
    def board_card(item, faded=False):
        v = item.get("verify")
        extra = ""
        if v and v.get("e2e") and "PASS" in v["e2e"]:
            extra = f'<div class="text-[10px] text-slate-400 font-mono mt-2">门禁：{esc(v["e2e"])}</div>'
        return (
            f'<a href="../../openspec/changes/archive/{item["key"]}" class="block bg-white border border-slate-200 p-4 card group {"opacity-75" if faded else ""}">'
            f'{badge_html(item["type"], item["badge"])}'
            f'<div class="text-slate-900 font-bold text-sm mb-1 group-hover:underline leading-tight">{esc(item["key"])}</div>'
            f'<div class="text-[10px] text-slate-400 font-mono truncate">归档 {esc(item["date"])}</div>{extra}</a>'
        )

    planning_cards = ""
    for p in r["planned"]:
        planning_cards += (
            f'<a href="../../docs/ROADMAP.md" class="block bg-white border border-slate-200 p-4 card group">'
            f'{badge_html("路线图规划", "bg-slate-200 text-slate-700")}'
            f'<div class="text-slate-900 font-bold text-sm mb-1 group-hover:underline leading-tight">{esc(p["key"])}</div>'
            f'<div class="text-[10px] text-slate-400 truncate">{esc(p["title"])}</div>'
            f'<div class="text-[10px] text-slate-400 font-mono mt-2">docs/ROADMAP.md · 阶段 {r["current"]["no"]}</div></a>'
        )

    exploring_cards = ""
    if data["ideas"]:
        exploring_cards += (
            f'<a href="../../openspec/changes/ideas/idea.md" class="block bg-white border border-slate-200 p-4 card group">'
            f'{badge_html("想法池", "bg-slate-200 text-slate-700")}'
            f'<div class="text-slate-900 font-bold text-sm mb-1 group-hover:underline leading-tight">{esc(data["ideas"])}</div>'
            f'<div class="text-[10px] text-slate-400 font-mono mt-2">openspec/changes/ideas/idea.md</div></a>'
        )
    for c in data["active"]:
        if c["phase"] != "explore":
            continue
        exploring_cards += (
            f'<a href="../../openspec/changes/{c["key"]}" class="block bg-white border border-slate-200 p-4 card group">'
            f'{badge_html(*classify(c["key"]))}'
            f'<div class="text-slate-900 font-bold text-sm mb-1 group-hover:underline leading-tight">{esc(c["key"])}</div>'
            f'<div class="text-[10px] text-slate-400 truncate">交付侧探索（提案尚未生成）</div>'
            f'<div class="text-[10px] text-slate-400 font-mono mt-2">openspec/changes/{esc(c["key"])}/</div></a>'
        )
    for ep in data["epics"]:
        if ep["status"] == "done":
            continue
        exploring_cards += (
            f'<a href="../../openspec-requirements/epics/{ep["key"]}/" class="block bg-white border border-slate-200 p-4 card group">'
            f'{badge_html("需求侧 Epic", "bg-purple-100 text-purple-800")}'
            f'<div class="text-slate-900 font-bold text-sm mb-1 group-hover:underline leading-tight">{esc(ep["key"])}</div>'
            f'<div class="text-[10px] text-slate-400 truncate">需求漏斗推进中（调研→探索→原型→拆分→故事）</div>'
            f'<div class="text-[10px] text-slate-400 font-mono mt-2">openspec-requirements/epics/{esc(ep["key"])}/</div></a>'
        )

    design_cards = "".join(
        f'<a href="../../openspec/changes/{c["key"]}" class="block bg-white border border-slate-200 p-4 card group">'
        f'{badge_html(*classify(c["key"]))}'
        f'<div class="text-slate-900 font-bold text-sm mb-1 leading-tight">{esc(c["key"])}</div>'
        f'<div class="text-[10px] text-slate-400 font-mono mt-2">提案 / 技术设计阶段</div></a>'
        for c in data["active"] if c["phase"] == "design"
    )
    coding_cards = "".join(
        f'<a href="../../openspec/changes/{c["key"]}" class="block bg-white border border-slate-200 p-4 card group">'
        f'{badge_html(*classify(c["key"]))}'
        f'<div class="text-slate-900 font-bold text-sm mb-1 leading-tight">{esc(c["key"])}</div>'
        f'<div class="text-[10px] text-slate-400 font-mono mt-2">任务实施与验证阶段</div></a>'
        for c in data["active"] if c["phase"] == "coding"
    )
    archived_cards = "".join(board_card(x, faded=True) for x in data["recent"])

    # 质量门禁表
    q_rows = ""
    q_done = 0
    for x in data["recent"]:
        v = x.get("verify")
        if not v:
            continue
        q_done += 1 if v["all_pass"] else 0
        q_rows += (
            f'<tr class="border-b border-slate-100">'
            f'<td class="py-2 px-4 font-mono text-xs">{esc(x["key"])}</td>'
            f'<td class="py-2 px-4 text-center">{gate_badge(v["schema"])}</td>'
            f'<td class="py-2 px-4 text-center">{gate_badge(v["node"])}</td>'
            f'<td class="py-2 px-4 text-center">{gate_badge(v["python"])}</td>'
            f'<td class="py-2 px-4 text-center">{gate_badge(v["frontend"])}</td>'
            f'<td class="py-2 px-4 text-center text-xs text-slate-600">{esc(v["e2e"])}</td>'
            f'<td class="py-2 px-4 text-center text-xs font-bold {"text-slate-900" if v["all_pass"] else "text-red-700"}">{esc(v["conclusion"])}</td></tr>'
        )
    quality_html = (
        f'<div class="bg-white border border-slate-200 p-6 mb-8">'
        f'<h2 class="text-lg font-bold text-slate-900 mb-1 flex items-center"><span class="w-2 h-2 bg-slate-900 mr-2"></span>质量门禁（最近归档验证）</h2>'
        f'<p class="text-[10px] text-slate-400 mb-4">来源：各变更 verify.md · 硬门禁（规格校验 / 后端测试 / 前端构建）+ E2E 场景</p>'
        f'<table class="w-full text-left"><thead><tr class="bg-slate-50 border-b border-slate-200">'
        f'<th class="py-2 px-4 text-[10px] text-slate-500 font-bold uppercase">变更</th>'
        f'<th class="py-2 px-4 text-center text-[10px] text-slate-500 font-bold uppercase">规格校验</th>'
        f'<th class="py-2 px-4 text-center text-[10px] text-slate-500 font-bold uppercase">后端测试</th>'
        f'<th class="py-2 px-4 text-center text-[10px] text-slate-500 font-bold uppercase">Python</th>'
        f'<th class="py-2 px-4 text-center text-[10px] text-slate-500 font-bold uppercase">前端构建</th>'
        f'<th class="py-2 px-4 text-center text-[10px] text-slate-500 font-bold uppercase">E2E</th>'
        f'<th class="py-2 px-4 text-center text-[10px] text-slate-500 font-bold uppercase">结论</th></tr></thead>'
        f'<tbody>{q_rows}</tbody></table></div>'
    ) if q_rows else ""

    # 归档历史
    history_cards = "".join(board_card(x) for x in data["history"])
    history_html = (
        f'<div class="mt-12 border-t border-slate-200 pt-8">'
        f'<h2 class="text-xl font-bold text-slate-900 mb-6 flex items-center"><span class="w-2 h-2 bg-slate-900 mr-2"></span>归档历史（{len(data["history"])} 项）</h2>'
        f'<div id="older-archives" class="hidden"><div class="grid grid-cols-1 md:grid-cols-3 gap-4">{history_cards}</div></div>'
        f'<button onclick="document.getElementById(\'older-archives\').classList.toggle(\'hidden\'); this.innerText = this.innerText === \'查看更多\' ? \'收起\' : \'查看更多\';" '
        f'class="text-sm text-slate-500 border border-slate-200 px-4 py-2 hover:bg-slate-900 hover:text-white">查看更多</button></div>'
    ) if history_cards else ""

    return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>交付看板 · {esc(r["current"]["name"])}</title>
<script src="https://cdn.tailwindcss.com"></script>
<script>tailwind.config = {{ theme: {{ extend: {{ colors: {{ slate: {{ 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 500: '#64748b', 700: '#334155', 800: '#1e293b', 900: '#0f172a' }} }} }} }} }}</script>
<style>
body {{ background-color: #f8fafc; font-family: -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif; }}
* {{ border-radius: 0 !important; box-shadow: none !important; transition: all 0.2s; }}
.card:hover {{ border-color: #0f172a; transform: translateY(-2px); }}
</style>
</head>
<body class="p-8">
<div class="mx-auto mb-12" style="width:85%;max-width:1440px;">

  <!-- 头部 -->
  <div class="flex justify-between items-end mb-8 border-b-2 border-slate-900 pb-4">
    <div>
      <h1 class="text-4xl font-black text-slate-900 tracking-tighter">交付看板</h1>
      <p class="text-slate-500 mt-2">极简电商系统 · 规格驱动开发（SDD）治理与团队需求管理</p>
    </div>
    <div class="text-right">
      <span class="inline-block bg-slate-900 text-white text-xs font-bold px-3 py-1 mb-2">当前阶段：阶段 {r["current"]["no"]} · {esc(r["current"]["name"])}</span>
      <div><span class="text-xs text-slate-400 block uppercase font-bold">最后刷新</span>
      <span class="text-slate-900 font-mono text-sm">{refreshed}</span></div>
    </div>
  </div>

  <!-- 阶段进度 -->
  <div class="mb-8">
    <div class="flex justify-between items-baseline mb-2">
      <h2 class="text-sm font-bold text-slate-900 flex items-center"><span class="w-2 h-2 bg-slate-900 mr-2"></span>路线图阶段进度</h2>
      <span class="text-xs text-slate-500">已完成 {done_count} / {total_phases} 个阶段（{phase_pct}%）</span>
    </div>
    <div class="flex gap-2">{phases_row}</div>
  </div>

  <!-- 指标 -->
  <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
    {metrics_html}
  </div>

  <!-- 业务基线（含内容摘要） -->
  <div class="mb-8">
    <h2 class="text-sm font-bold text-slate-900 mb-3 flex items-center"><span class="w-2 h-2 bg-slate-900 mr-2"></span>业务基线（系统认知沉淀 · 点击查看内容）</h2>
    <div class="flex flex-wrap gap-4">{baseline_html}</div>
  </div>

  <!-- 需求漏斗 -->
  {funnel_html}

  <!-- 交付看板 -->
  <div class="mb-8">
    <h2 class="text-sm font-bold text-slate-900 mb-3 flex items-center"><span class="w-2 h-2 bg-slate-900 mr-2"></span>交付看板</h2>
    <div class="flex gap-6 overflow-x-auto pb-8">
      <div class="kanban-col flex-1">
        <div class="bg-slate-900 text-white px-4 py-2 text-xs font-bold mb-4">规划中（{planning_n}）</div>
        <div class="space-y-3">{planning_cards}</div>
      </div>
      <div class="kanban-col flex-1">
        <div class="bg-slate-200 text-slate-700 px-4 py-2 text-xs font-bold mb-4">探索中（{exploring_n}）</div>
        <div class="space-y-3">{exploring_cards}</div>
      </div>
      <div class="kanban-col flex-1">
        <div class="bg-slate-200 text-slate-700 px-4 py-2 text-xs font-bold mb-4">设计中（{design_n}）</div>
        <div class="space-y-3">{design_cards}</div>
      </div>
      <div class="kanban-col flex-1">
        <div class="bg-slate-200 text-slate-700 px-4 py-2 text-xs font-bold mb-4">开发中（{coding_n}）</div>
        <div class="space-y-3">{coding_cards}</div>
      </div>
      <div class="kanban-col flex-1">
        <div class="bg-slate-900 text-white px-4 py-2 text-xs font-bold mb-4">已归档 · 近 {data["days"]} 天（{archived_n}）</div>
        <div class="space-y-3">{archived_cards}</div>
      </div>
    </div>
  </div>

  <!-- 质量门禁 -->
  {quality_html}

  <!-- 归档历史 -->
  {history_html}

  <footer class="mt-20 pt-6 border-t border-slate-200 text-center text-slate-400 text-xs pb-4 space-y-1">
    <div>OpenSpec v2.0 治理框架 · 规格驱动开发（SDD）方法论</div>
    <div>数据来源：docs/ROADMAP.md · openspec-requirements/epics/ · openspec/changes/ · verify.md · docs/baseline/ · 生成脚本 scripts/generate_delivery_board.py</div>
  </footer>
</div>
</body>
</html>
"""


def gate_badge(v):
    """门禁徽章：通过=黑底白字，失败=红，未执行=灰。"""
    if "PASS" in v or "通过" in v:
        return '<span class="inline-block px-2 py-0.5 text-[10px] font-bold bg-slate-900 text-white">通过</span>'
    if "FAIL" in v or "失败" in v:
        return '<span class="inline-block px-2 py-0.5 text-[10px] font-bold bg-red-700 text-white">失败</span>'
    return '<span class="inline-block px-2 py-0.5 text-[10px] font-bold bg-slate-200 text-slate-500">未执行</span>'


def main():
    ap = argparse.ArgumentParser(description="交付看板生成器")
    ap.add_argument("--out", default=os.path.join(ROOT, "docs", "governance", "delivery_board.html"))
    ap.add_argument("--days", type=int, default=7, help="归档窗口（天）")
    args = ap.parse_args()

    data = {
        "roadmap": scan_roadmap(),
        "epics": scan_epics(),
        "ideas": scan_ideas(),
        "active": scan_active_changes(),
        "baseline": scan_baseline(),
        "days": args.days,
    }
    data["recent"], data["history"] = scan_archives(args.days)

    refreshed = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    html = render_html(data, refreshed)

    out = os.path.abspath(args.out)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        f.write(html)

    # CI 友好的摘要输出
    print(f"交付看板已生成: {out}")
    print(f"  当前阶段: 阶段 {data['roadmap']['current']['no']} {data['roadmap']['current']['name']}")
    print(f"  阶段进度: {done_count_of(data['roadmap'])}/7 完成")
    print(f"  规划中: {len(data['roadmap']['planned'])} · 需求探索: {len(data['epics'])} · 活跃变更: {len(data['active'])}")
    print(f"  已归档(近{args.days}天): {len(data['recent'])} · 历史: {len(data['history'])}")
    verified = [r for r in data["recent"] if r.get("verify")]
    failed = [r for r in verified if not r["verify"]["all_pass"]]
    if not verified:
        print(f"  质量门禁: 近{args.days}天无含 verify.md 的归档变更")
    elif failed:
        print(f"  质量门禁: {len(verified) - len(failed)}/{len(verified)} 个变更通过，未通过: {', '.join(r['key'] for r in failed)}")
    else:
        print(f"  质量门禁: 最近 {len(verified)} 个变更验证门禁全部通过")
    return 0


def done_count_of(roadmap):
    return sum(1 for p in roadmap["phases"] if p["status"] == "done")


if __name__ == "__main__":
    sys.exit(main())
