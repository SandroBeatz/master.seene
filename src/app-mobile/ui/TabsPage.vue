<script setup lang="ts">
import {
  IonPage,
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
} from '@ionic/vue'
import {
  homeOutline,
  calendarOutline,
  peopleOutline,
  statsChartOutline,
  menuOutline,
} from 'ionicons/icons'

// The mobile app shell: a persistent bottom tab bar wrapping the per-tab
// router outlet. Each tab keeps its own navigation stack (e.g. clients → client
// detail stays inside the Clients tab), which is what `ion-tabs` gives us.
</script>

<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet />

      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="home" href="/tabs/home">
          <ion-icon :icon="homeOutline" aria-hidden="true" />
          <ion-label>{{ $t('nav.home') }}</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="calendar" href="/tabs/calendar">
          <ion-icon :icon="calendarOutline" aria-hidden="true" />
          <ion-label>{{ $t('nav.calendar') }}</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="clients" href="/tabs/clients">
          <ion-icon :icon="peopleOutline" aria-hidden="true" />
          <ion-label>{{ $t('nav.clients') }}</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="analytics" href="/tabs/analytics">
          <ion-icon :icon="statsChartOutline" aria-hidden="true" />
          <ion-label>{{ $t('nav.analytics') }}</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="menu" href="/tabs/menu">
          <ion-icon :icon="menuOutline" aria-hidden="true" />
          <ion-label>{{ $t('nav.menu') }}</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>
