<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { createReusableTemplate } from '@vueuse/core'
import { useIsMobile } from '@shared/lib/viewport'
import { Typography } from '@shared/ui'
import AccountUpgradeCard from './AccountUpgradeCard.vue'
import AccountEmailRow from './AccountEmailRow.vue'
import AccountPasswordRow from './AccountPasswordRow.vue'
import AccountSignOutRow from './AccountSignOutRow.vue'
import AccountDeleteSection from './AccountDeleteSection.vue'

defineOptions({ name: 'AccountSettingsForm' })

const { t } = useI18n()
const isMobile = useIsMobile()

const [DefineHeader, ReuseHeader] = createReusableTemplate()
const [DefineBody, ReuseBody] = createReusableTemplate()

const hostUI = {
  root: 'rounded-xl shadow-panel ring-0 divide-y-0',
  header: 'pb-0',
}
</script>

<template>
  <DefineHeader>
    <div class="flex flex-col gap-1">
      <Typography variant="h4" class="text-highlighted font-bold">
        {{ t('settings.account.title') }}
      </Typography>
      <Typography variant="caption" class="text-muted">
        {{ t('settings.account.subtitle') }}
      </Typography>
    </div>
  </DefineHeader>

  <DefineBody>
    <div class="flex flex-col gap-6">
      <!-- Upgrade banner (dark card) -->
      <AccountUpgradeCard />

      <!-- Security -->
      <div>
        <span class="text-xs font-semibold uppercase tracking-wide text-muted">
          {{ t('settings.account.securityLabel') }}
        </span>
        <div class="divide-y divide-default">
          <AccountEmailRow />
          <AccountPasswordRow />
          <AccountSignOutRow />
        </div>
      </div>

      <!-- Danger zone -->
      <div>
        <span class="text-xs font-semibold uppercase tracking-wide text-muted">
          {{ t('settings.account.dangerZoneLabel') }}
        </span>
        <div class="pt-2">
          <AccountDeleteSection />
        </div>
      </div>
    </div>
  </DefineBody>

  <UCard v-if="!isMobile" :ui="hostUI">
    <template #header>
      <ReuseHeader />
    </template>
    <ReuseBody />
  </UCard>

  <div v-else class="flex flex-col gap-4">
    <ReuseHeader />
    <ReuseBody />
  </div>
</template>
