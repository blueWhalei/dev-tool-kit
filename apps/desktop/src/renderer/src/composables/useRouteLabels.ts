import { useI18n } from 'vue-i18n'
import type { RouteRecordRaw } from 'vue-router'

export function useRouteLabels() {
  const { t, locale } = useI18n()

  function routeTitle(route: Pick<RouteRecordRaw, 'meta'> | undefined): string {
    void locale.value
    const titleKey = route?.meta?.titleKey
    return titleKey ? t(titleKey) : ''
  }

  function categoryLabel(categoryKey: string): string {
    void locale.value
    return t(`nav.category.${categoryKey}`)
  }

  return { routeTitle, categoryLabel, locale }
}
