<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{ text: string; title?: string }>()
const copied = ref(false)

async function copy() {
  try {
    await navigator.clipboard.writeText(props.text)
    copied.value = true
    window.setTimeout(() => (copied.value = false), 1200)
  } catch {
    /* 무시 */
  }
}
</script>

<template>
  <button
    type="button"
    class="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted transition hover:bg-brand-2/10 hover:text-brand-2"
    :class="copied ? '!text-success' : ''"
    :title="title ?? '복사'"
    @click.stop="copy"
  >
    <!-- 체크 (복사됨) -->
    <svg v-if="copied" viewBox="0 0 24 24" class="size-3.5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
    <!-- 복사 아이콘 -->
    <svg v-else viewBox="0 0 24 24" class="size-3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  </button>
</template>
