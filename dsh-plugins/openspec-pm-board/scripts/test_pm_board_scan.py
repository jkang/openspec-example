#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""`pm_board_scan.py` 金标准测试（golden case = 仓库 2026-11-04 的真实快照）。

定位
----
验证 PM 工作台扫描器的**契约与今日结构性事实**：

  1. 输出契约：单行 JSON、schemaVersion / generator / repo / sourceHealth / summary /
     boards / phases / epics / stories / assets / governance / archives / warnings 齐全；
  2. 今日规划层：Phase 9「会员与复购」为当前阶段，7/9 完成（Phase 1–7 done / 8 future / 9 current）；
  3. 今日 Epic 漏斗：活跃 Epic = `epic-miniprogram-membership-points`，research 已确认，
     explore 为 PM 待启动且 nextAction 是可直接开 PM 会话的 session 动作；
  4. 今日 Story：ROADMAP Phase 9 draft Story ×3 未拆分（story.md / test-design.md MUST 缺失）；
  5. 今日归档：45 项（38 个 change 目录 + 7 个 story-list），近 7 天 0 条；
  6. 今日业务知识资产：3 份 baseline HTML + design-system + PRODUCT + ROADMAP = 6 项，
     至少 3 个 D1–D4 漂移候选；design-system / PRODUCT stale；
  7. 数据卫生 warnings ≥ 3；看板计数与 summary.counts 严格一致、无空 statusBecause。

运行方式（两种均可，纯标准库）：
  python3 -m unittest scripts/test_pm_board_scan.py
  python3 scripts/test_pm_board_scan.py

说明：断言对「可增长的数字」使用 >=，对「今日结构事实」严格等值；扫描器输出除
`generatedAt` / `sourceHealth[].parsedAt` / git 状态外应当是确定性的（另有专测）。
"""

import json
import shutil
import subprocess
import sys
import tempfile
import time
import unittest
from pathlib import Path

HERE = Path(__file__).resolve()
SCANNER = HERE.parent / "pm_board_scan.py"

TOP_LEVEL_KEYS = [
    "schemaVersion", "generatedAt", "generator", "repo", "sourceHealth", "summary",
    "boards", "phases", "epics", "stories", "assets", "governance", "archives", "warnings",
]
BOARD_KEYS = [
    "pmTodo", "aiInProgress", "waitingConfirm", "confirmed", "handoffDone",
    "devInProgress", "done", "na", "blocked", "unknown",
]
DRIFT_D1_D4 = {
    "capability-status-stale",        # D1 蓝图 capability 状态过期
    "process-baseline-missing-branch",  # D2 流程基线漏应收支流
    "capability-count-mismatch",      # D3 capability 口径差 1
    "roadmap-count-stale",            # D4 ROADMAP 归档计数过期
}
ACTIVE_EPIC_KEY = "epic-miniprogram-membership-points"


def _find_repo_root():
    """从本测试文件位置向上找仓库根（含 docs/ROADMAP.md + openspec-requirements/）。"""
    for candidate in [HERE.parent] + list(HERE.parents):
        if (candidate / "docs" / "ROADMAP.md").is_file() and (candidate / "openspec-requirements").is_dir():
            return candidate
    raise RuntimeError("无法从 %s 向上找到 OpenSpec 仓库根（缺少 docs/ROADMAP.md）" % HERE)


REPO_ROOT = _find_repo_root()


def _run_scanner():
    """以子进程运行扫描器（Host 的真实调用方式：--root <repoRoot> --json）。"""
    started = time.monotonic()
    proc = subprocess.run(
        [sys.executable, str(SCANNER), "--root", str(REPO_ROOT), "--json"],
        cwd=str(REPO_ROOT),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=120,
    )
    duration_ms = (time.monotonic() - started) * 1000.0
    stdout = proc.stdout.decode("utf-8", "replace")
    stderr = proc.stderr.decode("utf-8", "replace")
    lines = [line for line in stdout.splitlines() if line.strip()]
    if proc.returncode != 0:
        raise AssertionError("扫描器退出码 %d（应为 0）；stderr:\n%s" % (proc.returncode, stderr[-2000:]))
    if not lines:
        raise AssertionError("扫描器 stdout 为空；stderr:\n%s" % stderr[-2000:])
    try:
        snapshot = json.loads(lines[-1])
    except ValueError as exc:
        raise AssertionError("扫描器 stdout 最后一行不是合法 JSON：%s\n行首 200 字符: %r"
                             % (exc, lines[-1][:200]))
    return snapshot, duration_ms, lines, stderr


def _find_stage(epic, stage_key):
    return next((stage for stage in epic.get("stages", []) if stage.get("key") == stage_key), None)


class PmBoardSnapshotTest(unittest.TestCase):
    """对今日快照（golden case）的结构性断言。"""

    @classmethod
    def setUpClass(cls):
        cls.snapshot, cls.duration_ms, cls.json_lines, cls.stderr = _run_scanner()
        cls.epics = cls.snapshot.get("epics", [])
        cls.active_epics = [epic for epic in cls.epics
                            if epic.get("lifecycle", {}).get("active")
                            and not epic.get("lifecycle", {}).get("archived")]
        cls.stage_map = {}
        for epic in cls.epics:
            for stage in epic.get("stages", []):
                cls.stage_map[(epic["key"], stage["key"])] = stage

    # ── 输出契约 ──────────────────────────────────────────────

    def test_top_level_contract(self):
        snapshot = self.snapshot
        for key in TOP_LEVEL_KEYS:
            self.assertIn(key, snapshot, "缺少顶层字段：%s" % key)
        self.assertEqual(snapshot["schemaVersion"], 1)
        generator = snapshot["generator"]
        self.assertEqual(generator["name"], "pm-board-scanner")
        self.assertRegex(generator["version"], r"^\d+\.\d+\.\d+$")
        self.assertIn(generator["mode"], ("full", "degraded"))
        self.assertRegex(snapshot["generatedAt"],
                         r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$")
        self.assertTrue(snapshot["generatedAt"].endswith("+08:00"),
                        "generatedAt 应为 +08:00 本地时区：%s" % snapshot["generatedAt"])
        # stdout 只有一行 JSON（Host 取最后一行），stderr 不应有报错
        self.assertEqual(len(self.json_lines), 1, "stdout 应只有一行 JSON，实际 %d 行" % len(self.json_lines))
        self.assertEqual(self.stderr.strip(), "", "扫描器 stderr 应为空：%s" % self.stderr[-500:])
        self.assertLess(self.duration_ms, 5000, "扫描耗时 %.0fms 超过 5s 目标" % self.duration_ms)

    def test_repo_metadata(self):
        repo = self.snapshot["repo"]
        self.assertTrue(repo["root"].rstrip("/").endswith("OpenSpec-practice"),
                        "repo.root 应指向 OpenSpec-practice：%s" % repo["root"])
        self.assertIsInstance(repo["dirty"], bool)
        # git 为可选源：有 git 时字段应为字符串 / 日期，缺失时允许 null
        if repo.get("gitCommit") is not None:
            self.assertRegex(repo["gitCommit"], r"^[0-9a-f]{4,40}$")
        if repo.get("gitCommitDate") is not None:
            self.assertRegex(repo["gitCommitDate"], r"^\d{4}-\d{2}-\d{2}$")

    def test_no_internal_keys_leak(self):
        raw = json.dumps(self.snapshot, ensure_ascii=False)
        self.assertNotIn('"__', raw, "快照中泄漏了内部字段（__ 前缀）")

    # ── 规划层 ────────────────────────────────────────────────

    def test_phase_and_progress(self):
        summary = self.snapshot["summary"]
        current = summary["currentPhase"]
        self.assertEqual(current["no"], 9, "今日当前阶段应为 Phase 9：%r" % (current,))
        self.assertIn("会员", current["name"])
        self.assertEqual(current["status"], "current")
        progress = summary["phaseProgress"]
        self.assertEqual(progress["done"], 7, "Phase 1–7 应已完成")
        self.assertEqual(progress["total"], 9, "ROADMAP 应有 9 个阶段")
        self.assertEqual(progress["percent"], 78)
        phases = {phase["no"]: phase for phase in self.snapshot["phases"]}
        self.assertEqual(len(phases), 9)
        for no in range(1, 8):
            self.assertEqual(phases[no]["status"], "done", "Phase %d 应为 done" % no)
        self.assertEqual(phases[8]["status"], "future")
        self.assertEqual(phases[9]["status"], "current")
        # 本层修正旧脚本缺陷：Phase 8 的「代表性 Epic」应被解析为规划 Epic
        planned_keys = {item["key"] for item in phases[8]["plannedEpics"]}
        self.assertIn("epic-operation-tools", planned_keys,
                      "Phase 8 plannedEpics 应包含 epic-operation-tools（旧脚本正则漏解析）")
        # Phase 9 的 draft Story 拆分行应被解析
        self.assertEqual(len(phases[9]["draftStories"]), 3)
        self.assertEqual(len(phases[9]["exitCriteria"]), 6)
        self.assertGreaterEqual(len(phases[9]["inScope"]), 1)

    # ── Epic 漏斗 ─────────────────────────────────────────────

    def test_active_epic_and_stages(self):
        self.assertGreaterEqual(len(self.active_epics), 1, "应至少有 1 个活跃（未归档）Epic")
        active_keys = {epic["key"] for epic in self.active_epics}
        self.assertIn(ACTIVE_EPIC_KEY, active_keys)
        epic = next(epic for epic in self.active_epics if epic["key"] == ACTIVE_EPIC_KEY)
        self.assertEqual(len(epic["stages"]), 7, "Epic 漏斗应固定 7 个阶段")
        self.assertEqual(epic["phaseNo"], 9)
        research = _find_stage(epic, "research")
        self.assertIsNotNone(research)
        self.assertIn(research["status"], ("done", "confirmed"),
                      "research 已完成并经 HITL 确认，状态应为 done/confirmed：%r" % research["status"])
        self.assertTrue(research["hitl"]["visible"])
        self.assertTrue(research["hitl"]["confirmed"])
        explore = _find_stage(epic, "explore")
        self.assertIsNotNone(explore)
        self.assertEqual(explore["status"], "pmTodo", "explore 应为 PM 待启动")
        self.assertIsNotNone(explore.get("nextAction"), "explore 必须带 nextAction")
        action = explore["nextAction"]
        self.assertEqual(action["kind"], "session", "explore 的 nextAction 必须是 session（可开 PM 会话）")
        self.assertEqual(action.get("agentPreset"), "sdd-pm")
        self.assertTrue(action.get("enabled"))
        prompt = action.get("prompt") or ""
        self.assertGreater(len(prompt), 100)
        for expected in ("/req:explore", "STATUS.md", "research.md", "HITL", "idea.md"):
            self.assertIn(expected, prompt, "explore prompt 应包含 %r" % expected)
        for question in ("Q3", "Q5", "Q9", "Q12", "Q13", "Q4-附"):
            self.assertIn(question, prompt, "explore prompt 应点名待定项 %s" % question)
        self.assertIn("10 个待定项", prompt)
        # 阶段状态必须有 statusBecause（规则 id + 证据摘要）
        for stage in epic["stages"]:
            self.assertTrue(stage.get("statusBecause"), "阶段 %s 缺少 statusBecause" % stage["key"])
            self.assertIn(stage["statusConfidence"], ("high", "medium", "low"))
            self.assertIn("hitl", stage)
            self.assertIn("visible", stage["hitl"])
            self.assertIn("waived", stage["hitl"])

    def test_history_epics_are_exempt(self):
        """历史 Epic：归档即豁免 v6 MUST（不得因缺 test-design 标阻塞）。"""
        archived = [epic for epic in self.epics if epic.get("lifecycle", {}).get("archived")]
        self.assertGreaterEqual(len(archived), 6, "应能看到 6 个已归档历史 Epic")
        for epic in archived:
            self.assertNotEqual(epic["status"], "blocked", "归档 Epic 不应被标阻塞：%s" % epic["key"])
            test_design = _find_stage(epic, "test-design")
            self.assertIsNotNone(test_design)
            self.assertIn(test_design["status"], ("na", "done"),
                          "归档 Epic 的 test-design 应为 na（历史豁免）或 done：%s" % epic["key"])
            self.assertEqual(epic["storyStats"].get("missingMust"), 0)
        # 本层修正旧脚本缺陷：`🔄 部分 done` 不得判为 done
        stock = next((epic for epic in archived if epic["key"] == "epic-stock-insight"), None)
        if stock is not None:
            stories_stage = _find_stage(stock, "stories")
            self.assertNotEqual(stories_stage["status"], "done",
                                "`🔄 部分 done` 不能被当作 done（旧扫描器缺陷）")
            self.assertIn("R03", stories_stage["ruleIds"])

    # ── Story 追踪 ────────────────────────────────────────────

    def test_roadmap_draft_stories(self):
        drafts = [story for story in self.snapshot["stories"]
                  if story.get("source") == "roadmap-draft"]
        if len(drafts) < 3:
            # 兼容另一种呈现：draft 出现在 phases[].draftStories
            drafts = [draft for phase in self.snapshot["phases"]
                      for draft in phase.get("draftStories", [])]
        self.assertGreaterEqual(len(drafts), 3, "ROADMAP draft Story 应至少 3 条可见")
        story_records = [story for story in self.snapshot["stories"]
                         if story.get("source") == "roadmap-draft"]
        if story_records:
            by_id = {story["id"]: story for story in story_records}
            self.assertIn("story-points-account-earning", by_id)
            self.assertIn("story-points-admin-rules-ledger", by_id)
            for story in story_records:
                self.assertEqual(story["epicKey"], ACTIVE_EPIC_KEY)
                self.assertIn(story["priority"], ("P0", "P1", "P2"))
                self.assertFalse(story["readiness"]["ready"])
                self.assertIn("story.md", story["readiness"]["missingMust"])
                self.assertIn("test-design.md", story["readiness"]["missingMust"])
        summary = self.snapshot["summary"]["stories"]
        self.assertGreaterEqual(summary["total"], 3)
        self.assertGreaterEqual(summary["missingMust"], 3)

    # ── 归档 ─────────────────────────────────────────────────

    def test_archives(self):
        archives = self.snapshot["archives"]
        self.assertGreaterEqual(archives["historyCount"], 45,
                                "归档历史应 >= 45 项（38 change 目录 + 7 story-list）")
        self.assertEqual(archives["recentCount"], 0, "今日近 7 天应无新归档")
        self.assertIsNotNone(archives["lastDate"])
        self.assertGreaterEqual(archives["lastDate"], "2026-09-08")
        recent_keys = {"key", "date", "type", "gateResult"}
        for item in archives["recent"]:
            self.assertTrue(recent_keys.issubset(item), "recent[] 项缺字段：%r" % item)
        self.assertGreaterEqual(archives.get("changeDirs", 0), 38)
        story_lists = archives.get("storyLists")
        self.assertTrue(isinstance(story_lists, int) or isinstance(story_lists, list))
        self.assertGreaterEqual(story_lists if isinstance(story_lists, int) else len(story_lists), 7)
        gates = archives.get("gateSummary") or {}
        self.assertEqual(gates.get("failed"), 0, "今天 0 个 verify FAIL（`未执行` ≠ `FAIL`）")
        self.assertGreaterEqual(gates.get("hardGatesAllPass", 0), 20)

    # ── 业务知识资产 ──────────────────────────────────────────

    def test_assets_and_drift(self):
        assets = self.snapshot["assets"]
        baseline = [asset for asset in assets if asset.get("kind") == "baseline-html"]
        self.assertEqual(len(baseline), 3, "3 份 baseline HTML 都应出现")
        for asset in assets:
            self.assertIn(asset["freshness"], ("fresh", "aging", "stale", "unknown"))
            if asset["ageDays"] is not None:
                self.assertGreaterEqual(asset["ageDays"], 0)
            self.assertIn(asset["updatedSource"], ("html-meta", "frontmatter", "mtime", "none"))
            self.assertIsInstance(asset["contentCounts"], dict)
            self.assertIn("reviewStatus", asset)
        codes = {drift["code"] for asset in assets for drift in asset.get("driftCandidates", [])}
        matched = codes & DRIFT_D1_D4
        self.assertGreaterEqual(len(matched), 3,
                                "漂移候选应至少命中 D1–D4 中的 3 个，实际：%r" % sorted(codes))
        for asset in assets:
            for drift in asset.get("driftCandidates", []):
                self.assertIn(drift["severity"], ("high", "medium", "low"))
                self.assertTrue(drift["message"])
                self.assertIsInstance(drift["evidence"], list)
        # 至少 1 份 stale 资产：design-system > 60 天，或 baseline HTML >= 57 天
        stale_design_system = any(
            asset["assetId"] == "design-system" and (asset["ageDays"] or 0) > 60 for asset in assets)
        aging_baseline = any(asset["kind"] == "baseline-html" and (asset["ageDays"] or 0) >= 57
                             for asset in assets)
        self.assertTrue(stale_design_system or aging_baseline,
                        "应至少有一份 stale 资产（design-system > 60 天或 baseline >= 57 天）")
        summary = self.snapshot["summary"]["assets"]
        self.assertEqual(summary["total"], len(assets))
        self.assertEqual(summary["fresh"] + summary["aging"] + summary["stale"] + summary["unknown"],
                         len(assets))
        self.assertGreaterEqual(summary["driftCandidates"], 3)

    def test_archived_epic_lifecycle_and_archive_totals(self):
        for epic in self.epics:
            lifecycle = epic.get("lifecycle") or {}
            if lifecycle.get("archived"):
                self.assertFalse(lifecycle.get("active"),
                                 "归档 Epic 不应同时 active：%r" % (epic.get("key"),))
        archives = self.snapshot["archives"]
        self.assertEqual(archives.get("days"), 7, "扫描器默认 --days 应为 7")
        totals = archives.get("totals") or {}
        self.assertEqual(totals.get("storyLists"), len(archives.get("storyLists") or []),
                         "totals.storyLists 应等于归档块里已归档 story-list 数")
        self.assertEqual(totals.get("storyLists"), archives.get("storyListCount"))
        self.assertGreaterEqual(totals.get("storyLists"), 7)
        self.assertEqual(archives.get("total"),
                         archives.get("changeDirs") + archives.get("storyListCount"),
                         "归档总数 = change 目录 + 已归档 story-list")

    # ── 数据卫生 / 数据源健康 ─────────────────────────────────

    def test_warnings(self):
        warnings = self.snapshot["warnings"]
        self.assertGreaterEqual(len(warnings), 3, "今日数据卫生 warnings 应 >= 3")
        for warning in warnings:
            self.assertTrue(warning.get("code"))
            self.assertIn(warning.get("severity"), ("blocker", "warning", "info"))
            self.assertTrue(warning.get("message"))
            self.assertIsInstance(warning.get("evidence"), list)
        codes = {warning["code"] for warning in warnings}
        self.assertIn("STATUS_ROADMAP_CONFLICT", codes, "应暴露 STATUS↔ROADMAP 矛盾（G11）")
        self.assertIn("ORPHAN_STORY_LIST", codes, "应暴露未归档 story-list（G13）")
        self.assertTrue({"ARCHIVE_COUNT_DRIFT", "LEGACY_IDEA_PATH"} & codes,
                        "应暴露归档计数漂移（G12）或 legacy idea 池（G14）")

    def test_source_health(self):
        entries = self.snapshot["sourceHealth"]
        self.assertGreaterEqual(len(entries), 8, "sourceHealth 应覆盖主要数据源")
        for entry in entries:
            for key in ("id", "path", "ok", "parsedAt", "issues"):
                self.assertIn(key, entry, "sourceHealth 项缺少 %s：%r" % (key, entry.get("id")))
            self.assertIsInstance(entry["ok"], bool)
            self.assertIsInstance(entry["issues"], list)

    # ── 看板一致性（最重要：UI 依赖） ────────────────────────

    def test_boards_contract_and_count_consistency(self):
        snapshot = self.snapshot
        boards = snapshot["boards"]
        self.assertEqual(list(boards.keys()), BOARD_KEYS, "boards 必须包含 10 个固定 key")
        summary_counts = snapshot["summary"]["counts"]
        self.assertEqual(set(summary_counts.keys()), set(BOARD_KEYS),
                         "summary.counts 必须包含 10 个 board key（含 unknown）")
        board_total = 0
        for key, board in boards.items():
            self.assertEqual(board["key"], key)
            self.assertTrue(board["title"])
            self.assertIsInstance(board["order"], int)
            self.assertEqual(board["count"], len(board["items"]),
                             "board %s 的 count 应等于 items 长度" % key)
            for item in board["items"]:
                for field in ("id", "kind", "title", "owner", "status", "statusConfidence",
                              "statusBecause", "evidence"):
                    self.assertIn(field, item, "board item %s 缺少 %s" % (item.get("id"), field))
                self.assertTrue(item["statusBecause"], "board item %s 的 statusBecause 不能为空" % item["id"])
                self.assertTrue(item["evidence"], "board item %s 的 evidence 不能为空" % item["id"])
                self.assertEqual(item["status"], key, "item %s 的状态与所在列不一致" % item["id"])
                self.assertIn(item["statusConfidence"], ("high", "medium", "low"))
                self.assertIn("openPath", item.get("links", {}))
                if "nextAction" in item:
                    action = item["nextAction"]
                    self.assertIn(action.get("kind"), ("session", "command", "info"))
                    self.assertTrue(action.get("label"))
                    self.assertIsInstance(action.get("enabled"), bool)
            board_total += board["count"]
        self.assertEqual(board_total, sum(summary_counts.values()),
                         "所有 board count 之和必须等于 summary.counts 之和")
        self.assertEqual(summary_counts["pmTodo"] + summary_counts["waitingConfirm"],
                         snapshot["summary"]["pmActionCount"])
        self.assertEqual(summary_counts["blocked"], snapshot["summary"]["blockedCount"])

    # ── 确定性（除 generatedAt / parsedAt / git 状态） ────────

    def test_deterministic_except_timestamps(self):
        second, _, _, _ = _run_scanner()

        def normalize(snapshot):
            copy = json.loads(json.dumps(snapshot))
            copy.pop("generatedAt", None)
            copy.pop("repo", None)
            for entry in copy.get("sourceHealth", []):
                entry.pop("parsedAt", None)
            return copy

        self.assertEqual(normalize(self.snapshot), normalize(second),
                         "除 generatedAt / parsedAt / git 状态外，两次扫描输出应完全一致")


class PmBoardDegradedModeTest(unittest.TestCase):
    """降级契约：坏 root → exit 2；单数据源失败 → mode=degraded 但仍 exit 0 + warnings。"""

    @staticmethod
    def _run(root):
        return subprocess.run(
            [sys.executable, str(SCANNER), "--root", str(root), "--json"],
            cwd=str(root), stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=120,
        )

    def test_invalid_root_is_fatal(self):
        with tempfile.TemporaryDirectory() as tmp:
            proc = self._run(Path(tmp))
        self.assertEqual(proc.returncode, 2, "非法 root 必须以 exit 2 失败")
        self.assertEqual(proc.stdout.strip(), b"", "非法 root 不应向 stdout 输出 JSON")
        self.assertIn("错误", proc.stderr.decode("utf-8", "replace"))

    def test_degraded_mode_exits_zero_with_warnings(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "docs").mkdir()
            (root / "openspec-requirements").mkdir()
            (root / "scripts").mkdir()
            (root / "docs" / "ROADMAP.md").write_text(
                "# 假路线图\n\n## 📍 当前阶段 (Current Phase) — Phase 1: 假阶段\n", encoding="utf-8")
            shutil.copy2(REPO_ROOT / "scripts" / "generate_delivery_board.py",
                         root / "scripts" / "generate_delivery_board.py")
            proc = self._run(root)
        stdout = proc.stdout.decode("utf-8", "replace")
        lines = [line for line in stdout.splitlines() if line.strip()]
        self.assertEqual(proc.returncode, 0, "部分数据源失败不得整体失败；stderr: %s"
                         % proc.stderr.decode("utf-8", "replace")[-500:])
        snapshot = json.loads(lines[-1])
        self.assertEqual(snapshot["generator"]["mode"], "degraded")
        self.assertTrue(any(item["code"] == "SOURCE_FAILED" for item in snapshot["warnings"]),
                        "降级模式必须在 warnings[] 留下 SOURCE_FAILED")
        self.assertTrue(any(not entry["ok"] for entry in snapshot["sourceHealth"]),
                        "降级模式必须在 sourceHealth[] 标出失败源")
        self.assertEqual(sum(board["count"] for board in snapshot["boards"].values()),
                         sum(snapshot["summary"]["counts"].values()))


if __name__ == "__main__":
    unittest.main(verbosity=2)
