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
        class="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"
        role="region"
        :aria-label="message ?? t('common.unsavedChanges')"
      >
        <div
          class="flex items-center gap-4 rounded-full bg-zinc-900 py-2 pl-5 pr-2 shadow-2xl ring-1 ring-white/10 dark:bg-zinc-800"
        >
          <div class="flex items-center gap-2.5">
            <span class="size-2 shrink-0 rounded-full bg-amber-400" />
            <span class="text-sm font-medium text-white whitespace-nowrap">
              {{ message ?? t('common.unsavedChanges') }}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <UButton
              variant="ghost"
              size="md"
              class="text-zinc-400 hover:bg-white/10 hover:text-white"
              :disabled="saving"
              @click="emit('discard')"
            >
              {{ discardLabel ?? t('common.discard') }}
            </UButton>
            <UButton
              size="md"
              :loading="saving"
              class="rounded-full bg-white text-zinc-900 hover:bg-zinc-100"
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
