<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  IonPage,
  IonContent,
  IonList,
  IonItem,
  IonInput,
  IonButton,
  IonText,
  IonSpinner,
  toastController,
} from '@ionic/vue'
import { supabase } from '@shared/lib/supabase'
import { signInWithGoogle } from '@entities/session'

const { t } = useI18n()
const router = useRouter()

const form = reactive({ email: '', password: '' })
const errors = reactive<{ email?: string; password?: string }>({})
const passwordLoading = ref(false)
const googleLoading = ref(false)

function validate(): boolean {
  errors.email = undefined
  errors.password = undefined
  const email = form.email.trim()
  if (!email) errors.email = t('auth.validation.emailRequired')
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.email = t('auth.validation.emailInvalid')
  if (!form.password) errors.password = t('auth.validation.passwordRequired')
  else if (form.password.length < 8) errors.password = t('auth.validation.passwordMin')
  return !errors.email && !errors.password
}

async function showError(message: string) {
  const toast = await toastController.create({
    message,
    duration: 3000,
    color: 'danger',
    position: 'top',
  })
  await toast.present()
}

async function onSubmit() {
  if (!validate()) return
  passwordLoading.value = true
  const { error } = await supabase.auth.signInWithPassword({
    email: form.email.trim(),
    password: form.password,
  })
  if (error) {
    passwordLoading.value = false
    await showError(error.message)
    return
  }
  // Guard picks the destination (onboarding vs the app tabs) from the loaded profile.
  router.replace('/tabs/home')
}

async function onGoogleSignIn() {
  googleLoading.value = true
  const { error } = await signInWithGoogle()
  // On success the browser redirects to Google, so keep the spinner until then.
  if (error) {
    googleLoading.value = false
    await showError(error.message)
  }
}
</script>

<template>
  <ion-page>
    <ion-content :fullscreen="true" class="ion-padding">
      <div class="flex min-h-full flex-col justify-center px-2 py-8">
        <div class="mb-8 text-center">
          <h1 class="text-2xl font-bold">{{ $t('auth.login.title') }}</h1>
          <p class="mt-1 text-sm text-gray-500">{{ $t('auth.login.subtitle') }}</p>
        </div>

        <form @submit.prevent="onSubmit">
          <ion-list inset>
            <ion-item>
              <ion-input
                v-model="form.email"
                type="email"
                inputmode="email"
                autocomplete="email"
                fill="solid"
                label-placement="floating"
                :label="$t('auth.login.email')"
                :placeholder="$t('auth.login.emailPlaceholder')"
                :class="{ 'ion-invalid ion-touched': errors.email }"
                :error-text="errors.email"
              />
            </ion-item>
            <ion-item>
              <ion-input
                v-model="form.password"
                type="password"
                autocomplete="current-password"
                fill="solid"
                label-placement="floating"
                :label="$t('auth.login.password')"
                :placeholder="$t('auth.login.passwordPlaceholder')"
                :class="{ 'ion-invalid ion-touched': errors.password }"
                :error-text="errors.password"
              />
            </ion-item>
          </ion-list>

          <div class="mt-4 px-2">
            <ion-button
              type="submit"
              expand="block"
              :disabled="passwordLoading || googleLoading"
            >
              <ion-spinner v-if="passwordLoading" name="crescent" />
              <span v-else>{{ $t('auth.login.signIn') }}</span>
            </ion-button>

            <ion-button
              type="button"
              expand="block"
              fill="outline"
              class="mt-3"
              :disabled="passwordLoading || googleLoading"
              @click="onGoogleSignIn"
            >
              <ion-spinner v-if="googleLoading" name="crescent" />
              <span v-else>{{ $t('auth.login.signInGoogle') }}</span>
            </ion-button>
          </div>
        </form>

        <p class="mt-6 text-center text-sm text-gray-500">
          {{ $t('auth.login.noAccount') }}
          <ion-text
            color="primary"
            class="font-medium"
            role="link"
            @click="router.replace('/register')"
          >
            {{ $t('auth.login.signUpFree') }}
          </ion-text>
        </p>
      </div>
    </ion-content>
  </ion-page>
</template>
