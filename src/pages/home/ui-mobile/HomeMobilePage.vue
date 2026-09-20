<script setup lang="ts">
import { IonContent, IonPage } from '@ionic/vue'
import { HomeHeaderMobile } from '@widgets/home/index.mobile'
</script>

<template>
  <ion-page>
    <home-header-mobile />
    <ion-content :fullscreen="true" />
  </ion-page>
</template>
