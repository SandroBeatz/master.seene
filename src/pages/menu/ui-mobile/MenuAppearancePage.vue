<script setup lang="ts">
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonContent,
  IonList,
  IonListHeader,
  IonLabel,
  IonSegment,
  IonSegmentButton,
  IonIcon,
} from '@ionic/vue'
import { checkmark } from 'ionicons/icons'
import { useAppearanceStore } from '@shared/lib/appearance'

const appearance = useAppearanceStore()

function onThemeChange(value: string | number | undefined) {
  if (value === 'light' || value === 'dark' || value === 'system') appearance.setTheme(value)
}
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/menu" />
        </ion-buttons>
        <ion-title>{{ $t('appearance.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <!-- Theme -->
      <ion-list inset>
        <ion-list-header>
          <ion-label>{{ $t('appearance.theme.label') }}</ion-label>
        </ion-list-header>
        <div class="px-4 pb-3">
          <ion-segment
            :value="appearance.theme"
            @ion-change="onThemeChange($event.detail.value)"
          >
            <ion-segment-button value="light">
              <ion-label>{{ $t('appearance.theme.light') }}</ion-label>
            </ion-segment-button>
            <ion-segment-button value="dark">
              <ion-label>{{ $t('appearance.theme.dark') }}</ion-label>
            </ion-segment-button>
            <ion-segment-button value="system">
              <ion-label>{{ $t('appearance.theme.system') }}</ion-label>
            </ion-segment-button>
          </ion-segment>
        </div>
      </ion-list>

      <!-- Primary color -->
      <ion-list inset>
        <ion-list-header>
          <ion-label>{{ $t('appearance.color.label') }}</ion-label>
        </ion-list-header>
        <div class="flex flex-wrap gap-5 px-5 py-4">
          <button
            v-for="preset in appearance.presets"
            :key="preset.key"
            type="button"
            class="flex size-10 items-center justify-center rounded-full transition-transform active:scale-90"
            :style="{
              backgroundColor: preset.base,
              boxShadow:
                appearance.primary === preset.key
                  ? `0 0 0 2px var(--ion-background-color, #fff), 0 0 0 4px ${preset.base}`
                  : 'none',
            }"
            :aria-label="$t(`appearance.colors.${preset.key}`)"
            :aria-pressed="appearance.primary === preset.key"
            @click="appearance.setPrimary(preset.key)"
          >
            <ion-icon
              v-if="appearance.primary === preset.key"
              :icon="checkmark"
              :style="{ color: preset.contrast }"
              aria-hidden="true"
            />
          </button>
        </div>
      </ion-list>
    </ion-content>
  </ion-page>
</template>
