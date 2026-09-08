/**
 * 渠道配置领域逻辑（story-miniprogram-channel-config / miniprogram-channel capability / Channel Context）
 *
 * 纯函数、零外部依赖（对齐 Domain 层约束）：
 * - `defaultChannelConfig()`：默认配置（appid 空 / appsecretConfigured=false / mchid 空 / enabled=false，R-CHN-009 默认停用）
 * - `maskSecret(secret)`：AppSecret 脱敏掩码（前 4 + 掩码 + 后 4，R-CHN-004，Q4）
 * - `toPublicConfig(store)`：存储 → 脱敏公开视图（永不携带明文 appsecret）
 * - `mergeConfigInput(prev, input)`：PUT 输入合并（appsecret 为空保留已存值，非空覆盖）
 */

/**
 * 默认渠道配置：未配置 → 默认停用（R-CHN-009，防止未配置即开放）
 * @returns {{ appid: string, appsecret: string, mchid: string, enabled: boolean }}
 */
export function defaultChannelConfig() {
  return { appid: '', appsecret: '', mchid: '', enabled: false }
}

/**
 * AppSecret 脱敏掩码：前 4 位 + 掩码 + 后 4 位（R-CHN-004，Q4）。
 * 空串/未配置 → 返回空串。
 * @param {string} secret 明文 AppSecret
 * @returns {string} 掩码形式（前 4 + •••••• + 后 4）；secret 为空返回 ''
 */
export function maskSecret(secret) {
  if (!secret) return ''
  if (secret.length <= 8) return '•'.repeat(secret.length)
  return `${secret.slice(0, 4)}${'•'.repeat(secret.length - 8)}${secret.slice(-4)}`
}

/**
 * 存储配置 → 脱敏公开视图（读取 API 返回；永不包含明文 appsecret）。
 * @param {{ appid: string, appsecret: string, mchid: string, enabled: boolean }} store 服务端存储配置
 * @returns {{ appid: string, appsecretConfigured: boolean, appsecretMasked: string, mchid: string, enabled: boolean }}
 */
export function toPublicConfig(store) {
  const cfg = store || defaultChannelConfig()
  const configured = Boolean(cfg.appsecret)
  return {
    appid: cfg.appid || '',
    appsecretConfigured: configured,
    appsecretMasked: configured ? maskSecret(cfg.appsecret) : '',
    mchid: cfg.mchid || '',
    enabled: Boolean(cfg.enabled)
  }
}

/**
 * PUT 输入合并（R-CHN-006）：appsecret 为空/未提供 → 保留已存值（configured 状态不变）；
 * appsecret 非空 → 覆盖（重新配置，Q4）。appid/mchid 全量覆盖（允许清空）。enabled 布尔化。
 * @param {{ appid: string, appsecret: string, mchid: string, enabled: boolean }} prev 当前存储配置
 * @param {{ appid?: string, appsecret?: string, mchid?: string, enabled?: boolean }} input PUT 请求体
 * @returns {{ appid: string, appsecret: string, mchid: string, enabled: boolean }} 合并后的存储配置
 */
export function mergeConfigInput(prev, input) {
  const base = prev || defaultChannelConfig()
  const appsecret =
    typeof input.appsecret === 'string' && input.appsecret.trim() !== ''
      ? input.appsecret
      : base.appsecret || ''
  return {
    appid: typeof input.appid === 'string' ? input.appid : base.appid || '',
    appsecret,
    mchid: typeof input.mchid === 'string' ? input.mchid : base.mchid || '',
    enabled: typeof input.enabled === 'boolean' ? input.enabled : Boolean(base.enabled)
  }
}
