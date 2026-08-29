#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import re
import yaml
from jinja2 import Environment, FileSystemLoader

def strip_markdown(text):
    text = text.strip()
    if text.startswith("```"):
        match = re.search(r"^```\w*\n(.*?)\n```$", text, re.DOTALL)
        if match:
            text = match.group(1).strip()
        else:
            lines = text.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            text = "\n".join(lines).strip()
    return text

def extract_user_role(description):
    # 匹配"作为XXX，"或"作为XXX,"的模式
    zh_match = re.search(r"^作为(.*?)[,，](.*)$", description)
    if zh_match:
        return zh_match.group(1).strip(), zh_match.group(2).strip()
    
    # 匹配英文 "As a XXX,"
    en_match = re.search(r"^As (a|an) (.*?),(.*)$", description, re.IGNORECASE)
    if en_match:
        return en_match.group(2).strip(), en_match.group(3).strip()
    
    return "用户", description

def process_storymap_data(data):
    clean_data = {
        "title": data.get("title", "用户故事地图"),
        "stages": []
    }
    
    raw_stages = data.get("stages", [])
    if not isinstance(raw_stages, list):
        raw_stages = []
        
    for stage in raw_stages:
        s_data = {
            "name": stage.get("name", "未命名阶段"),
            "activities": []
        }
        
        for activity in stage.get("activities", []):
            a_data = {
                "name": activity.get("name", "未命名活动"),
                "touchpoints": activity.get("touchpoints", ""),
                "stories": [],
                "supporting_requirements": []
            }
            
            # Process User Stories
            raw_stories = activity.get("stories", [])
            if not isinstance(raw_stories, list): raw_stories = []
            for story in raw_stories:
                if isinstance(story, str):
                    desc = story
                    priority = "must"
                else:
                    desc = story.get("description", "")
                    priority = story.get("priority", "must").lower()
                
                # Standardize priority
                if priority in ["must-have", "high"]: priority = "must"
                if priority in ["should-have", "medium"]: priority = "should"
                if priority in ["could-have", "low"]: priority = "could"
                if priority not in ["must", "should", "could"]: priority = "must"

                role, action = extract_user_role(desc)
                
                a_data["stories"].append({
                    "role": role,
                    "action": action,
                    "priority": priority,
                    "status": story.get("status", "planned") if isinstance(story, dict) else "planned"
                })

            # Process Supporting Requirements
            raw_reqs = activity.get("supportingRequirements", activity.get("supporting_requirements", []))
            if not isinstance(raw_reqs, list): raw_reqs = []
            for req in raw_reqs:
                if isinstance(req, str):
                    a_data["supporting_requirements"].append({"description": req, "priority": "must"})
                else:
                    a_data["supporting_requirements"].append({
                        "description": req.get("description", ""),
                        "priority": req.get("priority", "must").lower()
                    })

            s_data["activities"].append(a_data)
        clean_data["stages"].append(s_data)
        
    return clean_data

def compile_storymap(yaml_path, output_html_path):
    with open(yaml_path, "r", encoding="utf-8") as f:
        raw_content = f.read()

    clean_yaml_str = strip_markdown(raw_content)

    try:
        data = yaml.safe_load(clean_yaml_str)
    except Exception as e:
        print(f"❌ YAML 解析失败: {e}")
        sys.exit(1)

    storymap_data = process_storymap_data(data)

    script_dir = os.path.dirname(os.path.abspath(__file__))
    templates_dir = os.path.join(os.path.dirname(script_dir), "templates")
    env = Environment(loader=FileSystemLoader(templates_dir))
    
    try:
        template = env.get_template("storymap_layout.html")
    except Exception as e:
        print(f"❌ 找不到模板文件 storymap_layout.html")
        sys.exit(1)

    # Read raw yaml for embedding
    with open(yaml_path, "r", encoding="utf-8") as f:
        raw_yaml_content = f.read()

    html_content = template.render(data=storymap_data, raw_yaml=raw_yaml_content)

    with open(output_html_path, "w", encoding="utf-8") as f:
        f.write(html_content)

    print(f"✅ User Story Map 编译成功！")
    print(f"📄 输出文件: {output_html_path}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 build_storymap.py <input.yaml> <output.html>")
        sys.exit(1)
        
    input_yaml = sys.argv[1]
    output_html = sys.argv[2]
    compile_storymap(input_yaml, output_html)
