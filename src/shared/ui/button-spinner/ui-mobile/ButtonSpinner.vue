<script setup lang="ts">
import { IonSpinner } from '@ionic/vue'

// The one loading indicator for buttons across the mobile app: same spinner on
// iOS and Android, sized to the label, in the button's text color. Place it
// where the button's icon goes — `slot="start"` before the label (it keeps a
// gap to the text) or `slot="icon-only"` in an icon button.
</script>

<template>
  <ion-spinner name="crescent" class="se-button-spinner" aria-hidden="true" />
</template>

<style scoped>
.se-button-spinner {
  --color: currentColor;

  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

/* Outer styles beat ion-button's own ::slotted margins (~0.3em, too tight). */
.se-button-spinner[slot='start'] {
  margin-inline: 0 8px;
}

.se-button-spinner[slot='end'] {
  margin-inline: 8px 0;
}

.se-button-spinner[slot='icon-only'] {
  margin: 0;
}
</style>
