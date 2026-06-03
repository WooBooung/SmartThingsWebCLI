<script setup lang="ts">
import { useToasts, dismissToast } from '@/lib/toast'

const toasts = useToasts()

const kindClass: Record<string, string> = {
  error: 'border-warn/50 bg-warn/10 text-warn',
  success: 'border-success/50 bg-success/10 text-success',
  info: 'border-brand-2/40 bg-brand-2/10 text-brand-2',
}
</script>

<template>
  <div class="fixed top-4 right-4 z-[100] flex w-[min(92vw,360px)] flex-col gap-2">
    <transition-group name="toast">
      <div
        v-for="t in toasts.items"
        :key="t.id"
        class="flex items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-[0_16px_40px_rgba(0,0,0,0.5)] backdrop-blur"
        :class="kindClass[t.kind]"
      >
        <span class="flex-1 break-words whitespace-pre-wrap">{{ t.message }}</span>
        <button
          class="shrink-0 opacity-60 transition hover:opacity-100"
          aria-label="닫기"
          @click="dismissToast(t.id)"
        >
          ✕
        </button>
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.2s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
