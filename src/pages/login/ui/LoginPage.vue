<script setup lang="ts">
import { LoginForm } from '@features/auth-login'
import { AuthorizationLayout } from '@widgets/authorization-layout'
</script>

<template>
  <AuthorizationLayout>
    <template #default>
      <LoginForm />
    </template>
  </AuthorizationLayout>
</template>
