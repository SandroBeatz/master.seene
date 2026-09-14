<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { IonButton, IonIcon } from '@ionic/vue'
import { arrowUpOutline, sparklesOutline } from 'ionicons/icons'
import AccountPlansModalMobile from './AccountPlansModalMobile.vue'
import AccountSecurityMobile from './AccountSecurityMobile.vue'
import AccountDeleteMobile from './AccountDeleteMobile.vue'

const plansOpen = ref(false)
const presentingElement = ref<HTMLElement | null>(null)

onMounted(() => {
  presentingElement.value = document.querySelector('ion-router-outlet')
})
</script>

<template>
  <div class="account-content">
    <header class="account-intro">
      <p>{{ $t('settings.account.subtitle') }}</p>
    </header>

    <section class="upgrade-card">
      <div class="upgrade-glow" aria-hidden="true" />
      <div class="upgrade-content">
        <span class="plan-badge">
          <ion-icon :icon="sparklesOutline" aria-hidden="true" />
          {{ $t('settings.account.upgrade.planBadge') }}
        </span>
        <h2>{{ $t('settings.account.upgrade.title') }}</h2>
        <p>{{ $t('settings.account.upgrade.description') }}</p>
        <ion-button expand="block" color="light" @click="plansOpen = true">
          {{ $t('settings.account.upgrade.button') }}
          <ion-icon slot="end" :icon="arrowUpOutline" aria-hidden="true" />
        </ion-button>
      </div>
    </section>

    <account-security-mobile :presenting-element="presentingElement" />
    <account-delete-mobile :presenting-element="presentingElement" />

    <account-plans-modal-mobile
      v-model:is-open="plansOpen"
      :presenting-element="presentingElement"
    />
  </div>
</template>

<style scoped>
.account-content {
  padding-bottom: calc(22px + var(--ion-safe-area-bottom, 0px));
}

.account-intro {
  padding: 2px 24px 20px;
}

.account-intro p {
  margin: 0;
}

.account-intro p {
  color: var(--ion-color-medium);
  font-size: 0.9rem;
  line-height: 1.4;
}

.upgrade-card {
  position: relative;
  margin: 0 16px 28px;
  overflow: hidden;
  border-radius: 18px;
  background: #111113;
  color: #fff;
}

.upgrade-glow {
  position: absolute;
  top: -70px;
  right: -55px;
  width: 190px;
  height: 190px;
  border-radius: 50%;
  background: rgb(245 158 11 / 24%);
  filter: blur(35px);
}

.upgrade-content {
  position: relative;
  padding: 20px;
}

.plan-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 9px;
  border: 1px solid rgb(255 255 255 / 12%);
  border-radius: 999px;
  background: rgb(255 255 255 / 8%);
  color: #fcd34d;
  font-size: 0.75rem;
  font-weight: 600;
}

.upgrade-card h2,
.upgrade-card p {
  margin: 0;
}

.upgrade-card h2 {
  margin-top: 16px;
  font-size: 1.2rem;
  font-weight: 700;
}

.upgrade-card p {
  margin-top: 8px;
  color: #a1a1aa;
  font-size: 0.88rem;
  line-height: 1.45;
}

.upgrade-card ion-button {
  min-height: 48px;
  margin: 20px 0 0;
  --border-radius: 999px;
}
</style>
