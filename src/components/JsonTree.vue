<script setup lang="ts">
import { ref, computed } from 'vue'

// 재귀 트리 노드. 객체/배열은 접고 펼칠 수 있다.
const props = withDefaults(
  defineProps<{
    data: unknown
    nodeKey?: string
    depth?: number
    expandDepth?: number // 이 깊이 미만은 기본 펼침
  }>(),
  { depth: 0, expandDepth: 1 },
)

const open = ref(props.depth < props.expandDepth)

const kind = computed<'object' | 'array' | 'primitive'>(() => {
  if (Array.isArray(props.data)) return 'array'
  if (props.data !== null && typeof props.data === 'object') return 'object'
  return 'primitive'
})

const entries = computed<[string, unknown][]>(() => {
  if (kind.value === 'array') return (props.data as unknown[]).map((v, i) => [String(i), v])
  if (kind.value === 'object') return Object.entries(props.data as Record<string, unknown>)
  return []
})

const isExpandable = computed(() => entries.value.length > 0)
const summary = computed(() =>
  kind.value === 'array' ? `[ ${entries.value.length} ]` : kind.value === 'object' ? `{ ${entries.value.length} }` : '',
)

function primitiveText(v: unknown): string {
  if (typeof v === 'string') return `"${v}"`
  return String(v)
}
function primitiveClass(v: unknown): string {
  if (typeof v === 'string') return 'text-success'
  if (typeof v === 'number') return 'text-brand-2'
  if (typeof v === 'boolean') return 'text-warn'
  if (v === null || v === undefined) return 'text-muted'
  return 'text-text'
}
function toggle() {
  if (isExpandable.value) open.value = !open.value
}
</script>

<template>
  <div class="font-mono text-[12.5px] leading-relaxed">
    <!-- 객체/배열 노드 -->
    <template v-if="kind !== 'primitive'">
      <button
        class="flex w-full items-center gap-1 text-left"
        :class="isExpandable ? 'cursor-pointer hover:text-text' : 'cursor-default'"
        @click="toggle"
      >
        <span
          class="inline-block w-3 shrink-0 text-brand-2 transition-transform"
          :class="{ 'rotate-90': open && isExpandable, 'opacity-0': !isExpandable }"
          >▶</span
        >
        <span v-if="nodeKey !== undefined" class="text-muted">{{ nodeKey }}:</span>
        <span class="text-muted/60">{{ summary }}</span>
      </button>
      <div v-if="open && isExpandable" class="ml-3 border-l border-line/50 pl-3">
        <JsonTree
          v-for="[k, v] in entries"
          :key="k"
          :data="v"
          :node-key="k"
          :depth="depth + 1"
          :expand-depth="expandDepth"
        />
      </div>
    </template>

    <!-- 원시값 -->
    <div v-else class="flex items-start gap-1">
      <span class="inline-block w-3 shrink-0" />
      <span v-if="nodeKey !== undefined" class="text-muted">{{ nodeKey }}:</span>
      <span class="break-all" :class="primitiveClass(data)">{{ primitiveText(data) }}</span>
    </div>
  </div>
</template>
