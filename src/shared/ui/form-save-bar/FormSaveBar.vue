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
  <div
    v-if="dirty"
    aria-hidden="true"
    class="h-[calc(var(--safe-area-bottom)+5rem)] shrink-0 md:hidden"
  />

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
          class="flex w-full max-w-lg items-center gap-2 rounded-full bg-zinc-900 p-2 pl-3 shadow-2xl ring-1 ring-white/10 md:w-auto md:max-w-none md:gap-4 md:py-2 md:pl-5 md:pr-2 dark:bg-zinc-800"
        >
          <div class="flex min-w-0 flex-1 items-center gap-2 md:flex-none md:gap-2.5">
            <span class="size-2 shrink-0 rounded-full bg-amber-400" />
            <span class="truncate text-xs font-medium text-white md:hidden">
              {{ t('common.unsaved') }}
            </span>
            <span class="hidden text-sm font-medium whitespace-nowrap text-white md:inline">
              {{ message ?? t('common.unsavedChanges') }}
            </span>
          </div>
          <div class="flex shrink-0 items-center gap-1.5 md:gap-2">
            <UButton
              square
              icon="i-lucide-undo-2"
              variant="ghost"
              size="sm"
              class="text-zinc-400 hover:bg-white/10 hover:text-white md:hidden"
              :disabled="saving"
              :aria-label="discardLabel ?? t('common.discard')"
              @click="emit('discard')"
            />
            <UButton
              variant="ghost"
              size="md"
              class="hidden text-zinc-400 hover:bg-white/10 hover:text-white md:inline-flex"
              :disabled="saving"
              @click="emit('discard')"
            >
              {{ discardLabel ?? t('common.discard') }}
            </UButton>
            <UButton
              color="neutral"
              variant="solid"
              size="md"
              :label="saving ? t('common.saving') : (saveLabel ?? t('common.saveChanges'))"
              :loading="saving"
              :ui="{
                base: 'h-8 w-[7.5rem] shrink-0 justify-center rounded-full bg-white text-zinc-900 hover:bg-zinc-100 disabled:bg-white disabled:text-zinc-900 disabled:opacity-100 aria-disabled:bg-white aria-disabled:text-zinc-900 aria-disabled:opacity-100 md:h-9 md:w-40',
                label: 'text-xs md:text-base',
                leadingIcon: 'text-zinc-900',
              }"
              @click="emit('save')"
            />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
