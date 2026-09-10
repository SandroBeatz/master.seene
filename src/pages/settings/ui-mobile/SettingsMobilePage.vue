<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonItem,
  IonLabel,
  IonIcon,
} from '@ionic/vue'
import { InsetList } from '@shared/ui/inset-list/index.mobile'
import {
  personOutline,
  atOutline,
  timeOutline,
  calendarNumberOutline,
  cardOutline,
  gridOutline,
  peopleOutline,
  notificationsOutline,
  globeOutline,
  personCircleOutline,
  informationCircleOutline,
} from 'ionicons/icons'

// The Settings hub — a grouped list mirroring the web mobile entry
// (pages/settings/ui/_MobileEntryPage.vue), rebuilt with native Ionic. Items
// whose destination page isn't built yet are rendered disabled so the full
// structure is visible without dead links. `to` gets filled in as the inner
// pages land (Profile, System & region — see the sibling beads tasks).
const { t } = useI18n()

interface SettingsItem {
  key: string
  label: string
  icon: string
  to?: string
}

interface SettingsGroup {
  key: string
  label: string
  items: SettingsItem[]
}

const groups = computed<SettingsGroup[]>(() => [
  {
    key: 'general',
    label: t('settings.nav.groupGeneral'),
    items: [
      {
        key: 'profile',
        label: t('settings.nav.profile'),
        icon: personOutline,
        to: '/settings/profile',
      },
      {
        key: 'contacts',
        label: t('settings.nav.contacts'),
        icon: atOutline,
        to: '/settings/contacts',
      },
      { key: 'workingHours', label: t('settings.nav.workingHours'), icon: timeOutline },
      { key: 'booking', label: t('settings.nav.booking'), icon: calendarNumberOutline },
    ],
  },
  {
    key: 'workspace',
    label: t('settings.nav.groupWorkspace'),
    items: [
      { key: 'services', label: t('settings.nav.services'), icon: gridOutline, to: '/services' },
      {
        key: 'paymentMethods',
        label: t('settings.nav.paymentMethods'),
        icon: cardOutline,
        to: '/settings/payment-types',
      },
      { key: 'clients', label: t('settings.nav.clients'), icon: peopleOutline },
    ],
  },
  {
    key: 'system',
    label: t('settings.nav.groupSystem'),
    items: [
      { key: 'notifications', label: t('settings.nav.notifications'), icon: notificationsOutline },
      {
        key: 'systemRegion',
        label: t('settings.nav.systemRegion'),
        icon: globeOutline,
        to: '/settings/system-region',
      },
      {
        key: 'account',
        label: t('settings.nav.account'),
        icon: personCircleOutline,
        to: '/settings/account',
      },
      { key: 'about', label: t('settings.nav.about'), icon: informationCircleOutline },
    ],
  },
])
</script>

<template>
  <ion-page>
    <ion-header :translucent="true" class="ion-no-border">
      <ion-toolbar>
        <ion-title>{{ $t('nav.settings') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content fullscreen class="se-settings-content">
      <ion-header collapse="condense">
        <ion-toolbar class="ion-background-transparent">
          <ion-title size="large">{{ $t('nav.settings') }}</ion-title>
        </ion-toolbar>
      </ion-header>

      <div class="se-settings-list">
        <inset-list v-for="group in groups" :key="group.key" :header="group.label">
          <ion-item
            v-for="item in group.items"
            :key="item.key"
            :button="Boolean(item.to)"
            :detail="Boolean(item.to)"
            :disabled="!item.to"
            :router-link="item.to"
          >
            <ion-icon slot="start" :icon="item.icon" aria-hidden="true" />
            <ion-label>{{ item.label }}</ion-label>
          </ion-item>
        </inset-list>
      </div>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.ion-background-transparent {
  --background: transparent;
}
.se-settings-list {
  padding-top: 10px;
  padding-bottom: 30px;
}

ion-toolbar {
  --padding-start: 16px;
  --padding-end: 16px;
}
/* The grouped backdrop is applied globally to ion-content
   (app-mobile/styles/main.css); here we only add the vertical rhythm for the
   grouped list. */
</style>
