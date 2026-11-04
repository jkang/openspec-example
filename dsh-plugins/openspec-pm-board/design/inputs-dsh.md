# inputs-dsh.md · PM 工作台（openspec-pm-board）DSH 机制侧输入

> **读者**：Lead（插件骨架与 Host API 设计）、UI 分析师、实现者。
> **范围**：只回答「DSH 0.2.1-rc.5 上，一个带活数据 + 会话感知的侧边栏 PM 面板，其宿主/客户端机制到底是什么」。仓库数据语义见同目录 [`inputs-repo.md`](inputs-repo.md)，UI 版式见 UI 分析师的文档；本文不重复。
> **时点**：2026-11-04 13:41–13:55（Asia/Shanghai）。
> **取证方法**：① 读已安装插件源码（daily-todo / interview-eval / invoice-organizer / openspec-sdd-team / fde-toolkit-panel / agent-roster / blog-writer / grilling-agent / proposal-studio）；② 只读解包 DSH app 归档（aser）读运行时源码；③ `cordis_inspect_query`（Host Service/Config 成功）；④ 只读实跑 `scripts/generate_delivery_board.py` 计时。**未安装、未改 profile、未写任何其它文件。**
> **引用记法**：
> - 仓库内路径直接写 `relative/path:line`（相对 `OpenSpec-practice/`）或绝对路径。
> - DSH 运行时源码在 app 包里，写 `⟨asar⟩/@deepseek-ai/<pkg>/<file>:<line>`，其中
>   `⟨asar⟩ = /Applications/DeepSeek Harness.app/Contents/Resources/app.asar!/dsh/node_modules/`
>   （用 Node 内存解析 asar 头直接读取，不落地、不安装；`lib/*.js` 是发布产物，`.d.ts` 未随包发布）。
> - 推断项一律标 **`[推断]`** 并写清「什么能确认它」。

---

## 0. 结论速览（给 Lead 的 8 条）

1. **同源 HTTP 路由是既有事实标准**：daily-todo / interview-eval / invoice-organizer 三个插件用**逐字相同**的骨架在 Host 侧注册 `POST /<plugin>/api`，客户端 `window.fetch` + 自定义标记头（缺失 403）+ `{ok,data|error}` 信封。我们照抄即可，没有未知机制。
2. **推荐数据路径 = (a) Host 同源路由 + python3 子进程跑生成器 `--json` 模式**。实测 `generate_delivery_board.py` 纯扫描 **33.6ms**、JSON **16,460 字节**、含解释器启动的整进程 **0.12–0.19s**；仓库未变（`git status` 前后一致）。front 只做展示 + 30s 轮询，新鲜度「按下刷新/轮询级」，远优于静态 JSON。
3. **「AI 在做」不需要轮询**：客户端 root 标准 Hook `useSessions` / `useSessionStatus` 已提供**实时**快照（Cordis observable → re-render）。拿到 `sessionId / displayTitle / running / pendingInteraction / completionUnread / updatedAt / cwd / projectionValues.agentPreset`。
4. **按 Agent preset 过滤是可行的**：`agentPreset` 是 wire 投影（`agent-preset-registry:49-58`），客户端行里就是 `row.projectionValues.agentPreset`（`dsh-client-ui-workspace/lib/client.js:1424,1455` 自己就在这么读）。PM 面板可按 `'sdd-pm'`（本 profile 已装）过滤。
5. **一键开新会话可行且语义明确**：`ctx.uiWorkspace.startSession(workspaceId?, {agentPreset, prompt, whenDraftExists})`；**会自动切到 Conversation 面板**（`replaceMain(...,'reveal')` → `layout.selectPanel(null)`）；preset 不存在时**不是静默失败**：Host 返回 `agent-preset/not-found`，Workspace 弹 toast「新建会话失败：…」且选择保持原样。
6. **侧边栏入口 + 主面板是「一对 id」**：`sidebar.panellist`（list，key=`id`）的 `id` 必须等于 `main`（keyed）注册的 `key`，否则点击会抛 `layout.selectPanel: main panel "x" is not registered`。当前已装 bundle 的 panellist 入口静态普查 = 2 个 shipped（`plugins` order 0、`schedules` order 10）+ 9 个本地插件 = **11 个**；建议 PM 入口 id `openspec-pm-board`、order **21**。
7. **repoRoot 用插件 config 最省事**：本机所有 local plugin 都**没有** `export const Config`（Config Inspect 里 daily-todo 的 status 就是 `absent`）；Cordis 在无 Config schema 时把 patch 里的 `config` **原样**传给 `apply(ctx, config)`（`⟨asar⟩/@deepseek-ai/cordis/src/fiber.ts:51-52`）。所以 `config: { repoRoot: "…" }` + `apply(ctx, config)` 即可，**不必**引入 `@deepseek-ai/schemastery`（本地插件解析不到 harness 依赖，`[推断]`，见 §7.3）。
8. **三个前置阻塞（都不大）**：① 生成器要加 `--json`（约 10 行，或在 `scripts/` 新增一个只 import 现有扫描函数的 `pm_board_scan.py`）；② 装插件后 Host 侧改动**必须重启 DSH**一次（patch/README 明写）；③ 本轮 Client Inspect 查询超时（页面未连上），所以「live occupants / live slots」只能用源码普查替代，装好后按 §9.4 复核。

---

## 1. Host 同源 HTTP 路由契约（核心）

### 1.1 服务键与取用方式

- Service key：**`webServer`**，由 `@deepseek-ai/dsh-host-webserver` 提供（profile 组合行 `webserver`，`~/.dsh/profiles/desktop/cordis.yml:460-472`）。
- `cordis_inspect_query({platform:"host", provider:"Service", method:"listService", input:{service:"webServer"}})` 的精确返回：

```text
key: "webServer"
description: "The browser HTTP carrier service. …"
access:
  optional:        { expression: 'ctx.get("webServer")', requiresUndefinedCheck: true }
  hardDependency:  { inject: ["webServer"], expression: "ctx.webServer" }
methods:
  register(route: WebRoute): () => void
  registerUpgrade(route: WebUpgradeRoute): () => void
  registerFallback(handler): () => void
  tapIndex(transform) / collectIndexInjections() / renderIndex(html) / getOrigin(): string
```

- 三个参考插件都写 **`ctx.inject(['webServer'], cb)`**（子 fiber；webServer 不在则不激活），并用 `webCtx.effect(...)` 兜住 disposer（卸载即摘路由）：

```js
// /Users/superkkk/MyCoding/dsh-plugins/daily-todo/index.js:2607-2613
  // 给侧边栏面板用的同源 API；webServer 缺席时该子 fiber 保持不激活。
  ctx.inject(['webServer'], (webCtx) => {
    webCtx.effect(
      () => webCtx.webServer.register({ kind: 'exact', path: API_PATH, handler: createApiHandler() }),
      'daily-todo: HTTP API',
    )
  })
```

同款逐字出现在 `interview-eval/index.js:1519-1525`、`invoice-organizer/index.js:993-999`。

### 1.2 `WebRoute` 的精确形状

- Inspect 投影给出的声明：

```ts
export interface WebRoute {
    kind: WebRouteKind;      // 'exact' | 'prefix'
    path: string;
    handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>;
}
```

- **投影歧义警告**：同一份 referencedTypes 里的 `ServerResponse` 被投影成了另一条 RPC 类型（`{type:'server-response'; rpcId; result}`），**不是** handler 的第二个参数。以运行时源码为准：`@deepseek-ai/dsh-host-webserver` 在 `node:http` 的 `createServer(listener)` 里调用 `await route.handler(req, res)`，`req/res` 就是 Node 原生 `http.IncomingMessage` / `http.ServerResponse`：

```js
// ⟨asar⟩/@deepseek-ai/dsh-host-webserver/lib/index.js:379-395
const handle = async (req, res) => {
    const rawPath = new URL(req.url ?? "/", "http://x").pathname;
    const route = this.match(rawPath);
    if (route !== undefined) { await route.handler(req, res); return; }
    const fallback = this.fallback;
    if (fallback === undefined) { res.writeHead(404); res.end(); return; }
    await fallback(req, res);
};
```

（证据：三个参考 handler 都在用 `res.writeHead / res.end / Buffer.byteLength(body)`，见 §1.3；`daily-todo/client.js` 与 `index.js` 均未 import 任何 http 类型。）

### 1.3 处理函数收到什么 + 方法 / 同源标记 / 错误 JSON 约定

三个插件的 handler 是同一套逐字模板，可直接作为契约（下面引 daily-todo，interview/invoice 只是 op 表与 body 上限不同）：

```js
// /Users/superkkk/MyCoding/dsh-plugins/daily-todo/index.js:2253-2285
function createApiHandler() {
  return async function dailyTodoApi(req, res) {
    const send = (status, payload) => {
      const body = JSON.stringify(payload)
      res.writeHead(status, {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'content-length': Buffer.byteLength(body),
      })
      res.end(body)
    }

    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }
    if (req.method !== 'POST') { send(405, { ok: false, error: '只接受 POST 请求' }); return }
    if (String(req.headers[API_HEADER] ?? '') !== '1') { send(403, { ok: false, error: '缺少同源标记头' }); return }
    …
```

请求体读取（**不要**用 `req.body`，不存在）：

```js
// /Users/superkkk/MyCoding/dsh-plugins/daily-todo/index.js:2242-2251
async function readRequestBody(req, maxBytes) {
  const chunks = []
  let total = 0
  for await (const chunk of req) {
    total += chunk.length
    if (total > maxBytes) throw new Error('请求体过大')
    chunks.push(chunk)
  }
  return Buffer.concat(chunks).toString('utf8')
}
```

错误/成功约定（三插件一致，API.md 文档化）：

| 情形 | HTTP | body |
| --- | --- | --- |
| `OPTIONS` 预检 | 204 | 空，**且不带任何 CORS 放行头**（`interview-eval/index.js:1463-1468` 注释「不返回 CORS 放行头：本路由只接受同源页面请求」） |
| 非 POST | 405 | `{ok:false,error:'只接受 POST 请求'}` |
| 缺标记头 | 403 | `{ok:false,error:'缺少同源标记头'}` |
| 体过大 | 413 | `{ok:false,error:'请求体过大'}` |
| 非 JSON | 400 | `{ok:false,error:'请求体不是合法 JSON'}` |
| 未知 op | 200 | `{ok:false,error:'未知 op "x"'}`（HTTP 200 便于面板统一处理，`API.md:41`） |
| 业务/内部异常 | 200 | `{ok:false,error: toFriendlyError(error)}` / `error.message`（`index.js:2310-2312`、`interview-eval/index.js:1531-1533`） |
| 成功 | 200 | `{ok:true,data:{…}}` |

- 标记头命名：`x-dsh-<plugin-slug>`，值固定 `'1'`。现有三个：`x-dsh-daily-todo`（`index.js:24`）、`x-dsh-interview-eval`（`index.js:28`）、`x-dsh-invoice-organizer`（`index.js:26`）。写进插件 `API.md` 与面板常量，两侧必须一致。
- **同时接受的方法**：请求体上限各插件自定（daily-todo 256KB、invoice-organizer 512KB、interview-eval `MAX_BODY_BYTES`），照抄一个即可。

### 1.4 注册语义（很重要，别踩）

- 重复 `(kind, path)` **抛错**（组合层冲突即配置错误）——`⟨asar⟩/@deepseek-ai/dsh-host-webserver/README.zh.md`「注册路由」段；`register()` 返回 disposer。
- 匹配顺序：先精确、再最长前缀、最后 fallback（无 fallback 时 404）——同上 README + `lib/index.js:379-395`。
- handler 抛错时：响应头未发 → `res.writeHead(400); res.end()` + warning；已发 → `res.destroy()`。**不会**退出进程（README「失败时的行为」；`lib/index.js:396-409`）。所以 handler 内仍要自己 try/catch 成 `{ok:false}`，否则面板拿到的是裸 400。
- **服务端不做方法白名单、不做 CORS、不做鉴权**——这些全部由 handler 自己负责（§1.3）。
- 路由注册发生在 `apply()` 期；Host 组合在启动时生成 → **改 patch / 改 host 代码需重启 DSH**（`/Users/superkkk/MyCoding/dsh-plugins/daily-todo/cordis.patch.yml:8-9`：「新增/修改本文件后需要重启 …；Client 半身改动只需刷新页面」）。

### 1.5 最小可复制骨架（Host）

```js
// dsh-plugins/openspec-pm-board/index.js（骨架，22 行）
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'

const execFileAsync = promisify(execFile)
const API_PATH = '/openspec-pm-board/api'
const API_HEADER = 'x-dsh-openspec-pm-board'

export function apply(ctx, config) {
  const repoRoot = path.resolve(String(config?.repoRoot ?? '').trim() || '/Users/superkkk/MyCoding/OpenSpec-practice')
  ctx.inject(['webServer'], (webCtx) => {
    webCtx.effect(
      () => webCtx.webServer.register({ kind: 'exact', path: API_PATH, handler: createApiHandler(repoRoot) }),
      'openspec-pm-board: HTTP API',
    )
  })
}
```

`createApiHandler(repoRoot)` 内部 = §1.3 的 `send` + 四道门（OPTIONS/POST/标记头/JSON）+ `op` 分派 + 统一 catch，返回 `{ok:true,data}` / `{ok:false,error}`。建议 op 集合（只读）：

| op | 作用 |
| --- | --- |
| `ping` | `{version, api, generator:'python3', repoRoot, py} `→ 面板启动自检 + 版本协商 |
| `board` | 跑 `python3 <repoRoot>/scripts/generate_delivery_board.py --json --days 7` → 返回 `PmBoardSnapshot` JSON（+`generatedAt`、`sourceHealth`、`durationMs`） |
| `refresh` | 同 `board`，语义上强制绕缓存（可选） |

> `board` 的返回体建议直接采用 `inputs-repo.md` §8 的 `PmBoardSnapshot`；Host 只做「跑命令 + 解析 + 包信封」，不在 Node 里重写业务语义。

---

## 2. Client 端取数 + 面板注册

### 2.1 浏览器 bundle 装载契约

- 包声明（daily-todo / sdd-team / invoice 同款）：

```json
"exports": { ".": "./index.js", "./client": "./client.js", "./locale/*.json": "./locale/*.json", "./icon": "./icon.svg" },
"dsh": {
  "bundle": { "patch": "./cordis.patch.yml" },
  "client": { "platform": "web", "immediately": true,
              "inject": ["@deepseek-ai/dsh-client-locale", "@deepseek-ai/dsh-client-ui-sidebar"] }
}
```

（`/Users/superkkk/MyCoding/dsh-plugins/daily-todo/package.json:6-30`）
- 浏览器侧入口是**手写 CJS 工厂**（无构建、无 JSX）：`dsh-client-modules` 的 `window.__ModuleLoader__` queue facade 只注册 factory，首次物化时才执行（`⟨asar⟩/@deepseek-ai/dsh-client-modules/README.zh.md`「浏览器加载什么 / 惰性 CJS 模型」）：

```js
// /Users/superkkk/MyCoding/dsh-plugins/daily-todo/client.js:16-18
window.__ModuleLoader__.load({
  id: '@local/dsh-daily-todo',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
```

- 本地插件**不经过 tsdown 构建**（`files` 里直接带 `client.js`），改 `client.js` 后刷新页面即可；改 Host 半身需重启（见 §1.4）。

### 2.2 `apply` 与 Slot 注册（id/key 成对）

```js
// /Users/superkkk/MyCoding/dsh-plugins/daily-todo/client.js:1489-1517（节选）
function apply(ctx) {
  localeService = ctx.locale;
  workspaceService = ctx.uiWorkspace;
  ctx.effect(function () { return ctx.locale.register(NS, { zh: zh, en: en }); }, 'daily-todo: dictionaries');
  t = ctx.locale.bind(NS);

  ctx.slots.inject('main', function () {
    return ctx.slots.register({ name: 'main', key: PANEL_ID, locale: NS }, Page);
  });
  ctx.slots.inject('sidebar.panellist', function () {
    return ctx.slots.register({
      name: 'sidebar.panellist',
      id: PANEL_ID,            // 必须 === main 的 key
      order: 12,
      label: function () { return t('panelLabel'); },   // thunk：切语言自动重投影
      locale: NS,
    }, PanelIcon);
  });
}
```

- 一律用 `ctx.slots.inject(slotKey, () => ctx.slots.register(...))`，**即使目标 slot 已存在**：它等待声明、声明折叠时摘除、恢复后重注册（`⟨asar⟩/@deepseek-ai/dsh-client-ui-workspace/README.zh.md`「打包客户端插件」段；目录里的 example 也是这么写的）。
- 组件收到的 props = **standard kit**：标准 Hook（`t` 由 `locale` 生成；`renderSlot` 等由 children/store 决定）——`⟨asar⟩/@deepseek-ai/dsh-client-ui-renderer/lib/client.js:737-768`。

### 2.3 取数封装（唯一通信面）

daily-todo 的 `callHost(op, payload, options)` 是三个插件里最完整的一份，建议逐字复制后改路径/头：

```js
// /Users/superkkk/MyCoding/dsh-plugins/daily-todo/client.js:431-487（节选）
async function callHost(op, payload, options) {
  const opts = options || {};
  const timeoutMs = Number(opts.timeoutMs) > 0 ? Number(opts.timeoutMs) : TIMEOUT_STATE_MS;
  const controller = new AbortController();
  let timedOut = false;
  const timer = window.setTimeout(function () { timedOut = true; controller.abort(); }, timeoutMs);
  const external = opts.signal;
  function forwardAbort() { controller.abort(); }
  if (external) { if (external.aborted) controller.abort(); else external.addEventListener('abort', forwardAbort); }
  const body = Object.assign({ op: op }, payload || {});
  try {
    let response;
    try {
      response = await window.fetch(API_PATH, {
        method: 'POST',
        headers: { 'content-type': 'application/json', [API_HEADER]: '1' },
        body: JSON.stringify(body),
        signal: controller.signal,
        credentials: 'same-origin',
      });
    } catch (failure) {
      if (timedOut) throw hostError(t('errTimeout'));
      if (failure && failure.name === 'AbortError') throw failure;
      throw hostError(t('errOffline'));
    }
    if (!response || !response.ok) throw hostError(interpolate(t('errBadStatus'), { status: response ? response.status : '?' }));
    let parsed = null;
    try { parsed = await response.json(); } catch { throw hostError(t('errInvalid')); }
    if (!parsed || parsed.ok !== true) throw hostError(parsed && typeof parsed.error === 'string' ? parsed.error : t('errUnknown'));
    return parsed.data;
  } finally {
    window.clearTimeout(timer);
    if (external) external.removeEventListener('abort', forwardAbort);
  }
}
```

要点（每条都有实现位置）：
- **超时分级**：`TIMEOUT_PING_MS=4000 / STATE=8000 / SYNC=180000 / ACTION=30000`（`client.js:27-30`）。PM 面板建议 `ping 4000 / board 15000（含 python 冷启动）`。
- **Abort 双通道**：内部 timeout controller + 外部传 `signal` 双转发（431-447）；卸载/切面板时 abort（`client.js:989-999` 的 cleanup）。
- **不缓存**：每次点击/装载都真请求；变更类 op 会在 `data.state` 里顺带新状态省一次往返（1001-1010 `adoptState`）。
- **降级不看 HTTP 语义，只看信封**：`parsed.ok !== true` → 抛 `hostError(parsed.error)`；任何非 JSON/非 200 都收敛到一条人话错误（§2.4）。

### 2.4 启动 / 重试 / 降级（「路由不存在也不白屏」）

```js
// /Users/superkkk/MyCoding/dsh-plugins/daily-todo/client.js:970-999（节选）
async function loadInitial() {
  const seq = bootSeqRef.current + 1; bootSeqRef.current = seq;
  if (abortRef.current) abortRef.current.abort();
  const controller = new AbortController(); abortRef.current = controller;
  setMode('booting'); setFailure(''); setRetrying(true);
  try {
    const ping = await callHost('ping', {}, { signal: controller.signal, timeoutMs: TIMEOUT_PING_MS });
    if (!aliveRef.current || bootSeqRef.current !== seq) return;
    if (ping && typeof ping.api === 'number' && ping.api !== API_VERSION) throw hostError(…api 版本不一致…);
    const raw = await callHost('state', {}, { signal: controller.signal, timeoutMs: TIMEOUT_STATE_MS });
    if (!aliveRef.current || bootSeqRef.current !== seq) return;
    if (!isUsableState(raw)) throw hostError(t('errBadShape'));
    applyState(raw); setMode('ready');
  } catch (error) {
    if (!aliveRef.current || bootSeqRef.current !== seq) return;
    if (error && error.name === 'AbortError') return;
    console.warn('[daily-todo] panel degraded to launcher:', messageOf(error));
    setFailure(messageOf(error)); setMode('launcher');
  } finally {
    if (aliveRef.current && bootSeqRef.current === seq) setRetrying(false);
  }
}
```

- 三态机 `booting | ready | launcher`；**失败只打一条 console.warn**，然后渲染 `Launcher`（说明 + 「重试」+「打开会话」）——`client.js:877-913`。
- 面板的 **client 半身照常注册**，与 Host 路由是否可用解耦；因此路由缺失时用户看到的是启动器而不是白屏（`daily-todo/client.js:1-15` 文件头注释；`interview-eval/DESIGN.md:248-286` §6「降级」）。
- 「重试」= 再跑一次 `loadInitial`（seq/alive 守卫防止旧请求覆盖新状态）。
- PM 面板建议额外一条：`board` 失败但 `ping` 成功（route 在、python 坏）→ 保留上次快照 + 顶栏黄条「数据可能过期 · 重试」，比整页 launcher 更合适（`[设计选择]`，非先例）。

### 2.5 轮询 / 刷新策略（现状 + 建议）

- 已装 9 个本地插件**全部没有 setInterval 轮询**（grep 均为 0）：装载时拉一次 + 用户点「刷新」+ 变更后再拉。**没有** `visibilitychange` 先例。
- 但会话状态（§4）本身是 observable 实时推送，**不需要**轮询。因此 PM 面板 = 「仓库数据靠轮询/刷新，AI 状态靠 Hook」。
- 建议：`useEffect` 挂载拉一次；`setInterval(60_000)` 且 `document.visibilityState==='visible'` 才发；`usePanelInfo(info => info.activePanelId === 'openspec-pm-board')` 变 true 时立刻刷新一次；卸载清 timer + abort。**interval 只是设计选择，不引用为既有契约。**

### 2.6 最小可复制骨架（Client）

```js
// dsh-plugins/openspec-pm-board/client.js（骨架，示意）
window.__ModuleLoader__.load({
  id: '@local/dsh-openspec-pm-board',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const PANEL_ID = 'openspec-pm-board';
    const NS = 'pmBoard';
    const API_PATH = '/openspec-pm-board/api';
    const API_HEADER = 'x-dsh-openspec-pm-board';

    async function callHost(op, payload, timeoutMs) { /* §2.3 原样 */ }

    function PmPane({ useSessions, useSessionStatus, useWorkspaces, usePanelInfo, t }) {
      const sessions = useSessions((s) => s);
      const status = useSessionStatus((s) => s);
      const workspaces = useWorkspaces((s) => s);
      // … repo 数据 + 会话投影，见 §4.7
      return h('div', { className: 'pm-root' }, '…');
    }

    function PanelIcon(props) {
      return h('svg', { width: props.size || 18, height: props.size || 18, viewBox: '0 0 24 24',
        fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, 'aria-hidden': 'true' }, /* path */);
    }

    function apply(ctx) {
      ctx.effect(function () { return ctx.locale.register(NS, { zh: zh, en: en }); }, 'openspec-pm-board: dictionaries');
      const t = ctx.locale.bind(NS);
      ctx.slots.inject('main', function () {
        return ctx.slots.register({ name: 'main', key: PANEL_ID, locale: NS }, PmPane);
      });
      ctx.slots.inject('sidebar.panellist', function () {
        return ctx.slots.register({ name: 'sidebar.panellist', id: PANEL_ID, order: 21,
          label: function () { return t('panel'); }, locale: NS }, PanelIcon);
      });
    }

    return { inject: ['slots', 'locale', 'uiWorkspace'], apply: apply };
  },
});
```

`inject` 里是否需要 `uiWorkspace` 取决于是否有「一键开新会话」按钮；`useSessions/useSessionStatus/useWorkspaces/usePanelInfo` 是 **standard props**，不需要在 `inject` 声明（§4.2）。

---

## 3. Host 运行本机 Python 脚本

### 3.1 Host 插件跑在什么环境

- **纯 Node ESM**：所有参考插件 `package.json` 都是 `"type": "module"`（如 `/Users/superkkk/MyCoding/dsh-plugins/invoice-organizer/package.json:4`），`index.js` 用 ESM `import`；由 Loader `EntryTree.import(name)` 加载（`⟨asar⟩/@deepseek-ai/cordis-plugin-loader/lib/index.js:214-229`，Node 24 走 internal loader）。
- 运行时 Node：**24.21.0**（`/Applications/DeepSeek Harness.app/Contents/Resources/runtime/versions.json`），DSH 版本 **0.2.1-rc.5**（`⟨asar⟩/dsh/package.json`）。
- Host 侧代码 **不经过 DSH 沙箱**（daily-todo `bin/feishu.mjs:255-257` 注释：「Host code is not sandboxed; inherit the user's env untouched」）——这意味着子进程能力不受 bash 工具沙箱限制，但也意味着必须自己管好 `cwd/env/超时/路径`。

### 3.2 允许的 import 面（硬约束，既有插件的共识）

| 允许 | 证据 |
| --- | --- |
| Node 内置模块（`node:fs/promises`、`node:path`、`node:child_process`、`node:util`、`node:crypto`、`node:url` …） | daily-todo `index.js:16-20`；interview-eval `index.js:19-21`；invoice-organizer `index.js:15-21` |
| 同插件内的相对模块（如 `./store.js`） | proposal-studio `index.js:12-14` |
| **不允许**：`@deepseek-ai/*` 等 harness 内部包 | daily-todo `index.js:12-16` 文件头：「不 import 任何 harness 内部包，只用 Node 内置模块 —— 规避 profile 里 `@deepseek-ai/*` 版本 skew 的风险」；invoice-organizer `index.js:12-13` 同款；`interview-eval/DESIGN.md:329` 表格「纯对象、不 import 任何 `@deepseek-ai/*`」 |

> 为什么本地插件看不到 harness 依赖（`[推断]`）：插件目录在 `~/MyCoding/...`，Node 的 bare specifier 解析沿该目录向上找 `node_modules`，而 profile 的 `~/.dsh/profiles/desktop/node_modules` 只有 `@local/*` link（`package.json` dependencies 全是 `link:`），harness 的 `@deepseek-ai/*` 在 app.asar 内。**确认方法**：写一个 scratch 插件 `import Schema from '@deepseek-ai/schemastery'` 重启观察是否 `ERR_MODULE_NOT_FOUND`（本轮不允许装/改 profile，故未做）。

### 3.3 现有先例（两种，都可抄）

**(A) `execFile` + promisify —— invoice-organizer（最接近我们的需求：跑 python 取 JSON）**

```js
// /Users/superkkk/MyCoding/dsh-plugins/invoice-organizer/index.js:20-23
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
const execFileAsync = promisify(execFile)

// :155-166 —— 所有外部命令统一超时 + 输出上限
async function runBinary(file, args, options = {}) {
  const { timeoutMs = 30_000, signal } = options
  const { stdout } = await execFileAsync(file, args, {
    timeout: timeoutMs,
    maxBuffer: 24 * 1024 * 1024,
    windowsHide: true,
    ...(signal === undefined ? {} : { signal }),
  })
  return String(stdout)
}

// :73, :183-205 —— 不信任 PATH，按绝对路径找带 pypdf 的 python3，并缓存
const PYTHON_CANDIDATES = ['/opt/homebrew/bin/python3', '/usr/local/bin/python3', '/usr/bin/python3']

async function runPython(script, args, timeoutMs = 40_000) {
  const python = await resolvePython()          // 逐个试 PYTHON_CANDIDATES + `-c 'import pypdf'`
  if (python === null) throw new Error('本机没有可用的 python3 + pypdf，无法解析 PDF 文本')
  const stdout = await runBinary(python, ['-c', script, ...args], { timeoutMs })
  return lastJsonLine(stdout)                   // :168-180 从 stdout 取最后一行合法 JSON（容忍前面有告警）
}
```

**(B) `spawn` + 硬超时/SIGKILL/输出截断 —— daily-todo `bin/feishu.mjs`（要流式或要严格控制时用它）**

```js
// /Users/superkkk/MyCoding/dsh-plugins/daily-todo/bin/feishu.mjs:236-300（节选）
function runCli(bin, args, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  return new Promise((resolve) => {
    let stdout = '', stderr = '', truncated = false, timedOut = false, settled = false, timer = null, child;
    const finish = (payload) => { if (settled) return; settled = true; if (timer) clearTimeout(timer); resolve({ ...payload, stdout, stderr, timedOut, truncated }); };
    try {
      child = spawn(bin, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, NO_COLOR: '1', LARKSUITE_CLI_NO_UPDATE_NOTIFIER: process.env.LARKSUITE_CLI_NO_UPDATE_NOTIFIER ?? '1' },
      });
    } catch (err) { finish({ code: null, signal: null, spawnError: err }); return; }
    timer = setTimeout(() => { timedOut = true; try { child.kill('SIGKILL'); } catch {} finish({ code: null, signal: 'SIGKILL', spawnError: null }); }, Math.max(1_000, Number(timeoutMs) || DEFAULT_TIMEOUT_MS));
    if (typeof timer.unref === 'function') timer.unref();
    child.stdout?.on('data', (chunk) => { if (stdout.length >= MAX_STDOUT_BYTES) { truncated = true; return } stdout += chunk.toString('utf8') });
    child.stderr?.on('data', (chunk) => { if (stderr.length >= MAX_STDOUT_BYTES) return; stderr += chunk.toString('utf8') });
    child.on('error', (err) => finish({ code: null, signal: null, spawnError: err }));
    child.on('close', (code, signal) => finish({ code, signal, spawnError: null }));
  });
}
```

（`DEFAULT_TIMEOUT_MS = 20_000`、`MAX_STDOUT_BYTES = 32MB`：`bin/feishu.mjs:31-32`；**永不 reject**，统一收敛成 payload，调用方按 `timedOut/spawnError/code` 降级。）

### 3.4 推荐封装（跑交付看板生成器）

```js
// 建议照 (A) 写；参数固定、不经 shell、不用 `python -c`
const PYTHON_CANDIDATES = ['/usr/bin/python3', '/opt/homebrew/bin/python3', '/usr/local/bin/python3']
let cachedPython = null
async function resolvePython() {
  if (cachedPython !== null) return cachedPython
  for (const candidate of PYTHON_CANDIDATES) {
    try { await execFileAsync(candidate, ['-c', 'import sys'], { timeout: 5_000 }); cachedPython = candidate; return candidate } catch { /* next */ }
  }
  return null
}
async function runBoardGenerator(repoRoot, { timeoutMs = 15_000 } = {}) {
  const python = await resolvePython()
  if (python === null) throw new Error('本机没有可用的 python3，无法生成交付看板')
  const script = path.join(repoRoot, 'scripts', 'generate_delivery_board.py')
  const { stdout } = await execFileAsync(python, [script, '--json', '--days', '7'], {
    cwd: repoRoot,                        // 生成器自身不依赖 cwd（ROOT 由 __file__ 推导，见下），但固定 cwd 更稳
    timeout: timeoutMs,
    maxBuffer: 8 * 1024 * 1024,
    windowsHide: true,
    env: { ...process.env, NO_COLOR: '1', PYTHONIOENCODING: 'utf-8' },
  })
  return lastJsonLine(stdout)             // stdout 可能混有生成器 summary，取最后一行 JSON
}
```

- `cwd`：生成器 `ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))`（`scripts/generate_delivery_board.py:28`），**与 cwd 无关**；但 `cwd: repoRoot` 能让子进程的相对行为稳定，且不必要地最小化影响面。
- `env`：继承用户 env，只加 `NO_COLOR=1`、`PYTHONIOENCODING=utf-8`（防止中文/emoji 打印把 stdout 弄脏）；**不要**覆盖 `PATH`。
- `--out` 绝不传：**一旦生成的看板要落盘，就会写仓库**。`--json` 模式必须**只打印不写文件**（见 §3.6）。
- 并发：加一个模块级 `let inflight = null`，同一时刻只跑一个子进程；面板轮询撞车时直接复用同一个 Promise（daily-todo 用 `withStore` 串行化，等价思路）。
- 缓存：`{ at, payload }` 内存缓存 5–10s，`refresh` op 绕过，避免双击/两面板并发时重复起 python。

### 3.5 失败如何浮到面板

- 子进程失败**不要**在 Host 里 throw 到路由外层（会变 400 裸响应）；在 handler 里 catch：

```js
try { const snapshot = await runBoardGenerator(repoRoot); send(200, { ok: true, data: snapshot }) }
catch (error) {
  const detail = { timedOut: Boolean(error?.killed), code: error?.code ?? null, stderrTail: String(error?.stderr ?? '').slice(-2000) }
  send(200, { ok: false, error: `看板生成失败：${error?.message ?? error}`, detail })
}
```

- 面板侧：`parsed.ok !== true` → 显示顶栏黄条 + 折叠 `detail`；`ping` op 里额外返回 `{ py: <resolvedPython>, generator: { ok, exitCode } }`，让「路在但 python 坏」与「路由都没起」可区分。
- 超时：`execFile` 的 `timeout` 会 SIGTERM（macOS 上若进程忽略会被杀）；要确定性强杀就照 feishu 的 `spawn + SIGKILL` 方案（§3.3 B）。15s 对 0.2s 的生成器是 75× 余量，足够。

### 3.6 生成器改造：`--json` 模式（本项目侧）

现状 `main()`（`scripts/generate_delivery_board.py:662-690`）：

```python
def main():
    ap = argparse.ArgumentParser(description="交付看板生成器")
    ap.add_argument("--out", default=os.path.join(ROOT, "docs", "governance", "delivery_board.html"))
    ap.add_argument("--days", type=int, default=7, help="归档窗口（天）")
    args = ap.parse_args()
    data = {
        "roadmap": scan_roadmap(), "epics": scan_epics(), "ideas": scan_ideas(),
        "active": scan_active_changes(), "baseline": scan_baseline(), "days": args.days,
    }
    data["recent"], data["history"] = scan_archives(args.days)
    refreshed = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    html = render_html(data, refreshed)
    out = os.path.abspath(args.out)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        f.write(html)
```

改造建议（两种，任选其一，**优先 a**）：
- **a. 加 `--json`**：在 `data["recent"], data["history"] = ...` 之后插入
  `ap.add_argument("--json", action="store_true")`；若 `args.json: print(json.dumps(data, ensure_ascii=False)); return 0`，跳过 `render_html` 与写盘。约 6–10 行，不改变 HTML 路径行为，单源不漂移。
- **b. 新增 `scripts/pm_board_scan.py`**：`import importlib.util` 载入本文件后直接调用 `scan_*` 组装 `PmBoardSnapshot`（`inputs-repo.md` §8 的形状 + 附录 B 的新扫描函数）。适合仓库侧后续要补 `scan_story_tracking / scan_hitl / scan_board_state` 的情况，但要维护「schemaVersion」与 `sourceHealth` 的降级逻辑。可行性已验证：本轮就是用 `importlib` 直接调这些函数实测出 16,460 字节 JSON（见 §8.2）。

### 3.7 `ctx.subprocess` 服务要不要用？

Host Service 目录里确实有 `subprocess`（`abstract spawn(spec): SubprocessHandle`；行 `include:subprocess` = `@deepseek-ai/dsh-subprocess-local`，`~/.dsh/profiles/desktop/cordis.yml`）。但：
- 它是 harness 内部抽象（`⟨asar⟩` 内 `dsh-subprocess-local`），本地插件的既有先例**全部**用 `node:child_process`；
- 用 `ctx.inject(['subprocess'])` 也拿不到类型与文档保证，且失败路径/超时语义不如 `execFile` 透明。
- **结论**：用 `node:child_process`，不要用 `ctx.subprocess`（与三插件一致，避免新风险）。

---

## 4. 实时「AI 在做」数据

### 4.1 客户端 `sessions` 服务与 list 快照

- 客户端服务键 **`sessions`**，来自 `@deepseek-ai/dsh-api-session-controller` 的 client 半身；`inject` 声明里第一个就是它（`⟨asar⟩/@deepseek-ai/dsh-client-ui-session/lib/client.js:1092-1098`）：

```js
const inject = ["sessions", "slots", "remote", "remoteAccess"];
function apply(ctx) {
    const service = new UiSession(ctx, ctx.sessions);
    ctx.slots.provideRoot({
        hooks: { sessions: ctx.sessions.list, sessionStatus: service.sessionStatus },
        keyedHooks: {
            sessionRetainInfo: (key) => ctx.sessions.retainInfo(key),
            sessionAccess: (sessionId, action) => action === void 0 ? void 0 : ctx.remoteAccess.source("session", sessionId, action)
        }
    });
    ctx.slots.installScope("session", service.adapter);
    …
}
```

（这就是 `useSessions` / `useSessionStatus` / `useSessionRetainInfo` / `useSessionAccess` 四个 **root 标准 Hook** 的来源；`provideRoot` 的 hook 名会被 `standardHookPropName()` 改写成 `use<Name>`，见 `⟨asar⟩/@deepseek-ai/dsh-client-ui-renderer/lib/client.js:664-679`。）

- `ctx.sessions.list` 是 **`ObservableSnapshot<SessionListState>`**：

```ts
// ⟨asar⟩/@deepseek-ai/dsh-cordis-client-runner/lib/client.js:2166-2168（生成目录）
export interface SessionListState {
    ids: SessionId[];
    byId: Record<SessionId, SessionSummary>;
    phase: SessionListPhase;                 // 'pending' | 'ready'
    projectionsBySession: Readonly<Record<SessionId, SessionProjectionSnapshot>>;
}
```

- 行对象（客户端投影，`displayTitle` 已由 title / cwd basename / id 推导）：

```js
// ⟨asar⟩/@deepseek-ai/dsh-api-session-controller/lib/types/client/sessions/service.js:491-514（节选）
projectList() {
    const { items, phase, projectionsBySession } = this.manager.getListSnapshot();
    for (const entry of items) {
        ids.push(entry.sessionId);
        byId[entry.sessionId] = {
            id: entry.sessionId,
            displayTitle: displayTitleOf(entry.title, entry.cwd, entry.sessionId),
            running: entry.running,
            retainedBy: this.retentionSnapshot(entry.sessionId).retainedBy,
            blank: entry.blank,
            updatedAt: entry.updatedAt,
            formatStatus: entry.formatStatus,
            ...(entry.projectionValues === undefined ? {} : { projectionValues: entry.projectionValues }),
            ...(entry.title !== undefined ? { title: entry.title } : {}),
            ...(entry.cwd !== undefined ? { cwd: entry.cwd } : {}),
            ...(entry.parentSessionId !== undefined ? { parentId: entry.parentSessionId } : {}),
            ...(entry.origin !== undefined ? { origin: entry.origin } : {}),
        };
    }
    …
}
```

- Host 侧同源摘要 `SessionSummary`（wire 契约，**没有 title、没有 agentPreset 直接字段**）：

```ts
// ⟨asar⟩/@deepseek-ai/dsh-tool-cordis/lib/types/api-catalog.js:7400-7402
export interface SessionSummary {
    readonly agentAvailable: boolean;
    readonly formatStatus?: 'current' | 'migration-required';
    readonly sessionId: SessionId;
    readonly updatedAt: number;
    readonly running: boolean;
    readonly blank: boolean;
    readonly parentSessionId?: SessionId;
    readonly origin?: 'subagent';
    readonly cwd?: string;
    readonly projections?: SessionProjectionHints;
}
```

### 4.2 面板能拿到的 root 标准 Hook（`main` / `sidebar.panellist` 都有）

生成目录对这两个 slot 的 `standardProps` 完全一致（`⟨asar⟩/@deepseek-ai/dsh-cordis-client-runner/lib/client.js:4386-4396`（main）与 `:5776-5786`（panellist））：

```
useRemoteAccess: (action: RemoteEndpoint) => boolean
useResource: UseResource
useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>
usePanelInfo: UsePanelInfo
useSessions: UseSessions
useSessionStatus: UseSessionStatus
useSessionRetainInfo: UseSessionRetainInfo
useSessionAccess: (sessionId: SessionId, action: RemoteEndpoint) => boolean
useWorkspaceAccess: (workspaceId: WorkspaceId, action: RemoteEndpoint) => boolean
```

它们是 **observable Hook**：`useSessions(selector, equal?)` 内部 `useSyncExternalStoreWithSelector`，快照变即重渲染（`⟨asar⟩/@deepseek-ai/dsh-client-ui-renderer/lib/client.js:220-227`、`:160` 的 `useSyncExternalStoreWithSelector`）——**不需要轮询**。

用法在 shipped 代码里到处都是：
- `useSessions((s) => s.byId[sessionId]?.cwd)`（`⟨asar⟩/@deepseek-ai/dsh-client-ui-chat/lib/client.js:2759`）
- `useSessionStatus((snapshot) => snapshot.get(sessionId)?.pendingInteraction)`（`…/dsh-client-ui-conversation/lib/client.js:17813`）
- `const statuses = useSessionStatus((s) => s)` + `const list = useSessions((s) => s)`（`…/dsh-client-ui-workspace/lib/client.js:3445-3446`）
- 直接读服务（插件已 inject `sessions` 时）：`ctx.sessions.list.getSnapshot().byId`（`…/dsh-client-ui-agent-preset/lib/client.js:2469`）

### 4.3 `useSessionStatus` 的精确形状

```js
// ⟨asar⟩/@deepseek-ai/dsh-client-ui-session/lib/client.js:977-993
publishStatus() {
    const ids = new Set([...Object.keys(this.sessions.list.getSnapshot().byId),
                         ...this.running.keys(), ...this.pendingSnapshot.keys(), ...this.completionUnread]);
    const next = new Map();
    for (const id of ids) next.set(id, {
        running: this.running.get(id),
        pendingInteraction: this.pendingSnapshot.get(id),
        completionUnread: this.completionUnread.has(id),
    });
    if (sameSessionStatus(this.statusSnapshot, next)) return;
    this.statusSnapshot = next;
    …
}
```

即 `Map<SessionId, {running?: boolean; pendingInteraction?: Interaction; completionUnread: boolean}>`。
`pendingInteraction.kind` 的取值（实现级）：
- `'approval'` —— `⟨asar⟩/@deepseek-ai/dsh-client-ui-approval/lib/client.js:181`
- `'question'` / `'plan-review'` —— `⟨asar⟩/@deepseek-ai/dsh-client-ui-user-questions/lib/client.js:186`（`planReviewOf(questions) === undefined ? 'question' : 'plan-review'`）

对应侧边栏官方口径的「等待审批 / 计划待审 / 等待回答」（`⟨asar⟩/@deepseek-ai/dsh-client-ui-workspace/README.zh.md` 待处理交互段）。

### 4.4 「AI 在做」到底能知道什么（边界）

| 想要字段 | 能不能 | 取法 |
| --- | --- | --- |
| sessionId | ✅ | `row.id` |
| 标题 | ✅ | `row.displayTitle`（可能=目录名或 id）；`row.title` 仅在已有 durable title 时存在 |
| 运行中 | ✅ | `row.running` / `useSessionStatus(...).running`（baseline 未到时可能 `undefined`，`[推断]` 直到 status 事件） |
| 最后活动时间 | ✅ | `row.updatedAt`（unix ms；`Math.max(header.createdAt, lastPromptAt)`） |
| 工作目录 | ✅ | `row.cwd`（**没有 workspaceId**；用 `useWorkspaces` 的 `items[].path / sessionIds` 反查） |
| Agent preset | ✅（经投影） | `row.projectionValues?.agentPreset`（见 §4.5） |
| 等待你处理 | ✅ | `useSessionStatus(...)` 的 `pendingInteraction`（kind → 审批/计划/提问）+ `completionUnread` |
| 「当前在跑哪个 tool / 正在写哪个文件」 | ❌（root 面板拿不到） | 事件流只在 **session scope** 的 `useChat/useConversation/useSession` 里；root 面板不能读 |
| subagent 活动 | ⚠️ 只能间接 | `projectionsBySession[id].values.subagentCatalog` 有 `{id,label,mode}`**没有 activity**（`api-catalog.js:7768-7770`）；但子会话自己会作为 `origin:'subagent'` 的行出现在 `byId` 里，`running` 由 status 事件维护 |

### 4.5 按 Agent preset 过滤——可行性结论：**可行**

- Host 侧把 `agentPreset` 注册成 **wire 投影**（客户端可见）：

```js
// ⟨asar⟩/@deepseek-ai/dsh-agent-preset-registry/lib/index.js:47-59
const agentPresetSchema = z$1.union([z$1.string(), z$1.null()]);
const agentPresetProjectionDefinition = {
    key: "agentPreset",
    stateSchema: agentPresetSchema,
    init: (header) => header.agentPreset ?? null,
    apply: (state, event) => event.type === "agent-preset/selected" ? event.data.agentPreset : state,
    wire: { viewSchema: agentPresetSchema, view: (state) => state },
    stateVersion: 1
};
```

- 客户端侧这就是 `projectionValues.agentPreset`，shipped 代码自己就在读：

```js
// ⟨asar⟩/@deepseek-ai/dsh-client-ui-workspace/lib/client.js:1422-1426
const blank = sessions.ids.find((id) => {
    const summary = sessions.byId[id];
    const listed = summary?.projectionValues?.agentPreset;
    return summary !== void 0 && summary.blank && summary.cwd === workspace.path &&
        workspace.sessionIds.includes(id) && !archived.includes(id) &&
        (options.agentPreset === void 0 || typeof listed !== "string" || listed === options.agentPreset);
});
// :1455
const recorded = this.sessions.list.getSnapshot().byId[sessionId]?.projectionValues?.agentPreset;
```

- 本 profile 的 PM preset 已存在：`sdd-pm`（`~/.dsh/profiles/desktop/cordis.yml:1438-1444`，`name: PM`，order 41，由 `@local/dsh-openspec-sdd-team` 的 patch 注册）。
- **建议过滤规则**（PM 面板）：
  ```js
  const isPmSession = (row) =>
    row.origin !== 'subagent' &&                                  // 排除子代理行
    !archivedSet.has(row.id) &&                                   // 排除归档（来自 useWorkspaces().archivedSessionIds）
    row.cwd === repoRoot &&                                       // 限定 OpenSpec-practice（注意子目录启动的会话 cwd 不同）
    row.projectionValues?.agentPreset === 'sdd-pm';
  ```
  `cwd` 严格等值；若要覆盖子目录，用 `workspace.path` 的前缀 + `workspace.sessionIds.includes(row.id)`。
- **preset 名单/展示名**（可选）：客户端可 `inject: ['remote','remote.agentPresets']` 后 `ctx.remote.agentPresets.list()` → `AgentPresetRoster{presets: AgentPresetRow[]}`，`AgentPresetRow = {id, isDefault, name?, description?, broken?}`（`⟨asar⟩/…/api-catalog.js:4680-4685`；Host 服务目录里 `agentPresets.@Remote('list')` 同源）。**`[推断]`**：动态本地插件 inject `remote.*` 命名空间没有本地先例，但 client 组合里 `api-remotes` 行存在（`~/.dsh/profiles/desktop/cordis.yml` client 段），属低风险；确认方法 = 装好后在面板里 `console.log(ctx.remote)` 或直接调一次。

### 4.6 PM 面板「AI 在做」建议投影（确定性的）

```
pmSessions   = rows.filter(isPmSession)
aiWorking    = pmSessions.filter(r => status(r.id)?.running)
waitingYou   = pmSessions.filter(r => status(r.id)?.pendingInteraction)  // kind 映射文案
doneUnseen   = pmSessions.filter(r => status(r.id)?.completionUnread)
idle         = 其余
```
每张卡直接渲染 `displayTitle` + 相对时间(`updatedAt`) + 预设徽标 + 状态点；**不要**尝试在 root 面板渲染会话内容（拿不到）。「AI 在做哪个 Epic」只能**启发式**：在 title 里匹配 Epic key，或把 `repoRoot` 下的「活跃 Epic key」与 `displayTitle` 做模糊匹配——置信度低，建议 UI 上注明「按标题推测」。

---

## 5. 一键开新会话（带预设 prompt）

### 5.1 精确签名

```
// 生成的服务目录（⟨asar⟩/@deepseek-ai/dsh-cordis-client-runner/lib/client.js:1554）
startSession(workspaceId?: WorkspaceId, options?: StartSessionOptions): void
```

```ts
// ⟨asar⟩/…/client.js:1855
export interface DraftInitializationOptions {
    readonly prompt?: string;
    readonly clearPreviousDraft?: boolean;
    readonly whenDraftExists?: 'replace' | 'append' | 'keep';
}
// ⟨asar⟩/…/client.js:2274-2276
export interface StartSessionOptions extends DraftInitializationOptions {
    readonly agentPreset?: string;
}
```

（`ctx.uiWorkspace` 服务键同名，类 `super(ctx, "uiWorkspace")`：`⟨asar⟩/@deepseek-ai/dsh-client-ui-workspace/lib/client.js:1381`。）

### 5.2 目标工作区怎么选

```js
// ⟨asar⟩/@deepseek-ai/dsh-client-ui-workspace/lib/client.js:1501-1528（节选）
startSession(workspaceId, options) {
    const { agentPreset, ...draft } = options ?? {};
    const draftOptions = options === void 0 ? void 0 : draft;
    const initializeDraft = draftOptions !== void 0 && (draftOptions.prompt !== void 0 || (draftOptions.whenDraftExists ?? (draftOptions.clearPreviousDraft === true ? "replace" : "keep")) === "replace");
    const workspace = this.workspaces.list.getSnapshot();
    const sessions = this.sessions.list.getSnapshot();
    const current = this.mainReference?.sessionId;
    const currentWorkspaceId = current === void 0 ? void 0 : workspace.items.find((item) => item.sessionIds.includes(current))?.workspaceId;
    const recent = workspace.phase === "ready" && sessions.phase === "ready" ? recentWorkspace(workspace.items, sessions.byId) : void 0;
    const target = workspaceId ?? currentWorkspaceId ?? recent;
    if (target === void 0) {
        if (initializeDraft) { this.notify({ kind: "createFailed", message: this.ctx.locale.bind("workspace")("draft.workspaceRequired") }); return; }
        this.clearMain(); return;
    }
    this.openWorkspace(target, initializeDraft ? (id) => { … this.prepareDraft(binding, draftOptions); } : void 0,
        agentPreset === void 0 ? {} : { agentPreset }).catch((reason) => { console.warn("new session failed:", reason); });
}
```

- 不传 `workspaceId` 时的兜底顺序：**当前会话所属 workspace → 最近有活动的 workspace**；都没有 + 带 prompt → toast 报「需要先选工作区」，否则 `clearMain()`（**清掉主区选择**，不是「保持不动」——sdd-team README 的「保持当前选择」表述在 runtime 里对应 `layout.selectPanel(null)`，见 §5.4）。
- **PM 面板应显式传 `workspaceId`**：用 `useWorkspaces` 找到 `path === repoRoot` 的 workspace；找不到 → 按钮禁用 + 提示「先把 OpenSpec-practice 注册为工作区」。这样避免落到别的项目里开会话。

### 5.3 preset 不存在 / 创建失败时到底发生什么

- `startSession` → `openWorkspace` → `openWorkspaceSession`：**创建失败被 catch，弹 Workspace 通知 `createFailed`，并 rethrow；`startSession` 自己再 catch 成一条 `console.warn`**：

```js
// ⟨asar⟩/@deepseek-ai/dsh-client-ui-workspace/lib/client.js:1478-1492（节选）
async openWorkspaceSession(workspaceId, beforeOpen, reuse) {
    const navigation = AbortSignal.any([this.ctx.layout.beginNavigation(), this.lifetime.signal]);
    let sessionId;
    try { sessionId = await this.connectBlank(workspaceId, reuse); }
    catch (error) {
        if (!navigation.aborted) this.notify({ kind: "createFailed", message: creationFailureMessage(error) });
        throw error;
    }
    if (navigation.aborted) return;
    this.replaceMain(sessionId, navigation, "reveal", beforeOpen);
}
```

```js
// :1690-1694 —— Host 拒绝时保留稳定 code
function creationFailureMessage(error) {
    const refused = sessionCreateErrorOf(error);
    if (refused !== void 0) return `${refused.rpcError.code}: ${refused.rpcError.message}`;
    return error instanceof Error ? error.message : String(error);
}
// :4837 文案模板
"toast.createFailed": "新建会话失败：{message}",
```

- 因此 **preset id 不存在（`agent-preset/not-found`）→ 用户看到 toast「新建会话失败：agent-preset/not-found: Unknown agent preset: xxx」，当前选择不变**，不是静默失败。`agent-preset/invalid`（preset 挂载失败）同理。
- 自动重试降级只发生在「启动恢复复用空白会话」路径（`:1453-1471` `restoreBlank` 捕获 `agent-preset/not-found|invalid` 后改不带 preset 重试）；**显式点击 `startSession` 不降级**，直接报错。
- 空白会话复用规则（`connectBlank`/`createInWorkspace`，`:1398-1432`）：按 `sessionId` 复用同 workspace 的第一个空白会话；**若请求了 preset，则跳过「列出别的 preset」的空白**（`:1425`），Host 再按请求的 preset 复用或新建。

### 5.4 会自动跳到 Conversation 吗？——**会**

```js
// ⟨asar⟩/@deepseek-ai/dsh-client-ui-workspace/lib/client.js:1653-1676（节选）
replaceMain(target, signal, panel, beforeOpen) {
    …
    this.selection.set({ sessionId: reference.sessionId, … });
    …
    if (panel === "reveal") this.ctx.layout.selectPanel(null);
}
```

- `startSession` 走 `openWorkspace(...)` → `replaceMain(sessionId, navigation, "reveal", beforeOpen)`（`:1491`）→ `layout.selectPanel(null)`。
- `main` slot 的派发规则：`renderSlot("main", {}, { entryKey: usePanelInfo(info => info.activePanelId) ?? "conversation" })`（`⟨asar⟩/@deepseek-ai/dsh-client-ui-layout/lib/client.js:118-121`）——`activePanelId === null` 时**默认显示 `conversation`**。所以点「用 PM Agent 继续」→ 新会话 + 直接切到对话面板。
- 副作用：**面板自身会从主区消失**（activePanelId 变 null）。UX 上这是期望行为；如果希望「留在面板」，没有官方开关，只能不调用 startSession。

### 5.5 prompt 语义（决定按钮怎么用）

- `prompt` 只接受**纯文本**（workspace README「客户端调用方可以在 … 传入 prompt/whenDraftExists/clearPreviousDraft。提示词仅接受普通文字」）。
- 默认 `whenDraftExists: 'keep'`：已有草稿时**不覆盖**；`'replace'` 用 prompt 替换正文（无 prompt 时清空）；`'append'` 在原文后另起段落追加；附件永远保留。
- `clearPreviousDraft: true` 仅在**没有显式传 `whenDraftExists`** 时才等价于 `'replace'`（`:1504`）。
- 实践建议：PM 面板「继续这个 Epic」用 `{ agentPreset: 'sdd-pm', prompt: '继续 Epic <key>：…', whenDraftExists: 'append' }`（不吞用户草稿，最安全）；「新开 PM 会话」可 `'replace'` 或省略。

### 5.6 推荐按钮实现（含 preflight）

```js
// client.js
function startPmSession(ctx, { repoRoot, presetId, prompt }) {
  const sessions = ctx.sessions.list.getSnapshot();
  const workspaces = ctx.workspaces?.list?.getSnapshot?.();        // 或通过 useWorkspaces 在组件里取
  const ws = workspaces?.items?.find((w) => w.path === repoRoot) ?? null;
  if (ws === null) return { ok: false, reason: 'workspace-missing' };
  try {
    ctx.uiWorkspace.startSession(ws.workspaceId, {
      agentPreset: presetId,                 // 'sdd-pm'
      prompt,
      whenDraftExists: 'append',
    });
    return { ok: true, workspaceId: ws.workspaceId };
  } catch (error) {                         // 只捕获同步错误；异步失败由 Workspace toast 呈现
    return { ok: false, reason: 'refused', message: error?.message ?? String(error) };
  }
}
```

- 组件里用 `useWorkspaces` 拿 `items`（`WorkspaceView = {workspaceId, path, title, sessionIds, createdAt, updatedAt}`，`⟨asar⟩/…/api-catalog.js:8805`；`WorkspaceBaseline = {items, archivedSessionIds, pinnedSessionIds}`，`:8681`）。
- 「用 PM Agent 继续这个 Epic」= 每个 Epic 卡一个按钮，`prompt` 里带 Epic key + 下一步阶段 + 当前看板摘要（从 board 数据取），并注明「已预填，回车才发送」。

---

## 6. 侧边栏 / 面板约束

### 6.1 Slot 契约（来自生成目录，与 Client Inspect 同源）

**`main`**（`⟨asar⟩/@deepseek-ai/dsh-cordis-client-runner/lib/client.js:4373-4408`）：

```json
{
  "key": "main", "kind": "keyed", "scope": "root",
  "summary": "Central panel selected by sidebar entry id.",
  "doc": "… The reserved `conversation` key hosts the Conversation; other keys receive no Session binding.",
  "registerOptions": [{ "name": "key", "requirement": "required", "type": "string",
    "doc": "Your cell key: the entry renders where the owner dispatches this exact key. Registering an already-occupied key replaces that occupant." }],
  "keyDomain": "open: any string the owner dispatches (no compile-time key set), already taken: conversation",
  "occupants": ["client-ui-conversation ConversationPanel key 'conversation'", "client-ui-plugin-manager PluginManagerPage", "client-ui-schedule TaskManagerPage"]
}
```

**`sidebar.panellist`**（同文件 `:5749-5794`）：

```json
{
  "key": "sidebar.panellist", "kind": "list", "scope": "root",
  "summary": "Global panel icons.",
  "doc": "Global panel icons. Each list id addresses the matching main panel; the sidebar owns the button and resolves its label from list metadata.",
  "registerOptions": [
    { "name": "id", "requirement": "required", "type": "string",
      "doc": "Your cell key. Use an id of your own: a fresh id is added beside the shipped entries, while reusing a shipped id puts you in THAT cell and replaces it. Owners that filter by id address you by it." },
    { "name": "order", "requirement": "optional", "type": "number", "doc": "Position among the entries, ascending (default 0)." },
    { "name": "label", "requirement": "optional", "type": "string | (() => string)", "doc": "… A thunk is re-read on every projection, so localized text follows the active locale without re-registering." }
  ],
  "occupants": ["client-ui-plugin-manager PluginsPanelIcon", "client-ui-schedule TaskManagerIcon"]
}
```

`main` 的声明在 layout 的 root 注册里（`⟨asar⟩/@deepseek-ai/dsh-client-ui-layout/lib/client.js:624-654`，`"main": {"kind":"keyed","scope":"root"}`）；`sidebar.panellist` 的声明在 sidebar（`⟨asar⟩/@deepseek-ai/dsh-client-ui-sidebar/lib/client.js:628-631`，`{"kind":"list","scope":"root"}`）。

**id 与 main key 必须成对**（否则点击崩）：

```js
// ⟨asar⟩/@deepseek-ai/dsh-client-ui-layout/lib/client.js:469-471
selectPanel(panelId) {
    if (panelId !== null && !this.hasMainPanel(panelId)) throw new Error(`layout.selectPanel: main panel "${panelId}" is not registered`);
    …
```
而 sidebar 的点击就是 `ctx.layout.selectPanel(id)`（`…/dsh-client-ui-sidebar/lib/client.js:598-600`；`inject` 里声明 `layout`：`:551-557`）。

### 6.2 当前 occupant 普查（静态；live inspect 不可用）

> **live 无法验证**：本轮 `cordis_inspect_query({platform:"client", provider:"Slots"})` / client `Service.listService` 均返回
> `Client inspect query … timed out after 10000ms. Open or reconnect the Harness page, then retry.`
> （页面未连上/未认证；`http://127.0.0.1:53024/` 直连返回 `401 dsh web authentication required`）。
> 因此用「生成目录 occupants 字段（= 打包期 occupant）+ 已安装 9 个本地 bundle 的 `client.js` 静态注册」合并普查。

| order | id | 来源 | 证据 |
| --- | --- | --- | --- |
| 0 | `plugins` | shipped `@deepseek-ai/dsh-client-ui-plugin-manager` | `⟨asar⟩/…/dsh-client-ui-plugin-manager/lib/client.js:4356,4487-4491`（`PANEL_ID="plugins"`；main key 同值 `:4420`） |
| 10 | `schedules` | shipped `@deepseek-ai/dsh-client-ui-schedule` | `⟨asar⟩/…/dsh-client-ui-schedule/lib/client.js:7364,7476,7486-7491`（`PANEL_ID="schedules"`） |
| 12 | `daily-todo` | `@local/dsh-daily-todo` | `/Users/superkkk/MyCoding/dsh-plugins/daily-todo/client.js:1500-1507` |
| 20 | `sdd-team` | `@local/dsh-openspec-sdd-team` | `dsh-plugins/openspec-sdd-team/scripts/client.template.js:399-409` |
| 29 | `agent-roster` | `@local/dsh-agent-roster` | `/Users/superkkk/MyCoding/DSH-aistaffing/dsh-plugins/agent-roster/client.js:1326-1333` |
| 30 | `blog-writer` | `@local/dsh-blog-writer` | `/Users/superkkk/MyCoding/kkjm-homepage/blog-writer-dsh-plugin/client.js`（同款注册） |
| 30 | `fde-toolkit` | `@local/dsh-fde-toolkit-panel` | `…/fde-toolkit-panel/client.js:2432-2439` |
| 30 | `grilling-agent` | `@local/dsh-grilling-agent` | `/Users/superkkk/DSH/grilling-agent/client.js`（同款注册） |
| 40 | `invoice-organizer` | `@local/dsh-invoice-organizer` | `/Users/superkkk/MyCoding/dsh-plugins/invoice-organizer/client.js:567-574` |
| 50 | `interview-eval` | `@local/dsh-interview-eval` | `/Users/superkkk/MyCoding/dsh-plugins/interview-eval/client.js:1926-1933` |
| 50 | `proposal-studio` | `@local/dsh-proposal-studio` | `/Users/superkkk/MyCoding/dsh-plugins/proposal-studio/client.js`（同款注册） |

→ 当前应有 **11 个** panellist occupant（2 shipped + 9 local）。排序规则：`order` 升序，**同 order 保持注册顺序**（`Array.prototype.sort` 稳定；实现见 `⟨asar⟩/…/dsh-client-ui-sidebar/lib/client.js:569-576`）：

```js
const next = ctx.slots.entriesOfSlot("sidebar.panellist").map(({ options }) => {
    const id = options.id;
    return { id, order: options.order ?? 0, label: resolveSlotLabel(options.label) ?? id };
}).sort((a, b) => a.order - b.order);
```

（注意：`courseware-designer` 在 profile dependencies 里但目录已不存在 → SKIP；`staffing-agent`/`fde-toolkit-agents` 只有 preset，没有 client 面板。）

### 6.3 一个 bundle 能否注册 **两个** 入口？——可以，但**没有先例**

- 机制上：`sidebar.panellist` 是 `kind: "list"` 且以 `id` 为 key（§6.1 registerOptions），同一 bundle 对同一 slot 调两次 `register()` 得到两个 occupant 是合法组合（list slot 不限制每 bundle 一个）。
- 代价：每个入口都需要自己的 **main key**（§6.1 `selectPanel` 校验），即两套 Page；侧边栏再多一行。
- 现状：**0 个**已装插件这么干（普查见 §6.2）。安装别的 bundle（如 sdd-team + PM board）天然并存，不冲突。
- **建议**：PM 工作台**一个入口**（内部用 tab/泳道切换 Epic 看板 / AI 动态 / 待确认），order `21`；只有在「Epic 看板」与「全局 AI 看板」确实面向不同操作习惯时才拆第二个（如 `openspec-pm-board-epics` order 22）。

### 6.4 两个不同 bundle 各自的 `main` key

- 可以：`main` 是 keyed slot，`keyDomain` 公开、只有一个保留键 `conversation`（§6.1）；两个 bundle 各自 `key = 自己的 PANEL_ID`，互不覆盖。
- 覆盖只发生在**同 key**：`registerOptions.key.doc` 明说「Registering an already-occupied key replaces that occupant」——所以不要复用 `conversation`/`plugins`/`schedules`/`sdd-team`/`daily-todo`。
- 已装插件的实际做法：`main` key 与 panellist id 同名（daily-todo / sdd-team / invoice / interview 全部如此）。

### 6.5 id / key 规则与推荐

- id 用 slug（`[a-z0-9-]`），全局唯一；顺序取一个空档（当前 12 → 20 之间只有一个 20，20 → 29 之间空）。
- **推荐**：`PANEL_ID = 'openspec-pm-board'`，panellist `order: 21`（紧跟 sdd-team 20、在 agent-roster 29 之前，语义上「OpenSpec 相关」挨着）；`main.key` 同值。若要更靠前可 13–19，避免 30/50 的拥挤段（同 order 只靠注册顺序，不稳定）。
- 图标：内联 SVG 组件（18/16px、`currentColor`、`aria-hidden`），参考 daily-todo `client.js` 的 `PanelIcon`（`props.size` 由 sidebar 传入，`:227-230` 说明 `renderSlot` 传 `{size, active}`）。
- locale：`ctx.locale.register(NS,{zh,en})` + `ctx.locale.bind(NS)`，`label` 用 thunk。

---

## 7. 插件 Config（repoRoot）

### 7.1 Cordis 的 Config 契约（DSH 0.2.1-rc.5）

- 插件可选导出 `Config`，类型是 **Standard Schema v1**：

```ts
// ⟨asar⟩/@deepseek-ai/cordis/src/registry.ts:100-112（节选）
export namespace Plugin {
  export interface Base<T = any> {
    /** Display name used for fiber diagnostics and logger names. */
    name?: string
    /** Standard-schema validator applied to config before the plugin starts. */
    Config?: StandardSchemaV1<any, T>
    /** Services the plugin requires; it only loads while all are available. */
    inject?: Inject
    /** Service name(s) the plugin provides (read by `Service` and by loaders). */
    provide?: string | string[]
    …
  }
  /** Object plugin with an `apply(ctx, config)` method. */
  export interface Object<T = any> extends Base<T> { apply(ctx: Context, config: T): any }
```

- 校验在 Fiber 初始化时做；**没有 Config 就直接把原始 config 传给 `apply`**：

```ts
// ⟨asar⟩/@deepseek-ai/cordis/src/fiber.ts:44-57（节选）
export function resolveConfig(runtime: Plugin.Runtime, config: any) {
  if (!runtime.Config) return config
  const result = runtime.Config['~standard'].validate(config)
  if (result instanceof Promise) throw new TypeError('Async config validation is not supported')
  if (result.issues) throw new ValidationError(result.issues)   // 校验失败 → fiber FAILED
  return result.value
}
```

- Loader 把 `plugin.Config` 放进 runtime：`runtime = { name, callback, fibers, Config: plugin.Config }`，再 `new Fiber(this.ctx, config, …)`（`⟨asar⟩/@deepseek-ai/cordis-plugin-loader` → 实际在 `⟨asar⟩/@deepseek-ai/cordis/src/registry.ts:317-331`）。

### 7.2 官方插件怎么写（供参考，不建议本地插件照抄 import）

```js
// ⟨asar⟩/@deepseek-ai/dsh-agent-instructions/lib/index.js:5,26,1223,1448
import z from "@deepseek-ai/schemastery";
…
const Config = z.object({
    maxBytes: z.natural().min(1).default(65536),
    …
});
…
function apply(ctx, config) { … }
…
export { Config, apply, inject, name, … };
```

同一模式在 `dsh-session-title/lib/index.js:203-204`（`static Config = z.object({ fallbackMaxWords: …, fallbackMaxBytes: … })`）、`dsh-client-hmr`（`Config = z.object({pollIntervalMs: .default(500)})`）等 ~10 处。

### 7.3 本机 local plugin 现状（关键证据）

- grep 全部参考插件：**没有**任何 local plugin 声明 `export const Config` / 引入 schemastery
  （`daily-todo/index.js`、`interview-eval/index.js`、`invoice-organizer/index.js`、`proposal-studio/index.js`、`openspec-sdd-team/index.js`、`agent-roster/index.js` 均无）。
- 对应的 Config Inspect 投影：

```text
cordis_inspect_query(host, Config, listConfigs, {name:"@local/dsh-daily-todo"})
→ entries: [{ id:"include:daily-todo", patchId:"daily-todo", name:"@local/dsh-daily-todo", status:"absent" }]
```

对比 `include:session-title`（有 `Config = z.object`）在同目录里 status 为 `"schema"`。**`[推断]`**：`status:"absent"` 即「该 entry 的插件未导 Config（无 schema 可投影）」；`"schema"` 即有。确认方法：给本地插件加 `export const Config` 后重查该目录，status 应转 `schema`。

- 本地插件的 config 现状：patch 行里写 `config: {}`，composed `cordis.yml` 也是 `config: {}`（`~/.dsh/profiles/desktop/cordis.yml:1254-1255`（sdd-team）、`:3225-3226`（daily-todo））。

### 7.4 推荐写法：**不声明 Config，直接读 `apply(ctx, config)`**（方案 A）

```js
// dsh-plugins/openspec-pm-board/index.js
const DEFAULT_REPO_ROOT = '/Users/superkkk/MyCoding/OpenSpec-practice'

export function apply(ctx, config) {
  const repoRoot = (function resolveRepoRoot(raw) {
    const candidate = typeof raw?.repoRoot === 'string' ? raw.repoRoot.trim() : ''
    return path.isAbsolute(candidate) ? path.resolve(candidate) : DEFAULT_REPO_ROOT
  })(config)
  …
}
```

patch 行（bundle patch，`cordis.patch.yml`）：

```yaml
- insert:
    - id: openspec-pm-board
      name: '@local/dsh-openspec-pm-board'
      config:
        repoRoot: /Users/superkkk/MyCoding/OpenSpec-practice
```

为什么推荐 A：
1. 不需要任何依赖 import（本地插件解析 `@deepseek-ai/schemastery` 的风险与「无内部依赖」铁律冲突，`[推断]` 见 §3.2）；
2. 无 Config 时 Cordis 原样透传（§7.1 源码），行为简单可预测；
3. 校验放在代码里（绝对路径 / 目录存在 / 生成器脚本存在），报错信息能带 `repoRoot` 值与修复提示，比 schema 报错更可操作。
4. 代价：插件管理页的 Config 编辑器不会给出字段提示（status `absent`）；对我们这种单字段私有插件可接受。

方案 B（仅当需要「插件管理页可编辑 + 类型提示」）：手写一个 **Standard Schema v1** 内联对象（约 15 行，无依赖）：

```js
export const Config = {
  '~standard': {
    version: 1, vendor: 'local-openspec-pm-board',
    validate(value) {
      const repoRoot = typeof value?.repoRoot === 'string' ? value.repoRoot.trim() : ''
      const issues = []
      if (!path.isAbsolute(repoRoot)) issues.push({ message: 'repoRoot 必须是绝对路径', path: ['repoRoot'] })
      return issues.length > 0 ? { issues } : { value: { ...value, repoRoot } }
    },
  },
}
```

> 官方所有插件都用 schemastery，但 StandardSchemaV1 是公开标准；**方案 B 未在本 profile 验证过**，若采用必须先做 5 分钟 spike（加 schema → 重启 → `Config.listConfigs` 看 status 是否 `schema`、是否接受 `cordis.patch.yml` 的 config）。

### 7.5 config 生效时机

- config 在 entry 激活时解析；`fiber.update(config)` 可热更（`⟨asar⟩/@deepseek-ai/cordis/src/fiber.ts:727-750`）。但我们的用法是 `apply` 里把 `repoRoot` 闭包进 handler → **改 `repoRoot` 需要重启 DSH（重建 fiber）**；如果希望热更，就把 `repoRoot` 读成可变引用（在 `ctx.on('internal/update')` 或每次请求时从闭包对象读）。一期建议简单化：改 config = 重启。

---

## 8. 风险与推荐数据路径

### 8.1 三个候选对比

| 维度 | (a) Host 路由 + python 子进程（推荐） | (b) Host 路由 + 纯 Node 扫描器 | (c) 构建期静态 JSON（sdd-team 式） |
| --- | --- | --- | --- |
| 新鲜度 | 每次请求/轮询即最新（≈ 0.2s 内） | 同 (a) | 构建时快照；仓库一变就过期 |
| 数据源单一性 | ✅ 复用仓库唯一聚合器（714 行，已被 CI/SOP 使用） | ❌ 重写约 700 行解析 = 第二事实源，长期漂移 | ⚠️ 生成脚本是第二份逻辑（或复用 python 但结果被冻结） |
| 失败模式 | python 缺失/超时/解析失败/仓库漂移 → `{ok:false,error,detail}` + 面板黄条（可降级），路由整体仍在 | 同 (a) 但失败更可诊断（纯 JS） | 无运行时失败；失败=发布时数据错误，面板无法自愈 |
| 依赖 | 本机 `python3`（macOS 自带 `/usr/bin/python3` 3.9.6 实测可用；生成器纯标准库，`generate_delivery_board.py:20-26` 只 import argparse/datetime/glob/os/re/sys） | 无外部运行时 | 无 |
| 安全 | marker 头 + POST-only + 只读 op + 固定 argv（无 shell）+ 超时/输出上限 + 只读仓库 | 同左 | 无请求面（最安全） |
| 性能 | 见 8.2（≈0.12–0.19s/次；30s 轮询 CPU 占用可忽略） | 同量级（无解释器启动，约 30–50ms） | 零运行时成本 |
| 开发效率 | 高：只加 `--json`（≈10 行）+ 一个 handler（≈120 行） | 低：~700 行 TS 重写 + 长期维护 | 中：需要 build 脚本把 JSON 注入 `client.js`（sdd-team 的 `gen_plugin.py` 模式，`dsh-plugins/openspec-sdd-team/scripts/gen_plugin.py`；模板占位 `client.template.js:27-28` 的 `__AGENT_DATA__`） |
| 能支撑「实时 AI 在做」 | 会话状态由 client Hook 提供（与本路径无关） | 同 | 同（但仓库数据是死的） |

### 8.2 性能实测（只读、已清理）

| 测量 | 命令/方法 | 结果 |
| --- | --- | --- |
| 完整 HTML 生成 | `time python3 scripts/generate_delivery_board.py --out /tmp/pmboard.html` | **0.123s**（user 0.061s）；输出 36,286 B；退出码 0；`git status` 前后一致（仅仓库原有 `.gitignore` 修改） |
| 系统 python 兜底 | `time /usr/bin/python3 scripts/generate_delivery_board.py --out /tmp/x.html` | **0.193s**，退出码 0（证明不依赖 homebrew python） |
| `--json` 模式预估（importlib 直接调 scan 函数） | 见下 | 载入 6.2ms + 扫描 33.6ms + `json.dumps` 0.2ms；**JSON 16,460 字节** |
| 轮询开销 | 60s 一次 × 0.2s | ≈ 0.33% 单核；实际建议 60s（面板不可见时暂停） |

> 实测脚本（`python3 - <<'PY'` 只读，无写盘）：
> `spec.loader.exec_module(mod)` → `scan_roadmap/scan_epics/scan_ideas/scan_active_changes/scan_baseline/scan_archives(7)` → `json.dumps(...)`。
> 结果：`json bytes 16460`；`keys = [roadmap, epics, ideas, active, baseline, days, recent, history]`。当前快照：1 个活跃 Epic、0 active change、0 idea、45 条 history（与 `inputs-repo.md` 一致）。

### 8.3 失败模式与降级矩阵（设计）

| 失败 | Host 行为 | 面板行为 |
| --- | --- | --- |
| 路由未注册（Host 未重启/插件未装） | 该路径 404（无 fallback 时） | `fetch` 非 2xx → launcher（照抄 daily-todo） |
| Host 半身报错 | `{ok:false,error}` | 黄条 + 重试 |
| `python3` 不存在 | `ping` 返回 `{py:null}`；`board` 返回 `{ok:false,error:'本机没有可用的 python3…'}` | 黄条提示安装 python3/或切到「手动模式」文案（保留会话区块） |
| 生成器超时（>15s） | SIGKILL/SIGTERM；`{ok:false,error:'生成超时',detail}` | 黄条 + 保留上次数据 + 「重试」 |
| 生成器非 0 退出 | `{ok:false,error,detail.stderrTail}` | 同上，`detail` 可折叠 |
| stdout 非 JSON / 截断 | `lastJsonLine` 抛错 → `{ok:false}` | 同上 |
| 仓库结构漂移导致 scanner 异常 | 同上（`sourceHealth` 里应尽量降级为 warning 而不是整体失败——`inputs-repo.md` §8 已定为数据契约） | 部分区块显示「数据不可用」，其余照常 |
| 面板卸载/切面板 | in-flight abort | 无泄漏（`finally` 清 timer + abort） |

### 8.4 安全评估

- **同源标记头**不是身份认证，但足以挡浏览器跨站 CSRF：自定义头触发 CORS 预检，而 `OPTIONS` 只回 204、**不返回 `Access-Control-Allow-Origin`**（`interview-eval/index.js:1463-1468` 注释；三个 handler 一致），浏览器会拒绝把响应交给跨站页面。
- 路由只接受 **POST + 标记头**；op 白名单只读；**不接受任意路径/命令**（`repoRoot` 来自插件 config，不是请求体）；子进程用 `execFile`（无 shell 拼接）。
- 本机其他进程可直接 POST（localhost 无鉴权）——与 daily-todo/invoice 同级风险，不新增面；PM 看板只读仓库，可接受。
- 生成器本身只读仓库（全部 `open(..., "r")`），默认 `--out` 会写 `docs/governance/delivery_board.html`——**Host 调用必须只用 `--json`（不传 `--out`）**，这是唯一需要守住的写边界。
- 隐私：面板会展示会话标题/等待确认，属本机信息；不联网。

### 8.5 开发体验

- (a) 的改动面：`scripts/generate_delivery_board.py` +6~10 行（`--json`）；新插件 ~4 个文件（`package.json` / `cordis.patch.yml` / `index.js` / `client.js`）+ `locale` + `icon.svg`。
- 调试循环：Host 改动 → 重启 DSH（约几秒）；Client 改动 → 刷新页面即可（`daily-todo/cordis.patch.yml:8-9`）。
- 可用 `python3 scripts/generate_delivery_board.py --out /tmp/x.html` 独立验证生成器；可用 `curl -s -X POST http://127.0.0.1:53024/openspec-pm-board/api -H 'content-type: application/json' -H 'x-dsh-openspec-pm-board: 1' -d '{"op":"ping"}'` 手工验证路由（需带认证 URL 的 cookie/或从页面内 fetch）。

### 8.6 推荐（明确）

> **选 (a)：Host 同源路由 `/openspec-pm-board/api` + `python3 scripts/generate_delivery_board.py --json`（或新的 `scripts/pm_board_scan.py` 复用其扫描函数）。**
> 仓库数据 → Host 子进程 → JSON；AI 实时状态 → 客户端 `useSessions/useSessionStatus`（不走路由）。面板 60s 轮询 + 激活时刷新 + 手动刷新。
> **不做 (b)**（第二事实源）；**(c) 仅作为降级演示**（若某环境没有 python，可退化成「构建期快照 + 只能看会话实时状态」）。
>
> **前置阻塞**：① `--json` 模式落地（6–10 行）；② 安装后重启 DSH 一次；③ live Client Inspect 不可用 → 装好后按 §9.4 复核 occupant/Hook props；④ 若 Lead 决定用「新扫描函数」（`inputs-repo.md` §8 schema），则生成器改造升级为新增 `pm_board_scan.py`（≈ 200–300 行，全部复用现有 `scan_*`），Host/Client 契约不变。

---

## 9. 最小可运行骨架校验（不安装，纯核对）

### 9.1 Host 服务面：**已验证存在**

- `cordis_inspect_query({platform:"host", provider:"Service", method:"listService", input:{service:"webServer"}})` 返回：
  - `access.hardDependency = { inject:["webServer"], expression:"ctx.webServer" }`；
  - `register(route: WebRoute): () => void` 存在；description 写明「Duplicate (kind, path) throws」。
- 本 profile 的 `webserver` 行确实在组合里：`~/.dsh/profiles/desktop/cordis.yml:460-472`（`@deepseek-ai/dsh-host-webserver`，`inject: [webStartup]`，config host/port/tls/compression）。
- 因此 §1.5 骨架的 `ctx.inject(['webServer'], …)` 在当前 DSH 版本可用。

### 9.2 Slot 面：目录已验证；**live inspect 不可用（记录在案）**

- 生成目录（`@deepseek-ai/dsh-cordis-client-runner/lib/client.js`）明确 `main`（keyed/root，保留 `conversation`）与 `sidebar.panellist`（list/root，id/order/label）存在，`standardProps` 含 `useSessions/useSessionStatus/useWorkspaces/usePanelInfo`（§6.1、§4.2）。
- 两次 client 查询失败（原样错误）：
  `Client inspect query Slots.listSubTree timed out after 10000ms…`、`Client inspect query Service.listService timed out after 10000ms…`
  → 结论：**§2/§6 的契约以下面两条为准**：(i) 生成目录（与 Client Inspect 同源，`[推断]` 同源、数据形状一致）；(ii) 9 个已装插件的真实注册代码。装好后的 live 复核见 §9.4。

### 9.3 路由/ID 冲突检查

- 现有 host 路由路径：`/daily-todo/api`、`/interview-eval/api`、`/invoice-organizer/api`（各自 `index.js` 常量）；`/openspec-pm-board/api` 不冲突。
- 现有 panellist id：见 §6.2，无 `openspec-pm-board`；`main` key 无同名。标记头 `x-dsh-openspec-pm-board` 与三个现有头不冲突。
- 版本：DSH **0.2.1-rc.5**，Node **24.21.0**；`@deepseek-ai/dsh-client-*` 同为 0.2.1-rc.5（app 包内）。→ 契约以本版本为准。

### 9.4 安装后验证清单（本轮不执行）

1. **Host**：`Config.listConfigs` 出现 `include:openspec-pm-board`（status `absent` 或 `schema`）——证明 entry 已组合。
2. **路由**：面板内 `callHost('ping')` 成功，返回 `{version, api, py, repoRoot}`。
3. **Slot**：`cordis_inspect_query(client, Slots, listSubTree, {root:'sidebar.panellist'})` → occupants 里出现 `id: openspec-pm-board, order: 21`；`{root:'main'}` → `key: openspec-pm-board`。（需页面已连接）
4. **面板**：点侧边栏 → 主区出现看板；点任一数据区 → 不发请求/不报错；断开 Host（不重启、直接 404 模拟）→ 降级 launcher。
5. **一键开新会话**：点「用 PM Agent 继续这个 Epic」→ 新会话出现、preset 为 `sdd-pm`、prompt 已预填、主区切到 Conversation。
6. **会话实时性**：在另一会话里让 AI 跑起来 → PM 面板「AI 在做」区在数秒内出现该行（无需刷新）。
7. **只读性**：验证 `board` 生成不写仓库（`git status` 前后一致）。

---

## 附录 A · 契约速查

```ts
// Host：路由
ctx.inject(['webServer'], (webCtx) =>
  webCtx.effect(() => webCtx.webServer.register({ kind: 'exact', path: '/openspec-pm-board/api', handler }), 'label'))
// handler(req: http.IncomingMessage, res: http.ServerResponse)
// 约定：OPTIONS 204（无 CORS 头） / POST-only 405 / 标记头缺失 403 / 体过大 413 / 非 JSON 400
//       成功 {ok:true,data}；失败 {ok:false,error,detail?}（HTTP 200）

// Host：子进程
execFile(python, [script, '--json', '--days', '7'], { cwd: repoRoot, timeout: 15000, maxBuffer: 8*1024*1024, env })

// Host：配置
export function apply(ctx, config) { const repoRoot = config?.repoRoot ?? DEFAULT_REPO_ROOT }

// Client：注册
ctx.slots.register({ name: 'main', key: ID, locale: NS }, Pane)                       // main: keyed
ctx.slots.register({ name: 'sidebar.panellist', id: ID, order: 21, label: () => t('panel'), locale: NS }, Icon) // list

// Client：面板 props（root standard hooks）
useSessions((s) => s)            // SessionListState {ids, byId, phase, projectionsBySession}
useSessionStatus((s) => s)       // Map<SessionId,{running, pendingInteraction, completionUnread}>
useWorkspaces((s) => s)          // {items: WorkspaceView[], archivedSessionIds, pinnedSessionIds}
usePanelInfo((s) => s.activePanelId)

// Client：会话行关键字段
row.id / row.displayTitle / row.running / row.blank / row.updatedAt / row.cwd
row.origin ('subagent') / row.parentId / row.title / row.projectionValues.agentPreset

// Client：开新会话
ctx.uiWorkspace.startSession(workspaceId?, { agentPreset?, prompt?, whenDraftExists?: 'keep'|'replace'|'append', clearPreviousDraft? }) : void
// 失败：Workspace toast 'createFailed'（'agent-preset/not-found' 级错误码原样进文案），选择不变；成功自动切 Conversation

// Client：降级
ping(4s) → board(15s) → 失败 launcher/yellow-banner + 重试
```

## 附录 B · 关键证据索引

| 主题 | 证据 |
| --- | --- |
| Host 路由注册/处理/信封 | `/Users/superkkk/MyCoding/dsh-plugins/daily-todo/index.js:2242-2285,2607-2613`；`interview-eval/index.js:1445-1535`；`invoice-organizer/index.js:923-999`；`daily-todo/API.md:5-11,41` |
| WebRoute / 运行时 handler 类型 | `cordis_inspect_query(host:Service)`（webServer）；`⟨asar⟩/@deepseek-ai/dsh-host-webserver/lib/index.js:379-409`；README.zh「注册路由/失败时的行为」 |
| Client bundle / 注册 / 取数 / 降级 | `daily-todo/client.js:16-18,431-487,877-913,970-999,1489-1517`；`daily-todo/package.json:6-30`；`⟨asar⟩/@deepseek-ai/dsh-client-modules/README.zh.md`；`⟨asar⟩/@deepseek-ai/dsh-client-ui-renderer/lib/client.js:664-703,737-768` |
| 子进程先例 | `invoice-organizer/index.js:20-23,73,155-180,183-205`；`daily-todo/bin/feishu.mjs:31-32,236-300` |
| 生成器 | `scripts/generate_delivery_board.py:20-28,28,662-690`；实测见 §8.2 |
| sessions 快照/状态 Hook | `⟨asar⟩/@deepseek-ai/dsh-client-ui-session/lib/client.js:1092-1120,977-993`；`…/dsh-api-session-controller/lib/types/client/sessions/service.js:491-514`；`…/dsh-tool-cordis/lib/types/api-catalog.js:7400-7402,2166-2168`；`…/dsh-cordis-client-runner/lib/client.js:4386-4396,5776-5786` |
| agentPreset 投影/过滤 | `⟨asar⟩/@deepseek-ai/dsh-agent-preset-registry/lib/index.js:47-59`；`⟨asar⟩/…/dsh-client-ui-workspace/lib/client.js:1424,1455`；`~/.dsh/profiles/desktop/cordis.yml:1438-1444`（sdd-pm） |
| startSession 语义/导航/失败 | `⟨asar⟩/…/dsh-client-ui-workspace/lib/client.js:1501-1528,1419-1432,1447-1471,1653-1676,1690-1694,4837`；`⟨asar⟩/…/dsh-cordis-client-runner/lib/client.js:1554,1855,2274-2276`；`⟨asar⟩/…/dsh-client-ui-layout/lib/client.js:118-121` |
| Slot 契约/排序/selectPanel 校验 | `⟨asar⟩/…/dsh-cordis-client-runner/lib/client.js:4373-4408,5749-5794`；`⟨asar⟩/…/dsh-client-ui-sidebar/lib/client.js:569-576,628-635,598-600`；`⟨asar⟩/…/dsh-client-ui-layout/lib/client.js:469-471,624-654` |
| panellist 普查 | §6.2 表（2 shipped + 9 local 的 `client.js` 行号） |
| Config | `⟨asar⟩/@deepseek-ai/cordis/src/registry.ts:100-135,317-331`；`⟨asar⟩/@deepseek-ai/cordis/src/fiber.ts:44-57`；`⟨asar⟩/…/dsh-agent-instructions/lib/index.js:5,26,1223,1448`；`cordis_inspect_query(host:Config)` 结果（daily-todo absent / session-title schema）；`~/.dsh/profiles/desktop/cordis.yml:1254-1255,3225-3226` |
| 静态 JSON 先例（对比项） | `dsh-plugins/openspec-sdd-team/scripts/client.template.js:27-28,396-408`；`README.md:29,38,42`；`cordis.patch.yml:1-7` |
| 版本/环境 | `⟨asar⟩/dsh/package.json`（0.2.1-rc.5）；`/Applications/DeepSeek Harness.app/Contents/Resources/runtime/versions.json`（node 24.21.0）；`/usr/bin/python3 --version`（3.9.6） |
