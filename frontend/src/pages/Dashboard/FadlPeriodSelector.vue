<template>
  <template v-if="isMobile">
    <FrappeButton
      size="md"
      variant="subtle"
      icon-right="lucide-chevron-down"
      :label="currentLabel"
      @click="isSheetOpen = true"
    />
    <MobileOptionsSheet
      v-model:open="isSheetOpen"
      :title="t`Period`"
      :options="options"
      :value="selectValue"
      @select="selectOption"
    />
  </template>
  <FrappeSelect
    v-else
    :model-value="selectValue"
    :options="options"
    side="bottom"
    align="end"
    @update:model-value="selectOption"
  />

  <FrappeDialog
    :open="isRangeOpen"
    :title="t`Custom period`"
    :actions="[
      { label: t`Cancel`, onClick: () => { isRangeOpen = false; } },
      { label: t`Apply`, variant: 'solid', onClick: applyRange },
    ]"
    @update:open="(value: boolean) => (isRangeOpen = value)"
  >
    <div class="flex w-full flex-col gap-4">
      <div class="flex w-full gap-4">
        <FrappeTextInput
          v-if="isMobile"
          type="date"
          size="lg"
          variant="subtle"
          :label="t`From`"
          :model-value="rangeFrom"
          class="w-full"
          @update:model-value="(value: string) => (rangeFrom = value)"
        />
        <FrappeDatePicker
          v-else
          :label="t`From`"
          :format="pickerFormat"
          :model-value="rangeFrom"
          class="w-full"
          side="bottom"
          align="start"
          @change="(value: string) => (rangeFrom = value)"
        />
        <FrappeTextInput
          v-if="isMobile"
          type="date"
          size="lg"
          variant="subtle"
          :label="t`To`"
          :model-value="rangeTo"
          class="w-full"
          @update:model-value="(value: string) => (rangeTo = value)"
        />
        <FrappeDatePicker
          v-else
          :label="t`To`"
          :format="pickerFormat"
          :model-value="rangeTo"
          class="w-full"
          side="bottom"
          align="start"
          @change="(value: string) => (rangeTo = value)"
        />
      </div>
      <p v-if="rangeError" class="text-p-base text-ink-red-6">
        {{ rangeError }}
      </p>
    </div>
  </FrappeDialog>
</template>

<script lang="ts">
import { t } from 'fyo';
import {
  Button as FrappeButton,
  DatePicker as FrappeDatePicker,
  Dialog as FrappeDialog,
  Select as FrappeSelect,
  TextInput as FrappeTextInput,
} from 'frappe-ui';
import MobileOptionsSheet from 'src/mobile/MobileOptionsSheet.vue';
import { getDatePickerFormat } from 'src/components/Controls/datePickerFormat';
import { isMobile } from 'src/utils/viewport';
import { call } from 'src/web/api';
import { defineComponent } from 'vue';

interface PeriodOption {
  label: string;
  value: string;
}

const CUSTOM_PREFIX = 'Custom:';

/** Local YYYY-MM-DD, without the timezone shift of toISOString. */
function isoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** The native period selector plus the periods fadl_books adds; options come from the server. */
export default defineComponent({
  name: 'FadlPeriodSelector',
  components: {
    FrappeButton,
    FrappeDatePicker,
    FrappeDialog,
    FrappeSelect,
    FrappeTextInput,
    MobileOptionsSheet,
  },
  props: {
    value: { type: String, default: 'Today' },
  },
  emits: ['change'],
  setup() {
    return { isMobile };
  },
  data() {
    return {
      isSheetOpen: false,
      isRangeOpen: false,
      rangeFrom: '',
      rangeTo: '',
      rangeError: '',
      // Fallback so the selector works even if the options request fails.
      options: [
        { label: t`Today`, value: 'Today'},
        { label: t`This year`, value: 'This Year' },
        { label: t`This quarter`, value: 'This Quarter' },
        { label: t`This month`, value: 'This Month' },
        { label: t`Year to date`, value: 'YTD' },
      ] as PeriodOption[],
    };
  },
  computed: {
    isCustomValue(): boolean {
      return this.value.startsWith(CUSTOM_PREFIX);
    },
    /** The range itself is not an option; the select shows its Custom entry. */
    selectValue(): string {
      return this.isCustomValue ? 'Custom' : this.value;
    },
    currentLabel(): string {
      if (this.isCustomValue) {
        const [from, to] = this.value.slice(CUSTOM_PREFIX.length).split(':');
        return `${from} – ${to}`;
      }
      return (
        this.options.find((option) => option.value === this.value)?.label ??
        this.value
      );
    },
    pickerFormat(): string {
      return getDatePickerFormat();
    },
  },
  async created() {
    try {
      this.options = await call<PeriodOption[]>(
        'fadl_books.periods.get_period_options'
      );
    } catch (error) {
      console.error(error);
    }
  },
  methods: {
    selectOption(value?: string | number | null) {
      if (typeof value !== 'string') {
        return;
      }
      if (value === 'Custom') {
        this.openRange();
        return;
      }
      if (!this.options.some((option) => option.value === value)) {
        return;
      }
      this.$emit('change', value);
    },
    openRange() {
      this.rangeError = '';
      if (this.isCustomValue) {
        [this.rangeFrom, this.rangeTo] = this.value
          .slice(CUSTOM_PREFIX.length)
          .split(':');
      } else {
        const now = new Date();
        this.rangeFrom = isoDate(new Date(now.getFullYear(), now.getMonth(), 1));
        this.rangeTo = isoDate(now);
      }
      this.isRangeOpen = true;
    },
    applyRange() {
      if (!this.rangeFrom || !this.rangeTo) {
        this.rangeError = t`Pick both dates.`;
        return;
      }
      if (this.rangeFrom > this.rangeTo) {
        this.rangeError = t`The start date is after the end date.`;
        return;
      }
      this.isRangeOpen = false;
      this.$emit(
        'change',
        `${CUSTOM_PREFIX}${this.rangeFrom}:${this.rangeTo}`
      );
    },
  },
});
</script>