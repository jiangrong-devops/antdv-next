import type { AntdvMenuItem } from './interface'
import type { InnerLocale } from '@/utils/locale'
import locales from '@/locales'

function flattenProLocales(nestedLocales: { pro: Record<string, string> }) {
  const flattened: Record<string, string> = {}

  for (const [key, value] of Object.entries(nestedLocales.pro)) {
    const kebabKey = key.replace(/([A-Z])/g, '-$1').toLowerCase()
    flattened[`/pro/${kebabKey}`] = value
  }

  return flattened
}

export const proLocales: Record<string, Record<InnerLocale, string>> = (() => {
  const zhFlat = flattenProLocales(locales['zh-CN'].menuPro)
  const enFlat = flattenProLocales(locales['en-US'].menuPro)

  const result: Record<string, Record<InnerLocale, string>> = {}

  for (const key of Object.keys(zhFlat)) {
    const zhValue = zhFlat[key]
    const enValue = enFlat[key]
    if (zhValue && enValue) {
      result[key] = {
        'zh-CN': zhValue,
        'en-US': enValue,
      }
    }
  }

  return result
})()

export const proMenus: AntdvMenuItem[] = [
  {
    key: '/pro/scrollbar',
    label: '/pro/scrollbar',
  },
]
