module.exports = {
  default: {
    paths: ['features/**/*.feature'],
    require: ['steps/**/*.js', 'support/**/*.js'],
    format: ['progress-bar', 'html:cucumber-report.html'],
    formatOptions: { snippetInterface: 'async-await' }
  },
  // 既有回归（NODE_ENV=test 内存语义）：排除持久化旅程
  // 注：cucumber-js 的命名 profile 合并会覆盖 require/paths，须显式声明完整配置
  e2e: {
    paths: ['features/**/*.feature'],
    require: ['steps/**/*.js', 'support/**/*.js'],
    format: ['progress-bar', 'html:cucumber-report.html'],
    formatOptions: { snippetInterface: 'async-await' },
    tags: 'not @persist'
  },
  // 持久化旅程（STORAGE=file + 进程级重启）：仅运行 @persist 场景
  persist: {
    paths: ['features/**/*.feature'],
    require: ['steps/**/*.js', 'support/**/*.js'],
    format: ['progress-bar', 'html:cucumber-report.html'],
    formatOptions: { snippetInterface: 'async-await' },
    tags: '@persist'
  }
}
