<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useTokenStore } from '@/stores/token'
import { setLang, type Lang } from '@/i18n'

defineProps<{ menuOpen: boolean }>()
const emit = defineEmits<{ (e: 'toggle-menu'): void; (e: 'open-token'): void }>()

const store = useTokenStore()
const { t, locale } = useI18n()

function pick(l: Lang) {
  setLang(l)
}
</script>

<template>
  <header
    class="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-line bg-[rgba(11,16,32,0.85)] px-4 backdrop-blur-[10px]"
  >
    <button
      class="rounded-md p-2 text-muted transition hover:bg-brand-2/10 hover:text-text md:hidden"
      aria-label="menu"
      @click="emit('toggle-menu')"
    >
      <span class="block h-0.5 w-5 bg-current" />
      <span class="mt-1 block h-0.5 w-5 bg-current" />
      <span class="mt-1 block h-0.5 w-5 bg-current" />
    </button>

    <RouterLink to="/" class="brand-gradient-text text-base font-extrabold tracking-tight">
      {{ t('app.title') }}
    </RouterLink>

    <div class="ml-auto flex items-center gap-2">
      <!-- 언어 전환 -->
      <div class="flex overflow-hidden rounded-full border border-line text-xs font-semibold">
        <button
          class="px-2.5 py-1 transition"
          :class="locale === 'ko' ? 'bg-brand text-[#061026]' : 'text-muted hover:text-text'"
          @click="pick('ko')"
        >
          KO
        </button>
        <button
          class="px-2.5 py-1 transition"
          :class="locale === 'en' ? 'bg-brand text-[#061026]' : 'text-muted hover:text-text'"
          @click="pick('en')"
        >
          EN
        </button>
      </div>

      <span
        v-if="store.hasToken"
        class="hidden rounded-full border border-success/40 bg-success/10 px-3 py-1 text-xs text-success sm:inline"
      >
        {{ t('nav.tokenSet') }}
      </span>
      <span
        v-else
        class="hidden rounded-full border border-warn/40 bg-warn/10 px-3 py-1 text-xs text-warn sm:inline"
      >
        {{ t('nav.tokenNone') }}
      </span>
      <button
        class="rounded-lg border border-line bg-card px-3 py-1.5 text-sm font-semibold transition hover:-translate-y-px hover:border-brand-2"
        @click="emit('open-token')"
      >
        {{ t('nav.settings') }}
      </button>
    </div>
  </header>
</template>
