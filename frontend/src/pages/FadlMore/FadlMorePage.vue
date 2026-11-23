<template>
  <div class="flex min-h-full flex-col bg-surface-base">
    <PageHeader :title="t`More`" />
    <div class="flex flex-col gap-5 p-4">
      <section
        v-for="group in hub"
        :key="group.name"
        class="flex flex-col gap-2"
      >
        <h2 class="px-1 text-sm text-ink-gray-5">{{ group.label }}</h2>
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="item in group.items"
            :key="item.name"
            type="button"
            class="flex aspect-square flex-col items-center justify-center gap-2 rounded-5 border border-outline-gray-2 bg-surface-base p-2 text-center active:bg-surface-gray-2"
            @click="router.push(getSidebarLocation(item))"
          >
            <span
              class="flex size-9 shrink-0 items-center justify-center rounded-6"
              :class="groupChip(group.name)"
            >
              <FrappeIcon :icon="item.icon" class="size-5" />
            </span>
            <span class="line-clamp-2 text-sm text-ink-gray-9">{{
              item.label
            }}</span>
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon as FrappeIcon, shellScrollContainer } from 'frappe-ui';
import { t } from 'fyo';
import { onActivated } from 'vue';
import { onBeforeRouteLeave, useRouter } from 'vue-router';
import PageHeader from 'src/components/PageHeader.vue';
import type { Filter } from 'src/frappe/api';
import { usePhoneSidebar } from 'src/mobile/usePhoneSidebar';
import { getSidebarLocation } from 'src/utils/sidebarNavigation';
import type { SidebarItem } from 'src/utils/types';

const router = useRouter();
// Groups arrive already filtered by boot rights, feature switches and phone
// availability (usePhoneSidebar) — the hub adds no checks of its own.
const { groups } = usePhoneSidebar();

/** One named operation: a filtered list whose create form takes the same filters. */
interface Preset {
  name: string;
  label: string;
  icon: string;
  filters: Filter[];
}

/** Stock Entry's purposes, named as the shop floor knows them. */
const STOCK_PRESETS: Preset[] = [
  {
    name: 'stock-receipt',
    label: t`Stock Receipt`,
    icon: 'lucide-package-plus',
    filters: [['purpose', '=', 'Material Receipt']],
  },
  {
    name: 'stock-shortage',
    label: t`Stock Write-off`,
    icon: 'lucide-package-minus',
    filters: [['purpose', '=', 'Material Issue']],
  },
  {
    name: 'stock-transfer',
    label: t`Stock Transfer`,
    icon: 'lucide-arrow-right-left',
    filters: [['purpose', '=', 'Material Transfer']],
  },
  {
    name: 'stock-repack',
    label: t`Repack`,
    icon: 'lucide-boxes',
    filters: [['purpose', '=', 'Repack']],
  },
];

/** Journal Entry's voucher types; the form still lets the user switch the type. */
const JOURNAL_PRESETS: Preset[] = [
  {
    name: 'journal-cash',
    label: t`Cash Entry`,
    icon: 'lucide-banknote',
    filters: [['voucher_type', '=', 'Cash Entry']],
  },
  {
    name: 'journal-bank',
    label: t`Bank Entry`,
    icon: 'lucide-landmark',
    filters: [['voucher_type', '=', 'Bank Entry']],
  },
];

/** Payment Entry's three operations; transfers get their own list at last. */
const PAYMENT_SALES: Preset = {
  name: 'payment-sales',
  label: t`Sales Payment`,
  icon: 'lucide-wallet',
  filters: [
    ['payment_type', '=', 'Receive'],
    ['party_type', '=', 'Books Customer'],
  ],
};
const PAYMENT_PURCHASE: Preset = {
  name: 'payment-purchase',
  label: t`Purchase Payment`,
  icon: 'lucide-wallet',
  filters: [
    ['payment_type', '=', 'Pay'],
    ['party_type', '=', 'Books Supplier'],
  ],
};
const PAYMENT_TRANSFER: Preset = {
  name: 'payment-transfer',
  label: t`Internal Transfer`,
  icon: 'lucide-arrow-right-left',
  filters: [['payment_type', '=', 'Internal Transfer']],
};

const SALES_PAYMENT_ROUTE = `/list/PaymentEntry/${t`Sales Payment`}`;
const PURCHASE_PAYMENT_ROUTE = `/list/PaymentEntry/${t`Purchase Payment`}`;

/** A plain tile and the named operations that replace it, keyed by its route. */
const REPLACEMENTS: Record<string, { schema: string; presets: Preset[] }> = {
  '/list/StockEntry': { schema: 'StockEntry', presets: STOCK_PRESETS },
  '/list/JournalEntry': { schema: 'JournalEntry', presets: JOURNAL_PRESETS },
  [SALES_PAYMENT_ROUTE]: { schema: 'PaymentEntry', presets: [PAYMENT_SALES] },
  [PURCHASE_PAYMENT_ROUTE]: {
    schema: 'PaymentEntry',
    presets: [PAYMENT_PURCHASE],
  },
};

/**
 * Children of a tile that survived boot rights and feature flags: each preset
 * inherits the parent item whole, so its access is exactly the parent's.
 * The translated label titles the list, as the Payment lists do.
 * Filters only prefill the create form; every field stays visible on phone
 * and on desktop, so the two never diverge.
 */
function expand(
  item: SidebarItem,
  schema: string,
  presets: Preset[]
): SidebarItem[] {
  return presets.map((preset) => ({
    ...item,
    name: preset.name,
    label: preset.label,
    icon: preset.icon,
    // Encode the title: a translation may contain "/" or spaces, which would
    // otherwise split the path into extra segments and break the list route.
    route: `/list/${schema}/${encodeURIComponent(preset.label)}`,
    filters: preset.filters,
  }));
}

/** The sales-payment tile, reused as the parent of the transfer tile. */
let paymentParent: SidebarItem | undefined;

function replaceItems(items: SidebarItem[], groupName: string): SidebarItem[] {
  const out = items.flatMap((item) => {
    if (item.route === SALES_PAYMENT_ROUTE) {
      paymentParent = item;
    }
    const replacement = REPLACEMENTS[item.route];
    return replacement
      ? expand(item, replacement.schema, replacement.presets)
      : [item];
  });
  // Transfers belong to neither sales nor purchases: show them under Common.
  if (groupName === 'common-entries' && paymentParent) {
    out.push(...expand(paymentParent, 'PaymentEntry', [PAYMENT_TRANSFER]));
  }
  return out;
}

const mapped = groups
  .filter((group) => group.name !== 'dashboard')
  .map((group) =>
    group.items
      ? { ...group, items: replaceItems(group.items, group.name) }
      : group
  );

// Common first: its tiles (items, journals, transfers) are the daily ones.
// Reorder after the map so replaceItems still runs in sidebar order.
const commonIndex = mapped.findIndex(
  (group) => group.name === 'common-entries'
);
const hub =
  commonIndex > 0
    ? [
        mapped[commonIndex],
        ...mapped.slice(0, commonIndex),
        ...mapped.slice(commonIndex + 1),
      ]
    : mapped;

/**
 * iOS-style category chips: one hue per group on a neutral tile. Red and
 * green stay reserved for their semantic use elsewhere in the app; Setup
 * and any rare regional group keep the neutral chip. Token pairs adapt to
 * dark mode on their own.
 */
const GROUP_CHIPS: Record<string, string> = {
  'common-entries': 'bg-surface-blue-2 text-ink-blue-7',
  sales: 'bg-surface-violet-2 text-ink-violet-7',
  purchases: 'bg-surface-amber-2 text-ink-amber-7',
  inventory: 'bg-surface-teal-2 text-ink-teal-7',
  reports: 'bg-surface-orange-2 text-ink-orange-7',
  pos: 'bg-surface-pink-2 text-ink-pink-7',
};
const NEUTRAL_CHIP = 'bg-surface-gray-2 text-ink-gray-6';

function groupChip(groupName: string): string {
  return GROUP_CHIPS[groupName] ?? NEUTRAL_CHIP;
}

// The shell's scroll container is shared by every page, so leaving More
// loses its position. The page is kept alive (MobileDesk's <keep-alive>):
// save the position before the DOM swaps, restore it on return.
let savedScrollTop = 0;
onBeforeRouteLeave(() => {
  savedScrollTop = shellScrollContainer.value?.scrollTop ?? 0;
});
onActivated(() => {
  const el = shellScrollContainer.value;
  if (el) el.scrollTop = savedScrollTop;
});
</script>
