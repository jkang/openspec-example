"""
build_osm.py  ──  OSM Map Generator (v2)
Usage: python3 scripts/build_osm.py <input.yaml> <output.html>

Improvements over v1:
  1. Robust YAML parsing  — strips ```yaml ... ``` fences automatically
  2. Jinja2 template engine — HTML/CSS fully separated into templates/osm_layout.html
  3. Dynamic card heights  — scenario cards auto-resize; lane height calculated precisely
  4. SVG connector lines   — dashed bezier curves link parent→child nodes visually
  5. config.height.objectiveScore respected for objective lane height
  6. Multi-level tree support — any depth collapses gracefully to two swim-lanes
"""

import re
import sys
import os
import datetime
import yaml
from jinja2 import Environment, FileSystemLoader

# ── Paths ──────────────────────────────────────────────────────────────────────
SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
SKILL_ROOT   = os.path.dirname(SCRIPT_DIR)
TEMPLATE_DIR = os.path.join(SKILL_ROOT, "templates")

# ── Layout Constants ───────────────────────────────────────────────────────────
BOX_W        = 280   # width of every node box
BOX_GAP      = 30    # horizontal gap between sibling boxes
PAD_LEFT     = 40    # left canvas padding
SUB_TOP      = 30    # y offset of sub-objective title in sub-lane
SUB_H        = 44    # approx rendered height of a sub-objective title box
OBJ_H        = 46    # approx rendered height of an objective box
STRAT_H      = 150   # fixed height of strategy card
METRIC_H     = 150   # fixed height of metric card
VGAP         = 28    # vertical gap between stacked cards
SCENE_ITEM_H = 68    # estimated height per scenario item (name + desc)
SCENE_HDR_H  = 36    # scenario card header height
SCENE_PAD    = 16    # scenario card padding
BOTTOM_PAD   = 50    # breathing room at bottom of sub-lane
BASE_SUB_H   = 700   # minimum sub-lane height


# ══════════════════════════════════════════════════════════════════════════════
# 1. YAML PARSING  (防呆: strip ``` fences before parsing)
# ══════════════════════════════════════════════════════════════════════════════
def load_yaml_robust(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        raw = f.read()

    # Strip ```yaml ... ``` or ``` ... ``` code-block fences that LLMs often add
    cleaned = re.sub(r"^\s*```(?:yaml|yml)?\s*\n", "", raw, flags=re.MULTILINE)
    cleaned = re.sub(r"\n\s*```\s*$", "", cleaned, flags=re.MULTILINE)
    cleaned = cleaned.strip()

    return yaml.safe_load(cleaned)


# ══════════════════════════════════════════════════════════════════════════════
# 2. TREND ICON  (inline SVG, colour via CSS class)
# ══════════════════════════════════════════════════════════════════════════════
def trend_icon(trend: str) -> str:
    t = (trend or "").lower()
    if t == "up":
        return (
            '<svg class="icon-up" width="13" height="13" viewBox="0 0 24 24" '
            'fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">'
            '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>'
            '<polyline points="16 7 22 7 22 13"/></svg>'
        )
    if t == "down":
        return (
            '<svg class="icon-down" width="13" height="13" viewBox="0 0 24 24" '
            'fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">'
            '<polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/>'
            '<polyline points="16 17 22 17 22 11"/></svg>'
        )
    if t == "stable":
        return (
            '<svg class="icon-stable" width="13" height="13" viewBox="0 0 24 24" '
            'fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">'
            '<line x1="5" y1="12" x2="19" y2="12"/></svg>'
        )
    return ""


# ══════════════════════════════════════════════════════════════════════════════
# 3. COORDINATE ENGINE
#    Handles any-depth YAML tree by flattening to two swim-lanes:
#      • Lane 0 (obj-lane):  level-0 nodes
#      • Lane 1 (sub-lane):  level-1+ nodes + their card blocks
# ══════════════════════════════════════════════════════════════════════════════
def compute_layout(objectives: list, obj_lane_h: int = 60) -> dict:
    # --- 3-a. Count nodes per level ---
    level_counts: dict[int, int] = {}

    def _count(objs, lv):
        level_counts[lv] = level_counts.get(lv, 0) + len(objs)
        for o in objs:
            if o.get("subObjectives"):
                _count(o["subObjectives"], lv + 1)

    _count(objectives, 0)
    max_per_level = max(level_counts.values(), default=1)
    max_total_w   = max_per_level * (BOX_W + BOX_GAP)
    canvas_w      = max_total_w + PAD_LEFT * 2

    # --- 3-b. Build flat point list ---
    points: list[dict] = []

    def _place(objs, lv, parent_cx=None):
        n = len(objs)
        total_w = n * (BOX_W + BOX_GAP)
        start_x = PAD_LEFT + max(0, (max_total_w - total_w) / 2)
        for i, obj in enumerate(objs):
            cx = start_x + i * (BOX_W + BOX_GAP) + BOX_W / 2
            points.append({"obj": obj, "level": lv, "cx": cx, "parent_cx": parent_cx})
            if obj.get("subObjectives"):
                _place(obj["subObjectives"], lv + 1, parent_cx=cx)

    _place(objectives, 0)

    # --- 3-c. Scenario card dynamic height per sub-node ---
    def _scenario_card_h(scens):
        if not scens:
            return 0
        return SCENE_HDR_H + len(scens) * SCENE_ITEM_H + SCENE_PAD

    # --- 3-d. Compute sub-lane total height ---
    max_block_h = 0
    for pt in points:
        if pt["level"] == 0:
            continue
        o = pt["obj"]
        block_h = (
            SUB_TOP + SUB_H + VGAP
            + (STRAT_H + VGAP if o.get("strategies") else 0)
            + (METRIC_H + VGAP if o.get("metrics") else 0)
            + _scenario_card_h(o.get("relatedScenarios", {}).get("scenarios"))
        )
        max_block_h = max(max_block_h, block_h)

    sub_lane_h = max(BASE_SUB_H, max_block_h + BOTTOM_PAD)

    # --- 3-e. Build render contexts ---
    objective_nodes = []
    sub_nodes       = []
    top_connectors  = []  # SVG paths in obj-lane (top→sub)
    sub_connectors  = []  # SVG paths in sub-lane (vertical stacks)

    for pt in points:
        o    = pt["obj"]
        lv   = pt["level"]
        cx   = pt["cx"]
        name = o.get("name", "")
        val  = str(o.get("value", "")) if o.get("value") else ""
        icon = trend_icon(o.get("trend", ""))

        if lv == 0:
            objective_nodes.append({
                "cx": cx, "width": BOX_W,
                "name": name, "val": val, "icon": icon,
            })
        else:
            # vertical positions in sub-lane
            cur_top = SUB_TOP
            node_bottom = cur_top + SUB_H

            strat_top = metric_top = scenario_top = None
            if o.get("strategies"):
                strat_top   = node_bottom + VGAP
                sub_connectors.append(f"M {cx} {node_bottom} L {cx} {strat_top}")
                node_bottom = strat_top + STRAT_H
            if o.get("metrics"):
                metric_top  = node_bottom + VGAP
                sub_connectors.append(f"M {cx} {node_bottom} L {cx} {metric_top}")
                node_bottom = metric_top + METRIC_H
            scens = o.get("relatedScenarios", {}).get("scenarios") or []
            if scens:
                scenario_top = node_bottom + VGAP
                sub_connectors.append(f"M {cx} {node_bottom} L {cx} {scenario_top}")

            sub_nodes.append({
                "cx": cx, "width": BOX_W,
                "name": name, "val": val, "icon": icon,
                "top": cur_top,
                "strategies": [str(s) for s in (o.get("strategies") or [])],
                "strat_top":  strat_top,
                "metrics":    [
                    {
                        "name": m.get("name",""),
                        "calc": m.get("calculation",""),
                        "val":  str(m.get("value","")) if m.get("value") else "",
                        "icon": trend_icon(m.get("trend",""))
                    }
                    for m in (o.get("metrics") or [])
                ],
                "metric_top":  metric_top,
                "scenarios": [
                    {"name": sc.get("name",""), "desc": sc.get("description","")}
                    for sc in scens
                ],
                "scenario_top": scenario_top,
            })

            # SVG connector: parent cx in obj-lane bottom → sub node top
            if pt["parent_cx"] is not None:
                pcx = pt["parent_cx"]
                
                # Parent is in obj-lane (top), child is in sub-lane (bottom)
                # obj-lane height is obj_lane_h. Parent is centered vertically.
                y1 = obj_lane_h / 2 + OBJ_H / 2
                y2 = obj_lane_h + cur_top
                
                x1, x2 = pcx, cx
                cp1y = (y1 + y2) / 2
                
                top_connectors.append(
                    f"M {x1} {y1} C {x1} {cp1y} {x2} {cp1y} {x2} {y2}"
                )

    return {
        "canvas_w":       canvas_w,
        "sub_lane_h":     sub_lane_h,
        "objective_nodes": objective_nodes,
        "sub_nodes":       sub_nodes,
        "top_connectors":  top_connectors,
        "sub_connectors":  sub_connectors,
    }


# ══════════════════════════════════════════════════════════════════════════════
# 4. MAIN
# ══════════════════════════════════════════════════════════════════════════════
def main():
    if len(sys.argv) < 3:
        print("Usage: python3 build_osm.py <input.yaml> <output.html>")
        sys.exit(1)

    input_yaml  = sys.argv[1]
    output_html = sys.argv[2]

    # Ensure output directory exists
    os.makedirs(os.path.dirname(os.path.abspath(output_html)), exist_ok=True)

    # Load & parse YAML robustly
    try:
        data = load_yaml_robust(input_yaml)
    except yaml.YAMLError as e:
        print(f"❌ YAML parse error: {e}")
        sys.exit(1)

    objectives = data.get("objectives", [])
    if not objectives:
        print("❌ No 'objectives' found in YAML.")
        sys.exit(1)

    # Read optional config overrides
    cfg        = data.get("config", {}).get("height", {})
    obj_lane_h = cfg.get("objectiveScore", 60)   # honour config.height.objectiveScore

    # Compute layout
    layout = compute_layout(objectives, obj_lane_h)

    title = str(data.get("title", "OSM 业务战略地图"))

    # Render with Jinja2
    env      = Environment(loader=FileSystemLoader(TEMPLATE_DIR), autoescape=False)
    template = env.get_template("osm_layout.html")

    # Read raw yaml for embedding
    with open(input_yaml, "r", encoding="utf-8") as f:
        raw_yaml_content = f.read()

    html = template.render(
        lang              = "zh-CN",
        title             = title,
        generated_at      = datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
        min_content_width = int(layout["canvas_w"]),
        obj_lane_height   = obj_lane_h,
        sub_lane_height   = int(layout["sub_lane_h"]),
        box_width         = BOX_W,
        objective_nodes   = layout["objective_nodes"],
        sub_nodes         = layout["sub_nodes"],
        top_connectors    = layout["top_connectors"],
        sub_connectors    = layout["sub_connectors"],
        raw_yaml          = raw_yaml_content
    )

    with open(output_html, "w", encoding="utf-8") as f:
        f.write(html)

    print(f"✅  OSM map generated → {output_html}")
    print(f"    Sub-lane height   : {int(layout['sub_lane_h'])}px")
    print(f"    Canvas width      : {int(layout['canvas_w'])}px")
    print(f"    Objective nodes   : {len(layout['objective_nodes'])}")
    print(f"    Sub-objective nodes: {len(layout['sub_nodes'])}")


if __name__ == "__main__":
    main()
