"""
build_blueprint.py  ──  Service Blueprint Map Generator
Usage: python3 scripts/build_blueprint.py <input.yaml> <output.html>

Architecture mirrors osm-map-generator v2:
  1. Robust YAML parsing  — strips ```yaml fences automatically
  2. Data normalization    — robustly handles strings vs lists to prevent character splitting
  3. Dynamic column widths — based on max activity count per phase
  4. Cognitive load coloring — low/medium/high/critical → CSS classes
  5. Jinja2 template engine — HTML/CSS fully in templates/blueprint_layout.html
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

# ── Layout Constants ──
CARD_W    = 100   # px width of each action/activity card
CARD_GAP  = 6     # px gap between cards
CELL_PAD  = 20    # px left+right padding inside each phase cell
LABEL_W   = 128   # px width of left lane label column
MIN_COL_W = 150   # px minimum phase column width


# ══════════════════════════════════════════════════════════════════════════════
# 1. YAML PARSING  (robust: strip ``` fences)
# ══════════════════════════════════════════════════════════════════════════════
def load_yaml_robust(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        raw = f.read()
    cleaned = re.sub(r"^\s*```(?:yaml|yml)?\s*\n", "", raw, flags=re.MULTILINE)
    cleaned = re.sub(r"\n\s*```\s*$", "", cleaned, flags=re.MULTILINE)
    return yaml.safe_load(cleaned.strip())


# ══════════════════════════════════════════════════════════════════════════════
# 2. PHASE WIDTH CALCULATOR
# ══════════════════════════════════════════════════════════════════════════════
def calc_phase_width(phase: dict) -> int:
    customer_count  = len((phase.get("customerLayer") or {}).get("actions") or [])
    front_count     = len((phase.get("frontstageLayer") or {}).get("activities") or [])
    back_count      = len((phase.get("backstageLayer") or {}).get("activities") or [])
    max_count       = max(customer_count, front_count, back_count, 1)
    width = max_count * CARD_W + (max_count - 1) * CARD_GAP + CELL_PAD
    return max(width, MIN_COL_W)


# ══════════════════════════════════════════════════════════════════════════════
# 3. DATA NORMALISERS (防御性编程)
# ══════════════════════════════════════════════════════════════════════════════
def ensure_str_list(val) -> list:
    """用于痛点等明确需要字符串列表的字段"""
    if not val:
        return []
    if isinstance(val, str):
        return [val]
    if isinstance(val, list):
        return [str(v) for v in val]
    return [str(val)]

def ensure_obj_list(val) -> list:
    """用于actions/activities等需要对象列表的字段"""
    if not val:
        return []
    if isinstance(val, list):
        return val
    return [val]

def clean_cog_load(val) -> str:
    """清理并标准化认知负荷"""
    val = str(val or "").strip().lower()
    if val in ["low", "medium", "high", "critical"]:
        return val
    return ""  # default info class applied via template logic

def normalise_customer_action(act: dict) -> dict:
    return {
        "name":         str(act.get("name") or ""),
        "touchpoints":  str(act.get("touchpoints") or ""),
        "pain_points":  ensure_str_list(act.get("painPoints")),
        "expectations": ensure_str_list(act.get("expectations")),
        "score":        act.get("experienceScore"),
    }

def normalise_front_activity(act: dict) -> dict:
    return {
        "name":               str(act.get("name") or ""),
        "role":               str(act.get("role") or ""),
        "system_touchpoints": str(act.get("systemTouchpoints") or ""),
        "pain_points":        ensure_str_list(act.get("painPoints")),
        "cognitive_load":     clean_cog_load(act.get("cognitiveLoad")),
    }

def normalise_back_activity(act: dict) -> dict:
    return {
        "name":               str(act.get("name") or ""),
        "role":               str(act.get("role") or ""),
        "system_touchpoints": str(act.get("systemTouchpoints") or ""),
        "pain_points":        ensure_str_list(act.get("painPoints")),
        "cognitive_load":     clean_cog_load(act.get("cognitiveLoad")),
    }

def normalise_phase(phase: dict, width: int) -> dict:
    cust  = phase.get("customerLayer") or {}
    front = phase.get("frontstageLayer") or {}
    back  = phase.get("backstageLayer") or {}
    return {
        "name":             str(phase.get("name") or ""),
        "width":            width,
        "customer_actions": [normalise_customer_action(a) for a in ensure_obj_list(cust.get("actions")) if isinstance(a, dict)],
        "front_activities": [normalise_front_activity(a) for a in ensure_obj_list(front.get("activities")) if isinstance(a, dict)],
        "back_activities":  [normalise_back_activity(a) for a in ensure_obj_list(back.get("activities")) if isinstance(a, dict)],
    }


# ══════════════════════════════════════════════════════════════════════════════
# 4. MAIN
# ══════════════════════════════════════════════════════════════════════════════
def main():
    if len(sys.argv) < 3:
        print("Usage: python3 build_blueprint.py <input.yaml> <output.html>")
        sys.exit(1)

    input_yaml, output_html = sys.argv[1], sys.argv[2]
    os.makedirs(os.path.dirname(os.path.abspath(output_html)), exist_ok=True)

    # Load YAML
    try:
        data = load_yaml_robust(input_yaml)
    except yaml.YAMLError as e:
        print(f"❌ YAML parse error: {e}")
        sys.exit(1)

    raw_phases = data.get("phases") or []
    if not raw_phases:
        print("❌ No 'phases' found in YAML (or empty).")
        sys.exit(1)

    title = str(data.get("title") or "服务蓝图")

    # Compute widths & normalise phases
    phase_widths = [calc_phase_width(p) for p in raw_phases]
    phases       = [normalise_phase(p, w) for p, w in zip(raw_phases, phase_widths)]
    total_canvas_width = LABEL_W + sum(phase_widths)

    # Render Jinja2
    env      = Environment(loader=FileSystemLoader(TEMPLATE_DIR), autoescape=True)
    template = env.get_template("blueprint_layout.html")

    # Read raw yaml for embedding
    with open(input_yaml, "r", encoding="utf-8") as f:
        raw_yaml_content = f.read()

    html = template.render(
        lang               = "zh-CN",
        title              = title,
        generated_at       = datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
        total_canvas_width = total_canvas_width,
        card_width         = CARD_W,
        phases             = phases,
        raw_yaml           = raw_yaml_content
    )

    with open(output_html, "w", encoding="utf-8") as f:
        f.write(html)

    print(f"✅  Service Blueprint generated → {output_html}")
    print(f"    Phases       : {len(phases)}")
    print(f"    Canvas width : {total_canvas_width}px")
    for ph in phases:
        print(f"    Phase [{ph['name']}]: {ph['width']}px  "
              f"| cust={len(ph['customer_actions'])} "
              f"front={len(ph['front_activities'])} "
              f"back={len(ph['back_activities'])}")


if __name__ == "__main__":
    main()
