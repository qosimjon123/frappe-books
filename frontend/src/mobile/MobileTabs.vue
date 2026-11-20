<template>
  <FrappeMobileNav>
    <FrappeMobileNavItem
      v-for="tab in tabs"
      :key="tab.name"
      :label="tab.label"
      :icon="tab.icon"
      :active="tab.name === activeTab"
      @click="openTab(tab)"
    />
  </FrappeMobileNav>
</template>
<script setup lang="ts">
import {
  MobileNav as FrappeMobileNav,
  MobileNavItem as FrappeMobileNavItem,
  shellScrollContainer,
} from 'frappe-ui';
import { t } from 'fyo';
import type { SidebarRoot } from 'src/utils/types';
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { usePhoneSidebar } from './usePhoneSidebar';
import { activeTabName, moreTab, phoneTabs } from './fadlTabs'; // fadl: tabs

const route = useRoute();
const router = useRouter();
const { groups, active } = usePhoneSidebar();
const searchTab: SidebarRoot = {
  name: 'search',
  label: t`Search`,
  icon: 'lucide-search',
  route: '/search',
};
const tabs = [...phoneTabs(groups), searchTab, moreTab]; // fadl: phone tabs
const activeTab = computed(() =>
  activeTabName(route.path, active.value?.group.name, tabs, searchTab)
);

// MobileNavItem's `route` matches by route name, so any two lists are one page
// (frappe/frappe-ui#1245).
async function openTab(tab: SidebarRoot) {
  if (router.resolve(tab.route).path !== route.path) {
    await router.push(tab.route);
    return;
  }

  shellScrollContainer.value?.scrollTo({ top: 0, behavior: 'smooth' });
}
</script>
