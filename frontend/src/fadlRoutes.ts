import More from 'src/pages/FadlMore/FadlMorePage.vue';
import type { RouteRecordRaw } from 'vue-router';

/** fadl: phone-only routes, spread into the native routes array. */
export const fadlRoutes: RouteRecordRaw[] = [
  {
    path: '/more',
    name: 'More',
    meta: { phoneOnly: true },
    component: More,
  },
];
