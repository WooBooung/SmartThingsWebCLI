<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useTokenStore } from '@/stores/token'
import { listLocations } from '@/lib/stClient'
import { listScenes, executeScene, type Scene } from '@/lib/api/scenes'
import type { Location } from '@/lib/types'
import { toastError, toastSuccess } from '@/lib/toast'
import CopyButton from '@/components/CopyButton.vue'
import JsonView from '@/components/JsonView.vue'
import CliRef from '@/components/CliRef.vue'

const { hasToken } = storeToRefs(useTokenStore())

const locations = ref<Location[]>([])
const selectedLocation = ref('')
const locationsLoading = ref(false)

const scenes = ref<Scene[]>([])
const listLoading = ref(false)
const executingId = ref('')
const result = ref<unknown>(null)

async function loadLocations() {
  if (!hasToken.value) return
  locationsLoading.value = true
  try {
    const res = await listLocations()
    locations.value = res.items ?? []
    if (!selectedLocation.value && locations.value.length) {
      selectedLocation.value = locations.value[0].locationId
    }
    await loadScenes()
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    locationsLoading.value = false
  }
}

async function loadScenes() {
  listLoading.value = true
  scenes.value = []
  try {
    // selectedLocation 이 비어 있으면 전체 위치의 씬을 조회
    const res = await listScenes(selectedLocation.value || undefined)
    scenes.value = res.items ?? []
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    listLoading.value = false
  }
}

// 씬 실행은 비파괴적이라 버튼 클릭이 곧 실행 (confirm 없음).
async function doExecute(s: Scene) {
  executingId.value = s.sceneId
  try {
    result.value = await executeScene(s.sceneId)
    toastSuccess(`씬 "${s.sceneName ?? s.sceneId}" 을 실행했습니다.`)
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    executingId.value = ''
  }
}

onMounted(loadLocations)
</script>

<template>
  <header class="mb-6">
    <h1 class="text-2xl font-extrabold tracking-tight md:text-3xl">Scenes</h1>
    <p class="mt-1 text-sm text-muted">위치별 씬을 조회하고 실행합니다.</p>
  </header>
  <CliRef
    :commands="['scenes [id]', 'scenes:execute [id]']"
    :docs="[{ label: 'Scenes', url: 'https://developer.smartthings.com/docs/api/public/#tag/Scenes' }]"
  />

  <div
    v-if="!hasToken"
    class="rounded-xl border-l-[3px] border-warn bg-warn/10 px-4 py-3 text-sm text-warn"
  >
    PAT 토큰이 없습니다. 우측 상단의 <strong>PAT 설정</strong> 으로 토큰을 입력하세요.
  </div>

  <template v-else>
    <!-- 위치 선택 -->
    <section class="rounded-xl border border-line bg-card p-4">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-semibold tracking-wider text-muted uppercase">위치 선택</span>
        <button
          class="rounded-md border border-line px-2 py-1 text-xs text-muted transition hover:border-brand-2 hover:text-brand-2"
          :disabled="locationsLoading"
          @click="loadLocations"
        >
          {{ locationsLoading ? '불러오는 중…' : '↻ 새로고침' }}
        </button>
      </div>
      <select
        v-model="selectedLocation"
        class="mt-3 w-full rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
        @change="loadScenes"
      >
        <option value="">전체 위치</option>
        <option v-for="l in locations" :key="l.locationId" :value="l.locationId">
          {{ l.name }}
        </option>
      </select>
    </section>

    <div v-if="listLoading" class="mt-6 flex items-center gap-2 text-sm text-muted">
      <span class="size-2 animate-pulse rounded-full bg-brand-2" /> 불러오는 중…
    </div>

    <!-- 씬 목록 -->
    <section v-if="!listLoading" class="mt-4 overflow-hidden rounded-xl border border-line bg-card">
      <header class="flex items-center gap-2 border-b border-line px-4 py-3">
        <span class="h-3.5 w-1 rounded-full bg-gradient-to-b from-brand to-brand-2" />
        <h3 class="text-sm font-bold">씬 목록</h3>
        <span class="ml-auto text-xs text-muted">{{ scenes.length }}개</span>
      </header>
      <p v-if="!scenes.length" class="px-4 py-3 text-sm text-muted">씬이 없습니다.</p>
      <ul v-else class="divide-y divide-line">
        <li v-for="s in scenes" :key="s.sceneId" class="flex items-center gap-3 px-4 py-3">
          <div class="min-w-0 flex-1">
            <span class="truncate text-sm font-semibold text-text">
              {{ s.sceneName ?? s.sceneId }}
            </span>
            <div class="mt-0.5 flex items-center gap-2">
              <code class="truncate font-mono text-[11px] text-muted">{{ s.sceneId }}</code>
              <CopyButton :text="s.sceneId" title="sceneId 복사" />
            </div>
          </div>
          <button
            class="shrink-0 rounded-lg border border-transparent bg-gradient-to-br from-brand to-brand-2 px-4 py-1.5 text-sm font-semibold text-[#061026] transition hover:-translate-y-px disabled:opacity-50"
            :disabled="!!executingId"
            @click="doExecute(s)"
          >
            {{ executingId === s.sceneId ? '실행 중…' : '실행' }}
          </button>
        </li>
      </ul>
    </section>

    <div v-if="result" class="mt-4">
      <JsonView :value="result" label="실행 결과" :default-open="true" />
    </div>
  </template>
</template>
