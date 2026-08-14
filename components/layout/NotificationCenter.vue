<template>
  <div class="relative" ref="containerRef">
    <!-- Bell Icon Trigger -->
    <button
      @click="toggleDropdown"
      class="relative p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 rounded-xl transition-all focus:outline-none cursor-pointer"
      aria-label="Centre de notifications"
    >
      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>

      <!-- Unread Count Badge -->
      <span
        v-if="unreadCount > 0"
        class="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-amber-500 text-slate-950 font-extrabold text-[10px] rounded-full flex items-center justify-center shadow-lg shadow-amber-500/30 animate-pulse"
      >
        {{ unreadCount > 99 ? '99+' : unreadCount }}
      </span>
    </button>

    <!-- Dropdown Popover -->
    <Transition name="fade-slide">
      <div
        v-if="isOpen"
        class="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[85vh]"
      >
        <!-- Popover Header -->
        <div class="px-4 py-3 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/90 backdrop-blur-sm">
          <div class="flex items-center gap-2">
            <h3 class="text-xs font-bold text-slate-100 uppercase tracking-wider">Notifications</h3>
            <span v-if="unreadCount > 0" class="px-2 py-0.5 bg-amber-500/10 text-amber-400 text-[10px] font-bold rounded-full border border-amber-500/20">
              {{ unreadCount }} non lue{{ unreadCount > 1 ? 's' : '' }}
            </span>
          </div>

          <button
            v-if="unreadCount > 0"
            @click="handleMarkAllRead"
            :disabled="marking"
            class="text-[11px] font-semibold text-amber-400 hover:text-amber-300 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Tout marquer comme lu
          </button>
        </div>

        <!-- Severity Filter Pills -->
        <div class="px-3 py-2 border-b border-slate-800/50 bg-slate-950/40 flex items-center gap-1.5 overflow-x-auto text-[11px]">
          <button
            v-for="filter in severityFilters"
            :key="filter.value || 'all'"
            @click="activeFilter = filter.value"
            class="px-2.5 py-1 rounded-lg font-medium transition-all shrink-0 cursor-pointer"
            :class="activeFilter === filter.value ? 'bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'"
          >
            {{ filter.label }}
          </button>
        </div>

        <!-- Notification List -->
        <div class="flex-1 overflow-y-auto divide-y divide-slate-800/50">
          <div v-if="loading" class="p-8 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
            <svg class="animate-spin h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Chargement...
          </div>

          <div v-else-if="filteredNotifications.length === 0" class="p-8 text-center text-xs text-slate-500">
            Aucune notification pour le moment.
          </div>

          <div
            v-else
            v-for="item in filteredNotifications"
            :key="item.id"
            @click="handleNotificationClick(item)"
            class="p-3.5 hover:bg-slate-800/40 transition-colors flex items-start gap-3 cursor-pointer group relative"
            :class="!item.isRead ? 'bg-slate-900/60' : 'opacity-75'"
          >
            <!-- Unread Indicator Dot -->
            <span
              v-if="!item.isRead"
              class="absolute left-1.5 top-5 w-1.5 h-1.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50"
            ></span>

            <!-- Severity Icon -->
            <div
              class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border mt-0.5"
              :class="getSeverityClass(item.severity)"
            >
              <svg v-if="item.severity === 'SUCCESS'" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <svg v-else-if="item.severity === 'CRITICAL'" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <svg v-else-if="item.severity === 'WARNING'" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <svg v-else class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0 text-xs">
              <div class="flex items-center justify-between gap-2 mb-0.5">
                <h4 class="font-bold text-slate-200 group-hover:text-amber-400 transition-colors truncate">
                  {{ item.title }}
                </h4>
                <span class="text-[10px] text-slate-500 shrink-0">
                  {{ formatTimeAgo(item.createdAt) }}
                </span>
              </div>
              <p class="text-slate-400 line-clamp-2 text-[11px] leading-relaxed">
                {{ item.message }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

export interface AppNotificationItem {
  id: string
  type: string
  severity: 'INFO' | 'SUCCESS' | 'WARNING' | 'CRITICAL'
  title: string
  message: string
  actionUrl?: string | null
  isRead: boolean
  createdAt: string
}

const isOpen = ref(false)
const loading = ref(false)
const marking = ref(false)
const notifications = ref<AppNotificationItem[]>([])
const unreadCount = ref(0)
const activeFilter = ref<string | null>(null)
const containerRef = ref<HTMLElement | null>(null)

const severityFilters = [
  { label: 'Toutes', value: null },
  { label: 'Critique', value: 'CRITICAL' },
  { label: 'Avertissement', value: 'WARNING' },
  { label: 'Succès', value: 'SUCCESS' },
  { label: 'Info', value: 'INFO' }
]

const filteredNotifications = computed(() => {
  if (!activeFilter.value) return notifications.value
  return notifications.value.filter(n => n.severity === activeFilter.value)
})

async function fetchNotifications() {
  loading.value = true
  try {
    const res: any = await $fetch('/api/notifications')
    if (res?.success) {
      notifications.value = res.data.notifications || []
      unreadCount.value = res.data.unreadCount || 0
    }
  } catch (err) {
    console.error('Failed to fetch notifications:', err)
  } finally {
    loading.value = false
  }
}

function toggleDropdown() {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    fetchNotifications()
  }
}

async function handleMarkAllRead() {
  marking.value = true
  try {
    await $fetch('/api/notifications/read-all', { method: 'PATCH' })
    notifications.value.forEach(n => { n.isRead = true })
    unreadCount.value = 0
  } catch (err) {
    console.error('Failed to mark all as read:', err)
  } finally {
    marking.value = false
  }
}

async function handleNotificationClick(item: AppNotificationItem) {
  if (!item.isRead) {
    item.isRead = true
    unreadCount.value = Math.max(0, unreadCount.value - 1)
    $fetch(`/api/notifications/${item.id}/read`, { method: 'PATCH' }).catch(() => {})
  }

  if (item.actionUrl && item.actionUrl.startsWith('/')) {
    isOpen.value = false
    navigateTo(item.actionUrl)
  }
}

function getSeverityClass(severity: string): string {
  switch (severity) {
    case 'SUCCESS':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    case 'CRITICAL':
      return 'bg-rose-500/10 text-rose-400 border-rose-500/20'
    case 'WARNING':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    case 'INFO':
    default:
      return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
  }
}

function formatTimeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diffMs / (60 * 1000))
  if (mins < 1) return 'À l’instant'
  if (mins < 60) return `Il y a ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `Il y a ${hours}h`
  const days = Math.floor(hours / 24)
  return `Il y a ${days}j`
}

function handleClickOutside(e: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => {
  fetchNotifications()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}
</style>
