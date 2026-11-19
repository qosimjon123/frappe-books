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
import { usePhoneSidebar } from 'src/mobile/usePhoneSidebar';
import { getSidebarLocation } from 'src/utils/sidebarNavigation';

const router = useRouter();
// Groups arrive already filtered by boot rights, feature switches and phone
// availability (usePhoneSidebar) — the hub adds no checks of its own.
const { groups } = usePhoneSidebar();
const hub = groups.filter((group) => group.name !== 'dashboard');
</script>