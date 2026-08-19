import os
import sys
import re

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} - OpenSpec Baseline</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
    <script>
        tailwind.config = {{
            theme: {{
                extend: {{
                    colors: {{
                        slate: {{
                            50: '#f8fafc',
                            200: '#e2e8f0',
                            900: '#0f172a',
                        }}
                    }}
                }}
            }}
        }}
    </script>
    <style>
        body {{ background-color: #f8fafc; font-family: sans-serif; }}
        .prose {{ max-width: 64rem; margin: 0 auto; padding: 2rem; background: white; border: 1px solid #e2e8f0; }}
        * {{ border-radius: 0 !important; box-shadow: none !important; }}
        table {{ width: 100%; border-collapse: collapse; margin: 1rem 0; }}
        th, td {{ border: 1px solid #e2e8f0; padding: 0.5rem; text-align: left; }}
        th {{ background-color: #f8fafc; }}
        pre {{ background: #f8fafc; padding: 1rem; border: 1px solid #e2e8f0; overflow-x: auto; }}
        .mermaid {{ margin: 2rem 0; display: flex; justify-content: center; }}
    </style>
</head>
<body class="p-8">
    <div class="mb-8 flex items-center justify-between max-w-4xl mx-auto">
        <h1 class="text-2xl font-bold text-slate-900 border-l-4 border-slate-900 pl-4">{title}</h1>
        <a href="index.html" class="text-sm text-slate-500 hover:text-slate-900">返回基线列表</a>
    </div>
    
    <article id="content" class="prose border border-slate-200 p-8 bg-white">
        <!-- Content will be rendered here -->
    </article>

    <script>
        const markdown = `{markdown_content}`;
        
        // Custom renderer to handle mermaid blocks
        const renderer = new marked.Renderer();
        const originalCode = renderer.code.bind(renderer);
        renderer.code = function(code, language, escaped) {{
            if (language === 'mermaid') {{
                return `<div class="mermaid">${{code}}</div>`;
            }}
            return originalCode(code, language, escaped);
        }};

        document.getElementById('content').innerHTML = marked.parse(markdown, {{ renderer: renderer }});
        
        mermaid.initialize({{ startOnLoad: true, theme: 'neutral' }});
    </script>
</body>
</html>
"""

def render_file(md_path):
    if not os.path.exists(md_path):
        print(f"Error: {md_path} not found")
        return

    with open(md_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Escape backticks and dollar signs for JS template literal
    js_safe_content = content.replace('`', '\\`').replace('$', '\\$')
    
    title = os.path.basename(md_path).replace('.md', '').replace('_', ' ').title()
    filename = os.path.basename(md_path).replace('.md', '.html').lower()
    output_path = os.path.join('docs', 'baseline', filename)

    html = HTML_TEMPLATE.format(title=title, markdown_content=js_safe_content)

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html)
    
    print(f"Rendered: {output_path}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        # Render all in docs/baseline
        baseline_dir = os.path.join('docs', 'baseline')
        for f in os.listdir(baseline_dir):
            if f.endswith('.md'):
                render_file(os.path.join(baseline_dir, f))
    else:
        render_file(sys.argv[1])
