<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { IonAvatar, IonButton, IonHeader, IonIcon, IonToolbar } from '@ionic/vue'
import { notificationsOutline } from 'ionicons/icons'
import { useSessionStore } from '@entities/session'
import { getHomeGreetingPeriod, getHomeUserInitials, getHomeUserName } from '../model/home-header'

const { t } = useI18n()
const sessionStore = useSessionStore()

const identity = computed(() => ({
  firstName: sessionStore.profile?.first_name,
  lastName: sessionStore.profile?.last_name,
  email: sessionStore.session?.user.email,
}))

const userName = computed(() => getHomeUserName(identity.value, t('home.userFallback')))
const userInitials = computed(() => getHomeUserInitials(identity.value))
const avatarSrc = computed(
  () =>
    sessionStore.profile?.avatar_url ??
    sessionStore.session?.user.user_metadata?.avatar_url ??
    undefined,
)
const greeting = computed(() => {
  const period = getHomeGreetingPeriod(new Date().getHours())
  return t(`home.greeting.${period}`)
})
</script>

<template>
  <ion-header class="home-header ion-no-border">
    <ion-toolbar>
      <div class="home-header__content">
        <div class="home-header__user">
          <ion-avatar class="home-header__avatar">
            <img v-if="avatarSrc" :src="avatarSrc" :alt="userName" />
            <span v-else aria-hidden="true">{{ userInitials }}</span>
          </ion-avatar>

          <div class="home-header__copy">
            <p class="home-header__greeting">{{ greeting }}</p>
            <h1 class="home-header__name">{{ userName }}</h1>
          </div>
        </div>

        <ion-button
          class="home-header__notifications"
          fill="clear"
          shape="round"
          :aria-label="t('nav.notifications')"
        >
          <ion-icon slot="icon-only" :icon="notificationsOutline" aria-hidden="true" />
        </ion-button>
      </div>
    </ion-toolbar>
  </ion-header>
</template>

<style scoped>
.home-header ion-toolbar {
  --background: var(--se-surface-page, var(--ion-background-color));
  --min-height: 72px;
  --padding-start: max(16px, var(--safe-area-left));
  --padding-end: max(8px, var(--safe-area-right));
  --border-width: 0;
}

.home-header__content,
.home-header__user {
  display: flex;
  align-items: center;
  min-width: 0;
}

.home-header__content {
  justify-content: space-between;
  gap: 8px;
  width: 100%;
}

.home-header__user {
  flex: 1 1 auto;
  gap: 12px;
}

.home-header__avatar {
  display: flex;
  flex: 0 0 44px;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: var(--se-avatar-surface);
  color: var(--se-avatar-foreground);
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.home-header__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.home-header__copy {
  min-width: 0;
}

.home-header__greeting,
.home-header__name {
  overflow: hidden;
  margin: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.home-header__greeting {
  color: var(--ion-color-medium);
  font-size: 0.75rem;
  line-height: 1.25;
}

.home-header__name {
  margin-top: 2px;
  color: var(--ion-text-color);
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1.25;
}

.home-header__notifications {
  --color: var(--ion-text-color);

  flex: 0 0 auto;
  margin: 0;
  font-size: 1.45rem;
}
</style>
