const { setWorldConstructor, Before, After, setDefaultTimeout } = require('@cucumber/cucumber');
const { chromium } = require('@playwright/test');

// 运营后台发券链路涉及滚动 + Vue 渲染 + 后端请求，放宽默认步骤超时
setDefaultTimeout(15000);

// 调用后端测试后门清空数据；required 为 true 时失败即中断（前端代理指向 Node 3000，必须可用）
async function resetBackend(url, required) {
  try {
    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) throw new Error(`${url} 返回 ${res.status}`);
  } catch (e) {
    if (required) throw new Error(`后端数据重置失败: ${e.message}`);
    // 8000 (Python) 未启动时容忍失败
  }
}

class CustomWorld {
  constructor() {
    this.browser = null;
    this.page = null;
  }
}

setWorldConstructor(CustomWorld);

Before(async function (scenario) {
  // 持久化旅程（@persist）：steps 自行 spawn/重启后端进程并管理临时数据目录，
  // 不重置后端、不依赖浏览器，此处直接跳过，与既有 24 场景互不干扰
  const tags = ((scenario && scenario.pickle && scenario.pickle.tags) || []).map(t => t.name)
  if (tags.includes('@persist')) return

  await resetBackend('http://localhost:3000/api/__test/reset', true);
  await resetBackend('http://localhost:8000/api/__test/reset', false);
  this.browser = await chromium.launch({ headless: true });
  this.page = await this.browser.newPage();
});

After(async function () {
  if (this.browser) {
    await this.browser.close();
  }
});
