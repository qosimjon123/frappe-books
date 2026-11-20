<template>
  <!-- fadl: the phone POS category filter. Lives in its own file; the native
       POS.vue only imports it and passes the group it already owns. -->
  <!-- @vue-ignore -->
  <FrappeButton
    variant="ghost"
    size="md"
    :theme="group ? 'primary' : 'secondary'"
    icon-left="lucide-filter"
    :label="group || t`Filter`"
    :aria-label="t`Filter`"
    :aria-pressed="!!group"
    @click="openSheet"
  />
  <FrappeBottomSheet
    :open="open"
    :title="t`Item Group`"
    @update:open="(v: boolean) => (open = v)"
  >
    <!-- fadl: one row per group, full width, label left-aligned. -->
    <div class="flex flex-col gap-1.5 px-4 pb-6">
    <!-- @vue-ignore -->
      <FrappeButton
        v-for="g in ['', ...groups]"
        :key="g"
        class="w-full !justify-start"
        :variant="g === group ? 'subtle' : 'outline'"
        :theme="g === group ? 'primary' : 'secondary'"
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

const props = defineProps<{ group: string }>();
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