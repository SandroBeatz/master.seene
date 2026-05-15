# Analytics & Dashboard Widgets — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a full analytics page with period switcher and dashboard home page with actionable appointment widgets, upcoming calendar strip, and today's earnings stats.

**Architecture:** RPC-based analytics data (`get_analytics` Postgres function returns all metrics in one call). Home widgets are split into two standalone widget slices under `src/widgets/`. Analytics lives in a new `src/entities/analytics/` FSD entity.

**Tech Stack:** Vue 3 `<script setup>`, @pinia/colada `useQuery`/`useMutation`, Supabase RPC + PostgREST OR-filter, Nuxt UI v4, vue-i18n, Vitest.

---

## File Map

**New files:**
- `supabase/migrations/20260515130000_add_get_analytics_rpc.sql`
- `src/entities/analytics/model/types.ts`
- `src/entities/analytics/model/period.ts`
- `src/entities/analytics/model/__tests__/period.spec.ts`
- `src/entities/analytics/api/analytics.api.ts`
- `src/entities/analytics/model/analytics.queries.ts`
- `src/entities/analytics/index.ts`
- `src/pages/analytics/ui/AnalyticsPeriodTabs.vue`
- `src/pages/analytics/ui/AnalyticsStatCards.vue`
- `src/pages/analytics/ui/AnalyticsTopServices.vue`
- `src/widgets/action-appointments/ui/ActionAppointmentCard.vue`
- `src/widgets/action-appointments/ui/ActionAppointmentsWidget.vue`
- `src/widgets/action-appointments/index.ts`
- `src/widgets/upcoming-appointments/ui/WeekDayStrip.vue`
- `src/widgets/upcoming-appointments/ui/AppointmentTimeline.vue`
- `src/widgets/upcoming-appointments/ui/UpcomingAppointmentsWidget.vue`
- `src/widgets/upcoming-appointments/index.ts`
- `src/pages/home/ui/HomeEarnedTodayCard.vue`
- `src/pages/home/ui/HomeCompletedCountCard.vue`
- `src/pages/home/ui/HomeWorkingHoursCard.vue`

**Modified files:**
- `src/entities/appointment/api/appointments.api.ts` — add `listActionableAppointments`
- `src/entities/appointment/model/appointment.queries.ts` — add `useActionableAppointmentsQuery`
- `src/entities/appointment/index.ts` — export new items
- `src/pages/analytics/ui/AnalyticsPage.vue` — full rewrite
- `src/pages/home/ui/HomePage.vue` — full rewrite
- `src/shared/lib/i18n/locales/ru.ts` — add analytics + home keys
- `src/shared/lib/i18n/locales/en.ts` — add analytics + home keys
- `src/shared/lib/i18n/locales/fr.ts` — add analytics + home keys

---

## Task 1: DB Migration — `get_analytics` RPC

**Files:**
- Create: `supabase/migrations/20260515130000_add_get_analytics_rpc.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- supabase/migrations/20260515130000_add_get_analytics_rpc.sql

CREATE OR REPLACE FUNCTION get_analytics(p_from TIMESTAMPTZ, p_to TIMESTAMPTZ)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_earned         NUMERIC;
  v_completed_count INTEGER;
  v_working_minutes INTEGER;
  v_avg_check      NUMERIC;
  v_top_services   JSON;
BEGIN
  -- Earnings from sales paid in the period
  SELECT COALESCE(SUM(amount), 0)
    INTO v_earned
    FROM sale
   WHERE user_id = auth.uid()
     AND paid_at BETWEEN p_from AND p_to;

  -- Completed appointments in the period
  SELECT COUNT(*), COALESCE(SUM(duration), 0)
    INTO v_completed_count, v_working_minutes
    FROM appointments
   WHERE user_id = auth.uid()
     AND status = 'completed'
     AND start_at BETWEEN p_from AND p_to;

  -- Average check (NULL when no completed appointments)
  IF v_completed_count > 0 THEN
    v_avg_check := v_earned / v_completed_count;
  ELSE
    v_avg_check := NULL;
  END IF;

  -- Top 5 services by revenue in the period
  SELECT json_agg(t ORDER BY t.revenue DESC)
    INTO v_top_services
    FROM (
      SELECT
        si.name_snapshot                                                     AS name,
        SUM(si.price_snapshot)                                               AS revenue,
        CASE
          WHEN v_earned > 0
          THEN ROUND(SUM(si.price_snapshot) / v_earned * 100)
          ELSE 0
        END                                                                  AS percentage
        FROM sale_item si
        JOIN sale s ON s.id = si.sale_id
       WHERE s.user_id = auth.uid()
         AND s.paid_at BETWEEN p_from AND p_to
       GROUP BY si.name_snapshot
       LIMIT 5
    ) t;

  RETURN json_build_object(
    'earned',          v_earned,
    'completed_count', v_completed_count,
    'working_minutes', v_working_minutes,
    'avg_check',       v_avg_check,
    'top_services',    COALESCE(v_top_services, '[]'::json)
  );
END;
$$;
```

- [ ] **Step 2: Apply the migration via Supabase MCP**

Use the `mcp__claude_ai_Supabase__execute_sql` tool with project_id `foxqkomqtpbxyeqqwzpm` and the SQL above.

- [ ] **Step 3: Smoke-test in Supabase SQL editor**

Run this to verify the function exists and returns the expected shape (may return zeros if no data):

```sql
SELECT get_analytics(now() - interval '30 days', now());
```

Expected: a JSON object with keys `earned`, `completed_count`, `working_minutes`, `avg_check`, `top_services`.

- [ ] **Step 4: Commit the migration file**

```bash
git add supabase/migrations/20260515130000_add_get_analytics_rpc.sql
git commit -m "feat(db): add get_analytics RPC for period-based metrics"
```

---

## Task 2: Analytics Entity

**Files:**
- Create: `src/entities/analytics/model/types.ts`
- Create: `src/entities/analytics/model/period.ts`
- Create: `src/entities/analytics/model/__tests__/period.spec.ts`
- Create: `src/entities/analytics/api/analytics.api.ts`
- Create: `src/entities/analytics/model/analytics.queries.ts`
- Create: `src/entities/analytics/index.ts`

- [ ] **Step 1: Write the failing tests for `periodToDateRange`**

Create `src/entities/analytics/model/__tests__/period.spec.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { periodToDateRange } from '../period'

describe('periodToDateRange', () => {
  it('today: returns start and end of the given day', () => {
    const now = new Date(2026, 4, 15, 14, 30, 0) // May 15 2026 14:30 local
    const { from, to } = periodToDateRange('today', now)
    expect(from).toBe(new Date(2026, 4, 15, 0, 0, 0, 0).toISOString())
    expect(to).toBe(new Date(2026, 4, 15, 23, 59, 59, 999).toISOString())
  })

  it('week: returns Monday through Sunday when today is Friday', () => {
    // 2026-05-15 is a Friday
    const now = new Date(2026, 4, 15, 10, 0, 0)
    const { from, to } = periodToDateRange('week', now)
    expect(from).toBe(new Date(2026, 4, 11, 0, 0, 0, 0).toISOString()) // Mon May 11
    expect(to).toBe(new Date(2026, 4, 17, 23, 59, 59, 999).toISOString()) // Sun May 17
  })

  it('week: returns correct week when today is Sunday', () => {
    // 2026-05-17 is a Sunday
    const now = new Date(2026, 4, 17, 10, 0, 0)
    const { from, to } = periodToDateRange('week', now)
    expect(from).toBe(new Date(2026, 4, 11, 0, 0, 0, 0).toISOString()) // Mon May 11
    expect(to).toBe(new Date(2026, 4, 17, 23, 59, 59, 999).toISOString()) // Sun May 17
  })

  it('week: returns correct week when today is Monday', () => {
    // 2026-05-11 is a Monday
    const now = new Date(2026, 4, 11, 9, 0, 0)
    const { from, to } = periodToDateRange('week', now)
    expect(from).toBe(new Date(2026, 4, 11, 0, 0, 0, 0).toISOString())
    expect(to).toBe(new Date(2026, 4, 17, 23, 59, 59, 999).toISOString())
  })

  it('month: returns first and last day of the current month', () => {
    const now = new Date(2026, 4, 15, 10, 0, 0) // May 2026
    const { from, to } = periodToDateRange('month', now)
    expect(from).toBe(new Date(2026, 4, 1, 0, 0, 0, 0).toISOString())
    expect(to).toBe(new Date(2026, 4, 31, 23, 59, 59, 999).toISOString())
  })

  it('month: handles February in a non-leap year', () => {
    const now = new Date(2026, 1, 10, 10, 0, 0) // Feb 2026
    const { from, to } = periodToDateRange('month', now)
    expect(from).toBe(new Date(2026, 1, 1, 0, 0, 0, 0).toISOString())
    expect(to).toBe(new Date(2026, 1, 28, 23, 59, 59, 999).toISOString())
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
bun test:unit src/entities/analytics/model/__tests__/period.spec.ts
```

Expected: FAIL with "Cannot find module '../period'"

- [ ] **Step 3: Create types**

Create `src/entities/analytics/model/types.ts`:

```typescript
export type AnalyticsPeriod = 'today' | 'week' | 'month'

export interface TopService {
  name: string
  revenue: number
  percentage: number
}

export interface AnalyticsResult {
  earned: number
  completed_count: number
  working_minutes: number
  avg_check: number | null
  top_services: TopService[]
}
```

- [ ] **Step 4: Create `periodToDateRange`**

Create `src/entities/analytics/model/period.ts`:

```typescript
import type { AnalyticsPeriod } from './types'

export function periodToDateRange(
  period: AnalyticsPeriod,
  now = new Date(),
): { from: string; to: string } {
  const y = now.getFullYear()
  const mo = now.getMonth()
  const d = now.getDate()

  let from: Date
  let to: Date

  if (period === 'today') {
    from = new Date(y, mo, d, 0, 0, 0, 0)
    to = new Date(y, mo, d, 23, 59, 59, 999)
  } else if (period === 'week') {
    const day = now.getDay() // 0 = Sun, 1 = Mon, …, 6 = Sat
    const toMonday = day === 0 ? -6 : 1 - day
    from = new Date(y, mo, d + toMonday, 0, 0, 0, 0)
    to = new Date(y, mo, d + toMonday + 6, 23, 59, 59, 999)
  } else {
    // month
    from = new Date(y, mo, 1, 0, 0, 0, 0)
    to = new Date(y, mo + 1, 0, 23, 59, 59, 999) // day 0 of next month = last day of this month
  }

  return { from: from.toISOString(), to: to.toISOString() }
}
```

- [ ] **Step 5: Run tests — verify they pass**

```bash
bun test:unit src/entities/analytics/model/__tests__/period.spec.ts
```

Expected: 6 tests PASS

- [ ] **Step 6: Create API function**

Create `src/entities/analytics/api/analytics.api.ts`:

```typescript
import { supabase } from '@shared/lib/supabase'
import type { AnalyticsResult, AnalyticsPeriod } from '../model/types'
import { periodToDateRange } from '../model/period'

export async function getAnalytics(period: AnalyticsPeriod): Promise<AnalyticsResult> {
  const { from, to } = periodToDateRange(period)
  const { data, error } = await supabase.rpc('get_analytics', { p_from: from, p_to: to })
  if (error) throw error
  return data as AnalyticsResult
}
```

- [ ] **Step 7: Create query composable**

Create `src/entities/analytics/model/analytics.queries.ts`:

```typescript
import { useQuery } from '@pinia/colada'
import type { Ref } from 'vue'
import type { AnalyticsPeriod } from './types'
import { getAnalytics } from '../api/analytics.api'

export const useAnalyticsQuery = (period: Ref<AnalyticsPeriod>) =>
  useQuery({
    key: () => ['analytics', period.value],
    query: () => getAnalytics(period.value),
  })
```

- [ ] **Step 8: Create barrel index**

Create `src/entities/analytics/index.ts`:

```typescript
export type { AnalyticsPeriod, AnalyticsResult, TopService } from './model/types'
export { periodToDateRange } from './model/period'
export { useAnalyticsQuery } from './model/analytics.queries'
```

- [ ] **Step 9: Commit**

```bash
git add src/entities/analytics/
git commit -m "feat(analytics): add analytics entity with RPC query and period helpers"
```

---

## Task 3: i18n Keys

**Files:**
- Modify: `src/shared/lib/i18n/locales/ru.ts`
- Modify: `src/shared/lib/i18n/locales/en.ts`
- Modify: `src/shared/lib/i18n/locales/fr.ts`

- [ ] **Step 1: Add keys to `ru.ts`**

In `ru.ts`, replace the existing `analytics` block:

```typescript
  analytics: {
    title: 'Аналитика',
    description: 'Отслеживайте эффективность бизнеса и ключевые показатели.',
    comingSoon: 'Аналитика скоро появится',
    period: {
      today: 'Сегодня',
      week: 'Неделя',
      month: 'Месяц',
    },
    earned: 'Заработано',
    completedCount: 'Записей завершено',
    workingHours: 'Рабочих часов',
    avgCheck: 'Средний чек',
    topServices: 'Топ услуг по доходу',
    noTopServices: 'Нет данных за период',
    hoursUnit: 'ч',
    minutesUnit: 'мин',
  },
```

And replace the existing `home` block:

```typescript
  home: {
    title: 'Главная',
    description: 'Добро пожаловать на ваш дашборд.',
    earnedToday: 'Заработано сегодня',
    completedCount: 'Завершено записей',
    workingHours: 'Рабочих часов',
    actionAppointments: {
      title: 'Нужно подтвердить или завершить',
      empty: 'Нет записей, требующих действий',
      confirm: 'Подтвердить',
      complete: 'Завершить',
    },
    upcoming: {
      title: 'Предстоящие записи',
      empty: 'Нет записей на этот день',
    },
  },
```

- [ ] **Step 2: Add keys to `en.ts`**

Replace `analytics` block:

```typescript
  analytics: {
    title: 'Analytics',
    description: 'Track your business performance and key metrics.',
    comingSoon: 'Analytics coming soon',
    period: {
      today: 'Today',
      week: 'Week',
      month: 'Month',
    },
    earned: 'Earned',
    completedCount: 'Appointments completed',
    workingHours: 'Working hours',
    avgCheck: 'Average check',
    topServices: 'Top services by revenue',
    noTopServices: 'No data for this period',
    hoursUnit: 'h',
    minutesUnit: 'min',
  },
```

Replace `home` block:

```typescript
  home: {
    title: 'Home',
    description: 'Welcome back to your dashboard.',
    earnedToday: 'Earned today',
    completedCount: 'Appointments completed',
    workingHours: 'Working hours',
    actionAppointments: {
      title: 'Needs confirmation or completion',
      empty: 'No appointments require action',
      confirm: 'Confirm',
      complete: 'Complete',
    },
    upcoming: {
      title: 'Upcoming appointments',
      empty: 'No appointments for this day',
    },
  },
```

- [ ] **Step 3: Add keys to `fr.ts`**

Replace `analytics` block:

```typescript
  analytics: {
    title: 'Analytique',
    description: 'Suivez les performances de votre entreprise.',
    comingSoon: 'Analytique bientôt disponible',
    period: {
      today: "Aujourd'hui",
      week: 'Semaine',
      month: 'Mois',
    },
    earned: 'Gagné',
    completedCount: 'Rendez-vous terminés',
    workingHours: 'Heures de travail',
    avgCheck: 'Ticket moyen',
    topServices: 'Top services par revenu',
    noTopServices: 'Aucune donnée pour cette période',
    hoursUnit: 'h',
    minutesUnit: 'min',
  },
```

Replace `home` block:

```typescript
  home: {
    title: 'Accueil',
    description: 'Bon retour sur votre tableau de bord.',
    earnedToday: "Gagné aujourd'hui",
    completedCount: 'Rendez-vous terminés',
    workingHours: 'Heures de travail',
    actionAppointments: {
      title: 'À confirmer ou terminer',
      empty: "Aucun rendez-vous n'est en attente d'action",
      confirm: 'Confirmer',
      complete: 'Terminer',
    },
    upcoming: {
      title: 'Prochains rendez-vous',
      empty: 'Aucun rendez-vous ce jour',
    },
  },
```

- [ ] **Step 4: Verify build compiles**

```bash
bun run build
```

Expected: no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/shared/lib/i18n/locales/
git commit -m "feat(i18n): add analytics and home widget keys to all locales"
```

---

## Task 4: Analytics Page

**Files:**
- Create: `src/pages/analytics/ui/AnalyticsPeriodTabs.vue`
- Create: `src/pages/analytics/ui/AnalyticsStatCards.vue`
- Create: `src/pages/analytics/ui/AnalyticsTopServices.vue`
- Modify: `src/pages/analytics/ui/AnalyticsPage.vue`

- [ ] **Step 1: Create `AnalyticsPeriodTabs.vue`**

```vue
<script setup lang="ts">
import type { AnalyticsPeriod } from '@entities/analytics'
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'

const model = defineModel<AnalyticsPeriod>({ required: true })
const { t } = useI18n()

const tabs = computed(() => [
  { label: t('analytics.period.today'), value: 'today' as AnalyticsPeriod },
  { label: t('analytics.period.week'), value: 'week' as AnalyticsPeriod },
  { label: t('analytics.period.month'), value: 'month' as AnalyticsPeriod },
])
</script>

<template>
  <div class="inline-flex gap-1 rounded-xl bg-elevated p-1">
    <button
      v-for="tab in tabs"
      :key="tab.value"
      type="button"
      class="rounded-lg px-5 py-1.5 text-sm font-medium transition-colors"
      :class="
        model === tab.value
          ? 'bg-default text-highlighted shadow-sm'
          : 'text-muted hover:text-default'
      "
      @click="model = tab.value"
    >
      {{ tab.label }}
    </button>
  </div>
</template>
```

- [ ] **Step 2: Create `AnalyticsStatCards.vue`**

```vue
<script setup lang="ts">
import type { AnalyticsResult } from '@entities/analytics'
import { useFormats } from '@shared/lib/formats'
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'

const props = defineProps<{
  data: AnalyticsResult | null | undefined
  loading: boolean
}>()

const { t } = useI18n()
const formats = useFormats()

const workingHoursLabel = computed(() => {
  if (!props.data) return '—'
  const totalMinutes = props.data.working_minutes
  if (totalMinutes === 0) return `0 ${t('analytics.hoursUnit')}`
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (m === 0) return `${h} ${t('analytics.hoursUnit')}`
  return `${h} ${t('analytics.hoursUnit')} ${m} ${t('analytics.minutesUnit')}`
})

const cards = computed(() => [
  {
    key: 'earned',
    label: t('analytics.earned'),
    value: formats.price(props.data?.earned ?? 0),
    icon: 'i-lucide-banknote',
  },
  {
    key: 'completed',
    label: t('analytics.completedCount'),
    value: props.data?.completed_count ?? 0,
    icon: 'i-lucide-calendar-check',
  },
  {
    key: 'hours',
    label: t('analytics.workingHours'),
    value: workingHoursLabel.value,
    icon: 'i-lucide-clock',
  },
  {
    key: 'avg',
    label: t('analytics.avgCheck'),
    value: props.data?.avg_check != null ? formats.price(props.data.avg_check) : '—',
    icon: 'i-lucide-trending-up',
  },
])
</script>

<template>
  <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
    <UPageCard
      v-for="card in cards"
      :key="card.key"
      variant="subtle"
      :ui="{ root: 'shadow-none' }"
    >
      <div class="space-y-2">
        <div class="flex items-center gap-2 text-muted">
          <UIcon :name="card.icon" class="size-4" />
          <span class="text-xs font-medium uppercase">{{ card.label }}</span>
        </div>
        <div v-if="loading" class="h-7 w-24 animate-pulse rounded bg-elevated" />
        <p v-else class="text-2xl font-semibold">{{ card.value }}</p>
      </div>
    </UPageCard>
  </div>
</template>
```

- [ ] **Step 3: Create `AnalyticsTopServices.vue`**

```vue
<script setup lang="ts">
import type { TopService } from '@entities/analytics'
import { useFormats } from '@shared/lib/formats'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  services: TopService[]
  loading: boolean
}>()

const { t } = useI18n()
const formats = useFormats()
</script>

<template>
  <UPageCard variant="subtle" :ui="{ root: 'shadow-none' }">
    <div class="space-y-4">
      <p class="text-sm font-semibold uppercase text-muted">{{ t('analytics.topServices') }}</p>

      <div v-if="loading" class="space-y-3">
        <div v-for="i in 3" :key="i" class="h-8 w-full animate-pulse rounded bg-elevated" />
      </div>

      <p v-else-if="!services.length" class="text-sm text-muted">
        {{ t('analytics.noTopServices') }}
      </p>

      <div v-else class="space-y-3">
        <div v-for="service in services" :key="service.name" class="space-y-1">
          <div class="flex items-center justify-between text-sm">
            <span class="font-medium">{{ service.name }}</span>
            <span class="text-muted">{{ formats.price(service.revenue) }}</span>
          </div>
          <div class="h-2 w-full overflow-hidden rounded-full bg-elevated">
            <div
              class="h-full rounded-full bg-primary"
              :style="{ width: `${service.percentage}%` }"
            />
          </div>
          <p class="text-right text-xs text-muted">{{ service.percentage }}%</p>
        </div>
      </div>
    </div>
  </UPageCard>
</template>
```

- [ ] **Step 4: Rewrite `AnalyticsPage.vue`**

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AnalyticsPeriod } from '@entities/analytics'
import { useAnalyticsQuery } from '@entities/analytics'
import AnalyticsPeriodTabs from './AnalyticsPeriodTabs.vue'
import AnalyticsStatCards from './AnalyticsStatCards.vue'
import AnalyticsTopServices from './AnalyticsTopServices.vue'

const { t } = useI18n()
const period = ref<AnalyticsPeriod>('today')
const { data, status } = useAnalyticsQuery(period)
const isLoading = computed(() => status.value === 'loading')
</script>

<template>
  <UPage :ui="{ root: 'px-12 max-w-7xl mx-auto' }" as="main">
    <UPageHeader
      :title="t('analytics.title')"
      :description="t('analytics.description')"
      :ui="{ root: 'border-none' }"
    >
      <template #links>
        <AnalyticsPeriodTabs v-model="period" />
      </template>
    </UPageHeader>
    <UPageBody>
      <div class="space-y-6">
        <AnalyticsStatCards :data="data" :loading="isLoading" />
        <AnalyticsTopServices :services="data?.top_services ?? []" :loading="isLoading" />
      </div>
    </UPageBody>
  </UPage>
</template>
```

- [ ] **Step 5: Run dev server and verify analytics page renders without errors**

```bash
bun dev
```

Navigate to `/analytics`. Expected: period tabs render, stat cards show skeletons then data.

- [ ] **Step 6: Commit**

```bash
git add src/pages/analytics/
git commit -m "feat(analytics): implement analytics page with period switcher and stat cards"
```

---

## Task 5: Actionable Appointments API

**Files:**
- Modify: `src/entities/appointment/api/appointments.api.ts`
- Modify: `src/entities/appointment/model/appointment.queries.ts`
- Modify: `src/entities/appointment/index.ts`

- [ ] **Step 1: Add `listActionableAppointments` to the API**

In `src/entities/appointment/api/appointments.api.ts`, append after the existing `removeAppointment` function:

```typescript
export async function listActionableAppointments(userId: string): Promise<Appointment[]> {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('user_id', userId)
    .or(`status.eq.pending,and(status.eq.confirmed,start_at.lt.${now})`)
    .order('start_at')
  if (error) throw error
  return data as Appointment[]
}
```

- [ ] **Step 2: Add `useActionableAppointmentsQuery` to queries**

In `src/entities/appointment/model/appointment.queries.ts`, replace the existing import line from `'../api/appointments.api'` with:

```typescript
import {
  createAppointment,
  listActionableAppointments,
  listAppointments,
  removeAppointment,
  updateAppointment,
} from '../api/appointments.api'
```

Then append this new composable at the end of the file:

```typescript
export const useActionableAppointmentsQuery = (userId: Ref<string>) =>
  useQuery({
    key: () => ['appointments-actionable', userId.value],
    query: () => listActionableAppointments(userId.value),
  })
```

- [ ] **Step 3: Export from barrel index**

In `src/entities/appointment/index.ts`, add the new exports:

```typescript
export {
  listAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  removeAppointment,
  listActionableAppointments,
} from './api/appointments.api'
export {
  useAppointmentsQuery,
  useActionableAppointmentsQuery,
  useCreateAppointmentMutation,
  useUpdateAppointmentMutation,
  useRemoveAppointmentMutation,
} from './model/appointment.queries'
```

- [ ] **Step 4: Run build to check no TypeScript errors**

```bash
bun run build
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/entities/appointment/
git commit -m "feat(appointment): add listActionableAppointments API and query"
```

---

## Task 6: ActionAppointmentsWidget

**Files:**
- Create: `src/widgets/action-appointments/ui/ActionAppointmentCard.vue`
- Create: `src/widgets/action-appointments/ui/ActionAppointmentsWidget.vue`
- Create: `src/widgets/action-appointments/index.ts`

- [ ] **Step 1: Create `ActionAppointmentCard.vue`**

```vue
<script setup lang="ts">
import type { Appointment } from '@entities/appointment'
import type { Client } from '@entities/client'
import type { Service } from '@entities/service'
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'

const props = defineProps<{
  appointment: Appointment
  client: Client | undefined
  services: Service[]
  confirmLoading?: boolean
}>()

const emit = defineEmits<{
  confirm: [appointment: Appointment]
  complete: [appointment: Appointment]
}>()

const { t } = useI18n()

const clientName = computed(() => {
  if (!props.client) return t('appointments.unknownClient')
  return [props.client.first_name, props.client.last_name].filter(Boolean).join(' ')
})

const timeLabel = computed(() => {
  const date = new Date(props.appointment.start_at)
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
})

const serviceNames = computed(() =>
  props.services.length ? props.services.map((s) => s.name).join(', ') : '—',
)

const isPast = computed(() => new Date(props.appointment.start_at) < new Date())

const showConfirm = computed(
  () => props.appointment.status === 'pending',
)
</script>

<template>
  <div class="flex items-center justify-between gap-3 rounded-xl border border-default bg-default px-4 py-3">
    <div class="min-w-0">
      <p class="truncate text-sm font-medium">{{ clientName }}</p>
      <p class="mt-0.5 truncate text-xs text-muted">{{ timeLabel }} · {{ serviceNames }}</p>
    </div>
    <div class="flex shrink-0 gap-2">
      <UButton
        v-if="showConfirm && !isPast"
        size="sm"
        color="primary"
        variant="soft"
        :loading="confirmLoading"
        @click="emit('confirm', appointment)"
      >
        {{ t('home.actionAppointments.confirm') }}
      </UButton>
      <UButton
        size="sm"
        color="success"
        variant="soft"
        leading-icon="i-lucide-badge-check"
        @click="emit('complete', appointment)"
      >
        {{ t('home.actionAppointments.complete') }}
      </UButton>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Create `ActionAppointmentsWidget.vue`**

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSessionStore } from '@entities/session'
import { useActionableAppointmentsQuery, useUpdateAppointmentMutation } from '@entities/appointment'
import { useClientsQuery } from '@entities/client'
import { useServicesQuery } from '@entities/service'
import { usePaymentTypesQuery } from '@entities/payment-type'
import { useCompleteSaleMutation } from '@entities/sale'
import type { Appointment } from '@entities/appointment'
import type { Service } from '@entities/service'
import type { CompleteSaleDto } from '@entities/sale'
import { AppointmentCheckoutModal } from '@features/appointment-checkout'
import ActionAppointmentCard from './ActionAppointmentCard.vue'

const { t } = useI18n()
const toast = useToast()
const sessionStore = useSessionStore()
const userId = computed(() => sessionStore.session?.user.id ?? '')

const { data: appointments, refresh } = useActionableAppointmentsQuery(userId)
const { data: clients } = useClientsQuery(userId)
const { data: services } = useServicesQuery(userId)
const { data: paymentTypes } = usePaymentTypesQuery(userId)

const updateMutation = useUpdateAppointmentMutation(userId)
const completeSaleMutation = useCompleteSaleMutation(userId)

const isCheckoutOpen = ref(false)
const checkoutAppointment = ref<Appointment | null>(null)

const checkoutServices = computed<Service[]>(() => {
  if (!checkoutAppointment.value) return []
  return checkoutAppointment.value.service_ids
    .map((id) => services.value?.find((s) => s.id === id))
    .filter((s): s is Service => Boolean(s))
})

function getClient(appointment: Appointment) {
  return clients.value?.find((c) => c.id === appointment.client_id)
}

function getServices(appointment: Appointment): Service[] {
  return appointment.service_ids
    .map((id) => services.value?.find((s) => s.id === id))
    .filter((s): s is Service => Boolean(s))
}

async function handleConfirm(appointment: Appointment) {
  try {
    await updateMutation.mutateAsync({ id: appointment.id, status: 'confirmed' })
    // Remove from list only if appointment is in the future
    if (new Date(appointment.start_at) > new Date()) {
      await refresh()
    }
  } catch {
    toast.add({ title: t('appointments.preview.statusUpdateError'), color: 'error' })
  }
}

function handleComplete(appointment: Appointment) {
  checkoutAppointment.value = appointment
  isCheckoutOpen.value = true
}

async function handleCheckoutConfirm(payload: CompleteSaleDto) {
  try {
    await completeSaleMutation.mutateAsync(payload)
    isCheckoutOpen.value = false
    checkoutAppointment.value = null
    await refresh()
    toast.add({ title: t('checkout.successTitle'), color: 'success' })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message.includes('already_completed')) {
      toast.add({ title: t('checkout.alreadyCompleted'), color: 'warning' })
      isCheckoutOpen.value = false
    } else {
      toast.add({ title: t('checkout.errorTitle'), color: 'error' })
    }
  }
}
</script>

<template>
  <div class="space-y-3">
    <p class="text-sm font-semibold text-muted uppercase">
      {{ t('home.actionAppointments.title') }}
    </p>

    <div v-if="!appointments?.length" class="flex items-center gap-2 rounded-xl border border-dashed border-default px-4 py-6 text-center justify-center">
      <UIcon name="i-lucide-check-circle" class="size-5 text-muted" />
      <p class="text-sm text-muted">{{ t('home.actionAppointments.empty') }}</p>
    </div>

    <div v-else class="space-y-2">
      <ActionAppointmentCard
        v-for="appt in appointments"
        :key="appt.id"
        :appointment="appt"
        :client="getClient(appt)"
        :services="getServices(appt)"
        :confirm-loading="updateMutation.isLoading.value"
        @confirm="handleConfirm"
        @complete="handleComplete"
      />
    </div>
  </div>

  <AppointmentCheckoutModal
    v-if="checkoutAppointment"
    :open="isCheckoutOpen"
    :appointment="checkoutAppointment"
    :services="checkoutServices"
    :payment-types="paymentTypes ?? []"
    :loading="completeSaleMutation.isLoading.value"
    @update:open="isCheckoutOpen = $event"
    @confirm="handleCheckoutConfirm"
  />
</template>
```

- [ ] **Step 3: Create barrel index**

Create `src/widgets/action-appointments/index.ts`:

```typescript
export { default as ActionAppointmentsWidget } from './ui/ActionAppointmentsWidget.vue'
```

- [ ] **Step 4: Commit**

```bash
git add src/widgets/action-appointments/
git commit -m "feat(widgets): add ActionAppointmentsWidget with confirm/complete inline actions"
```

---

## Task 7: UpcomingAppointmentsWidget

**Files:**
- Create: `src/widgets/upcoming-appointments/ui/WeekDayStrip.vue`
- Create: `src/widgets/upcoming-appointments/ui/AppointmentTimeline.vue`
- Create: `src/widgets/upcoming-appointments/ui/UpcomingAppointmentsWidget.vue`
- Create: `src/widgets/upcoming-appointments/index.ts`

- [ ] **Step 1: Create `WeekDayStrip.vue`**

```vue
<script setup lang="ts">
import { computed } from 'vue'

const model = defineModel<Date>({ required: true })

const days = computed(() => {
  const result: { date: Date; label: string; dayNum: string; isToday: boolean }[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = 0; i < 7; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    result.push({
      date: d,
      label: new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(d),
      dayNum: String(d.getDate()),
      isToday: i === 0,
    })
  }
  return result
})

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}
</script>

<template>
  <div class="flex gap-1">
    <button
      v-for="day in days"
      :key="day.dayNum"
      type="button"
      class="flex flex-1 flex-col items-center rounded-xl px-2 py-2 text-center transition-colors"
      :class="
        isSameDay(day.date, model)
          ? 'bg-primary text-white'
          : 'hover:bg-elevated text-muted hover:text-default'
      "
      @click="model = day.date"
    >
      <span class="text-xs font-medium uppercase">{{ day.label }}</span>
      <span class="mt-0.5 text-sm font-semibold">{{ day.dayNum }}</span>
    </button>
  </div>
</template>
```

- [ ] **Step 2: Create `AppointmentTimeline.vue`**

```vue
<script setup lang="ts">
import type { Appointment } from '@entities/appointment'
import type { Client } from '@entities/client'
import type { Service } from '@entities/service'
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'

const props = defineProps<{
  appointments: Appointment[]
  clients: Client[]
  services: Service[]
  loading: boolean
}>()

const { t } = useI18n()

interface TimelineItem {
  appointment: Appointment
  time: string
  clientName: string
  serviceNames: string
}

const items = computed<TimelineItem[]>(() =>
  props.appointments
    .filter((a) => ['pending', 'confirmed', 'completed'].includes(a.status))
    .map((a) => {
      const client = props.clients.find((c) => c.id === a.client_id)
      const clientName = client
        ? [client.first_name, client.last_name].filter(Boolean).join(' ')
        : t('appointments.unknownClient')
      const svcList = a.service_ids
        .map((id) => props.services.find((s) => s.id === id)?.name)
        .filter(Boolean)
        .join(', ')
      const time = new Intl.DateTimeFormat(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date(a.start_at))
      return { appointment: a, time, clientName, serviceNames: svcList || '—' }
    }),
)
</script>

<template>
  <div class="space-y-2">
    <div v-if="loading" class="space-y-2">
      <div v-for="i in 3" :key="i" class="h-12 w-full animate-pulse rounded-xl bg-elevated" />
    </div>

    <div
      v-else-if="!items.length"
      class="flex items-center justify-center gap-2 rounded-xl border border-dashed border-default px-4 py-6"
    >
      <UIcon name="i-lucide-calendar-x" class="size-5 text-muted" />
      <p class="text-sm text-muted">{{ t('home.upcoming.empty') }}</p>
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="item in items"
        :key="item.appointment.id"
        class="flex items-center gap-3 rounded-xl border border-default bg-default px-4 py-3"
      >
        <span class="shrink-0 text-sm font-semibold tabular-nums text-primary">{{ item.time }}</span>
        <div class="min-w-0">
          <p class="truncate text-sm font-medium">{{ item.clientName }}</p>
          <p class="truncate text-xs text-muted">{{ item.serviceNames }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 3: Create `UpcomingAppointmentsWidget.vue`**

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSessionStore } from '@entities/session'
import { useAppointmentsQuery } from '@entities/appointment'
import { useClientsQuery } from '@entities/client'
import { useServicesQuery } from '@entities/service'
import WeekDayStrip from './WeekDayStrip.vue'
import AppointmentTimeline from './AppointmentTimeline.vue'

const { t } = useI18n()
const sessionStore = useSessionStore()
const userId = computed(() => sessionStore.session?.user.id ?? '')

const selectedDate = ref(new Date())

const dateRange = computed(() => {
  const d = selectedDate.value
  const from = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
  const to = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
  return { from: from.toISOString(), to: to.toISOString() }
})

const { data: appointments, status } = useAppointmentsQuery(userId, dateRange)
const { data: clients } = useClientsQuery(userId)
const { data: services } = useServicesQuery(userId)
const isLoading = computed(() => status.value === 'loading')
</script>

<template>
  <div class="space-y-3">
    <p class="text-sm font-semibold uppercase text-muted">{{ t('home.upcoming.title') }}</p>
    <WeekDayStrip v-model="selectedDate" />
    <AppointmentTimeline
      :appointments="appointments ?? []"
      :clients="clients ?? []"
      :services="services ?? []"
      :loading="isLoading"
    />
  </div>
</template>
```

- [ ] **Step 4: Create barrel index**

Create `src/widgets/upcoming-appointments/index.ts`:

```typescript
export { default as UpcomingAppointmentsWidget } from './ui/UpcomingAppointmentsWidget.vue'
```

- [ ] **Step 5: Commit**

```bash
git add src/widgets/upcoming-appointments/
git commit -m "feat(widgets): add UpcomingAppointmentsWidget with week day strip and timeline"
```

---

## Task 8: Home Page — Stat Cards and Assembly

**Files:**
- Create: `src/pages/home/ui/HomeEarnedTodayCard.vue`
- Create: `src/pages/home/ui/HomeCompletedCountCard.vue`
- Create: `src/pages/home/ui/HomeWorkingHoursCard.vue`
- Modify: `src/pages/home/ui/HomePage.vue`

- [ ] **Step 1: Create `HomeEarnedTodayCard.vue`**

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { useAnalyticsQuery } from '@entities/analytics'
import { useFormats } from '@shared/lib/formats'

const { t } = useI18n()
const formats = useFormats()
const period = ref('today' as const)
const { data, status } = useAnalyticsQuery(period)
const isLoading = computed(() => status.value === 'loading')
</script>

<template>
  <RouterLink to="/analytics">
    <UPageCard
      variant="subtle"
      :ui="{ root: 'shadow-none h-full cursor-pointer hover:bg-elevated/80 transition-colors' }"
    >
      <div class="flex items-start justify-between">
        <div class="space-y-2">
          <div class="flex items-center gap-2 text-muted">
            <UIcon name="i-lucide-banknote" class="size-4" />
            <span class="text-xs font-medium uppercase">{{ t('home.earnedToday') }}</span>
          </div>
          <div v-if="isLoading" class="h-7 w-20 animate-pulse rounded bg-elevated" />
          <p v-else class="text-2xl font-semibold">{{ formats.price(data?.earned ?? 0) }}</p>
        </div>
        <UIcon name="i-lucide-arrow-right" class="size-4 text-muted mt-1" />
      </div>
    </UPageCard>
  </RouterLink>
</template>
```

- [ ] **Step 2: Create `HomeCompletedCountCard.vue`**

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAnalyticsQuery } from '@entities/analytics'

const { t } = useI18n()
const period = ref('today' as const)
const { data, status } = useAnalyticsQuery(period)
const isLoading = computed(() => status.value === 'loading')
</script>

<template>
  <UPageCard variant="subtle" :ui="{ root: 'shadow-none h-full' }">
    <div class="space-y-2">
      <div class="flex items-center gap-2 text-muted">
        <UIcon name="i-lucide-calendar-check" class="size-4" />
        <span class="text-xs font-medium uppercase">{{ t('home.completedCount') }}</span>
      </div>
      <div v-if="isLoading" class="h-7 w-12 animate-pulse rounded bg-elevated" />
      <p v-else class="text-2xl font-semibold">{{ data?.completed_count ?? 0 }}</p>
    </div>
  </UPageCard>
</template>
```

- [ ] **Step 3: Create `HomeWorkingHoursCard.vue`**

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAnalyticsQuery } from '@entities/analytics'

const { t } = useI18n()
const period = ref('today' as const)
const { data, status } = useAnalyticsQuery(period)
const isLoading = computed(() => status.value === 'loading')

const label = computed(() => {
  if (!data.value) return '—'
  const total = data.value.working_minutes
  if (total === 0) return `0 ${t('analytics.hoursUnit')}`
  const h = Math.floor(total / 60)
  const m = total % 60
  if (m === 0) return `${h} ${t('analytics.hoursUnit')}`
  return `${h} ${t('analytics.hoursUnit')} ${m} ${t('analytics.minutesUnit')}`
})
</script>

<template>
  <UPageCard variant="subtle" :ui="{ root: 'shadow-none h-full' }">
    <div class="space-y-2">
      <div class="flex items-center gap-2 text-muted">
        <UIcon name="i-lucide-clock" class="size-4" />
        <span class="text-xs font-medium uppercase">{{ t('home.workingHours') }}</span>
      </div>
      <div v-if="isLoading" class="h-7 w-16 animate-pulse rounded bg-elevated" />
      <p v-else class="text-2xl font-semibold">{{ label }}</p>
    </div>
  </UPageCard>
</template>
```

- [ ] **Step 4: Rewrite `HomePage.vue`**

```vue
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ActionAppointmentsWidget } from '@widgets/action-appointments'
import { UpcomingAppointmentsWidget } from '@widgets/upcoming-appointments'
import HomeEarnedTodayCard from './HomeEarnedTodayCard.vue'
import HomeCompletedCountCard from './HomeCompletedCountCard.vue'
import HomeWorkingHoursCard from './HomeWorkingHoursCard.vue'

const { t } = useI18n()
</script>

<template>
  <UPage :ui="{ root: 'px-12 max-w-7xl mx-auto' }" as="main">
    <UPageHeader
      :title="t('home.title')"
      :description="t('home.description')"
      :ui="{ root: 'border-none' }"
    />
    <UPageBody>
      <div class="grid grid-cols-3 gap-6">
        <!-- Left column: upcoming + action -->
        <div class="col-span-2 space-y-6">
          <UPageCard variant="subtle" :ui="{ root: 'shadow-none' }">
            <UpcomingAppointmentsWidget />
          </UPageCard>
          <UPageCard variant="subtle" :ui="{ root: 'shadow-none' }">
            <ActionAppointmentsWidget />
          </UPageCard>
        </div>

        <!-- Right column: stat cards -->
        <div class="col-span-1 flex flex-col gap-4">
          <HomeEarnedTodayCard />
          <HomeCompletedCountCard />
          <HomeWorkingHoursCard />
        </div>
      </div>
    </UPageBody>
  </UPage>
</template>
```

- [ ] **Step 5: Run dev server — verify home page renders**

```bash
bun dev
```

Navigate to `/home`. Expected:
- Left: upcoming widget with week strip + timeline; action appointments list below
- Right: three stat cards (earned, completed, hours)
- No console errors

- [ ] **Step 6: Run type check**

```bash
bun run build
```

Expected: exits 0, no TypeScript errors.

- [ ] **Step 7: Commit and push**

```bash
git add src/pages/home/ src/widgets/
git commit -m "feat(home): implement dashboard home with analytics widgets and action appointments"
git push
```
