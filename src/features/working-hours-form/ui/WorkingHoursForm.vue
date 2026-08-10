<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { createReusableTemplate } from '@vueuse/core'
import { useIsMobile } from '@shared/lib/viewport'
import { useSessionStore } from '@entities/session'
import { useMasterProfileQuery, useUpdateMasterScheduleMutation } from '@entities/master'
import type { MasterScheduleDayKey } from '@entities/master'
import { useDirtyForm } from '@shared/lib/forms'
import { FormSaveBar, Typography } from '@shared/ui'
import { useWorkingHours } from '../model/use-working-hours'
import WorkingHoursDay from './WorkingHoursDay.vue'

defineOptions({ name: 'WorkingHoursForm' })

const { t } = useI18n()
const toast = useToast()
const sessionStore = useSessionStore()

const userId = computed(() => sessionStore.session?.user.id ?? '')

const { data: profileData } = useMasterProfileQuery(userId)
const updateMutation = useUpdateMasterScheduleMutation(userId)

const {
  state,
  dayViews,
  isValid,
  seed,
  setEnabled,
  setStart,
  setEnd,
  setBreak,
  addBreak,
  removeBreak,
  copyDayToAll,
  toStored,
} = useWorkingHours()

const { isDirty, isSaving, reset, discard } = useDirtyForm(state, {
  message: t('common.unsavedChangesConfirm'),
})

watch(
  profileData,
  (profile) => {
    if (!profile || isDirty.value) return
    seed(profile.schedule)
    reset()
  },
  { immediate: true },
)

const canSave = computed(() => isDirty.value && isValid.value)

function onCopyToAll(key: MasterScheduleDayKey) {
  copyDayToAll(key)
  toast.add({
    title: t('settings.workingHours.copiedToAll', { day: t(`settings.workingHours.days.${key}`) }),
    color: 'success',
  })
}

async function onSave() {
  if (!canSave.value) return
  isSaving.value = true
  try {
    await updateMutation.mutateAsync(toStored())
    reset()
    toast.add({ title: t('settings.workingHours.saveSuccess'), color: 'success' })
  } catch {
    toast.add({ title: t('settings.workingHours.saveError'), color: 'error' })
  } finally {
    isSaving.value = false
  }
}

function onDiscard() {
  discard()
}

const hostUI = {
  root: 'rounded-xl shadow-panel ring-0 divide-y-0',
  header: 'pb-0',
}

const isMobile = useIsMobile()

// Reused across the two layouts so the form markup isn't duplicated: desktop
// wraps it in a UCard, mobile drops the card chrome (the push header already
// provides a titled surface) and renders flush inside the page's p-4 gutter.
const [DefineHeader, ReuseHeader] = createReusableTemplate()
const [DefineBody, ReuseBody] = createReusableTemplate()
</script>

<template>
  <DefineHeader>
    <div class="flex flex-col gap-1">
      <Typography variant="h5" class="text-highlighted font-bold">
        {{ t('settings.workingHours.title') }}
      </Typography>
      <Typography variant="caption" class="text-muted">
        {{ t('settings.workingHours.subtitle') }}
      </Typography>
    </div>
  </DefineHeader>

  <DefineBody>
    <div class="divide-y divide-default">
      <WorkingHoursDay
        v-for="view in dayViews"
        :key="view.key"
        :day-key="view.key"
        :day="view.day"
        :errors="view.errors"
        :dirty="view.dirty"
        @toggle="setEnabled(view.key, $event)"
        @update:start="setStart(view.key, $event)"
        @update:end="setEnd(view.key, $event)"
        @update:break="(index, field, value) => setBreak(view.key, index, field, value)"
        @add-break="addBreak(view.key)"
        @remove-break="removeBreak(view.key, $event)"
        @copy-to-all="onCopyToAll(view.key)"
      />
    </div>

    <FormSaveBar :dirty="canSave" :saving="isSaving" @save="onSave" @discard="onDiscard" />
  </DefineBody>

  <!-- Desktop: card surface. Mobile: no card — flush content under the push header. -->
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
