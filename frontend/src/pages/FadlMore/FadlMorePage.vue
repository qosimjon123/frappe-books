<template>
  <div class="flex min-h-full flex-col bg-surface-base">
    <PageHeader :title="t`More`" />
    <div class="flex flex-col gap-5 p-4">
      <section v-for="group in hub" :key="group.name" class="flex flex-col gap-2">
        <h2 class="px-1 text-sm text-ink-gray-5">{{ group.label }}</h2>
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="item in group.items"
            :key="item.name"
            type="button"
            class="flex aspect-square flex-col items-center justify-center gap-2 rounded-5 border border-outline-gray-2 bg-surface-base p-2 text-center active:bg-surface-gray-2"
            @click="router.push(getSidebarLocation(item))"
          >
            <FrappeIcon :icon="item.icon" class="size-6 shrink-0 text-ink-gray-6" />
            <span class="line-clamp-2 text-sm text-ink-gray-9">{{ item.label }}</span>
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon as FrappeIcon } from 'frappe-ui';
import { t } from 'fyo';
import { useRouter } from 'vue-router';
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
    name: 'opening-stock',
    label: t`Opening Stock`,
    icon: 'lucide-package-plus',
    filters: [
      ['purpose', '=', 'Material Receipt'],
      ['receipt_basis', '=', 'Opening Stock'],
    ],
  },
  {
    name: 'stock-surplus',
    label: t`Stock Surplus`,
    icon: 'lucide-clipboard-plus',
    filters: [
      ['purpose', '=', 'Material Receipt'],
      ['receipt_basis', '=', 'Stock Surplus'],
    ],
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
    name: 'journal-loans',
    label: t`Loans and Other`,
    icon: 'lucide-hand-coins',
    filters: [['voucher_type', '=', 'Journal Entry']],
  },
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

/** A plain tile and the named operations that replace it, keyed by its route. */
const REPLACEMENTS: Record<string, { schema: string; presets: Preset[] }> = {
  '/list/StockEntry': { schema: 'StockEntry', presets: STOCK_PRESETS },
  '/list/JournalEntry': { schema: 'JournalEntry', presets: JOURNAL_PRESETS },
};

/**
 * Children of a tile that survived boot rights and feature flags: each preset
 * inherits the parent item whole, so its access is exactly the parent's.
 * The translated label titles the list, as the Payment lists do.
 */
function expand(item: SidebarItem, schema: string, presets: Preset[]): SidebarItem[] {
  return presets.map((preset) => ({
    ...item,
    name: preset.name,
    label: preset.label,
    icon: preset.icon,
    route: `/list/${schema}/${preset.label}`,
    filters: preset.filters,
  }));
}

function replaceItems(items: SidebarItem[]): SidebarItem[] {
  return items.flatMap((item) => {
    const replacement = REPLACEMENTS[item.route];
    return replacement
      ? expand(item, replacement.schema, replacement.presets)
      : [item];
  });
}

const hub = groups
  .filter((group) => group.name !== 'dashboard')
  .map((group) =>
    group.items ? { ...group, items: replaceItems(group.items) } : group
  );
</script>