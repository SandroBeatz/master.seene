<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { IonButton, IonContent, IonIcon, IonToolbar } from '@ionic/vue'
import { arrowForwardOutline } from 'ionicons/icons'
import {
  ServiceCategorySegmentMobile,
  ServiceSelectListMobile,
  useServiceSelectFilter,
  type Service,
} from '@entities/service/index.mobile'
import { useFormats } from '@shared/lib/formats'
import { useAppointmentWizardMobile } from '../../model/wizard-mobile-context'
import { ActionFooterMobile } from '@shared/ui/action-footer/index.mobile'
import WizardSearchbarMobile from '../WizardSearchbarMobile.vue'
import WizardStepHeaderMobile from '../WizardStepHeaderMobile.vue'

const { t } = useI18n()
const formats = useFormats()
const wizard = useAppointmentWizardMobile()
const { state } = wizard

const { query, activeCategory, categoryChips, filteredServices } = useServiceSelectFilter(
  wizard.services,
  computed(() => state.serviceIds),
  computed(() => t('services.filterAll')),
)

function toggle(service: Service) {
  const selected = state.serviceIds.includes(service.id)
  if (!service.is_active && !selected) return
  state.serviceIds = selected
    ? state.serviceIds.filter((id) => id !== service.id)
    : [...state.serviceIds, service.id]
}
</script>

<template>
  <wizard-step-header-mobile :step="2" :title="t('quickCreate.appointment.steps.services')">
    <wizard-searchbar-mobile
      v-model="query"
      :placeholder="t('quickCreate.appointment.services.searchPlaceholder')"
    />
    <ion-toolbar v-if="categoryChips.length > 1" class="wizard-services-step__toolbar">
      <service-category-segment-mobile v-model="activeCategory" :chips="categoryChips" />
    </ion-toolbar>
  </wizard-step-header-mobile>

  <ion-content class="wizard-services-step">
    <service-select-list-mobile
      :services="filteredServices"
      :selected-ids="state.serviceIds"
      :is-catalog-empty="!wizard.services.value.length"
      @toggle="toggle"
    />
  </ion-content>

  <action-footer-mobile>
    <span>{{ t('quickCreate.appointment.footer.services', state.serviceIds.length) }}</span>
    <strong v-if="state.serviceIds.length">
      {{ formats.duration(wizard.totalDuration.value) }} ·
      {{ formats.price(wizard.effectivePrice.value) }}
    </strong>
    <template #action>
      <ion-button :disabled="!state.serviceIds.length" @click="wizard.next(2)">
        {{ t('quickCreate.appointment.next') }}
        <ion-icon slot="end" :icon="arrowForwardOutline" aria-hidden="true" />
      </ion-button>
    </template>
  </action-footer-mobile>
</template>

<style scoped>
.wizard-services-step__toolbar {
  --background: var(--se-surface-page, var(--ion-background-color));
  --min-height: 44px;
  --padding-start: 0;
  --padding-end: 0;
  --padding-top: 0;
  --padding-bottom: 4px;
}

.wizard-services-step {
  --padding-top: 16px;
  --padding-bottom: 24px;
}
</style>
