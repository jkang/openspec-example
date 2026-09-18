#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Single-page 16:9 slide builder, driven by an extracted palette.

DESIGN SYSTEM (v2)
------------------
1. **10pt floor.** Nothing on a slide may render below `MIN_PT` (10pt). The floor
   is enforced in `add_text()`, so every layout, chip, icon and footer inherits it.
2. **Density budget.** Because the floor is high, a page can only carry a few
   layers. The rule is: 1 page = 1 idea, <= 3 text layers per column, and lists
   are capped (see `MAX_LIST`). If content does not fit, CUT CONTENT — never
   shrink the type.
3. **No decorative strips, no nested boxes.** Cards are white surfaces on a
   light background; emphasis comes from tint + size, not borders.

Layouts (selected by the content JSON's `layout` field):
  - pipeline-boards : end-to-end pipeline + two backlog-shape charts
  - pain-cards      : N pain-point columns, each with a mini diagram
  - breakthrough    : maturity rail + one column per dimension (现状 -> 破局)
  - team-fit        : classification band + one card per team type

Usage:
    python3 build_slide.py --content c.json --palette p.json --out s.pptx --check
"""
from __future__ import annotations

import argparse
import json
import os

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.dml import MSO_LINE_DASH_STYLE
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.oxml.ns import qn
from pptx.util import Inches, Pt

# --------------------------------------------------------------------------
# Design system constants
# --------------------------------------------------------------------------
MIN_PT = 10.0          # hard floor: nothing may render below this
MAX_LIST = 4           # max bullets / chips in any single list
FONT = os.environ.get("SLIDE_FONT", "PingFang SC")
SLIDE_W = 13.3333
SLIDE_H = 7.5

PALETTE = {
    "bg": "F6F8F3",
    "white": "FFFFFF",
    "green": "4CAF50",
    "green_mid": "379455",
    "green_dark": "2E7D32",
    "green_soft": "E8F5E9",
    "green_tint": "DFF0E2",
    "blue": "2E5CE6",
    "blue_dark": "1B3FA0",
    "blue_soft": "E9EEFC",
    "blue_tint": "EDF1FD",
    "ink": "1F2933",
    "slate": "3F4A52",
    "slate_light": "6B7280",
    "gray_mid": "9AA3A8",
    "gray_soft": "F1F3F5",
    "border": "E3E8E0",
    "board_bg": "F7F9F4",
    "numeral": "AFC0EF",
}

LEVEL_COLORS = {
    "L0": "9AA3A8", "L1": "8FB89A", "L2": "6FAF84",
    "L3": "4FA46C", "L4": "379455", "L5": "2E7D32",
}

LEVEL_LEGEND = [
    ("L0", "纯手工"), ("L1", "辅助编程"), ("L2", "部分自动化"),
    ("L3", "有条件自动化"), ("L4", "高度自动化"), ("L5", "完全自动化"),
]

TONES = {
    "green": {"solid": "4CAF50", "band": "F1F8F2", "tint": "E8F5E9", "dark": "2E7D32"},
    "blue": {"solid": "2E5CE6", "band": "F1F5FD", "tint": "E9EEFC", "dark": "1B3FA0"},
    "slate": {"solid": "3F4A52", "band": "F4F5F6", "tint": "EDEFF0", "dark": "2B3339"},
}

# --------------------------------------------------------------------------
# Default content — layout A
# --------------------------------------------------------------------------
DEFAULT_CONTENT = {
    "layout": "pipeline-boards",
    "title_lead": "编码自动化了，",
    "title_accent": "需求还是手工作坊",
    "subtitle": "编码已迈入自动化时代，需求环节却仍停留在手工模式，成为端到端交付的新瓶颈。",
    "stages": [
        {"name": "Idea", "level": None, "bar": "C7CDD3", "fill": "F1F3F5",
         "name_color": "slate_light", "icon": "sun", "icon_color": "6B7280",
         "tint": "EDF0EC"},
        {"name": "需求分析", "level": "L0~L1", "bar": "9AA3A8", "fill": "FFFFFF",
         "name_color": "blue", "icon": "doc", "tint": "E9EEFC",
         "tag": "瓶颈", "border": "blue"},
        {"name": "设计", "level": "L2", "bar": "6FAF84", "fill": "FFFFFF",
         "name_color": "ink", "icon": "monitor", "tint": "E8F5E9"},
        {"name": "编码", "level": "L3~L4", "bar": "4FA46C", "fill": "FFFFFF",
         "name_color": "ink", "icon": "code", "tint": "E8F5E9"},
        {"name": "测试", "level": "L3~L4", "bar": "4FA46C", "fill": "FFFFFF",
         "name_color": "ink", "icon": "check", "tint": "E8F5E9"},
        {"name": "部署", "level": "L4~L5", "bar": "379455", "fill": "FFFFFF",
         "name_color": "ink", "icon": "cloud", "tint": "DFF0E2"},
        {"name": "运营", "level": "L4~L5", "bar": "379455", "fill": "FFFFFF",
         "name_color": "ink", "icon": "chart", "tint": "DFF0E2"},
        {"name": "价值实现", "level": None, "bar": "4CAF50", "fill": "2E7D32",
         "name_color": "white", "icon": "target", "icon_color": "4CAF50",
         "tint": "DFF0E2", "border": "2E7D32"},
    ],
    "boards": [
        {
            "title": "过去：需求 backlog 做不完",
            "theme": "slate",
            "problem": ["主要问题：", "需求多、变更频繁，backlog 积压严重"],
            "columns": [
                {"name": "需求 Backlog", "count": 52},
                {"name": "设计中", "count": 18},
                {"name": "开发中", "count": 15},
                {"name": "测试中", "count": 12},
                {"name": "已上线", "count": 8},
            ],
        },
        {
            "title": "现在：开发在等需求",
            "theme": "blue",
            "problem": ["主要问题：", "idea 没分析完，开发在等需求"],
            "columns": [
                {"name": "Idea / 评估", "count": 38},
                {"name": "需求分析中", "count": 27},
                {"name": "设计中", "count": 12},
                {"name": "开发中", "count": 6},
                {"name": "测试中", "count": 4},
                {"name": "已上线", "count": 3},
            ],
        },
    ],
    "footer": "NiDD City Lab | 成都站 · AI+ 研发数字峰会",
    "footer_right": "示意数据 · 仅供说明",
}

# --------------------------------------------------------------------------
# Low-level helpers
# --------------------------------------------------------------------------


def hx(token: str) -> RGBColor:
    return RGBColor.from_string(PALETTE.get(token, token))


def add_shape(slide, kind, x, y, w, h, fill=None, line=None, line_w=0.75,
              radius=None, shadow=False):
    sp = slide.shapes.add_shape(kind, Inches(x), Inches(y), Inches(w), Inches(h))
    if radius is not None:
        try:
            sp.adjustments[0] = radius
        except (IndexError, ValueError):
            pass
    if fill is None:
        sp.fill.background()
    else:
        sp.fill.solid()
        sp.fill.fore_color.rgb = hx(fill)
    if line is None:
        sp.line.fill.background()
    else:
        sp.line.color.rgb = hx(line)
        sp.line.width = Pt(line_w)
    if not shadow:
        sp.shadow.inherit = False
    sp.text_frame.word_wrap = True
    return sp


def add_gradient_shape(slide, kind, x, y, w, h, c1, c2, angle=0.0,
                       radius=None, line=None):
    sp = add_shape(slide, kind, x, y, w, h, fill="FFFFFF", line=line, radius=radius)
    f = sp.fill
    f.gradient()
    stops = list(f.gradient_stops)
    stops[0].color.rgb = hx(c1)
    stops[0].position = 0.0
    stops[-1].color.rgb = hx(c2)
    stops[-1].position = 1.0
    for mid in stops[1:-1]:
        mid.color.rgb = hx(c2)
    try:
        f.gradient_angle = angle
    except Exception:
        pass
    return sp


def _set_run_font(run, name: str) -> None:
    run.font.name = name
    rPr = run._r.get_or_add_rPr()
    for tag in ("a:ea", "a:cs"):
        el = rPr.find(qn(tag))
        if el is None:
            el = rPr.makeelement(qn(tag), {})
            rPr.append(el)
        el.set("typeface", name)


def add_text(slide, x, y, w, h, lines, align=PP_ALIGN.LEFT,
             anchor=MSO_ANCHOR.TOP, size=MIN_PT, bold=False, color="ink",
             italic=False, line_spacing=1.0, wrap=True, font=None):
    """Add a textbox. `size` is clamped up to MIN_PT — the single enforcement
    point for the design system's font floor."""
    font = font or FONT
    tb = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = tb.text_frame
    tf.word_wrap = wrap
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    tf.vertical_anchor = anchor
    if isinstance(lines, str):
        lines = lines.split("\n")
    else:
        expanded = []
        for line in lines:
            if isinstance(line, str) and "\n" in line:
                expanded.extend(line.split("\n"))
            else:
                expanded.append(line)
        lines = expanded
    for i, line in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        p.line_spacing = line_spacing
        p.space_before = Pt(0)
        p.space_after = Pt(0)
        runs = [(line, {})] if isinstance(line, str) else line
        for txt, ov in runs:
            r = p.add_run()
            r.text = txt
            r.font.size = Pt(max(MIN_PT, float(ov.get("size", size))))
            r.font.bold = ov.get("bold", bold)
            r.font.italic = ov.get("italic", italic)
            r.font.color.rgb = hx(ov.get("color", color))
            _set_run_font(r, ov.get("font", font))
    return tb


def _chip(slide, x, y, w, h, text, bg, fg, size=MIN_PT, bold=True,
          radius=0.5, line=None, line_w=1.0, dash=False):
    sp = add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, x, y, w, h,
                   fill=bg, line=line, line_w=line_w, radius=radius)
    if dash and line is not None:
        try:
            sp.line.dash_style = MSO_LINE_DASH_STYLE.DASH
        except Exception:
            pass
    add_text(slide, x + 0.04, y, w - 0.08, h, text, align=PP_ALIGN.CENTER,
             anchor=MSO_ANCHOR.MIDDLE, size=size, bold=bold, color=fg)
    return sp


def _bar(slide, x, y, w, h, fill, dash=False):
    sp = add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, x, y, w, h, fill=fill,
                   radius=0.5)
    if dash:
        try:
            sp.line.color.rgb = hx(fill)
            sp.line.width = Pt(1.0)
            sp.line.dash_style = MSO_LINE_DASH_STYLE.DASH
        except Exception:
            pass
    return sp


def _dot(slide, x, y, dia, text, fill, fg):
    add_shape(slide, MSO_SHAPE.OVAL, x, y, dia, dia, fill=fill)
    add_text(slide, x, y, dia, dia, text, align=PP_ALIGN.CENTER,
             anchor=MSO_ANCHOR.MIDDLE, size=dia * 34, bold=True, color=fg)


def draw_footer(slide, content):
    add_text(slide, 0.42, 7.10, 8.0, 0.26, content.get("footer", ""),
             size=MIN_PT, color="gray_mid")
    add_text(slide, 9.0, 7.10, 3.91, 0.26, content.get("footer_right", ""),
             align=PP_ALIGN.RIGHT, size=MIN_PT, color="gray_mid")


# --------------------------------------------------------------------------
# Icons
# --------------------------------------------------------------------------


def draw_icon(slide, kind, cx, cy, r, color, tint):
    add_shape(slide, MSO_SHAPE.OVAL, cx - r, cy - r, 2 * r, 2 * r, fill=tint)
    s = r * 0.58
    if kind == "sun":
        add_shape(slide, MSO_SHAPE.SUN, cx - s, cy - s, 2 * s, 2 * s, fill=color)
    elif kind == "doc":
        add_shape(slide, MSO_SHAPE.FOLDED_CORNER, cx - s * 0.74, cy - s,
                  s * 1.48, 2 * s, fill=color)
    elif kind == "monitor":
        add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, cx - s, cy - s * 0.80,
                  2 * s, s * 1.35, fill=color, radius=0.18)
        add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, cx - s * 0.30, cy + s * 0.62,
                  s * 0.60, s * 0.22, fill=color, radius=0.4)
    elif kind == "cloud":
        add_shape(slide, MSO_SHAPE.CLOUD, cx - s * 1.10, cy - s * 0.82,
                  2.20 * s, 1.55 * s, fill=color)
    elif kind == "chart":
        for i, hh in enumerate((0.55, 0.95, 1.35)):
            add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE,
                      cx - s * 0.85 + i * s * 0.62, cy + s * 0.72 - s * hh * 0.9,
                      s * 0.42, s * hh * 0.9, fill=color, radius=0.25)
    elif kind == "target":
        add_shape(slide, MSO_SHAPE.DONUT, cx - s, cy - s, 2 * s, 2 * s,
                  fill=color, radius=0.30)
    elif kind == "code":
        add_text(slide, cx - s * 1.6, cy - s * 0.9, 3.2 * s, 1.8 * s, "</>",
                 align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE,
                 size=MIN_PT, bold=True, color=color, wrap=False)
    elif kind == "check":
        add_text(slide, cx - s * 1.6, cy - s * 0.9, 3.2 * s, 1.8 * s, "\u2713",
                 align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE,
                 size=MIN_PT, bold=True, color=color, wrap=False)
    else:
        add_shape(slide, MSO_SHAPE.OVAL, cx - s * 0.6, cy - s * 0.6,
                  1.2 * s, 1.2 * s, fill=color)


def draw_dim_icon(slide, kind, cx, cy, r, color, tint):
    add_shape(slide, MSO_SHAPE.OVAL, cx - r, cy - r, 2 * r, 2 * r, fill=tint)
    s = r * 0.58
    try:
        if kind == "gear":
            add_shape(slide, MSO_SHAPE.GEAR_6, cx - s, cy - s, 2 * s, 2 * s,
                      fill=color)
        elif kind == "flow":
            add_shape(slide, MSO_SHAPE.CHEVRON, cx - s * 1.05, cy - s * 0.62,
                      s, s * 1.24, fill=color, radius=0.32)
            add_shape(slide, MSO_SHAPE.CHEVRON, cx + s * 0.05, cy - s * 0.62,
                      s, s * 1.24, fill=color, radius=0.32)
        elif kind == "people":
            add_shape(slide, MSO_SHAPE.OVAL, cx - s * 0.98, cy - s * 0.78,
                      s * 0.76, s * 0.76, fill=color)
            add_shape(slide, MSO_SHAPE.OVAL, cx + s * 0.22, cy - s * 0.78,
                      s * 0.76, s * 0.76, fill=color)
            add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, cx - s * 1.00,
                      cy + s * 0.12, s * 2.00, s * 0.74, fill=color, radius=0.45)
        elif kind == "doc":
            add_shape(slide, MSO_SHAPE.FOLDED_CORNER, cx - s * 0.76, cy - s,
                      s * 1.52, 2 * s, fill=color)
        elif kind == "person":
            add_shape(slide, MSO_SHAPE.OVAL, cx - s * 0.44, cy - s * 0.98,
                      s * 0.88, s * 0.88, fill=color)
            add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, cx - s * 0.88,
                      cy + s * 0.08, s * 1.76, s * 0.82, fill=color, radius=0.45)
        else:
            add_shape(slide, MSO_SHAPE.OVAL, cx - s * 0.6, cy - s * 0.6,
                      s * 1.2, s * 1.2, fill=color)
    except Exception:
        add_shape(slide, MSO_SHAPE.OVAL, cx - s * 0.6, cy - s * 0.6,
                  s * 1.2, s * 1.2, fill=color)


# --------------------------------------------------------------------------
# Layout A: pipeline-boards
# --------------------------------------------------------------------------


def draw_pipeline(slide, stages):
    n = len(stages)
    x0, total, gap = 0.42, 12.493, 0.12
    cw = (total - gap * (n - 1)) / n
    cy, ch = 1.34, 1.24

    for i, st in enumerate(stages):
        cx = x0 + i * (cw + gap)
        border = st.get("border", "border")
        add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, cx, cy, cw, ch,
                  fill=st.get("fill", "white"), line=border,
                  line_w=1.5 if st.get("border") else 1.0, radius=0.10)
        add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, cx + 0.08, cy + 0.07,
                  cw - 0.16, 0.07, fill=st["bar"], radius=0.5)
        draw_icon(slide, st.get("icon", "dot"), cx + cw / 2, cy + 0.42, 0.155,
                  st.get("icon_color", st["bar"]), st.get("tint", "gray_soft"))
        add_text(slide, cx + 0.06, cy + 0.62, cw - 0.12, 0.28, st["name"],
                 align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, size=10.5,
                 bold=True, color=st.get("name_color", "ink"))
        if st.get("level"):
            bw = 0.62
            add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, cx + (cw - bw) / 2,
                      cy + 0.92, bw, 0.26,
                      fill=LEVEL_COLORS[st["level"].split("~")[0]], radius=0.5)
            add_text(slide, cx + (cw - bw) / 2, cy + 0.92, bw, 0.26, st["level"],
                     align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE,
                     size=MIN_PT, bold=True, color="white")
        if st.get("tag"):
            tw = 0.56
            add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, cx + cw - tw - 0.08,
                      cy + 0.16, tw, 0.26, fill="blue", radius=0.5)
            add_text(slide, cx + cw - tw - 0.08, cy + 0.16, tw, 0.26, st["tag"],
                     align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE,
                     size=MIN_PT, bold=True, color="white")


def draw_backlog_chart(slide, board, bx, bw):
    by, bh = 2.76, 4.28
    theme = board.get("theme", "blue")
    tone = TONES["slate"] if theme == "slate" else TONES["blue"]
    add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, bx, by, bw, bh,
              fill="board_bg", line="border", radius=0.03)

    hx0, hy, hw, hh = bx + 0.10, by + 0.10, bw - 0.20, 0.56
    add_gradient_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, hx0, hy, hw, hh,
                       "454F58" if theme == "slate" else "2E5CE6",
                       "6B7280" if theme == "slate" else "379455", radius=0.12)
    add_text(slide, hx0 + 0.20, hy, hw - 0.40, hh, board["title"],
             anchor=MSO_ANCHOR.MIDDLE, size=14, bold=True, color="white")

    cols = board["columns"]
    n = len(cols)
    cpad, cgap = 0.12, 0.10
    cw = ((bw - 2 * cpad) - cgap * (n - 1)) / n
    baseline = 5.78
    max_bar = 1.80
    peak = max(c["count"] for c in cols)

    _bar(slide, bx + cpad, baseline, bw - 2 * cpad, 0.016, "border")

    for i, col in enumerate(cols):
        cx = bx + cpad + i * (cw + cgap)
        barh = max(0.30, max_bar * col["count"] / peak)
        barw = cw * 0.46
        bx_ = cx + (cw - barw) / 2
        add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, bx_, baseline - barh,
                  barw, barh, fill=tone["solid"], radius=0.14)
        add_text(slide, cx, baseline - barh - 0.40, cw, 0.38,
                 str(col["count"]), align=PP_ALIGN.CENTER,
                 anchor=MSO_ANCHOR.MIDDLE, size=16, bold=True,
                 color=tone["dark"])
        add_text(slide, cx, baseline + 0.10, cw, 0.46, col["name"],
                 align=PP_ALIGN.CENTER, size=MIN_PT, color="slate_light",
                 line_spacing=1.1)

    px, pw, py, ph = bx + 0.12, bw - 0.24, 6.36, 0.56
    add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, px, py, pw, ph,
              fill="slate" if theme == "slate" else "blue", radius=0.14)
    _dot(slide, px + 0.14, py + 0.15, 0.26, "!", "white",
         "slate" if theme == "slate" else "blue")
    lead, rest = board["problem"]
    add_text(slide, px + 0.50, py, pw - 0.62, ph,
             [[(lead, {"bold": True, "color": "white"}),
               (rest, {"color": "FFFFFF"})]],
             anchor=MSO_ANCHOR.MIDDLE, size=11)


def build_pipeline_boards(content):
    prs = Presentation()
    prs.slide_width = Inches(SLIDE_W)
    prs.slide_height = Inches(SLIDE_H)
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    bg = slide.background.fill
    bg.solid()
    bg.fore_color.rgb = hx("bg")

    add_text(slide, 0.42, 0.28, 12.49, 0.60,
             [[(content["title_lead"], {"color": "ink"}),
               (content["title_accent"], {"color": "blue"})]],
             size=28, bold=True)
    add_text(slide, 0.42, 0.94, 12.49, 0.32, content["subtitle"],
             size=11, color="slate_light")

    draw_pipeline(slide, content["stages"])
    draw_footer(slide, content)

    boards = content["boards"]
    gap, total = 0.20, 12.493 - 0.20
    left_w = total * len(boards[0]["columns"]) / sum(len(b["columns"]) for b in boards)
    draw_backlog_chart(slide, boards[0], 0.42, left_w)
    draw_backlog_chart(slide, boards[1], 0.42 + left_w + gap, total - left_w)
    return prs


# --------------------------------------------------------------------------
# Layout B: pain-cards
# --------------------------------------------------------------------------


def illus_missing_agent(slide, d, x, y, w, h):
    bw, bh, gap = w - 0.20, 0.42, 0.12
    for i, t in enumerate(d["bubbles"][:3]):
        by = y + 0.06 + i * (bh + gap)
        _chip(slide, x + 0.10, by, bw, bh, t, "blue_tint", "blue_dark",
              size=MIN_PT, bold=False, radius=0.24)
    boxw, boxh = 1.30, 0.78
    bx = x + (w - boxw) / 2
    by = y + 1.70
    sp = add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, bx, by, boxw, boxh,
                   fill="white", line="blue", line_w=1.5, radius=0.18)
    try:
        sp.line.dash_style = MSO_LINE_DASH_STYLE.DASH
    except Exception:
        pass
    add_text(slide, bx, by + 0.10, boxw, 0.36, d["box"],
             align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, size=18,
             bold=True, color="blue")
    add_text(slide, bx, by + 0.46, boxw, 0.26, d["box_sub"],
             align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, size=MIN_PT,
             bold=True, color="blue")
    _dot(slide, bx + boxw - 0.12, by - 0.12, 0.26, "×", "slate", "white")
    _bar(slide, x + w / 2 - 0.01, y + 1.52, 0.02, 0.14, "gray_mid", dash=True)


def illus_pipeline(slide, d, x, y, w, h):
    steps = d["steps"][:5]
    chipw, chiph, gap = w - 0.30, 0.36, 0.05
    cx = x + (w - chipw) / 2
    for i, s in enumerate(steps):
        by = y + 0.02 + i * (chiph + gap)
        last = (i == len(steps) - 1)
        _chip(slide, cx, by, chipw, chiph, s,
              "green_soft" if last else "blue_tint",
              "green_dark" if last else "blue_dark",
              size=MIN_PT, radius=0.24)
    by = y + 0.02 + len(steps) * (chiph + gap) + 0.04
    _chip(slide, x + 0.08, by, w - 0.16, max(0.44, h - (by - y) - 0.04),
          d["warning"], "slate", "white", size=MIN_PT, radius=0.16)


def illus_docs(slide, d, x, y, w, h):
    _chip(slide, x + 0.06, y + 0.04, 1.10, 0.34, d["tag"], "blue", "white",
          size=MIN_PT, radius=0.5)
    labels = d["labels"][:4]
    bw, bh, gap = w - 0.12, 0.38, 0.07
    for i, t in enumerate(labels):
        by = y + 0.50 + i * (bh + gap)
        add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, x + 0.06, by, bw, bh,
                  fill="gray_soft", radius=0.16)
        add_text(slide, x + 0.22, by, bw - 0.30, bh, t,
                 anchor=MSO_ANCHOR.MIDDLE, size=MIN_PT, color="ink")
    by = y + 0.50 + len(labels) * (bh + gap) + 0.02
    add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, x + 0.06, by, bw, 0.50,
              fill="slate", radius=0.16)
    _dot(slide, x + 0.16, by + 0.12, 0.26, "×", "white", "slate")
    add_text(slide, x + 0.50, by, bw - 0.58, 0.50, d["caption"],
             anchor=MSO_ANCHOR.MIDDLE, size=MIN_PT, color="white")


def illus_roles(slide, d, x, y, w, h):
    step = w / 3.0
    dia = 0.62
    for i, r in enumerate(d["roles"][:3]):
        cxx = x + step * i + step / 2
        add_shape(slide, MSO_SHAPE.OVAL, cxx - dia / 2, y + 0.04, dia, dia,
                  fill="blue_tint")
        add_text(slide, cxx - dia / 2, y + 0.04, dia, dia, r["initial"],
                 align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, size=15,
                 bold=True, color="blue")
        add_text(slide, x + step * i, y + 0.72, step, 0.28, r["name"],
                 align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE,
                 size=MIN_PT, color="slate_light")
    bw2, bh2 = 0.84, 1.12
    by = y + 1.14
    _chip(slide, x + 0.06, by, bw2, bh2, d["from"], "gray_soft", "ink",
          size=MIN_PT, bold=False, radius=0.16)
    add_shape(slide, MSO_SHAPE.RIGHT_ARROW, x + 0.06 + bw2 + 0.04,
              by + bh2 / 2 - 0.07, 0.20, 0.14, fill="blue")
    _chip(slide, x + 0.06 + bw2 + 0.28, by, bw2, bh2, d["to"], "blue_tint",
          "blue_dark", size=MIN_PT, bold=False, radius=0.16)


def illus_gap(slide, d, x, y, w, h):
    """Stacked (not side-by-side) so 10pt quotes actually fit."""
    panels = ((d["left_head"], d["left"]), (d["right_head"], d["right"]))
    ph = 0.86
    ys = (y + 0.02, y + 1.18)
    for (head, quote), py in zip(panels, ys):
        add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, x + 0.06, py, w - 0.12,
                  ph, fill="gray_soft", radius=0.14)
        _chip(slide, x + 0.14, py + 0.27, 0.90, 0.32, head, "blue", "white",
              size=MIN_PT, radius=0.5)
        add_text(slide, x + 1.14, py + 0.08, w - 1.28, ph - 0.16, quote,
                 anchor=MSO_ANCHOR.MIDDLE, size=MIN_PT, color="ink",
                 line_spacing=1.2)
    _dot(slide, x + w / 2 - 0.13, y + 0.94, 0.26, "×", "slate", "white")
    _chip(slide, x + 0.06, y + 2.12, w - 0.12, 0.50, d["caption"], "slate",
          "white", size=MIN_PT, radius=0.16)


ILLUS = {
    "missing-agent": illus_missing_agent,
    "pipeline": illus_pipeline,
    "docs": illus_docs,
    "roles": illus_roles,
    "gap": illus_gap,
}


def draw_pain_cards(content):
    prs = Presentation()
    prs.slide_width = Inches(SLIDE_W)
    prs.slide_height = Inches(SLIDE_H)
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    bg = slide.background.fill
    bg.solid()
    bg.fore_color.rgb = hx("bg")

    add_text(slide, 0.42, 0.30, 12.49, 0.60,
             [[(content["title_lead"], {"color": "ink"}),
               (content["title_accent"], {"color": "blue"})]],
             size=28, bold=True)
    subs = content.get("subtitle_runs") or content.get("subtitle", "")
    add_text(slide, 0.42, 0.96, 12.49, 0.34, subs, size=11,
             color="slate_light", line_spacing=1.3)

    cards = content["cards"]
    n = len(cards)
    x0, total, gap = 0.42, 12.493, 0.10
    cw = (total - gap * (n - 1)) / n
    y0, ch = 1.56, 5.52
    pad = 0.20
    inner = cw - 2 * pad

    for i, card in enumerate(cards):
        cx = x0 + i * (cw + gap)
        add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, cx, y0, cw, ch,
                  fill="white", radius=0.055)
        add_text(slide, cx + pad, y0 + 0.18, inner, 0.50, "%02d" % card["no"],
                 size=30, bold=True, color="numeral")
        add_text(slide, cx + pad, y0 + 0.76, inner, 0.90, card["title"],
                 anchor=MSO_ANCHOR.MIDDLE, size=15, bold=True, color="ink",
                 line_spacing=1.15)
        add_text(slide, cx + pad, y0 + 1.74, inner, 0.84, card["desc"],
                 size=10.5, color="slate_light", line_spacing=1.35)
        ILLUS[card["illustration"]](slide, card["illus"], cx + pad, y0 + 2.72,
                                    inner, 2.60)

    draw_footer(slide, content)
    return prs


# --------------------------------------------------------------------------
# Layout C: breakthrough
# --------------------------------------------------------------------------


def draw_scale_rail(slide, scale, x, y, w):
    levels = scale["levels"]
    n = len(levels)
    inset = 1.30
    x0 = x + inset
    tw = w - 2 * inset
    step = tw / (n - 1)
    ty = y + 0.46

    add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, x0, ty, tw, 0.09,
              fill="border", radius=0.5)
    nf, nt = scale["now"]["from"], scale["now"]["to"]
    ti = scale["target"]["index"]
    add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, x0 + nt * step, ty,
              (ti - nt) * step, 0.09, fill="blue", radius=0.5)

    bx0, bx1 = x0 + nf * step, x0 + nt * step
    add_text(slide, bx0 - 0.9, y + 0.00, (bx1 - bx0) + 1.8, 0.26,
             scale["now"]["label"], align=PP_ALIGN.CENTER,
             anchor=MSO_ANCHOR.MIDDLE, size=MIN_PT, bold=True, color="slate")
    add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, bx0, y + 0.28,
              bx1 - bx0, 0.02, fill="slate", radius=0.5)
    for xx in (bx0, bx1 - 0.02):
        add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, xx, y + 0.28, 0.02, 0.12,
                  fill="slate", radius=0.5)

    tx = x0 + ti * step
    add_text(slide, tx - 1.3, y + 0.00, 2.6, 0.26, scale["target"]["label"],
             align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, size=MIN_PT,
             bold=True, color="blue")
    add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, tx - 0.011, y + 0.24,
              0.022, 0.16, fill="blue", radius=0.5)

    for i, (lvl, label) in enumerate(levels):
        cxx = x0 + i * step
        is_now = nf <= i <= nt
        is_tgt = (i == ti)
        dia = 0.24 if is_tgt else (0.20 if is_now else 0.16)
        if is_tgt:
            col = "blue"
        elif is_now:
            col = LEVEL_COLORS[lvl]
        elif i > ti:
            col = "DDE4DD"
        else:
            col = "C3D4C7"
        add_shape(slide, MSO_SHAPE.OVAL, cxx - dia / 2, ty + 0.045 - dia / 2,
                  dia, dia, fill=col)
        if is_tgt:
            add_shape(slide, MSO_SHAPE.OVAL, cxx - dia * 0.22,
                      ty + 0.045 - dia * 0.22, dia * 0.44, dia * 0.44,
                      fill="white")
        txt_col = "ink" if (is_now or is_tgt) else "gray_mid"
        add_text(slide, cxx - 1.20, y + 0.72, 2.40, 0.26,
                 [[(lvl + " ", {"bold": True, "color": txt_col}),
                   (label, {"color": "slate_light" if is_now or is_tgt else "gray_mid"})]],
                 align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, size=MIN_PT)


def draw_breakthrough(content):
    prs = Presentation()
    prs.slide_width = Inches(SLIDE_W)
    prs.slide_height = Inches(SLIDE_H)
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    bg = slide.background.fill
    bg.solid()
    bg.fore_color.rgb = hx("bg")

    add_text(slide, 0.42, 0.30, 12.49, 0.60,
             [[(content["title_lead"], {"color": "ink"}),
               (content["title_accent"], {"color": "blue"})]],
             size=28, bold=True)
    add_text(slide, 0.42, 0.96, 12.49, 0.32, content["subtitle"],
             size=11, color="slate_light")

    draw_scale_rail(slide, content["scale"], 0.42, 1.30, 12.493)

    cols = content["columns"]
    n = len(cols)
    x0, total, gap = 0.42, 12.493, 0.16
    cw = (total - gap * (n - 1)) / n
    y0, ch = 2.28, 4.14
    pad = 0.18
    inner = cw - 2 * pad

    for i, c in enumerate(cols):
        cx = x0 + i * (cw + gap)
        draw_dim_icon(slide, c["icon"], cx + pad + 0.22, y0 + 0.24, 0.22,
                      "blue", "blue_soft")
        add_text(slide, cx + pad + 0.56, y0 + 0.00, inner - 0.56, 0.48,
                 c["name"], anchor=MSO_ANCHOR.MIDDLE, size=15, bold=True,
                 color="blue")
        _chip(slide, cx + pad, y0 + 0.62, 0.64, 0.28,
              content.get("problem_label", "现状"), "gray_soft", "slate",
              size=MIN_PT, radius=0.5)
        add_text(slide, cx + pad, y0 + 0.92, inner, 0.76, c["problem"],
                 size=10.5, color="slate_light", line_spacing=1.3)
        add_shape(slide, MSO_SHAPE.DOWN_ARROW, cx + cw / 2 - 0.11, y0 + 1.80,
                  0.22, 0.34, fill="blue")
        add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, cx, y0 + 2.24, cw, 1.90,
                  fill="blue_tint", radius=0.055)
        _chip(slide, cx + pad, y0 + 2.36, 0.64, 0.28,
              content.get("solution_label", "破局"), "blue", "white",
              size=MIN_PT, radius=0.5)
        add_text(slide, cx + pad, y0 + 2.72, inner, 1.30, c["solution"],
                 anchor=MSO_ANCHOR.MIDDLE, size=11.5, color="ink",
                 line_spacing=1.4)

    th = content.get("thesis")
    if th:
        ty, thh = 6.58, 0.50
        add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, 0.42, ty, 12.493, thh,
                  fill="blue", radius=0.12)
        add_text(slide, 0.42, ty, 12.493, thh, th, align=PP_ALIGN.CENTER,
                 anchor=MSO_ANCHOR.MIDDLE, size=13, bold=True, color="white")

    draw_footer(slide, content)
    return prs


# --------------------------------------------------------------------------
# Layout D: team-fit
# --------------------------------------------------------------------------


def draw_team_fit(content):
    prs = Presentation()
    prs.slide_width = Inches(SLIDE_W)
    prs.slide_height = Inches(SLIDE_H)
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    bg = slide.background.fill
    bg.solid()
    bg.fore_color.rgb = hx("bg")

    add_text(slide, 0.42, 0.28, 12.49, 0.60,
             [[(content["title_lead"], {"color": "ink"}),
               (content["title_accent"], {"color": "blue"})]],
             size=27, bold=True)
    add_text(slide, 0.42, 0.94, 12.49, 0.32, content["subtitle"],
             size=11, color="slate_light")

    sc = content["scale"]
    dims, rows = sc["dimensions"], sc["rows"]
    mx, mw, my = 0.42, 12.493, 1.26
    lab_w, lab_gap = 0.56, 0.20
    col_x0 = mx + 0.08 + lab_w + lab_gap
    cgap = 0.10
    cw = ((mx + mw) - col_x0 - cgap * (len(dims) - 1)) / len(dims)

    for j, d in enumerate(dims):
        cxx = col_x0 + j * (cw + cgap)
        add_text(slide, cxx + 0.14, my, cw - 0.20, 0.28, d["name"],
                 anchor=MSO_ANCHOR.MIDDLE, size=MIN_PT, bold=True, color="ink")

    rh, rgap = 0.44, 0.08
    for i, r in enumerate(rows):
        ry = my + 0.34 + i * (rh + rgap)
        t = TONES[r["tone"]]
        add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, mx, ry, mw, rh,
                  fill=t["band"], radius=0.16)
        _chip(slide, mx + 0.08, ry + 0.06, lab_w, rh - 0.12, r["label"],
              t["solid"], "white", size=MIN_PT, radius=0.5)
        for j, d in enumerate(dims):
            cxx = col_x0 + j * (cw + cgap)
            add_text(slide, cxx + 0.14, ry, cw - 0.24, rh, d["cells"][i],
                     anchor=MSO_ANCHOR.MIDDLE, size=MIN_PT, color="ink")

    teams = content["teams"]
    n = len(teams)
    tx0, ttotal, tgap = 0.42, 12.493, 0.20
    tw = (ttotal - tgap * (n - 1)) / n
    ty0, th = 3.08, 3.98
    tpad = 0.22
    tinner = tw - 2 * tpad

    for i, tm in enumerate(teams):
        cx = tx0 + i * (tw + tgap)
        t = TONES[tm["tone"]]
        add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, cx, ty0, tw, th,
                  fill="white", radius=0.06)
        _chip(slide, cx + tpad, ty0, 1.55, 0.38,
              tm["tier"] + " · " + tm["process"], t["solid"], "white",
              size=MIN_PT, radius=0.5)
        add_text(slide, cx + tpad, ty0 + 0.44, tinner, 0.46, tm["type"],
                 anchor=MSO_ANCHOR.MIDDLE, size=19, bold=True, color="ink")
        add_text(slide, cx + tpad, ty0 + 0.94, tinner, 0.32, tm["profile"],
                 size=10.5, color="slate_light")
        add_text(slide, cx + tpad, ty0 + 1.42, tinner, 0.24, "企业示例",
                 size=MIN_PT, bold=True, color="gray_mid")
        for k, ex in enumerate(tm["examples"][:3]):
            ey = ty0 + 1.72 + k * 0.56
            add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, cx + tpad, ey,
                      tinner, 0.44, fill=t["tint"], radius=0.14)
            add_text(slide, cx + tpad + 0.16, ey, tinner - 0.30, 0.44, ex,
                     anchor=MSO_ANCHOR.MIDDLE, size=10.5, color="ink")
        bal = tm.get("balance")
        if bal:
            add_text(slide, cx + tpad, ty0 + 3.46, tinner, 0.32,
                     [[(bal["label"] + "：", {"color": "gray_mid"}),
                       (bal["value"], {"color": t["dark"]})]],
                     size=11, bold=True)

    draw_footer(slide, content)
    return prs


# --------------------------------------------------------------------------
# Layout E: "swimlane" — a layered governance blueprint (AGENT / FLOW /
# SKILL / COMMAND / OUTPUT lanes over N process columns).
#
# Transcribed from learning-sdd/visuals/workflow-blueprint.html
# --------------------------------------------------------------------------

KIND = {
    "green": TONES["green"],
    "blue": TONES["blue"],
    "dark": TONES["slate"],
}

# lane key, label, top, height
LANES = [
    ("agent", "AGENT", 1.20, 0.54),
    ("flow", "FLOW", 1.83, 2.06),
    ("skill", "SKILL", 3.98, 0.78),
    ("command", "COMMAND", 4.85, 0.78),
    ("output", "OUTPUT", 5.72, 1.30),
]

GUTTER = 1.06
BODY_X = 1.62
BODY_W = (0.42 + 12.493) - BODY_X


def _dash_rect(slide, x, y, w, h, fill, line, line_w=1.5, radius=0.10):
    sp = add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, x, y, w, h,
                   fill=fill, line=line, line_w=line_w, radius=radius)
    try:
        sp.line.dash_style = MSO_LINE_DASH_STYLE.DASH
    except Exception:
        pass
    return sp


def _stack(slide, x, y, w, h, lines, size, color, line_spacing=1.15,
           align=PP_ALIGN.CENTER, bold=False):
    add_text(slide, x, y, w, h, "\n".join(lines), align=align,
             anchor=MSO_ANCHOR.MIDDLE, size=size, color=color, bold=bold,
             line_spacing=line_spacing)


def draw_swimlane(content):
    prs = Presentation()
    prs.slide_width = Inches(SLIDE_W)
    prs.slide_height = Inches(SLIDE_H)
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    bg = slide.background.fill
    bg.solid()
    bg.fore_color.rgb = hx("bg")

    tone = TONES.get(content.get("tone", "blue"), TONES["blue"])

    # --- header -----------------------------------------------------------
    add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, 0.42, 0.28, 0.74, 0.74,
              fill=tone["solid"], radius=0.18)
    add_text(slide, 0.42, 0.28, 0.74, 0.74, str(content["index"]),
             align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, size=24,
             bold=True, color="white")
    add_text(slide, 1.32, 0.28, 8.10, 0.44, content["title"],
             anchor=MSO_ANCHOR.MIDDLE, size=24, bold=True, color="ink")
    add_text(slide, 1.32, 0.76, 8.10, 0.28, content["subtitle"],
             size=MIN_PT, color="slate_light")

    tag = content.get("tag")
    if tag:
        solid = bool(content.get("tag_solid"))
        add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, 9.60, 0.42, 3.313, 0.42,
                  fill=tone["solid"] if solid else "gray_soft", radius=0.5)
        add_text(slide, 9.60, 0.42, 3.313, 0.42, tag, align=PP_ALIGN.CENTER,
                 anchor=MSO_ANCHOR.MIDDLE, size=MIN_PT, bold=True,
                 color="white" if solid else "slate_light")

    cols = content["columns"]
    n = len(cols)
    cgap = 0.10
    cw = (BODY_W - cgap * (n - 1)) / n

    def colx(i):
        return BODY_X + i * (cw + cgap)

    # --- lane gutter ------------------------------------------------------
    add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, BODY_X - 0.10, 1.20, 0.016,
              5.82, fill="border", radius=0.5)
    for _key, label, ly, lh in LANES:
        add_text(slide, 0.42, ly, GUTTER - 0.18, lh, label,
                 align=PP_ALIGN.RIGHT, anchor=MSO_ANCHOR.MIDDLE, size=MIN_PT,
                 bold=True, color="gray_mid")

    # --- AGENT lane -------------------------------------------------------
    ay, ah = LANES[0][2], LANES[0][3]
    for ag in content.get("agents", []):
        t = KIND.get(ag["color"], KIND["blue"])
        solid = bool(ag.get("solid"))
        ax0 = colx(ag["from"])
        ax1 = colx(ag["to"]) + cw
        add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, ax0, ay, ax1 - ax0, ah,
                  fill=t["solid"] if solid else t["tint"], radius=0.16)
        add_text(slide, ax0 + 0.08, ay, ax1 - ax0 - 0.16, ah, ag["label"],
                 align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE,
                 size=MIN_PT, bold=True,
                 color="white" if solid else t["dark"], line_spacing=1.1)

    # --- FLOW lane --------------------------------------------------------
    fy = LANES[1][2]
    CARD_H, BLOCK_H = 0.90, 1.40
    for i, c in enumerate(cols):
        cx = colx(i)
        f = c["flow"]
        t = KIND.get(f.get("kind", "blue"), KIND["blue"])
        if f.get("block"):
            _dash_rect(slide, cx, fy, cw, BLOCK_H, t["band"], t["solid"],
                       line_w=1.5, radius=0.12)
            add_text(slide, cx + 0.06, fy + 0.03, cw - 0.12, 0.34, f["stage"],
                     align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE,
                     size=MIN_PT, bold=True, color=t["dark"],
                     line_spacing=1.05)
            pills = f["subpills"]
            m = len(pills)
            py0, py1 = fy + 0.42, fy + BLOCK_H - 0.08
            pgap = 0.04
            ph = (py1 - py0 - pgap * (m - 1)) / m
            for j, lines in enumerate(pills):
                py = py0 + j * (ph + pgap)
                add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, cx + 0.08, py,
                          cw - 0.16, ph, fill="white", line=t["solid"],
                          line_w=1.0, radius=0.22)
                add_text(slide, cx + 0.10, py, cw - 0.20, ph, lines[0],
                         align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE,
                         size=MIN_PT, bold=True, color=t["dark"])
                if len(lines) > 1:
                    add_text(slide, cx + 0.10, py + ph - 0.20, cw - 0.20, 0.18,
                             lines[1], align=PP_ALIGN.CENTER,
                             anchor=MSO_ANCHOR.MIDDLE, size=MIN_PT,
                             color="gray_mid")
        else:
            solid = (f.get("kind") == "dark")
            add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, cx, fy, cw, CARD_H,
                      fill=t["solid"] if solid else "white", line=t["solid"],
                      line_w=1.5, radius=0.12)
            add_text(slide, cx + 0.06, fy + 0.20, cw - 0.12, 0.32, f["title"],
                     align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE,
                     size=11.5, bold=True,
                     color="white" if solid else t["dark"], line_spacing=1.05)
            add_text(slide, cx + 0.06, fy + 0.54, cw - 0.12, 0.28, f["sub"],
                     align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE,
                     size=MIN_PT, color="DFF0E2" if solid else "gray_mid",
                     line_spacing=1.05)

    # --- feedback loops ---------------------------------------------------
    for k, lp in enumerate(content.get("loops", [])):
        t = KIND.get(lp.get("color", "blue"), KIND["blue"])
        lx0 = colx(lp["to"])
        lx1 = colx(lp["from"]) + cw
        ly = 3.46 + k * 0.32
        add_text(slide, lx0 + 0.10, ly - 0.22, lx1 - lx0 - 0.20, 0.20,
                 lp["label"], align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.MIDDLE,
                 size=MIN_PT, bold=True, color=t["dark"])
        sp = add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, lx0 + 0.16, ly,
                       lx1 - lx0 - 0.32, 0.022, fill=t["solid"], radius=0.5)
        try:
            sp.line.color.rgb = hx(t["solid"])
            sp.line.width = Pt(1.0)
            sp.line.dash_style = MSO_LINE_DASH_STYLE.DASH
        except Exception:
            pass
        tri = add_shape(slide, MSO_SHAPE.ISOSCELES_TRIANGLE, lx0, ly - 0.09,
                        0.20, 0.20, fill=t["solid"])
        tri.rotation = 270

    # --- SKILL / COMMAND lanes -------------------------------------------
    for key, lane in (("skill", "skills"), ("command", "cmds")):
        ly = dict((k, (t, h)) for k, _l, t, h in LANES)[key][0]
        lh = dict((k, (t, h)) for k, _l, t, h in LANES)[key][1]
        for i, c in enumerate(cols):
            cx = colx(i)
            items = c.get(lane) or []
            if not items:
                continue
            col = "slate_light" if key == "skill" else "ink"
            bold = (key == "command")
            _stack(slide, cx + 0.04, ly, cw - 0.08, lh, items, MIN_PT, col,
                   line_spacing=1.15, bold=bold)

    # --- OUTPUT lane ------------------------------------------------------
    oy, oh = LANES[4][2], LANES[4][3]
    for i, c in enumerate(cols):
        cx = colx(i)
        d = c["deliv"]
        dark = bool(d.get("dark"))
        add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, cx, oy, cw, oh,
                  fill="slate" if dark else "white",
                  line="slate" if dark else "border", line_w=1.5, radius=0.12)
        add_text(slide, cx + 0.08, oy + 0.08, cw - 0.16, 0.38, d["title"],
                 align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, size=11,
                 bold=True, color="white" if dark else "ink", line_spacing=1.05)
        add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, cx + 0.10, oy + 0.50,
                  cw - 0.20, 0.014,
                  fill="334155" if dark else "border", radius=0.5)
        _stack(slide, cx + 0.08, oy + 0.58, cw - 0.16, oh - 0.68,
               d.get("desc", []), MIN_PT,
               "cbd5e1" if dark else "slate_light", line_spacing=1.25)

    draw_footer(slide, content)
    return prs


# --------------------------------------------------------------------------
# Layout F: "capability-gap" — for each capability, visualise the gap between
# "how fast you learn it" and "how long it takes to actually land".
# --------------------------------------------------------------------------


def draw_capability_gap(content):
    prs = Presentation()
    prs.slide_width = Inches(SLIDE_W)
    prs.slide_height = Inches(SLIDE_H)
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    bg = slide.background.fill
    bg.solid()
    bg.fore_color.rgb = hx("bg")

    # --- header -----------------------------------------------------------
    add_text(slide, 0.42, 0.28, 12.49, 0.60,
             [[(content["title_lead"], {"color": "ink"}),
               (content["title_accent"], {"color": "blue"})]],
             size=28, bold=True)
    add_text(slide, 0.42, 0.94, 12.49, 0.30, content["subtitle"],
             size=11, color="slate_light")

    # --- capability cards -------------------------------------------------
    cards = content["cards"]
    n = len(cards)
    x0, total, gap = 0.42, 12.493, 0.24
    cw = (total - gap * (n - 1)) / n
    y0, ch = 1.32, 5.02
    pad = 0.28
    inner = cw - 2 * pad

    TRACK_W = 3.10
    LAB_W = 1.00
    BAR_X = 1.12
    VAL_X = 4.38

    for i, c in enumerate(cards):
        cx = x0 + i * (cw + gap)
        t = TONES[c["tone"]]
        add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, cx, y0, cw, ch,
                  fill="white", radius=0.05)

        _chip(slide, cx + pad, y0, 0.74, 0.46, c["no"], t["solid"], "white",
              size=15, radius=0.24)
        add_text(slide, cx + pad + 0.90, y0, inner - 0.90, 0.46, c["name"],
                 anchor=MSO_ANCHOR.MIDDLE, size=22, bold=True, color="ink")

        add_text(slide, cx + pad, y0 + 0.72, inner, 0.54, c["question"],
                 size=11.5, color="ink", line_spacing=1.3)

        # learn vs land bars — the whole point of the page
        for k, key in enumerate(("learn", "land")):
            d = c[key]
            by = y0 + 1.58 + k * 0.52
            add_text(slide, cx + pad, by, LAB_W, 0.40, d["label"],
                     anchor=MSO_ANCHOR.MIDDLE, size=10.5, bold=True,
                     color="slate_light")
            add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, cx + pad + BAR_X,
                      by + 0.09, TRACK_W, 0.22, fill="gray_soft", radius=0.5)
            add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, cx + pad + BAR_X,
                      by + 0.09, max(0.24, TRACK_W * float(d["ratio"])), 0.22,
                      fill=t["solid"], radius=0.5)
            add_text(slide, cx + pad + VAL_X, by, inner - VAL_X, 0.40,
                     d["value"], align=PP_ALIGN.RIGHT,
                     anchor=MSO_ANCHOR.MIDDLE, size=11, bold=True,
                     color=t["dark"])

        add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, cx + pad, y0 + 2.72,
                  inner, 0.014, fill="border", radius=0.5)

        _chip(slide, cx + pad, y0 + 2.90, 0.74, 0.28,
              content.get("difficulty_label", "难点"), "gray_soft", "slate",
              size=MIN_PT, radius=0.5)
        add_text(slide, cx + pad + 0.90, y0 + 2.88, inner - 0.90, 0.66,
                 c["difficulty"], anchor=MSO_ANCHOR.MIDDLE, size=11,
                 color="ink")

        add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, cx + pad, y0 + 3.76,
                  inner, 1.10, fill=t["tint"], radius=0.10)
        _chip(slide, cx + pad + 0.16, y0 + 3.86, 0.74, 0.28,
              content.get("solution_label", "办法"), t["solid"], "white",
              size=MIN_PT, radius=0.5)
        add_text(slide, cx + pad + 0.16, y0 + 4.20, inner - 0.32, 0.60,
                 c["solution"], size=11.5, color="ink", line_spacing=1.3)

    # --- closing thesis ---------------------------------------------------
    th = content.get("thesis")
    if th:
        ty, thh = 6.48, 0.50
        add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, 0.42, ty, 12.493, thh,
                  fill="blue", radius=0.12)
        add_text(slide, 0.42, ty, 12.493, thh, th, align=PP_ALIGN.CENTER,
                 anchor=MSO_ANCHOR.MIDDLE, size=13, bold=True, color="white")

    draw_footer(slide, content)
    return prs


# --------------------------------------------------------------------------
# Layout G: "diagram-embed" — intro + a placeholder for an external diagram
# + a progression strip. Use when the hero visual is supplied separately.
# --------------------------------------------------------------------------


def _image_glyph(slide, cx, cy, w, h, color):
    """Classic 'picture' placeholder mark: frame + mountain + sun."""
    add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, cx - w / 2, cy - h / 2, w, h,
              fill=None, line=color, line_w=1.75, radius=0.12)
    add_shape(slide, MSO_SHAPE.ISOSCELES_TRIANGLE, cx - w * 0.30,
              cy + h * 0.06, w * 0.44, h * 0.32, fill=color)
    add_shape(slide, MSO_SHAPE.OVAL, cx + w * 0.14, cy - h * 0.30,
              h * 0.26, h * 0.26, fill=color)


def draw_diagram_embed(content):
    prs = Presentation()
    prs.slide_width = Inches(SLIDE_W)
    prs.slide_height = Inches(SLIDE_H)
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    bg = slide.background.fill
    bg.solid()
    bg.fore_color.rgb = hx("bg")

    # --- header -----------------------------------------------------------
    add_text(slide, 0.42, 0.28, 12.49, 0.60,
             [[(content["title_lead"], {"color": "ink"}),
               (content["title_accent"], {"color": "blue"})]],
             size=28, bold=True)

    # --- intro: context + the question it lands on ------------------------
    intro = content["intro"]
    ix, iy, iw, ih = 0.42, 1.00, 12.493, 1.00
    add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, ix, iy, iw, ih,
              fill="white", radius=0.075)
    _chip(slide, ix + 0.20, iy + 0.14, 0.78, 0.28, intro["context_label"],
          "gray_soft", "slate", size=MIN_PT, radius=0.5)
    add_text(slide, ix + 1.12, iy + 0.12, iw - 1.34, 0.32,
             intro["context"], anchor=MSO_ANCHOR.MIDDLE, size=11,
             color="slate_light")
    _chip(slide, ix + 0.20, iy + 0.52, 0.78, 0.30, intro["question_label"],
          "blue", "white", size=MIN_PT, radius=0.5)
    add_text(slide, ix + 1.12, iy + 0.50, iw - 1.34, 0.34,
             intro["question"], anchor=MSO_ANCHOR.MIDDLE, size=13.5,
             bold=True, color="blue")

    # --- diagram placeholder ---------------------------------------------
    ph = content["placeholder"]
    px, py, pw, phh = 0.42, 2.16, 12.493, 2.10
    sp = add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, px, py, pw, phh,
                   fill="FAFBF8", line="gray_mid", line_w=1.5, radius=0.06)
    try:
        sp.line.dash_style = MSO_LINE_DASH_STYLE.DASH
    except Exception:
        pass
    _image_glyph(slide, px + pw / 2, py + 0.68, 0.92, 0.66, "gray_mid")
    add_text(slide, px, py + 1.14, pw, 0.36, ph["hint"],
             align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, size=13,
             bold=True, color="slate_light")
    if ph.get("note"):
        add_text(slide, px, py + 1.54, pw, 0.30, ph["note"],
                 align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE,
                 size=MIN_PT, color="gray_mid")

    # --- progression strip ------------------------------------------------
    prog = content["progression"]
    add_text(slide, 0.42, 4.50, 12.49, 0.32, prog["label"],
             anchor=MSO_ANCHOR.MIDDLE, size=11, bold=True, color="slate")

    nodes = prog["nodes"]
    n = len(nodes)
    node_w, arrow_w = 3.40, 0.66
    total = n * node_w + (n - 1) * 1.15
    nx0 = 0.42 + (12.493 - total) / 2

    for i, nd in enumerate(nodes):
        cx = nx0 + i * (node_w + 1.15)
        t = TONES[nd["tone"]]
        _chip(slide, cx + (node_w - 2.10) / 2, 4.96, 2.10, 0.50,
              nd["tier"], t["solid"], "white", size=11, radius=0.5)
        add_text(slide, cx, 5.60, node_w, 0.70, nd["team"],
                 align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, size=20,
                 bold=True, color="ink")
        if i < n - 1:
            add_shape(slide, MSO_SHAPE.RIGHT_ARROW,
                      cx + node_w + (1.15 - arrow_w) / 2, 5.02, arrow_w, 0.38,
                      fill=TONES[nodes[i + 1]["tone"]]["solid"])

    # axis: the whole point is "it gets heavier as you go right"
    ax_y = 6.80
    add_text(slide, 0.42, 6.46, 6.0, 0.28, prog["axis_left"],
             anchor=MSO_ANCHOR.MIDDLE, size=MIN_PT, bold=True,
             color="slate_light")
    add_text(slide, 6.91, 6.46, 6.0, 0.28, prog["axis_right"],
             align=PP_ALIGN.RIGHT, anchor=MSO_ANCHOR.MIDDLE, size=MIN_PT,
             bold=True, color="slate_light")
    add_gradient_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, 0.42, ax_y, 12.493,
                       0.12, "4CAF50", "3F4A52", radius=0.5)

    draw_footer(slide, content)
    return prs


# --------------------------------------------------------------------------
# Checks
# --------------------------------------------------------------------------


def check_bounds(path):
    prs = Presentation(path)
    sw, sh = prs.slide_width, prs.slide_height
    issues = []
    for si, slide in enumerate(prs.slides, 1):
        for shp in slide.shapes:
            l, t = shp.left or 0, shp.top or 0
            r, b = l + (shp.width or 0), t + (shp.height or 0)
            if l < 0 or t < 0 or r > sw or b > sh:
                issues.append(
                    f"slide{si}: '{getattr(shp, 'name', '?')}' out of bounds "
                    f"({l/914400:.2f},{t/914400:.2f})-({r/914400:.2f},{b/914400:.2f})")
    return issues


def check_fonts(path, min_pt=MIN_PT):
    """Report any run that renders below the design system's font floor."""
    prs = Presentation(path)
    issues = []
    for si, slide in enumerate(prs.slides, 1):
        for shp in slide.shapes:
            if not shp.has_text_frame:
                continue
            for p in shp.text_frame.paragraphs:
                for r in p.runs:
                    if r.font.size is not None and r.font.size.pt < min_pt - 0.01:
                        issues.append(
                            f"slide{si}: {r.font.size.pt:.1f}pt < {min_pt}pt "
                            f"-> {r.text[:20]!r}")
    return issues


# --------------------------------------------------------------------------
# Entry point
# --------------------------------------------------------------------------


LAYOUTS = {
    "pipeline-boards": build_pipeline_boards,
    "pain-cards": draw_pain_cards,
    "breakthrough": draw_breakthrough,
    "team-fit": draw_team_fit,
    "swimlane": draw_swimlane,
    "capability-gap": draw_capability_gap,
    "diagram-embed": draw_diagram_embed,
}


def build(content: dict, out_path: str) -> str:
    layout = content.get("layout", "pipeline-boards")
    if layout not in LAYOUTS:
        raise SystemExit(f"unknown layout '{layout}'; expected {list(LAYOUTS)}")
    prs = LAYOUTS[layout](content)
    prs.save(out_path)
    return out_path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--content", help="JSON content file (optional)")
    ap.add_argument("--palette", help="JSON palette overrides (optional)")
    ap.add_argument("--out", default="slide.pptx")
    ap.add_argument("--check", action="store_true",
                    help="report geometry + font-floor issues")
    ap.add_argument("--min-pt", type=float, default=MIN_PT)
    args = ap.parse_args()

    content = DEFAULT_CONTENT
    if args.content:
        with open(args.content, encoding="utf-8") as fh:
            content = json.load(fh)
    if args.palette:
        with open(args.palette, encoding="utf-8") as fh:
            data = json.load(fh)
        PALETTE.update(data.get("tokens", data))

    build(content, args.out)
    print("wrote", os.path.abspath(args.out))

    if args.check:
        issues = check_bounds(args.out) + check_fonts(args.out, args.min_pt)
        if issues:
            print("issues:")
            for it in issues:
                print("  -", it)
        else:
            print(f"checks OK (inside 16:9 canvas; every run >= {args.min_pt:g}pt)")


if __name__ == "__main__":
    main()
