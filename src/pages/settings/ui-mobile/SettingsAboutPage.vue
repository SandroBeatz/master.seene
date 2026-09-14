<script setup lang="ts">
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonContent,
  IonItem,
  IonLabel,
  IonNote,
} from '@ionic/vue'
import { arrowBackOutline } from 'ionicons/icons'
import appIcon from '@shared/assets/icon.svg'
import { InsetList } from '@shared/ui/inset-list/index.mobile'

// Matches the current native versionName / MARKETING_VERSION.
const APP_VERSION = '1.0'
</script>

<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button
            default-href="/tabs/settings"
            text=""
            :icon="arrowBackOutline"
            color="dark"
          />
        </ion-buttons>
        <ion-title>{{ $t('settings.about.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding-vertical">
      <section class="about-hero">
        <img :src="appIcon" alt="" class="about-icon" />
        <h1>Seene</h1>
        <p>{{ $t('settings.about.description') }}</p>
      </section>

      <inset-list>
        <ion-item lines="none" class="description-item">
          <ion-label class="ion-text-wrap">
            {{ $t('settings.about.body') }}
          </ion-label>
        </ion-item>
      </inset-list>

      <inset-list>
        <ion-item lines="none">
          <ion-label>{{ $t('settings.about.version') }}</ion-label>
          <ion-note slot="end">{{ APP_VERSION }}</ion-note>
        </ion-item>
      </inset-list>
    </ion-content>
  </ion-page>
</template>

<style scoped>
ion-header ion-toolbar.ios {
  --padding-start: 16px;
  --padding-end: 16px;
}

ion-header ion-toolbar {
  --background: var(--se-surface-page, #f2f2f7);
}

.about-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 22px 32px 28px;
  text-align: center;
}

.about-icon {
  width: 80px;
  height: 80px;
  margin-bottom: 16px;
  border-radius: 22px;
  box-shadow: 0 10px 28px rgb(0 0 0 / 0.12);
}

.about-hero h1 {
  margin: 0;
  color: var(--ion-text-color);
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.about-hero p {
  max-width: 300px;
  margin: 7px 0 0;
  color: var(--ion-color-medium);
  font-size: 0.92rem;
  line-height: 1.4;
}

.description-item {
  --padding-top: 12px;
  --padding-bottom: 12px;
}

.description-item ion-label {
  margin: 0;
  color: var(--ion-color-medium);
  font-size: 0.9rem;
  line-height: 1.5;
}

ion-note {
  color: var(--ion-color-medium);
  font-size: 0.92rem;
}
</style>
