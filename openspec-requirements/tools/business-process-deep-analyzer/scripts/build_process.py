"""
build_process.py ── Business Process Deep Analyzer Compiler
Usage: python3 scripts/build_process.py <input.yaml> <output.html>
"""

import re
import sys
import os
import datetime
import yaml
from jinja2 import Environment, FileSystemLoader

SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
SKILL_ROOT   = os.path.dirname(SCRIPT_DIR)
TEMPLATE_DIR = os.path.join(SKILL_ROOT, "templates")

BT_COLORS = [
    "#0ea5e9",
    "#8b5cf6",
    "#10b981",
    "#f59e0b",
    "#ec4899",
    "#6366f1",
]


def bt_color_bg(hex_color):
    return hex_color + "15"


def load_yaml_robust(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        raw = f.read()
    cleaned = re.sub(r"^\s*```(?:yaml|yml)?\s*\n", "", raw, flags=re.MULTILINE)
    cleaned = re.sub(r"\n\s*```\s*$", "", cleaned, flags=re.MULTILINE)
    return yaml.safe_load(cleaned.strip())


def ensure_list(val) -> list:
    if not val:
        return []
    if isinstance(val, list):
        return val
    return [val]


def ensure_str(val) -> str:
    if val is None:
        return ""
    return str(val)


def normalize_pain_point(pain: dict) -> dict:
    return {
        "severity": ensure_str(pain.get("severity", "medium")).lower(),
        "description": ensure_str(pain.get("description", "")),
        "impact": ensure_str(pain.get("impact", "")),
        "root_cause": ensure_str(pain.get("root_cause", "")),
    }


def normalize_activity(act: dict) -> dict:
    pains = [normalize_pain_point(p) for p in ensure_list(act.get("pain_points")) if isinstance(p, dict)]
    return {
        "name": ensure_str(act.get("name", "")),
        "role": ensure_str(act.get("role", "")),
        "system": ensure_str(act.get("system", "")),
        "inputs": ensure_list(act.get("inputs")),
        "outputs": ensure_list(act.get("outputs")),
        "description": ensure_str(act.get("description", "")),
        "order": act.get("order", 1),
        "pain_points": pains,
    }


def normalize_stage(stage: dict, bt_index: int) -> dict:
    activities = [normalize_activity(a) for a in ensure_list(stage.get("l2_processes")) if isinstance(a, dict)]
    activities.sort(key=lambda x: x["order"])
    
    pain_dots = []
    for act in activities:
        for pain in act["pain_points"]:
            pain_dots.append({"severity": pain["severity"]})
    
    return {
        "name": ensure_str(stage.get("name", "")),
        "description": ensure_str(stage.get("description", "")),
        "order": stage.get("order", 1),
        "type": ensure_str(stage.get("type", "process")),
        "l2_processes": activities,
        "pain_dots": pain_dots,
        "color_bg": bt_color_bg(BT_COLORS[bt_index % len(BT_COLORS)]),
    }


def normalize_value_stream(vs: dict, bt_name_to_index: dict) -> dict:
    bt_name = ensure_str(vs.get("business_type", ""))
    bt_index = bt_name_to_index.get(bt_name, 0)
    
    stages = [normalize_stage(s, bt_index) for s in ensure_list(vs.get("stages")) if isinstance(s, dict)]
    stages.sort(key=lambda x: x["order"])
    
    return {
        "name": ensure_str(vs.get("name", "")),
        "description": ensure_str(vs.get("description", "")),
        "business_type": bt_name,
        "bt_index": bt_index + 1,
        "stages": stages,
    }


def normalize_business_type(bt: dict, index: int) -> dict:
    return {
        "name": ensure_str(bt.get("name", "")),
        "model": ensure_str(bt.get("model", "")),
        "product_type": ensure_str(bt.get("product_type", "")),
        "market_type": ensure_str(bt.get("market_type", "")),
        "description": ensure_str(bt.get("description", "")),
        "color_bg": bt_color_bg(BT_COLORS[index % len(BT_COLORS)]),
    }


def aggregate_pain_points(value_streams: list) -> tuple:
    stats = {"critical": 0, "high": 0, "medium": 0, "low": 0, "total": 0}
    all_pains = []
    
    for vs in value_streams:
        vs_name = vs["name"]
        for stage in vs["stages"]:
            stage_name = stage["name"]
            for activity in stage["l2_processes"]:
                act_name = activity["name"]
                for pain in activity["pain_points"]:
                    sev = pain["severity"]
                    if sev in stats:
                        stats[sev] += 1
                    stats["total"] += 1
                    
                    all_pains.append({
                        "severity": sev,
                        "value_stream": vs_name,
                        "stage": stage_name,
                        "activity": act_name,
                        "description": pain["description"],
                        "impact": pain["impact"],
                        "root_cause": pain["root_cause"],
                    })
    
    severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    all_pains.sort(key=lambda x: severity_order.get(x["severity"], 99))
    
    return stats, all_pains


def main():
    if len(sys.argv) < 3:
        print("Usage: python3 build_process.py <input.yaml> <output.html>")
        sys.exit(1)

    input_yaml, output_html = sys.argv[1], sys.argv[2]
    os.makedirs(os.path.dirname(os.path.abspath(output_html)), exist_ok=True)

    try:
        data = load_yaml_robust(input_yaml)
    except yaml.YAMLError as e:
        print(f"❌ YAML parse error: {e}")
        sys.exit(1)

    if not data or not isinstance(data, dict):
        print("❌ Invalid YAML data (not a dict).")
        sys.exit(1)

    raw_bts = ensure_list(data.get("business_types"))
    business_types = [normalize_business_type(bt, i) for i, bt in enumerate(raw_bts) if isinstance(bt, dict)]
    
    bt_name_to_index = {}
    for i, bt in enumerate(business_types):
        bt_name_to_index[bt["name"]] = i

    raw_vss = ensure_list(data.get("l1_value_streams"))
    value_streams = [normalize_value_stream(vs, bt_name_to_index) for vs in raw_vss if isinstance(vs, dict)]

    pain_stats, all_pains = aggregate_pain_points(value_streams)

    env = Environment(loader=FileSystemLoader(TEMPLATE_DIR), autoescape=False)
    template = env.get_template("process_layout.html")

    # Read raw yaml for embedding
    with open(input_yaml, "r", encoding="utf-8") as f:
        raw_yaml_content = f.read()

    html = template.render(
        lang="zh-CN",
        title=ensure_str(data.get("title", "业务流程深度分析报告")),
        company=ensure_str(data.get("company", "")),
        domain=ensure_str(data.get("domain", "")),
        description=ensure_str(data.get("description", "")),
        generated_at=datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
        business_types=business_types,
        value_streams=value_streams,
        pain_stats=pain_stats,
        all_pains=all_pains,
        raw_yaml=raw_yaml_content,
    )

    with open(output_html, "w", encoding="utf-8") as f:
        f.write(html)

    print(f"✅  Business Process Analysis generated → {output_html}")
    print(f"    Business Types : {len(business_types)}")
    print(f"    Value Streams  : {len(value_streams)}")
    print(f"    Pain Points    : {pain_stats['total']} (critical={pain_stats['critical']}, high={pain_stats['high']}, medium={pain_stats['medium']}, low={pain_stats['low']})")
    for vs in value_streams:
        print(f"    VS [{vs['name']}]: {len(vs['stages'])} stages, business_type={vs['business_type']}")


if __name__ == "__main__":
    main()
