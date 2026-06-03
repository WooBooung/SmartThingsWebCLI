<script setup lang="ts">
import CopyButton from '@/components/CopyButton.vue'

// 이 페이지가 대응하는 SmartThings CLI 명령을 보여준다.
// commands 는 'smartthings' 접두어 없이 전달한다. (예: 'devices:status [id]')
defineProps<{ commands: string[]; note?: string }>()
</script>

<template>
  <section class="mb-6 rounded-xl border border-line bg-bg-2/60 px-4 py-3">
    <div class="flex items-center gap-2 text-[11px] font-semibold tracking-wider text-muted uppercase">
      <svg viewBox="0 0 24 24" class="size-3.5 text-brand-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="4 17 10 11 4 5" />
        <line x1="12" y1="19" x2="20" y2="19" />
      </svg>
      SmartThings CLI 대응 명령
    </div>
    <ul v-if="commands.length" class="mt-2 flex flex-col gap-1.5">
      <li v-for="c in commands" :key="c" class="flex items-center gap-2">
        <code class="truncate rounded bg-black/30 px-2 py-0.5 font-mono text-[12.5px] text-brand-2">
          smartthings {{ c }}
        </code>
        <CopyButton :text="`smartthings ${c}`" :title="`'smartthings ${c}' 복사`" />
      </li>
    </ul>
    <p v-if="note" class="mt-2 text-xs text-muted">{{ note }}</p>
  </section>
</template>
