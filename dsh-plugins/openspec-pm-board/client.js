/**
 * Client half of @local/dsh-openspec-pm-board（浏览器模块：无构建、无 JSX、只 require('react')）。
 *
 * 贡献两处 UI：
 * 1. `sidebar.panellist`：左侧边栏「PM 工作台」入口（id = openspec-pm-board，order 21）；
 * 2. `main`（keyed）：key = openspec-pm-board 的 PM 专属主区面板。
 *
 * 数据只走一条同源只读路由（契约见同目录 API.md）：
 *   POST /openspec-pm-board/api  +  header `x-dsh-openspec-pm-board: 1`  +  body `{ op, ... }`
 *   → `{ ok: true, data }` / `{ ok: false, error }`
 * 仓库数据靠「挂载拉取 + 手动刷新 + 45s 轮询」；AI 会话状态只靠 slot 标准 hook（useSessions /
 * useSessionStatus，observable，不轮询）。所有修改都通过 PM Agent 会话完成，本面板不写任何文件。
 *
 * 路由不可用（未重启、403、非 JSON、超时）时优雅降级为「启动器」：
 * 说明 + 用 PM Agent 直接分析项目进展 + 数据源清单；绝不白屏、不抛未捕获错误。
 */
window.__ModuleLoader__.load({
  id: '@local/dsh-openspec-pm-board',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const PANEL_ID = 'openspec-pm-board';
    const NS = 'pmBoard';
    const API_PATH = '/openspec-pm-board/api';
    const API_HEADER = 'x-dsh-openspec-pm-board';
    const API_HEADER_VALUE = '1';
    const API_VERSION = 1;
    const PLUGIN_VERSION = '0.1.0';
    const AGENT_PRESET = 'sdd-pm';
    const TIMEOUT_PING_MS = 4000;
    const TIMEOUT_SNAPSHOT_MS = 15000;
    const POLL_MS = 45000;
    const TOAST_MS = 5000;
    const COPY_FLASH_MS = 1600;

    /** Bound by apply(); all visible chrome copy goes through `t`. */
    let localeService = null;
    let workspaceService = null;
    let t = function (key) { return key; };
    /** 快照缺 id 时的确定性占位 key（避免渲染期随机数）。 */
    let syntheticIdCounter = 0;

    /* ------------------------------------------------------------------ */
    /* 文案（zh 为源；en 逐 key 镜像）                                       */
    /* ------------------------------------------------------------------ */

    const zh = {
      panel: 'PM 工作台',
      title: 'PM 工作台',
      subtitle: '产品规划与需求侧进展 · 只读聚合，动作走 PM Agent 会话',
      currentPhase: '当前阶段',
      noPhase: '未读到当前阶段',
      phaseProgress: '{done}/{total}',
      phasePrefix: 'Phase',
      phaseDone: '已完成',
      phaseCurrent: '当前',
      phaseFuture: '未来',
      generatedAt: '数据 {time}',
      commitLabel: '提交 {commit}',
      branchLabel: '分支 {branch}',
      gitClean: '工作区干净',
      gitDirty: '工作区有未提交改动',
      btnRefresh: '刷新',
      btnRefreshBusy: '刷新中…',
      btnPmSession: 'PM 会话',
      btnRetry: '重试',
      btnRetryBusy: '重试中…',
      loadingTitle: '正在读取项目进展…',
      loadingHint: '首次扫描通常 0.2–2 秒。',

      liveLabel: 'AI 活动',
      liveRunning: '{count} 个 PM 会话运行中',
      liveNone: '暂无 PM 会话',
      liveUnavailable: '实时会话不可用',
      liveIdle: '空闲',
      liveRunningTag: '运行中',
      liveUnreadTag: '刚完成待看',
      livePendingTag: '等你处理',
      liveJump: '打开会话',
      liveNote: '实时状态来自 DSH 会话 hook，不轮询',

      kpiWaitingConfirm: '待我确认',
      kpiPmTodo: 'PM 待启动',
      kpiAi: 'AI 在做',
      kpiBlocked: '阻塞告警',
      kpiAssets: '资产待复核',
      kpiWaitingSub: '文件 {file} · 实时 {live}',
      kpiPmTodoSub: '可立即开始 {actionable} · 其余被前序阻塞',
      kpiAiSub: '实时 {live} · 推断 {inferred}',
      kpiBlockedSub: '阻塞 {blocked} · 告警 {warnings}',
      kpiAssetsSub: '漂移候选 {drift}',
      filterActive: '筛选：{name}',
      filterClear: '清除',

      queueTitle: '我的行动队列',
      groupBlocked: '阻塞',
      groupWaitingConfirm: '待我确认',
      groupPmTodo: 'PM 待启动',
      groupAi: 'AI 在做',
      groupAssetReview: '资产待复核',
      groupDataHealth: '数据健康',
      emptyBlocked: '没有阻塞项。',
      emptyWaitingConfirm: '当前没有等你确认的产出；下一步是继续 explore。',
      emptyPmTodo: '没有新的 PM 待启动项。',
      pmTodoBlockedNote: '另有 {count} 个阶段被前序阻塞，见 Epic 漏斗。',
      emptyAi: '文件层没有 AI 在做线索；实时会话见顶部活动条。',
      emptyAssetReview: '没有需要复核的知识资产。',
      emptyDataHealth: '数据源没有质量问题。',
      whyLabel: '为什么：',
      openQuestionsLabel: '待收口',
      promptCopiedFallback: '工作区未就绪，已把提示词复制到剪贴板；选好工作区后可手动粘贴。',
      nextLabel: '下一步',
      inferredLabel: '推断·无实时心跳',
      itemsMore: '另有 {count} 项（快照未展开）',

      actContinue: '用 PM Agent 继续',
      actStart: '用 PM Agent 开始',
      actHandle: '用 PM Agent 处理',
      actJump: '打开会话',
      actAnalyzeProject: '用 PM Agent 直接分析项目进展',
      actStartSession: '新建 PM 会话',
      sessionOpened: '已打开 PM 会话：提示词已预填，回车才发送。',
      workspaceMissing: '没有找到仓库路径匹配的 DSH 工作区，按钮已禁用；请先把该仓库注册为工作区。',
      workspaceMissingShort: '未找到匹配工作区',
      workspacePending: '会话将开在最近使用的工作区（尚未拿到仓库路径）。',
      workspaceLoading: '正在读取工作区列表…',
      noWorkspaceService: '当前环境没有可用的会话服务。',
      openSessionUnavailable: '当前 DSH 版本不支持会话跳转。',
      copy: '复制',
      copied: '已复制',
      copyFailed: '复制失败，请手动选择文本。',
      evidenceLabel: '证据',
      artifactLabel: '产物',
      openPathLabel: '相关路径',
      emptyValue: '—',
      reviewUnit: '评审',

      tabEpics: 'Epic 漏斗',
      tabStories: 'Story Spec',
      tabAssets: '业务知识资产',
      tabHealth: '数据健康',

      epicSectionTitle: '活跃 Epic 与阶段漏斗',
      epicEmptyTitle: '当前阶段没有活跃 Epic',
      epicEmptyHint: '先确认路线图阶段计划，或让 PM Agent 梳理下一阶段 Epic。',
      epicArchivedNote: '另有 {count} 个已归档 Epic（默认不在漏斗中展开）',
      epicStagesTitle: '阶段',
      epicClickStage: '点阶段看状态原因与产物',
      phaseBadge: 'Phase {no}',
      stageDetailTitle: '阶段详情',
      stageStatus: '状态',
      stageConfidence: '置信度',
      stageRaw: 'STATUS 原文',
      stageArtifact: '产物路径',
      stageNote: '说明',
      stageRules: '命中规则',
      stageHitl: 'HITL 痕迹',
      stageHitlVisible: '有记录',
      stageHitlInvisible: '无 durable 记录',
      stageWaived: '已授权跳过',
      stageRequired: '必做',
      stageOptional: '条件/可选',
      stageNoDetail: '这个阶段还没有可展开的详情数据。',
      draftStoriesTitle: 'ROADMAP draft Story（未拆分）',
      draftStoriesEmpty: '没有 draft Story。',
      storyStats: 'Story：{total} 个 · 就绪 {ready} · 缺 MUST {missing}',
      noNextAction: '暂无下一步动作。',
      nextActionInfo: '只读提示',

      storyEmptyTitle: '还没有已拆分的 Story',
      storyEmptyHint: 'ROADMAP draft Story 需要先经 storymap 拆成 Story spec；下面是当前 draft。',
      storyNoItems: '当前没有任何 Story 记录。',
      storyTableStory: 'Story',
      storyTablePriority: '优先级',
      storyTableStatus: '状态',
      storyTableReadiness: '就绪度',
      storyTableNext: '下一步',
      storyTableGates: '门禁',
      storyDraftBadge: '未拆分',
      storyMissingMust: '缺 MUST：{list}',
      storyReady: '就绪',
      storyNotReady: '未就绪',
      storyNoPriority: '无优先级',
      storySourceLabel: '来源 {source}',
      storyUnit: '{count} 个 Story',
      storyGatesNone: '无门禁记录',

      assetsSectionTitle: '业务知识资产与规划层',
      assetsEmptyTitle: '没有读到知识资产',
      assetsEmptyHint: 'docs/baseline 与规划层文件可能不存在，或扫描器降级。',
      assetUpdatedAt: '更新于 {time}',
      assetAge: '{days} 天未更新',
      assetAgeUnknown: '无更新日期',
      assetSource: '来源 {source}',
      assetReviewNone: '暂无评审记录',
      assetReviewRecorded: '有评审记录',
      assetCounts: '内容计数',
      assetDriftTitle: '漂移候选 {count}',
      assetDriftNone: '无漂移候选',
      assetFixHint: '建议：{hint}',
      freshnessFresh: '新鲜',
      freshnessAging: '老化',
      freshnessStale: '过期',
      freshnessUnknown: '未知',
      driftHigh: '高',
      driftMedium: '中',
      driftLow: '低',
      governanceTitle: '治理评审',
      governanceNone: '还没有治理评审记录。',
      governanceCount: '{count} 份评审记录',

      healthSectionTitle: '数据健康',
      healthEmptyTitle: '没有数据质量告警',
      healthEmptyHint: '所有数据源解析正常。',
      healthWarningsTitle: '告警（{count}）',
      healthSourcesTitle: '数据源健康',
      healthSourceOk: '正常',
      healthSourceIssue: '有告警',
      healthSeverityBlocker: '阻塞',
      healthSeverityWarning: '告警',
      healthSeverityInfo: '提示',
      healthCodeLabel: '规则',
      healthFixAll: '用 PM Agent 处理数据问题',
      devSideTitle: '开发侧只读',
      devActiveChanges: '活跃 change {count}',
      devArchivedChanges: '归档 change {count}',
      devRecentArchives: '近 {days} 天归档 {count}',
      devLastArchive: '最近归档 {date}',
      devNone: '暂无归档记录。',

      bannerStale: '数据可能过期：最近一次刷新失败（{message}）。',
      bannerDegraded: '扫描器降级：部分数据源不可用，相关状态可能缺失。',
      bannerRetry: '重试',

      launcherTitle: '面板暂时连不上本地 PM 服务',
      launcherBody: '这个面板需要 Host 半身提供的同源只读路由 POST /openspec-pm-board/api（只读聚合仓库进展）。它现在不可用：可能插件刚装好还没重启、Host 半身报错，或当前页面不是本地 Harness 提供的。',
      launcherRouteAlive: '本地路由可达，但这次扫描没有拿到快照。',
      launcherStep1: '1. 如果刚安装或改过 Host 代码：重启 DeepSeek Harness。',
      launcherStep2: '2. 如果已经重启：可以先用 PM Agent 直接分析项目进展，不依赖这个面板。',
      launcherStep3: '3. 也可以点「重试」，面板会重新 ping 一次本地路由。',
      launcherDetail: '错误详情',
      launcherSources: '面板读取的数据源',
      launcherNoWorkspace: '当前环境没有可用的会话服务。',
      launcherPromptHint: '会新开一个 PM 会话并预填分析提示词，回车才发送。',
      launcherPython: 'python3',
      launcherScanner: '扫描器',
      launcherOk: '可用',
      launcherFail: '不可用',
      srcRoadmap: '路线图 / 阶段进度',
      srcRequirements: '需求侧 Epic / STATUS / Story',
      srcChanges: '开发侧 change / verify（只读）',
      srcBaseline: '业务基线 HTML / 设计系统',
      srcGovernance: '治理评审记录',
      srcArchive: '交付归档',

      footerReadonly: '只读看板 · 所有修改通过 PM Agent 会话完成',
      footerSources: '数据来源：ROADMAP / openspec-requirements / openspec/changes(只读) / docs/baseline / verify.md',
      footerVersion: 'v{version}',

      statusPmTodo: 'PM 待启动',
      statusAiInProgress: 'AI 在做',
      statusWaitingConfirm: '待我确认',
      statusConfirmed: '已确认',
      statusHandoff: '已交接',
      statusDev: '开发中',
      statusDone: '已完成',
      statusNa: '不适用',
      statusBlocked: '阻塞',
      statusUnknown: '未知',
      ownerPm: 'PM',
      ownerLead: 'Lead',
      ownerEngineer: 'Engineer',
      ownerQa: 'QA',
      ownerReviewer: 'Reviewer',
      ownerAi: 'AI',
      ownerUser: '你',
      confHigh: '高置信',
      confMedium: '中置信',
      confLow: '低置信·推断',

      interactionApproval: '等待审批',
      interactionQuestion: '等待回答',
      interactionPlanReview: '计划待审',
      interactionGeneric: '等你处理',
      pendingLiveTitle: '实时：{title}',
      pendingLiveGroup: '需你确认的实时会话',

      relativeNow: '刚刚',
      relativeMinutes: '{n} 分钟前',
      relativeHours: '{n} 小时前',
      relativeDays: '{n} 天前',
      timeUnknown: '时间未知',

      toastClose: '关闭',
      errTimeout: '请求超时（本地扫描器可能卡住）',
      errOffline: '连不上本地 PM 服务',
      errInvalid: '本地服务返回了无法解析的内容',
      errBadStatus: '本地服务返回 HTTP {status}',
      errUnknown: '未知错误',
      errBadShape: '快照结构不完整',
      errApiVersion: 'API 版本不一致（面板 {panel} / 服务 {host}），请重启 DSH 后刷新',
      repoUnknown: '未读取到仓库路径',
      noDataYet: '还没有快照数据',

      promptNewSession: '你是 SDD 产品经理（PM）。仓库：{repo}。当前阶段：{phase}。这是只读 PM 工作台发起的会话。请先读 docs/SOPS/SDD_WORKFLOW.md、openspec-requirements/config.yaml 与当前活跃 Epic 的 STATUS.md / research.md，然后告诉我：1) 现在唯一最高优先的 PM 动作；2) 判断依据（引用 STATUS / ROADMAP 证据）；3) 执行它的输入、产出与 HITL 检查点。不要修改任何文件，等我确认。',
      promptEpicStage: '你是 SDD 产品经理（PM）。仓库：{repo}。当前阶段：{phase}。Epic：{epic}（目录 openspec-requirements/epics/{epic}/）。看板状态：{stage} = {status}（置信度 {confidence}）。请先读 STATUS.md、research.md、docs/SOPS/SDD_WORKFLOW.md 与 openspec-requirements/config.yaml，然后按需求侧规范推进 {stage}，期望产出：{artifact}。产出后暂停并给我 HITL 确认清单，不要擅自进入下一步。完成后回报：产出路径 + 覆盖对账 + 待我确认项。',
      promptStory: '你是 SDD 产品经理（PM）。仓库：{repo}。Epic：{epic}。Story：{story}（优先级 {priority}）。当前缺失的 MUST 制品：{missing}。请按 /req:story 的规范补齐业务面 Story spec（story.md）与 test-design.md，写清验收标准、依赖与覆盖对账。产出后暂停并给我 HITL 确认清单，不要进入 handoff。',
      promptAsset: '你是 SDD 产品经理（PM）。仓库：{repo}。请复核业务知识资产：{title}（{path}）。已知漂移候选：{drifts}。请先读对应基线文件与 docs/SOPS/SDD_WORKFLOW.md，给出 baseline sync 判定（sync / no-op）与需要修改的锚点清单，不要直接改文件，等我确认。',
      promptHealth: '你是 SDD 产品经理（PM）。仓库：{repo}。请处理数据健康问题：{code}。证据路径：{path}。请先核对现状，给出最小修复方案与影响面（STATUS / ROADMAP / story-list / 归档），不要直接改文件，等我确认。',
      promptDegraded: '你是 SDD 产品经理（PM）。仓库：{repo}。PM 工作台面板暂时连不上本地只读服务，请直接分析项目进展：读 docs/ROADMAP.md、openspec-requirements/epics/*/STATUS.md、openspec-requirements/ 下的 Epic 目录、docs/baseline 与 openspec/changes/archive。输出：当前阶段与阶段进度、活跃 Epic 及所在阶段、下一 PM 动作、阻塞与数据健康问题。不要修改任何文件，等我确认。',
    };

    const en = {
      panel: 'PM Workbench',
      title: 'PM Workbench',
      subtitle: 'Planning and requirements progress · read-only view, every change goes through the PM Agent',
      currentPhase: 'Current phase',
      noPhase: 'No current phase found',
      phaseProgress: '{done}/{total}',
      phasePrefix: 'Phase',
      phaseDone: 'done',
      phaseCurrent: 'current',
      phaseFuture: 'future',
      generatedAt: 'Data {time}',
      commitLabel: 'commit {commit}',
      branchLabel: 'branch {branch}',
      gitClean: 'working tree clean',
      gitDirty: 'uncommitted changes',
      btnRefresh: 'Refresh',
      btnRefreshBusy: 'Refreshing…',
      btnPmSession: 'PM session',
      btnRetry: 'Retry',
      btnRetryBusy: 'Retrying…',
      loadingTitle: 'Reading project progress…',
      loadingHint: 'The first scan usually takes 0.2–2 seconds.',

      liveLabel: 'AI activity',
      liveRunning: '{count} PM session(s) running',
      liveNone: 'No PM sessions',
      liveUnavailable: 'Live sessions unavailable',
      liveIdle: 'idle',
      liveRunningTag: 'running',
      liveUnreadTag: 'finished, unread',
      livePendingTag: 'waiting on you',
      liveJump: 'Open session',
      liveNote: 'Live state comes from DSH session hooks, no polling',

      kpiWaitingConfirm: 'Waiting on you',
      kpiPmTodo: 'PM to start',
      kpiAi: 'AI working',
      kpiBlocked: 'Blocked / warnings',
      kpiAssets: 'Assets to review',
      kpiWaitingSub: 'files {file} · live {live}',
      kpiPmTodoSub: 'ready to start {actionable} · rest blocked by predecessors',
      kpiAiSub: 'live {live} · inferred {inferred}',
      kpiBlockedSub: 'blocked {blocked} · warnings {warnings}',
      kpiAssetsSub: 'drift candidates {drift}',
      filterActive: 'Filter: {name}',
      filterClear: 'Clear',

      queueTitle: 'My action queue',
      groupBlocked: 'Blocked',
      groupWaitingConfirm: 'Waiting on you',
      groupPmTodo: 'PM to start',
      groupAi: 'AI working',
      groupAssetReview: 'Assets to review',
      groupDataHealth: 'Data health',
      emptyBlocked: 'No blocked items.',
      emptyWaitingConfirm: 'Nothing is waiting for your confirmation; the next step is to continue explore.',
      emptyPmTodo: 'No new PM start items.',
      pmTodoBlockedNote: '{count} stage(s) are blocked by predecessors; see the Epic funnel.',
      emptyAi: 'No file-level AI activity clues; see the live strip above.',
      emptyAssetReview: 'No knowledge assets need review.',
      emptyDataHealth: 'No data-quality issues.',
      whyLabel: 'Why: ',
      openQuestionsLabel: 'Open questions',
      promptCopiedFallback: 'Workspace not ready; the prompt was copied to your clipboard.',
      nextLabel: 'Next',
      inferredLabel: 'inferred · no heartbeat',
      itemsMore: '{count} more item(s) not expanded in this snapshot',

      actContinue: 'Continue with PM Agent',
      actStart: 'Start with PM Agent',
      actHandle: 'Handle with PM Agent',
      actJump: 'Open session',
      actAnalyzeProject: 'Let the PM Agent analyze project progress',
      actStartSession: 'New PM session',
      sessionOpened: 'PM session opened: the prompt is prefilled, press Enter to send.',
      workspaceMissing: 'No DSH workspace matches the repo path, so the button is disabled. Register the repo as a workspace first.',
      workspaceMissingShort: 'No matching workspace',
      workspacePending: 'The session will open in the most recent workspace (repo path not known yet).',
      workspaceLoading: 'Reading the workspace list…',
      noWorkspaceService: 'No session service is available in this environment.',
      openSessionUnavailable: 'This DSH version does not support session jumping.',
      copy: 'Copy',
      copied: 'Copied',
      copyFailed: 'Copy failed; select the text manually.',
      evidenceLabel: 'Evidence',
      artifactLabel: 'Artifacts',
      openPathLabel: 'Related paths',
      emptyValue: '—',
      reviewUnit: 'reviews',

      tabEpics: 'Epic funnel',
      tabStories: 'Story spec',
      tabAssets: 'Knowledge assets',
      tabHealth: 'Data health',

      epicSectionTitle: 'Active epics and stage funnel',
      epicEmptyTitle: 'No active epics in the current phase',
      epicEmptyHint: 'Confirm the roadmap phase plan first, or let the PM Agent outline the next phase epics.',
      epicArchivedNote: '{count} archived epic(s) are not expanded in the funnel by default',
      epicStagesTitle: 'Stages',
      epicClickStage: 'Click a stage to see status reasons and artifacts',
      phaseBadge: 'Phase {no}',
      stageDetailTitle: 'Stage detail',
      stageStatus: 'Status',
      stageConfidence: 'Confidence',
      stageRaw: 'STATUS cell',
      stageArtifact: 'Artifact path',
      stageNote: 'Note',
      stageRules: 'Matched rules',
      stageHitl: 'HITL trace',
      stageHitlVisible: 'recorded',
      stageHitlInvisible: 'no durable trace',
      stageWaived: 'waived',
      stageRequired: 'required',
      stageOptional: 'conditional',
      stageNoDetail: 'No detail data for this stage yet.',
      draftStoriesTitle: 'ROADMAP draft stories (unsplit)',
      draftStoriesEmpty: 'No draft stories.',
      storyStats: 'Stories: {total} · ready {ready} · missing MUST {missing}',
      noNextAction: 'No next action.',
      nextActionInfo: 'Read-only note',

      storyEmptyTitle: 'No split stories yet',
      storyEmptyHint: 'ROADMAP draft stories must first be split by storymap; the current drafts are listed below.',
      storyNoItems: 'No story records.',
      storyTableStory: 'Story',
      storyTablePriority: 'Priority',
      storyTableStatus: 'Status',
      storyTableReadiness: 'Readiness',
      storyTableNext: 'Next',
      storyTableGates: 'Gates',
      storyDraftBadge: 'unsplit',
      storyMissingMust: 'missing MUST: {list}',
      storyReady: 'ready',
      storyNotReady: 'not ready',
      storyNoPriority: 'no priority',
      storySourceLabel: 'source {source}',
      storyUnit: '{count} story(ies)',
      storyGatesNone: 'no gate record',

      assetsSectionTitle: 'Knowledge assets and planning docs',
      assetsEmptyTitle: 'No knowledge assets found',
      assetsEmptyHint: 'docs/baseline or planning files may be missing, or the scanner is degraded.',
      assetUpdatedAt: 'updated {time}',
      assetAge: '{days} days stale',
      assetAgeUnknown: 'no update date',
      assetSource: 'source {source}',
      assetReviewNone: 'no review record',
      assetReviewRecorded: 'review recorded',
      assetCounts: 'content counts',
      assetDriftTitle: '{count} drift candidate(s)',
      assetDriftNone: 'no drift candidates',
      assetFixHint: 'Suggested: {hint}',
      freshnessFresh: 'fresh',
      freshnessAging: 'aging',
      freshnessStale: 'stale',
      freshnessUnknown: 'unknown',
      driftHigh: 'high',
      driftMedium: 'medium',
      driftLow: 'low',
      governanceTitle: 'Governance reviews',
      governanceNone: 'No governance review records yet.',
      governanceCount: '{count} review record(s)',

      healthSectionTitle: 'Data health',
      healthEmptyTitle: 'No data-quality warnings',
      healthEmptyHint: 'All data sources parsed successfully.',
      healthWarningsTitle: 'Warnings ({count})',
      healthSourcesTitle: 'Source health',
      healthSourceOk: 'ok',
      healthSourceIssue: 'issues',
      healthSeverityBlocker: 'blocker',
      healthSeverityWarning: 'warning',
      healthSeverityInfo: 'info',
      healthCodeLabel: 'Rule',
      healthFixAll: 'Fix data problems with PM Agent',
      devSideTitle: 'Delivery side (read-only)',
      devActiveChanges: 'active changes {count}',
      devArchivedChanges: 'archived changes {count}',
      devRecentArchives: '{count} archived in {days} days',
      devLastArchive: 'last archive {date}',
      devNone: 'No archive records.',

      bannerStale: 'Data may be stale: the last refresh failed ({message}).',
      bannerDegraded: 'Scanner degraded: some sources are unavailable, related statuses may be missing.',
      bannerRetry: 'Retry',

      launcherTitle: 'The panel cannot reach the local PM service',
      launcherBody: 'This panel needs the same-origin read-only route POST /openspec-pm-board/api provided by the Host half. It is unavailable now: the plugin may be newly installed without a restart, the Host half may have failed, or this page may not be served by the local Harness.',
      launcherRouteAlive: 'The local route is reachable, but this scan did not return a snapshot.',
      launcherStep1: '1. If you just installed the plugin or changed Host code: restart DeepSeek Harness.',
      launcherStep2: '2. If you already restarted: let the PM Agent analyze project progress directly, without this panel.',
      launcherStep3: '3. You can also press Recheck to ping the local route again.',
      launcherDetail: 'Error detail',
      launcherSources: 'Data sources this panel reads',
      launcherNoWorkspace: 'No session service is available in this environment.',
      launcherPromptHint: 'A new PM session opens with the analysis prompt prefilled; press Enter to send.',
      launcherPython: 'python3',
      launcherScanner: 'Scanner',
      launcherOk: 'available',
      launcherFail: 'unavailable',
      srcRoadmap: 'Roadmap / phase progress',
      srcRequirements: 'Requirements epics / STATUS / stories',
      srcChanges: 'Delivery changes / verify (read-only)',
      srcBaseline: 'Baseline HTML / design system',
      srcGovernance: 'Governance review records',
      srcArchive: 'Delivery archives',

      footerReadonly: 'Read-only board · every change goes through a PM Agent session',
      footerSources: 'Sources: ROADMAP / openspec-requirements / openspec/changes (read-only) / docs/baseline / verify.md',
      footerVersion: 'v{version}',

      statusPmTodo: 'PM to start',
      statusAiInProgress: 'AI working',
      statusWaitingConfirm: 'Waiting on you',
      statusConfirmed: 'Confirmed',
      statusHandoff: 'Handed off',
      statusDev: 'In development',
      statusDone: 'Done',
      statusNa: 'N/A',
      statusBlocked: 'Blocked',
      statusUnknown: 'Unknown',
      ownerPm: 'PM',
      ownerLead: 'Lead',
      ownerEngineer: 'Engineer',
      ownerQa: 'QA',
      ownerReviewer: 'Reviewer',
      ownerAi: 'AI',
      ownerUser: 'You',
      confHigh: 'high confidence',
      confMedium: 'medium confidence',
      confLow: 'low confidence · inferred',

      interactionApproval: 'waiting for approval',
      interactionQuestion: 'waiting for an answer',
      interactionPlanReview: 'plan awaiting review',
      interactionGeneric: 'waiting on you',
      pendingLiveTitle: 'Live: {title}',
      pendingLiveGroup: 'Live sessions waiting on you',

      relativeNow: 'just now',
      relativeMinutes: '{n} min ago',
      relativeHours: '{n} h ago',
      relativeDays: '{n} d ago',
      timeUnknown: 'time unknown',

      toastClose: 'Dismiss',
      errTimeout: 'Request timed out (the local scanner may be stuck)',
      errOffline: 'Cannot reach the local PM service',
      errInvalid: 'The local service returned unparseable content',
      errBadStatus: 'The local service returned HTTP {status}',
      errUnknown: 'Unknown error',
      errBadShape: 'Snapshot shape is incomplete',
      errApiVersion: 'API version mismatch (panel {panel} / service {host}); restart DSH and refresh',
      repoUnknown: 'repo path not known',
      noDataYet: 'No snapshot data yet',

      promptNewSession: 'You are an SDD product manager (PM). Repository: {repo}. Current phase: {phase}. This session was started from the read-only PM workbench. First read docs/SOPS/SDD_WORKFLOW.md, openspec-requirements/config.yaml, and the active epic STATUS.md / research.md, then tell me: 1) the single highest-priority PM action now; 2) the evidence behind it (cite STATUS / ROADMAP); 3) the inputs, outputs and HITL checkpoints for executing it. Do not modify any file; wait for my confirmation.',
      promptEpicStage: 'You are an SDD product manager (PM). Repository: {repo}. Current phase: {phase}. Epic: {epic} (directory openspec-requirements/epics/{epic}/). Board state: {stage} = {status} (confidence {confidence}). First read STATUS.md, research.md, docs/SOPS/SDD_WORKFLOW.md and openspec-requirements/config.yaml, then advance {stage} per the requirements-side workflow; expected artifact: {artifact}. Pause after producing it and give me a HITL checklist; do not proceed to the next stage. Report back: artifact path + coverage reconciliation + items needing my confirmation.',
      promptStory: 'You are an SDD product manager (PM). Repository: {repo}. Epic: {epic}. Story: {story} (priority {priority}). Missing MUST artifacts: {missing}. Follow /req:story to complete the business-facing story spec (story.md) and test-design.md with acceptance criteria, dependencies and coverage reconciliation. Pause after producing them and give me a HITL checklist; do not enter handoff.',
      promptAsset: 'You are an SDD product manager (PM). Repository: {repo}. Review the knowledge asset: {title} ({path}). Known drift candidates: {drifts}. Read the baseline file and docs/SOPS/SDD_WORKFLOW.md first, then give a baseline sync verdict (sync / no-op) and the anchor list to change. Do not edit files; wait for my confirmation.',
      promptHealth: 'You are an SDD product manager (PM). Repository: {repo}. Handle the data-health issue: {code}. Evidence path: {path}. Verify the current state first, then propose the minimal fix and its impact (STATUS / ROADMAP / story-list / archives). Do not edit files; wait for my confirmation.',
      promptDegraded: 'You are an SDD product manager (PM). Repository: {repo}. The PM workbench panel cannot reach the local read-only service, so analyze project progress directly: read docs/ROADMAP.md, openspec-requirements/epics/*/STATUS.md, the epic directories under openspec-requirements/, docs/baseline and openspec/changes/archive. Report: current phase and progress, active epics and their stage, the next PM action, blockers and data-health issues. Do not modify any file; wait for my confirmation.',
    };

    /* ------------------------------------------------------------------ */
    /* 小工具                                                              */
    /* ------------------------------------------------------------------ */

    function pad2(value) {
      return value < 10 ? '0' + String(value) : String(value);
    }

    function asArray(value) {
      return Array.isArray(value) ? value : [];
    }

    function asObject(value) {
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    }

    function asString(value) {
      return typeof value === 'string' ? value : '';
    }

    function asNumber(value) {
      return typeof value === 'number' && isFinite(value) ? value : null;
    }

    function stringList(value) {
      return asArray(value).filter(function (entry) { return typeof entry === 'string' && entry.length > 0; });
    }

    function numberMap(value) {
      const source = asObject(value);
      const out = {};
      Object.keys(source).forEach(function (key) {
        const parsed = asNumber(source[key]);
        if (parsed !== null) out[key] = parsed;
      });
      return out;
    }

    function numberOr(value, fallback) {
      const parsed = asNumber(value);
      return parsed === null ? fallback : parsed;
    }

    function hasOwn(object, key) {
      return Object.prototype.hasOwnProperty.call(object, key);
    }

    function interpolate(template, vars) {
      if (typeof template !== 'string' || template.length === 0) return '';
      return template.replace(/\{(\w+)\}/g, function (match, key) {
        return vars && hasOwn(vars, key) ? String(vars[key]) : match;
      });
    }

    function basename(path) {
      const value = asString(path).replace(/\/+$/, '');
      if (!value) return '';
      const parts = value.split('/');
      return parts[parts.length - 1] || value;
    }

    function formatDateTime(value) {
      const raw = asString(value);
      if (!raw) return '';
      const date = new Date(raw);
      if (isNaN(date.getTime())) return raw;
      return String(date.getFullYear()) + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate()) +
        ' ' + pad2(date.getHours()) + ':' + pad2(date.getMinutes()) + ':' + pad2(date.getSeconds());
    }

    function formatRelative(timestamp) {
      const ms = asNumber(timestamp);
      if (ms === null) return t('timeUnknown');
      const diff = Date.now() - ms;
      if (!isFinite(diff)) return t('timeUnknown');
      const abs = Math.abs(diff);
      if (abs < 60000) return t('relativeNow');
      if (abs < 3600000) return interpolate(t('relativeMinutes'), { n: String(Math.floor(abs / 60000)) });
      if (abs < 86400000) return interpolate(t('relativeHours'), { n: String(Math.floor(abs / 3600000)) });
      return interpolate(t('relativeDays'), { n: String(Math.floor(abs / 86400000)) });
    }

    /** Host 不可用时的统一错误：所有 fetch/解析失败都收敛到这里。 */
    function hostError(message) {
      const error = new Error(message);
      error.name = 'PmBoardHostError';
      return error;
    }

    function messageOf(failure) {
      if (!failure) return t('errUnknown');
      const message = typeof failure.message === 'string' ? failure.message.trim() : '';
      return message.length > 0 ? message : t('errUnknown');
    }

    /* ------------------------------------------------------------------ */
    /* 与 Host 的唯一次通信                                                 */
    /* ------------------------------------------------------------------ */

    /**
     * POST /openspec-pm-board/api。
     * @param {string} op - ping | snapshot | refresh
     * @param {object} [payload] - 附加参数（如 { force: true }）
     * @param {{signal?: AbortSignal, timeoutMs?: number}} [options]
     * @returns {Promise<any>} body.data
     */
    async function callHost(op, payload, options) {
      const opts = options || {};
      const timeoutMs = Number(opts.timeoutMs) > 0 ? Number(opts.timeoutMs) : TIMEOUT_SNAPSHOT_MS;
      const controller = new AbortController();
      let timedOut = false;
      const timer = window.setTimeout(function () {
        timedOut = true;
        controller.abort();
      }, timeoutMs);
      const external = opts.signal;
      function forwardAbort() {
        controller.abort();
      }
      if (external) {
        if (external.aborted) controller.abort();
        else external.addEventListener('abort', forwardAbort);
      }
      const body = Object.assign({ op: op }, payload || {});
      try {
        let response;
        try {
          response = await window.fetch(API_PATH, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              [API_HEADER]: API_HEADER_VALUE,
            },
            body: JSON.stringify(body),
            signal: controller.signal,
            credentials: 'same-origin',
          });
        } catch (failure) {
          if (timedOut) throw hostError(t('errTimeout'));
          if (failure && failure.name === 'AbortError') throw failure;
          throw hostError(t('errOffline'));
        }
        if (!response || !response.ok) {
          let detail = '';
          try {
            const errorBody = await response.json();
            if (errorBody && typeof errorBody.error === 'string' && errorBody.error.length > 0) detail = errorBody.error;
          } catch (failure) { /* status-only message is enough */ }
          throw hostError(detail || interpolate(t('errBadStatus'), { status: response ? response.status : '?' }));
        }
        let parsed = null;
        try {
          parsed = await response.json();
        } catch (failure) {
          throw hostError(t('errInvalid'));
        }
        if (!parsed || parsed.ok !== true) {
          const reason = parsed && typeof parsed.error === 'string' && parsed.error.length > 0
            ? parsed.error
            : t('errUnknown');
          throw hostError(reason);
        }
        return parsed.data;
      } finally {
        window.clearTimeout(timer);
        if (external) external.removeEventListener('abort', forwardAbort);
      }
    }

    async function copyText(text) {
      try {
        if (typeof navigator === 'undefined' || !navigator.clipboard) return false;
        if (typeof navigator.clipboard.writeText !== 'function') return false;
        if (!text) return false;
        await navigator.clipboard.writeText(String(text));
        return true;
      } catch (failure) {
        return false;
      }
    }

    /* ------------------------------------------------------------------ */
    /* 小工具：语言刷新 / toast                                             */
    /* ------------------------------------------------------------------ */

    function useLocaleRevision() {
      const [revision, setRevision] = React.useState(0);
      React.useEffect(function () {
        if (!localeService || typeof localeService.subscribe !== 'function') return undefined;
        return localeService.subscribe(function () {
          setRevision(function (value) { return value + 1; });
        });
      }, []);
      return revision;
    }

    function useToasts() {
      const [toasts, setToasts] = React.useState([]);
      const seq = React.useRef(0);
      const timers = React.useRef([]);
      React.useEffect(function () {
        return function () {
          timers.current.forEach(function (timer) { window.clearTimeout(timer); });
          timers.current = [];
        };
      }, []);
      function dismiss(id) {
        setToasts(function (list) {
          return list.filter(function (entry) { return entry.id !== id; });
        });
      }
      function push(text, kind) {
        if (!text) return;
        seq.current += 1;
        const id = seq.current;
        setToasts(function (list) {
          return list.concat([{ id: id, kind: kind || 'info', text: String(text) }]).slice(-3);
        });
        timers.current.push(window.setTimeout(function () { dismiss(id); }, TOAST_MS));
      }
      return { toasts: toasts, push: push, dismiss: dismiss };
    }

    /* ------------------------------------------------------------------ */
    /* 标准 props 缺失时的无害兜底（保持 hook 调用次数稳定）                 */
    /* ------------------------------------------------------------------ */

    const EMPTY_SESSIONS = { ids: [], byId: {}, phase: 'ready', projectionsBySession: {} };
    const EMPTY_STATUS = new Map();
    const EMPTY_WORKSPACES = { items: [], archivedSessionIds: [], pinnedSessionIds: [] };

    function useNoopSessions(selector) {
      return selector(EMPTY_SESSIONS);
    }

    function useNoopStatus(selector) {
      return selector(EMPTY_STATUS);
    }

    function useNoopWorkspaces(selector) {
      return selector(EMPTY_WORKSPACES);
    }

    /* ------------------------------------------------------------------ */
    /* 状态归一化（快照字段可能缺失/降级，一切可防御）                       */
    /* ------------------------------------------------------------------ */

    const BOARD_KEYS = ['pmTodo', 'aiInProgress', 'waitingConfirm', 'confirmed', 'handoffDone', 'devInProgress', 'done', 'na', 'blocked', 'unknown'];
    const STAGE_ORDER = ['research', 'explore', 'prototype', 'arch', 'storymap', 'stories', 'test-design'];
    const CONFIDENCE_LEVELS = ['high', 'medium', 'low'];
    const FRESHNESS_LEVELS = ['fresh', 'aging', 'stale', 'unknown'];
    const SEVERITY_LEVELS = ['blocker', 'warning', 'info'];

    const STATUS_ALIASES = {
      'pm-todo': 'pmTodo',
      pmtodo: 'pmTodo',
      'ai-in-progress': 'aiInProgress',
      aiinprogress: 'aiInProgress',
      'waiting-confirm': 'waitingConfirm',
      waitingconfirm: 'waitingConfirm',
      'handoff-done': 'handoffDone',
      handoffdone: 'handoffDone',
      'dev-in-progress': 'devInProgress',
      devinprogress: 'devInProgress',
      na: 'na',
      none: 'na',
      blocked: 'blocked',
      warning: 'blocked',
      unknown: 'unknown',
    };

    function canonicalStatus(raw) {
      const value = asString(raw);
      if (!value) return 'unknown';
      if (BOARD_KEYS.indexOf(value) >= 0) return value;
      return STATUS_ALIASES[value.toLowerCase()] || 'unknown';
    }

    function canonicalConfidence(raw) {
      const value = asString(raw);
      return CONFIDENCE_LEVELS.indexOf(value) >= 0 ? value : 'low';
    }

    function canonicalFreshness(raw) {
      const value = asString(raw);
      return FRESHNESS_LEVELS.indexOf(value) >= 0 ? value : 'unknown';
    }

    function canonicalSeverity(raw, fallback) {
      const value = asString(raw);
      if (SEVERITY_LEVELS.indexOf(value) >= 0) return value;
      return fallback || 'info';
    }

    function normalizeAction(raw) {
      const action = asObject(raw);
      const kind = asString(action.kind);
      return {
        id: asString(action.id),
        label: asString(action.label),
        kind: ['session', 'command', 'info'].indexOf(kind) >= 0 ? kind : 'session',
        command: asString(action.command),
        prompt: asString(action.prompt),
        agentPreset: asString(action.agentPreset),
        requiresHitl: action.requiresHitl === true,
        enabled: action.enabled !== false,
        etaMinutes: asNumber(action.etaMinutes),
        blockedBy: stringList(action.blockedBy),
      };
    }

    function normalizeOptionalAction(raw) {
      if (!raw || typeof raw !== 'object') return null;
      const action = normalizeAction(raw);
      if (!action.label && !action.id && !action.command && !action.prompt) return null;
      return action;
    }

    function normalizeEvidence(raw) {
      const evidence = asObject(raw);
      return {
        path: asString(evidence.path),
        kind: asString(evidence.kind),
        locator: asString(evidence.locator),
        value: asString(evidence.value),
      };
    }

    function normalizeBlocker(raw) {
      const blocker = asObject(raw);
      return {
        id: asString(blocker.id),
        code: asString(blocker.code),
        severity: canonicalSeverity(blocker.severity, 'warning'),
        message: asString(blocker.message),
        evidence: asArray(blocker.evidence).map(normalizeEvidence),
      };
    }

    function normalizeItem(raw, fallbackStatus) {
      const item = asObject(raw);
      const links = asObject(item.links);
      return {
        id: asString(item.id) || 'item-' + String(syntheticIdCounter += 1),
        kind: asString(item.kind) || 'stage',
        title: asString(item.title),
        subtitle: asString(item.subtitle),
        owner: asString(item.owner) || 'pm',
        status: canonicalStatus(asString(item.status) || fallbackStatus),
        statusConfidence: canonicalConfidence(item.statusConfidence || item.confidence),
        statusBecause: stringList(item.statusBecause),
        hitlWaived: item.hitlWaived === true,
        nextAction: normalizeOptionalAction(item.nextAction),
        blockers: asArray(item.blockers).map(normalizeBlocker),
        evidence: asArray(item.evidence).map(normalizeEvidence),
        links: { openPath: asString(links.openPath), commandPath: asString(links.commandPath) },
        tags: stringList(item.tags),
        meta: asObject(item.meta),
      };
    }

    function columnFallbackTitle(key) {
      const map = {
        pmTodo: 'groupPmTodo',
        aiInProgress: 'groupAi',
        waitingConfirm: 'groupWaitingConfirm',
        blocked: 'groupBlocked',
        confirmed: 'statusConfirmed',
        handoffDone: 'statusHandoff',
        devInProgress: 'statusDev',
        done: 'statusDone',
        na: 'statusNa',
        unknown: 'statusUnknown',
      };
      return t(map[key] || 'statusUnknown');
    }

    function normalizeColumn(key, raw) {
      const column = asObject(raw);
      const items = asArray(column.items).map(function (entry) { return normalizeItem(entry, key); });
      return {
        key: key,
        title: asString(column.title) || columnFallbackTitle(key),
        order: numberOr(column.order, 0),
        count: numberOr(column.count, items.length),
        items: items,
      };
    }

    function normalizeCurrentPhase(raw) {
      if (!raw || typeof raw !== 'object') return null;
      const phase = asObject(raw);
      const no = asNumber(phase.no);
      return {
        no: no === null ? null : no,
        name: asString(phase.name),
        status: asString(phase.status) || 'current',
      };
    }

    function normalizeProgress(raw, phases) {
      const progress = asObject(raw);
      const doneRaw = numberOr(progress.done, null);
      const totalRaw = numberOr(progress.total, phases.length);
      const done = doneRaw === null
        ? phases.filter(function (phase) { return phase.status === 'done'; }).length
        : doneRaw;
      const total = totalRaw === null || totalRaw <= 0 ? phases.length : totalRaw;
      const percent = numberOr(progress.percent, total > 0 ? Math.round((done / total) * 100) : 0);
      return { done: done, total: total, percent: percent };
    }

    function normalizeDraftStory(raw, index) {
      const story = asObject(raw);
      const priority = asString(story.priority);
      return {
        storyId: asString(story.storyId) || asString(story.id) || 'draft-' + String(index),
        title: asString(story.title),
        priority: ['P0', 'P1', 'P2'].indexOf(priority) >= 0 ? priority : null,
      };
    }

    function normalizePhase(raw, index) {
      const phase = asObject(raw);
      const status = asString(phase.status);
      return {
        no: numberOr(phase.no, index + 1),
        name: asString(phase.name),
        status: ['done', 'current', 'future'].indexOf(status) >= 0 ? status : 'future',
        draftStories: asArray(phase.draftStories).map(normalizeDraftStory),
        plannedEpics: asArray(phase.plannedEpics).map(function (entry) {
          const epic = asObject(entry);
          return { key: asString(epic.key), title: asString(epic.title), registered: epic.registered === true, enteredRequirements: epic.enteredRequirements === true };
        }),
        exitCriteria: stringList(phase.exitCriteria),
        inScope: stringList(phase.inScope),
        outOfScope: stringList(phase.outOfScope),
        evidence: asArray(phase.evidence).map(normalizeEvidence),
      };
    }

    function normalizeStage(raw) {
      const stage = asObject(raw);
      const key = asString(stage.key) || asString(stage.stage);
      const hitl = asObject(stage.hitl);
      return {
        key: key,
        stage: key,
        label: asString(stage.title) || asString(stage.label) || key,
        status: canonicalStatus(stage.status),
        confidence: canonicalConfidence(stage.confidence),
        ruleIds: stringList(stage.ruleIds),
        cellRaw: asString(stage.cellRaw),
        artifacts: stringList(stage.artifacts),
        required: stage.required === true,
        artifact: asString(stage.artifact),
        artifactPath: asString(stage.artifactPath),
        note: asString(stage.note),
        statusBecause: stringList(stage.statusBecause),
        hitl: {
          visible: hitl.visible === true,
          tracePath: asString(hitl.tracePath),
          traceKind: asString(hitl.traceKind),
          confirmed: hitl.confirmed === true,
          confirmedAt: asString(hitl.confirmedAt),
          waived: hitl.waived === true,
        },
        nextAction: normalizeOptionalAction(stage.nextAction),
      };
    }

    function normalizeEpic(raw, index) {
      const epic = asObject(raw);
      const lifecycle = asObject(epic.lifecycle);
      const storyStats = asObject(epic.storyStats);
      const key = asString(epic.key) || 'epic-' + String(index + 1);
      return {
        key: key,
        title: asString(epic.title) || key,
        dir: asString(epic.dir),
        phaseNo: asNumber(epic.phaseNo),
        lifecycle: {
          active: lifecycle.active === true,
          allHandoff: lifecycle.allHandoff === true,
          allDone: lifecycle.allDone === true,
          archived: lifecycle.archived === true,
        },
        status: asString(epic.status) || 'active',
        stages: asArray(epic.stages).map(normalizeStage),
        storyStats: {
          total: numberOr(storyStats.total, 0),
          ready: numberOr(storyStats.ready, 0),
          handoff: numberOr(storyStats.handoff, 0),
          inDev: numberOr(storyStats.inDev, 0),
          done: numberOr(storyStats.done, 0),
          missingMust: numberOr(storyStats.missingMust, 0),
        },
        nextAction: normalizeOptionalAction(epic.nextAction),
        blockers: asArray(epic.blockers).map(normalizeBlocker),
        evidence: asArray(epic.evidence).map(normalizeEvidence),
        meta: asObject(epic.meta),
      };
    }

    function normalizeStory(raw, index) {
      const story = asObject(raw);
      const artifacts = asObject(story.artifacts);
      const readiness = asObject(story.readiness);
      const handoff = asObject(story.handoff);
      const review = asObject(story.review);
      const gates = story.gates && typeof story.gates === 'object' ? asObject(story.gates) : null;
      const priority = asString(story.priority);
      const id = asString(story.id) || asString(story.storyId) || 'story-' + String(index + 1);
      return {
        id: id,
        epicKey: asString(story.epicKey),
        title: asString(story.title) || id,
        priority: ['P0', 'P1', 'P2'].indexOf(priority) >= 0 ? priority : null,
        source: asString(story.source),
        status: canonicalStatus(story.status),
        confidence: canonicalConfidence(story.confidence),
        artifacts: {
          story: artifacts.story === true,
          testDesign: artifacts.testDesign === true,
          prototypeGate: asString(artifacts.prototypeGate),
        },
        readiness: {
          ready: readiness.ready === true,
          missingMust: stringList(readiness.missingMust),
          missingOptional: stringList(readiness.missingOptional),
        },
        handoff: {
          status: asString(handoff.status) || null,
          changeName: asString(handoff.changeName) || null,
          changeExists: handoff.changeExists === true,
          changePhase: asString(handoff.changePhase) || 'none',
          devArchiveDate: asString(handoff.devArchiveDate) || null,
          storyListStatus: asString(handoff.storyListStatus) || null,
        },
        gates: gates === null ? null : {
          allPass: gates.allPass === true,
          schema: asString(gates.schema),
          node: asString(gates.node),
          python: asString(gates.python),
          frontend: asString(gates.frontend),
          e2e: asString(gates.e2e),
          conclusion: asString(gates.conclusion),
        },
        review: {
          verdict: asString(review.verdict) || null,
          p0: numberOr(review.p0, 0),
          p1: numberOr(review.p1, 0),
          path: asString(review.path) || null,
        },
        dependsOn: stringList(story.dependsOn),
        nextAction: normalizeOptionalAction(story.nextAction),
        blockers: asArray(story.blockers).map(normalizeBlocker),
        evidence: asArray(story.evidence).map(normalizeEvidence),
      };
    }

    function normalizeDriftCandidate(raw, index) {
      const drift = asObject(raw);
      return {
        code: asString(drift.code) || 'drift-' + String(index + 1),
        severity: canonicalSeverity(drift.severity, 'medium'),
        message: asString(drift.message),
        evidence: asArray(drift.evidence).map(normalizeEvidence),
        fixHint: asString(drift.fixHint),
      };
    }

    function normalizeAsset(raw, index) {
      const asset = asObject(raw);
      const review = asObject(asset.review);
      const id = asString(asset.assetId) || asString(asset.id) || 'asset-' + String(index + 1);
      const reviewStatus = asString(asset.reviewStatus) || asString(review.status);
      return {
        id: id,
        title: asString(asset.title) || id,
        kind: asString(asset.kind),
        path: asString(asset.path),
        updatedAt: asString(asset.updatedAt) || null,
        updatedAtSource: asString(asset.updatedAtSource) || 'none',
        ageDays: asNumber(asset.ageDays),
        freshness: canonicalFreshness(asset.freshness),
        contentCounts: numberMap(asset.contentCounts),
        driftCandidates: asArray(asset.driftCandidates).map(normalizeDriftCandidate),
        reviewStatus: reviewStatus === 'recorded' ? 'recorded' : 'none',
        reviewPath: asString(review.lastPath) || null,
        reviewAt: asString(review.lastAt) || null,
        nextAction: normalizeOptionalAction(asset.nextAction),
        evidence: asArray(asset.evidence).map(normalizeEvidence),
      };
    }

    function normalizeWarning(raw, index) {
      const warning = asObject(raw);
      return {
        code: asString(warning.code) || 'warning-' + String(index + 1),
        severity: canonicalSeverity(warning.severity, 'warning'),
        message: asString(warning.message),
        itemId: asString(warning.itemId),
        evidence: asArray(warning.evidence).map(normalizeEvidence),
      };
    }

    function normalizeSourceHealth(raw, index) {
      const source = asObject(raw);
      return {
        id: asString(source.id) || 'source-' + String(index + 1),
        path: asString(source.path),
        ok: source.ok !== false,
        issues: stringList(source.issues),
        counts: numberMap(source.counts),
      };
    }

    function normalizeArchiveEntry(raw, index) {
      const entry = asObject(raw);
      const gates = asObject(entry.gates);
      const gateResult = asObject(entry.gateResult);
      return {
        name: asString(entry.name) || asString(entry.key) || 'archive-' + String(index + 1),
        type: asString(entry.type) || asString(entry.typeKey),
        date: asString(entry.date),
        allPass: gates.allPass === true || gateResult.all_pass === true || gateResult.allPass === true,
      };
    }

    function normalizeArchives(raw) {
      const block = asObject(raw);
      const totals = asObject(block.totals);
      const recentRaw = asArray(block.recent).map(normalizeArchiveEntry);
      const history = asArray(block.history).map(normalizeArchiveEntry);
      const recent = recentRaw;
      const lastDate = asString(block.lastDate) || (history.length > 0 ? history[0].date : '');
      return {
        recent: recent,
        recentCount: numberOr(block.recentCount, numberOr(totals.recentCount, recentRaw.length)),
        historyCount: numberOr(block.historyCount, numberOr(totals.changes, asArray(block.changes).length)),
        lastDate: lastDate,
        days: numberOr(block.days, 30),
        requirementsEpics: asArray(block.requirementsEpics).length,
        storyLists: asArray(block.storyLists).length,
      };
    }

    function normalizeSnapshot(raw) {
      const snapshot = asObject(raw);
      const repo = asObject(snapshot.repo);
      const generator = asObject(snapshot.generator);
      const boardsRaw = asObject(snapshot.boards);
      const boards = {};
      BOARD_KEYS.forEach(function (key) {
        boards[key] = normalizeColumn(key, boardsRaw[key]);
      });
      const phases = asArray(snapshot.phases).map(normalizePhase);
      const epics = asArray(snapshot.epics).map(normalizeEpic);
      const stories = asArray(snapshot.stories).map(normalizeStory);
      const assets = asArray(snapshot.assets).map(normalizeAsset);
      const warnings = asArray(snapshot.warnings).map(normalizeWarning);
      const sourceHealth = asArray(snapshot.sourceHealth).map(normalizeSourceHealth);

      const summary = asObject(snapshot.summary);
      const countsRaw = asObject(summary.counts);
      const counts = {};
      BOARD_KEYS.forEach(function (key) {
        counts[key] = numberOr(countsRaw[key], boards[key].count);
      });
      const summaryStories = asObject(summary.stories);
      const summaryAssets = asObject(summary.assets);
      const summaryHitl = asObject(summary.hitl);
      const activeEpicCount = epics.filter(function (epic) { return epic.lifecycle.active && !epic.lifecycle.archived; }).length;

      return {
        generatedAt: asString(snapshot.generatedAt),
        generator: {
          name: asString(generator.name),
          version: asString(generator.version),
          mode: asString(generator.mode) === 'degraded' ? 'degraded' : 'full',
        },
        repo: {
          root: asString(repo.root),
          gitCommit: asString(repo.gitCommit),
          gitCommitDate: asString(repo.gitCommitDate),
          gitBranch: asString(repo.gitBranch),
          dirty: repo.dirty === true,
        },
        sourceHealth: sourceHealth,
        summary: {
          counts: counts,
          pmActionCount: numberOr(summary.pmActionCount, counts.pmTodo + counts.waitingConfirm),
          blockedCount: numberOr(summary.blockedCount, counts.blocked),
          activeEpicKey: asString(summary.activeEpicKey) || (epics.length > 0 ? epics[0].key : null),
          currentPhase: normalizeCurrentPhase(summary.currentPhase),
          phaseProgress: normalizeProgress(summary.phaseProgress, phases),
          activeChanges: numberOr(summary.activeChanges, 0),
          archivedChanges: numberOr(summary.archivedChanges, 0),
          stories: {
            total: numberOr(summaryStories.total, stories.length),
            ready: numberOr(summaryStories.ready, stories.filter(function (story) { return story.readiness.ready; }).length),
            missingMust: numberOr(summaryStories.missingMust, stories.filter(function (story) { return story.readiness.missingMust.length > 0; }).length),
            inDev: numberOr(summaryStories.inDev, stories.filter(function (story) { return story.status === 'devInProgress'; }).length),
            done: numberOr(summaryStories.done, stories.filter(function (story) { return story.status === 'done'; }).length),
          },
          assets: {
            total: numberOr(summaryAssets.total, assets.length),
            fresh: numberOr(summaryAssets.fresh, assets.filter(function (asset) { return asset.freshness === 'fresh'; }).length),
            aging: numberOr(summaryAssets.aging, assets.filter(function (asset) { return asset.freshness === 'aging'; }).length),
            stale: numberOr(summaryAssets.stale, assets.filter(function (asset) { return asset.freshness === 'stale'; }).length),
            driftCandidates: numberOr(summaryAssets.driftCandidates, assets.reduce(function (sum, asset) { return sum + asset.driftCandidates.length; }, 0)),
          },
          hitl: {
            waitingConfirm: numberOr(summaryHitl.waitingConfirm, counts.waitingConfirm),
            confirmed: numberOr(summaryHitl.confirmed, counts.confirmed),
            invisible: numberOr(summaryHitl.invisible, 0),
          },
          activeEpicCount: activeEpicCount,
        },
        boards: boards,
        phases: phases,
        epics: epics,
        stories: stories,
        assets: assets,
        governance: {
          reviews: asArray(asObject(snapshot.governance).reviews).map(function (entry, index) {
            const review = asObject(entry);
            return {
              path: asString(review.path),
              scope: asString(review.scope),
              date: asString(review.date),
              verdict: asString(review.verdict),
              p0: numberOr(review.p0, 0),
              p1: numberOr(review.p1, 0),
            };
          }),
          reviewCoverage: asObject(asObject(snapshot.governance).reviewCoverage),
        },
        archives: normalizeArchives(snapshot.archives),
        warnings: warnings,
      };
    }

    function isUsableSnapshot(value) {
      return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
    }

    /* ------------------------------------------------------------------ */
    /* 实时会话投影（slot 标准 hook；只陈述 hook 事实）                     */
    /* ------------------------------------------------------------------ */

    function collectPmSessions(sessionsSnapshot, statusMap, repoRoot) {
      const list = asObject(sessionsSnapshot);
      const ids = asArray(list.ids);
      const byId = asObject(list.byId);
      const rows = [];
      if (!repoRoot) return rows;
      ids.forEach(function (id) {
        const row = byId[id];
        if (!row || typeof row !== 'object') return;
        if (row.origin === 'subagent') return;
        if (row.cwd !== repoRoot) return;
        const projection = asObject(row.projectionValues);
        if (projection.agentPreset !== AGENT_PRESET) return;
        const status = statusMap && typeof statusMap.get === 'function' ? statusMap.get(id) : null;
        rows.push({
          id: asString(row.id) || id,
          title: asString(row.displayTitle) || asString(row.title) || id,
          running: row.running === true || Boolean(status && status.running),
          pendingInteraction: status && status.pendingInteraction ? status.pendingInteraction : null,
          completionUnread: Boolean(status && status.completionUnread),
          updatedAt: asNumber(row.updatedAt),
        });
      });
      rows.sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); });
      return rows;
    }

    function interactionLabel(interaction) {
      const kind = asString(asObject(interaction).kind);
      if (kind === 'approval') return t('interactionApproval');
      if (kind === 'plan-review') return t('interactionPlanReview');
      if (kind === 'question') return t('interactionQuestion');
      return t('interactionGeneric');
    }

    /* ------------------------------------------------------------------ */
    /* 标签映射（值来自快照，label 走 t）                                    */
    /* ------------------------------------------------------------------ */

    const STATUS_LABEL_KEYS = {
      pmTodo: 'statusPmTodo',
      aiInProgress: 'statusAiInProgress',
      waitingConfirm: 'statusWaitingConfirm',
      confirmed: 'statusConfirmed',
      handoffDone: 'statusHandoff',
      devInProgress: 'statusDev',
      done: 'statusDone',
      na: 'statusNa',
      blocked: 'statusBlocked',
      unknown: 'statusUnknown',
    };

    const OWNER_LABEL_KEYS = {
      pm: 'ownerPm',
      lead: 'ownerLead',
      engineer: 'ownerEngineer',
      qa: 'ownerQa',
      reviewer: 'ownerReviewer',
      ai: 'ownerAi',
      user: 'ownerUser',
    };

    const FRESHNESS_LABEL_KEYS = {
      fresh: 'freshnessFresh',
      aging: 'freshnessAging',
      stale: 'freshnessStale',
      unknown: 'freshnessUnknown',
    };

    const SEVERITY_LABEL_KEYS = {
      blocker: 'healthSeverityBlocker',
      warning: 'healthSeverityWarning',
      info: 'healthSeverityInfo',
    };

    const DRIFT_SEVERITY_KEYS = {
      high: 'driftHigh',
      medium: 'driftMedium',
      low: 'driftLow',
    };

    function statusLabel(status) {
      return t(STATUS_LABEL_KEYS[status] || 'statusUnknown');
    }

    function phaseStatusLabel(status) {
      if (status === 'done') return t('phaseDone');
      if (status === 'current') return t('phaseCurrent');
      return t('phaseFuture');
    }

    function ownerLabel(owner) {
      return t(OWNER_LABEL_KEYS[owner] || 'ownerPm');
    }

    function confidenceLabel(level) {
      if (level === 'high') return t('confHigh');
      if (level === 'medium') return t('confMedium');
      return t('confLow');
    }

    function freshnessLabel(freshness) {
      return t(FRESHNESS_LABEL_KEYS[freshness] || 'freshnessUnknown');
    }

    function severityLabel(severity) {
      return t(SEVERITY_LABEL_KEYS[severity] || 'healthSeverityInfo');
    }

    function driftSeverityLabel(severity) {
      return t(DRIFT_SEVERITY_KEYS[severity] || 'driftLow');
    }

    /* ------------------------------------------------------------------ */
    /* 提示词模板（只拼接对象 id / 阶段 / 期望产物，不拼接自由文本）          */
    /* ------------------------------------------------------------------ */

    const STAGE_EXPECTED_ARTIFACTS = {
      research: 'research.md',
      explore: 'idea.md',
      prototype: 'prototypes/',
      arch: 'architecture-impact.md',
      storymap: 'storymap.md',
      stories: 'stories/<story-key>/story.md',
      'test-design': 'test-design.md',
    };

    function phaseText(snapshot) {
      const phase = snapshot && snapshot.summary ? snapshot.summary.currentPhase : null;
      if (!phase || phase.no === null) return t('noPhase');
      return t('phasePrefix') + ' ' + String(phase.no) + (phase.name ? ' · ' + phase.name : '');
    }

    function repoText(snapshot) {
      const root = snapshot && snapshot.repo ? snapshot.repo.root : '';
      return root || t('repoUnknown');
    }

    function splitItemId(itemId) {
      const value = asString(itemId);
      if (!value) return { kind: '', parts: [] };
      const parts = value.split(':');
      return { kind: parts[0] || '', parts: parts.slice(1) };
    }

    function findEpic(snapshot, epicKey) {
      if (!snapshot || !epicKey) return null;
      return snapshot.epics.filter(function (epic) { return epic.key === epicKey; })[0] || null;
    }

    function findStage(snapshot, epicKey, stageKey) {
      const epic = findEpic(snapshot, epicKey);
      if (!epic) return null;
      return epic.stages.filter(function (stage) { return stage.key === stageKey; })[0] || null;
    }

    function stageExpectedArtifact(stage) {
      if (!stage) return '';
      if (stage.artifact) return stage.artifact;
      if (stage.artifactPath) return stage.artifactPath;
      if (stage.artifacts.length > 0) return stage.artifacts[0];
      return STAGE_EXPECTED_ARTIFACTS[stage.key] || '';
    }

    function promptForStage(snapshot, epicKey, stageKey) {
      const epic = findEpic(snapshot, epicKey);
      const stage = findStage(snapshot, epicKey, stageKey);
      return interpolate(t('promptEpicStage'), {
        repo: repoText(snapshot),
        phase: phaseText(snapshot),
        epic: epicKey || (epic ? epic.key : ''),
        stage: stage ? stage.key : (stageKey || ''),
        status: stage ? statusLabel(stage.status) : statusLabel('pmTodo'),
        confidence: stage ? confidenceLabel(stage.confidence) : confidenceLabel('low'),
        artifact: stageExpectedArtifact(stage) || t('emptyValue'),
      });
    }

    function promptForStory(snapshot, story) {
      return interpolate(t('promptStory'), {
        repo: repoText(snapshot),
        epic: (story && story.epicKey) || (snapshot && snapshot.summary.activeEpicKey) || '',
        story: (story && (story.title || story.id)) || '',
        priority: (story && story.priority) || t('storyNoPriority'),
        missing: story && story.readiness.missingMust.length > 0
          ? story.readiness.missingMust.join(' / ')
          : ['story.md', 'test-design.md'].join(' / '),
      });
    }

    function promptForAsset(snapshot, asset) {
      const driftText = asset.driftCandidates.length > 0
        ? asset.driftCandidates.map(function (drift) { return drift.code; }).join(' / ')
        : t('assetDriftNone');
      return interpolate(t('promptAsset'), {
        repo: repoText(snapshot),
        title: asset.title,
        path: asset.path || t('emptyValue'),
        drifts: driftText,
      });
    }

    function promptForWarning(snapshot, warning) {
      const path = warning.evidence.length > 0 ? warning.evidence[0].path : '';
      return interpolate(t('promptHealth'), {
        repo: repoText(snapshot),
        code: warning.code,
        path: path || t('emptyValue'),
      });
    }

    function promptForNewSession(snapshot) {
      return interpolate(t('promptNewSession'), {
        repo: repoText(snapshot),
        phase: phaseText(snapshot),
      });
    }

    /**
     * 队列/看板条目的动作提示词：nextAction.prompt 优先（Host 给的），
     * 否则按条目类型从对象 id + 阶段拼模板。
     */
    function promptForItem(snapshot, item) {
      const action = item ? item.nextAction : null;
      if (action) {
        if (action.prompt) return action.prompt;
        if (action.command) {
          const base = promptForStage(snapshot, parsedEpicKeyOf(item), parsedStageKeyOf(item));
          return base + '\n\n执行命令：' + action.command;
        }
      }
      const epicKey = parsedEpicKeyOf(item);
      const stageKey = parsedStageKeyOf(item);
      if (epicKey && stageKey) return promptForStage(snapshot, epicKey, stageKey);
      if (item && item.kind === 'stage' && epicKey) {
        const epic = findEpic(snapshot, epicKey);
        const nextStage = epic ? epic.stages.filter(function (stage) { return stage.status === 'pmTodo'; })[0] : null;
        return promptForStage(snapshot, epicKey, nextStage ? nextStage.key : stageKey);
      }
      if (item && item.kind === 'epic' && epicKey) {
        const epic = findEpic(snapshot, epicKey);
        const nextStage = epic ? epic.stages.filter(function (stage) { return stage.status === 'pmTodo'; })[0] : null;
        return promptForStage(snapshot, epicKey, nextStage ? nextStage.key : 'explore');
      }
      if (item && item.kind === 'story') {
        const story = snapshot && snapshot.stories.filter(function (entry) {
          return entry.id === item.id || entry.title === item.title;
        })[0];
        return promptForStory(snapshot, story || { epicKey: parsedEpicKeyOf(item), title: item.title, priority: null, readiness: { missingMust: [] } });
      }
      if (item && item.kind === 'asset') {
        const asset = snapshot && snapshot.assets.filter(function (entry) {
          return entry.id === item.id || entry.path === item.links.openPath;
        })[0];
        return promptForAsset(snapshot, asset || {
          title: item.title,
          path: item.links.openPath || (item.evidence[0] ? item.evidence[0].path : ''),
          driftCandidates: [],
        });
      }
      return promptForNewSession(snapshot);
    }

    function parsedEpicKeyOf(item) {
      if (!item) return '';
      if (item.meta && typeof item.meta.epicKey === 'string') return item.meta.epicKey;
      const parsed = splitItemId(item.id);
      if (parsed.kind === 'epic') return parsed.parts[0] || '';
      if (parsed.kind === 'stage') return parsed.parts[0] || '';
      if (parsed.kind === 'story') return parsed.parts.length > 1 ? parsed.parts[0] : '';
      return '';
    }

    function parsedStageKeyOf(item) {
      if (!item) return '';
      if (item.meta && typeof item.meta.stage === 'string') return item.meta.stage;
      const parsed = splitItemId(item.id);
      if (parsed.kind === 'stage') return parsed.parts[1] || '';
      return '';
    }

    /* ------------------------------------------------------------------ */
    /* 基础视觉元素                                                        */
    /* ------------------------------------------------------------------ */

    /** Left-sidebar cell: a board/clipboard glyph drawn with currentColor. */
    function PanelIcon(props) {
      const size = props && typeof props.size === 'number' ? props.size : 18;
      return h('svg', {
        width: size,
        height: size,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: props && props.active ? 1.9 : 1.65,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': 'true',
        focusable: 'false',
      },
        h('rect', { x: 4.5, y: 4.6, width: 15, height: 16.6, rx: 2.6 }),
        h('path', { d: 'M9 4.6V3.8A1.4 1.4 0 0 1 10.4 2.4h3.2A1.4 1.4 0 0 1 15 3.8v.8' }),
        h('path', { d: 'M8.6 9.6v7.4' }),
        h('path', { d: 'M12 9.6v4.6' }),
        h('path', { d: 'M15.4 9.6v6.2' }),
        h('path', { d: 'M8.6 20h6.8' })
      );
    }

    function Toasts(props) {
      if (!props.toasts || props.toasts.length === 0) return null;
      return h('div', { className: 'pm-toasts', role: 'status', 'aria-live': 'polite' },
        props.toasts.map(function (toast) {
          return h('div', { key: toast.id, className: 'pm-toast pm-toast-' + toast.kind },
            h('span', { className: 'pm-toast-text' }, toast.text),
            h('button', {
              type: 'button',
              className: 'pm-toast-x',
              title: t('toastClose'),
              'aria-label': t('toastClose'),
              onClick: function () { props.onDismiss(toast.id); },
            }, '×')
          );
        })
      );
    }

    function StatusBadge(props) {
      return h('span', { className: 'pm-badge pm-status', 'data-status': props.status || 'unknown' },
        h('span', { className: 'pm-dot', 'aria-hidden': 'true' }),
        statusLabel(props.status || 'unknown'));
    }

    function OwnerBadge(props) {
      return h('span', { className: 'pm-badge pm-owner' }, ownerLabel(props.owner || 'pm'));
    }

    function ConfBadge(props) {
      const level = CONFIDENCE_LEVELS.indexOf(props.level) >= 0 ? props.level : 'low';
      return h('span', {
        className: 'pm-badge pm-conf',
        'data-level': level,
        title: confidenceLabel(level),
      },
        h('span', { className: 'pm-conf-dot', 'aria-hidden': 'true' }),
        confidenceLabel(level));
    }

    function FreshnessBadge(props) {
      return h('span', { className: 'pm-badge pm-freshness', 'data-freshness': props.freshness || 'unknown' },
        freshnessLabel(props.freshness || 'unknown'));
    }

    function SeverityBadge(props) {
      return h('span', { className: 'pm-badge pm-severity', 'data-severity': props.severity || 'info' },
        severityLabel(props.severity || 'info'));
    }

    function PriorityBadge(props) {
      if (!props.priority) return h('span', { className: 'pm-badge pm-priority', 'data-priority': 'none' }, t('storyNoPriority'));
      return h('span', { className: 'pm-badge pm-priority', 'data-priority': props.priority }, props.priority);
    }

    function PathChip(props) {
      const path = asString(props.path);
      if (!path) return null;
      const key = props.copyKey || path;
      return h('span', { className: 'pm-path' },
        h('code', { title: props.locator ? path + ' · ' + props.locator : path }, path),
        props.locator ? h('span', { className: 'pm-path-locator' }, props.locator) : null,
        h('button', {
          type: 'button',
          className: 'pm-path-copy',
          title: t('copy') + ' ' + path,
          'aria-label': t('copy') + ' ' + path,
          onClick: function () { props.onCopy(path, key); },
        }, props.copiedKey === key ? t('copied') : t('copy'))
      );
    }

    function PathList(props) {
      const paths = asArray(props.paths).filter(function (entry) { return typeof entry === 'string' && entry.length > 0; });
      if (paths.length === 0) return null;
      return h('div', { className: 'pm-paths' },
        paths.map(function (path, index) {
          return h(PathChip, {
            key: path + ':' + String(index),
            path: path,
            copyKey: (props.prefix || '') + path,
            copiedKey: props.copiedKey,
            onCopy: props.onCopy,
          });
        })
      );
    }

    function EvidenceList(props) {
      const evidence = asArray(props.evidence).filter(function (entry) { return entry && entry.path; });
      if (evidence.length === 0) return null;
      const shown = evidence.slice(0, props.limit || 4);
      return h('div', { className: 'pm-evidence' },
        h('span', { className: 'pm-evidence-label' }, props.label || t('evidenceLabel')),
        h('div', { className: 'pm-paths' },
          shown.map(function (entry, index) {
            const copyKey = (props.prefix || '') + entry.path + ':' + String(index);
            return h(PathChip, {
              key: copyKey,
              path: entry.path,
              locator: entry.locator,
              copyKey: copyKey,
              copiedKey: props.copiedKey,
              onCopy: props.onCopy,
            });
          })
        )
      );
    }

    /**
     * 唯一的行动入口：预填提示词后调用 uiWorkspace.startSession，绝不写文件。
     * 工作区缺失时按钮禁用并在 title 里给出提示。
     */
    function ActionButton(props) {
      const action = props.action || null;
      const workspaceState = props.workspaceState || { status: 'unknown' };
      const workspaceReady = workspaceState.status === 'ok';
      const disabled = Boolean(action && action.enabled === false) || !workspaceReady;
      const label = props.label || (action && action.label) || t('actContinue');
      const hint = disabled && !workspaceReady
        ? (workspaceState.status === 'pending' ? t('workspaceLoading') : t('workspaceMissing'))
        : (props.title || label);
      return h('button', {
        type: 'button',
        className: 'pm-btn pm-btn-primary' + (props.small ? ' pm-btn-sm' : ''),
        disabled: disabled,
        title: hint,
        onClick: function () {
          if (disabled) return;
          props.onRun(props.prompt || '', action);
        },
      }, label);
    }

    function NextActionLine(props) {
      const action = props.action;
      if (!action) return null;
      if (action.kind === 'info') {
        return h('span', { className: 'pm-note' }, t('nextActionInfo') + ' · ' + (action.label || action.id || ''));
      }
      return h('div', { className: 'pm-card-acts' },
        h(ActionButton, {
          action: action,
          prompt: props.prompt,
          workspaceState: props.workspaceState,
          onRun: props.onRun,
          label: props.label || undefined,
          small: true,
        }),
        action.command ? h('code', { className: 'pm-command' }, action.command) : null
      );
    }

    function JumpButton(props) {
      return h('button', {
        type: 'button',
        className: 'pm-btn pm-btn-ghost pm-btn-sm',
        title: t('liveJump'),
        onClick: function () { props.onJump(props.sessionId); },
      }, props.label || t('actJump'));
    }

    /* ------------------------------------------------------------------ */
    /* 头部 / 阶段条 / KPI / 实时条                                          */
    /* ------------------------------------------------------------------ */

    function PhaseBar(props) {
      const phases = asArray(props.phases);
      if (phases.length === 0) return null;
      return h('div', { className: 'pm-phasebar', role: 'img', 'aria-label': t('currentPhase') },
        phases.map(function (phase) {
          return h('span', {
            key: 'phase-' + String(phase.no),
            className: 'pm-phase-seg',
            'data-status': phase.status,
            title: t('phasePrefix') + ' ' + String(phase.no) + (phase.name ? ' · ' + phase.name : '') + ' · ' + phaseStatusLabel(phase.status),
          });
        })
      );
    }

    function Header(props) {
      const snapshot = props.snapshot;
      const phase = snapshot && snapshot.summary ? snapshot.summary.currentPhase : null;
      const progress = snapshot && snapshot.summary ? snapshot.summary.phaseProgress : null;
      const repo = snapshot ? snapshot.repo : null;
      const repoRoot = repo && repo.root ? repo.root : '';
      const workspaceState = props.workspaceState || { status: 'unknown' };
      const liveAvailable = props.liveAvailable === true;
      const runningCount = numberOr(props.runningCount, 0);
      const busy = props.refreshing === true;

      return h('header', { className: 'pm-head', 'data-window-drag': true },
        h('div', { className: 'pm-head-row' },
          h('div', { className: 'pm-head-main' },
            h('h1', { className: 'pm-title' }, t('title')),
            h('p', { className: 'pm-sub' }, t('subtitle'))
          ),
          h('div', { className: 'pm-head-right' },
            phase
              ? h('span', { className: 'pm-phase-chip' },
                  h('span', { className: 'pm-phase-k' }, t('currentPhase')),
                  h('b', null, t('phasePrefix') + ' ' + String(phase.no) + (phase.name ? ' · ' + phase.name : '')))
              : null,
            progress && progress.total > 0
              ? h('span', { className: 'pm-progress' },
                  h(PhaseBar, { phases: snapshot.phases }),
                  h('b', { className: 'pm-progress-n' }, interpolate(t('phaseProgress'), { done: String(progress.done), total: String(progress.total) })))
              : null,
            liveAvailable
              ? h('span', { className: 'pm-head-live', title: t('liveNote') },
                  h('span', { className: 'pm-dot pm-dot-live', 'data-running': runningCount > 0 ? 'true' : 'false', 'aria-hidden': 'true' }),
                  interpolate(t('liveRunning'), { count: String(runningCount) }))
              : null
          )
        ),
        h('div', { className: 'pm-head-row pm-head-row-meta' },
          h('div', { className: 'pm-meta' },
            repoRoot ? h('span', { className: 'pm-meta-item pm-meta-repo', title: repoRoot }, basename(repoRoot)) : null,
            snapshot
              ? h('span', { className: 'pm-meta-item' }, interpolate(t('generatedAt'), { time: formatDateTime(snapshot.generatedAt) || t('emptyValue') }))
              : null,
            repo && repo.gitCommit
              ? h('span', { className: 'pm-meta-item pm-mono' }, interpolate(t('commitLabel'), { commit: repo.gitCommit }))
              : null,
            repo && repo.gitBranch
              ? h('span', { className: 'pm-meta-item' }, interpolate(t('branchLabel'), { branch: repo.gitBranch }))
              : null,
            repo
              ? h('span', { className: 'pm-meta-item' + (repo.dirty ? ' pm-meta-warn' : ''), title: repo.dirty ? t('gitDirty') : t('gitClean') },
                  repo.dirty ? t('gitDirty') : t('gitClean'))
              : null
          ),
          h('div', { className: 'pm-head-acts' },
            snapshot && workspaceState.status !== 'ok'
              ? h('span', { className: 'pm-hint' }, workspaceState.status === 'pending' ? t('workspaceLoading') : t('workspaceMissingShort'))
              : null,
            h('button', {
              type: 'button',
              className: 'pm-btn',
              disabled: busy || !snapshot,
              onClick: props.onRefresh,
            }, busy ? t('btnRefreshBusy') : t('btnRefresh')),
            h('button', {
              type: 'button',
              className: 'pm-btn pm-btn-primary',
              disabled: !snapshot || workspaceState.status !== 'ok',
              title: workspaceState.status === 'pending'
                ? t('workspaceLoading')
                : workspaceState.status === 'ok' ? t('actStartSession') : t('workspaceMissing'),
              onClick: props.onNewSession,
            }, t('btnPmSession'))
          )
        )
      );
    }

    function Banner(props) {
      if (!props.banner) return null;
      const banner = props.banner;
      return h('div', { className: 'pm-banner', 'data-kind': banner.kind || 'warn', role: 'status' },
        h('span', { className: 'pm-banner-icon', 'aria-hidden': 'true' }, '!'),
        h('span', { className: 'pm-banner-text' }, banner.text),
        banner.onRetry
          ? h('button', { type: 'button', className: 'pm-btn pm-btn-sm', onClick: banner.onRetry, disabled: props.busy === true },
              props.busy ? t('btnRetryBusy') : t('bannerRetry'))
          : null
      );
    }

    function KpiCard(props) {
      const active = props.active === true;
      return h('button', {
        type: 'button',
        className: 'pm-kpi' + (active ? ' on' : ''),
        'aria-pressed': active,
        onClick: props.onSelect,
      },
        h('span', { className: 'pm-kpi-val', 'data-tone': props.tone || 'plain' }, String(props.value)),
        h('span', { className: 'pm-kpi-label' }, props.label),
        props.sub ? h('span', { className: 'pm-kpi-sub' }, props.sub) : null
      );
    }

    function KpiRow(props) {
      const kpis = asArray(props.kpis);
      return h('div', { className: 'pm-kpis' },
        kpis.map(function (kpi) {
          return h(KpiCard, {
            key: kpi.key,
            value: kpi.value,
            label: kpi.label,
            sub: kpi.sub,
            tone: kpi.tone,
            active: props.filter === kpi.key,
            onSelect: function () { props.onFilter(props.filter === kpi.key ? '' : kpi.key); },
          });
        })
      );
    }

    function LiveStrip(props) {
      if (props.available !== true) {
        return h('div', { className: 'pm-live' },
          h('span', { className: 'pm-live-label' }, t('liveLabel')),
          h('span', { className: 'pm-live-none' }, t('liveUnavailable')));
      }
      const sessions = asArray(props.sessions);
      return h('div', { className: 'pm-live' },
        h('span', { className: 'pm-live-label' }, t('liveLabel')),
        h('span', { className: 'pm-live-count' }, interpolate(t('liveRunning'), { count: String(numberOr(props.runningCount, 0)) })),
        sessions.length === 0
          ? h('span', { className: 'pm-live-none' }, t('liveNone'))
          : h('div', { className: 'pm-live-list' },
              sessions.slice(0, 6).map(function (session) {
                const pending = Boolean(session.pendingInteraction);
                return h('span', {
                  key: session.id,
                  className: 'pm-live-session',
                  'data-pending': pending ? 'true' : 'false',
                  'data-running': session.running ? 'true' : 'false',
                  title: session.title,
                },
                  h('span', { className: 'pm-dot', 'aria-hidden': 'true' }),
                  h('span', { className: 'pm-live-title' }, session.title),
                  pending ? h('span', { className: 'pm-live-tag' }, t('livePendingTag')) : null,
                  !pending && session.running ? h('span', { className: 'pm-live-tag' }, t('liveRunningTag')) : null,
                  !pending && !session.running && session.completionUnread ? h('span', { className: 'pm-live-tag' }, t('liveUnreadTag')) : null,
                  h('span', { className: 'pm-live-time' }, formatRelative(session.updatedAt)),
                  h(JumpButton, { sessionId: session.id, onJump: props.onJump, label: t('liveJump') })
                );
              })
            )
      );
    }

    function Tabs(props) {
      const tabs = asArray(props.tabs);
      return h('div', { className: 'pm-tabs', role: 'tablist', 'aria-label': t('title') },
        tabs.map(function (tab) {
          const active = props.active === tab.key;
          return h('button', {
            key: tab.key,
            type: 'button',
            role: 'tab',
            'aria-selected': active,
            className: 'pm-tab' + (active ? ' on' : ''),
            onClick: function () { props.onSelect(tab.key); },
          },
            h('span', null, tab.label),
            typeof tab.count === 'number' ? h('span', { className: 'pm-tab-n' }, String(tab.count)) : null
          );
        })
      );
    }

    /* ------------------------------------------------------------------ */
    /* 行动队列                                                            */
    /* ------------------------------------------------------------------ */

    function assetSubtitle(asset) {
      const parts = [];
      if (asset.ageDays !== null) parts.push(interpolate(t('assetAge'), { days: String(asset.ageDays) }));
      else parts.push(t('assetAgeUnknown'));
      if (asset.driftCandidates.length > 0) {
        parts.push(interpolate(t('assetDriftTitle'), { count: String(asset.driftCandidates.length) }));
      }
      return parts.join(' · ');
    }

    function QueueCard(props) {
      const ui = props.ui;
      if (props.type === 'live' && props.session) {
        const session = props.session;
        return h('div', { className: 'pm-card pm-card-live', 'data-kind': 'live-session' },
          h('div', { className: 'pm-card-top' },
            h(StatusBadge, { status: 'waitingConfirm' }),
            h('span', { className: 'pm-card-title', title: session.title }, session.title),
            h(OwnerBadge, { owner: 'ai' }),
            h('span', { className: 'pm-badge pm-badge-live' }, t('liveLabel'))
          ),
          h('p', { className: 'pm-card-why' }, interactionLabel(session.pendingInteraction)),
          h('div', { className: 'pm-card-acts' },
            h(JumpButton, { sessionId: session.id, onJump: ui.onJump, label: t('liveJump') }),
            h('span', { className: 'pm-live-time' }, formatRelative(session.updatedAt))
          )
        );
      }
      if (props.type === 'warning' && props.warning) {
        const warning = props.warning;
        const prompt = promptForWarning(ui.snapshot, warning);
        return h('div', { className: 'pm-card pm-card-warning', 'data-severity': warning.severity },
          h('div', { className: 'pm-card-top' },
            h(SeverityBadge, { severity: warning.severity }),
            h('code', { className: 'pm-code' }, warning.code),
            h('span', { className: 'pm-card-title' }, warning.message)
          ),
          h(EvidenceList, {
            evidence: warning.evidence,
            prefix: 'warn:' + warning.code + ':',
            copiedKey: ui.copiedKey,
            onCopy: ui.onCopy,
            limit: 2,
          }),
          h('div', { className: 'pm-card-acts' },
            h(ActionButton, {
              action: null,
              prompt: prompt,
              workspaceState: ui.workspaceState,
              onRun: ui.onRun,
              label: t('actHandle'),
              small: true,
            })
          )
        );
      }
      const item = props.item;
      if (!item) return null;
      const why = item.subtitle
        || (item.statusBecause.length > 0 ? item.statusBecause[0] : '')
        || (item.nextAction ? item.nextAction.label : '');
      const prompt = promptForItem(ui.snapshot, item);
      return h('div', { className: 'pm-card' + (item.status === 'blocked' ? ' pm-card-blocked' : ''), 'data-kind': item.kind },
        h('div', { className: 'pm-card-top' },
          h(StatusBadge, { status: item.status }),
          h('span', { className: 'pm-card-title', title: item.title }, item.title),
          h(OwnerBadge, { owner: item.owner }),
          h(ConfBadge, { level: item.statusConfidence })
        ),
        why ? h('p', { className: 'pm-card-why' }, h('span', { className: 'pm-card-why-k' }, t('whyLabel')), why) : null,
        item.meta && asArray(item.meta.openQuestions).length > 0
          ? h('div', { className: 'pm-card-questions' },
              h('span', { className: 'pm-card-questions-label' }, t('openQuestionsLabel')),
              asArray(item.meta.openQuestions).map(function (question, index) {
                return h('span', { className: 'pm-chip-q', key: String(question) + ':' + String(index) }, String(question));
              }))
          : null,
        item.blockers.length > 0 ? h('p', { className: 'pm-card-blocker' }, item.blockers[0].message) : null,
        item.hitlWaived ? h('span', { className: 'pm-chip', 'data-tone': 'muted' }, t('stageWaived')) : null,
        h(EvidenceList, {
          evidence: item.evidence,
          prefix: 'card:' + item.id + ':',
          copiedKey: ui.copiedKey,
          onCopy: ui.onCopy,
          limit: 2,
        }),
        item.nextAction
          ? h(NextActionLine, {
              action: item.nextAction,
              prompt: prompt,
              workspaceState: ui.workspaceState,
              onRun: ui.onRun,
            })
          : null
      );
    }

    function QueueGroup(props) {
      const group = props.group;
      const entries = asArray(group.entries);
      const empty = entries.length === 0 && !group.hasLive;
      return h('section', { className: 'pm-group', 'data-group': group.key },
        h('div', { className: 'pm-group-head' },
          h('span', { className: 'pm-group-title' }, group.title),
          h('span', { className: 'pm-group-count' }, String(numberOr(group.count, entries.length))),
          group.liveCount > 0 ? h('span', { className: 'pm-group-live' }, t('liveLabel') + ' ' + String(group.liveCount)) : null
        ),
        empty
          ? h('div', { className: 'pm-group-empty' },
              h('p', { className: 'pm-empty-line' }, group.emptyText),
              group.emptyAction || null)
          : h('div', { className: 'pm-group-cards' },
              entries.map(function (entry) {
                return h(QueueCard, {
                  key: entry.key,
                  type: entry.type,
                  item: entry.item,
                  session: entry.session,
                  warning: entry.warning,
                  ui: props.ui,
                });
              }),
              group.moreCount > 0
                ? h('p', { className: 'pm-more' }, interpolate(t('itemsMore'), { count: String(group.moreCount) }))
                : null
            ),
        group.footerAction || null
      );
    }

    function ActionQueue(props) {
      const groups = asArray(props.groups);
      return h('aside', { className: 'pm-queue', 'aria-label': t('queueTitle') },
        h('div', { className: 'pm-queue-head' },
          h('h2', { className: 'pm-queue-title' }, t('queueTitle')),
          props.filter
            ? h('span', { className: 'pm-filter-chip' },
                h('span', null, interpolate(t('filterActive'), { name: props.filterLabel || '' })),
                h('button', {
                  type: 'button',
                  className: 'pm-filter-clear',
                  onClick: props.onClearFilter,
                }, t('filterClear')))
            : null
        ),
        h('div', { className: 'pm-queue-body' },
          groups.map(function (group) {
            return h(QueueGroup, { key: group.key, group: group, ui: props.ui });
          })
        )
      );
    }

    /* ------------------------------------------------------------------ */
    /* 右侧看板：Epic 漏斗                                                 */
    /* ------------------------------------------------------------------ */

    function DetailRow(props) {
      return h('div', { className: 'pm-detail-row' },
        h('span', { className: 'pm-detail-k' }, props.label),
        h('div', { className: 'pm-detail-v' }, props.value));
    }

    function StageDetail(props) {
      const stage = props.stage;
      const snapshot = props.snapshot;
      const ui = props.ui;
      const prompt = promptForStage(snapshot, props.epic.key, stage.key);
      const artifactPaths = stage.artifacts.length > 0
        ? stage.artifacts
        : (stage.artifactPath ? [stage.artifactPath] : (stage.artifact ? [stage.artifact] : []));
      const hitlChips = [
        h('span', {
          key: 'hitl',
          className: 'pm-chip',
          'data-tone': stage.hitl.visible ? 'ok' : 'muted',
        }, stage.hitl.visible ? t('stageHitlVisible') : t('stageHitlInvisible')),
      ];
      if (stage.hitl.waived) hitlChips.push(h('span', { key: 'waived', className: 'pm-chip', 'data-tone': 'warn' }, t('stageWaived')));
      if (stage.hitl.confirmedAt) hitlChips.push(h('span', { key: 'at', className: 'pm-chip' }, stage.hitl.confirmedAt));

      return h('div', { className: 'pm-stage-detail' },
        h('div', { className: 'pm-detail-head' },
          h('span', { className: 'pm-detail-title' }, t('stageDetailTitle') + ' · ' + stage.label),
          h(StatusBadge, { status: stage.status }),
          h(ConfBadge, { level: stage.confidence })
        ),
        h('div', { className: 'pm-details' },
          stage.cellRaw ? h(DetailRow, { label: t('stageRaw'), value: h('code', { className: 'pm-code' }, stage.cellRaw) }) : null,
          h(DetailRow, {
            label: t('stageStatus'),
            value: h('span', null,
              statusLabel(stage.status),
              h('span', { className: 'pm-note' }, ' · ' + (stage.required ? t('stageRequired') : t('stageOptional')))),
          }),
          h(DetailRow, { label: t('stageConfidence'), value: h(ConfBadge, { level: stage.confidence }) }),
          stage.ruleIds.length > 0
            ? h(DetailRow, {
                label: t('stageRules'),
                value: h('div', { className: 'pm-chips' }, stage.ruleIds.map(function (ruleId) {
                  return h('code', { key: ruleId, className: 'pm-code' }, ruleId);
                })),
              })
            : null,
          artifactPaths.length > 0
            ? h(DetailRow, {
                label: t('stageArtifact'),
                value: h(PathList, {
                  paths: artifactPaths,
                  prefix: 'stage:' + props.epic.key + ':' + stage.key + ':',
                  copiedKey: ui.copiedKey,
                  onCopy: ui.onCopy,
                }),
              })
            : null,
          stage.note ? h(DetailRow, { label: t('stageNote'), value: h('p', { className: 'pm-detail-note' }, stage.note) }) : null,
          h(DetailRow, { label: t('stageHitl'), value: h('div', { className: 'pm-chips' }, hitlChips) })
        ),
        stage.statusBecause.length > 0
          ? h('ul', { className: 'pm-detail-list' },
              stage.statusBecause.map(function (reason, index) {
                return h('li', { key: 'reason-' + String(index) }, reason);
              }))
          : null,
        h('div', { className: 'pm-card-acts' },
          h(ActionButton, {
            action: stage.nextAction,
            prompt: prompt,
            workspaceState: ui.workspaceState,
            onRun: ui.onRun,
            label: stage.nextAction && stage.nextAction.enabled === false ? stage.nextAction.label : t('actContinue'),
          })
        )
      );
    }

    function DraftStories(props) {
      const snapshot = props.ui.snapshot;
      const drafts = asArray(props.phase ? props.phase.draftStories : []);
      if (drafts.length === 0) return null;
      return h('div', { className: 'pm-drafts' },
        h('div', { className: 'pm-drafts-title' }, t('draftStoriesTitle')),
        h('div', { className: 'pm-draft-list' },
          drafts.map(function (draft) {
            const prompt = promptForStory(snapshot, {
              epicKey: props.epic.key,
              title: draft.title,
              priority: draft.priority,
              readiness: { missingMust: [] },
            });
            return h('div', { className: 'pm-draft-row', key: draft.storyId },
              h(PriorityBadge, { priority: draft.priority }),
              h('span', { className: 'pm-draft-title', title: draft.title }, draft.title),
              h('code', { className: 'pm-code' }, draft.storyId),
              h('span', { className: 'pm-badge pm-badge-warn' }, t('storyDraftBadge')),
              h(ActionButton, {
                action: null,
                prompt: prompt,
                workspaceState: props.ui.workspaceState,
                onRun: props.ui.onRun,
                label: t('actStart'),
                small: true,
              })
            );
          })
        )
      );
    }

    function EpicCard(props) {
      const epic = props.epic;
      const snapshot = props.ui.snapshot;
      const phase = snapshot.phases.filter(function (entry) { return entry.no === epic.phaseNo; })[0] || null;
      const openStage = props.openStage && props.openStage.epicKey === epic.key ? props.openStage.stageKey : '';
      const stage = epic.stages.filter(function (entry) { return entry.key === openStage; })[0] || null;
      const prompt = epic.nextAction ? promptForItem(snapshot, {
        id: 'epic:' + epic.key,
        kind: 'epic',
        title: epic.title,
        nextAction: epic.nextAction,
        meta: { epicKey: epic.key },
        evidence: [],
        links: {},
      }) : promptForStage(snapshot, epic.key, nextPmStageKey(epic));

      return h('article', { className: 'pm-epic' },
        h('div', { className: 'pm-epic-head' },
          h('div', { className: 'pm-epic-title-wrap' },
            h('h3', { className: 'pm-epic-title' }, epic.title),
            h('div', { className: 'pm-epic-meta' },
              epic.phaseNo !== null
                ? h('span', { className: 'pm-badge' }, interpolate(t('phaseBadge'), { no: String(epic.phaseNo) }))
                : null,
              h('code', { className: 'pm-code' }, epic.key),
              h('span', { className: 'pm-note' }, interpolate(t('storyStats'), {
                total: String(epic.storyStats.total),
                ready: String(epic.storyStats.ready),
                missing: String(epic.storyStats.missingMust),
              })),
              h('span', { className: 'pm-note' }, t('epicClickStage'))
            )
          ),
          h(ActionButton, {
            action: epic.nextAction,
            prompt: prompt,
            workspaceState: props.ui.workspaceState,
            onRun: props.ui.onRun,
            label: t('actContinue'),
          })
        ),
        h('div', { className: 'pm-stages', role: 'group', 'aria-label': t('epicStagesTitle') },
          STAGE_ORDER.map(function (stageKey) {
            const found = epic.stages.filter(function (entry) { return entry.key === stageKey; })[0] || null;
            const status = found ? found.status : 'unknown';
            const isOpen = found !== null && openStage === stageKey;
            const title = found
              ? found.label + ' · ' + statusLabel(found.status) + ' · ' + confidenceLabel(found.confidence)
              : stageKey;
            return h('button', {
              key: stageKey,
              type: 'button',
              className: 'pm-stage' + (isOpen ? ' on' : '') + (found ? '' : ' pm-stage-missing'),
              'data-status': status,
              'aria-pressed': isOpen,
              disabled: found === null,
              title: title,
              onClick: function () {
                if (!found) return;
                props.onToggleStage(epic.key, stageKey);
              },
            },
              h('span', { className: 'pm-stage-dot', 'aria-hidden': 'true' }),
              h('span', { className: 'pm-stage-label' }, found ? found.label : stageKey),
              found
                ? h('span', { className: 'pm-stage-conf', 'data-level': found.confidence, 'aria-hidden': 'true' })
                : null,
              found && found.required ? h('span', { className: 'pm-stage-req', title: t('stageRequired') }, '*') : null
            );
          })
        ),
        stage ? h(StageDetail, { stage: stage, epic: epic, snapshot: snapshot, ui: props.ui }) : null,
        h(DraftStories, { epic: epic, phase: phase, ui: props.ui })
      );
    }

    function nextPmStageKey(epic) {
      const pending = epic.stages.filter(function (stage) { return stage.status === 'pmTodo'; })[0];
      if (pending) return pending.key;
      return epic.stages.length > 0 ? epic.stages[0].key : 'explore';
    }

    function EpicTab(props) {
      const ui = props.ui;
      const snapshot = ui.snapshot;
      const allEpics = snapshot.epics;
      const activeEpics = allEpics.filter(function (epic) { return !epic.lifecycle.archived; });
      const epics = activeEpics.length > 0 ? activeEpics : allEpics;
      const archivedCount = allEpics.length - epics.length;
      if (epics.length === 0) {
        return h('div', { className: 'pm-empty-card' },
          h('h3', null, t('epicEmptyTitle')),
          h('p', null, t('epicEmptyHint')),
          h('div', { className: 'pm-card-acts' },
            h(ActionButton, {
              action: null,
              prompt: promptForNewSession(snapshot),
              workspaceState: ui.workspaceState,
              onRun: ui.onRun,
              label: t('actStart'),
            })
          )
        );
      }
      return h('div', { className: 'pm-epics' },
        h('div', { className: 'pm-board-section-head' },
          h('h3', { className: 'pm-board-section-title' }, t('epicSectionTitle')),
          h('span', { className: 'pm-note' }, interpolate(t('storyUnit'), { count: String(snapshot.summary.stories.total) }))
        ),
        epics.map(function (epic) {
          return h(EpicCard, {
            key: epic.key,
            epic: epic,
            ui: ui,
            openStage: props.openStage,
            onToggleStage: props.onToggleStage,
          });
        }),
        archivedCount > 0
          ? h('p', { className: 'pm-more' }, interpolate(t('epicArchivedNote'), { count: String(archivedCount) }))
          : null
      );
    }

    /* ------------------------------------------------------------------ */
    /* 右侧看板：Story Spec                                                */
    /* ------------------------------------------------------------------ */

    function collectDrafts(snapshot) {
      const drafts = [];
      snapshot.phases.forEach(function (phase) {
        if (phase.status === 'done') return;
        phase.draftStories.forEach(function (draft) {
          drafts.push({
            storyId: draft.storyId,
            title: draft.title,
            priority: draft.priority,
            epicKey: snapshot.summary.activeEpicKey || '',
          });
        });
      });
      return drafts;
    }

    function StoryDraftRow(props) {
      const ui = props.ui;
      const draft = props.draft;
      const prompt = promptForStory(ui.snapshot, {
        epicKey: draft.epicKey || ui.snapshot.summary.activeEpicKey,
        title: draft.title,
        priority: draft.priority,
        readiness: { missingMust: [] },
      });
      return h('div', { className: 'pm-story-row' },
        h('div', { className: 'pm-story-main' },
          h('span', { className: 'pm-story-title', title: draft.title }, draft.title),
          h('code', { className: 'pm-code' }, draft.storyId)
        ),
        h(PriorityBadge, { priority: draft.priority }),
        h('span', { className: 'pm-badge pm-badge-warn' }, t('storyDraftBadge')),
        h('span', { className: 'pm-story-miss' }, interpolate(t('storyMissingMust'), { list: 'story.md / test-design.md' })),
        h(ActionButton, {
          action: null,
          prompt: prompt,
          workspaceState: ui.workspaceState,
          onRun: ui.onRun,
          label: t('actStart'),
          small: true,
        })
      );
    }

    function StoryRow(props) {
      const ui = props.ui;
      const story = props.story;
      const prompt = promptForStory(ui.snapshot, story);
      const missing = story.readiness.missingMust.length > 0
        ? story.readiness.missingMust.join(' / ')
        : t('storyReady');
      return h('div', { className: 'pm-story-row', 'data-ready': story.readiness.ready ? 'true' : 'false' },
        h('div', { className: 'pm-story-main' },
          h('span', { className: 'pm-story-title', title: story.title }, story.title),
          h('code', { className: 'pm-code' }, story.id),
          story.source ? h('span', { className: 'pm-note' }, interpolate(t('storySourceLabel'), { source: story.source })) : null
        ),
        h(PriorityBadge, { priority: story.priority }),
        h(StatusBadge, { status: story.status }),
        h(ConfBadge, { level: story.confidence }),
        h('span', { className: 'pm-story-miss' }, missing),
        story.gates
          ? h('span', { className: 'pm-story-gate', 'data-pass': story.gates.allPass ? 'true' : 'false' },
              h('span', { className: 'pm-dot', 'aria-hidden': 'true' }),
              story.gates.allPass ? t('storyReady') : t('storyNotReady'))
          : h('span', { className: 'pm-note' }, t('storyGatesNone')),
        h(ActionButton, {
          action: story.nextAction,
          prompt: prompt,
          workspaceState: ui.workspaceState,
          onRun: ui.onRun,
          label: t('actContinue'),
          small: true,
        })
      );
    }

    function StoryTab(props) {
      const ui = props.ui;
      const snapshot = ui.snapshot;
      const stories = snapshot.stories;
      if (stories.length > 0) {
        return h('div', { className: 'pm-story-wrap' },
          h('div', { className: 'pm-board-section-head' },
            h('h3', { className: 'pm-board-section-title' }, t('tabStories')),
            h('span', { className: 'pm-note' }, interpolate(t('storyUnit'), { count: String(snapshot.summary.stories.total) }))
          ),
          h('div', { className: 'pm-story-list' },
            stories.map(function (story) {
              return h(StoryRow, { key: story.id, story: story, ui: ui });
            })
          )
        );
      }
      const drafts = collectDrafts(snapshot);
      if (drafts.length === 0) {
        return h('div', { className: 'pm-empty-card' },
          h('h3', null, t('storyEmptyTitle')),
          h('p', null, t('storyNoItems'))
        );
      }
      return h('div', { className: 'pm-story-wrap' },
        h('div', { className: 'pm-empty-card pm-empty-soft' },
          h('h3', null, t('storyEmptyTitle')),
          h('p', null, t('storyEmptyHint'))
        ),
        h('div', { className: 'pm-story-list' },
          drafts.map(function (draft, index) {
            return h(StoryDraftRow, { key: draft.storyId + ':' + String(index), draft: draft, ui: ui });
          })
        )
      );
    }

    /* ------------------------------------------------------------------ */
    /* 右侧看板：业务知识资产                                               */
    /* ------------------------------------------------------------------ */

    function AssetCard(props) {
      const ui = props.ui;
      const asset = props.asset;
      const snapshot = ui.snapshot;
      const prompt = promptForAsset(snapshot, asset);
      const counts = Object.keys(asset.contentCounts);
      return h('article', { className: 'pm-asset' },
        h('div', { className: 'pm-asset-head' },
          h('div', { className: 'pm-asset-title-wrap' },
            h('h3', { className: 'pm-asset-title' }, asset.title),
            h('div', { className: 'pm-asset-meta' },
              asset.kind ? h('span', { className: 'pm-badge' }, asset.kind) : null,
              h(FreshnessBadge, { freshness: asset.freshness }),
              asset.ageDays !== null
                ? h('span', { className: 'pm-note' }, interpolate(t('assetAge'), { days: String(asset.ageDays) }))
                : h('span', { className: 'pm-note' }, t('assetAgeUnknown')),
              asset.updatedAt
                ? h('span', { className: 'pm-note' }, interpolate(t('assetUpdatedAt'), { time: formatDateTime(asset.updatedAt) }))
                : null,
              asset.updatedAtSource !== 'none'
                ? h('span', { className: 'pm-note' }, interpolate(t('assetSource'), { source: asset.updatedAtSource }))
                : null
            )
          ),
          h(ActionButton, {
            action: asset.nextAction,
            prompt: prompt,
            workspaceState: ui.workspaceState,
            onRun: ui.onRun,
            label: t('actHandle'),
          })
        ),
        h(PathList, {
          paths: [asset.path],
          prefix: 'asset:' + asset.id + ':',
          copiedKey: ui.copiedKey,
          onCopy: ui.onCopy,
        }),
        counts.length > 0
          ? h('div', { className: 'pm-chips' },
              h('span', { className: 'pm-note' }, t('assetCounts') + '：'),
              counts.map(function (key) {
                return h('span', { key: key, className: 'pm-chip' }, key + ' ' + String(asset.contentCounts[key]));
              }))
          : null,
        asset.driftCandidates.length > 0
          ? h('div', { className: 'pm-drifts' },
              h('div', { className: 'pm-drifts-title' }, interpolate(t('assetDriftTitle'), { count: String(asset.driftCandidates.length) })),
              asset.driftCandidates.map(function (drift) {
                return h('div', { className: 'pm-drift' + ' pm-drift-' + drift.severity, key: drift.code },
                  h('span', { className: 'pm-badge pm-badge-warn' }, driftSeverityLabel(drift.severity) + ' · ' + drift.code),
                  h('span', { className: 'pm-drift-msg' }, drift.message),
                  drift.fixHint ? h('span', { className: 'pm-drift-hint' }, interpolate(t('assetFixHint'), { hint: drift.fixHint })) : null
                );
              })
            )
          : h('p', { className: 'pm-note' }, t('assetDriftNone')),
        h('div', { className: 'pm-asset-foot' },
          h('span', { className: 'pm-note' },
            asset.reviewStatus === 'recorded' ? t('assetReviewRecorded') : t('assetReviewNone')),
          h(EvidenceList, {
            evidence: asset.evidence,
            prefix: 'asset-ev:' + asset.id + ':',
            copiedKey: ui.copiedKey,
            onCopy: ui.onCopy,
            limit: 2,
          })
        )
      );
    }

    function AssetTab(props) {
      const ui = props.ui;
      const snapshot = ui.snapshot;
      const assets = snapshot.assets;
      const reviews = snapshot.governance.reviews;
      if (assets.length === 0) {
        return h('div', { className: 'pm-empty-card' },
          h('h3', null, t('assetsEmptyTitle')),
          h('p', null, t('assetsEmptyHint')),
          h('div', { className: 'pm-card-acts' },
            h(ActionButton, {
              action: null,
              prompt: promptForNewSession(snapshot),
              workspaceState: ui.workspaceState,
              onRun: ui.onRun,
              label: t('actStart'),
            })
          )
        );
      }
      return h('div', { className: 'pm-assets' },
        h('div', { className: 'pm-board-section-head' },
          h('h3', { className: 'pm-board-section-title' }, t('assetsSectionTitle')),
          h('span', { className: 'pm-note' },
            reviews.length > 0
              ? interpolate(t('governanceCount'), { count: String(reviews.length) })
              : t('governanceNone'))
        ),
        assets.map(function (asset) {
          return h(AssetCard, { key: asset.id, asset: asset, ui: ui });
        })
      );
    }

    /* ------------------------------------------------------------------ */
    /* 右侧看板：数据健康                                                   */
    /* ------------------------------------------------------------------ */

    function HealthTab(props) {
      const ui = props.ui;
      const snapshot = ui.snapshot;
      const warnings = snapshot.warnings;
      const sources = snapshot.sourceHealth;
      const issueSources = sources.filter(function (source) { return !source.ok || source.issues.length > 0; });
      const archives = snapshot.archives;
      const clean = warnings.length === 0 && issueSources.length === 0;

      return h('div', { className: 'pm-health' },
        h('div', { className: 'pm-board-section-head' },
          h('h3', { className: 'pm-board-section-title' }, t('healthSectionTitle')),
          warnings.length > 0
            ? h('span', { className: 'pm-note' }, interpolate(t('healthWarningsTitle'), { count: String(warnings.length) }))
            : null
        ),
        clean
          ? h('div', { className: 'pm-empty-card pm-empty-soft' },
              h('h3', null, t('healthEmptyTitle')),
              h('p', null, t('healthEmptyHint')))
          : null,
        warnings.length > 0
          ? h('div', { className: 'pm-warn-list' },
              warnings.map(function (warning, index) {
                return h(QueueCard, {
                  key: warning.code + ':' + String(index),
                  type: 'warning',
                  warning: warning,
                  ui: ui,
                });
              })
            )
          : null,
        sources.length > 0
          ? h('section', { className: 'pm-board-section' },
              h('h3', { className: 'pm-board-section-title' }, t('healthSourcesTitle')),
              h('div', { className: 'pm-source-list' },
                sources.map(function (source) {
                  const ok = source.ok && source.issues.length === 0;
                  return h('div', { className: 'pm-source-row', key: source.id, 'data-ok': ok ? 'true' : 'false' },
                    h('span', { className: 'pm-source-ok' }, ok ? t('healthSourceOk') : t('healthSourceIssue')),
                    h('code', { className: 'pm-code' }, source.id),
                    h('span', { className: 'pm-source-path' }, source.path),
                    source.issues.length > 0
                      ? h('span', { className: 'pm-source-issues' }, source.issues[0])
                      : null
                  );
                })
              )
            )
          : null,
        h('section', { className: 'pm-board-section' },
          h('h3', { className: 'pm-board-section-title' }, t('devSideTitle')),
          h('div', { className: 'pm-chips' },
            h('span', { className: 'pm-chip' }, interpolate(t('devActiveChanges'), { count: String(snapshot.summary.activeChanges) })),
            h('span', { className: 'pm-chip' }, interpolate(t('devArchivedChanges'), { count: String(snapshot.summary.archivedChanges) })),
            h('span', { className: 'pm-chip' }, interpolate(t('devRecentArchives'), {
              count: String(archives.recentCount),
              days: String(archives.days),
            })),
            archives.lastDate
              ? h('span', { className: 'pm-chip' }, interpolate(t('devLastArchive'), { date: archives.lastDate }))
              : null
          ),
          archives.recent.length > 0
            ? h('div', { className: 'pm-archive-list' },
                archives.recent.slice(0, 5).map(function (entry, index) {
                  return h('div', { className: 'pm-archive-row', key: entry.name + ':' + String(index) },
                    h('span', { className: 'pm-archive-date' }, entry.date || t('emptyValue')),
                    h('span', { className: 'pm-archive-name' }, entry.name),
                    h('span', { className: 'pm-archive-gate', 'data-pass': entry.allPass ? 'true' : 'false' },
                      h('span', { className: 'pm-dot', 'aria-hidden': 'true' }),
                      entry.allPass ? t('storyReady') : t('storyNotReady')));
                }))
            : h('p', { className: 'pm-note' }, t('devNone'))
        )
      );
    }

    /* ------------------------------------------------------------------ */
    /* 启动器 / 加载 / 页脚                                                 */
    /* ------------------------------------------------------------------ */

    function Launcher(props) {
      const ws = props.workspaceState || { status: 'unknown' };
      const disabled = ws.status !== 'ok' || props.sessionAvailable !== true;
      const sources = [
        { label: t('srcRoadmap'), path: 'docs/ROADMAP.md' },
        { label: t('srcRequirements'), path: 'openspec-requirements/epics/' },
        { label: t('srcChanges'), path: 'openspec/changes/' },
        { label: t('srcBaseline'), path: 'docs/baseline/' },
        { label: t('srcGovernance'), path: 'docs/governance/reviews/' },
        { label: t('srcArchive'), path: 'openspec/changes/archive/' },
      ];
      const ping = asObject(props.pingInfo);
      const python = asObject(ping.python);
      const scanner = asObject(ping.scanner);
      return h('div', { className: 'pm-launcher' },
        h('section', { className: 'pm-launcher-card' },
          h('div', { className: 'pm-launcher-badge', 'aria-hidden': 'true' }, '!'),
          h('h2', { className: 'pm-launcher-title' }, t('launcherTitle')),
          h('p', { className: 'pm-launcher-body' }, t('launcherBody')),
          props.pingInfo ? h('p', { className: 'pm-launcher-body' }, t('launcherRouteAlive')) : null,
          h('ul', { className: 'pm-launcher-steps' },
            h('li', null, t('launcherStep1')),
            h('li', null, t('launcherStep2')),
            h('li', null, t('launcherStep3'))
          ),
          h('div', { className: 'pm-launcher-acts' },
            h('button', {
              type: 'button',
              className: 'pm-btn pm-btn-primary',
              disabled: disabled,
              title: disabled ? t('workspaceMissing') : t('launcherPromptHint'),
              onClick: props.onAnalyze,
            }, t('actAnalyzeProject')),
            h('button', {
              type: 'button',
              className: 'pm-btn',
              disabled: props.retrying === true,
              onClick: props.onRetry,
            }, props.retrying ? t('btnRetryBusy') : t('btnRetry'))
          ),
          disabled ? h('p', { className: 'pm-launcher-note' }, ws.status === 'pending' ? t('workspaceLoading') : t('workspaceMissing')) : null,
          props.failure
            ? h('details', { className: 'pm-launcher-error' },
                h('summary', null, t('launcherDetail')),
                h('code', null, props.failure))
            : null,
          props.pingInfo
            ? h('div', { className: 'pm-launcher-runtime' },
                h('span', { className: 'pm-chip' }, t('launcherPython') + ' · ' + (python.ok ? t('launcherOk') : t('launcherFail'))),
                h('span', { className: 'pm-chip' }, t('launcherScanner') + ' · ' + (scanner.ok ? t('launcherOk') : t('launcherFail'))),
                ping.repoRoot ? h('code', { className: 'pm-code' }, ping.repoRoot) : null)
            : null,
          h('div', { className: 'pm-launcher-sources' },
            h('h3', { className: 'pm-launcher-sources-title' }, t('launcherSources')),
            h('div', { className: 'pm-launcher-source-grid' },
              sources.map(function (source) {
                return h('div', { className: 'pm-launcher-source', key: source.path },
                  h('span', { className: 'pm-launcher-source-label' }, source.label),
                  h(PathChip, {
                    path: source.path,
                    copyKey: 'src:' + source.path,
                    copiedKey: props.copiedKey,
                    onCopy: props.onCopy,
                  }));
              })
            )
          )
        )
      );
    }

    function LoadingView() {
      return h('div', { className: 'pm-loading' },
        h('span', { className: 'pm-spinner', 'aria-hidden': 'true' }),
        h('div', { className: 'pm-loading-copy' },
          h('p', { className: 'pm-loading-title' }, t('loadingTitle')),
          h('p', { className: 'pm-loading-hint' }, t('loadingHint'))),
        h('div', { className: 'pm-skeleton', 'aria-hidden': 'true' },
          h('span', { className: 'pm-skeleton-row' }),
          h('span', { className: 'pm-skeleton-row' }),
          h('span', { className: 'pm-skeleton-row' }))
      );
    }

    function Footer(props) {
      return h('footer', { className: 'pm-footer' },
        h('span', { className: 'pm-footer-main' }, t('footerReadonly')),
        h('span', { className: 'pm-footer-src' }, t('footerSources')),
        h('span', { className: 'pm-footer-ver' }, interpolate(t('footerVersion'), { version: PLUGIN_VERSION }))
      );
    }

    /* ------------------------------------------------------------------ */
    /* 面板级小工具                                                        */
    /* ------------------------------------------------------------------ */

    function resolveWorkspaceState(repoRoot, workspacesSnapshot, hookPresent) {
      if (!repoRoot) return { status: 'unknown', id: '' };
      if (!hookPresent) return { status: 'missing', id: '' };
      const snapshot = asObject(workspacesSnapshot);
      const items = asArray(snapshot.items);
      const phase = asString(snapshot.phase);
      const hit = items.filter(function (item) { return item && item.path === repoRoot; })[0];
      if (hit && hit.workspaceId) return { status: 'ok', id: hit.workspaceId };
      if (phase && phase !== 'ready') return { status: 'pending', id: '' };
      return { status: 'missing', id: '' };
    }

    function itemEntry(item, index) {
      return { key: 'item:' + item.id + ':' + String(index), type: 'item', item: item };
    }

    function assetAsItem(asset) {
      return {
        id: asset.id,
        kind: 'asset',
        title: asset.title,
        subtitle: assetSubtitle(asset),
        owner: 'pm',
        status: 'pmTodo',
        statusConfidence: 'high',
        statusBecause: asset.driftCandidates.length > 0 ? [asset.driftCandidates[0].message] : [],
        hitlWaived: false,
        nextAction: asset.nextAction,
        blockers: [],
        evidence: asset.evidence,
        links: { openPath: asset.path, commandPath: '' },
        tags: [],
        meta: {},
      };
    }

    function promptHealthAll(snapshot, warnings) {
      const list = asArray(warnings);
      const firstPath = list.length > 0 && list[0].evidence.length > 0 ? list[0].evidence[0].path : '';
      return interpolate(t('promptHealth'), {
        repo: repoText(snapshot),
        code: list.map(function (warning) { return warning.code; }).join(' / '),
        path: firstPath || t('emptyValue'),
      });
    }

    /* ------------------------------------------------------------------ */
    /* 主面板                                                              */
    /* ------------------------------------------------------------------ */

    function PmPane(rawProps) {
      const props = rawProps || {};
      useLocaleRevision();

      const hasSessionsHook = typeof props.useSessions === 'function';
      const hasStatusHook = typeof props.useSessionStatus === 'function';
      const hasWorkspacesHook = typeof props.useWorkspaces === 'function';
      const useSessions = hasSessionsHook ? props.useSessions : useNoopSessions;
      const useSessionStatus = hasStatusHook ? props.useSessionStatus : useNoopStatus;
      const useWorkspaces = hasWorkspacesHook ? props.useWorkspaces : useNoopWorkspaces;
      const sessionsSnapshot = useSessions(function (value) { return value; });
      const statusMap = useSessionStatus(function (value) { return value; });
      const workspaces = useWorkspaces(function (value) { return value; });

      const [mode, setMode] = React.useState('booting');
      const [snapshot, setSnapshot] = React.useState(null);
      const [pingInfo, setPingInfo] = React.useState(null);
      const [failure, setFailure] = React.useState('');
      const [staleNote, setStaleNote] = React.useState('');
      const [refreshing, setRefreshing] = React.useState(false);
      const [retrying, setRetrying] = React.useState(false);
      const [kpiFilter, setKpiFilter] = React.useState('');
      const [tab, setTab] = React.useState('epics');
      const [openStage, setOpenStage] = React.useState(null);
      const [copiedKey, setCopiedKey] = React.useState('');
      const toasts = useToasts();

      const aliveRef = React.useRef(true);
      const seqRef = React.useRef(0);
      const abortRef = React.useRef(null);
      const busyRef = React.useRef(false);
      const modeRef = React.useRef('booting');
      const copiedTimerRef = React.useRef(null);

      React.useEffect(function () {
        modeRef.current = mode;
      }, [mode]);

      /* ---- 取数：挂载 ping → snapshot；手动刷新 = refresh；45s 轮询 snapshot ---- */

      function applySnapshot(raw) {
        const next = normalizeSnapshot(raw);
        setSnapshot(next);
        setStaleNote('');
        return next;
      }

      async function loadInitial() {
        const seq = seqRef.current + 1;
        seqRef.current = seq;
        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        setMode('booting');
        setFailure('');
        setRetrying(true);
        setStaleNote('');
        try {
          const ping = await callHost('ping', {}, { signal: controller.signal, timeoutMs: TIMEOUT_PING_MS });
          if (!aliveRef.current || seqRef.current !== seq) return;
          setPingInfo(asObject(ping));
          if (ping && typeof ping.api === 'number' && ping.api !== API_VERSION) {
            throw hostError(interpolate(t('errApiVersion'), {
              panel: String(API_VERSION),
              host: String(ping.api),
            }));
          }
          const raw = await callHost('snapshot', {}, { signal: controller.signal, timeoutMs: TIMEOUT_SNAPSHOT_MS });
          if (!aliveRef.current || seqRef.current !== seq) return;
          const data = asObject(raw);
          const snapshotRaw = data.snapshot !== undefined ? data.snapshot : data;
          if (!isUsableSnapshot(snapshotRaw)) throw hostError(t('errBadShape'));
          applySnapshot(snapshotRaw);
          setMode('ready');
        } catch (error) {
          if (!aliveRef.current || seqRef.current !== seq) return;
          if (error && error.name === 'AbortError') return;
          console.warn('[openspec-pm-board] panel degraded to launcher:', messageOf(error));
          setFailure(messageOf(error));
          setMode('launcher');
        } finally {
          if (aliveRef.current && seqRef.current === seq) setRetrying(false);
        }
      }

      async function refreshNow(force) {
        if (!aliveRef.current || busyRef.current) return;
        if (modeRef.current !== 'ready') {
          await loadInitial();
          return;
        }
        busyRef.current = true;
        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        setRefreshing(true);
        try {
          const raw = await callHost(force ? 'refresh' : 'snapshot', {}, {
            signal: controller.signal,
            timeoutMs: TIMEOUT_SNAPSHOT_MS,
          });
          if (!aliveRef.current) return;
          const data = asObject(raw);
          const snapshotRaw = data.snapshot !== undefined ? data.snapshot : data;
          if (!isUsableSnapshot(snapshotRaw)) throw hostError(t('errBadShape'));
          applySnapshot(snapshotRaw);
        } catch (error) {
          if (!aliveRef.current) return;
          if (error && error.name === 'AbortError') return;
          const message = messageOf(error);
          setStaleNote(message);
          if (force) toasts.push(message, 'error');
        } finally {
          busyRef.current = false;
          if (aliveRef.current) setRefreshing(false);
        }
      }

      /* ---- 行动：唯一写入口 = uiWorkspace.startSession（预填，不自动发送） ---- */

      function copyPromptFallback(text) {
        const prompt = asString(text);
        if (!prompt) return;
        copyText(prompt).then(function (ok) {
          toasts.push(ok ? t('promptCopiedFallback') : t('copyFailed'), ok ? 'warn' : 'error');
        });
      }

      function runPrompt(prompt, action) {
        const text = asString(prompt);
        const preset = action && action.agentPreset ? action.agentPreset : AGENT_PRESET;
        if (!workspaceService || typeof workspaceService.startSession !== 'function') {
          toasts.push(t('noWorkspaceService'), 'warn');
          copyPromptFallback(text);
          return;
        }
        if (workspaceState.status !== 'ok') {
          toasts.push(workspaceState.status === 'pending' ? t('workspaceLoading') : t('workspaceMissing'), 'warn');
          copyPromptFallback(text);
          return;
        }
        try {
          workspaceService.startSession(workspaceState.id, {
            agentPreset: preset,
            prompt: text,
            whenDraftExists: 'append',
          });
          // Workspace runtime switches to the Conversation panel on success; a premature
          // "opened" toast would race the async creation, so there is none.
        } catch (error) {
          toasts.push(messageOf(error), 'error');
          copyPromptFallback(text);
        }
      }

      function jumpToSession(sessionId) {
        if (!sessionId) return;
        if (workspaceService && typeof workspaceService.openSession === 'function') {
          try {
            workspaceService.openSession(sessionId);
          } catch (error) {
            toasts.push(messageOf(error), 'error');
          }
          return;
        }
        toasts.push(t('openSessionUnavailable'), 'warn');
      }

      function copyPath(path, key) {
        copyText(path).then(function (ok) {
          if (!aliveRef.current) return;
          if (!ok) {
            toasts.push(t('copyFailed'), 'warn');
            return;
          }
          setCopiedKey(key || path);
          if (copiedTimerRef.current) window.clearTimeout(copiedTimerRef.current);
          copiedTimerRef.current = window.setTimeout(function () {
            if (aliveRef.current) setCopiedKey('');
          }, COPY_FLASH_MS);
        });
      }

      function toggleStage(epicKey, stageKey) {
        setOpenStage(function (previous) {
          if (previous && previous.epicKey === epicKey && previous.stageKey === stageKey) return null;
          return { epicKey: epicKey, stageKey: stageKey };
        });
      }

      React.useEffect(function () {
        aliveRef.current = true;
        loadInitial();
        const timer = window.setInterval(function () {
          if (!aliveRef.current) return;
          if (modeRef.current !== 'ready') return;
          refreshNow(false);
        }, POLL_MS);
        return function () {
          aliveRef.current = false;
          window.clearInterval(timer);
          if (abortRef.current) abortRef.current.abort();
          if (copiedTimerRef.current) window.clearTimeout(copiedTimerRef.current);
        };
      }, []);

      /* ---- 派生：工作区 / 实时会话 / 队列 / KPI ---- */

      const repoRoot = (snapshot && snapshot.repo.root) || (pingInfo ? asString(pingInfo.repoRoot) : '');
      const workspaceState = resolveWorkspaceState(repoRoot, workspaces, hasWorkspacesHook);
      const liveAvailable = hasSessionsHook && hasStatusHook;
      const pmSessions = (liveAvailable && repoRoot && snapshot)
        ? collectPmSessions(sessionsSnapshot, statusMap, repoRoot)
        : [];
      const runningSessions = pmSessions.filter(function (session) { return session.running; });
      const pendingSessions = pmSessions.filter(function (session) { return Boolean(session.pendingInteraction); });
      const sessionAvailable = Boolean(workspaceService && typeof workspaceService.startSession === 'function');

      const ui = {
        snapshot: snapshot,
        workspaceState: workspaceState,
        onRun: runPrompt,
        onJump: jumpToSession,
        onCopy: copyPath,
        copiedKey: copiedKey,
        onToggleStage: toggleStage,
      };

      let groups = [];
      let kpis = [];
      let filterLabel = '';
      let tabList = [];
      if (snapshot) {
        const counts = snapshot.summary.counts;
        const warnings = snapshot.warnings;
        const blockedItems = snapshot.boards.blocked.items;
        const waitingItems = snapshot.boards.waitingConfirm.items;
        const pmTodoItems = snapshot.boards.pmTodo.items;
        const aiItems = snapshot.boards.aiInProgress.items;
        const fileWaiting = numberOr(counts.waitingConfirm, waitingItems.length);
        const waitingCount = fileWaiting + pendingSessions.length;
        const blockedCount = numberOr(snapshot.summary.blockedCount, blockedItems.length);
        const driftCount = numberOr(snapshot.summary.assets.driftCandidates, 0);
        const assetItems = snapshot.assets.filter(function (asset) {
          return asset.driftCandidates.length > 0;
        });
        const actionablePmTodo = pmTodoItems.filter(function (item) {
          return !item.nextAction || item.nextAction.enabled !== false;
        });
        const blockedPmTodoCount = pmTodoItems.length - actionablePmTodo.length;
        const dataEntries = warnings.filter(function (warning) { return warning.severity !== 'info'; });
        const nextPmItem = actionablePmTodo[0] || pmTodoItems[0] || null;

        const waitingEntries = pendingSessions.map(function (session) {
          return { key: 'live:' + session.id, type: 'live', session: session };
        }).concat(waitingItems.map(function (item, index) {
          return itemEntry(item, index);
        }));

        const waitingEmptyAction = nextPmItem
          ? h('div', { className: 'pm-card-acts' },
              h(ActionButton, {
                action: nextPmItem.nextAction,
                prompt: promptForItem(snapshot, nextPmItem),
                workspaceState: workspaceState,
                onRun: runPrompt,
                label: t('actContinue'),
                small: true,
              }))
          : null;

        const dataHealthFooter = warnings.length > 0
          ? h('div', { className: 'pm-group-foot' },
              h(ActionButton, {
                action: null,
                prompt: promptHealthAll(snapshot, warnings),
                workspaceState: workspaceState,
                onRun: runPrompt,
                label: t('healthFixAll'),
                small: true,
              }))
          : null;

        groups = [
          {
            key: 'blocked',
            title: t('groupBlocked'),
            count: blockedCount,
            entries: blockedItems.map(function (item, index) { return itemEntry(item, index); }),
            emptyText: t('emptyBlocked'),
            moreCount: Math.max(0, blockedCount - blockedItems.length),
          },
          {
            key: 'waitingConfirm',
            title: t('groupWaitingConfirm'),
            count: waitingCount,
            liveCount: pendingSessions.length,
            hasLive: pendingSessions.length > 0,
            entries: waitingEntries,
            emptyText: t('emptyWaitingConfirm'),
            emptyAction: waitingEmptyAction,
            moreCount: Math.max(0, fileWaiting - waitingItems.length),
          },
          {
            key: 'pmTodo',
            title: t('groupPmTodo'),
            count: actionablePmTodo.length,
            entries: actionablePmTodo.map(function (item, index) { return itemEntry(item, index); }),
            emptyText: t('emptyPmTodo'),
            footerAction: blockedPmTodoCount > 0
              ? h('p', { className: 'pm-more' }, interpolate(t('pmTodoBlockedNote'), { count: String(blockedPmTodoCount) }))
              : null,
          },
          {
            key: 'aiInProgress',
            title: t('groupAi'),
            count: numberOr(counts.aiInProgress, aiItems.length),
            entries: aiItems.map(function (item, index) { return itemEntry(item, index); }),
            emptyText: t('emptyAi'),
            moreCount: Math.max(0, numberOr(counts.aiInProgress, aiItems.length) - aiItems.length),
          },
          {
            key: 'assetReview',
            title: t('groupAssetReview'),
            count: assetItems.length,
            entries: assetItems.map(function (asset, index) {
              return { key: 'asset:' + asset.id + ':' + String(index), type: 'item', item: assetAsItem(asset) };
            }),
            emptyText: t('emptyAssetReview'),
          },
          {
            key: 'dataHealth',
            title: t('groupDataHealth'),
            count: dataEntries.length,
            entries: dataEntries.map(function (warning, index) {
              return { key: 'warning:' + warning.code + ':' + String(index), type: 'warning', warning: warning };
            }),
            emptyText: t('emptyDataHealth'),
            footerAction: dataHealthFooter,
          },
        ];

        const kpiForFilter = null;
        kpis = [
          {
            key: 'waitingConfirm',
            label: t('kpiWaitingConfirm'),
            value: waitingCount,
            tone: waitingCount > 0 ? 'warn' : 'plain',
            sub: interpolate(t('kpiWaitingSub'), { file: String(fileWaiting), live: String(pendingSessions.length) }),
          },
          {
            key: 'pmTodo',
            label: t('kpiPmTodo'),
            value: numberOr(counts.pmTodo, pmTodoItems.length),
            tone: 'brand',
            sub: interpolate(t('kpiPmTodoSub'), { actionable: String(actionablePmTodo.length) }),
          },
          {
            key: 'aiInProgress',
            label: t('kpiAi'),
            value: numberOr(counts.aiInProgress, 0) + runningSessions.length,
            tone: 'business',
            sub: interpolate(t('kpiAiSub'), {
              live: String(runningSessions.length),
              inferred: String(numberOr(counts.aiInProgress, 0)),
            }),
          },
          {
            key: 'blocked',
            label: t('kpiBlocked'),
            value: blockedCount,
            tone: blockedCount > 0 ? 'danger' : 'plain',
            sub: interpolate(t('kpiBlockedSub'), { blocked: String(blockedCount), warnings: String(warnings.length) }),
          },
          {
            key: 'assetReview',
            label: t('kpiAssets'),
            value: driftCount,
            tone: driftCount > 0 ? 'warn' : 'plain',
            sub: interpolate(t('kpiAssetsSub'), { drift: String(driftCount) }),
          },
        ];
        const selectedKpi = kpis.filter(function (kpi) { return kpi.key === kpiFilter; })[0] || kpiForFilter;
        filterLabel = selectedKpi ? selectedKpi.label : '';
        const filterGroups = {
          waitingConfirm: ['waitingConfirm'],
          pmTodo: ['pmTodo'],
          aiInProgress: ['aiInProgress'],
          blocked: ['blocked', 'dataHealth'],
          assetReview: ['assetReview'],
        };
        if (kpiFilter && filterGroups[kpiFilter]) {
          groups = groups.filter(function (group) {
            return filterGroups[kpiFilter].indexOf(group.key) >= 0;
          });
        }

        tabList = [
          { key: 'epics', label: t('tabEpics'), count: snapshot.epics.length },
          { key: 'stories', label: t('tabStories'), count: numberOr(snapshot.summary.stories.total, snapshot.stories.length) },
          { key: 'assets', label: t('tabAssets'), count: snapshot.assets.length },
          { key: 'health', label: t('tabHealth'), count: warnings.length },
        ];
      }

      /* ---- 渲染 ---- */

      const toastsNode = h(Toasts, { toasts: toasts.toasts, onDismiss: toasts.dismiss });
      const headerNode = h(Header, {
        snapshot: snapshot,
        pingInfo: pingInfo,
        runningCount: runningSessions.length,
        liveAvailable: liveAvailable,
        refreshing: refreshing,
        workspaceState: workspaceState,
        onRefresh: function () { refreshNow(true); },
        onNewSession: function () { runPrompt(promptForNewSession(snapshot), null); },
      });

      if (mode === 'launcher') {
        return h('section', { className: 'pm-page', 'data-panel': PANEL_ID },
          h('style', null, CSS),
          headerNode,
          h(Launcher, {
            failure: failure,
            pingInfo: pingInfo,
            retrying: retrying,
            workspaceState: workspaceState,
            sessionAvailable: sessionAvailable,
            copiedKey: copiedKey,
            onCopy: copyPath,
            onAnalyze: function () {
              runPrompt(interpolate(t('promptDegraded'), { repo: repoRoot || t('repoUnknown') }), null);
            },
            onRetry: loadInitial,
          }),
          toastsNode
        );
      }

      if (mode === 'booting' || !snapshot) {
        return h('section', { className: 'pm-page', 'data-panel': PANEL_ID },
          h('style', null, CSS),
          headerNode,
          h(LoadingView, null),
          toastsNode
        );
      }

      let banner = null;
      if (snapshot.generator.mode === 'degraded') {
        banner = { kind: 'warn', text: t('bannerDegraded') };
      }
      if (staleNote) {
        banner = {
          kind: 'warn',
          text: interpolate(t('bannerStale'), { message: staleNote }),
          onRetry: function () { refreshNow(true); },
        };
      }

      return h('section', { className: 'pm-page', 'data-panel': PANEL_ID },
        h('style', null, CSS),
        headerNode,
        banner
          ? h(Banner, { banner: banner, busy: refreshing })
          : null,
        h(LiveStrip, {
          available: liveAvailable,
          sessions: pmSessions,
          runningCount: runningSessions.length,
          onJump: jumpToSession,
        }),
        h('div', { className: 'pm-main' },
          h(KpiRow, {
            kpis: kpis,
            filter: kpiFilter,
            onFilter: function (next) { setKpiFilter(next); },
          }),
          h('div', { className: 'pm-body' },
            h(ActionQueue, {
              groups: groups,
              ui: ui,
              filter: kpiFilter,
              filterLabel: filterLabel,
              onClearFilter: function () { setKpiFilter(''); },
            }),
            h('section', { className: 'pm-board', 'aria-label': t('title') },
              h(Tabs, { tabs: tabList, active: tab, onSelect: function (next) { setTab(next); } }),
              h('div', { className: 'pm-board-body', role: 'tabpanel' },
                tab === 'stories'
                  ? h(StoryTab, { ui: ui })
                  : (tab === 'assets'
                    ? h(AssetTab, { ui: ui })
                    : (tab === 'health'
                      ? h(HealthTab, { ui: ui })
                      : h(EpicTab, {
                          ui: ui,
                          openStage: openStage,
                          onToggleStage: toggleStage,
                        })))
              )
            )
          )
        ),
        h(Footer, null),
        toastsNode
      );
    }

    /* ------------------------------------------------------------------ */
    /* 样式（只用 --dsw-alias-* 主题 token；浅/深色自动适配）                 */
    /* ------------------------------------------------------------------ */

    const CSS = [
      '.pm-page{display:flex;flex-direction:column;height:100%;min-height:0;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:13px/1.55 -apple-system,BlinkMacSystemFont,"PingFang SC","Helvetica Neue",Arial,sans-serif;-webkit-font-smoothing:antialiased}',
      '.pm-page *{box-sizing:border-box}',
      '.pm-page button{font:inherit}',
      '.pm-head{flex:none;padding:14px 22px 10px;border-bottom:1px solid var(--dsw-alias-border-l1);display:flex;flex-direction:column;gap:9px}',
      '.pm-head-row{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap}',
      '.pm-head-row-meta{align-items:center}',
      '.pm-head-main{min-width:0}',
      '.pm-title{margin:0;font-size:17px;font-weight:600;letter-spacing:-.01em;line-height:1.3}',
      '.pm-sub{margin:2px 0 0;font-size:11.5px;color:var(--dsw-alias-label-secondary)}',
      '.pm-head-right{display:flex;align-items:center;gap:10px;flex-wrap:wrap;flex:none}',
      '.pm-phase-chip{display:inline-flex;align-items:baseline;gap:6px;border:1px solid var(--dsw-alias-border-l1);border-radius:999px;padding:3px 10px;font-size:11px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-1)}',
      '.pm-phase-k{font-size:10px;letter-spacing:.04em}',
      '.pm-phase-chip b{color:var(--dsw-alias-label-primary);font-weight:600;font-size:11.5px}',
      '.pm-progress{display:flex;align-items:center;gap:8px}',
      '.pm-phasebar{display:flex;align-items:center;gap:2px}',
      '.pm-phase-seg{width:16px;height:5px;border-radius:2px;background:var(--dsw-alias-bg-layer-3)}',
      '.pm-phase-seg[data-status="done"]{background:var(--dsw-alias-brand-primary)}',
      '.pm-phase-seg[data-status="current"]{background:var(--dsw-alias-state-warn-primary)}',
      '.pm-progress-n{font-size:11.5px;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary)}',
      '.pm-head-live{display:inline-flex;align-items:center;gap:6px;font-size:11px;color:var(--dsw-alias-label-secondary);border:1px solid var(--dsw-alias-border-l1);border-radius:999px;padding:3px 10px;background:var(--dsw-alias-bg-layer-1)}',
      '.pm-dot{width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-label-tertiary);flex:none;display:inline-block}',
      '.pm-dot-live[data-running="true"]{background:var(--dsw-alias-state-success-primary)}',
      '.pm-dot-live[data-running="false"]{background:var(--dsw-alias-state-idle-primary)}',
      '.pm-meta{display:flex;align-items:center;gap:10px;flex-wrap:wrap;min-width:0}',
      '.pm-meta-item{font-size:11px;color:var(--dsw-alias-label-secondary);white-space:nowrap}',
      '.pm-meta-repo{color:var(--dsw-alias-label-primary);font-weight:600;max-width:26ch;overflow:hidden;text-overflow:ellipsis}',
      '.pm-meta-warn{color:var(--dsw-alias-state-warn-primary)}',
      '.pm-mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}',
      '.pm-head-acts{display:flex;align-items:center;gap:8px;flex:none}',
      '.pm-hint{font-size:10.5px;color:var(--dsw-alias-state-warn-primary)}',
      '.pm-btn{cursor:pointer;font:inherit;font-size:12px;font-weight:550;border-radius:7px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);padding:6px 12px;white-space:nowrap;display:inline-flex;align-items:center;gap:6px}',
      '.pm-btn:hover:not(:disabled){border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}',
      '.pm-btn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}',
      '.pm-btn:disabled{opacity:.45;cursor:not-allowed}',
      '.pm-btn-primary{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,var(--dsw-alias-bg-layer-1));border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 55%,transparent);color:var(--dsw-alias-brand-primary)}',
      '.pm-btn-ghost{background:transparent;border-color:var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary)}',
      '.pm-btn-sm{font-size:11px;padding:4px 9px}',
      '.pm-banner{flex:none;display:flex;align-items:center;gap:9px;padding:7px 22px;border-bottom:1px solid var(--dsw-alias-border-l1);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 9%,var(--dsw-alias-bg-base));font-size:11.5px;color:var(--dsw-alias-label-primary)}',
      '.pm-banner[data-kind="info"]{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 8%,var(--dsw-alias-bg-base))}',
      '.pm-banner-icon{width:16px;height:16px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:var(--dsw-alias-state-warn-primary);color:var(--dsw-alias-label-primary-inverted);font-size:10px;font-weight:700;flex:none}',
      '.pm-banner-text{flex:1 1 auto;line-height:1.5}',
      '.pm-live{flex:none;display:flex;align-items:center;gap:10px;padding:6px 22px;border-bottom:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);overflow:hidden}',
      '.pm-live-label{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--dsw-alias-label-tertiary);flex:none}',
      '.pm-live-count{font-size:11px;color:var(--dsw-alias-label-secondary);flex:none}',
      '.pm-live-none{font-size:11px;color:var(--dsw-alias-label-tertiary)}',
      '.pm-live-list{display:flex;align-items:center;gap:6px;overflow:auto;min-width:0;padding-bottom:1px}',
      '.pm-live-session{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-base);border-radius:999px;padding:2px 4px 2px 8px;font-size:11px;color:var(--dsw-alias-label-secondary);white-space:nowrap;flex:none;max-width:40ch}',
      '.pm-live-session[data-pending="true"]{border-color:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 55%,transparent)}',
      '.pm-live-session .pm-dot{background:var(--dsw-alias-state-idle-primary)}',
      '.pm-live-session[data-running="true"] .pm-dot{background:var(--dsw-alias-state-success-primary)}',
      '.pm-live-session[data-pending="true"] .pm-dot{background:var(--dsw-alias-state-warn-primary)}',
      '.pm-live-title{overflow:hidden;text-overflow:ellipsis;max-width:24ch;color:var(--dsw-alias-label-primary)}',
      '.pm-live-tag{font-size:9.5px;border:1px solid var(--dsw-alias-border-l1);border-radius:999px;padding:0 5px;color:var(--dsw-alias-label-secondary)}',
      '.pm-live-time{font-size:10px;color:var(--dsw-alias-label-tertiary)}',
      '.pm-main{flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden}',
      '.pm-kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;padding:10px 22px 4px;flex:none}',
      '.pm-kpi{display:flex;flex-direction:column;gap:1px;text-align:left;cursor:pointer;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:10px;padding:8px 12px;color:var(--dsw-alias-label-secondary);transition:border-color .12s}',
      '.pm-kpi:hover{border-color:var(--dsw-alias-border-l2)}',
      '.pm-kpi.on{border-color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 8%,var(--dsw-alias-bg-layer-1))}',
      '.pm-kpi:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}',
      '.pm-kpi-val{font-size:19px;font-weight:650;line-height:1.2;color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums}',
      '.pm-kpi-val[data-tone="warn"]{color:var(--dsw-alias-state-warn-primary)}',
      '.pm-kpi-val[data-tone="danger"]{color:var(--dsw-alias-state-error-primary)}',
      '.pm-kpi-val[data-tone="brand"]{color:var(--dsw-alias-brand-primary)}',
      '.pm-kpi-val[data-tone="business"]{color:var(--dsw-alias-state-business-primary)}',
      '.pm-kpi-label{font-size:11.5px;color:var(--dsw-alias-label-primary);font-weight:550}',
      '.pm-kpi-sub{font-size:10px;color:var(--dsw-alias-label-tertiary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.pm-body{flex:1;min-height:0;display:grid;grid-template-columns:minmax(330px,390px) minmax(0,1fr);overflow:hidden}',
      '.pm-queue{min-height:0;overflow:auto;border-right:1px solid var(--dsw-alias-border-l1);padding:10px 12px 20px;display:flex;flex-direction:column;gap:8px}',
      '.pm-queue::-webkit-scrollbar,.pm-board-body::-webkit-scrollbar,.pm-live-list::-webkit-scrollbar{width:8px;height:8px}',
      '.pm-queue::-webkit-scrollbar-thumb,.pm-board-body::-webkit-scrollbar-thumb,.pm-live-list::-webkit-scrollbar-thumb{background:var(--dsw-alias-scrollbar-bg-l2);border-radius:8px}',
      '.pm-queue-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 2px 2px;flex:none}',
      '.pm-queue-title{margin:0;font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--dsw-alias-label-secondary)}',
      '.pm-filter-chip{display:inline-flex;align-items:center;gap:6px;font-size:10.5px;color:var(--dsw-alias-brand-primary);border:1px solid color-mix(in srgb,var(--dsw-alias-brand-primary) 45%,transparent);border-radius:999px;padding:1px 4px 1px 8px}',
      '.pm-filter-clear{cursor:pointer;border:0;background:transparent;color:var(--dsw-alias-label-secondary);font-size:10.5px;padding:1px 4px;border-radius:999px}',
      '.pm-filter-clear:hover{color:var(--dsw-alias-brand-primary)}',
      '.pm-queue-body{display:flex;flex-direction:column;gap:10px}',
      '.pm-group{display:flex;flex-direction:column;gap:5px}',
      '.pm-group-head{display:flex;align-items:center;gap:7px;padding:2px 2px 0}',
      '.pm-group-title{font-size:11.5px;font-weight:600;color:var(--dsw-alias-label-primary)}',
      '.pm-group-count{font-size:10.5px;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary);border:1px solid var(--dsw-alias-border-l1);border-radius:999px;padding:0 6px;line-height:1.7}',
      '.pm-group-live{font-size:9.5px;color:var(--dsw-alias-state-warn-primary);border:1px dashed color-mix(in srgb,var(--dsw-alias-state-warn-primary) 45%,transparent);border-radius:999px;padding:0 6px;line-height:1.7}',
      '.pm-group-empty{border:1px dashed var(--dsw-alias-border-l1);border-radius:9px;padding:8px 10px;display:flex;flex-direction:column;gap:6px}',
      '.pm-empty-line{margin:0;font-size:11px;color:var(--dsw-alias-label-tertiary);line-height:1.5}',
      '.pm-group-cards{display:flex;flex-direction:column;gap:6px}',
      '.pm-more{margin:0;padding:0 2px;font-size:10px;color:var(--dsw-alias-label-tertiary)}',
      '.pm-group-foot{padding-top:2px}',
      '.pm-card{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:10px;padding:9px 11px;display:flex;flex-direction:column;gap:5px}',
      '.pm-card:hover{border-color:var(--dsw-alias-border-l2)}',
      '.pm-card-blocked{border-left:2px solid var(--dsw-alias-state-error-primary)}',
      '.pm-card-live{border-left:2px solid var(--dsw-alias-state-warn-primary);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 5%,var(--dsw-alias-bg-layer-1))}',
      '.pm-card-warning{border-left:2px solid var(--dsw-alias-state-warn-primary)}',
      '.pm-card-warning[data-severity="blocker"]{border-left-color:var(--dsw-alias-state-error-primary)}',
      '.pm-card-warning[data-severity="info"]{border-left-color:var(--dsw-alias-label-tertiary)}',
      '.pm-card-top{display:flex;align-items:center;gap:6px;flex-wrap:wrap;min-width:0}',
      '.pm-card-title{font-size:12.5px;font-weight:600;line-height:1.4;flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.pm-card-why{margin:0;font-size:11px;color:var(--dsw-alias-label-secondary);line-height:1.5;display:flex;gap:5px}',
      '.pm-card-why-k{color:var(--dsw-alias-label-tertiary);flex:none}',
      '.pm-card-blocker{margin:0;font-size:10.5px;color:var(--dsw-alias-state-warn-primary);line-height:1.5}',
      '.pm-card-acts{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding-top:1px}',
      '.pm-card-acts .pm-btn{white-space:normal;text-align:left;max-width:100%}',
      '.pm-command{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10px;color:var(--dsw-alias-label-tertiary);border:1px solid var(--dsw-alias-border-l1);border-radius:5px;padding:1px 5px}',
      '.pm-note{font-size:10.5px;color:var(--dsw-alias-label-tertiary);line-height:1.5}',
      '.pm-badge{display:inline-flex;align-items:center;gap:4px;font-size:10px;line-height:1.7;border:1px solid var(--dsw-alias-border-l1);border-radius:999px;padding:0 6px;color:var(--dsw-alias-label-secondary);white-space:nowrap;background:var(--dsw-alias-bg-base)}',
      '.pm-status .pm-dot{background:currentColor}',
      '.pm-status[data-status="pmTodo"]{color:var(--dsw-alias-brand-primary)}',
      '.pm-status[data-status="waitingConfirm"]{color:var(--dsw-alias-state-warn-primary)}',
      '.pm-status[data-status="aiInProgress"]{color:var(--dsw-alias-state-business-primary)}',
      '.pm-status[data-status="devInProgress"]{color:var(--dsw-alias-state-business-primary)}',
      '.pm-status[data-status="blocked"]{color:var(--dsw-alias-state-error-primary)}',
      '.pm-status[data-status="confirmed"],.pm-status[data-status="done"],.pm-status[data-status="handoffDone"]{color:var(--dsw-alias-state-success-primary)}',
      '.pm-status[data-status="na"],.pm-status[data-status="unknown"]{color:var(--dsw-alias-label-tertiary);border-style:dashed}',
      '.pm-owner{color:var(--dsw-alias-label-secondary)}',
      '.pm-conf{color:var(--dsw-alias-label-tertiary)}',
      '.pm-conf[data-level="high"]{color:var(--dsw-alias-state-success-primary)}',
      '.pm-conf[data-level="medium"]{color:var(--dsw-alias-state-warn-primary)}',
      '.pm-conf[data-level="low"]{color:var(--dsw-alias-label-tertiary);border-style:dashed}',
      '.pm-conf-dot{width:6px;height:6px;border-radius:50%;background:currentColor;flex:none}',
      '.pm-freshness[data-freshness="fresh"]{color:var(--dsw-alias-state-success-primary)}',
      '.pm-freshness[data-freshness="aging"]{color:var(--dsw-alias-state-warn-primary)}',
      '.pm-freshness[data-freshness="stale"]{color:var(--dsw-alias-state-error-primary)}',
      '.pm-freshness[data-freshness="unknown"]{color:var(--dsw-alias-label-tertiary);border-style:dashed}',
      '.pm-severity[data-severity="blocker"]{color:var(--dsw-alias-state-error-primary)}',
      '.pm-severity[data-severity="warning"]{color:var(--dsw-alias-state-warn-primary)}',
      '.pm-severity[data-severity="info"]{color:var(--dsw-alias-label-tertiary)}',
      '.pm-priority[data-priority="P0"]{color:var(--dsw-alias-state-error-primary)}',
      '.pm-priority[data-priority="P1"]{color:var(--dsw-alias-state-warn-primary)}',
      '.pm-priority[data-priority="P2"]{color:var(--dsw-alias-state-business-primary)}',
      '.pm-priority[data-priority="none"]{color:var(--dsw-alias-label-tertiary);border-style:dashed}',
      '.pm-badge-warn{color:var(--dsw-alias-state-warn-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 45%,transparent)}',
      '.pm-badge-live{color:var(--dsw-alias-state-warn-primary)}',
      '.pm-paths{display:flex;flex-wrap:wrap;gap:4px;min-width:0}',
      '.pm-path{display:inline-flex;align-items:center;gap:3px;min-width:0;max-width:100%;border:1px solid var(--dsw-alias-border-l1);border-radius:6px;background:var(--dsw-alias-markdown-inline-code);padding:1px 3px 1px 6px}',
      '.pm-path code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10px;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:34ch}',
      '.pm-path-locator{font-size:9.5px;color:var(--dsw-alias-label-tertiary);white-space:nowrap}',
      '.pm-path-copy{cursor:pointer;border:0;background:transparent;color:var(--dsw-alias-label-tertiary);font-size:9.5px;padding:1px 4px;border-radius:4px;flex:none}',
      '.pm-path-copy:hover{color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-interactive-bg-hover)}',
      '.pm-path-copy:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}',
      '.pm-evidence{display:flex;align-items:flex-start;gap:6px;min-width:0}',
      '.pm-evidence-label{font-size:9.5px;color:var(--dsw-alias-label-tertiary);flex:none;padding-top:2px}',
      '.pm-chips{display:flex;align-items:center;gap:5px;flex-wrap:wrap;min-width:0}',
      '.pm-chip{font-size:10px;line-height:1.7;border:1px solid var(--dsw-alias-border-l1);border-radius:999px;padding:0 7px;color:var(--dsw-alias-label-secondary);white-space:nowrap;background:var(--dsw-alias-bg-layer-1)}',
      '.pm-chip[data-tone="ok"]{color:var(--dsw-alias-state-success-primary)}',
      '.pm-chip[data-tone="warn"]{color:var(--dsw-alias-state-warn-primary)}',
      '.pm-chip[data-tone="muted"]{color:var(--dsw-alias-label-tertiary);border-style:dashed}',
      '.pm-code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-markdown-inline-code);border:1px solid var(--dsw-alias-border-l1);border-radius:4px;padding:0 4px;white-space:nowrap}',
      '.pm-board{min-height:0;min-width:0;display:flex;flex-direction:column;overflow:hidden}',
      '.pm-tabs{display:flex;align-items:center;gap:4px;padding:10px 18px 0;border-bottom:1px solid var(--dsw-alias-border-l1);flex:none;overflow:auto}',
      '.pm-tab{cursor:pointer;border:1px solid transparent;border-bottom:0;background:transparent;color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:550;padding:6px 12px;border-radius:7px 7px 0 0;display:inline-flex;align-items:center;gap:6px;white-space:nowrap}',
      '.pm-tab:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}',
      '.pm-tab.on{color:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-base)}',
      '.pm-tab:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}',
      '.pm-tab-n{font-size:10px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}',
      '.pm-board-body{flex:1;min-height:0;overflow:auto;padding:14px 18px 26px}',
      '.pm-board-section-head{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin:0 0 10px;flex-wrap:wrap}',
      '.pm-board-section-title{margin:0;font-size:12.5px;font-weight:600;letter-spacing:.01em}',
      '.pm-board-section{margin-top:18px;padding-top:14px;border-top:1px solid var(--dsw-alias-border-l1)}',
      '.pm-empty-card{border:1px dashed var(--dsw-alias-border-l2);border-radius:11px;padding:18px 20px;display:flex;flex-direction:column;gap:7px;max-width:640px}',
      '.pm-empty-card h3{margin:0;font-size:13px;font-weight:600}',
      '.pm-empty-card p{margin:0;font-size:11.5px;color:var(--dsw-alias-label-secondary);line-height:1.6}',
      '.pm-empty-soft{background:var(--dsw-alias-bg-layer-1);margin-bottom:10px}',
      '.pm-epics{display:flex;flex-direction:column;gap:12px}',
      '.pm-epic{border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-1);padding:13px 15px;display:flex;flex-direction:column;gap:10px}',
      '.pm-epic-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}',
      '.pm-epic-title-wrap{min-width:0;display:flex;flex-direction:column;gap:4px}',
      '.pm-epic-title{margin:0;font-size:14.5px;font-weight:650;line-height:1.35;letter-spacing:-.01em}',
      '.pm-epic-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
      '.pm-stages{display:flex;align-items:stretch;gap:4px;flex-wrap:wrap}',
      '.pm-stage{cursor:pointer;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;padding:5px 8px;display:inline-flex;align-items:center;gap:5px;white-space:nowrap}',
      '.pm-stage:hover:not(:disabled){border-color:var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary)}',
      '.pm-stage:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}',
      '.pm-stage:disabled{cursor:default;opacity:.5}',
      '.pm-stage-missing{border-style:dashed}',
      '.pm-stage.on{border-color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 9%,var(--dsw-alias-bg-base))}',
      '.pm-stage-dot{width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-label-tertiary);flex:none;display:inline-block}',
      '.pm-stage[data-status="done"] .pm-stage-dot{background:var(--dsw-alias-state-success-primary)}',
      '.pm-stage[data-status="confirmed"] .pm-stage-dot{background:var(--dsw-alias-state-success-primary)}',
      '.pm-stage[data-status="waitingConfirm"] .pm-stage-dot{background:var(--dsw-alias-state-warn-primary)}',
      '.pm-stage[data-status="pmTodo"] .pm-stage-dot{background:var(--dsw-alias-brand-primary)}',
      '.pm-stage[data-status="aiInProgress"] .pm-stage-dot{background:var(--dsw-alias-state-business-primary)}',
      '.pm-stage[data-status="blocked"] .pm-stage-dot{background:var(--dsw-alias-state-error-primary)}',
      '.pm-stage[data-status="na"] .pm-stage-dot,.pm-stage[data-status="unknown"] .pm-stage-dot{background:var(--dsw-alias-state-idle-primary)}',
      '.pm-stage-label{line-height:1.4}',
      '.pm-stage-conf{width:5px;height:5px;border-radius:50%;margin-left:1px;border:1px solid currentColor}',
      '.pm-stage-conf[data-level="high"]{background:currentColor}',
      '.pm-stage-conf[data-level="medium"]{border-style:dashed;background:transparent}',
      '.pm-stage-conf[data-level="low"]{border-style:dotted;background:transparent;opacity:.65}',
      '.pm-stage-req{color:var(--dsw-alias-state-warn-primary);font-size:10px;line-height:1}',
      '.pm-stage-detail{border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-base);padding:11px 13px;display:flex;flex-direction:column;gap:8px}',
      '.pm-detail-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
      '.pm-detail-title{font-size:12px;font-weight:600}',
      '.pm-details{display:flex;flex-direction:column;gap:5px}',
      '.pm-detail-row{display:grid;grid-template-columns:88px minmax(0,1fr);gap:10px;align-items:start;font-size:11.5px}',
      '.pm-detail-k{color:var(--dsw-alias-label-tertiary);font-size:10.5px;padding-top:1px}',
      '.pm-detail-v{min-width:0;display:flex;flex-wrap:wrap;align-items:center;gap:5px}',
      '.pm-detail-note{margin:0;font-size:11px;color:var(--dsw-alias-label-secondary);line-height:1.55;max-width:80ch}',
      '.pm-detail-list{margin:2px 0 0;padding-left:16px;display:flex;flex-direction:column;gap:3px;font-size:10.5px;color:var(--dsw-alias-label-secondary)}',
      '.pm-detail-list li::marker{color:var(--dsw-alias-label-tertiary)}',
      '.pm-drafts{margin-top:2px;border-top:1px dashed var(--dsw-alias-border-l1);padding-top:9px;display:flex;flex-direction:column;gap:6px}',
      '.pm-drafts-title{font-size:10.5px;letter-spacing:.05em;color:var(--dsw-alias-label-tertiary)}',
      '.pm-draft-list{display:flex;flex-direction:column;gap:4px}',
      '.pm-draft-row{display:flex;align-items:center;gap:7px;font-size:11.5px;flex-wrap:wrap;padding:5px 8px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-base)}',
      '.pm-draft-title{font-weight:550;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1 1 12ch}',
      '.pm-story-wrap{display:flex;flex-direction:column;gap:10px}',
      '.pm-story-list{display:flex;flex-direction:column;gap:5px}',
      '.pm-story-row{display:grid;grid-template-columns:minmax(180px,2.2fr) 66px 96px 104px minmax(120px,1.4fr) 84px auto;gap:8px;align-items:center;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-alias-bg-layer-1);padding:7px 10px}',
      '.pm-story-main{display:flex;align-items:center;gap:7px;min-width:0;flex-wrap:wrap}',
      '.pm-story-title{font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;flex:1 1 12ch}',
      '.pm-story-miss{font-size:10.5px;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.pm-story-gate{display:inline-flex;align-items:center;gap:4px;font-size:10.5px;color:var(--dsw-alias-label-secondary)}',
      '.pm-story-gate[data-pass="true"]{color:var(--dsw-alias-state-success-primary)}',
      '.pm-story-gate[data-pass="false"]{color:var(--dsw-alias-state-warn-primary)}',
      '.pm-story-gate .pm-dot{background:currentColor}',
      '.pm-assets{display:flex;flex-direction:column;gap:10px}',
      '.pm-asset{border:1px solid var(--dsw-alias-border-l1);border-radius:11px;background:var(--dsw-alias-bg-layer-1);padding:12px 14px;display:flex;flex-direction:column;gap:7px}',
      '.pm-asset-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}',
      '.pm-asset-title-wrap{min-width:0;display:flex;flex-direction:column;gap:4px}',
      '.pm-asset-title{margin:0;font-size:13px;font-weight:600}',
      '.pm-asset-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
      '.pm-asset-foot{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;flex-wrap:wrap;border-top:1px dashed var(--dsw-alias-border-l1);padding-top:6px}',
      '.pm-drifts{display:flex;flex-direction:column;gap:4px}',
      '.pm-drifts-title{font-size:10.5px;color:var(--dsw-alias-label-tertiary)}',
      '.pm-drift{display:flex;align-items:baseline;gap:7px;flex-wrap:wrap;font-size:11px;padding:4px 7px;border-left:2px solid var(--dsw-alias-state-warn-primary);background:var(--dsw-alias-bg-base);border-radius:0 6px 6px 0}',
      '.pm-drift-high{border-left-color:var(--dsw-alias-state-error-primary)}',
      '.pm-drift-low{border-left-color:var(--dsw-alias-label-tertiary)}',
      '.pm-drift-msg{color:var(--dsw-alias-label-secondary);min-width:0}',
      '.pm-drift-hint{font-size:10px;color:var(--dsw-alias-label-tertiary)}',
      '.pm-health{display:flex;flex-direction:column;gap:10px}',
      '.pm-warn-list{display:flex;flex-direction:column;gap:6px}',
      '.pm-source-list{display:flex;flex-direction:column;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;overflow:hidden}',
      '.pm-source-row{display:grid;grid-template-columns:64px 150px minmax(0,1.4fr) minmax(0,1fr);gap:8px;align-items:center;padding:6px 10px;font-size:11px;background:var(--dsw-alias-bg-layer-1)}',
      '.pm-source-row+.pm-source-row{border-top:1px solid var(--dsw-alias-border-l1)}',
      '.pm-source-ok{font-size:10px;color:var(--dsw-alias-state-success-primary)}',
      '.pm-source-row[data-ok="false"] .pm-source-ok{color:var(--dsw-alias-state-warn-primary)}',
      '.pm-source-path{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10px;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.pm-source-issues{font-size:10px;color:var(--dsw-alias-state-warn-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.pm-archive-list{display:flex;flex-direction:column;gap:3px;margin-top:7px}',
      '.pm-archive-row{display:flex;align-items:center;gap:9px;font-size:11px;padding:4px 2px;border-bottom:1px dashed var(--dsw-alias-border-l1)}',
      '.pm-archive-row:last-child{border-bottom:0}',
      '.pm-archive-date{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10px;color:var(--dsw-alias-label-tertiary);flex:none}',
      '.pm-archive-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;flex:1 1 auto}',
      '.pm-archive-gate{display:inline-flex;align-items:center;gap:4px;font-size:10px;color:var(--dsw-alias-label-secondary);flex:none}',
      '.pm-archive-gate[data-pass="true"]{color:var(--dsw-alias-state-success-primary)}',
      '.pm-archive-gate .pm-dot{background:currentColor}',
      '.pm-launcher{flex:1;min-height:0;overflow:auto;display:flex;align-items:flex-start;justify-content:center;padding:30px 22px 50px}',
      '.pm-launcher-card{width:100%;max-width:760px;border:1px solid var(--dsw-alias-border-l1);border-radius:14px;background:var(--dsw-alias-bg-layer-1);padding:24px 26px;display:flex;flex-direction:column;gap:10px}',
      '.pm-launcher-badge{width:26px;height:26px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 18%,transparent);color:var(--dsw-alias-state-warn-primary);font-weight:700;font-size:14px}',
      '.pm-launcher-title{margin:0;font-size:17px;font-weight:650;line-height:1.35}',
      '.pm-launcher-body{margin:0;font-size:12px;color:var(--dsw-alias-label-secondary);line-height:1.65;max-width:72ch}',
      '.pm-launcher-steps{margin:2px 0 4px;padding-left:18px;display:flex;flex-direction:column;gap:4px;font-size:11.5px;color:var(--dsw-alias-label-secondary)}',
      '.pm-launcher-steps li::marker{color:var(--dsw-alias-label-tertiary)}',
      '.pm-launcher-acts{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:4px}',
      '.pm-launcher-note{margin:0;font-size:10.5px;color:var(--dsw-alias-state-warn-primary)}',
      '.pm-launcher-error{border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:8px 10px;background:var(--dsw-alias-bg-base)}',
      '.pm-launcher-error summary{cursor:pointer;font-size:11px;color:var(--dsw-alias-label-secondary)}',
      '.pm-launcher-error code{display:block;margin-top:6px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10px;color:var(--dsw-alias-label-tertiary);white-space:pre-wrap;word-break:break-word;max-height:160px;overflow:auto}',
      '.pm-launcher-runtime{display:flex;align-items:center;gap:6px;flex-wrap:wrap}',
      '.pm-launcher-sources{margin-top:8px;padding-top:12px;border-top:1px solid var(--dsw-alias-border-l1);display:flex;flex-direction:column;gap:8px}',
      '.pm-launcher-sources-title{margin:0;font-size:10.5px;letter-spacing:.07em;text-transform:uppercase;color:var(--dsw-alias-label-tertiary)}',
      '.pm-launcher-source-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 16px}',
      '.pm-launcher-source{display:flex;flex-direction:column;gap:3px;min-width:0}',
      '.pm-launcher-source-label{font-size:10.5px;color:var(--dsw-alias-label-secondary)}',
      '.pm-loading{flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:40px}',
      '.pm-spinner{width:22px;height:22px;border-radius:50%;border:2px solid var(--dsw-alias-border-l2);border-top-color:var(--dsw-alias-brand-primary);animation:pm-spin .9s linear infinite}',
      '@keyframes pm-spin{to{transform:rotate(360deg)}}',
      '.pm-loading-copy{display:flex;flex-direction:column;gap:3px;align-items:center}',
      '.pm-loading-title{margin:0;font-size:13px;font-weight:600}',
      '.pm-loading-hint{margin:0;font-size:11px;color:var(--dsw-alias-label-tertiary)}',
      '.pm-skeleton{display:flex;flex-direction:column;gap:7px;width:min(520px,80%)}',
      '.pm-skeleton-row{height:34px;border-radius:9px;background:var(--dsw-alias-bg-skeleton)}',
      '.pm-footer{flex:none;display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:7px 22px;border-top:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);font-size:10px;color:var(--dsw-alias-label-tertiary)}',
      '.pm-footer-main{color:var(--dsw-alias-label-secondary)}',
      '.pm-footer-src{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1 1 auto}',
      '.pm-footer-ver{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;flex:none}',
      '.pm-toasts{position:fixed;right:18px;bottom:18px;z-index:60;display:flex;flex-direction:column;gap:8px;max-width:min(420px,calc(100vw - 36px));pointer-events:none}',
      '.pm-toast{pointer-events:auto;display:flex;align-items:flex-start;gap:10px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-toast-bg);color:var(--dsw-alias-toast-label);padding:9px 11px;font-size:12px}',
      '.pm-toast-error{border-color:var(--dsw-alias-state-error-primary)}',
      '.pm-toast-warn{border-color:var(--dsw-alias-state-warn-primary)}',
      '.pm-toast-text{flex:1 1 auto;line-height:1.5}',
      '.pm-toast-x{cursor:pointer;border:0;background:transparent;color:var(--dsw-alias-label-tertiary);font-size:14px;line-height:1;padding:0 2px}',
      '.pm-card-questions{display:flex;flex-wrap:wrap;align-items:center;gap:4px;margin:2px 0 4px}',
      '.pm-card-questions-label{font-size:10.5px;color:var(--dsw-alias-label-tertiary)}',
      '.pm-chip-q{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:9.5px;padding:0 5px;border-radius:5px;border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary)}',
      '@media (max-width:1180px){.pm-kpis{grid-template-columns:repeat(3,minmax(0,1fr))}.pm-body{grid-template-columns:minmax(300px,340px) minmax(0,1fr)}}',
      '@media (max-width:980px){.pm-body{grid-template-columns:1fr;grid-template-rows:auto minmax(0,1fr);overflow:auto}.pm-queue{border-right:0;border-bottom:1px solid var(--dsw-alias-border-l1);overflow:visible;max-height:none}.pm-board{overflow:visible}.pm-board-body{overflow:visible}.pm-story-row{grid-template-columns:minmax(150px,1fr) repeat(2,minmax(64px,auto));row-gap:6px}.pm-source-row{grid-template-columns:56px 120px minmax(0,1fr);row-gap:2px}.pm-launcher-source-grid{grid-template-columns:1fr}}',
      '@media (max-width:640px){.pm-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.pm-head{padding:12px 14px 8px}.pm-live,.pm-kpis,.pm-banner{padding-left:14px;padding-right:14px}.pm-head-acts{flex-wrap:wrap}}',
      '@media (prefers-reduced-motion:reduce){.pm-spinner{animation:none}}',
    ].join('\n');

    /* ------------------------------------------------------------------ */
    /* 插件入口                                                            */
    /* ------------------------------------------------------------------ */

    function apply(ctx) {
      localeService = ctx.locale;
      workspaceService = ctx.uiWorkspace;
      ctx.effect(function () {
        return ctx.locale.register(NS, { zh: zh, en: en });
      }, 'openspec-pm-board: dictionaries');
      t = ctx.locale.bind(NS);

      ctx.slots.inject('main', function () {
        return ctx.slots.register({ name: 'main', key: PANEL_ID, locale: NS }, PmPane);
      });
      ctx.slots.inject('sidebar.panellist', function () {
        return ctx.slots.register({
          name: 'sidebar.panellist',
          id: PANEL_ID,
          order: 21,
          label: function () { return t('panel'); },
          locale: NS,
        }, PanelIcon);
      });
    }

    return {
      inject: ['slots', 'locale', 'uiWorkspace'],
      apply: apply,
    };
  },
});
