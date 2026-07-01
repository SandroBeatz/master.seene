<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  CalendarDate,
  DateFormatter,
  getLocalTimeZone,
  today,
} from '@internationalized/date'
import type { AnalyticsPeriodPreset, AnalyticsPeriodV2 } from '@entities/analytics'

const period = defineModel<AnalyticsPeriodV2>({ required: true })
const compare = defineModel<boolean>('compare', { default: false })

const { t, locale } = useI18n()
const toast = useToast()

const PRESET_KEYS: Record<AnalyticsPeriodPreset, string> = {
  today: 'analytics.period.today',
  this_week: 'analytics.period.thisWeek',
  last_week: 'analytics.period.lastWeek',
  this_month: 'analytics.period.thisMonth',
  last_month: 'analytics.period.lastMonth',
}

const presetTabs = computed(() =>
  (Object.keys(PRESET_KEYS) as AnalyticsPeriodPreset[]).map((value) => ({
    value,
    label: t(PRESET_KEYS[value]),
  })),
)

function isCustom(
  p: AnalyticsPeriodV2,
): p is { kind: 'custom'; range: { from: string; to: string } } {
  return typeof p !== 'string'
}

/** Which chip is highlighted — a preset key or 'custom'. */
const activeKey = computed(() => (isCustom(period.value) ? 'custom' : period.value))

function chipClass(active: boolean) {
  return active
    ? 'bg-default text-highlighted shadow-sm'
    : 'text-muted hover:text-default'
}

// --- Custom range picker ---------------------------------------------------

const open = ref(false)
const draft = shallowRef<{ start: CalendarDate | null; end: CalendarDate | null }>({
  start: null,
  end: null,
})

const df = computed(() => new DateFormatter(locale.value, { dateStyle: 'medium' }))

function toCalendarDate(value: string): CalendarDate {
  const [y = 0, m = 1, d = 1] = value.split('-').map(Number)
  return new CalendarDate(y, m, d)
}

function fromCalendarDate(d: CalendarDate): string {
  return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`
}

/** Label of the Custom chip: the picked range, or the generic "Custom" word. */
const customLabel = computed(() => {
  if (!isCustom(period.value)) return t('analytics.period.custom')
  const { from, to } = period.value.range
  const fmt = (s: string) => df.value.format(toCalendarDate(s).toDate(getLocalTimeZone()))
  return `${fmt(from)} – ${fmt(to)}`
})

/** Seed the calendar when the popover opens — current custom range, else last 7 days. */
function onOpenChange(value: boolean) {
  if (!value) return
  if (isCustom(period.value)) {
    draft.value = {
      start: toCalendarDate(period.value.range.from),
      end: toCalendarDate(period.value.range.to),
    }
  } else {
    const t0 = today(getLocalTimeZone())
    draft.value = { start: t0.subtract({ days: 6 }), end: t0 }
  }
}

function applyCustom() {
  const { start, end } = draft.value
  if (!start || !end) return
  period.value = {
    kind: 'custom',
    range: { from: fromCalendarDate(start), to: fromCalendarDate(end) },
  }
  open.value = false
}

// --- Export (stub — real implementation is T12) ----------------------------

function onExport() {
  toast.add({
    title: t('analytics.toolbar.exportComingSoon'),
    icon: 'i-lucide-clock',
    color: 'neutral',
  })
}
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-3">
    <!-- Period segment -->
    <div class="inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-elevated p-1">
      <button
        v-for="tab in presetTabs"
        :key="tab.value"
        type="button"
        class="shrink-0 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors"
        :class="chipClass(activeKey === tab.value)"
        @click="period = tab.value"
      >
        {{ tab.label }}
      </button>

      <UPopover v-model:open="open" @update:open="onOpenChange">
        <button
          type="button"
          class="flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors"
          :class="chipClass(activeKey === 'custom')"
        >
          <UIcon name="i-lucide-calendar" class="size-4" />
          {{ customLabel }}
        </button>

        <template #content>
          <div class="p-2">
            <UCalendar v-model="draft" range />
            <div class="flex justify-end gap-2 px-1 pt-2">
              <UButton color="neutral" variant="ghost" size="sm" @click="open = false">
                {{ t('common.cancel') }}
              </UButton>
              <UButton
                color="primary"
                size="sm"
                :disabled="!draft.start || !draft.end"
                @click="applyCustom"
              >
                {{ t('analytics.toolbar.apply') }}
              </UButton>
            </div>
          </div>
        </template>
      </UPopover>
    </div>

    <!-- Compare + Export -->
    <div class="flex items-center gap-3">
      <USwitch v-model="compare" :label="t('analytics.toolbar.compare')" />
      <UButton
        color="neutral"
        variant="outline"
        icon="i-lucide-download"
        @click="onExport"
      >
        {{ t('analytics.toolbar.export') }}
      </UButton>
    </div>
  </div>
</template>
