import sys
import os
import yaml
import re
from jinja2 import Template
import datetime

def ensure_str_list(val):
    if val is None: return []
    if isinstance(val, str): return [val]
    if isinstance(val, list): return [str(x) for x in val]
    return []

def clean_text_array(arr):
    res = []
    for val in ensure_str_list(arr):
        val_strip = val.strip()
        if not val_strip: continue
        # 清除大模型强行填补的无效废话
        clean_str = re.sub(r'[^\w]', '', val_strip.lower())
        if clean_str in ('无', '没', '空', 'none', 'null', '暂无', '没有', '无明显痛点', '暂无痛点'):
            continue
        if re.match(r'^(无|没|空|暂无).*|none|null|-', val_strip, re.IGNORECASE) and len(val_strip) < 8:
            continue
        res.append(val_strip)
    return res

def safe_int(val, default=5, min_val=1, max_val=10):
    try:
        v = int(val)
        if v < min_val: return min_val
        if v > max_val: return max_val
        return v
    except:
        return default

def get_score_color(score):
    if score >= 9: return 'bg-emerald-600', 'text-white'
    if score >= 7: return 'bg-emerald-400', 'text-black'
    if score >= 6: return 'bg-emerald-200', 'text-black'
    if score >= 5: return 'bg-slate-300', 'text-black'
    if score >= 4: return 'bg-amber-300', 'text-black'
    if score >= 2: return 'bg-orange-400', 'text-white'
    return 'bg-red-500', 'text-white'

def clean_yaml_block(text):
    text = text.strip()
    match = re.search(r'```(?:yaml)?(.*?)```', text, re.DOTALL)
    if match:
        return match.group(1).strip()
    return text

def compile_journey(yaml_path, html_path):
    with open(yaml_path, 'r', encoding='utf-8') as f:
        raw_content = f.read()
    
    yaml_str = clean_yaml_block(raw_content)
    try:
        data = yaml.safe_load(yaml_str)
    except yaml.YAMLError as exc:
        print(f"Error parsing YAML: {exc}")
        sys.exit(1)
        
    if not data or 'stages' not in data:
        print("Invalid data format. Missing 'stages'.")
        sys.exit(1)

    config = data.get('config', {})
    journey_mode = config.get('mode', 'as-is')

    # Calculate layout
    ACTION_BOX_WIDTH = 160
    ACTION_BOX_SPACING = 16
    
    raw_stages = data.get('stages', [])
    # 强制丢弃没有actions的无意义阶段防崩溃
    stages = [s for s in raw_stages if s.get('actions')]
    
    # Calculate widths
    total_pixel_width = 0
    stage_widths = []
    
    for stage in stages:
        actions = stage.get('actions', [])
        num_actions = len(actions) if actions else 1
        width = num_actions * (ACTION_BOX_WIDTH + ACTION_BOX_SPACING)
        stage_widths.append(width)
        total_pixel_width += width

    if total_pixel_width == 0:
        total_pixel_width = 1

    # Flatten actions to calculate points and extract points
    all_points = []
    current_x_offset = 0
    has_ai_usecase = False

    for s_idx, stage in enumerate(stages):
        actions = stage.get('actions', [])
        stage_pixel_width = stage_widths[s_idx]
        
        # Calculate stage properties
        stage['width_px'] = stage_pixel_width
        stage['left_pct'] = (current_x_offset / total_pixel_width) * 100
        stage['width_pct'] = (stage_pixel_width / total_pixel_width) * 100
        stage['safe_name'] = str(stage.get('name', f'Stage {s_idx+1}'))
        
        for a_idx, action in enumerate(actions):
            # Defensive structure
            action['name'] = str(action.get('name', 'N/A'))
            action['owner'] = str(action.get('owner', 'User'))
            action['touchpoints'] = str(action.get('touchpoints', ''))
            action['experienceScore'] = safe_int(action.get('experienceScore', 5))
            action['thoughts'] = clean_text_array(action.get('thoughts', []))
            action['painPoints'] = clean_text_array(action.get('painPoints', []))
            
            aiusecase = action.get('aiusecase')
            if aiusecase and isinstance(aiusecase, dict):
                has_ai_usecase = True
                action['aiusecase'] = aiusecase

            bg_color, text_color = get_score_color(action['experienceScore'])
            action['bg_class'] = bg_color
            action['text_class'] = text_color
            
            # Position calculations
            action_center_pixel = current_x_offset + (a_idx * (ACTION_BOX_WIDTH + ACTION_BOX_SPACING)) + (ACTION_BOX_WIDTH / 2)
            x_pct = (action_center_pixel / total_pixel_width) * 100
            
            # Y mapping: 1-10 mapped to 90%-10% (inverse)
            y_pct = 10 + ((10 - action['experienceScore']) / 10.0) * 80
            
            action['x_pct'] = x_pct
            action['y_pct'] = y_pct
            action['is_first'] = (a_idx == 0)
            action['is_last'] = (a_idx == len(actions) - 1)
            
            all_points.append({
                'stage_idx': s_idx,
                'action_idx': a_idx,
                'x_pct': x_pct,
                'y_pct': y_pct,
                'is_first': action['is_first'],
                'is_last': action['is_last']
            })

        current_x_offset += stage_pixel_width
        
    title = data.get('title', 'AI Journey Map')

    # Load Template
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    template_path = os.path.join(base_dir, 'templates', 'journey_layout.html')
    
    with open(template_path, 'r', encoding='utf-8') as f:
        template_content = f.read()
        
    template = Template(template_content)
    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    canvas_min_width = total_pixel_width + 200

    html_result = template.render(
        title=title,
        journey_mode=journey_mode,
        stages=stages,
        all_points=all_points,
        has_ai_usecase=has_ai_usecase,
        ACTION_BOX_WIDTH=ACTION_BOX_WIDTH,
        total_canvas_width=canvas_min_width,
        generated_at=now_str,
        raw_yaml=yaml_str
    )
    
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html_result)
        
    print(f"✅ Generated {html_path} successfully.")

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python build_journey.py <input.yaml> <output.html>")
        sys.exit(1)
    compile_journey(sys.argv[1], sys.argv[2])
