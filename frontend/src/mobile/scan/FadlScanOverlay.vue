<template>
  <!-- fadl: fixed top scanner panel replacing the native bottom sheet.
       Height = header + two search-row heights; the page is pushed down so
       the search row sits BELOW the panel and the cashier sees what is
       scanned and typed. Never grows. -->
  <span ref="anchor" class="hidden" />
  <div
    v-if="isOpen"
    class="fadl-scan-panel fixed inset-x-0 top-0 z-50 overflow-hidden bg-black shadow-lg"
    :class="{ 'fadl-scan-live': codePresent }"
    :style="{ height: `${height}px` }"
  >
    <!-- fadl: the sizer keeps the video at its natural aspect (no stretch,
         no letterbox); the panel crops it to a full-bleed band, so the
         camera fills the whole overlay while qrbox alone limits decoding. -->
    <div
      class="absolute inset-x-0 top-1/2 -translate-y-1/2"
      :style="{ height: `${sizerHeight}px` }"
    >
      <div :id="viewfinderId" ref="viewfinder" class="h-full w-full" />
    </div>
    <!-- fadl: the only way out is this X. -->
    <FrappeButton
      class="absolute right-2 top-2"
      variant="solid"
      theme="gray"
      size="sm"
      icon="lucide-x"
      :aria-label="t`Close`"
      @click="isOpen = false"
    />
    <div
      v-if="error || chip"
      class="absolute bottom-2 left-2 max-w-[80%] truncate rounded-4 px-2 py-1 text-p-base"
      :class="
        error
          ? 'bg-surface-red-7 text-ink-base'
          : 'bg-surface-gray-10 text-ink-base'
      "
      :role="error ? 'alert' : undefined"
    >
      {{ error || chip }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { t } from 'fyo';
import { Button as FrappeButton, shellScrollContainer } from 'frappe-ui';
import {
  nextTick,
  onBeforeUnmount,
  ref,
  useId,
  useTemplateRef,
  watch,
} from 'vue';
import { startFadlScanner, type Html5Qrcode } from './fadlScan';

const isOpen = defineModel<boolean>('open', { required: true });
const emit = defineEmits<{ scan: [code: string] }>();

const viewfinderId = `fadl-barcode-viewfinder-${useId()}`;
const anchor = useTemplateRef<HTMLElement>('anchor');
const viewfinder = useTemplateRef<HTMLElement>('viewfinder');
const height = ref(0);
const sizerHeight = ref(0);
let streamAspect = 0;
const error = ref('');
const chip = ref('');
const codePresent = ref(false);
let scanner: Html5Qrcode | null = null;
let lastAt = 0;
let dedupCode = '';
let emptyStreak = 0;
let chipTimer: ReturnType<typeof setTimeout> | undefined;

// Height = header (everything above the search row) + TWO search-row
// heights, per the cashier's spec. Taken before the push exists; subtract
// our own padding and scrollTop so re-measures (resize) stay stable.
function measure() {
  const row = anchor.value?.parentElement;
  if (!row) {
    return;
  }
  const shell = shellScrollContainer.value;
  const pad = shell ? parseFloat(shell.style.paddingTop) || 0 : 0;
  const scroll = shell ? shell.scrollTop - pad : 0;
  const top = row.getBoundingClientRect().top + scroll;
  height.value = Math.ceil(top + 2 * row.offsetHeight);
  if (streamAspect) {
    sizerHeight.value = Math.round(window.innerWidth * streamAspect);
  }
}

// Push by two search-row heights so the search row's top lands exactly at
// the panel height: it sits right below the camera, no blank gap.
function applyPad() {
  const shell = shellScrollContainer.value;
  const row = anchor.value?.parentElement;
  if (!shell) {
    return;
  }
  if (!isOpen.value || !row) {
    shell.style.paddingTop = '';
    return;
  }
  shell.style.paddingTop = `${2 * row.offsetHeight}px`;
}

watch(height, applyPad);

watch(isOpen, (open) => {
  if (open) {
    measure();
    sizerHeight.value = height.value;
    streamAspect = 0;
    chip.value = '';
    dedupCode = '';
    emptyStreak = 0;
    codePresent.value = false;
    error.value = '';
    window.addEventListener('resize', measure);
  } else {
    window.removeEventListener('resize', measure);
    codePresent.value = false;
  }
  applyPad();
});

// The camera runs while the viewfinder is on screen; closing stops it.
watch(viewfinder, (element) => void (element ? start() : stop()));
onBeforeUnmount(() => {
  clearTimeout(chipTimer);
  window.removeEventListener('resize', measure);
  const shell = shellScrollContainer.value;
  if (shell) {
    shell.style.paddingTop = '';
  }
  void stop();
});

async function start() {
  error.value = '';
  try {
    await nextTick();
    const box = viewfinder.value;
    if (!box) {
      return;
    }
    const aspect = box.clientWidth / Math.max(1, box.clientHeight);
    scanner = await startFadlScanner(
      viewfinderId,
      onScan,
      aspect,
      onEmptyFrame,
      height.value
    );
    // Once the stream's aspect is known, grow the sizer to it: the video
    // then fills the sizer undistorted and the panel shows a center band.
    const video = box.querySelector('video');
    video?.addEventListener('loadedmetadata', () => {
      if (video.videoWidth > 0) {
        streamAspect = video.videoHeight / video.videoWidth;
        sizerHeight.value = Math.round(window.innerWidth * streamAspect);
      }
    });
    // The panel can close while the camera starts.
    if (!viewfinder.value) {
      await stop();
    }
  } catch (reason) {
    error.value = String(reason).includes('NotAllowedError')
      ? t`Camera access is blocked. Allow it in the browser settings, or type the barcode.`
      : t`Could not start the camera: ${String(reason)}`;
  }
}

async function onScan(code: string) {
  // Frames keep decoding until X is pressed: unlimited scans per session.
  if (!scanner) {
    return;
  }
  emptyStreak = 0;
  codePresent.value = true;
  const now = Date.now();
  // Presence-based dedup, the way Scandit's smart filter works: a code held
  // in view adds once and re-arms only after it leaves the frame. A run of
  // identical items scans at full speed, with no timed dead zone.
  if (now - lastAt < 300 || code === dedupCode) {
    return;
  }
  lastAt = now;
  dedupCode = code;
  chip.value = code;
  clearTimeout(chipTimer);
  chipTimer = setTimeout(() => (chip.value = ''), 2000);
  emit('scan', code);
}

// ~400ms of empty frames at fps 10: the code left the view, re-arm the dedup.
// Shorter gaps are edge flicker and must not double-add a held code.
function onEmptyFrame() {
  emptyStreak += 1;
  if (emptyStreak >= 4) {
    dedupCode = '';
    codePresent.value = false;
  }
}

async function stop() {
  const current = scanner;
  scanner = null;
  if (current?.isScanning) {
    await current.stop();
  }
  current?.clear();
}
</script>

<style>
/* fadl: steady corner color from our presence flag. The library repaints
   white/green on every decode transition, so intermittent frames blink;
   these overrides hold green while a code is in view, white otherwise. */
.fadl-scan-panel #qr-shaded-region > div {
  background-color: #fff !important;
}
.fadl-scan-panel.fadl-scan-live #qr-shaded-region > div {
  background-color: rgb(90 193 56) !important;
}
</style>
