module.exports = {
  default: {
    paths: ['features/**/*.feature'],
    require: ['steps/**/*.js', 'support/**/*.js'],
    format: ['progress-bar', 'html:cucumber-report.html'],
    formatOptions: { snippetInterface: 'async-await' }
  }
}
