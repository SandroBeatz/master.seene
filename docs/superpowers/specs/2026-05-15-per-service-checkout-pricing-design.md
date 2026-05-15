# Per-Service Checkout Pricing — Design

**Date:** 2026-05-15  
**Status:** Approved

## Problem

The current checkout flow has a single editable `amount` field (total). When an appointment has multiple services, the master can discount the total but individual `sale_item.price_snapshot` values still reflect original service prices. This breaks per-service revenue analytics (e.g., "how much did service X earn?").

## Decision

Switch to per-service price editing for appointments with 2+ services. For single-service appointments, keep the current single "Total" field behaviour.

Out of scope for now: a "total discount" mode (proportional distribution across services). Can be added later if requested.

---

## Design

### `useCheckout` composable

Replace `amount: Ref<number>` with:

```ts
serviceAmounts: Ref<number[]>   // one editable value per service
total: ComputedRef<number>       // sum(serviceAmounts)
```

**Initialization:**
- `serviceAmounts` = `services.map(s => s.price)` when services exist
- Falls back to `[appointment.price ?? 0]` when no services

**Validation (`canSubmit`):**
- Every `serviceAmounts[i] >= 0` (no negatives)
- `total > 0` (can't complete a free checkout)
- `selectedPaymentTypeId !== null`

**`buildPayload()` change:**
```ts
// items use edited prices, not original service.price
items: services.map((s, i) => ({
  service_id: s.id,
  name: s.name,
  price: serviceAmounts.value[i],   // ← was s.price
})),
amount: total.value,                 // ← was amount.value
```

---

### `AppointmentCheckoutModal` template

**Single service (`services.length <= 1`):**  
Behaviour unchanged — "Total" label + single `UInput` bound to `serviceAmounts[0]`.

**Multiple services (`services.length > 1`):**  
Each service row in the list gets an inline `UInput` instead of read-only price text.  
The "Total" section becomes read-only, displaying `formats.price(total)`.

```
┌─ Services ────────────────────────────────┐
│  Стрижка           [    45   ] ₽          │
│  Окрашивание       [   120   ] ₽          │
└───────────────────────────────────────────┘
  Итого: 165 ₽  (read-only)
```

---

### Database — no schema changes

`sale.amount` = `total` (actual amount paid)  
`sale_item.price_snapshot` = `serviceAmounts[i]` (edited per-service price)

Analytics query for per-service revenue:
```sql
SELECT service_id, SUM(price_snapshot) AS revenue
FROM sale_item
GROUP BY service_id;
```

---

## Files to change

| File | Change |
|------|--------|
| `src/features/appointment-checkout/model/use-checkout.ts` | Replace `amount` with `serviceAmounts` + `total` |
| `src/features/appointment-checkout/ui/AppointmentCheckoutModal.vue` | Conditional template: single vs multi-service |
| `src/features/appointment-checkout/__tests__/use-checkout.spec.ts` | Update tests for new API |

No DB migration needed.
