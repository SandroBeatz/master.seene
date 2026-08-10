<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useMobilePushActionsList } from '../model/push-actions'

defineProps<{
  title: string
  scrolled?: boolean
}>()

const emit = defineEmits<{ back: [] }>()
const { t } = useI18n()

// Actions the active pushed page registered (e.g. a round "add" button).
const actions = useMobilePushActionsList()
</script>

<template>
  <header
    class="mobile-push-header sticky top-0 z-30 shrink-0 px-3 pb-3"
    :class="{ 'mobile-push-header--scrolled': scrolled }"
    style="padding-top: calc(env(safe-area-inset-top) + 0.5rem)"
  >
    <div
      class="relative z-10 grid h-11 grid-cols-[minmax(0,1fr)_minmax(0,auto)_minmax(0,1fr)] items-center"
    >
      <div class="flex min-w-0 justify-self-start">
        <UButton
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="ghost"
          size="lg"
          square
          :aria-label="t('common.back')"
          @click="emit('back')"
        />
      </div>

      <Transition name="mobile-push-title">
        <h1
          v-if="scrolled"
          class="col-start-2 max-w-[54vw] truncate px-2 text-center text-base font-semibold text-highlighted"
        >
          {{ title }}
        </h1>
      </Transition>

      <div class="col-start-3 flex min-w-0 items-center justify-self-end gap-1">
        <slot name="actions" />
        <!-- Actions registered by the active pushed page (see push-actions.ts). -->
        <UButton
          v-for="(action, i) in actions"
          :key="i"
          :icon="action.icon"
          :color="action.color ?? 'primary'"
          square
          :aria-label="action.ariaLabel"
          @click="action.onClick"
        />
      </div>
    </div>
  </header>
</template>

<style scoped>
.mobile-push-header::before {
  position: absolute;
  inset: 0 0 -1.25rem;
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, var(--app-canvas) 96%, transparent) 0%,
    color-mix(in srgb, var(--app-canvas) 72%, transparent) 58%,
    transparent 100%
  );
  opacity: 0;
  content: '';
  pointer-events: none;
  backdrop-filter: blur(12px) saturate(1.08);
  -webkit-backdrop-filter: blur(12px) saturate(1.08);
  mask-image: linear-gradient(to bottom, black 0%, black 48%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, black 0%, black 48%, transparent 100%);
  transition: opacity 180ms ease;
}

.mobile-push-header--scrolled::before {
  opacity: 1;
}

.mobile-push-title-enter-active,
.mobile-push-title-leave-active {
  transition:
    opacity 160ms ease,
    transform 160ms ease;
}

.mobile-push-title-enter-from,
.mobile-push-title-leave-to {
  opacity: 0;
  transform: translateY(0.25rem);
}

@media (prefers-reduced-motion: reduce) {
  .mobile-push-header::before,
  .mobile-push-title-enter-active,
  .mobile-push-title-leave-active {
    transition: none;
  }
}
</style>
