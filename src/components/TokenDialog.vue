<script setup lang="ts">
import { ref, watch } from 'vue'
import { useTokenStore } from '@/stores/token'
import { toastSuccess } from '@/lib/toast'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const store = useTokenStore()
const draft = ref('')

watch(
  () => props.open,
  (o) => {
    if (o) draft.value = store.pat
  },
)

function save() {
  store.setPat(draft.value)
  toastSuccess('PAT 토큰을 저장했습니다.')
  emit('close')
}

function clear() {
  store.clear()
  draft.value = ''
  toastSuccess('PAT 토큰을 삭제했습니다.')
}
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="emit('close')" />
    <div
      class="relative w-[min(94vw,520px)] rounded-2xl border border-line bg-card p-6 shadow-[0_18px_48px_rgba(0,0,0,0.7)]"
    >
      <h2 class="text-lg font-bold">SmartThings PAT 토큰</h2>
      <p class="mt-1 text-sm text-muted">
        Personal Access Token 을 입력하세요. 브라우저(localStorage)에만 저장되며 SmartThings API
        직접 호출에 사용됩니다.
      </p>

      <textarea
        v-model="draft"
        rows="3"
        spellcheck="false"
        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
        class="mt-4 w-full resize-none rounded-lg border border-line bg-bg-2 px-3 py-2 font-mono text-sm text-text outline-none focus:border-brand-2"
      />

      <a
        href="https://account.smartthings.com/tokens"
        target="_blank"
        rel="noreferrer"
        class="mt-2 inline-block text-xs text-brand-2 hover:underline"
      >
        PAT 발급 페이지 열기 →
      </a>

      <div class="mt-5 flex items-center justify-between gap-2">
        <button
          class="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-muted transition hover:-translate-y-px hover:text-text"
          @click="clear"
        >
          삭제
        </button>
        <div class="flex gap-2">
          <button
            class="rounded-lg border border-line px-4 py-2 text-sm font-semibold transition hover:-translate-y-px"
            @click="emit('close')"
          >
            취소
          </button>
          <button
            class="rounded-lg border border-transparent bg-gradient-to-br from-brand to-brand-2 px-4 py-2 text-sm font-semibold text-[#061026] transition hover:-translate-y-px"
            @click="save"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
