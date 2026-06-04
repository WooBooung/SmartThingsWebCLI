<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { toastSuccess, toastError } from '@/lib/toast'
import JsonTree from '@/components/JsonTree.vue'

const { t } = useI18n()

const props = withDefaults(
  defineProps<{
    value: unknown
    label?: string
    collapsible?: boolean
    defaultOpen?: boolean
  }>(),
  { collapsible: true, defaultOpen: false },
)

const open = ref(props.collapsible ? props.defaultOpen : true)

const text = computed(() =>
  typeof props.value === 'string' ? props.value : JSON.stringify(props.value, null, 2),
)

function toggle() {
  if (props.collapsible) open.value = !open.value
}

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
    <div
      class="flex items-center justify-between px-4 py-2"
      :class="open ? 'border-b border-line' : ''"
    >
      <button
        class="flex items-center gap-2 text-xs font-semibold tracking-wider text-muted uppercase transition hover:text-text"
        :class="collapsible ? 'cursor-pointer' : 'cursor-default'"
        @click="toggle"
      >
        <span
          v-if="collapsible"
          class="inline-block text-brand-2 transition-transform"
          :class="open ? 'rotate-90' : ''"
        >
          ▶
        </span>
        {{ label ?? 'JSON' }}
      </button>
      <button
        v-show="open"
        class="rounded-md border border-line px-2 py-1 text-xs text-muted transition hover:border-brand-2 hover:text-brand-2"
        @click.stop="copy"
      >
        {{ t('common.copy') }}
      </button>
    </div>
    <div v-show="open" class="max-h-[60vh] overflow-auto px-4 py-3">
      <JsonTree :data="value" :expand-depth="1" />
    </div>
  </div>
</template>
