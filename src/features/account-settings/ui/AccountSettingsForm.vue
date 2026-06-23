<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Typography } from '@shared/ui'
import AccountUpgradeCard from './AccountUpgradeCard.vue'
import AccountEmailRow from './AccountEmailRow.vue'
import AccountPasswordRow from './AccountPasswordRow.vue'
import AccountSignOutRow from './AccountSignOutRow.vue'
import AccountDeleteSection from './AccountDeleteSection.vue'

defineOptions({ name: 'AccountSettingsForm' })

const { t } = useI18n()

const hostUI = {
  root: 'rounded-xl shadow-panel ring-0 divide-y-0',
  header: 'pb-0',
}
</script>

<template>
  <UCard :ui="hostUI">
    <template #header>
      <div class="flex flex-col gap-1">
        <Typography variant="h5" class="text-highlighted font-bold">
          {{ t('settings.account.title') }}
        </Typography>
        <Typography variant="caption" class="text-muted">
          {{ t('settings.account.subtitle') }}
        </Typography>
      </div>
    </template>

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
  </UCard>
</template>
