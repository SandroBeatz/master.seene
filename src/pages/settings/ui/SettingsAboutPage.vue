<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { createReusableTemplate } from '@vueuse/core'
import { useIsMobile } from '@shared/lib/viewport'
import { Typography } from '@shared/ui'

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
        {{ t('settings.about.title') }}
      </Typography>
      <Typography variant="caption" class="text-muted">
        {{ t('settings.about.description') }}
      </Typography>
    </div>
  </DefineHeader>

  <DefineBody>
    <p class="text-sm text-muted">{{ t('settings.about.version') }} 1.0.0</p>
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
