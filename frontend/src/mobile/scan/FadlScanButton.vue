<template>
  <FrappeButton
    v-bind="$attrs"
    icon="lucide-scan-barcode"
    :label="t`Scan barcode`"
    @click="isOpen = true"
  />
  <FadlScanOverlay
    v-model:open="isOpen"
    @scan="(code: string) => emit('scan', code)"
  />
</template>
<script setup lang="ts">
import { t } from 'fyo';
import { Button as FrappeButton } from 'frappe-ui';
import { onDeactivated, ref } from 'vue';
import FadlScanOverlay from './FadlScanOverlay.vue';

/** fadl: the native scan button, but the camera opens as a fixed top panel. */
defineOptions({ inheritAttrs: false });
const emit = defineEmits<{ scan: [code: string] }>();
const isOpen = ref(false);

// fadl: POS is keep-alive; leaving the page deactivates instead of unmounting,
// so close here or the camera keeps running and greets us open on return.
onDeactivated(() => {
  isOpen.value = false;
});
</script>
