<template>
  <div class="min-h-screen bg-canvas text-main font-sans antialiased flex flex-col justify-center p-0 sm:p-3 md:p-5 transition-colors">
    <!-- Global Toast Container -->
    <NotificationToastContainer />

    <!-- Unauthenticated layout for login page -->
    <template v-if="isLoginPage">
      <main class="w-full">
        <slot />
      </main>
    </template>

    <!-- Authenticated 4-Layer Shell Architecture -->
    <template v-else>
      <div class="w-full max-w-[1920px] mx-auto min-h-[calc(100vh-2.5rem)] bg-shell border border-custom rounded-shell shadow-soft flex overflow-hidden transition-colors relative">
        <!-- Mobile Sidebar Drawer Overlay -->
        <div
          v-if="mobileSidebarOpen"
          @click="mobileSidebarOpen = false"
          class="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
        ></div>

        <!-- Layer 1: Compact Primary Icon Rail (Desktop) -->
        <AppIconRail
          :selected-module="activeModule"
          @select-module="handleSelectModule"
          class="hidden lg:flex"
        />

        <!-- Layer 2: Contextual Sub-Navigation Sidebar (Desktop & Mobile Drawer) -->
        <AppContextSidebar
          :selected-module="activeModule"
          class="hidden lg:flex"
          :class="mobileSidebarOpen ? '!flex fixed left-0 top-0 bottom-0 z-50 w-64 shadow-2xl !bg-sidebar' : ''"
        />

        <!-- Layer 3 & 4: Workspace Column (Top Bar + Main Workspace Surface) -->
        <div class="flex-1 flex flex-col min-w-0 bg-shell">
          <!-- Layer 3: Shell Top Header Bar -->
          <AppTopBar
            @toggle-mobile="mobileSidebarOpen = !mobileSidebarOpen"
          />

          <!-- Layer 4: Large Rounded Main Workspace Surface -->
          <main class="flex-1 p-4 sm:p-6 md:p-8 m-3 sm:m-4 md:m-5 bg-workspace border border-custom rounded-workspace shadow-sm overflow-y-auto transition-colors">
            <slot />
          </main>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useHead, navigateTo } from '#imports'
import AppIconRail from '~/components/layout/AppIconRail.vue'
import AppContextSidebar from '~/components/layout/AppContextSidebar.vue'
import AppTopBar from '~/components/layout/AppTopBar.vue'
import NotificationToastContainer from '~/components/ui/NotificationToastContainer.vue'

const route = useRoute()
const mobileSidebarOpen = ref(false)

const isLoginPage = computed(() => route.path === '/login' || route.path === '/connexion')

// Active Module Detection based on current route path
const activeModule = computed(() => {
  const p = route.path
  if (p.startsWith('/clients')) return 'crm'
  if (p.startsWith('/devis') || p.startsWith('/factures')) return 'facturation'
  if (p.startsWith('/rh')) return 'rh'
  if (p.startsWith('/utilisateurs') || p.startsWith('/parametres')) return 'admin'
  return 'pilotage'
})

function handleSelectModule(moduleId: string) {
  const defaultRoutes: Record<string, string> = {
    pilotage: '/',
    crm: '/clients',
    facturation: '/devis',
    rh: '/rh',
    admin: '/parametres'
  }
  const target = defaultRoutes[moduleId] || '/'
  navigateTo(target)
}

useHead({
  titleTemplate: (chunk) => {
    if (!chunk || chunk === 'Atlas CRM') return 'Atlas CRM'
    return `Atlas CRM — ${chunk}`
  }
})

// Close mobile sidebar on route change
watch(
  () => route.path,
  () => {
    mobileSidebarOpen.value = false
  }
)
</script>
