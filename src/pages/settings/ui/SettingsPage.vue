<script setup lang="ts">
const navItems = [
  { label: 'Home', icon: 'i-lucide-home', to: '/' },
  { label: 'Calendar', icon: 'i-lucide-calendar', to: '/calendar' },
  { label: 'Clients', icon: 'i-lucide-users', to: '/clients' },
  { label: 'Services', icon: 'i-lucide-grid-2x2-plus', to: '/services' },
]
</script>

<template>
  <UTheme
    :ui="{
      page: {
        root: 'px-12 w-full max-w-7xl mx-auto',
      },
      pageHeader: {
        root: 'border-none',
      },
    }"
  >
    <UPage as="main">
      <UPageHeader
        title="Settings"
        description="Welcome back to your dashboard. Here’s what’s happening with your projects today."
      />
      <UPageBody>
        <div class="grid grid-cols-8 gap-4">
          <div class="col-span-2">
            <UPageCard :ui="{ container: 'p-2 sm:p-4' }" variant="soft">
              <UNavigationMenu variant="pill" orientation="vertical" :items="navItems" />
            </UPageCard>
          </div>
          <div class="col-span-6">
            <UPageCard variant="soft">
              Lorem ipsum dolor sit amet, consectetur adipisicing elit. Accusantium commodi, delectus distinctio dolor eos ex exercitationem, fuga ipsam iusto officia optio possimus quae quia, reprehenderit rerum similique sit? Ab accusamus aliquid architecto asperiores, aut consequuntur debitis delectus deserunt distinctio dolor, eius enim facere in labore minus nobis obcaecati odit perferendis provident quae quod recusandae, sed voluptas? Atque laudantium reiciendis sed voluptate? Accusamus adipisci aliquam amet, aspernatur at commodi ducimus error explicabo fugit ipsam laborum magni maiores modi necessitatibus nihil, nostrum numquam odio porro quas quasi qui quis quisquam quos rem saepe sequi temporibus unde? A consequuntur delectus eius exercitationem illum maiores nisi officia vitae voluptatum. Adipisci aliquam amet corporis culpa error fuga nobis quod repellat, saepe sapiente vel velit. Aliquam aliquid, aperiam assumenda cum cumque facere id impedit optio pariatur perspiciatis, porro repellat voluptate voluptates. Ab alias aliquam blanditiis, deleniti doloribus fugit inventore maxime minima odio odit possimus quas quasi ratione reiciendis repellat repudiandae vero vitae voluptates. Accusantium adipisci aliquam aliquid amet asperiores aut delectus deserunt fugiat harum illum inventore ipsa iste laboriosam maxime natus nostrum pariatur quae quaerat qui quibusdam quidem repellat, repudiandae similique velit vero voluptatibus, voluptatum. Quibusdam.
            </UPageCard>
          </div>
        </div>
      </UPageBody>
    </UPage>
  </UTheme>
</template>
