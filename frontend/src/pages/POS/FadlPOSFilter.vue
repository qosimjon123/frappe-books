<template>
  <!-- fadl: the phone POS category filter. Lives in its own file; the native
       POS.vue only imports it and passes the group it already owns. -->
  <span class="relative inline-flex">
    <FrappeButton
      :variant="group ? 'solid' : 'ghost'"
      size="md"
      theme="gray"
      icon-left="lucide-filter"
      :label="t`Filter`"
      :aria-label="group ? `${t`Filter`}: ${group}` : t`Filter`"
      :aria-pressed="!!group"
      @click="openSheet"
    />
    <!-- fadl: active filter = gray-solid (black in light, gray/black text in
         dark — native tokens) + red dot top-right. -->
    <span
      v-if="group"
      class="pointer-events-none absolute -right-0.5 -top-0.5 size-2 rounded-full bg-surface-red-7"
    />
  </span>
  <FrappeBottomSheet
    :open="open"
    :title="t`Item Group`"
    @update:open="(v: boolean) => (open = v)"
  >
    <!-- fadl: one row per group, full width, label left-aligned.
         frappe-ui themes are gray/blue/green/red only. -->
    <div class="flex flex-col gap-1.5 px-4 pb-6">
      <FrappeButton
        v-for="g in ['', ...groups]"
        :key="g"
        class="w-full !justify-start"
        :variant="g === group ? 'solid' : 'ghost'"
        theme="gray"
        :label="g || t`All`"
        :aria-pressed="g === group"
        @click="select(g)"
      />
    </div>
  </FrappeBottomSheet>
</template>

<script setup lang="ts">
import { t } from 'fyo';
import {
  BottomSheet as FrappeBottomSheet,
  Button as FrappeButton,
} from 'frappe-ui';
import { getPOSItemGroups } from 'src/utils/pos';
import { ref } from 'vue';

defineProps<{ group: string }>();
const emit = defineEmits<{ set: [group: string] }>();

const open = ref(false);
const groups = ref<string[]>([]);

async function openSheet() {
  open.value = true;
  if (!groups.value.length) {
    try {
      groups.value = await getPOSItemGroups();
    } catch {
      groups.value = [];
    }
  }
}

function select(g: string) {
  emit('set', g);
  open.value = false;
}
</script>
