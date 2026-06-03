import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// 기존 web cli 와 동일한 localStorage 키 — 기존 PAT 호환.
const PAT_KEY = 'patData'

/**
 * PAT 토큰을 한 곳에서 관리한다.
 * (기존 각 도구가 localStorage.getItem('patData') 를 따로 읽던 중복을 제거)
 */
export const useTokenStore = defineStore('token', () => {
  const pat = ref<string>(localStorage.getItem(PAT_KEY) ?? '')

  const hasToken = computed(() => pat.value.trim().length > 0)

  function setPat(value: string) {
    const trimmed = value.trim()
    pat.value = trimmed
    if (trimmed) localStorage.setItem(PAT_KEY, trimmed)
    else localStorage.removeItem(PAT_KEY)
  }

  function clear() {
    pat.value = ''
    localStorage.removeItem(PAT_KEY)
  }

  return { pat, hasToken, setPat, clear }
})
