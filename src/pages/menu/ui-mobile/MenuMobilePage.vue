<script setup lang="ts">
import { computed } from 'vue'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonAvatar,
  IonLabel,
  IonIcon,
} from '@ionic/vue'
import { personCircleOutline, colorPaletteOutline } from 'ionicons/icons'
import { useSessionStore } from '@entities/session'

const sessionStore = useSessionStore()
const profile = computed(() => sessionStore.profile)

const fullName = computed(() =>
  profile.value
    ? [profile.value.first_name, profile.value.last_name].filter(Boolean).join(' ')
    : '',
)

function initials(): string {
  const parts = [profile.value?.first_name, profile.value?.last_name].filter(Boolean) as string[]
  return (
    parts
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('')
      .slice(0, 2) || '?'
  )
}
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ $t('nav.menu') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <!-- Account entry pushes into the Account sub-page inside the Menu tab. -->
      <ion-list inset>
        <ion-item button detail router-link="/tabs/menu/account">
          <ion-avatar
            v-if="profile"
            slot="start"
            class="flex items-center justify-center bg-gray-100 text-sm font-semibold text-gray-700"
          >
            <img v-if="profile.avatar_url" :src="profile.avatar_url" :alt="fullName" />
            <span v-else>{{ initials() }}</span>
          </ion-avatar>
          <ion-icon v-else slot="start" :icon="personCircleOutline" aria-hidden="true" />
          <ion-label>
            <h2>{{ fullName || $t('nav.account') }}</h2>
            <p v-if="profile?.username">@{{ profile.username }}</p>
          </ion-label>
        </ion-item>
      </ion-list>

      <ion-list inset>
        <ion-item button detail router-link="/tabs/menu/appearance">
          <ion-icon slot="start" :icon="colorPaletteOutline" aria-hidden="true" />
          <ion-label>{{ $t('appearance.title') }}</ion-label>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>
