import type { SidebarRoot } from 'src/utils/types';

/**
 * Fadl bottom tabs: the register replaces Sales when POS is on.
 * `groups` already arrives filtered by feature flags, rights and phone
 * availability (usePhoneSidebar), so the pos group's presence is the switch.
 */
export function phoneTabs(groups: SidebarRoot[]): SidebarRoot[] {
  const hasPos = groups.some((group) => group.name === 'pos');
  const names = ['dashboard', hasPos ? 'pos' : 'sales', 'purchases', 'reports'];
  return names
    .map((name) => groups.find((group) => group.name === name))
    .filter((group): group is SidebarRoot => !!group);
}