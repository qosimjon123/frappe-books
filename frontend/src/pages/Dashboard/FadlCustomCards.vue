<template>
  <!-- A phone card is the link, the way native InvoiceCards are. -->
  <component
    :is="isMobile && hasLink(card) ? 'RouterLink' : 'div'"
    v-for="card in cards"
    :key="card.name"
    :to="isMobile && hasLink(card) ? getCardRoute(card) : undefined"
    :class="cardClass"
  >
    <FrappeNumberCard
      :title="card.title"
      :value="card.value"
      :color="cardColor(card)"
      :format="card.format === 'int' ? (v) => String(v) : valueFormat"
      :loading="!isLoaded"
      :error="error"
      :card="false"
      class="-mt-2 pt-2"
    >
      <template v-if="!isMobile && hasLink(card)" #actions>
        <FrappeButton
          variant="ghost"
          size="sm"
          icon="lucide-arrow-up-right"
          :tooltip="t`Open`"
          :route="getCardRoute(card)"
        />
      </template>
      <template #error>
        <ChartLoadError @retry="loadData" />
      </template>
    </FrappeNumberCard>
  </component>
</template>
<script lang="ts">
import { t } from 'fyo';
import { Button as FrappeButton } from 'frappe-ui';
import { NumberCard as FrappeNumberCard } from 'frappe-ui/charts';
import { fyo } from 'src/initFyo';
import { canOpen } from 'src/utils/sidebarConfig';
import { call } from 'src/web/api';
import { defineComponent } from 'vue';
import BaseDashboardChart from './BaseDashboardChart.vue';
import ChartLoadError from './ChartLoadError.vue';

interface DashboardCard {
  name: string;
  title: string;
  value: number | null;
  count: number;
  format: 'currency' | 'int';
  color: string | null;
  route?: string | null;
  metric_method?: string | null;
  from_date?: string;
  to_date?: string;
}

/** Metrics counted over the dashboard period; the rest are as-of-now. */
const PERIOD_METRICS = new Set([
  'get_sales',
  'get_purchases',
  'get_receipts',
  'get_payments',
  'get_transfers',
  'get_stock_movements',
  'get_expenses',
  'get_gross_profit',
]);

const COLORS: Record<string, string> = {
  blue: '#2563EB',
  green: '#16A34A',
  red: '#DC2626',
  gray: '#64748B',
  orange: '#D97706',
  primary: '',
};
/** Extra dashboard cards from Books Dashboard Settings; each opens its documents. */
export default defineComponent({
  name: 'CustomCards',
  components: { ChartLoadError, FrappeButton, FrappeNumberCard },
  extends: BaseDashboardChart,
  data() {
    return { cards: [] as DashboardCard[], COLORS };
  },
  computed: {
    valueFormat(): (value: number) => string {
      return this.isMobile
        ? this.compactCurrency
        : (value) => fyo.format(value, 'Currency');
    },
  },
  methods: {
    async setData() {
      this.cards = await call<DashboardCard[]>(
        'fadl_books.dashboard.get_dashboard_cards',
        { period: this.period }
      );
    },
    cardColor(card: DashboardCard): string | undefined {
      if (card.color === 'dynamic') {
        return (card.value ?? 0) < 0 ? COLORS.red : COLORS.green;
      }
      return COLORS[card.color || 'primary'] || undefined;
    },
    /** The card's configured route, plus the dashboard period for flow metrics. */
    linkFor(card: DashboardCard) {
      if (!card.route) {
        return null;
      }
      const [path, query] = card.route.split('?');
      if (!canOpen(path)) {
        return null;
      }
      if (path.includes('Stock') && !fyo.isFeatureOn('enable_inventory')) {
        return null;
      }
      const params = new URLSearchParams(query ?? '');
      const key = (card.metric_method ?? '').split('.').pop() ?? '';
      if (PERIOD_METRICS.has(key) && card.from_date && card.to_date) {
        if (path.startsWith('/report')) {
          params.set('fromDate', card.from_date);
          params.set('toDate', card.to_date);
        } else {
          const filters = JSON.parse(params.get('filters') ?? '[]');
          filters.push(['posting_date', 'between', [card.from_date, card.to_date]]);
          params.set('filters', JSON.stringify(filters));
        }
      }
      return { path, query: Object.fromEntries(params) };
    },
    hasLink(card: DashboardCard): boolean {
      const route = this.linkFor(card);
      // Lists open only when there is something to show, as InvoiceCards do.
      return !!route && (route.path.startsWith('/report') || card.count > 0);
    },
    getCardRoute(card: DashboardCard) {
      return this.linkFor(card)!;
    },
  },
});
</script>