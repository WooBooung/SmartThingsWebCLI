<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { toolsByGroup } from '@/lib/tools'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'navigate'): void }>()

const { t } = useI18n()
const groups = toolsByGroup()
</script>

<template>
  <aside
    class="fixed top-14 bottom-0 left-0 z-30 w-60 -translate-x-full overflow-y-auto border-r border-line bg-bg-2 px-2 py-3 transition-transform md:translate-x-0"
    :class="{ '!translate-x-0': open }"
  >
    <nav class="flex flex-col">
      <RouterLink
        to="/"
        class="mb-1 rounded-md px-3 py-2 text-sm font-semibold text-muted transition hover:bg-brand-2/10 hover:text-text"
        active-class="!bg-brand/15 !text-text"
        @click="emit('navigate')"
      >
        {{ t('nav.home') }}
      </RouterLink>

      <div v-for="g in groups" :key="g.group" class="mt-1">
        <!-- 그룹 헤더: 구분선 + 액센트 바 + 진한 라벨 (서브메뉴와 명확히 구분) -->
        <div class="mt-3 mb-1 flex items-center gap-2 border-t border-line px-2 pt-3">
          <span class="h-3 w-1 rounded-full bg-gradient-to-b from-brand to-brand-2" />
          <span class="text-[11px] font-bold tracking-widest text-brand-2 uppercase">
            {{ t('groups.' + g.group) }}
          </span>
        </div>
        <!-- 서브메뉴: 들여쓰기 -->
        <template v-for="tool in g.tools" :key="tool.key">
          <RouterLink
            v-if="tool.enabled"
            :to="tool.path"
            class="ml-2 block rounded-md border-l border-line/60 px-3 py-1.5 text-sm font-medium text-muted transition hover:border-brand-2 hover:bg-brand-2/10 hover:text-text"
            active-class="!border-brand-2 !bg-brand/15 !text-text"
            @click="emit('navigate')"
          >
            {{ t('tools.' + tool.key + '.title') }}
          </RouterLink>
          <span
            v-else
            class="ml-2 block cursor-not-allowed border-l border-line/60 px-3 py-1.5 text-sm text-muted/40"
            :title="t('common.preparing')"
          >
            {{ t('tools.' + tool.key + '.title') }}
          </span>
        </template>
      </div>
    </nav>
  </aside>
</template>
