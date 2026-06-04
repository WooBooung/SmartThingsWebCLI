<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import CopyButton from '@/components/CopyButton.vue'

// 이 페이지가 대응하는 SmartThings CLI 명령과 공식 API 문서 링크를 보여준다.
// commands 는 'smartthings' 접두어 없이 전달한다. (예: 'devices:status [id]')
defineProps<{
  commands: string[]
  note?: string
  docs?: { label: string; url: string }[]
}>()

const { t } = useI18n()
</script>

<template>
  <section class="mb-6 rounded-xl border border-line bg-bg-2/60 px-4 py-3">
    <div class="flex items-center gap-2 text-[11px] font-semibold tracking-wider text-muted uppercase">
      <svg viewBox="0 0 24 24" class="size-3.5 text-brand-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="4 17 10 11 4 5" />
        <line x1="12" y1="19" x2="20" y2="19" />
      </svg>
      {{ t('cli.label') }}
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

    <div v-if="docs && docs.length" class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-2">
      <span class="text-[11px] font-semibold tracking-wider text-muted uppercase">{{ t('cli.docs') }}</span>
      <a
        v-for="d in docs"
        :key="d.url"
        :href="d.url"
        target="_blank"
        rel="noopener"
        class="inline-flex items-center gap-1 text-xs text-brand-2 underline-offset-2 hover:underline"
      >
        {{ d.label }}
        <svg viewBox="0 0 24 24" class="size-3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M7 17 17 7M7 7h10v10" />
        </svg>
      </a>
    </div>
  </section>
</template>
