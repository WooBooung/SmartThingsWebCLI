<script setup lang="ts">
import { computed } from 'vue'
import { toastSuccess, toastError } from '@/lib/toast'

const props = defineProps<{
  value: unknown
  label?: string
}>()

const text = computed(() =>
  typeof props.value === 'string' ? props.value : JSON.stringify(props.value, null, 2),
)

async function copy() {
  try {
    await navigator.clipboard.writeText(text.value)
    toastSuccess('클립보드에 복사했습니다.')
  } catch {
    toastError('복사에 실패했습니다.')
  }
}
</script>

<template>
  <div class="rounded-xl border border-line bg-card">
    <div class="flex items-center justify-between border-b border-line px-4 py-2">
      <span class="text-xs font-semibold tracking-wider text-muted uppercase">
        {{ label ?? 'Result' }}
      </span>
      <button
        class="rounded-md border border-line px-2 py-1 text-xs text-muted transition hover:border-brand-2 hover:text-brand-2"
        @click="copy"
      >
        복사
      </button>
    </div>
    <pre
      class="max-h-[60vh] overflow-auto px-4 py-3 font-mono text-[13px] leading-relaxed whitespace-pre-wrap text-text"
    >{{ text }}</pre>
  </div>
</template>
