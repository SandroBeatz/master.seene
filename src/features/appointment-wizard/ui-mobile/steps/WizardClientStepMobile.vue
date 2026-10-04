<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { IonContent, IonIcon, IonItem, IonLabel, IonSearchbar, IonToolbar } from '@ionic/vue'
import { personAddOutline } from 'ionicons/icons'
import { ClientSelectListMobile, type Client } from '@entities/client/index.mobile'
import { ClientFormMobile } from '@features/client-form/index.mobile'
import { InsetList } from '@shared/ui/inset-list/index.mobile'
import { useAppointmentWizardMobile } from '../../model/wizard-mobile-context'
import WizardStepHeaderMobile from '../WizardStepHeaderMobile.vue'

const { t } = useI18n()
const wizard = useAppointmentWizardMobile()
const query = ref('')
const isClientFormOpen = ref(false)

function select(client: Client) {
  wizard.state.clientId = client.id
  wizard.next(1)
}
</script>

<template>
  <wizard-step-header-mobile :step="1" :title="t('quickCreate.appointment.steps.client')">
    <ion-toolbar class="wizard-client-step__search">
      <ion-searchbar
        v-model="query"
        :placeholder="t('quickCreate.appointment.client.searchPlaceholder')"
        :debounce="150"
      />
    </ion-toolbar>
  </wizard-step-header-mobile>

  <ion-content class="wizard-client-step ion-padding-vertical">
    <inset-list>
      <ion-item button :detail="false" lines="none" @click="isClientFormOpen = true">
        <ion-icon slot="start" :icon="personAddOutline" color="primary" aria-hidden="true" />
        <ion-label color="primary">{{ t('quickCreate.appointment.client.add') }}</ion-label>
      </ion-item>
    </inset-list>

    <client-select-list-mobile
      :clients="wizard.clients.value"
      :model-value="wizard.state.clientId"
      :query="query"
      @select="select"
    />
  </ion-content>

  <client-form-mobile
    v-model:is-open="isClientFormOpen"
    mode="create"
    :presenting-element="wizard.modalEl.value"
    @saved="select"
  />
</template>

<style scoped>
.wizard-client-step__search {
  --background: var(--se-surface-page, var(--ion-background-color));
}

.wizard-client-step__search ion-searchbar {
  padding-block: 4px 8px;
}
</style>
