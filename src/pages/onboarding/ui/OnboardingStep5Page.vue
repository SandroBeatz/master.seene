<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { supabase } from '@shared/lib/supabase'
import { useOnboardingStore } from '@features/onboarding'
import type { DayKey } from '@features/onboarding'

const { t } = useI18n()
const router = useRouter()
const toast = useToast()
const store = useOnboardingStore()

const DAY_KEYS: DayKey[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

const CATEGORIES = [
  'makeup',
  'hair',
  'nails',
  'barber',
  'massage',
  'tattoo_piercing',
  'depilation',
  'cosmetology',
  'brows_lashes',
] as const

const isSubmitting = ref(false)

const enabledDays = computed(() => DAY_KEYS.filter((day) => store.schedule.days[day].enabled))

function validate(): string | null {
  if (store.specializations.length === 0)
    return t('onboarding.step5.validation.missingSpecializations')
  if (
    !store.personal.firstName ||
    !store.personal.lastName ||
    !store.personal.phone ||
    !store.personal.username
  )
    return t('onboarding.step5.validation.missingPersonal')
  if (!store.location.city || !store.location.address || !store.location.zipCode)
    return t('onboarding.step5.validation.missingLocation')
  const badDay = DAY_KEYS.some((d) => {
    const day = store.schedule.days[d]
    return day.enabled && (!day.start || !day.end)
  })
  if (badDay) return t('onboarding.step5.validation.missingScheduleTimes')
  return null
}

async function createProfile() {
  const err = validate()
  if (err) {
    toast.add({ title: err, color: 'error' })
    return
  }

  isSubmitting.value = true
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { error } = await supabase.from('master_profile').insert({
      user_id: user.id,
      ...store.toMasterProfile(),
    })

    if (error) {
      toast.add({
        title: t('onboarding.step5.errorTitle'),
        description: error.message,
        color: 'error',
      })
      return
    }

    const { error: settingsError } = await supabase
      .from('master_settings')
      .upsert({ user_id: user.id, time_format: store.timeFormat }, { onConflict: 'user_id' })
    if (settingsError) console.error('Failed to save settings:', settingsError)

    void router.push('/home')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="w-full space-y-5">
    <div class="flex flex-col items-center text-center gap-2 pt-4 mb-2">
      <h1 class="text-2xl font-bold text-primary">
        {{ $t('onboarding.step5.title') }}
      </h1>
      <p class="text-sm text-muted">
        {{ $t('onboarding.step5.subtitle') }}
      </p>
    </div>

    <!-- Specializations -->
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <span class="text-sm font-semibold text-default">{{
          $t('onboarding.step5.sections.specializations')
        }}</span>
        <UButton
          variant="link"
          color="primary"
          size="xs"
          type="button"
          @click="router.push('/onboarding/step1')"
        >
          {{ $t('onboarding.step5.edit') }}
        </UButton>
      </div>
      <div class="flex flex-wrap gap-1.5">
        <UBadge v-for="key in store.specializations" :key="key" color="primary" variant="soft">
          {{ $t(`onboarding.step1.categories.${key}`) }}
        </UBadge>
        <span v-if="store.specializations.length === 0" class="text-sm text-muted italic">—</span>
      </div>
    </div>

    <USeparator />

    <!-- Personal info -->
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <span class="text-sm font-semibold text-default">{{
          $t('onboarding.step5.sections.personal')
        }}</span>
        <UButton
          variant="link"
          color="primary"
          size="xs"
          type="button"
          @click="router.push('/onboarding/step2')"
        >
          {{ $t('onboarding.step5.edit') }}
        </UButton>
      </div>
      <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <span class="text-muted">{{ $t('onboarding.step5.personal.name') }}</span>
        <span>{{ store.personal.firstName }} {{ store.personal.lastName }}</span>
        <span class="text-muted">{{ $t('onboarding.step5.personal.phone') }}</span>
        <span>{{ store.personal.phone || '—' }}</span>
        <span class="text-muted">{{ $t('onboarding.step5.personal.link') }}</span>
        <span class="text-primary">seene.app/{{ store.personal.username || '…' }}</span>
      </div>
    </div>

    <USeparator />

    <!-- Location -->
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <span class="text-sm font-semibold text-default">{{
          $t('onboarding.step5.sections.location')
        }}</span>
        <UButton
          variant="link"
          color="primary"
          size="xs"
          type="button"
          @click="router.push('/onboarding/step3')"
        >
          {{ $t('onboarding.step5.edit') }}
        </UButton>
      </div>
      <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <span class="text-muted">{{ $t('onboarding.step5.location.address') }}</span>
        <span>
          {{
            [
              store.location.address,
              store.location.houseNumber,
              store.location.city,
              store.location.zipCode,
              store.location.country,
            ]
              .filter(Boolean)
              .join(', ') || '—'
          }}
        </span>
        <span class="text-muted">{{ $t('onboarding.step5.location.worksAtPlace') }}</span>
        <span>{{
          store.location.worksAtPlace
            ? $t('onboarding.step5.location.yes')
            : $t('onboarding.step5.location.no')
        }}</span>
        <span class="text-muted">{{ $t('onboarding.step5.location.canTravel') }}</span>
        <span>{{
          store.location.canTravel
            ? $t('onboarding.step5.location.yes')
            : $t('onboarding.step5.location.no')
        }}</span>
      </div>
    </div>

    <USeparator />

    <!-- Schedule -->
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <span class="text-sm font-semibold text-default">{{
          $t('onboarding.step5.sections.schedule')
        }}</span>
        <UButton
          variant="link"
          color="primary"
          size="xs"
          type="button"
          @click="router.push('/onboarding/step4')"
        >
          {{ $t('onboarding.step5.edit') }}
        </UButton>
      </div>
      <p class="text-xs text-muted">
        {{ $t('onboarding.step5.schedule.timezone') }}: {{ store.schedule.timezone }}
      </p>
      <div v-if="enabledDays.length > 0" class="space-y-1">
        <div v-for="day in enabledDays" :key="day" class="text-sm flex flex-wrap gap-x-3 gap-y-0.5">
          <span class="font-medium capitalize w-24">{{ $t(`onboarding.step4.days.${day}`) }}</span>
          <span class="text-muted"
            >{{ $f.time(store.schedule.days[day].start) }} — {{ $f.time(store.schedule.days[day].end) }}</span
          >
          <span v-for="(brk, i) in store.schedule.days[day].breaks" :key="i" class="text-muted">
            · {{ $t('onboarding.step5.schedule.break') }}: {{ $f.time(brk.start) }}–{{ $f.time(brk.end) }}
          </span>
        </div>
      </div>
      <p v-else class="text-sm text-muted italic">—</p>
    </div>

    <!-- Actions -->
    <div class="flex justify-between gap-3 pt-2">
      <UButton
        type="button"
        color="neutral"
        variant="subtle"
        @click="router.push('/onboarding/step4')"
      >
        {{ $t('onboarding.step5.back') }}
      </UButton>
      <UButton color="primary" :loading="isSubmitting" @click="createProfile">
        {{ $t('onboarding.step5.createProfile') }}
      </UButton>
    </div>
  </div>
</template>
