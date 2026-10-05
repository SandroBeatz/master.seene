<script setup lang="ts">
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/vue'
import { CalendarMobile } from '@widgets/calendar/index.mobile'
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ $t('nav.calendar') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :scroll-y="false" class="calendar-content">
      <calendar-mobile />
    </ion-content>
  </ion-page>
</template>

<style scoped>
.calendar-content {
  --background: var(--se-surface-card);
}
</style>
