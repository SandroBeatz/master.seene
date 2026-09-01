<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  alertController,
} from '@ionic/vue'
import { logOutOutline } from 'ionicons/icons'
import { supabase } from '@shared/lib/supabase'
import { useSessionStore } from '@entities/session'

const { t } = useI18n()
const router = useRouter()
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

// Logout is gated behind a native confirm dialog — mirrors the desktop
// AccountSignOutRow flow, reusing the same i18n keys.
async function onSignOut() {
  const alert = await alertController.create({
    header: t('settings.account.signOut.confirmTitle'),
    message: t('settings.account.signOut.confirmMessage'),
    buttons: [
      { text: t('common.cancel'), role: 'cancel' },
      {
        text: t('settings.account.signOut.button'),
        role: 'destructive',
        handler: async () => {
          await supabase.auth.signOut()
          router.replace('/login')
        },
      },
    ],
  })
  await alert.present()
}
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/menu" />
        </ion-buttons>
        <ion-title>{{ $t('nav.account') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="flex flex-col items-center gap-3 py-6">
        <div
          class="flex size-20 items-center justify-center overflow-hidden rounded-full bg-gray-100 text-2xl font-semibold text-gray-700"
        >
          <img
            v-if="profile?.avatar_url"
            :src="profile.avatar_url"
            :alt="fullName"
            class="size-full object-cover"
          />
          <span v-else>{{ initials() }}</span>
        </div>
        <div class="text-center">
          <h1 class="text-xl font-bold">{{ fullName }}</h1>
          <p v-if="profile?.username" class="text-sm text-gray-500">@{{ profile.username }}</p>
        </div>
      </div>

      <ion-list inset>
        <ion-item button lines="none" @click="onSignOut">
          <ion-icon slot="start" :icon="logOutOutline" color="danger" aria-hidden="true" />
          <ion-label color="danger">{{ $t('settings.account.signOut.button') }}</ion-label>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>
