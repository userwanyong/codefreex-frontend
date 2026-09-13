import { getCreditConfig } from '@/api/systemConfigController'
import { parseResponseData } from '@/utils/response'

/**
 * 码点计费价格（管理端可调）的前端缓存：
 * 拉取失败或未完成时回落到与后端一致的默认值，页面文案不再写死数字。
 */

const DEFAULTS: API.CreditConfig = {
  firstGenerateCost: 50,
  chatRoundCost: 10,
  inviteReward: 100,
  inviteCreateCostPerUse: 50,
  deployHourlyCost: 10,
  deployBillingIntervalMinutes: 60,
}

let cache: API.CreditConfig | null = null
let pending: Promise<API.CreditConfig> | null = null

/** 同步读取当前缓存（无缓存时返回默认值），用于模板初始渲染 */
export function getCachedCreditConfig(): API.CreditConfig {
  return cache || DEFAULTS
}

/** 拉取最新计费配置（页面 onMounted 调用），带并发去重与失败回落 */
export async function loadCreditConfig(): Promise<API.CreditConfig> {
  if (cache) return cache
  if (!pending) {
    pending = getCreditConfig()
      .then((res) => {
        if (res.data?.code === 0 && res.data.data) {
          cache = parseResponseData<API.CreditConfig>(res.data.data) || DEFAULTS
        } else {
          cache = DEFAULTS
        }
        return cache
      })
      .catch(() => {
        cache = DEFAULTS
        return cache
      })
      .finally(() => {
        pending = null
      })
  }
  return pending
}

/** 计费周期的展示文案（60 分钟 -> “1小时”） */
export function formatBillingPeriod(intervalMinutes?: number): string {
  const minutes = intervalMinutes || DEFAULTS.deployBillingIntervalMinutes || 60
  return minutes % 60 === 0 && minutes >= 60 ? `${minutes / 60}小时` : `${minutes}分钟`
}
