<script setup lang="ts">
import { ref, watch } from 'vue'
import { useTokenStore } from '@/stores/token'
import { toastSuccess } from '@/lib/toast'
import CopyButton from '@/components/CopyButton.vue'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const store = useTokenStore()
const draft = ref('')
const reveal = ref(false)

watch(
  () => props.open,
  (o) => {
    if (o) {
      draft.value = store.pat
      reveal.value = false
    }
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

      <div
        class="mt-4 flex items-center gap-1 rounded-lg border border-line bg-bg-2 pr-1 focus-within:border-brand-2"
      >
        <input
          v-model="draft"
          :type="reveal ? 'text' : 'password'"
          spellcheck="false"
          autocomplete="off"
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          class="min-w-0 flex-1 bg-transparent px-3 py-2 font-mono text-sm text-text outline-none"
        />
        <!-- 보이기/숨기기 토글 -->
        <button
          type="button"
          class="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted transition hover:bg-brand-2/10 hover:text-brand-2"
          :title="reveal ? '숨기기' : '보이기'"
          @click="reveal = !reveal"
        >
          <svg
            v-if="reveal"
            viewBox="0 0 24 24"
            class="size-4"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <svg
            v-else
            viewBox="0 0 24 24"
            class="size-4"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
            <path d="M6.61 6.61A13.5 13.5 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.39-1.61" />
            <line x1="2" y1="2" x2="22" y2="22" />
          </svg>
        </button>
        <!-- 복사 -->
        <CopyButton :text="draft" title="PAT 복사" />
      </div>

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
