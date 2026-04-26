<script setup lang="ts">
import { RegisterForm } from '@features/auth-register'
import { AuthorizationLayout } from '@widgets/authorization-layout'
</script>

<template>
  <AuthorizationLayout>
    <template #default>
      <RegisterForm />
    </template>
  </AuthorizationLayout>
</template>
