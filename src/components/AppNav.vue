<script setup lang="ts">
import { useTokenStore } from '@/stores/token'

defineProps<{ menuOpen: boolean }>()
const emit = defineEmits<{ (e: 'toggle-menu'): void; (e: 'open-token'): void }>()

const store = useTokenStore()
</script>

<template>
  <header
    class="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-line bg-[rgba(11,16,32,0.85)] px-4 backdrop-blur-[10px]"
  >
    <button
      class="rounded-md p-2 text-muted transition hover:bg-brand-2/10 hover:text-text md:hidden"
      aria-label="메뉴"
      @click="emit('toggle-menu')"
    >
      <span class="block h-0.5 w-5 bg-current" />
      <span class="mt-1 block h-0.5 w-5 bg-current" />
      <span class="mt-1 block h-0.5 w-5 bg-current" />
    </button>

    <RouterLink to="/" class="brand-gradient-text text-base font-extrabold tracking-tight">
      SmartThings Web CLI
    </RouterLink>

    <div class="ml-auto flex items-center gap-2">
      <span
        v-if="store.hasToken"
        class="hidden rounded-full border border-success/40 bg-success/10 px-3 py-1 text-xs text-success sm:inline"
      >
        토큰 설정됨
      </span>
      <span
        v-else
        class="hidden rounded-full border border-warn/40 bg-warn/10 px-3 py-1 text-xs text-warn sm:inline"
      >
        토큰 없음
      </span>
      <button
        class="rounded-lg border border-line bg-card px-3 py-1.5 text-sm font-semibold transition hover:-translate-y-px hover:border-brand-2"
        @click="emit('open-token')"
      >
        PAT 설정
      </button>
    </div>
  </header>
</template>
