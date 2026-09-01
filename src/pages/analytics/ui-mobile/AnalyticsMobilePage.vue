<script setup lang="ts">
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonIcon } from '@ionic/vue'
import { statsChartOutline } from 'ionicons/icons'

// Placeholder tab — native analytics is built later. Keeps the tab bar complete
// so navigation feels real during the PoC.
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ $t('nav.analytics') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="flex min-h-full flex-col items-center justify-center px-6 text-center">
        <ion-icon :icon="statsChartOutline" class="mb-3 text-5xl text-gray-400" aria-hidden="true" />
        <p class="text-base text-gray-500">{{ $t('common.comingSoon') }}</p>
      </div>
    </ion-content>
  </ion-page>
</template>
