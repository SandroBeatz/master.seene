<script setup lang="ts">
import { useRouter } from 'vue-router'
import { IonPage, IonContent, IonButton, IonIcon } from '@ionic/vue'
import { desktopOutline } from 'ionicons/icons'
import { supabase } from '@shared/lib/supabase'

const router = useRouter()

// The full native onboarding isn't built yet: a freshly-registered master has a
// session but no `master_profile`, so the guard parks them here. They can finish
// onboarding on the desktop app, or sign out to switch accounts.
async function onSignOut() {
  await supabase.auth.signOut()
  router.replace('/login')
}
</script>

<template>
  <ion-page>
    <ion-content :fullscreen="true" class="ion-padding">
      <div class="flex min-h-full flex-col items-center justify-center px-6 text-center">
        <ion-icon :icon="desktopOutline" class="mb-4 text-5xl text-gray-400" aria-hidden="true" />
        <h1 class="text-2xl font-bold">{{ $t('onboarding.mobilePlaceholder.title') }}</h1>
        <p class="mt-2 max-w-xs text-sm text-gray-500">
          {{ $t('onboarding.mobilePlaceholder.description') }}
        </p>

        <ion-button class="mt-8" fill="outline" @click="onSignOut">
          {{ $t('onboarding.mobilePlaceholder.signOut') }}
        </ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>
