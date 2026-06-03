<script setup lang="ts">
import CopyButton from '@/components/CopyButton.vue'

export interface InfoItem {
  label: string
  value: string
  mono?: boolean
}

defineProps<{ title?: string; items: InfoItem[] }>()
</script>

<template>
  <section class="overflow-hidden rounded-xl border border-line bg-card">
    <header
      v-if="title"
      class="flex items-center gap-2 border-b border-line px-4 py-3"
    >
      <span class="h-3.5 w-1 rounded-full bg-gradient-to-b from-brand to-brand-2" />
      <h3 class="text-sm font-bold text-text">{{ title }}</h3>
    </header>

    <dl class="grid grid-cols-1 sm:grid-cols-2">
      <div
        v-for="(item, i) in items"
        :key="item.label"
        class="flex items-center gap-3 border-line px-4 py-3"
        :class="[
          i % 2 === 0 ? 'sm:border-r' : '',
          i >= 2 ? 'border-t' : i >= 1 ? 'border-t sm:border-t-0' : '',
        ]"
      >
        <div class="min-w-0 flex-1">
          <dt class="text-[11px] font-medium tracking-wide text-muted">{{ item.label }}</dt>
          <dd
            class="mt-1 truncate text-sm text-text"
            :class="item.mono ? 'font-mono text-[12.5px] text-brand-2' : 'font-medium'"
            :title="item.value"
          >
            {{ item.value || '—' }}
          </dd>
        </div>
        <CopyButton v-if="item.mono && item.value" :text="item.value" :title="`${item.label} 복사`" />
      </div>
    </dl>
  </section>
</template>
