# Per-Service Checkout Pricing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single editable `amount` field in checkout with per-service editable prices so that `sale_item.price_snapshot` reflects actual amounts charged per service, enabling accurate per-service revenue analytics.

**Architecture:** `useCheckout` exposes `serviceAmounts: Ref<number[]>` (one per service) and `total: ComputedRef<number>` (sum). The modal template conditionally shows per-service inputs (2+ services) or a single total input (≤1 service). No DB schema changes required.

**Tech Stack:** Vue 3 (Vapor), TypeScript, Vitest + jsdom

---

## Files

| File | Action |
|------|--------|
| `src/features/appointment-checkout/__tests__/use-checkout.spec.ts` | Rewrite tests for new API |
| `src/features/appointment-checkout/model/use-checkout.ts` | Replace `amount` with `serviceAmounts` + `total` |
| `src/features/appointment-checkout/ui/AppointmentCheckoutModal.vue` | Conditional template: per-service vs single total |

---

## Task 1: Rewrite tests for the new `useCheckout` API

**Files:**
- Modify: `src/features/appointment-checkout/__tests__/use-checkout.spec.ts`

- [ ] **Step 1: Replace the entire test file with the updated suite**

```ts
import { describe, expect, it } from 'vitest'
import type { Appointment } from '@entities/appointment'
import type { PaymentType } from '@entities/payment-type'
import type { Service } from '@entities/service'
import { useCheckout } from '../model/use-checkout'

const makeAppointment = (overrides?: Partial<Appointment>): Appointment => ({
  id: 'appt-1',
  user_id: 'user-1',
  client_id: 'client-1',
  service_ids: ['svc-1', 'svc-2'],
  start_at: '2026-05-15T10:00:00Z',
  duration: 60,
  price: null,
  status: 'confirmed',
  notes: null,
  created_at: '2026-05-15T09:00:00Z',
  updated_at: '2026-05-15T09:00:00Z',
  ...overrides,
})

const makeService = (id: string, price: number): Service => ({
  id,
  user_id: 'user-1',
  category_id: null,
  name: `Service ${id}`,
  description: null,
  duration: 30,
  price,
  color: '#a78bfa',
  is_active: true,
  sort_order: 0,
  created_at: '2026-05-15T09:00:00Z',
  updated_at: '2026-05-15T09:00:00Z',
})

const makePaymentType = (id: string, isDefault = false): PaymentType => ({
  id,
  user_id: 'user-1',
  name: `Type ${id}`,
  color: '#4ade80',
  is_default: isDefault,
  sort_order: 0,
  created_at: '2026-05-15T09:00:00Z',
  updated_at: '2026-05-15T09:00:00Z',
})

describe('useCheckout', () => {
  it('initializes serviceAmounts to each service price', () => {
    const { serviceAmounts } = useCheckout(
      makeAppointment(),
      [makeService('svc-1', 1200), makeService('svc-2', 800)],
      [makePaymentType('pt-1', true)],
    )
    expect(serviceAmounts.value).toEqual([1200, 800])
  })

  it('total is the sum of serviceAmounts', () => {
    const { total } = useCheckout(
      makeAppointment(),
      [makeService('svc-1', 1200), makeService('svc-2', 800)],
      [makePaymentType('pt-1', true)],
    )
    expect(total.value).toBe(2000)
  })

  it('total updates reactively when a serviceAmount changes', () => {
    const { serviceAmounts, total } = useCheckout(
      makeAppointment(),
      [makeService('svc-1', 1200), makeService('svc-2', 800)],
      [makePaymentType('pt-1', true)],
    )
    serviceAmounts.value[0] = 900
    expect(total.value).toBe(1700)
  })

  it('falls back to [appointment.price] when no services', () => {
    const { serviceAmounts } = useCheckout(
      makeAppointment({ price: 1500 }),
      [],
      [makePaymentType('pt-1', true)],
    )
    expect(serviceAmounts.value).toEqual([1500])
  })

  it('defaults to [0] when no services and appointment.price is null', () => {
    const { serviceAmounts } = useCheckout(
      makeAppointment({ price: null }),
      [],
      [makePaymentType('pt-1', true)],
    )
    expect(serviceAmounts.value).toEqual([0])
  })

  it('pre-selects the default payment type', () => {
    const { selectedPaymentTypeId } = useCheckout(
      makeAppointment(),
      [],
      [makePaymentType('pt-1', false), makePaymentType('pt-2', true)],
    )
    expect(selectedPaymentTypeId.value).toBe('pt-2')
  })

  it('pre-selects first type when none is marked as default', () => {
    const { selectedPaymentTypeId } = useCheckout(
      makeAppointment(),
      [],
      [makePaymentType('pt-1', false), makePaymentType('pt-2', false)],
    )
    expect(selectedPaymentTypeId.value).toBe('pt-1')
  })

  it('selectedPaymentTypeId is null when no payment types exist', () => {
    const { selectedPaymentTypeId } = useCheckout(makeAppointment(), [], [])
    expect(selectedPaymentTypeId.value).toBeNull()
  })

  it('canSubmit is false when total is 0', () => {
    const { canSubmit } = useCheckout(
      makeAppointment({ price: null }),
      [],
      [makePaymentType('pt-1', true)],
    )
    expect(canSubmit.value).toBe(false)
  })

  it('canSubmit is false when any serviceAmount is negative', () => {
    const { serviceAmounts, canSubmit } = useCheckout(
      makeAppointment(),
      [makeService('svc-1', 1200), makeService('svc-2', 800)],
      [makePaymentType('pt-1', true)],
    )
    serviceAmounts.value[0] = -10
    expect(canSubmit.value).toBe(false)
  })

  it('canSubmit is false when no payment type selected', () => {
    const { selectedPaymentTypeId, canSubmit } = useCheckout(
      makeAppointment({ price: 1000 }),
      [],
      [],
    )
    selectedPaymentTypeId.value = null
    expect(canSubmit.value).toBe(false)
  })

  it('canSubmit is true when total > 0 and payment type is selected', () => {
    const { canSubmit } = useCheckout(
      makeAppointment(),
      [makeService('svc-1', 1000)],
      [makePaymentType('pt-1', true)],
    )
    expect(canSubmit.value).toBe(true)
  })

  it('buildPayload uses serviceAmounts as item prices and total as sale amount', () => {
    const services = [makeService('svc-1', 1200), makeService('svc-2', 800)]
    const { serviceAmounts, buildPayload } = useCheckout(
      makeAppointment(),
      services,
      [makePaymentType('pt-1', true)],
    )
    serviceAmounts.value[0] = 1000
    expect(buildPayload()).toEqual({
      appointment_id: 'appt-1',
      amount: 1800,
      payment_type_id: 'pt-1',
      items: [
        { service_id: 'svc-1', name: 'Service svc-1', price: 1000 },
        { service_id: 'svc-2', name: 'Service svc-2', price: 800 },
      ],
    })
  })
})
```

- [ ] **Step 2: Run tests — expect failures**

```bash
bun test:unit src/features/appointment-checkout/__tests__/use-checkout.spec.ts --reporter=verbose
```

Expected: most tests FAIL because `useCheckout` still returns `amount`, not `serviceAmounts`/`total`.

---

## Task 2: Update `useCheckout` composable

**Files:**
- Modify: `src/features/appointment-checkout/model/use-checkout.ts`

- [ ] **Step 3: Replace the composable implementation**

```ts
import { computed, ref } from 'vue'
import type { Appointment } from '@entities/appointment'
import type { PaymentType } from '@entities/payment-type'
import type { Service } from '@entities/service'
import type { CompleteSaleDto } from '@entities/sale'

export function useCheckout(
  appointment: Appointment,
  services: Service[],
  paymentTypes: PaymentType[],
) {
  const serviceAmounts = ref<number[]>(
    services.length > 0
      ? services.map((s) => s.price)
      : [appointment.price ?? 0],
  )

  const total = computed(() => serviceAmounts.value.reduce((sum, a) => sum + a, 0))

  const defaultPaymentType =
    paymentTypes.find((pt) => pt.is_default) ?? paymentTypes[0] ?? null
  const selectedPaymentTypeId = ref<string | null>(defaultPaymentType?.id ?? null)

  const canSubmit = computed(
    () =>
      serviceAmounts.value.every((a) => a >= 0) &&
      total.value > 0 &&
      selectedPaymentTypeId.value !== null,
  )

  function buildPayload(): CompleteSaleDto {
    return {
      appointment_id: appointment.id,
      amount: total.value,
      payment_type_id: selectedPaymentTypeId.value!,
      items: services.map((s, i) => ({
        service_id: s.id,
        name: s.name,
        price: serviceAmounts.value[i],
      })),
    }
  }

  return { serviceAmounts, total, selectedPaymentTypeId, canSubmit, buildPayload }
}
```

- [ ] **Step 4: Run tests — expect all to pass**

```bash
bun test:unit src/features/appointment-checkout/__tests__/use-checkout.spec.ts --reporter=verbose
```

Expected: all 13 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/appointment-checkout/__tests__/use-checkout.spec.ts \
        src/features/appointment-checkout/model/use-checkout.ts
git commit -m "feat: replace single amount with per-service serviceAmounts in useCheckout"
```

---

## Task 3: Update `AppointmentCheckoutModal` template

**Files:**
- Modify: `src/features/appointment-checkout/ui/AppointmentCheckoutModal.vue`

- [ ] **Step 6: Update the `<script setup>` destructuring**

Change line 26–30 from:

```ts
const { amount, selectedPaymentTypeId, canSubmit, buildPayload } = useCheckout(
  props.appointment,
  props.services,
  props.paymentTypes,
)
```

to:

```ts
const { serviceAmounts, total, selectedPaymentTypeId, canSubmit, buildPayload } = useCheckout(
  props.appointment,
  props.services,
  props.paymentTypes,
)
```

- [ ] **Step 7: Update the services list section in the template**

Change the `v-for` row (lines 54–61) from:

```html
        <div
          v-for="service in services"
          :key="service.id"
          class="flex items-center justify-between px-3 py-2 text-sm"
        >
          <span>{{ service.name }}</span>
          <span class="font-medium">{{ formats.price(service.price) }}</span>
        </div>
```

to:

```html
        <div
          v-for="(service, i) in services"
          :key="service.id"
          class="flex items-center justify-between gap-3 px-3 py-2 text-sm"
        >
          <span class="flex-1 truncate">{{ service.name }}</span>
          <UInput
            v-if="services.length > 1"
            v-model.number="serviceAmounts[i]"
            type="number"
            min="0"
            step="1"
            size="sm"
            class="w-28"
          />
          <span v-else class="font-medium">{{ formats.price(service.price) }}</span>
        </div>
```

- [ ] **Step 8: Update the total amount section**

Change the total section (lines 65–76) from:

```html
        <!-- Total amount -->
        <div class="space-y-1.5">
          <label class="text-xs font-semibold uppercase text-muted">
            {{ $t('checkout.total') }}
          </label>
          <UInput
            v-model.number="amount"
            type="number"
            min="0"
            step="1"
            size="xl"
          />
        </div>
```

to:

```html
        <!-- Total amount -->
        <div class="space-y-1.5">
          <label class="text-xs font-semibold uppercase text-muted">
            {{ $t('checkout.total') }}
          </label>
          <p v-if="services.length > 1" class="py-2 text-xl font-semibold">
            {{ formats.price(total) }}
          </p>
          <UInput
            v-else
            v-model.number="serviceAmounts[0]"
            type="number"
            min="0"
            step="1"
            size="xl"
          />
        </div>
```

- [ ] **Step 9: Run the full test suite to confirm nothing broke**

```bash
bun test:unit --reporter=verbose
```

Expected: all tests PASS.

- [ ] **Step 10: Commit**

```bash
git add src/features/appointment-checkout/ui/AppointmentCheckoutModal.vue
git commit -m "feat: show per-service price inputs in checkout modal for multi-service appointments"
```

- [ ] **Step 11: Push**

```bash
git push
```
