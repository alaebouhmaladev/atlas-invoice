<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-amber-500 selection:text-slate-900 flex">
    <!-- Unauthenticated layout for login page -->
    <template v-if="isLoginPage">
      <main class="w-full">
        <slot />
      </main>
    </template>

    <!-- Authenticated CRM layout -->
    <template v-else>
      <AppSidebar
        :mobile-open="mobileSidebarOpen"
        @close-mobile="mobileSidebarOpen = false"
      />

      <div class="flex-1 flex flex-col min-w-0 lg:pl-64">
        <AppHeader
          :title="pageTitle"
          @toggle-mobile="mobileSidebarOpen = !mobileSidebarOpen"
        />

        <main class="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
          <slot />
        </main>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import AppSidebar from '~/components/layout/AppSidebar.vue'
import AppHeader from '~/components/layout/AppHeader.vue'

const route = useRoute()
const mobileSidebarOpen = ref(false)

const isLoginPage = computed(() => route.path === '/login')

const pageTitle = computed(() => {
  if (route.path === '/') return 'Tableau de bord'
  if (route.path.startsWith('/clients')) {
    if (route.path === '/clients/new') return 'Nouveau client'
    if (route.path.endsWith('/edit')) return 'Modifier le client'
    if (route.params.id) return 'Fiche client'
    return 'Gestion des clients'
  }
  return 'Atlas Bites Facturation'
})

// Close mobile sidebar on route change
watch(
  () => route.path,
  () => {
    mobileSidebarOpen.value = false
  }
)
</script>
