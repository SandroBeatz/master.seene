<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonTitle,
  IonContent,
  IonIcon,
  toastController,
} from '@ionic/vue'
import { checkmark, closeOutline } from 'ionicons/icons'

defineProps<{
  isOpen: boolean
  presentingElement?: HTMLElement | null
}>()

const emit = defineEmits<{
  'update:isOpen': [boolean]
}>()

const { t, tm, rt } = useI18n()

const freeFeatures = computed(() => tm('settings.account.plans.free.features') as unknown[])
const proFeatures = computed(() => tm('settings.account.plans.pro.features') as unknown[])

function close() {
  emit('update:isOpen', false)
}

async function onChoosePro() {
  const toast = await toastController.create({
    message: t('settings.account.plans.pro.comingSoonToast'),
    duration: 2000,
    color: 'primary',
    position: 'top',
  })
  await toast.present()
}
</script>

<template>
  <ion-modal
    :is-open="isOpen"
    :presenting-element="presentingElement ?? undefined"
    @did-dismiss="emit('update:isOpen', false)"
  >
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button fill="clear" color="dark" :aria-label="$t('common.close')" @click="close">
            <ion-icon slot="icon-only" :icon="closeOutline" aria-hidden="true" />
          </ion-button>
        </ion-buttons>
        <ion-title>{{ $t('settings.account.plans.modalTitle') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding">
      <p class="modal-subtitle">{{ $t('settings.account.plans.modalSubtitle') }}</p>

      <div class="plans-grid">
        <section class="plan-card">
          <div>
            <h2>{{ $t('settings.account.plans.free.name') }}</h2>
            <p>{{ $t('settings.account.plans.free.tagline') }}</p>
          </div>
          <div class="price-row">
            <strong>{{ $t('settings.account.plans.free.price') }}</strong>
            <span>{{ $t('settings.account.plans.free.priceNote') }}</span>
          </div>
          <ul>
            <li v-for="(feature, index) in freeFeatures" :key="index">
              <ion-icon :icon="checkmark" aria-hidden="true" />
              <span>{{ rt(feature as never) }}</span>
            </li>
          </ul>
          <ion-button expand="block" fill="outline" disabled>
            {{ $t('settings.account.plans.free.currentButton') }}
          </ion-button>
        </section>

        <section class="plan-card plan-card--pro">
          <span class="recommended">{{ $t('settings.account.plans.pro.badge') }}</span>
          <div>
            <h2>{{ $t('settings.account.plans.pro.name') }}</h2>
            <p>{{ $t('settings.account.plans.pro.tagline') }}</p>
          </div>
          <div class="price-row">
            <span>{{ $t('settings.account.plans.pro.priceNote') }}</span>
          </div>
          <ul>
            <li v-for="(feature, index) in proFeatures" :key="index">
              <ion-icon :icon="checkmark" aria-hidden="true" />
              <span>{{ rt(feature as never) }}</span>
            </li>
          </ul>
          <ion-button expand="block" @click="onChoosePro">
            {{ $t('settings.account.plans.pro.selectButton') }}
          </ion-button>
        </section>
      </div>
    </ion-content>
  </ion-modal>
</template>

<style scoped>
ion-header ion-toolbar {
  --background: var(--se-surface-page, #f2f2f7);
}

.modal-subtitle {
  margin: 0 0 20px;
  color: var(--ion-color-medium);
  font-size: 0.9rem;
  line-height: 1.4;
}

.plans-grid {
  display: grid;
  gap: 16px;
  padding-bottom: calc(16px + var(--ion-safe-area-bottom, 0px));
}

.plan-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 20px;
  border: 1px solid var(--se-separator, rgb(0 0 0 / 11%));
  border-radius: 16px;
  background: var(--se-surface-card, #fff);
}

.plan-card--pro {
  border: 2px solid var(--ion-color-primary);
}

.plan-card h2,
.plan-card p {
  margin: 0;
}

.plan-card h2 {
  font-size: 1.15rem;
  font-weight: 700;
}

.plan-card p,
.price-row span {
  color: var(--ion-color-medium);
  font-size: 0.85rem;
}

.price-row {
  display: flex;
  align-items: baseline;
  gap: 7px;
}

.price-row strong {
  font-size: 1.5rem;
}

.plan-card ul {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.plan-card li {
  display: flex;
  gap: 9px;
  font-size: 0.86rem;
  line-height: 1.35;
}

.plan-card li ion-icon {
  flex: 0 0 auto;
  margin-top: 2px;
  color: var(--ion-color-primary);
}

.recommended {
  position: absolute;
  top: -11px;
  right: 16px;
  padding: 4px 9px;
  border-radius: 999px;
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
  font-size: 0.7rem;
  font-weight: 700;
}

@media (min-width: 700px) {
  .plans-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
