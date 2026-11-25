import { t } from 'fyo';
import { SidebarItem } from './types';

/**
 * fadl: our entries in the Common group, spread into the native sidebar.
 * A function, because `t` reads the language map the web app sets after load.
 */
export function getFadlCommonItems(): SidebarItem[] {
  return [
    {
      label: t`Loans`,
      name: 'loans',
      icon: 'lucide-hand-coins',
      route: '/list/FadlLoan',
      schemaName: 'FadlLoan',
    },
  ];
}
