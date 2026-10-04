<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { IonButton, IonContent, IonIcon, IonSearchbar, IonToolbar } from '@ionic/vue'
import { arrowForwardOutline } from 'ionicons/icons'
import {
  ServiceCategorySegmentMobile,
  ServiceSelectListMobile,
  useServiceSelectFilter,
  type Service,
} from '@entities/service/index.mobile'
import { useFormats } from '@shared/lib/formats'
import { useAppointmentWizardMobile } from '../../model/wizard-mobile-context'
import WizardStepFooterMobile from '../WizardStepFooterMobile.vue'
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
    <ion-toolbar class="wizard-services-step__toolbar">
      <ion-searchbar
        v-model="query"
        :placeholder="t('quickCreate.appointment.services.searchPlaceholder')"
        :debounce="150"
      />
    </ion-toolbar>
    <ion-toolbar v-if="categoryChips.length > 1" class="wizard-services-step__toolbar">
      <service-category-segment-mobile v-model="activeCategory" :chips="categoryChips" />
    </ion-toolbar>
  </wizard-step-header-mobile>

  <ion-content class="ion-padding-vertical">
    <service-select-list-mobile
      :services="filteredServices"
      :selected-ids="state.serviceIds"
      :is-catalog-empty="!wizard.services.value.length"
      @toggle="toggle"
    />
  </ion-content>

  <wizard-step-footer-mobile>
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
  </wizard-step-footer-mobile>
</template>

<style scoped>
.wizard-services-step__toolbar {
  --background: var(--se-surface-page, var(--ion-background-color));
  --min-height: 44px;
}

.wizard-services-step__toolbar ion-searchbar {
  padding-block: 12px 8px;
}
</style>
