<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonTitle,
  IonContent,
  IonFooter,
  IonItem,
  IonInput,
  IonLabel,
  IonNote,
  IonIcon,
  IonSpinner,
  alertController,
  isPlatform,
  toastController,
} from '@ionic/vue'
import { closeOutline, keyOutline, logOutOutline, mailOutline } from 'ionicons/icons'
import { useSessionStore } from '@entities/session'
import { supabase } from '@shared/lib/supabase'
import { InsetList } from '@shared/ui/inset-list/index.mobile'

defineProps<{
  presentingElement?: HTMLElement | null
}>()

const { t } = useI18n()
const router = useRouter()
const sessionStore = useSessionStore()

const currentEmail = computed(() => sessionStore.session?.user.email ?? '')
const spinnerName = isPlatform('ios') ? 'dots' : 'crescent'

const emailOpen = ref(false)
const email = ref('')
const emailSubmitted = ref(false)
const emailLoading = ref(false)
const allowEmailDismiss = ref(false)

const passwordOpen = ref(false)
const password = reactive({ current: '', next: '', confirm: '' })
const passwordSubmitted = ref(false)
const passwordLoading = ref(false)
const allowPasswordDismiss = ref(false)
const currentPasswordInvalid = ref(false)
const signOutLoading = ref(false)

const emailDirty = computed(() => email.value.length > 0)
const passwordDirty = computed(() => Boolean(password.current || password.next || password.confirm))
const emailValid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()))
const passwordsValid = computed(
  () =>
    password.current.length > 0 && password.next.length >= 8 && password.confirm === password.next,
)

const emailError = computed(() => {
  if (!emailSubmitted.value) return ''
  if (!email.value.trim()) return t('auth.validation.emailRequired')
  if (!emailValid.value) return t('auth.validation.emailInvalid')
  return ''
})

function passwordError(field: 'current' | 'next' | 'confirm'): string {
  if (!passwordSubmitted.value) return ''
  if (field === 'current') {
    if (!password.current) return t('auth.validation.passwordRequired')
    if (currentPasswordInvalid.value) return t('settings.account.password.currentPasswordError')
  }
  if (field === 'next') {
    if (!password.next) return t('auth.validation.passwordRequired')
    if (password.next.length < 8) return t('auth.validation.passwordMin')
  }
  if (field === 'confirm') {
    if (!password.confirm) return t('auth.validation.passwordRequired')
    if (password.confirm !== password.next) return t('settings.account.password.mismatchError')
  }
  return ''
}

async function showToast(message: string, color: 'success' | 'danger') {
  const toast = await toastController.create({ message, duration: 2500, color, position: 'top' })
  await toast.present()
}

async function confirmDiscard(): Promise<boolean> {
  const alert = await alertController.create({
    header: t('common.unsavedChanges'),
    message: t('common.unsavedChangesConfirm'),
    buttons: [
      { text: t('common.cancel'), role: 'cancel' },
      { text: t('common.discard'), role: 'destructive' },
    ],
  })
  await alert.present()
  return (await alert.onDidDismiss()).role === 'destructive'
}

function openEmail() {
  email.value = ''
  emailSubmitted.value = false
  allowEmailDismiss.value = false
  emailOpen.value = true
}

function canDismissEmail(): boolean | Promise<boolean> {
  if (emailLoading.value) return false
  if (allowEmailDismiss.value || !emailDirty.value) return true
  return confirmDiscard()
}

async function closeEmail() {
  if (emailLoading.value) return
  if (emailDirty.value && !(await confirmDiscard())) return
  allowEmailDismiss.value = true
  emailOpen.value = false
}

async function submitEmail() {
  emailSubmitted.value = true
  if (!emailValid.value || emailLoading.value) return
  emailLoading.value = true
  try {
    const { error } = await supabase.auth.updateUser(
      { email: email.value.trim() },
      { emailRedirectTo: window.location.origin },
    )
    if (error) {
      await showToast(`${t('settings.account.email.errorToast')}: ${error.message}`, 'danger')
      return
    }
    await showToast(t('settings.account.email.confirmationSentToast'), 'success')
    allowEmailDismiss.value = true
    emailOpen.value = false
  } finally {
    emailLoading.value = false
  }
}

function openPassword() {
  password.current = ''
  password.next = ''
  password.confirm = ''
  passwordSubmitted.value = false
  currentPasswordInvalid.value = false
  allowPasswordDismiss.value = false
  passwordOpen.value = true
}

function canDismissPassword(): boolean | Promise<boolean> {
  if (passwordLoading.value) return false
  if (allowPasswordDismiss.value || !passwordDirty.value) return true
  return confirmDiscard()
}

async function closePassword() {
  if (passwordLoading.value) return
  if (passwordDirty.value && !(await confirmDiscard())) return
  allowPasswordDismiss.value = true
  passwordOpen.value = false
}

async function submitPassword() {
  passwordSubmitted.value = true
  currentPasswordInvalid.value = false
  if (!passwordsValid.value || passwordLoading.value) return

  const accountEmail = currentEmail.value
  if (!accountEmail) return

  passwordLoading.value = true
  try {
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: accountEmail,
      password: password.current,
    })
    if (reauthError) {
      currentPasswordInvalid.value = true
      await showToast(t('settings.account.password.currentPasswordError'), 'danger')
      return
    }

    const { error } = await supabase.auth.updateUser({ password: password.next })
    if (error) {
      await showToast(`${t('settings.account.password.errorToast')}: ${error.message}`, 'danger')
      return
    }

    await showToast(t('settings.account.password.successToast'), 'success')
    allowPasswordDismiss.value = true
    passwordOpen.value = false
  } finally {
    passwordLoading.value = false
  }
}

async function onSignOut() {
  if (signOutLoading.value) return
  const alert = await alertController.create({
    header: t('settings.account.signOut.confirmTitle'),
    message: t('settings.account.signOut.confirmMessage'),
    buttons: [
      { text: t('common.cancel'), role: 'cancel' },
      { text: t('settings.account.signOut.button'), role: 'destructive' },
    ],
  })
  await alert.present()
  if ((await alert.onDidDismiss()).role !== 'destructive') return
  signOutLoading.value = true
  try {
    await supabase.auth.signOut()
    await router.replace('/login')
  } finally {
    signOutLoading.value = false
  }
}
</script>

<template>
  <inset-list :header="$t('settings.account.securityLabel')">
    <ion-item class="account-row">
      <div class="account-row__body">
        <div class="account-row__copy">
          <h2>{{ $t('settings.account.email.label') }}</h2>
          <p>{{ currentEmail || $t('settings.account.email.notSet') }}</p>
        </div>
        <ion-button expand="block" size="default" fill="outline" color="medium" @click="openEmail">
          <ion-icon slot="start" :icon="mailOutline" aria-hidden="true" />
          {{ $t('settings.account.email.changeButton') }}
        </ion-button>
      </div>
    </ion-item>

    <ion-item class="account-row">
      <div class="account-row__body">
        <div class="account-row__copy">
          <h2>{{ $t('settings.account.password.label') }}</h2>
          <p>{{ $t('settings.account.password.description') }}</p>
        </div>
        <ion-button
          expand="block"
          size="default"
          fill="outline"
          color="medium"
          @click="openPassword"
        >
          <ion-icon slot="start" :icon="keyOutline" aria-hidden="true" />
          {{ $t('settings.account.password.changeButton') }}
        </ion-button>
      </div>
    </ion-item>

    <ion-item lines="none" class="account-row">
      <div class="account-row__body">
        <div class="account-row__copy">
          <h2>{{ $t('settings.account.signOut.label') }}</h2>
          <p>{{ $t('settings.account.signOut.description') }}</p>
        </div>
        <ion-button
          expand="block"
          size="default"
          fill="outline"
          color="medium"
          :disabled="signOutLoading"
          :aria-busy="signOutLoading"
          @click="onSignOut"
        >
          <ion-spinner v-if="signOutLoading" :name="spinnerName" />
          <template v-else>
            <ion-icon slot="start" :icon="logOutOutline" aria-hidden="true" />
            {{ $t('settings.account.signOut.button') }}
          </template>
        </ion-button>
      </div>
    </ion-item>
  </inset-list>

  <ion-modal
    :is-open="emailOpen"
    :presenting-element="presentingElement ?? undefined"
    :can-dismiss="canDismissEmail"
    @did-dismiss="emailOpen = false"
  >
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button
            fill="clear"
            color="dark"
            :disabled="emailLoading"
            :aria-label="$t('common.close')"
            @click="closeEmail"
          >
            <ion-icon slot="icon-only" :icon="closeOutline" aria-hidden="true" />
          </ion-button>
        </ion-buttons>
        <ion-title>{{ $t('settings.account.email.modalTitle') }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true" class="ion-padding-vertical">
      <p class="modal-description">{{ $t('settings.account.email.modalDescription') }}</p>
      <form id="account-email-form" @submit.prevent="submitEmail">
        <inset-list>
          <ion-item
            lines="none"
            :class="{ 'ion-invalid': emailError, 'ion-touched': emailSubmitted }"
          >
            <ion-label position="stacked">{{
              $t('settings.account.email.newEmailLabel')
            }}</ion-label>
            <ion-input
              v-model="email"
              type="email"
              inputmode="email"
              autocomplete="email"
              :placeholder="$t('settings.account.email.newEmailPlaceholder')"
              enterkeyhint="done"
              @keyup.enter="submitEmail"
            />
          </ion-item>
        </inset-list>
        <ion-note v-if="emailError" color="danger" class="field-error">{{ emailError }}</ion-note>
      </form>
    </ion-content>
    <ion-footer class="ion-no-border">
      <ion-toolbar>
        <ion-button
          class="submit-button"
          expand="block"
          :disabled="!emailValid || emailLoading"
          @click="submitEmail"
        >
          <span :class="{ 'loading-label': emailLoading }">{{
            $t('settings.account.email.submit')
          }}</span>
          <ion-spinner v-if="emailLoading" class="button-spinner" :name="spinnerName" />
        </ion-button>
      </ion-toolbar>
    </ion-footer>
  </ion-modal>

  <ion-modal
    :is-open="passwordOpen"
    :presenting-element="presentingElement ?? undefined"
    :can-dismiss="canDismissPassword"
    @did-dismiss="passwordOpen = false"
  >
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button
            fill="clear"
            color="dark"
            :disabled="passwordLoading"
            :aria-label="$t('common.close')"
            @click="closePassword"
          >
            <ion-icon slot="icon-only" :icon="closeOutline" aria-hidden="true" />
          </ion-button>
        </ion-buttons>
        <ion-title>{{ $t('settings.account.password.modalTitle') }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true" class="ion-padding-vertical">
      <form id="account-password-form" @submit.prevent="submitPassword">
        <inset-list>
          <ion-item
            :class="{ 'ion-invalid': passwordError('current'), 'ion-touched': passwordSubmitted }"
          >
            <ion-label position="stacked">{{
              $t('settings.account.password.currentPasswordLabel')
            }}</ion-label>
            <ion-input v-model="password.current" type="password" autocomplete="current-password" />
          </ion-item>
          <ion-item
            :class="{ 'ion-invalid': passwordError('next'), 'ion-touched': passwordSubmitted }"
          >
            <ion-label position="stacked">{{
              $t('settings.account.password.newPasswordLabel')
            }}</ion-label>
            <ion-input v-model="password.next" type="password" autocomplete="new-password" />
          </ion-item>
          <ion-item
            lines="none"
            :class="{ 'ion-invalid': passwordError('confirm'), 'ion-touched': passwordSubmitted }"
          >
            <ion-label position="stacked">{{
              $t('settings.account.password.confirmPasswordLabel')
            }}</ion-label>
            <ion-input
              v-model="password.confirm"
              type="password"
              autocomplete="new-password"
              enterkeyhint="done"
              @keyup.enter="submitPassword"
            />
          </ion-item>
        </inset-list>
        <ion-note v-if="passwordError('current')" color="danger" class="field-error">{{
          passwordError('current')
        }}</ion-note>
        <ion-note v-else-if="passwordError('next')" color="danger" class="field-error">{{
          passwordError('next')
        }}</ion-note>
        <ion-note v-else-if="passwordError('confirm')" color="danger" class="field-error">{{
          passwordError('confirm')
        }}</ion-note>
      </form>
    </ion-content>
    <ion-footer class="ion-no-border">
      <ion-toolbar>
        <ion-button
          class="submit-button"
          expand="block"
          :disabled="!passwordsValid || passwordLoading"
          @click="submitPassword"
        >
          <span :class="{ 'loading-label': passwordLoading }">{{
            $t('settings.account.password.submit')
          }}</span>
          <ion-spinner v-if="passwordLoading" class="button-spinner" :name="spinnerName" />
        </ion-button>
      </ion-toolbar>
    </ion-footer>
  </ion-modal>
</template>

<style scoped>
.account-row {
  --padding-top: 12px;
  --padding-bottom: 12px;
}

.account-row__body {
  width: 100%;
}

.account-row__copy {
  margin-bottom: 12px;
}

.account-row__copy h2,
.account-row__copy p {
  margin: 0;
}

.account-row__copy h2 {
  font-size: 1rem;
  font-weight: 500;
}

.account-row__copy p {
  margin-top: 4px;
  color: var(--ion-color-medium);
  font-size: 0.85rem;
  line-height: 1.35;
}

ion-header ion-toolbar {
  --background: var(--se-surface-page, #f2f2f7);
}

.modal-description {
  margin: 0 32px 18px;
  color: var(--ion-color-medium);
  font-size: 0.85rem;
  line-height: 1.4;
}

form :deep(.se-inset-list) {
  margin-bottom: 0;
}

form ion-item {
  --padding-top: 8px;
  --padding-bottom: 8px;
}

form ion-label {
  margin-bottom: 6px;
  color: var(--ion-color-medium);
  font-size: 0.78rem;
}

.field-error {
  display: block;
  padding: 8px 32px 0;
  font-size: 0.75rem;
}

ion-footer ion-toolbar {
  --padding-top: 16px;
  --padding-bottom: 16px;
  --padding-start: 16px;
  --padding-end: 16px;
}

.submit-button {
  position: relative;
  min-height: 48px;
  margin: 0;
  --border-radius: 12px;
}

.loading-label {
  opacity: 0;
}

.button-spinner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
</style>
