/**
 * Host half of the @local/dsh-openspec-pm-board bundle.
 *
 * It contributes exactly three things, all sharing one read-only collector:
 *
 * 1. `POST /openspec-pm-board/api` — same-origin read-only route for the PM workbench
 *    panel (ops: ping / snapshot / refresh). Contract: see `API.md`.
 * 2. The `pm_board` tool — lets a session (and the plugin author during verification)
 *    read the same snapshot: phase progress, active Epic funnel, PM action queue,
 *    story readiness, knowledge-asset drift and data-health warnings.
 * 3. Nothing else. No writes to the repository: the collector runs a plugin-local
 *    Python scanner that only reads files; `--out` is never passed.
 *
 * Deliberate constraints (same as the other local plugins on this machine):
 * - No `@deepseek-ai/*` imports: only Node builtins, so a profile version skew cannot
 *   break the Host half.
 * - The scan runs as a child process (`python3`) and its stdout is the single data
 *   source; Node does not re-implement the aggregation semantics.
 * - A failing/absent `webServer` service only disables the route (the tool still works),
 *   and vice versa: optional injections keep the plugin alive in partial profiles.
 */
import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const PLUGIN_DIR = path.dirname(fileURLToPath(import.meta.url))
const SCANNER_REL = path.join('scripts', 'pm_board_scan.py')

const API_PATH = '/openspec-pm-board/api'
const API_HEADER = 'x-dsh-openspec-pm-board'
const API_VERSION = 1
const PLUGIN_VERSION = '0.1.0'

const MAX_BODY_BYTES = 64 * 1024
const MAX_BUFFER_BYTES = 8 * 1024 * 1024
const DEFAULT_REPO_ROOT = '/Users/superkkk/MyCoding/OpenSpec-practice'
const DEFAULT_CACHE_TTL_MS = 15_000
const DEFAULT_SCAN_TIMEOUT_MS = 15_000
const DEFAULT_ARCHIVE_DAYS = 30
const PYTHON_PROBE_TIMEOUT_MS = 5_000

const PYTHON_CANDIDATES = [
  '/usr/bin/python3',
  '/opt/homebrew/bin/python3',
  '/usr/local/bin/python3',
  'python3',
]

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

/** Build the effective options from the bundle patch `config`. */
export function pluginOptions(config) {
  const raw = config && typeof config === 'object' ? config : {}
  const repoRoot = path.resolve(String(raw.repoRoot ?? '').trim() || DEFAULT_REPO_ROOT)
  const scannerPath = path.resolve(
    typeof raw.scannerPath === 'string' && raw.scannerPath.trim().length > 0
      ? raw.scannerPath
      : path.join(PLUGIN_DIR, SCANNER_REL),
  )
  const cacheTtlMs = Number.isFinite(Number(raw.cacheTtlMs)) && Number(raw.cacheTtlMs) >= 0
    ? Number(raw.cacheTtlMs)
    : DEFAULT_CACHE_TTL_MS
  const timeoutMs = Number.isFinite(Number(raw.timeoutMs)) && Number(raw.timeoutMs) > 0
    ? Number(raw.timeoutMs)
    : DEFAULT_SCAN_TIMEOUT_MS
  const archiveDays = Number.isFinite(Number(raw.archiveDays)) && Number(raw.archiveDays) >= 0
    ? Math.floor(Number(raw.archiveDays))
    : DEFAULT_ARCHIVE_DAYS
  const pythonCandidates = Array.isArray(raw.pythonCandidates) && raw.pythonCandidates.length > 0
    ? raw.pythonCandidates.map(String)
    : PYTHON_CANDIDATES
  return { repoRoot, scannerPath, cacheTtlMs, timeoutMs, archiveDays, pythonCandidates }
}

/** Return the last non-empty line of stdout, or throw when it is not a JSON object. */
export function lastJsonLine(stdout) {
  const lines = String(stdout ?? '').split('\n').map((line) => line.trim()).filter(Boolean)
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index]
    if (!line.startsWith('{')) continue
    try {
      const value = JSON.parse(line)
      if (value && typeof value === 'object') return value
    } catch {
      /* keep looking upward */
    }
  }
  throw new Error('扫描器没有输出合法 JSON（stdout 最后一行无法解析）')
}

/** Read the request body with a hard size limit. */
export async function readRequestBody(req, maxBytes = MAX_BODY_BYTES) {
  const chunks = []
  let total = 0
  for await (const chunk of req) {
    total += chunk.length
    if (total > maxBytes) {
      const error = new Error('请求体过大')
      error.code = 'body-too-large'
      throw error
    }
    chunks.push(chunk)
  }
  return Buffer.concat(chunks).toString('utf8')
}

function errorText(error) {
  if (!error) return '未知错误'
  if (error.code === 'python-missing') return '本机没有可用的 python3，无法生成 PM 看板数据'
  if (error.code === 'scan-timeout' || error.killed === true) return '看板数据扫描超时（请稍后重试）'
  if (error.code === 'scanner-missing') return `扫描器不存在：${error.scannerPath ?? ''}`
  if (error.code === 'repo-missing') return `仓库路径不可达：${error.repoRoot ?? ''}`
  return error.message ?? String(error)
}

function errorDetail(error) {
  if (!error || typeof error !== 'object') return undefined
  const detail = {
    code: error.code ?? null,
    timedOut: error.code === 'scan-timeout' || error.killed === true,
  }
  if (typeof error.stderrTail === 'string' && error.stderrTail.length > 0) {
    detail.stderrTail = error.stderrTail.slice(-2000)
  }
  return detail
}

function textBlock(text) {
  return { type: 'text', text: String(text ?? '') }
}

function countText(value) {
  return Number.isFinite(Number(value)) ? String(Number(value)) : '0'
}

/* ------------------------------------------------------------------ */
/* Collector: python3 + plugin-local scanner                           */
/* ------------------------------------------------------------------ */

export function createBoardService(options) {
  const opts = pluginOptions(options)
  let snapshotCache = null // { snapshot, at, durationMs }
  let inflight = null
  let pythonCache = null // { ok, path, version } | { ok: false }

  async function resolvePython() {
    if (pythonCache !== null) return pythonCache
    for (const candidate of opts.pythonCandidates) {
      try {
        const { stdout } = await execFileAsync(candidate, ['-c', 'import sys; print("%d.%d" % (sys.version_info[0], sys.version_info[1]))'], {
          timeout: PYTHON_PROBE_TIMEOUT_MS,
          windowsHide: true,
        })
        pythonCache = { ok: true, path: candidate, version: String(stdout ?? '').trim() }
        return pythonCache
      } catch {
        /* try the next candidate */
      }
    }
    // Do not cache a failure forever: the next call re-probes (python may be installed later).
    return { ok: false, path: null, version: null }
  }

  function scannerExists() {
    try {
      return existsSync(opts.scannerPath)
    } catch {
      return false
    }
  }

  function repoExists() {
    try {
      return existsSync(opts.repoRoot)
    } catch {
      return false
    }
  }

  async function ping() {
    const python = await resolvePython()
    return {
      version: PLUGIN_VERSION,
      api: API_VERSION,
      panelId: 'openspec-pm-board',
      repoRoot: opts.repoRoot,
      repoExists: repoExists(),
      python: { ok: python.ok, path: python.path, version: python.version },
      scanner: { ok: scannerExists(), path: opts.scannerPath },
    }
  }

  async function runScanner() {
    const python = await resolvePython()
    if (!python.ok) {
      const error = new Error('本机没有可用的 python3')
      error.code = 'python-missing'
      throw error
    }
    if (!repoExists()) {
      const error = new Error('仓库路径不可达')
      error.code = 'repo-missing'
      error.repoRoot = opts.repoRoot
      throw error
    }
    if (!scannerExists()) {
      const error = new Error('扫描器不存在')
      error.code = 'scanner-missing'
      error.scannerPath = opts.scannerPath
      throw error
    }
    const startedAt = Date.now()
    let stdout
    try {
      const result = await execFileAsync(
        python.path,
        [opts.scannerPath, '--root', opts.repoRoot, '--json', '--days', String(opts.archiveDays)],
        {
          cwd: opts.repoRoot,
          timeout: opts.timeoutMs,
          maxBuffer: MAX_BUFFER_BYTES,
          windowsHide: true,
          env: { ...process.env, NO_COLOR: '1', PYTHONIOENCODING: 'utf-8' },
        },
      )
      stdout = result.stdout
    } catch (error) {
      const wrapped = new Error(error?.message ?? '扫描器执行失败')
      wrapped.code = error?.killed === true || error?.signal ? 'scan-timeout' : error?.code ?? null
      wrapped.killed = error?.killed === true
      wrapped.stderrTail = typeof error?.stderr === 'string' ? error.stderr : ''
      throw wrapped
    }
    const snapshot = lastJsonLine(stdout)
    if (!snapshot || snapshot.schemaVersion === undefined) {
      throw new Error('扫描器输出缺少 schemaVersion')
    }
    const durationMs = Date.now() - startedAt
    snapshotCache = { snapshot, at: Date.now(), durationMs }
    return { snapshot, meta: { cacheHit: false, ageMs: 0, durationMs } }
  }

  async function snapshot(force = false) {
    if (snapshotCache !== null) {
      const ageMs = Date.now() - snapshotCache.at
      if (!force && ageMs < opts.cacheTtlMs) {
        return { snapshot: snapshotCache.snapshot, meta: { cacheHit: true, ageMs, durationMs: snapshotCache.durationMs } }
      }
    }
    if (inflight !== null) return inflight
    inflight = runScanner().finally(() => {
      inflight = null
    })
    return inflight
  }

  return { options: opts, ping, snapshot, resolvePython, scannerExists }
}

/* ------------------------------------------------------------------ */
/* HTTP route                                                          */
/* ------------------------------------------------------------------ */

export function createApiHandler(service) {
  return async function openspecPmBoardApi(req, res) {
    const send = (status, payload) => {
      const body = JSON.stringify(payload)
      res.writeHead(status, {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'content-length': Buffer.byteLength(body),
      })
      res.end(body)
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }
    if (req.method !== 'POST') {
      send(405, { ok: false, error: '只接受 POST 请求' })
      return
    }
    if (String(req.headers[API_HEADER] ?? '') !== '1') {
      send(403, { ok: false, error: '缺少同源标记头' })
      return
    }

    let raw
    try {
      raw = await readRequestBody(req)
    } catch (error) {
      send(error?.code === 'body-too-large' ? 413 : 400, { ok: false, error: errorText(error) })
      return
    }
    let body
    try {
      body = raw.trim().length === 0 ? {} : JSON.parse(raw)
    } catch {
      send(400, { ok: false, error: '请求体不是合法 JSON' })
      return
    }

    const op = String(body?.op ?? '').trim()
    try {
      if (op === 'ping') {
        send(200, { ok: true, data: await service.ping() })
        return
      }
      if (op === 'snapshot' || op === 'refresh') {
        const force = op === 'refresh' || body?.force === true
        send(200, { ok: true, data: await service.snapshot(force) })
        return
      }
      send(200, { ok: false, error: `未知 op "${op}"` })
    } catch (error) {
      send(200, { ok: false, error: errorText(error), detail: errorDetail(error) })
    }
  }
}

/* ------------------------------------------------------------------ */
/* Tool (same collector, for sessions / verification)                  */
/* ------------------------------------------------------------------ */

/** Human-readable board digest for the `pm_board` tool. */
export function renderBoardDigest(snapshot) {
  const safe = snapshot && typeof snapshot === 'object' ? snapshot : {}
  const summary = safe.summary ?? {}
  const counts = summary.counts ?? {}
  const currentPhase = summary.currentPhase ?? {}
  const progress = summary.phaseProgress ?? {}
  const lines = []
  lines.push(`# PM 工作台 · 项目进展`)
  lines.push('')
  lines.push(`- 当前阶段：${currentPhase.no ? `Phase ${currentPhase.no} ${currentPhase.name ?? ''}` : '未知'}`)
  lines.push(`- 阶段进度：${countText(progress.done)}/${countText(progress.total)} 完成`)
  lines.push(`- 数据生成：${safe.generatedAt ?? '—'}（扫描器 ${safe.generator?.mode ?? 'full'}${safe.repo?.dirty ? '，工作区有未提交改动' : ''}）`)
  lines.push('')
  lines.push(`## 我的行动（PM）`)
  lines.push(`- 待我确认：${countText(counts.waitingConfirm)} · PM 待启动：${countText(counts.pmTodo)} · 阻塞/告警：${countText(counts.blocked)}`)
  lines.push(`- 待复核知识资产：${countText(summary.assets?.driftCandidates)} 个漂移候选 · 需关注资产 ${countText(summary.assets?.stale)} 个`)
  lines.push('')
  const epics = Array.isArray(safe.epics) ? safe.epics : []
  const lifecycleText = (epic) => {
    const lifecycle = epic && epic.lifecycle
    if (typeof lifecycle === 'string') return lifecycle
    if (lifecycle && typeof lifecycle === 'object') {
      if (lifecycle.archived === true) return 'archived'
      if (lifecycle.allDone === true) return 'all-done'
      if (lifecycle.allHandoff === true) return 'all-handoff'
      if (lifecycle.active === true) return 'active'
    }
    return 'active'
  }
  const isArchivedEpic = (epic) => {
    if (lifecycleText(epic) === 'archived') return true
    return Boolean(epic && epic.lifecycle && epic.lifecycle.archived === true)
  }
  const activeEpics = epics.filter((epic) => !isArchivedEpic(epic))
  const archivedEpics = epics.length - activeEpics.length
  if (epics.length === 0) {
    lines.push('## Epic 漏斗')
    lines.push('- 当前没有活跃 Epic（规划层待启动）')
  } else {
    lines.push('## Epic 漏斗')
    if (activeEpics.length === 0) lines.push('- 当前没有活跃 Epic（全部已归档）')
    for (const epic of activeEpics.slice(0, 5)) {
      const stages = Array.isArray(epic.stages) ? epic.stages : []
      const stageText = stages
        .map((stage) => `${stage.title ?? stage.key}:${stage.status ?? '?'}`)
        .join(' · ')
      lines.push(`- \`${epic.key ?? '—'}\`（${lifecycleText(epic)}）`)
      if (stageText.length > 0) lines.push(`  ${stageText}`)
    }
    if (archivedEpics > 0) {
      lines.push(`- 另有 ${archivedEpics} 个已归档 Epic（已在看板中折叠）`)
    }
  }
  const boards = safe.boards && typeof safe.boards === 'object' ? safe.boards : {}
  const actionable = []
  for (const key of ['pmTodo', 'waitingConfirm', 'blocked']) {
    const board = boards[key]
    if (!board || !Array.isArray(board.items)) continue
    for (const item of board.items.slice(0, 6)) {
      actionable.push(`- [${board.title ?? key}] ${item.title ?? item.id ?? ''}${item.subtitle ? ` — ${item.subtitle}` : ''}`)
    }
  }
  if (actionable.length > 0) {
    lines.push('')
    lines.push('## 优先行动')
    lines.push(...actionable)
  }
  const warnings = Array.isArray(safe.warnings) ? safe.warnings : []
  if (warnings.length > 0) {
    lines.push('')
    lines.push('## 数据健康')
    for (const warning of warnings.slice(0, 6)) {
      lines.push(`- ${warning.severity ?? 'info'} · ${warning.message ?? warning.code ?? ''}`)
    }
  }
  const assets = Array.isArray(safe.assets) ? safe.assets : []
  if (assets.length > 0) {
    lines.push('')
    lines.push('## 业务知识资产')
    for (const asset of assets.slice(0, 6)) {
      const drift = Array.isArray(asset.driftCandidates) ? asset.driftCandidates.length : 0
      lines.push(`- ${asset.title ?? asset.assetId ?? '—'}：${asset.updatedAt ?? '未知'}（${countText(asset.ageDays)} 天，${asset.freshness ?? 'unknown'}）${drift > 0 ? ` · ${drift} 个漂移候选` : ''}`)
    }
  }
  return lines.join('\n')
}

function createBoardTool(service) {
  return {
    name: 'pm_board',
    description: [
      'PM 工作台数据（只读）：读取 OpenSpec-practice 的真实项目进展，汇总阶段进度、活跃 Epic 的需求漏斗、PM 待确认/待启动/阻塞项、Story spec 就绪度、业务知识资产漂移与数据健康告警。',
      'action:',
      '- ping：自检（版本、repoRoot、python 是否可用）。',
      '- snapshot：读取当前看板快照摘要（PM 视角，含下一步行动）。',
      '只读：不会修改仓库任何文件。',
    ].join('\n'),
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        action: {
          type: 'string',
          enum: ['ping', 'snapshot'],
          description: '要读取的内容：ping=自检，snapshot=看板快照摘要。',
        },
        debug: {
          type: 'boolean',
          description: '仅调试用：snapshot 时在结构化返回值里附带完整快照（默认只返回摘要，避免上下文膨胀）。',
        },
      },
      required: ['action'],
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: true,
        properties: {
          ok: { type: 'boolean' },
          action: { type: 'string' },
          error: { type: 'string' },
          text: { type: 'string' },
        },
      },
      render(_args, value) {
        try {
          if (!value || value.ok === false) return [textBlock(`pm_board 失败：${value?.error ?? '未知错误'}`)]
          return [textBlock(value.text ?? JSON.stringify(value, null, 2))]
        } catch (error) {
          return [textBlock(`pm_board 结果无法渲染：${error?.message ?? error}`)]
        }
      },
    },
    timeoutMs: 30_000,
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      if (exec?.signal?.aborted === true) throw new Error('已取消')
      const action = String(args?.action ?? 'snapshot').trim()
      if (action === 'ping') {
        const data = await service.ping()
        const text = [
          '# PM 工作台自检',
          `- 版本：${data.version}（API ${data.api}）`,
          `- 仓库：${data.repoRoot}`,
          `- python3：${data.python.ok ? `可用（${data.python.path} ${data.python.version ?? ''}）` : '不可用'}`,
          `- 扫描器：${data.scanner.ok ? data.scanner.path : '缺失'}`,
        ].join('\n')
        return { ok: true, action, text, data }
      }
      if (action === 'snapshot') {
        const { snapshot, meta } = await service.snapshot(false)
        const value = { ok: true, action, text: renderBoardDigest(snapshot), meta }
        // The digest is the model-facing payload; the raw snapshot is ~150 KiB and only
        // useful for debugging, so it is opt-in.
        if (args?.debug === true) value.snapshot = snapshot
        return value
      }
      return { ok: false, action, error: `未知 action "${action}"` }
    },
  }
}

/* ------------------------------------------------------------------ */
/* Plugin entry                                                        */
/* ------------------------------------------------------------------ */

export function apply(ctx, config) {
  const service = createBoardService(config)
  const options = service.options

  // Read-only same-origin route for the panel. `webServer` is optional: without it the
  // route is simply absent and the panel falls back to its launcher mode.
  ctx.inject(['webServer'], (webCtx) => {
    webCtx.effect(
      () => webCtx.webServer.register({ kind: 'exact', path: API_PATH, handler: createApiHandler(service) }),
      'openspec-pm-board: HTTP API',
    )
  })

  // The same collector as a model-facing tool: lets the PM agent read the board in a
  // session and gives the plugin a Post-install self-check surface.
  ctx.inject(['tools'], (toolCtx) => {
    toolCtx.effect(() => toolCtx.tools.register(createBoardTool(service)), 'openspec-pm-board: tool')
  })

  // Expose a tiny diagnostic through the plugin logger only when the environment asks
  // for it (keeps normal startup quiet).
  if (process.env.DSH_PM_BOARD_DEBUG === '1') {
    console.log('[openspec-pm-board] host ready', { repoRoot: options.repoRoot, scanner: options.scannerPath })
  }
}

export const __testing = {
  API_PATH,
  API_HEADER,
  pluginOptions,
  lastJsonLine,
  readRequestBody,
  createBoardService,
  createApiHandler,
  createBoardTool,
  renderBoardDigest,
}
