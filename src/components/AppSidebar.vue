<script setup lang="ts">
import { toolsByGroup } from '@/lib/tools'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'navigate'): void }>()

const groups = toolsByGroup()
</script>

<template>
  <aside
    class="fixed top-14 bottom-0 left-0 z-30 w-60 -translate-x-full overflow-y-auto border-r border-line bg-bg-2 px-3 py-4 transition-transform md:translate-x-0"
    :class="{ '!translate-x-0': open }"
  >
    <nav class="flex flex-col gap-1">
      <RouterLink
        to="/"
        class="rounded-md px-3 py-2 text-sm font-semibold text-muted transition hover:bg-brand-2/10 hover:text-text"
        active-class="!bg-brand/15 !text-text"
        @click="emit('navigate')"
      >
        홈
      </RouterLink>

      <template v-for="g in groups" :key="g.group">
        <div class="mt-3 px-3 text-[11px] font-semibold tracking-wider text-muted/70 uppercase">
          {{ g.label }}
        </div>
        <template v-for="tool in g.tools" :key="tool.key">
          <RouterLink
            v-if="tool.enabled"
            :to="tool.path"
            class="rounded-md px-3 py-2 text-sm font-medium text-muted transition hover:bg-brand-2/10 hover:text-text"
            active-class="!bg-brand/15 !text-text"
            @click="emit('navigate')"
          >
            {{ tool.title }}
          </RouterLink>
          <span
            v-else
            class="cursor-not-allowed rounded-md px-3 py-2 text-sm text-muted/40"
            title="준비 중"
          >
            {{ tool.title }}
          </span>
        </template>
      </template>
    </nav>
  </aside>
</template>
