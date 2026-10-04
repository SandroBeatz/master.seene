<script setup lang="ts">
import { IonFooter, IonToolbar } from '@ionic/vue'

// Sticky step footer: running summary on the left (default slot), the step's
// primary action on the right (`action` slot).
</script>

<template>
  <ion-footer class="wizard-step-footer ion-no-border">
    <ion-toolbar>
      <div class="wizard-step-footer__row">
        <div class="wizard-step-footer__summary">
          <slot />
        </div>
        <slot name="action" />
      </div>
    </ion-toolbar>
  </ion-footer>
</template>

<style scoped>
.wizard-step-footer ion-toolbar {
  --background: var(--se-surface-card, var(--ion-background-color));
  --padding-start: 16px;
  --padding-end: 16px;
  --padding-top: 10px;
  --padding-bottom: calc(8px + var(--safe-area-bottom, 0px));
}

.wizard-step-footer__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.wizard-step-footer__summary {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
  font-size: 0.82rem;
  font-variant-numeric: tabular-nums;
}

.wizard-step-footer__summary :deep(span) {
  overflow: hidden;
  color: var(--ion-color-medium);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wizard-step-footer__row :deep(ion-button) {
  --border-radius: 12px;

  flex: 0 0 auto;
  min-height: 44px;
  margin: 0;
  font-weight: 600;
  text-transform: none;
}
</style>
