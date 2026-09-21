<script setup lang="ts">
import { IonContent, IonPage } from '@ionic/vue'
import { HomeActionsMobile, HomeHeaderMobile, HomeOverviewMobile } from '@widgets/home/index.mobile'
</script>

<template>
  <ion-page>
    <home-header-mobile />
    <ion-content :fullscreen="true">
      <main class="home-content">
        <home-overview-mobile />
        <home-actions-mobile />
      </main>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.home-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 12px 14px calc(14px + var(--safe-area-bottom, 0px));
}
</style>
