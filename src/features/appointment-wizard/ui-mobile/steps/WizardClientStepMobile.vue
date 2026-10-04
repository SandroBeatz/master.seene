<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { IonContent, IonIcon, IonItem, IonLabel } from '@ionic/vue'
import { personAddOutline } from 'ionicons/icons'
import { ClientSelectListMobile, type Client } from '@entities/client/index.mobile'
import { ClientFormMobile } from '@features/client-form/index.mobile'
import { InsetList } from '@shared/ui/inset-list/index.mobile'
import { useAppointmentWizardMobile } from '../../model/wizard-mobile-context'
import WizardSearchbarMobile from '../WizardSearchbarMobile.vue'
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
    <wizard-searchbar-mobile
      v-model="query"
      :placeholder="t('quickCreate.appointment.client.searchPlaceholder')"
    />
  </wizard-step-header-mobile>

  <ion-content class="wizard-client-step">
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
.wizard-client-step {
  --padding-top: 24px;
  --padding-bottom: 24px;
}
</style>
