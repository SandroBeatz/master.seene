<script setup lang="ts">
import { useI18n } from 'vue-i18n'

defineOptions({ name: 'FormSaveBar' })

withDefaults(
  defineProps<{
    dirty: boolean
    saving?: boolean
    message?: string
    saveLabel?: string
    discardLabel?: string
  }>(),
  { saving: false },
)

const emit = defineEmits<{ save: []; discard: [] }>()

const { t } = useI18n()
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-4"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-4"
    >
      <div
        v-if="dirty"
        class="fixed inset-x-0 bottom-[calc(var(--safe-area-bottom)+1rem)] z-50 flex justify-center px-3 md:bottom-6 md:px-4"
        role="region"
        :aria-label="message ?? t('common.unsavedChanges')"
      >
        <div
          class="flex w-full max-w-lg flex-col gap-3 rounded-lg bg-zinc-900 p-3 shadow-2xl ring-1 ring-white/10 md:w-auto md:max-w-none md:flex-row md:items-center md:gap-4 md:rounded-full md:py-2 md:pl-5 md:pr-2 dark:bg-zinc-800"
        >
          <div class="flex min-w-0 items-center gap-2.5 px-1 md:px-0">
            <span class="size-2 shrink-0 rounded-full bg-amber-400" />
            <span class="text-sm font-medium text-white md:whitespace-nowrap">
              {{ message ?? t('common.unsavedChanges') }}
            </span>
          </div>
          <div class="grid w-full grid-cols-2 gap-2 md:flex md:w-auto md:items-center">
            <UButton
              variant="ghost"
              size="md"
              class="w-full justify-center text-sm text-zinc-400 hover:bg-white/10 hover:text-white md:w-auto md:text-base"
              :disabled="saving"
              @click="emit('discard')"
            >
              {{ discardLabel ?? t('common.discard') }}
            </UButton>
            <UButton
              size="md"
              :loading="saving"
              class="w-full justify-center rounded-full bg-white text-sm text-zinc-900 hover:bg-zinc-100 md:w-auto md:text-base"
              @click="emit('save')"
            >
              {{ saveLabel ?? t('common.saveChanges') }}
            </UButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
