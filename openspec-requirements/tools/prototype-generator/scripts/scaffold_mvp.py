#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
prototype-generator · MVP 脚手架编译引擎
=========================================
读取 mvp_spec YAML（由 LLM 从 AI Canvas + To-be Journey 推导），
编译出可运行的 mvp-prototype/ 一体化项目：
  - 前端：Vite + React(antd) 或 Vue(arco)
  - 后端：Express 一体化（routes + Mock AI service + Mock 业务系统）

用法:
    python3 scaffold_mvp.py <mvp_spec.yaml> [--output mvp-prototype]
"""

import os
import re
import sys
import json
import argparse
import datetime
import yaml
from jinja2 import Environment, FileSystemLoader

# ---------------------------------------------------------------
# 基础工具
# ---------------------------------------------------------------

def strip_markdown(text):
    text = text.strip()
    if text.startswith("```"):
        m = re.search(r"^```\w*\n(.*?)\n```$", text, re.DOTALL)
        if m:
            return m.group(1).strip()
        lines = text.split("\n")
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        return "\n".join(lines).strip()
    return text


def ensure_list(value, default=None):
    if value is None:
        return [] if default is None else default
    if isinstance(value, list):
        return value
    return [value]


def ensure_str(value, default=""):
    return default if value is None else str(value)


def pascal(name):
    """upload-request -> UploadRequest"""
    return "".join(part.capitalize() for part in re.split(r"[-_\s]+", name))


def js_expr(value):
    """将 YAML 值转为内联 JS 表达式（用于 Vue 模板 :prop）"""
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, str):
        return "'" + value.replace("\\", "\\\\").replace("'", "\\'") + "'"
    return json.dumps(value, ensure_ascii=False)


def camel(name):
    """upload-request -> uploadRequest"""
    parts = re.split(r"[-_\s]+", name)
    return parts[0] + "".join(p.capitalize() for p in parts[1:])


def cap(s):
    """parseRequest -> ParseRequest（PascalCase，避免 capitalize() 破坏驼峰）"""
    return s[:1].upper() + s[1:]


def hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip("#")
    if len(hex_color) == 3:
        hex_color = "".join(c * 2 for c in hex_color)
    return tuple(int(hex_color[i:i + 2], 16) for i in (0, 2, 4))


def rgb_to_hex(rgb):
    return "#{:02x}{:02x}{:02x}".format(*[max(0, min(255, int(round(c)))) for c in rgb])


def mix(color, target, weight):
    """color 与 target 混合，weight 为 target 占比 (0~1)"""
    c = hex_to_rgb(color)
    t = hex_to_rgb(target)
    return rgb_to_hex(tuple(c[i] * (1 - weight) + t[i] * weight for i in range(3)))


def arco_palette(primary):
    """从主色生成 Arco 10 级色阶（--primary-1 最浅 → --primary-10 最深）"""
    return [mix(primary, "#ffffff", 0.92),
            mix(primary, "#ffffff", 0.80),
            mix(primary, "#ffffff", 0.64),
            mix(primary, "#ffffff", 0.45),
            mix(primary, "#ffffff", 0.22),
            primary,
            mix(primary, "#000000", 0.16),
            mix(primary, "#000000", 0.32),
            mix(primary, "#000000", 0.48),
            mix(primary, "#000000", 0.64)]


def theme_shades(primary, n=10):
    """antd/vue 通用色阶（浅→深）"""
    return [mix(primary, "#ffffff", w) for w in (0.88, 0.72, 0.55, 0.38, 0.20)] + \
           [primary] + \
           [mix(primary, "#000000", w) for w in (0.12, 0.24, 0.40, 0.55)]


# ---------------------------------------------------------------
# 规格解析与规范化
# ---------------------------------------------------------------

def parse_spec(yaml_path):
    with open(yaml_path, "r", encoding="utf-8") as f:
        raw = f.read()
    data = yaml.safe_load(strip_markdown(raw))
    if not data or "meta" not in data:
        raise ValueError("mvp_spec 格式不合法：缺少顶级字段 meta")
    return data


def normalize(spec):
    meta = spec.get("meta", {})
    frontend = ensure_str(meta.get("frontend"), "react").lower()
    if frontend not in ("react", "vue"):
        raise ValueError(f"frontend 仅支持 react/vue，收到: {frontend}")
    theme = meta.get("theme") or {}
    ports = meta.get("ports") or {}
    design_system = ensure_str(meta.get("designSystem"), "antd" if frontend == "react" else "arco")
    primary = ensure_str(theme.get("primary"), "#2563eb")
    accent = ensure_str(theme.get("accent"), "#f97316")

    personas = ensure_list(spec.get("personas"))
    scenarios = ensure_list(spec.get("scenarios"))
    data_models = ensure_list(spec.get("dataModels"))
    pages_raw = ensure_list(spec.get("pages"))
    ai_mocks = ensure_list(spec.get("aiMocks"))
    business_mocks = ensure_list(spec.get("businessMocks"))
    api_routes_raw = ensure_list(spec.get("apiRoutes"))

    # ---- 规范化 apiRoutes ----
    api_routes = []
    for r in api_routes_raw:
        target = ensure_str(r.get("target"), "ai:" + camel(ensure_str(r.get("name"))))
        target_type, _, target_method = target.partition(":")
        route = {
            "name": ensure_str(r.get("name")),
            "method": ensure_str(r.get("method"), "POST").upper(),
            "method_lower": ensure_str(r.get("method"), "POST").lower(),
            "path": ensure_str(r.get("path"), "/api/" + ensure_str(r.get("name"))),
            "target": target,
            "target_type": target_type,
            "target_method": target_method,
        }
        route["client_path"] = route["path"][4:] if route["path"].startswith("/api") else route["path"]
        if target_type == "compose":
            comps = ensure_list(r.get("compose"))
            route["compose"] = comps
            route["compose_vars"] = ", ".join(camel(c.get("key", "v%d" % i)) for i, c in enumerate(comps))
            route["compose_kv"] = ", ".join(
                "%s: %s" % (camel(c.get("key", "v%d" % i)), camel(c.get("key", "v%d" % i)))
                for i, c in enumerate(comps))
        api_routes.append(route)

    # ---- 规范化 pages ----
    pages = []
    for p in pages_raw:
        pid = ensure_str(p.get("id"))
        pages.append({
            "id": pid,
            "title": ensure_str(p.get("title"), pid),
            "route": ensure_str(p.get("route"), "/" + pid),
            "icon": ensure_str(p.get("icon"), "AppstoreOutlined"),
            "description": ensure_str(p.get("description")),
            "actions": ensure_list(p.get("actions")),
            "sections": ensure_list(p.get("sections")),
            # 组件名统一加 Page 后缀，避免与 antd/arco 导出（Upload/Card/Table...）命名冲突
            "component": pascal(pid) + "Page",
        })

    return {
        "meta": {
            "projectName": ensure_str(meta.get("projectName"), "mvp-prototype"),
            "productName": ensure_str(meta.get("productName"), "MVP 原型"),
            "businessDomain": ensure_str(meta.get("businessDomain")),
            "frontend": frontend,
            "designSystem": design_system,
            "layout": ensure_str(theme.get("layout"), "side"),
            "primary": primary,
            "accent": accent,
            "theme_source": ensure_str(theme.get("source"), "auto"),
            "devPort": int(ports.get("dev", 5173)),
            "apiPort": int(ports.get("api", 8080)),
        },
        "personas": personas,
        "scenarios": scenarios,
        "dataModels": data_models,
        "pages": pages,
        "aiMocks": ai_mocks,
        "businessMocks": business_mocks,
        "apiRoutes": api_routes,
    }


# ---------------------------------------------------------------
# React 页面生成器
# ---------------------------------------------------------------

def react_rowkey(columns):
    """根据列集合挑选 rowKey：优先 code / key 字段，否则回退 index 函数"""
    keys = [c.get("key", "") for c in columns]
    if "code" in keys:
        return "rowKey=\"code\""
    if "key" in keys:
        return "rowKey=\"key\""
    if "id" in keys:
        return "rowKey=\"id\""
    return "rowKey={(r, i) => i}"


def react_columns_def(name, columns, tab="    "):
    """生成列定义 JS（含 tag 映射与 dataIndex——antd 必需）"""
    lines = []
    tag_maps = []
    for col in columns:
        if col.get("tag"):
            map_name = "tagMap_" + col["key"].replace(".", "_")
            tag_maps.append((map_name, col["tag"]))
    if tag_maps:
        for map_name, tagmap in tag_maps:
            lines.append(f"const {map_name} = {json.dumps(tagmap, ensure_ascii=False)};")
    lines.append(f"const {name} = [")
    for col in columns:
        key = col.get("key", "")
        title = col.get("title", key)
        if col.get("tag"):
            map_name = "tagMap_" + key.replace(".", "_")
            lines.append(f"{tab}{{ key: '{key}', dataIndex: '{key}', title: '{title}', render: (v) => <Tag color={{ {map_name}[v] || 'default' }}>{{v}}</Tag> }},")
        else:
            lines.append(f"{tab}{{ key: '{key}', dataIndex: '{key}', title: '{title}' }},")
    lines.append("];")
    return lines


def react_render_section(el, page, spec):
    """返回 (jsx_lines, setup_extra) —— setup_extra 为需要提前声明的代码"""
    etype = el.get("type")
    jsx = []
    setup = []

    if etype == "steps":
        items = [i if isinstance(i, str) else i.get("title", str(i)) for i in ensure_list(el.get("items"))]
        items_jsx = ", ".join("{ title: '%s' }" % i for i in items)
        jsx.append("<Card style={{ marginBottom: 16 }}>")
        jsx.append(f"  <Steps size=\"small\" current={{ {el.get('current', 0)} }} items={{ [{items_jsx}] }} />")
        jsx.append("</Card>")

    elif etype == "statRow":
        stats = ensure_list(el.get("stats"))
        jsx.append("<Row gutter={[16, 16]} style={{ marginBottom: 16 }}>")
        for st in stats:
            label = st.get("label", "")
            value = st.get("value", 0)
            suffix = st.get("suffix", "")
            jsx.append("  <Col xs={12} md={6}>")
            jsx.append("    <Card>")
            jsx.append(f"      <Statistic title=\"{label}\" value={{ {json.dumps(value)} }} suffix=\"{suffix}\" />")
            jsx.append("    </Card>")
            jsx.append("  </Col>")
        jsx.append("</Row>")

    elif etype == "uploadCard":
        action = el.get("action")
        accept = el.get("accept", "")
        hint = el.get("hint", "")
        jsx.append(f"<Card title=\"{el.get('title', '文件上传')}\" style={{{{ marginBottom: 16 }}}}>")
        jsx.append("  <Dragger")
        jsx.append(f"    accept=\"{accept}\"")
        jsx.append("    beforeUpload={() => false}")
        jsx.append("    onChange={(info) => setFileName(info.file?.name || '')}")
        jsx.append("  >")
        jsx.append("    <p className=\"ant-upload-drag-icon\"><CloudUploadOutlined /></p>")
        jsx.append("    <p className=\"ant-upload-text\">点击或拖拽文件到此处上传</p>")
        jsx.append(f"    <p className=\"ant-upload-hint\">{hint}</p>")
        jsx.append("  </Dragger>")
        if action:
            jsx.append("  <Space style={{ marginTop: 16 }}>")
            btn_text = page_action_button(page, action)
            jsx.append(f"    <Button type=\"primary\" icon={{ <CloudUploadOutlined /> }} loading={{ {action}Loading }} onClick={{ () => handle{cap(camel(action))}({{ file: fileName || '示例文件.xlsx' }}) }}>{btn_text}</Button>")
            jsx.append("  </Space>")
        jsx.append("</Card>")

    elif etype == "aiResultCard":
        bind = el.get("bind")
        title = el.get("title", "AI 结果")
        if not bind:
            jsx.append(f"<Card title=\"{title}\" style={{{{ marginBottom: 16 }}}}><Empty description=\"无数据\" /></Card>")
        else:
            var = f"{bind}Result"
            loading = f"{bind}Loading"
            handler = f"handle{cap(camel(bind))}"
            jsx.append(f"<Card title=\"{title}\" style={{{{ marginBottom: 16 }}}}>")
            jsx.append(f"  {{ {loading} ? (")
            jsx.append("    <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>AI 分析中，请稍候…</div>")
            jsx.append(f"  ) : {var} ? (")
            jsx.append(f"    {var}.error ? (")
            jsx.append(f"      <Alert type=\"error\" message=\"调用失败\" description={{ {var}.error }} />")
            jsx.append("    ) : (")
            jsx.append("      <div>")
            if el.get("render") == "kv":
                jsx.append(f"        {{ {var} && Object.entries({var}).filter(([k]) => k !== 'error').map(([k, v]) => (")
                jsx.append("          <div key={k} style={{ marginBottom: 6, display: 'flex', gap: 8 }}>")
                jsx.append("            <Typography.Text strong style={{ minWidth: 90, flexShrink: 0 }}>{k}：</Typography.Text>")
                jsx.append("            <Typography.Text>{typeof v === 'string' ? v : JSON.stringify(v)}</Typography.Text>")
                jsx.append("          </div>")
                jsx.append("        ))}")
            elif el.get("render") == "table":
                jsx.append(f"        {{ {var}.summary ? <Typography.Paragraph type=\"secondary\">{{ {var}.summary }}</Typography.Paragraph> : null }}")
                cols_def = react_columns_def(f"{bind}Cols", el.get("columns", []))
                setup.extend(cols_def)
                jsx.append(f"        <Table {react_rowkey(el.get('columns', []))} dataSource={{ {var}.items || [] }} columns={{ {bind}Cols }} pagination={{ false }} size=\"small\" />")
            else:
                jsx.append(f"        <pre style={{{{ background: '#f8fafc', padding: 12, borderRadius: 8, whiteSpace: 'pre-wrap' }}}}>{{ JSON.stringify({var}, null, 2) }}</pre>")
            jsx.append("      </div>")
            jsx.append("    )")
            jsx.append("  ) : (")
            jsx.append(f"    <Empty description=\"触发操作后展示结果\" />")
            jsx.append("  )}")
            jsx.append("</Card>")

    elif etype == "table":
        title = el.get("title", "数据")
        data_ref = el.get("data")
        cols_def = react_columns_def("tblCols", el.get("columns", []))
        setup.extend(cols_def)
        if isinstance(data_ref, str) and data_ref.startswith("mock:"):
            model_name = data_ref.split(":", 1)[1]
            rows = find_model_mock(spec, model_name)
            rows_js = json.dumps(rows, ensure_ascii=False)
            setup.append(f"const tblData = {rows_js};")
        elif isinstance(data_ref, list):
            setup.append(f"const tblData = {json.dumps(data_ref, ensure_ascii=False)};")
        else:
            setup.append("const tblData = [];")
        jsx.append(f"<Card title=\"{title}\" style={{{{ marginBottom: 16 }}}}>")
        jsx.append(f"  <Table {react_rowkey(el.get('columns', []))} dataSource={{tblData}} columns={{tblCols}} pagination={{false}} size=\"small\" />")
        jsx.append("</Card>")

    elif etype == "buttonRow":
        buttons = ensure_list(el.get("buttons"))
        jsx.append("<Space wrap>")
        for b in buttons:
            text = b.get("text", "操作")
            btype = b.get("type", "default")
            action = b.get("action", "")
            if action.startswith("navigate:"):
                route = action.split(":", 1)[1]
                jsx.append(f"  <Button type=\"{btype}\" onClick={{ () => navigate('{route}') }}>{text}</Button>")
            else:
                jsx.append(f"  <Button type=\"{btype}\" onClick={{ () => handle{cap(camel(action))}({{}}) }}>{text}</Button>")
        jsx.append("</Space>")

    elif etype == "alert":
        jsx.append(f"<Alert type=\"{el.get('level', 'info')}\" message=\"{el.get('message', '')}\" description=\"{el.get('description', '')}\" showIcon style={{{{ marginBottom: 16 }}}} />")

    elif etype == "timeline":
        items = ensure_list(el.get("items"))
        jsx.append("<Card style={{ marginBottom: 16 }}>")
        jsx.append("  <Timeline>")
        for it in items:
            t = it if isinstance(it, str) else it.get("title", "")
            color = it.get("color", "blue") if isinstance(it, dict) else "blue"
            jsx.append(f"    <Timeline.Item color=\"{color}\">{t}</Timeline.Item>")
        jsx.append("  </Timeline>")
        jsx.append("</Card>")

    elif etype == "tagRow":
        tags = ensure_list(el.get("tags"))
        jsx.append("<Space wrap style={{ marginBottom: 16 }}>")
        for t in tags:
            text = t.get("text", "") if isinstance(t, dict) else str(t)
            color = t.get("color", "blue") if isinstance(t, dict) else "blue"
            jsx.append(f"  <Tag color=\"{color}\">{text}</Tag>")
        jsx.append("</Space>")

    elif etype == "chatPanel":
        action = el.get("action")
        title = el.get("title", "AI 对话助手")
        placeholder = el.get("placeholder", "输入你的问题…")
        sugg = ensure_list(el.get("suggestions"))
        if action:
            var = f"{action}Result"
            jsx.append(f"<Card title=\"{title}\" style={{{{ marginBottom: 16 }}}}>")
            jsx.append("  <div style={{ minHeight: 120, marginBottom: 12 }}>")
            jsx.append(f"    {{ {var} ? <Alert type=\"info\" showIcon message={{ {var}.reply || JSON.stringify({var}) }} /> : <Typography.Paragraph type=\"secondary\">与 AI 助手对话，获取推荐操作</Typography.Paragraph> }}")
            jsx.append("  </div>")
            jsx.append("  <Space direction=\"vertical\" style={{ width: '100%' }}>")
            jsx.append("    <Input.Search")
            jsx.append(f"      placeholder=\"{placeholder}\"")
            jsx.append(f"      enterButton=\"发送\"")
            jsx.append(f"      loading={{ {action}Loading }}")
            jsx.append(f"      onSearch={{ (v) => handle{cap(camel(action))}({{ message: v }}) }}")
            jsx.append("    />")
            if sugg:
                jsx.append("    <Space wrap>")
                jsx.append("      <span style={{ fontSize: 12, color: '#94a3b8' }}>推荐指令：</span>")
                for s in sugg:
                    s = s.get("text", str(s)) if isinstance(s, dict) else str(s)
                    jsx.append(f"      <Tag color=\"processing\" style={{{{ cursor: 'pointer' }}}} onClick={{ () => handle{cap(camel(action))}({{ message: '{s}' }}) }}>{s}</Tag>")
                jsx.append("    </Space>")
            jsx.append("  </Space>")
            jsx.append("</Card>")

    elif etype == "formCard":
        action = el.get("action")
        fields = ensure_list(el.get("fields"))
        jsx.append(f"<Card title=\"{el.get('title', '表单')}\" style={{{{ marginBottom: 16 }}}}>")
        for f in fields:
            key = f.get("key", "")
            label = f.get("label", key)
            ftype = f.get("type", "text")
            if ftype == "select":
                opts = ensure_list(f.get("options"))
                opts_js = ", ".join("{ value: '%s', label: '%s' }" % (o.get("value", o), o.get("label", o)) if isinstance(o, dict) else "{ value: '%s', label: '%s' }" % (o, o) for o in opts)
                jsx.append(f"  <div style={{{{ marginBottom: 12 }}}}><span style={{{{ marginRight: 8 }}}}>{label}：</span><Select style={{{{ width: 260 }}}} options={{ [{opts_js}] }} onChange={{ (v) => setForm(v => ({{ ...v, {key}: v }})) }} /></div>")
            else:
                jsx.append(f"  <div style={{{{ marginBottom: 12 }}}}><span style={{{{ marginRight: 8 }}}}>{label}：</span><Input style={{{{ width: 260 }}}} onChange={{ (e) => setForm(v => ({{ ...v, {key}: e.target.value }})) }} /></div>")
        if action:
            jsx.append(f"  <Button type=\"primary\" loading={{ {action}Loading }} onClick={{ () => handle{cap(camel(action))}(form) }}>提交</Button>")
        jsx.append("</Card>")

    return jsx, setup


def page_action_button(page, action):
    for a in page.get("actions", []):
        if a.get("name") == action:
            return a.get("button", action)
    return action


def find_model_mock(spec, model_name):
    for m in spec.get("dataModels", []):
        if m.get("name") == model_name:
            return ensure_list(m.get("mockData"))
    return []


def generate_react_page(spec, page):
    setup = []
    jsx = []
    actions = page.get("actions", [])
    route_actions = {r["name"]: r for r in spec["apiRoutes"]}

    # 需要的手册
    used_icons = set()
    for el in page.get("sections", []):
        if el.get("type") == "uploadCard":
            used_icons.add("CloudUploadOutlined")
        if el.get("type") == "chatPanel":
            used_icons.add("SendOutlined")
    icon_imports = ", ".join(sorted(used_icons)) if used_icons else "ArrowRightOutlined"

    setup.append("import { useState } from 'react';")
    setup.append("import { useNavigate } from 'react-router-dom';")
    setup.append("import { Card, Steps, Upload, Button, Table, Statistic, Row, Col, Alert, Timeline, Empty, Typography, Space, Tag, Input, Select } from 'antd';")
    setup.append(f"import {{ {icon_imports} }} from '@ant-design/icons';")
    setup.append("import { api } from '../api/client.js';")
    setup.append("")
    setup.append("const { Dragger } = Upload;")
    setup.append("")

    # 动作 state + handler
    setup.append(f"export default function {page['component']}() {{")
    setup.append("  const navigate = useNavigate();")
    setup.append("  const [fileName, setFileName] = useState('');")
    setup.append("  const [form, setForm] = useState({});")
    for a in actions:
        aname = a.get("name")
        cname = cap(camel(aname))
        setup.append(f"  const [{aname}Result, set{cname}Result] = useState(null);")
        setup.append(f"  const [{aname}Loading, set{cname}Loading] = useState(false);")
    setup.append("")
    for a in actions:
        aname = a.get("name")
        cname = cap(camel(aname))
        setup.append(f"  const handle{cname} = async (payload) => {{")
        setup.append(f"    set{cname}Loading(true);")
        setup.append("    try {")
        setup.append(f"      const data = await api.{aname}(payload || {{}});")
        setup.append(f"      set{cname}Result(data);")
        setup.append("    } catch (e) {")
        setup.append(f"      set{cname}Result({{ error: String(e?.response?.data?.error || e) }});")
        setup.append("    } finally {")
        setup.append(f"      set{cname}Loading(false);")
        setup.append("    }")
        setup.append("  };")
        setup.append("")

    # 先收集所有 section 的 setup（列定义等），再拼 return JSX
    body_extra = []
    for el in page.get("sections", []):
        el_jsx, el_setup = react_render_section(el, page, spec)
        body_extra.extend(el_setup)
        jsx.extend("  " + l for l in el_jsx)

    setup.extend(body_extra)
    setup.append("  return (")
    setup.append("    <div>")
    jsx_header = [
        "      <div style={{ marginBottom: 16 }}>",
        f"        <Typography.Title level={{4}} style={{{{ margin: 0 }}}}>{page['title']}</Typography.Title>",
    ]
    if page.get("description"):
        jsx_header.append(
            f"        <Typography.Paragraph type=\"secondary\" style={{{{ marginTop: 4, marginBottom: 0 }}}}>{page['description']}</Typography.Paragraph>")
    jsx_header.append("      </div>")
    setup.extend(jsx_header)
    setup.extend(jsx)
    setup.append("    </div>")
    setup.append("  );")
    setup.append("}")
    return "\n".join(setup)


# ---------------------------------------------------------------
# Vue 页面生成器
# ---------------------------------------------------------------

def vue_columns_def(name, columns, tab="    "):
    lines = []
    tag_maps = []
    for col in columns:
        if col.get("tag"):
            map_name = "tagMap_" + col["key"].replace(".", "_")
            tag_maps.append((map_name, col["tag"]))
    for map_name, tagmap in tag_maps:
        lines.append(f"const {map_name} = {json.dumps(tagmap, ensure_ascii=False)};")
    lines.append(f"const {name} = [")
    for col in columns:
        key = col.get("key", "")
        title = col.get("title", key)
        if col.get("tag"):
            map_name = "tagMap_" + key.replace(".", "_")
            lines.append(f"{tab}{{ title: '{title}', dataIndex: '{key}', render: ({{ record }}) => h(Tag, {{ color: {map_name}[record.{key}] || 'default' }}, {{ default: () => record.{key} }}) }},")
        else:
            lines.append(f"{tab}{{ title: '{title}', dataIndex: '{key}' }},")
    lines.append("];")
    return lines


def vue_render_section(el, page, spec):
    etype = el.get("type")
    lines = []
    setup = []

    if etype == "steps":
        items = [i if isinstance(i, str) else i.get("title", str(i)) for i in ensure_list(el.get("items"))]
        lines.append("<a-card class=\"mb16\">")
        lines.append(f"  <a-steps :current=\"{el.get('current', 0)}\" size=\"small\">")
        for i in items:
            lines.append(f"    <a-step title=\"{i}\" />")
        lines.append("  </a-steps>")
        lines.append("</a-card>")

    elif etype == "statRow":
        stats = ensure_list(el.get("stats"))
        lines.append("<a-row :gutter=\"[16,16]\" class=\"mb16\">")
        for st in stats:
            label = st.get("label", "")
            raw = st.get("value", 0)
            suffix = st.get("suffix", "")
            lines.append("  <a-col :xs=\"12\" :md=\"6\">")
            lines.append("    <a-card>")
            if isinstance(raw, str):
                # 字符串值（如 "2h"）用自定义卡片渲染，避免 arco 数值/日期解析
                lines.append("      <div class=\"stat-block\">")
                lines.append(f"        <div class=\"stat-label\">{label}</div>")
                lines.append(f"        <div class=\"stat-value\">{raw}<span class=\"stat-suffix\">{suffix}</span></div>")
                lines.append("      </div>")
            else:
                lines.append(f"      <a-statistic title=\"{label}\" :value=\"{js_expr(raw)}\" suffix=\"{suffix}\" />")
            lines.append("    </a-card>")
            lines.append("  </a-col>")
        lines.append("</a-row>")

    elif etype == "uploadCard":
        action = el.get("action")
        hint = el.get("hint", "")
        lines.append(f"<a-card title=\"{el.get('title', '文件上传')}\" class=\"mb16\">")
        lines.append("  <a-upload-dragger :auto-upload=\"false\" accept=\"" + el.get("accept", "") + "\" @change=\"(files) => (fileName = files[0]?.name || '')\">")
        lines.append("    <div class=\"upload-inner\">")
        lines.append("      <icon-cloud-upload style=\"font-size: 36px; color: rgb(var(--primary-6))\" />")
        lines.append("      <p class=\"upload-text\">点击或拖拽文件到此处上传</p>")
        lines.append(f"      <p class=\"upload-hint\">{hint}</p>")
        lines.append("    </div>")
        lines.append("  </a-upload-dragger>")
        if action:
            btn_text = page_action_button(page, action)
            cname = cap(camel(action))
            lines.append(f"  <a-button type=\"primary\" class=\"mt16\" :loading=\"{action}Loading\" @click=\"handle{cname}({{ file: fileName || '示例文件.xlsx' }})\"><icon-cloud-upload /> {btn_text}</a-button>")
        lines.append("</a-card>")

    elif etype == "aiResultCard":
        bind = el.get("bind")
        title = el.get("title", "AI 结果")
        var = f"{bind}Result"
        loading = f"{bind}Loading"
        if not bind:
            lines.append(f"<a-card title=\"{title}\" class=\"mb16\"><a-empty description=\"无数据\" /></a-card>")
        else:
            lines.append(f"<a-card title=\"{title}\" class=\"mb16\">")
            lines.append(f"  <div v-if=\"{loading}\" class=\"ai-loading\">AI 分析中，请稍候…</div>")
            lines.append(f"  <template v-else-if=\"{var}\">")
            lines.append(f"    <a-alert v-if=\"{var}.error\" type=\"error\" title=\"调用失败\" :content=\"{var}.error\" />")
            lines.append("    <template v-else>")
            if el.get("render") == "table":
                lines.append(f"      <p v-if=\"{var}.summary\" class=\"ai-summary\">{{{{ {var}.summary }}}}</p>")
                cols = vue_columns_def(f"{bind}Cols", el.get("columns", []))
                setup.extend(cols)
                lines.append(f"      <a-table :columns=\"{bind}Cols\" :data=\"{var}.items || []\" :pagination=\"false\" size=\"small\" row-key=\"key\" />")
            else:
                lines.append(f"      <pre class=\"ai-pre\">{{{{ JSON.stringify({var}, null, 2) }}}}</pre>")
            lines.append("    </template>")
            lines.append("  </template>")
            lines.append(f"  <a-empty v-else description=\"触发操作后展示结果\" />")
            lines.append("</a-card>")

    elif etype == "table":
        title = el.get("title", "数据")
        data_ref = el.get("data")
        cols = vue_columns_def("tblCols", el.get("columns", []))
        setup.extend(cols)
        if isinstance(data_ref, str) and data_ref.startswith("mock:"):
            model_name = data_ref.split(":", 1)[1]
            rows = find_model_mock(spec, model_name)
            setup.append(f"const tblData = {json.dumps(rows, ensure_ascii=False)};")
        elif isinstance(data_ref, list):
            setup.append(f"const tblData = {json.dumps(data_ref, ensure_ascii=False)};")
        else:
            setup.append("const tblData = [];")
        lines.append(f"<a-card title=\"{title}\" class=\"mb16\">")
        lines.append("  <a-table :columns=\"tblCols\" :data=\"tblData\" :pagination=\"false\" size=\"small\" />")
        lines.append("</a-card>")

    elif etype == "buttonRow":
        buttons = ensure_list(el.get("buttons"))
        lines.append("<a-space wrap>")
        for b in buttons:
            text = b.get("text", "操作")
            btype = b.get("type", "secondary")
            action = b.get("action", "")
            if action.startswith("navigate:"):
                route = action.split(":", 1)[1]
                lines.append(f"  <a-button type=\"{btype}\" @click=\"router.push('{route}')\">{text}</a-button>")
            else:
                cname = cap(camel(action))
                lines.append(f"  <a-button type=\"{btype}\" @click=\"handle{cname}({{}})\">{text}</a-button>")
        lines.append("</a-space>")

    elif etype == "alert":
        lines.append(f"<a-alert type=\"{el.get('level', 'info')}\" title=\"{el.get('message', '')}\" content=\"{el.get('description', '')}\" class=\"mb16\" />")

    elif etype == "timeline":
        items = ensure_list(el.get("items"))
        lines.append("<a-card class=\"mb16\">")
        lines.append("  <a-timeline>")
        for it in items:
            t = it if isinstance(it, str) else it.get("title", "")
            color = it.get("color", "blue") if isinstance(it, dict) else "blue"
            lines.append(f"    <a-timeline-item :color=\"{color}\">{t}</a-timeline-item>")
        lines.append("  </a-timeline>")
        lines.append("</a-card>")

    elif etype == "tagRow":
        tags = ensure_list(el.get("tags"))
        lines.append("<a-space wrap class=\"mb16\">")
        for t in tags:
            text = t.get("text", "") if isinstance(t, dict) else str(t)
            color = t.get("color", "arcoblue") if isinstance(t, dict) else "arcoblue"
            lines.append(f"  <a-tag color=\"{color}\">{text}</a-tag>")
        lines.append("</a-space>")

    elif etype == "chatPanel":
        action = el.get("action")
        title = el.get("title", "AI 对话助手")
        placeholder = el.get("placeholder", "输入你的问题…")
        sugg = ensure_list(el.get("suggestions"))
        if action:
            var = f"{action}Result"
            cname = cap(camel(action))
            lines.append(f"<a-card title=\"{title}\" class=\"mb16\">")
            lines.append("  <div class=\"chat-area\">")
            lines.append(f"    <a-alert v-if=\"{var}\" type=\"info\" :title=\"{var}.reply || JSON.stringify({var})\" />")
            lines.append("    <a-typography-text v-else type=\"secondary\">与 AI 助手对话，获取推荐操作</a-typography-text>")
            lines.append("  </div>")
            lines.append("  <a-space direction=\"vertical\" style=\"width: 100%\">")
            lines.append(f"    <a-input-search :placeholder=\"'{placeholder}'\" search-button @search=\"(v) => handle{cname}({{ message: v }})\" :loading=\"{action}Loading\" />")
            if sugg:
                lines.append("    <a-space wrap>")
                lines.append("      <span class=\"sugg-label\">推荐指令：</span>")
                for s in sugg:
                    s = s.get("text", str(s)) if isinstance(s, dict) else str(s)
                    lines.append(f"      <a-tag color=\"arcoblue\" class=\"sugg-tag\" @click=\"handle{cname}({{ message: '{s}' }})\">{s}</a-tag>")
                lines.append("    </a-space>")
            lines.append("  </a-space>")
            lines.append("</a-card>")

    elif etype == "formCard":
        action = el.get("action")
        fields = ensure_list(el.get("fields"))
        lines.append(f"<a-card title=\"{el.get('title', '表单')}\" class=\"mb16\">")
        for f in fields:
            key = f.get("key", "")
            label = f.get("label", key)
            ftype = f.get("type", "text")
            if ftype == "select":
                opts = ensure_list(f.get("options"))
                opts_vue = "\n".join(f"        <a-option value=\"{o.get('value', o) if isinstance(o, dict) else o}\">{o.get('label', o.get('value', o)) if isinstance(o, dict) else o}</a-option>" for o in opts)
                lines.append("  <div class=\"form-row\">")
                lines.append(f"    <span class=\"form-label\">{label}</span>")
                lines.append(f"    <a-select style=\"width: 260px\" @change=\"(v) => (form['{key}'] = v)\">")
                lines.append(opts_vue)
                lines.append("    </a-select>")
                lines.append("  </div>")
            else:
                lines.append("  <div class=\"form-row\">")
                lines.append(f"    <span class=\"form-label\">{label}</span>")
                lines.append(f"    <a-input style=\"width: 260px\" @input=\"(v) => (form['{key}'] = v)\" />")
                lines.append("  </div>")
        if action:
            cname = cap(camel(action))
            lines.append(f"  <a-button type=\"primary\" :loading=\"{action}Loading\" @click=\"handle{cname}(form)\">提交</a-button>")
        lines.append("</a-card>")

    return lines, setup


def generate_vue_page(spec, page):
    body = []
    setup = []
    actions = page.get("actions", [])

    body.append("<template>")
    body.append("  <div>")
    body.append("    <div class=\"page-head\">")
    body.append(f"      <h4 class=\"page-title\">{page['title']}</h4>")
    if page.get("description"):
        body.append(f"      <p class=\"page-desc\">{page['description']}</p>")
    body.append("    </div>")

    for el in page.get("sections", []):
        el_lines, el_setup = vue_render_section(el, page, spec)
        setup.extend(el_setup)
        body.extend("  " + l for l in el_lines)

    body.append("  </div>")
    body.append("</template>")

    script = []
    script.append("<script setup>")
    script.append("import { ref } from 'vue';")
    script.append("import { h } from 'vue';")
    script.append("import { useRouter } from 'vue-router';")
    script.append("import { Tag } from '@arco-design/web-vue';")
    script.append("import { api } from '../api/client.js';")
    script.append("")
    script.append("const router = useRouter();")
    script.append("const fileName = ref('');")
    script.append("const form = ref({});")
    for a in actions:
        aname = a.get("name")
        script.append(f"const {aname}Result = ref(null);")
        script.append(f"const {aname}Loading = ref(false);")
    script.append("")
    for a in actions:
        aname = a.get("name")
        cname = cap(camel(aname))
        script.append(f"const handle{cname} = async (payload) => {{")
        script.append(f"  {aname}Loading.value = true;")
        script.append("  try {")
        script.append(f"    const data = await api.{aname}(payload || {{}});")
        script.append(f"    {aname}Result.value = data;")
        script.append("  } catch (e) {")
        script.append(f"    {aname}Result.value = {{ error: String(e?.response?.data?.error || e) }};")
        script.append("  } finally {")
        script.append(f"    {aname}Loading.value = false;")
        script.append("  }")
        script.append("};")
        script.append("")
    script.extend(setup)
    script.append("</script>")

    style = []
    style.append("<style scoped>")
    style.append(".page-head { margin-bottom: 16px; }")
    style.append(".page-title { margin: 0; font-size: 17px; font-weight: 600; color: #1d2129; }")
    style.append(".page-desc { margin: 4px 0 0; color: #86909c; font-size: 13px; }")
    style.append(".mb16 { margin-bottom: 16px; }")
    style.append(".mt16 { margin-top: 16px; }")
    style.append(".upload-text { font-size: 14px; color: #4e5969; margin: 8px 0 4px; }")
    style.append(".upload-hint { font-size: 12px; color: #86909c; }")
    style.append(".ai-loading { padding: 32px; text-align: center; color: #86909c; }")
    style.append(".ai-summary { color: #86909c; font-size: 13px; }")
    style.append(".ai-pre { background: #f7f8fa; padding: 12px; border-radius: 8px; white-space: pre-wrap; font-size: 12px; }")
    style.append(".chat-area { min-height: 80px; margin-bottom: 12px; }")
    style.append(".sugg-label { font-size: 12px; color: #86909c; }")
    style.append(".sugg-tag { cursor: pointer; }")
    style.append(".form-row { margin-bottom: 12px; }")
    style.append(".form-label { margin-right: 8px; color: #4e5969; }")
    style.append(".stat-block { padding: 4px 0; }")
    style.append(".stat-label { font-size: 12px; color: #86909c; margin-bottom: 6px; }")
    style.append(".stat-value { font-size: 24px; font-weight: 600; color: #1d2129; line-height: 1.2; }")
    style.append(".stat-suffix { font-size: 13px; font-weight: 400; color: #86909c; margin-left: 2px; }")
    style.append("</style>")

    return "\n".join(body + [""] + script + [""] + style)


# ---------------------------------------------------------------
# 脚手架主流程
# ---------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="MVP 脚手架编译引擎")
    parser.add_argument("spec", help="mvp_spec.yaml 路径")
    parser.add_argument("--output", default=None, help="输出目录（默认 <case>/<scenario>/mvp-prototype 或 ./mvp-prototype）")
    parser.add_argument("--case", default=None, help="客户/案例目录名（如 追觅科技供应链），产物置于 <case>/<scenario>/mvp-prototype")
    parser.add_argument("--scenario", default=None, help="场景子目录名（如 采购订单自动生成）")
    parser.add_argument("--force", action="store_true", help="覆盖已存在目录")
    args = parser.parse_args()

    spec_data = parse_spec(args.spec)
    spec = normalize(spec_data)
    meta = spec["meta"]
    frontend = meta["frontend"]

    # 输出路径解析：--output 显式指定 > --case/--scenario 推导 > 默认 mvp-prototype
    if args.output:
        out_rel = args.output
    elif args.case and args.scenario:
        out_rel = os.path.join(args.case, args.scenario, "mvp-prototype")
    elif args.case:
        out_rel = os.path.join(args.case, "mvp-prototype")
    else:
        out_rel = "mvp-prototype"
    out_dir = os.path.abspath(out_rel)
    if os.path.exists(out_dir):
        if args.force:
            import shutil
            shutil.rmtree(out_dir)
        else:
            print(f"❌ 输出目录已存在: {out_dir}（使用 --force 覆盖）")
            sys.exit(1)
    os.makedirs(out_dir)

    base_dir = os.path.dirname(os.path.abspath(__file__))
    templates_dir = os.path.join(os.path.dirname(base_dir), "templates")
    env = Environment(loader=FileSystemLoader(templates_dir))

    ctx = {
        "projectName": meta["projectName"],
        "productName": meta["productName"],
        "businessDomain": meta["businessDomain"],
        "frontend": frontend,
        "designSystem": meta["designSystem"],
        "primary": meta["primary"],
        "accent": meta["accent"],
        "theme_source": meta["theme_source"],
        "apiPort": meta["apiPort"],
        "devPort": meta["devPort"],
        "brand_initial": meta["productName"][:1],
        "first_route": spec["pages"][0]["route"] if spec["pages"] else "/",
        "personas": spec["personas"],
        "scenarios": spec["scenarios"],
        "pages": spec["pages"],
        "aiMocks": spec["aiMocks"],
        "businessMocks": spec["businessMocks"],
        "apiRoutes": spec["apiRoutes"],
        "icons": list({p["icon"] for p in spec["pages"] if p.get("icon")}),
        "shade_1": theme_shades(meta["primary"])[0],
        "shade_2": theme_shades(meta["primary"])[1],
        "shade_3": theme_shades(meta["primary"])[2],
        "shade_4": theme_shades(meta["primary"])[3],
        "shade_5": theme_shades(meta["primary"])[4],
        "shade_6": theme_shades(meta["primary"])[5],
        "shade_7": theme_shades(meta["primary"])[6],
        "shade_8": theme_shades(meta["primary"])[7],
        "shade_9": theme_shades(meta["primary"])[8],
        "shade_10": theme_shades(meta["primary"])[9],
        "generated_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }

    # 页面需要 icon_arco（菜单图标）
    icon_map = {"DashboardOutlined": "icon-dashboard",
                "UploadOutlined": "icon-upload",
                "FileSearchOutlined": "icon-search",
                "ShopOutlined": "icon-shop",
                "CheckCircleOutlined": "icon-check-circle",
                "SendOutlined": "icon-send",
                "AppstoreOutlined": "icon-apps"}
    for p in ctx["pages"]:
        p["icon_arco"] = icon_map.get(p.get("icon", ""), "icon-apps")

    # 渲染通用 + 服务端
    render_file(env, ctx, "common/package.json.j2", os.path.join(out_dir, "package.json"))
    render_file(env, ctx, "common/.gitignore.j2", os.path.join(out_dir, ".gitignore"))
    render_file(env, ctx, "common/README.md.j2", os.path.join(out_dir, "README.md"))
    render_file(env, ctx, "server/config.js.j2", os.path.join(out_dir, "server/config.js"))
    render_file(env, ctx, "server/index.js.j2", os.path.join(out_dir, "server/index.js"))
    render_file(env, ctx, "server/routes/api.js.j2", os.path.join(out_dir, "server/routes/api.js"))
    render_file(env, ctx, "server/services/aiService.js.j2", os.path.join(out_dir, "server/services/aiService.js"))
    render_file(env, ctx, "server/services/businessMock.js.j2", os.path.join(out_dir, "server/services/businessMock.js"))

    # 渲染前端基座
    fe = "frontend_react" if frontend == "react" else "frontend_vue"
    render_file(env, ctx, f"{fe}/vite.config.js.j2", os.path.join(out_dir, "vite.config.js"))
    render_file(env, ctx, f"{fe}/index.html.j2", os.path.join(out_dir, "index.html"))
    render_file(env, ctx, f"{fe}/src/main.jsx.j2" if frontend == "react" else f"{fe}/src/main.js.j2",
                os.path.join(out_dir, "src/main.jsx" if frontend == "react" else "src/main.js"))
    render_file(env, ctx, f"{fe}/src/theme.js.j2", os.path.join(out_dir, "src/theme.js"))
    render_file(env, ctx, f"{fe}/src/api/client.js.j2", os.path.join(out_dir, "src/api/client.js"))
    render_file(env, ctx, f"{fe}/src/data/appData.js.j2", os.path.join(out_dir, "src/data/appData.js"))
    if frontend == "react":
        render_file(env, ctx, f"{fe}/src/App.jsx.j2", os.path.join(out_dir, "src/App.jsx"))
        render_file(env, ctx, f"{fe}/src/layouts/WorkbenchLayout.jsx.j2",
                    os.path.join(out_dir, "src/layouts/WorkbenchLayout.jsx"))
    else:
        render_file(env, ctx, f"{fe}/src/router.js.j2", os.path.join(out_dir, "src/router.js"))
        render_file(env, ctx, f"{fe}/src/App.vue.j2", os.path.join(out_dir, "src/App.vue"))
        render_file(env, ctx, f"{fe}/src/layouts/WorkbenchLayout.vue.j2",
                    os.path.join(out_dir, "src/layouts/WorkbenchLayout.vue"))

    # 生成页面文件
    pages_dir = os.path.join(out_dir, "src", "pages")
    os.makedirs(pages_dir, exist_ok=True)
    for page in spec["pages"]:
        if frontend == "react":
            code = generate_react_page(spec, page)
            fname = os.path.join(pages_dir, page["component"] + ".jsx")
        else:
            code = generate_vue_page(spec, page)
            fname = os.path.join(pages_dir, page["component"] + ".vue")
        with open(fname, "w", encoding="utf-8") as f:
            f.write(code + "\n")

    print(f"✅ MVP 脚手架编译成功 → {out_dir}")
    print(f"   前端: {frontend} + {meta['designSystem']}  |  后端: Express 一体化")
    print(f"   页面: {len(spec['pages'])} 个 | API 路由: {len(spec['apiRoutes'])} 条 | AI Mock: {len(spec['aiMocks'])} 个 | 业务 Mock: {len(spec['businessMocks'])} 个")
    print(f"   启动: cd {out_rel} && npm install && npm run dev")


def render_file(env, ctx, template_name, out_path):
    template = env.get_template(template_name)
    content = template.render(**ctx)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(content)


if __name__ == "__main__":
    main()
