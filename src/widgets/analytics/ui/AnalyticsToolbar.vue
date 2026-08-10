<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { CalendarDate, DateFormatter, getLocalTimeZone, today } from '@internationalized/date'
import type { AnalyticsPeriodKind, AnalyticsPeriodV2 } from '@entities/analytics'
import { useFormats } from '@shared/lib/formats'
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
import { AppCalendar, Typography } from '@shared/ui'

const period = defineModel<AnalyticsPeriodV2>({ required: true })
const compare = defineModel<boolean>('compare', { default: false })

const emit = defineEmits<{
  /** The centre caption was tapped — the caller opens its granularity picker. */
  pickPeriod: []
}>()

const { t, locale } = useI18n()
const formats = useFormats()

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

const showJump = computed(() => period.value.kind !== 'custom' && !isCurrentPeriod(period.value))
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
  return r.start.compare(r.end) === 0 ? fmtDay(r.start) : `${fmtDay(r.start)} – ${fmtDay(r.end)}`
}

/** "June 2026". */
function fmtMonth(d: CalendarDate): string {
  return new DateFormatter(locale.value, { month: 'long', year: 'numeric' }).format(d.toDate(tz))
}

/** Formats a resolved range per granularity: month/year as a single label, week/custom as a range. */
function fmtByKind(r: DateRange): string {
  switch (period.value.kind) {
    case 'day':
      return formats.dateDay(r.start.toDate(tz))
    case 'month':
      return fmtMonth(r.start)
    case 'year':
      return String(r.start.year)
    default: // week | custom → a date range
      return fmtRange(r)
  }
}

const centerLabel = computed(() => fmtByKind(resolvedRange.value))

/** When comparing, the preceding window formatted like the centre caption (e.g. "May 2026"). */
const compareCaption = computed(() => fmtByKind(previousRange(period.value)))

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
</script>

<template>
  <div class="space-y-2">
    <div class="flex flex-wrap items-center justify-center gap-3 md:justify-between">
      <!-- Granularity + jump-to-current — hidden on mobile (picked via the page-header drawer) -->
      <div class="hidden items-center gap-2 md:flex">
        <USelect
          :model-value="period.kind"
          :items="kindItems"
          class="w-36"
          @update:model-value="onKindChange"
        />
        <UButton v-if="showJump" color="neutral" variant="soft" size="sm" @click="jumpToCurrent">
          {{ jumpLabel }}
        </UButton>
      </div>

      <!-- Period stepper + caption -->
      <div class="flex min-w-0 items-center gap-1">
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-chevron-left"
          :aria-label="t('analytics.toolbar.prevPeriod')"
          @click="step(-1)"
        />
        <button
          type="button"
          class="flex min-w-40 cursor-pointer flex-col items-center rounded-md px-2 py-0.5 text-center transition-colors hover:bg-elevated"
          :aria-label="t('analytics.period.title')"
          @click="emit('pickPeriod')"
        >
          <Typography class="font-medium text-highlighted">{{ centerLabel }}</Typography>
          <Typography v-if="compare" variant="footnote" class="text-muted">{{
            compareCaption
          }}</Typography>
        </button>
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-chevron-right"
          :disabled="!canStepForward"
          :aria-label="t('analytics.toolbar.nextPeriod')"
          @click="step(1)"
        />
      </div>

      <!-- Compare — hidden on mobile (moved to the page-header options drawer).
           Export button hidden until export is implemented — see task 1iwu. -->
      <div class="hidden items-center gap-3 md:flex">
        <USwitch v-model="compare" :label="t('analytics.toolbar.compare')" />
      </div>
    </div>

    <!-- Custom range picker -->
    <UModal v-model:open="open" :title="t('analytics.period.custom')">
      <template #body>
        <AppCalendar v-model="draft" range :max-value="maxDate" />
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
