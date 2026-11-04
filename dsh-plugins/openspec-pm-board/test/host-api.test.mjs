/**
 * Unit tests for the Host half of @local/dsh-openspec-pm-board.
 *
 * These tests do NOT need the DSH runtime: the Host half is plain Node ESM and the
 * scanner is a child process. They exercise the real route handler, the collector,
 * the cache/in-flight behaviour, protocol errors and the `pm_board` tool digest.
 *
 * Run: node test/host-api.test.mjs
 */
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { Readable } from 'node:stream'

import { __testing } from '../index.js'

const {
  lastJsonLine,
  pluginOptions,
  readRequestBody,
  createBoardService,
  createApiHandler,
  createBoardTool,
  renderBoardDigest,
  API_HEADER,
} = __testing

let passed = 0
let failed = 0
const failures = []

async function test(name, fn) {
  try {
    await fn()
    passed += 1
    process.stdout.write(`  ok  ${name}\n`)
  } catch (error) {
    failed += 1
    failures.push({ name, error })
    process.stdout.write(`FAIL  ${name}\n      ${error?.message ?? error}\n`)
  }
}

function makeReq({ method = 'POST', headers = {}, body = '' } = {}) {
  const req = Readable.from(body.length > 0 ? [Buffer.from(body, 'utf8')] : [])
  req.method = method
  req.headers = headers
  return req
}

function makePostBody(op, extra = {}) {
  return JSON.stringify({ op, ...extra })
}

function makeRes() {
  return {
    statusCode: 0,
    headers: {},
    body: '',
    writeHead(code, headers) {
      this.statusCode = code
      this.headers = headers ?? {}
      return this
    },
    end(chunk) {
      this.body = chunk === undefined ? '' : String(chunk)
      return this
    },
  }
}

async function call(handler, { method = 'POST', headers = {}, body = '' } = {}) {
  const req = makeReq({ method, headers, body })
  const res = makeRes()
  await handler(req, res)
  let json = null
  try {
    json = JSON.parse(res.body)
  } catch {
    json = null
  }
  return { status: res.statusCode, headers: res.headers, body: res.body, json }
}

function header() {
  return { [API_HEADER]: '1', 'content-type': 'application/json' }
}

function makeStubScanner(dir, { mode = 'ok' } = {}) {
  const file = path.join(dir, `stub-${mode}-${Math.random().toString(36).slice(2)}.py`)
  let code
  if (mode === 'ok') {
    code = [
      'import json',
      'print(json.dumps({"schemaVersion": 1, "generatedAt": "2026-11-04T10:00:00+08:00",',
      '  "generator": {"name": "stub", "version": "0", "mode": "full"},',
      '  "repo": {"root": "STUB"}, "boards": {}, "summary": {}, "epics": [], "assets": [],',
      '  "warnings": [], "phases": [], "stories": []}, ensure_ascii=False))',
    ].join('\n')
  } else if (mode === 'noise') {
    code = [
      'import json',
      'print("scanner summary line")',
      'print(json.dumps({"schemaVersion": 1, "generatedAt": "2026-11-04T10:00:00+08:00",',
      '  "generator": {"name": "stub", "version": "0", "mode": "full"},',
      '  "repo": {"root": "STUB"}, "boards": {}, "summary": {}, "epics": [], "assets": [],',
      '  "warnings": [], "phases": [], "stories": []}, ensure_ascii=False))',
    ].join('\n')
  } else if (mode === 'broken') {
    code = 'import sys\nsys.stderr.write("boom from stub scanner")\nsys.exit(2)\n'
  } else if (mode === 'garbage') {
    code = 'print("not json at all")\n'
  } else {
    throw new Error(`unknown stub mode: ${mode}`)
  }
  writeFileSync(file, code, 'utf8')
  return file
}

const workRoot = mkdtempSync(path.join(tmpdir(), 'pm-board-test-'))
const repoRoot = path.join(workRoot, 'repo')
mkdirSync(repoRoot, { recursive: true })

async function main() {
  process.stdout.write('pm_board host API tests\n')

  /* --------------------------------------------------------------- */
  /* helpers                                                          */
  /* --------------------------------------------------------------- */
  await test('lastJsonLine picks the last JSON object among noise', () => {
    const parsed = lastJsonLine('summary\n{"a":1}\n{"b":2}\ntrailing')
    assert.equal(parsed.b, 2)
    assert.throws(() => lastJsonLine('no json here'), /没有输出合法 JSON/)
    assert.throws(() => lastJsonLine(''), /没有输出合法 JSON/)
  })

  await test('pluginOptions resolves defaults and overrides', () => {
    const defaults = pluginOptions({})
    assert.match(defaults.repoRoot, /OpenSpec-practice/)
    assert.ok(defaults.scannerPath.endsWith(path.join('scripts', 'pm_board_scan.py')))
    const custom = pluginOptions({ repoRoot: '/tmp/x', cacheTtlMs: 0, timeoutMs: 1000, scannerPath: '/tmp/s.py' })
    assert.equal(custom.repoRoot, '/tmp/x')
    assert.equal(custom.cacheTtlMs, 0)
    assert.equal(custom.timeoutMs, 1000)
    assert.equal(custom.scannerPath, '/tmp/s.py')
  })

  await test('readRequestBody enforces the size ceiling', async () => {
    const okBody = await readRequestBody(Readable.from([Buffer.from('{"a":1}')]), 64)
    assert.equal(okBody, '{"a":1}')
    await assert.rejects(
      readRequestBody(Readable.from([Buffer.from('x'.repeat(200))]), 64),
      (error) => error.code === 'body-too-large',
    )
  })

  /* --------------------------------------------------------------- */
  /* protocol-level behaviour                                         */
  /* --------------------------------------------------------------- */
  const okScanner = makeStubScanner(workRoot, { mode: 'ok' })
  const goodService = createBoardService({
    repoRoot,
    scannerPath: okScanner,
    cacheTtlMs: 60_000,
    timeoutMs: 10_000,
  })
  const handler = createApiHandler(goodService)

  await test('OPTIONS -> 204 with empty body and no CORS header', async () => {
    const result = await call(handler, { method: 'OPTIONS' })
    assert.equal(result.status, 204)
    assert.equal(result.body, '')
    assert.equal(result.headers['access-control-allow-origin'], undefined)
  })

  await test('GET -> 405', async () => {
    const result = await call(handler, { method: 'GET' })
    assert.equal(result.status, 405)
    assert.equal(result.json.ok, false)
  })

  await test('missing same-origin header -> 403', async () => {
    const result = await call(handler, { body: makePostBody('ping') })
    assert.equal(result.status, 403)
    assert.match(result.json.error, /同源标记头/)
  })

  await test('invalid JSON body -> 400', async () => {
    const result = await call(handler, { headers: header(), body: '{not json' })
    assert.equal(result.status, 400)
    assert.equal(result.json.ok, false)
  })

  await test('oversized body -> 413', async () => {
    const result = await call(handler, { headers: header(), body: JSON.stringify({ op: 'ping', pad: 'x'.repeat(80 * 1024) }) })
    assert.equal(result.status, 413)
    assert.match(result.json.error, /请求体过大/)
  })

  await test('ping returns version/python/scanner facts', async () => {
    const result = await call(handler, { headers: header(), body: makePostBody('ping') })
    assert.equal(result.status, 200)
    assert.equal(result.json.ok, true)
    assert.equal(result.json.data.version, '0.1.0')
    assert.equal(result.json.data.api, 1)
    assert.equal(result.json.data.python.ok, true)
    assert.equal(result.json.data.scanner.ok, true)
    assert.equal(result.json.data.repoRoot, repoRoot)
  })

  await test('snapshot returns the scanner JSON and reports cache misses/hits', async () => {
    const first = await call(handler, { headers: header(), body: makePostBody('snapshot') })
    assert.equal(first.status, 200)
    assert.equal(first.json.ok, true)
    assert.equal(first.json.data.snapshot.schemaVersion, 1)
    assert.equal(first.json.data.meta.cacheHit, false)
    const second = await call(handler, { headers: header(), body: makePostBody('snapshot') })
    assert.equal(second.json.data.meta.cacheHit, true)
    assert.deepEqual(second.json.data.snapshot, first.json.data.snapshot)
  })

  await test('refresh bypasses the cache', async () => {
    const result = await call(handler, { headers: header(), body: makePostBody('refresh') })
    assert.equal(result.json.ok, true)
    assert.equal(result.json.data.meta.cacheHit, false)
  })

  await test('unknown op -> 200 {ok:false}', async () => {
    const result = await call(handler, { headers: header(), body: makePostBody('nope') })
    assert.equal(result.status, 200)
    assert.equal(result.json.ok, false)
    assert.match(result.json.error, /未知 op/)
  })

  await test('scanner stdout noise is tolerated (last JSON line wins)', async () => {
    const noiseScanner = makeStubScanner(workRoot, { mode: 'noise' })
    const service = createBoardService({ repoRoot, scannerPath: noiseScanner, cacheTtlMs: 0, timeoutMs: 10_000 })
    const result = await call(createApiHandler(service), { headers: header(), body: makePostBody('snapshot') })
    assert.equal(result.json.ok, true)
    assert.equal(result.json.data.snapshot.schemaVersion, 1)
  })

  await test('scanner failure -> 200 {ok:false} with stderr detail', async () => {
    const brokenScanner = makeStubScanner(workRoot, { mode: 'broken' })
    const service = createBoardService({ repoRoot, scannerPath: brokenScanner, cacheTtlMs: 0, timeoutMs: 10_000 })
    const result = await call(createApiHandler(service), { headers: header(), body: makePostBody('snapshot') })
    assert.equal(result.status, 200)
    assert.equal(result.json.ok, false)
    assert.ok(result.json.detail.stderrTail.includes('boom from stub scanner'))
  })

  await test('garbage scanner output -> {ok:false}', async () => {
    const garbageScanner = makeStubScanner(workRoot, { mode: 'garbage' })
    const service = createBoardService({ repoRoot, scannerPath: garbageScanner, cacheTtlMs: 0, timeoutMs: 10_000 })
    const result = await call(createApiHandler(service), { headers: header(), body: makePostBody('snapshot') })
    assert.equal(result.json.ok, false)
    assert.match(result.json.error, /JSON/)
  })

  await test('missing scanner -> ping reports absence, snapshot fails', async () => {
    const service = createBoardService({ repoRoot, scannerPath: path.join(workRoot, 'nope.py'), cacheTtlMs: 0 })
    const ping = await call(createApiHandler(service), { headers: header(), body: makePostBody('ping') })
    assert.equal(ping.json.data.scanner.ok, false)
    const snapshot = await call(createApiHandler(service), { headers: header(), body: makePostBody('snapshot') })
    assert.equal(snapshot.json.ok, false)
    assert.match(snapshot.json.error, /扫描器不存在/)
  })

  await test('no usable python -> ping reports it, snapshot fails with python-missing', async () => {
    const service = createBoardService({ repoRoot, scannerPath: okScanner, pythonCandidates: ['/definitely/not/a/python'] })
    const ping = await call(createApiHandler(service), { headers: header(), body: makePostBody('ping') })
    assert.equal(ping.json.data.python.ok, false)
    const snapshot = await call(createApiHandler(service), { headers: header(), body: makePostBody('snapshot') })
    assert.equal(snapshot.json.ok, false)
    assert.match(snapshot.json.error, /python3/)
  })

  /* --------------------------------------------------------------- */
  /* tool + digest                                                    */
  /* --------------------------------------------------------------- */
  await test('tool execute(snapshot) returns a PM digest', async () => {
    const tool = createBoardTool(goodService)
    assert.equal(tool.name, 'pm_board')
    const ping = await tool.execute({ action: 'ping' }, { signal: { aborted: false } })
    assert.equal(ping.ok, true)
    assert.match(ping.text, /PM 工作台自检/)
    const snapshot = await tool.execute({ action: 'snapshot' }, { signal: { aborted: false } })
    assert.equal(snapshot.ok, true)
    assert.match(snapshot.text, /# PM 工作台 · 项目进展/)
    // The raw snapshot is ~150 KiB and opt-in: the default tool payload stays small.
    assert.equal(snapshot.snapshot, undefined)
    assert.ok(JSON.stringify(snapshot).length < 20_000, 'default tool payload should stay small')
    const debug = await tool.execute({ action: 'snapshot', debug: true }, { signal: { aborted: false } })
    assert.equal(debug.snapshot.schemaVersion, 1)
  })

  await test('renderBoardDigest tolerates a full snapshot shape', () => {
    const digest = renderBoardDigest({
      generatedAt: '2026-11-04T10:00:00+08:00',
      generator: { name: 'pm-board-scanner', version: '0.1.0', mode: 'full' },
      repo: { root: repoRoot, dirty: false },
      summary: {
        counts: { pmTodo: 1, waitingConfirm: 0, blocked: 2 },
        currentPhase: { no: 9, name: '会员与复购' },
        phaseProgress: { done: 7, total: 9 },
        assets: { driftCandidates: 4, stale: 3 },
      },
      epics: [{ key: 'epic-x', lifecycle: 'active', stages: [{ key: 'research', title: 'research', status: 'done' }] }],
      boards: {
        pmTodo: { title: 'PM 待启动', items: [{ title: 'explore', subtitle: '产出 idea.md' }] },
      },
      warnings: [{ severity: 'warning', message: 'STATUS 与 ROADMAP 矛盾' }],
      assets: [{ assetId: 'business_process', title: '业务流程', updatedAt: '2026-09-08', ageDays: 57, freshness: 'aging', driftCandidates: [{ code: 'D2' }] }],
    })
    assert.match(digest, /Phase 9 会员与复购/)
    assert.match(digest, /7\/9 完成/)
    assert.match(digest, /epic-x/)
    assert.match(digest, /PM 待启动/)
    assert.match(digest, /STATUS 与 ROADMAP 矛盾/)
    assert.match(digest, /业务流程/)
  })

  /* --------------------------------------------------------------- */
  /* cleanup                                                          */
  /* --------------------------------------------------------------- */
  try {
    rmSync(workRoot, { recursive: true, force: true })
  } catch {
    /* best effort */
  }

  process.stdout.write(`\n${passed} passed, ${failed} failed\n`)
  if (failed > 0) {
    for (const failure of failures) {
      process.stdout.write(`\n--- ${failure.name} ---\n${failure.error?.stack ?? failure.error}\n`)
    }
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
