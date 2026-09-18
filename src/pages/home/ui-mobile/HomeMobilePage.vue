<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/vue'
import { useSessionStore } from '@entities/session'

const { t } = useI18n()
const sessionStore = useSessionStore()

// Time-of-day greeting reuses the existing home.greeting.* keys.
const hour = new Date().getHours()
const greetingKey =
  hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : hour < 22 ? 'evening' : 'night'
const greeting = computed(() => t(`home.greeting.${greetingKey}`))
const firstName = computed(() => sessionStore.profile?.first_name ?? '')
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ $t('home.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="px-4 pb-2 pt-6">
        <h1 class="text-2xl font-bold">{{ greeting }}</h1>
        <p v-if="firstName" class="mt-1 text-base text-gray-500">{{ firstName }}</p>
      </div>
    </ion-content>
  </ion-page>
</template>
