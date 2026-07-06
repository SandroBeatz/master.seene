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
import {
  PERIOD_PRESETS,
  canStepForward as canStepForwardFrom,
  fromCalendarDate,
  resolveRange,
  shiftRange,
  stepPeriod,
  toCalendarDate,
  type DateRange,
} from '../model/period-step'

const period = defineModel<AnalyticsPeriodV2>({ required: true })
const compare = defineModel<boolean>('compare', { default: false })

const { t, locale } = useI18n()
const toast = useToast()

const tz = getLocalTimeZone()

// Chip order mirrors the design: current periods first, then past ones.
const PRESET_KEYS: Record<AnalyticsPeriodPreset, string> = {
  today: 'analytics.period.today',
  this_week: 'analytics.period.thisWeek',
  this_month: 'analytics.period.thisMonth',
  last_week: 'analytics.period.lastWeek',
  last_month: 'analytics.period.lastMonth',
}

const presetTabs = computed(() =>
  PERIOD_PRESETS.map((value) => ({ value, label: t(PRESET_KEYS[value]) })),
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

// --- Prev / next period stepping --------------------------------------------

function step(dir: 1 | -1) {
  period.value = stepPeriod(period.value, dir)
}

const canStepForward = computed(() => canStepForwardFrom(period.value))

// --- Resolved-dates caption --------------------------------------------------

const resolvedRange = computed(() => resolveRange(period.value, today(tz)))

function fmtDate(d: CalendarDate): string {
  const opts: Intl.DateTimeFormatOptions =
    d.year === today(tz).year
      ? { day: 'numeric', month: 'short' }
      : { day: 'numeric', month: 'short', year: 'numeric' }
  return new DateFormatter(locale.value, opts).format(d.toDate(tz))
}

function fmtRange(r: DateRange): string {
  return r.start.compare(r.end) === 0 ? fmtDate(r.start) : `${fmtDate(r.start)} – ${fmtDate(r.end)}`
}

/** "Jun 1 – Jun 30" and, when comparing, "… vs May 1 – May 31". */
const rangeCaption = computed(() => {
  const current = fmtRange(resolvedRange.value)
  if (!compare.value) return current
  const previous = fmtRange(shiftRange(resolvedRange.value, -1))
  return `${current} ${t('analytics.toolbar.vs')} ${previous}`
})

// --- Custom range picker ---------------------------------------------------

const open = ref(false)
const draft = shallowRef<{ start: CalendarDate | null; end: CalendarDate | null }>({
  start: null,
  end: null,
})

/** Analytics only looks at the past — the calendar stops at today. */
const maxDate = today(tz)

const df = computed(() => new DateFormatter(locale.value, { dateStyle: 'medium' }))

/** Label of the Custom chip: the picked range, or the generic "Custom" word. */
const customLabel = computed(() => {
  if (!isCustom(period.value)) return t('analytics.period.custom')
  const { from, to } = period.value.range
  const fmt = (s: string) => df.value.format(toCalendarDate(s).toDate(tz))
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
    const t0 = today(tz)
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

// --- Export (stub — real implementation is a separate task) -----------------

function onExport() {
  toast.add({
    title: t('analytics.toolbar.exportComingSoon'),
    icon: 'i-lucide-clock',
    color: 'neutral',
  })
}
</script>

<template>
  <div class="space-y-2">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <!-- Period stepper + segment -->
      <div class="flex w-full min-w-0 items-center gap-1 lg:w-auto">
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          icon="i-lucide-chevron-left"
          :aria-label="t('analytics.toolbar.prevPeriod')"
          @click="step(-1)"
        />
        <div
          class="inline-flex min-w-0 flex-1 gap-1 overflow-x-auto rounded-xl bg-elevated p-1 lg:flex-none"
        >
          <button
            v-for="tab in presetTabs"
            :key="tab.value"
            type="button"
            class="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors sm:px-4"
            :class="chipClass(activeKey === tab.value)"
            @click="period = tab.value"
          >
            {{ tab.label }}
          </button>

          <UPopover v-model:open="open" @update:open="onOpenChange">
            <button
              type="button"
              class="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors sm:px-4"
              :class="chipClass(activeKey === 'custom')"
            >
              <UIcon name="i-lucide-calendar" class="size-4" />
              {{ customLabel }}
            </button>

            <template #content>
              <div class="p-2">
                <UCalendar v-model="draft" range :max-value="maxDate" />
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
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          icon="i-lucide-chevron-right"
          :disabled="!canStepForward"
          :aria-label="t('analytics.toolbar.nextPeriod')"
          @click="step(1)"
        />
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

    <!-- Resolved dates of the selection (and the comparison window) -->
    <p class="px-1 text-xs text-muted">{{ rangeCaption }}</p>
  </div>
</template>
