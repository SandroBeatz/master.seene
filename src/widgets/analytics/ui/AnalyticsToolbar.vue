<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  CalendarDate,
  DateFormatter,
  getLocalTimeZone,
  today,
} from '@internationalized/date'
import type { AnalyticsPeriodKind, AnalyticsPeriodV2 } from '@entities/analytics'
import {
  canStepForward as canStepForwardFrom,
  currentPeriod,
  fromCalendarDate,
  isCurrentPeriod,
  previousRange,
  resolveRange,
  stepPeriod,
  toCalendarDate,
  type DateRange,
} from '../model/period-step'

const period = defineModel<AnalyticsPeriodV2>({ required: true })
const compare = defineModel<boolean>('compare', { default: false })

const { t, locale } = useI18n()
const toast = useToast()

const tz = getLocalTimeZone()

// --- Granularity dropdown ---------------------------------------------------

const KIND_KEYS: Record<AnalyticsPeriodKind, string> = {
  day: 'analytics.period.day',
  week: 'analytics.period.week',
  month: 'analytics.period.month',
  year: 'analytics.period.year',
  custom: 'analytics.period.custom',
}

const kindItems = computed(() =>
  (['day', 'week', 'month', 'year', 'custom'] as const).map((value) => ({
    value,
    label: t(KIND_KEYS[value]),
  })),
)

/** Picking a granularity jumps to its current period; "custom" opens the calendar. */
function onKindChange(kind: AnalyticsPeriodKind) {
  if (kind === 'custom') {
    openCustom()
    return
  }
  period.value = currentPeriod(kind)
}

// --- "Jump to current" button ("Today" / "This week" / …) --------------------

const JUMP_KEYS: Record<AnalyticsPeriodKind, string> = {
  day: 'analytics.period.today',
  week: 'analytics.period.thisWeek',
  month: 'analytics.period.thisMonth',
  year: 'analytics.period.thisYear',
  custom: '', // custom has no natural "current" — button is hidden
}

const showJump = computed(
  () => period.value.kind !== 'custom' && !isCurrentPeriod(period.value),
)
const jumpLabel = computed(() => t(JUMP_KEYS[period.value.kind]))

function jumpToCurrent() {
  period.value = currentPeriod(period.value.kind)
}

// --- Prev / next period stepping --------------------------------------------

function step(dir: 1 | -1) {
  period.value = stepPeriod(period.value, dir)
}

const canStepForward = computed(() => canStepForwardFrom(period.value))

// --- Centre caption ---------------------------------------------------------

const resolvedRange = computed(() => resolveRange(period.value))

/** A single day: "6 Jul" (year added only when it isn't the current year). */
function fmtDay(d: CalendarDate): string {
  const opts: Intl.DateTimeFormatOptions =
    d.year === today(tz).year
      ? { day: 'numeric', month: 'short' }
      : { day: 'numeric', month: 'short', year: 'numeric' }
  return new DateFormatter(locale.value, opts).format(d.toDate(tz))
}

function fmtRange(r: DateRange): string {
  return r.start.compare(r.end) === 0
    ? fmtDay(r.start)
    : `${fmtDay(r.start)} – ${fmtDay(r.end)}`
}

/** "June 2026". */
function fmtMonth(d: CalendarDate): string {
  return new DateFormatter(locale.value, { month: 'long', year: 'numeric' }).format(d.toDate(tz))
}

const centerLabel = computed(() => {
  const r = resolvedRange.value
  switch (period.value.kind) {
    case 'day':
      return fmtDay(r.start)
    case 'month':
      return fmtMonth(r.start)
    case 'year':
      return String(r.start.year)
    default: // week | custom → a date range
      return fmtRange(r)
  }
})

/** When comparing, the caption of the preceding window: "vs 1 – 31 May". */
const compareCaption = computed(
  () => `${t('analytics.toolbar.vs')} ${fmtRange(previousRange(period.value))}`,
)

// --- Custom range picker ----------------------------------------------------

const open = ref(false)
const draft = shallowRef<{ start: CalendarDate | undefined; end: CalendarDate | undefined }>({
  start: undefined,
  end: undefined,
})

/** Analytics only looks at the past — the calendar stops at today. */
const maxDate = today(tz)

/** Seed the calendar and open it — current custom range, else the last 7 days. */
function openCustom() {
  if (period.value.kind === 'custom') {
    draft.value = {
      start: toCalendarDate(period.value.range.from),
      end: toCalendarDate(period.value.range.to),
    }
  } else {
    const t0 = today(tz)
    draft.value = { start: t0.subtract({ days: 6 }), end: t0 }
  }
  open.value = true
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
      <!-- Granularity + jump-to-current -->
      <div class="flex items-center gap-2">
        <USelect
          :model-value="period.kind"
          :items="kindItems"
          class="w-36"
          @update:model-value="onKindChange"
        />
        <UButton
          v-if="showJump"
          color="neutral"
          variant="soft"
          size="sm"
          @click="jumpToCurrent"
        >
          {{ jumpLabel }}
        </UButton>
      </div>

      <!-- Period stepper + caption -->
      <div class="flex min-w-0 items-center gap-1">
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          icon="i-lucide-chevron-left"
          :aria-label="t('analytics.toolbar.prevPeriod')"
          @click="step(-1)"
        />
        <span class="min-w-40 text-center text-sm font-medium text-highlighted">
          {{ centerLabel }}
        </span>
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

    <!-- Comparison window, shown only while comparing -->
    <p v-if="compare" class="px-1 text-xs text-muted">{{ compareCaption }}</p>

    <!-- Custom range picker -->
    <UModal v-model:open="open" :title="t('analytics.period.custom')">
      <template #body>
        <UCalendar v-model="draft" range :max-value="maxDate" />
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
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
      </template>
    </UModal>
  </div>
</template>
