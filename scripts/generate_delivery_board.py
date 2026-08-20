import os
import re
import json
from datetime import datetime, timedelta

# --- Configuration ---
WORKSPACE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DOCS_DIR = os.path.join(WORKSPACE_ROOT, 'docs')
CHANGES_DIR = os.path.join(WORKSPACE_ROOT, 'openspec', 'changes')
ARCHIVE_DIR = os.path.join(CHANGES_DIR, 'archive')
OUTPUT_FILE = os.path.join(DOCS_DIR, 'governance', 'delivery_board.html')

# --- Data Collection ---

def get_file_content(path):
    if not os.path.exists(path):
        return ""
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def parse_roadmap():
    content = get_file_content(os.path.join(DOCS_DIR, 'ROADMAP.md'))
    match = re.search(r'### 🚀 未来 \+1 个月.*?\n(.*?)(?=\n### 🚀|$)', content, re.S)
    items = []
    if match:
        bullets = re.findall(r'- (.*)', match.group(1))
        for b in bullets:
            b = b.strip()
            if not b.startswith('**目标**') and not b.startswith('**范围**'):
                clean_b = re.sub(r'\*\*.*?\*\*:\s*', '', b)
                items.append({
                    "name": clean_b,
                    "type": "Roadmap Epic",
                    "path": "docs/ROADMAP.md"
                })
    return items

def parse_epics():
    epics = []
    openspec_dir = os.path.join(WORKSPACE_ROOT, 'openspec')
    if not os.path.exists(openspec_dir):
        return epics
    
    for item in os.listdir(openspec_dir):
        if item.startswith('epic-') and item.endswith('.story-list.json'):
            path = os.path.join(openspec_dir, item)
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    for story in data.get('stories', []):
                        if story.get('status') == 'planned':
                            epics.append({
                                "name": story.get('title', story.get('id', '未命名 Story')),
                                "type": "Story (Planned)",
                                "path": f"openspec/{item}"
                            })
            except Exception:
                pass
    return epics

def get_verify_status(change_path):
    verify_md = os.path.join(change_path, 'verify.md')
    if not os.path.exists(verify_md):
        return {"gates": [], "health": "N/A"}
    
    content = get_file_content(verify_md)
    gates = []
    matches = re.findall(r'- (.*?): (PASS|FAIL|PENDING|SKIP)', content)
    pass_count = 0
    total_count = 0
    for name, status in matches:
        gates.append({"name": name, "status": status})
        if status == 'PASS':
            pass_count += 1
        if status in ['PASS', 'FAIL']:
            total_count += 1
            
    health = f"{int(pass_count/total_count*100)}%" if total_count > 0 else "N/A"
    return {"gates": gates, "health": health}

def get_task_progress(change_path):
    tasks_md = os.path.join(change_path, 'tasks.md')
    if not os.path.exists(tasks_md):
        return None
    content = get_file_content(tasks_md)
    # 匹配 - [ ] 或 - [x]
    total = len(re.findall(r'- \[[xX\s]\]', content))
    completed = len(re.findall(r'- \[[xX]\]', content))
    if total == 0:
        return None
    return {"total": total, "completed": completed, "percent": int(completed/total*100)}

def determine_change_type(item_name, path):
    # Try to guess type from folder name
    if 'bugfix' in item_name.lower():
        return 'Bug Fix'
    if 'story' in item_name.lower():
        return 'Story'
    if 'epic' in item_name.lower():
        return 'Epic'
    if 'techdebt' in item_name.lower():
        return 'Tech Debt'
    return 'Feature'

def scan_changes():
    exploring = []
    designing = []
    coding = []
    
    ideas_pool = os.path.join(CHANGES_DIR, 'ideas', 'idea.md')
    if os.path.exists(ideas_pool):
        exploring.append({
            "name": "全局想法池 (Global Ideas Pool)",
            "path": "openspec/changes/ideas/idea.md",
            "type": "Idea Pool"
        })

    if os.path.exists(CHANGES_DIR):
        for item in os.listdir(CHANGES_DIR):
            if item in ['archive', 'ideas', 'schemas', 'templates']: continue
            path = os.path.join(CHANGES_DIR, item)
            if not os.path.isdir(path): continue
            
            has_idea = os.path.exists(os.path.join(path, 'ideas', 'idea.md'))
            has_proposal = os.path.exists(os.path.join(path, 'proposal.md'))
            has_tasks = os.path.exists(os.path.join(path, 'tasks.md'))
            has_verify = os.path.exists(os.path.join(path, 'verify.md'))
            
            verify_info = get_verify_status(path)
            task_progress = get_task_progress(path)
            change_type = determine_change_type(item, path)
            
            # Determine main file to link to
            link_file = f"openspec/changes/{item}"
            if has_verify: link_file += "/verify.md"
            elif has_tasks: link_file += "/tasks.md"
            elif has_proposal: link_file += "/proposal.md"
            elif has_idea: link_file += "/ideas/idea.md"

            change_data = {
                "name": item,
                "path": link_file,
                "type": change_type,
                "health": verify_info['health'],
                "tasks": task_progress
            }
            
            if has_verify or has_tasks:
                coding.append(change_data)
            elif has_proposal or has_idea:
                designing.append(change_data)
            else:
                exploring.append(change_data)
                
    return exploring, designing, coding

def scan_archives():
    archived = []
    if not os.path.exists(ARCHIVE_DIR):
        return archived
    
    now = datetime.now()
    seven_days_ago = now - timedelta(days=7)
    
    entries = []
    for item in os.listdir(ARCHIVE_DIR):
        path = os.path.join(ARCHIVE_DIR, item)
        if not os.path.isdir(path): continue
        
        date_match = re.match(r'(\d{4}-\d{2}-\d{2})', item)
        mtime = datetime.fromtimestamp(os.path.getmtime(path))
        change_type = determine_change_type(item, path)
        
        entry = {
            "name": item,
            "path": f"openspec/changes/archive/{item}",
            "type": change_type,
            "mtime": mtime,
            "date_str": date_match.group(1) if date_match else mtime.strftime('%Y-%m-%d')
        }
        entries.append(entry)
    
    entries.sort(key=lambda x: x['mtime'], reverse=True)
    
    recent = [e for e in entries if e['mtime'] > seven_days_ago]
    older = [e for e in entries if e['mtime'] <= seven_days_ago]
    
    return recent, older

def get_baseline_info():
    baselines = [
        {"name": "服务蓝图 (Service Blueprint)", "file": "service_blueprint.html"},
        {"name": "业务流程 (Business Process)", "file": "business_process.html"},
        {"name": "领域模型 (Domain Model)", "file": "domain_model.html"}
    ]
    
    results = []
    for b in baselines:
        path = os.path.join(DOCS_DIR, 'baseline', b['file'])
        last_updated = "未知"
        if os.path.exists(path):
            content = get_file_content(path)
            match = re.search(r'(?:Last Updated|Last Refreshed|Baseline / Last Updated):\s*([\d-]+)', content)
            if match:
                last_updated = match.group(1)
            else:
                last_updated = datetime.fromtimestamp(os.path.getmtime(path)).strftime('%Y-%m-%d')
        
        results.append({
            "name": b['name'],
            "file": b['file'],
            "last_updated": last_updated
        })
    return results

# --- HTML Rendering ---

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>OpenSpec 交付状态看板</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {{
            theme: {{
                extend: {{
                    colors: {{
                        slate: {{ 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 500: '#64748b', 700: '#334155', 800: '#1e293b', 900: '#0f172a' }}
                    }}
                }}
            }}
        }}
    </script>
    <style>
        body {{ background-color: #f8fafc; font-family: sans-serif; }}
        * {{ border-radius: 0 !important; box-shadow: none !important; transition: all 0.2s; }}
        .kanban-col {{ min-width: 300px; }}
        .card:hover {{ border-color: #0f172a; transform: translateY(-2px); }}
        .progress-bar-bg {{ background-color: #e2e8f0; height: 4px; width: 100%; margin-top: 8px; }}
        .progress-bar-fill {{ background-color: #0f172a; height: 100%; }}
    </style>
</head>
<body class="p-8">
    <div class="max-w-7xl mx-auto mb-12">
        <div class="flex justify-between items-end mb-8 border-b-2 border-slate-900 pb-4">
            <div>
                <h1 class="text-4xl font-black text-slate-900 uppercase tracking-tighter">交付看板 (Delivery Board)</h1>
                <p class="text-slate-500 mt-2">OpenSpec Practice 交付可视化与治理看板</p>
            </div>
            <div class="text-right">
                <span class="text-xs text-slate-400 block uppercase font-bold">最后刷新时间</span>
                <span class="text-slate-900 font-mono">{refresh_time}</span>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div class="bg-white border border-slate-200 p-6">
                <div class="text-xs text-slate-500 uppercase font-bold mb-1">规划中 (Planning)</div>
                <div class="text-3xl font-black text-slate-900">{planned_count} <span class="text-sm font-normal text-slate-400">项</span></div>
            </div>
            <div class="bg-white border border-slate-200 p-6">
                <div class="text-xs text-slate-500 uppercase font-bold mb-1">活跃变更 (Active Changes)</div>
                <div class="text-3xl font-black text-slate-900">{active_count} <span class="text-sm font-normal text-slate-400">个</span></div>
            </div>
            <div class="bg-white border border-slate-200 p-6">
                <div class="text-xs text-slate-500 uppercase font-bold mb-1">已归档 (7天内)</div>
                <div class="text-3xl font-black text-slate-900">{archived_7d_count} <span class="text-sm font-normal text-slate-400">已完成</span></div>
            </div>
            <div class="bg-white border border-slate-200 p-6">
                <div class="text-xs text-slate-500 uppercase font-bold mb-1">质量信号 (Quality Signal)</div>
                <div class="text-3xl font-black text-slate-900">{avg_health} <span class="text-sm font-normal text-slate-400">通过率</span></div>
            </div>
        </div>

        <div class="flex gap-4 mb-12">
            {baseline_links}
        </div>

        <div class="flex gap-6 overflow-x-auto pb-8">
            <!-- Planning -->
            <div class="kanban-col flex-1">
                <div class="bg-slate-900 text-white px-4 py-2 text-xs font-bold uppercase mb-4">01. 规划中 ({planned_count})</div>
                <div class="space-y-3">
                    {planning_cards}
                </div>
            </div>

            <!-- Exploring -->
            <div class="kanban-col flex-1">
                <div class="bg-slate-200 text-slate-700 px-4 py-2 text-xs font-bold uppercase mb-4">02. 探索中 ({exploring_count})</div>
                <div class="space-y-3">
                    {exploring_cards}
                </div>
            </div>

            <!-- Designing -->
            <div class="kanban-col flex-1">
                <div class="bg-slate-200 text-slate-700 px-4 py-2 text-xs font-bold uppercase mb-4">03. 设计中 ({designing_count})</div>
                <div class="space-y-3">
                    {designing_cards}
                </div>
            </div>

            <!-- Coding -->
            <div class="kanban-col flex-1">
                <div class="bg-slate-200 text-slate-700 px-4 py-2 text-xs font-bold uppercase mb-4">04. 开发中 ({coding_count})</div>
                <div class="space-y-3">
                    {coding_cards}
                </div>
            </div>

            <!-- Archived -->
            <div class="kanban-col flex-1">
                <div class="bg-slate-900 text-white px-4 py-2 text-xs font-bold uppercase mb-4">05. 已归档 ({archived_7d_count})</div>
                <div class="space-y-3">
                    {archived_cards}
                </div>
            </div>
        </div>

        <div class="mt-12 border-t border-slate-200 pt-8">
            <h2 class="text-xl font-bold text-slate-900 mb-6 flex items-center">
                <span class="w-2 h-2 bg-slate-900 mr-2"></span>
                归档历史 (Archived History)
            </h2>
            <div id="older-archives" class="hidden">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {older_archived_list}
                </div>
            </div>
            <button onclick="document.getElementById('older-archives').classList.toggle('hidden'); this.innerText = this.innerText === '查看更多' ? '收起' : '查看更多';" 
                    class="text-sm text-slate-500 border border-slate-200 px-4 py-2 hover:bg-slate-900 hover:text-white">
                查看更多
            </button>
        </div>
    </div>
    <footer class="mt-20 text-center text-slate-400 text-xs pb-12">
        OpenSpec v2.0 治理框架 &bull; SDD 方法论
    </footer>
</body>
</html>
"""

def generate():
    refresh_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    # Collect Data
    roadmap_items = parse_roadmap()
    epic_items = parse_epics()
    planning_items = roadmap_items + epic_items
    
    exploring, designing, coding = scan_changes()
    recent_archived, older_archived = scan_archives()
    baselines = get_baseline_info()
    
    active_count = len(exploring) + len(designing) + len(coding)
    health_values = [int(c['health'].strip('%')) for c in coding if c.get('health') and c['health'] != 'N/A']
    avg_health = f"{int(sum(health_values)/len(health_values))}%" if health_values else "N/A"
    
    baseline_links_html = ""
    for b in baselines:
        baseline_links_html += f"""
        <a href="../baseline/{b['file']}" class="flex-1 bg-white border border-slate-200 p-4 group hover:border-slate-900 block">
            <div class="text-[10px] text-slate-400 uppercase font-bold mb-1 group-hover:text-slate-900">{b['name']}</div>
            <div class="text-slate-900 font-bold truncate">{b['file']}</div>
            <div class="text-[10px] text-slate-400 mt-2 font-mono">更新于: {b['last_updated']}</div>
        </a>
        """

    def make_card(item, is_archived=False):
        # Type badge
        type_color = "bg-slate-200 text-slate-700"
        if item.get('type') == 'Bug Fix': type_color = "bg-red-100 text-red-800"
        elif item.get('type') == 'Story': type_color = "bg-blue-100 text-blue-800"
        elif item.get('type') == 'Epic': type_color = "bg-purple-100 text-purple-800"
        
        type_badge = f'<span class="inline-block px-2 py-0.5 text-[10px] font-bold uppercase {type_color} mb-2">{item.get("type", "Change")}</span>'
        
        # Tasks progress
        task_html = ""
        if item.get('tasks'):
            t = item['tasks']
            task_html = f"""
            <div class="mt-3">
                <div class="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>Tasks</span>
                    <span>{t['completed']}/{t['total']} ({t['percent']}%)</span>
                </div>
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill" style="width: {t['percent']}%;"></div>
                </div>
            </div>
            """
            
        # Health Gate
        health_tag = ""
        if item.get('health') and item.get('health') != 'N/A':
            h_val = int(item['health'].strip('%'))
            h_color = "text-emerald-600" if h_val >= 100 else "text-amber-600"
            health_tag = f'<div class="text-[10px] {h_color} font-bold mt-2 uppercase">门禁: {item["health"]}</div>'
            
        opacity_class = "opacity-75" if is_archived else ""
        
        return f"""
        <a href="../../{item.get('path', '')}" class="block bg-white border border-slate-200 p-4 card group {opacity_class}">
            {type_badge}
            <div class="text-slate-900 font-bold text-sm mb-1 group-hover:underline leading-tight">{item['name']}</div>
            <div class="text-[10px] text-slate-400 font-mono truncate">{item.get('path', '')}</div>
            {task_html}
            {health_tag}
            {"<div class='text-[10px] text-slate-400 font-mono mt-2'>归档日期: " + item.get('date_str', '') + "</div>" if is_archived else ""}
        </a>
        """

    planning_cards = "".join([make_card(i) for i in planning_items])
    exploring_cards = "".join([make_card(i) for i in exploring])
    designing_cards = "".join([make_card(i) for i in designing])
    coding_cards = "".join([make_card(i) for i in coding])
    archived_cards = "".join([make_card(i, is_archived=True) for i in recent_archived])

    older_archived_list = "".join([f"""
        <a href="../../{i.get('path', '')}" class="block text-sm p-3 border border-slate-100 bg-white flex justify-between hover:border-slate-900">
            <span class="text-slate-900 font-medium truncate mr-2">{i['name']}</span>
            <span class="text-slate-400 text-xs font-mono shrink-0">{i['date_str']}</span>
        </a>
    """ for i in older_archived])

    html = HTML_TEMPLATE.format(
        refresh_time=refresh_time,
        planned_count=len(planning_items),
        exploring_count=len(exploring),
        designing_count=len(designing),
        coding_count=len(coding),
        active_count=active_count,
        archived_7d_count=len(recent_archived),
        avg_health=avg_health,
        baseline_links=baseline_links_html,
        planning_cards=planning_cards,
        exploring_cards=exploring_cards,
        designing_cards=designing_cards,
        coding_cards=coding_cards,
        archived_cards=archived_cards,
        older_archived_list=older_archived_list
    )

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write(html)
    
    print(f"交付看板已生成至: {OUTPUT_FILE}")

if __name__ == "__main__":
    generate()
