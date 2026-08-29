#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import os
import sys
from jinja2 import Template

def build_narrative_report(markdown_path, template_path, output_path):
    """
    Combines a Markdown file with the Jinja2 template to create a beautiful HTML report.
    """
    if not os.path.exists(markdown_path) or not os.path.exists(template_path):
        print("❌ Error: Missing input files.")
        return

    with open(markdown_path, "r", encoding="utf-8") as f:
        narrative_markdown = f.read()

    with open(template_path, "r", encoding="utf-8") as f:
        template_str = f.read()

    # Extract title from the first line of markdown if it starts with #
    first_line = narrative_markdown.split('\n')[0]
    title = first_line.lstrip('# ').strip() if first_line.startswith('#') else "User Story Details"

    template = Template(template_str)
    markdown_json = json.dumps(narrative_markdown, ensure_ascii=False)
    
    html_output = template.render(
        story_title=title,
        narrative_markdown_json=markdown_json
    )

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html_output)
    
    print(f"✅ Narrative report generated at: {output_path}")

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python3 build_narrative.py <markdown_file> <template_file> <output.html>")
        sys.exit(1)
    
    build_narrative_report(sys.argv[1], sys.argv[2], sys.argv[3])
