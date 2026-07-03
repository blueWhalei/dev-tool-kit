import { computed, h } from 'vue'
import { useI18n } from 'vue-i18n'
import type { MenuOption } from 'naive-ui'
import type { RouteRecordRaw } from 'vue-router'
import { routes, categories } from '../router'
import ToolIcon from '../components/ToolIcon.vue'
import { CATEGORY_ICON_MAP } from '../components/icons/tool-icons'
import { usePreferences } from '../stores/preferences'
import { useRouteLabels } from './useRouteLabels'

export function useMenuOptions() {
  const { t, locale } = useI18n()
  const { routeTitle } = useRouteLabels()
  const { pinnedTools } = usePreferences()

  return computed((): MenuOption[] => {
    void locale.value

    const menuRoutes = routes.filter(
      (route: RouteRecordRaw) => route.meta?.titleKey && route.meta?.category && !route.meta?.hidden
    )

    const categoryMap = new Map<string, RouteRecordRaw[]>()
    menuRoutes.forEach((route: RouteRecordRaw) => {
      const category = route.meta!.category!
      if (!categoryMap.has(category)) {
        categoryMap.set(category, [])
      }
      categoryMap.get(category)!.push(route)
    })

    categoryMap.forEach((categoryRoutes: RouteRecordRaw[]) => {
      categoryRoutes.sort((a: RouteRecordRaw, b: RouteRecordRaw) => (a.meta?.order ?? 0) - (b.meta?.order ?? 0))
    })

    const sortedCategories = [...categories].sort((a, b) => a.order - b.order)

    const categoryMenus: MenuOption[] = sortedCategories
      .filter((cat) => categoryMap.has(cat.key))
      .map((category) => ({
        label: t(`nav.category.${category.key}`),
        key: category.key,
        icon: () => h(ToolIcon, {
          name: CATEGORY_ICON_MAP[category.key] ?? category.icon,
          size: 16
        }),
        children: categoryMap.get(category.key)!.map((route: RouteRecordRaw) => ({
          label: routeTitle(route),
          key: route.name as string,
          icon: () => h(ToolIcon, { name: route.meta!.icon, size: 16 })
        }))
      }))

    const pinnedRoutes = pinnedTools.value
      .map(name => menuRoutes.find(r => r.name === name))
      .filter((r): r is RouteRecordRaw => r !== undefined)

    if (pinnedRoutes.length === 0) {
      return categoryMenus
    }

    const pinnedMenu: MenuOption = {
      label: t('nav.pinned'),
      key: 'pinned',
      icon: () => h(ToolIcon, { name: 'key', size: 16 }),
      children: pinnedRoutes.map((route: RouteRecordRaw) => ({
        label: routeTitle(route),
        key: `pinned-${route.name as string}`,
        icon: () => h(ToolIcon, { name: route.meta!.icon, size: 16 })
      }))
    }

    return [pinnedMenu, ...categoryMenus]
  })
}
