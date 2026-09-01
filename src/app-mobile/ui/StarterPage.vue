<script setup lang="ts">
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/vue'
</script>

<template>
  <!--
    TEMPORARY environment placeholder. Its only job is to give the router a
    valid `ion-page` so the Ionic shell mounts and both builds can be verified.
    Replaced by the real screens (pages/*/ui-mobile) in the next step.
  -->
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Seene</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <p class="text-lg font-medium">Ionic shell is live 🎉</p>
    </ion-content>
  </ion-page>
</template>
