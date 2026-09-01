<script setup lang="ts">
import { IonApp, IonRouterOutlet } from '@ionic/vue'
</script>

<template>
  <!--
    Ionic shell for the native build. `ion-router-outlet` (not vue-router's
    `<RouterView>`) is what gives the native push/pop page transitions and
    the iOS swipe-to-go-back gesture.
  -->
  <ion-app>
    <ion-router-outlet />
  </ion-app>
</template>
