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

const form = reactive({ name: '', email: '', password: '', confirmPassword: '' })
const errors = reactive<{ name?: string; email?: string; password?: string; confirmPassword?: string }>(
  {},
)
const passwordLoading = ref(false)
const googleLoading = ref(false)

function validate(): boolean {
  errors.name = undefined
  errors.email = undefined
  errors.password = undefined
  errors.confirmPassword = undefined
  const email = form.email.trim()
  if (form.name.trim().length < 2) errors.name = t('auth.validation.nameRequired')
  if (!email) errors.email = t('auth.validation.emailRequired')
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.email = t('auth.validation.emailInvalid')
  if (!form.password) errors.password = t('auth.validation.passwordRequired')
  else if (form.password.length < 8) errors.password = t('auth.validation.passwordMin')
  if (!form.confirmPassword) errors.confirmPassword = t('auth.validation.confirmPasswordRequired')
  else if (form.confirmPassword !== form.password)
    errors.confirmPassword = t('auth.validation.confirmPasswordMatch')
  return !errors.name && !errors.email && !errors.password && !errors.confirmPassword
}

async function showToast(message: string, color: 'danger' | 'success') {
  const toast = await toastController.create({ message, duration: 3000, color, position: 'top' })
  await toast.present()
}

async function onSubmit() {
  if (!validate()) return
  passwordLoading.value = true
  const { data, error } = await supabase.auth.signUp({
    email: form.email.trim(),
    password: form.password,
  })
  if (error) {
    passwordLoading.value = false
    await showToast(error.message, 'danger')
    return
  }
  // Email confirmation on → no session yet; send the user back to login with a
  // notice. Confirmation off → a session exists and the guard forwards to onboarding.
  if (!data.session) {
    passwordLoading.value = false
    await showToast(t('auth.register.checkEmail'), 'success')
    router.replace('/login')
    return
  }
  router.replace('/onboarding')
}

async function onGoogleSignUp() {
  googleLoading.value = true
  const { error } = await signInWithGoogle()
  // On success the browser redirects to Google, so keep the spinner until then.
  if (error) {
    googleLoading.value = false
    await showToast(error.message, 'danger')
  }
}
</script>

<template>
  <ion-page>
    <ion-content :fullscreen="true" class="ion-padding">
      <div class="flex min-h-full flex-col justify-center px-2 py-8">
        <div class="mb-8 text-center">
          <h1 class="text-2xl font-bold">{{ $t('auth.register.title') }}</h1>
          <p class="mt-1 text-sm text-gray-500">{{ $t('auth.register.subtitle') }}</p>
        </div>

        <form @submit.prevent="onSubmit">
          <ion-list inset>
            <ion-item>
              <ion-input
                v-model="form.name"
                type="text"
                autocomplete="name"
                fill="solid"
                label-placement="floating"
                :label="$t('auth.register.name')"
                :placeholder="$t('auth.register.namePlaceholder')"
                :class="{ 'ion-invalid ion-touched': errors.name }"
                :error-text="errors.name"
              />
            </ion-item>
            <ion-item>
              <ion-input
                v-model="form.email"
                type="email"
                inputmode="email"
                autocomplete="email"
                fill="solid"
                label-placement="floating"
                :label="$t('auth.register.email')"
                :placeholder="$t('auth.register.emailPlaceholder')"
                :class="{ 'ion-invalid ion-touched': errors.email }"
                :error-text="errors.email"
              />
            </ion-item>
            <ion-item>
              <ion-input
                v-model="form.password"
                type="password"
                autocomplete="new-password"
                fill="solid"
                label-placement="floating"
                :label="$t('auth.register.password')"
                :placeholder="$t('auth.register.passwordPlaceholder')"
                :class="{ 'ion-invalid ion-touched': errors.password }"
                :error-text="errors.password"
              />
            </ion-item>
            <ion-item>
              <ion-input
                v-model="form.confirmPassword"
                type="password"
                autocomplete="new-password"
                fill="solid"
                label-placement="floating"
                :label="$t('auth.register.confirmPassword')"
                :placeholder="$t('auth.register.confirmPasswordPlaceholder')"
                :class="{ 'ion-invalid ion-touched': errors.confirmPassword }"
                :error-text="errors.confirmPassword"
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
              <span v-else>{{ $t('auth.register.signUp') }}</span>
            </ion-button>

            <ion-button
              type="button"
              expand="block"
              fill="outline"
              class="mt-3"
              :disabled="passwordLoading || googleLoading"
              @click="onGoogleSignUp"
            >
              <ion-spinner v-if="googleLoading" name="crescent" />
              <span v-else>{{ $t('auth.register.signUpGoogle') }}</span>
            </ion-button>
          </div>
        </form>

        <p class="mt-6 text-center text-sm text-gray-500">
          {{ $t('auth.register.haveAccount') }}
          <ion-text
            color="primary"
            class="font-medium"
            role="link"
            @click="router.replace('/login')"
          >
            {{ $t('auth.register.signIn') }}
          </ion-text>
        </p>
      </div>
    </ion-content>
  </ion-page>
</template>
