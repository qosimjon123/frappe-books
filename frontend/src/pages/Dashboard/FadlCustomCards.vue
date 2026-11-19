<template>
  <div v-for="card in cards" :key="card.name" :class="cardClass">
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
      <template #error>
        <ChartLoadError @retry="loadData" />
      </template>
    </FrappeNumberCard>
  </div>
</template>
<script lang="ts">
import { NumberCard as FrappeNumberCard } from 'frappe-ui/charts';
import { fyo } from 'src/initFyo';
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
}

const COLORS: Record<string, string> = {
  blue: '#2563EB',
  green: '#16A34A',
  red: '#DC2626',
  gray: '#64748B',
  orange: '#D97706',
  primary: '',
};
/** Extra dashboard cards from Books Dashboard Settings. */
export default defineComponent({
  name: 'CustomCards',
  components: { ChartLoadError, FrappeNumberCard },
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
  },
});
</script>