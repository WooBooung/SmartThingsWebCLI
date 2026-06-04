<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useTokenStore } from '@/stores/token'
import { listLocations } from '@/lib/stClient'
import { listScenes, executeScene, type Scene } from '@/lib/api/scenes'
import type { Location } from '@/lib/types'
import { toastError, toastSuccess } from '@/lib/toast'
import CopyButton from '@/components/CopyButton.vue'
import JsonView from '@/components/JsonView.vue'
import CliRef from '@/components/CliRef.vue'

const { hasToken } = storeToRefs(useTokenStore())

const { t } = useI18n({
  useScope: 'local',
  inheritLocale: true,
  messages: {
    ko: {
      title: 'Scenes',
      subtitle: '위치별 씬을 조회하고 실행합니다.',
      noTokenPre: 'PAT 토큰이 없습니다. 우측 상단의',
      patSettings: 'PAT 설정',
      noTokenPost: '으로 토큰을 입력하세요.',
      selectLabel: '위치 선택',
      loading: '불러오는 중…',
      refresh: '↻ 새로고침',
      allLocations: '전체 위치',
      sceneList: '씬 목록',
      count: '{count}개',
      scenesEmpty: '씬이 없습니다.',
      copySceneId: 'sceneId 복사',
      executing: '실행 중…',
      execute: '실행',
      resultLabel: '실행 결과',
      executedToast: '씬 "{name}" 을 실행했습니다.',
    },
    en: {
      title: 'Scenes',
      subtitle: 'Query and run scenes per location.',
      noTokenPre: 'No PAT token. Use',
      patSettings: 'PAT Settings',
      noTokenPost: 'in the top-right to enter a token.',
      selectLabel: 'Select Location',
      loading: 'Loading…',
      refresh: '↻ Refresh',
      allLocations: 'All Locations',
      sceneList: 'Scene List',
      count: '{count}',
      scenesEmpty: 'No scenes.',
      copySceneId: 'Copy sceneId',
      executing: 'Running…',
      execute: 'Run',
      resultLabel: 'Run Result',
      executedToast: 'Scene "{name}" executed.',
    },
  },
})

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
    toastSuccess(t('executedToast', { name: s.sceneName ?? s.sceneId }))
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
    <h1 class="text-2xl font-extrabold tracking-tight md:text-3xl">{{ t('title') }}</h1>
    <p class="mt-1 text-sm text-muted">{{ t('subtitle') }}</p>
  </header>
  <CliRef
    :commands="['scenes [id]', 'scenes:execute [id]']"
    :docs="[{ label: 'Scenes', url: 'https://developer.smartthings.com/docs/api/public/#tag/Scenes' }]"
  />

  <div
    v-if="!hasToken"
    class="rounded-xl border-l-[3px] border-warn bg-warn/10 px-4 py-3 text-sm text-warn"
  >
    {{ t('noTokenPre') }} <strong>{{ t('patSettings') }}</strong> {{ t('noTokenPost') }}
  </div>

  <template v-else>
    <!-- 위치 선택 -->
    <section class="rounded-xl border border-line bg-card p-4">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-semibold tracking-wider text-muted uppercase">{{ t('selectLabel') }}</span>
        <button
          class="rounded-md border border-line px-2 py-1 text-xs text-muted transition hover:border-brand-2 hover:text-brand-2"
          :disabled="locationsLoading"
          @click="loadLocations"
        >
          {{ locationsLoading ? t('loading') : t('refresh') }}
        </button>
      </div>
      <select
        v-model="selectedLocation"
        class="mt-3 w-full rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
        @change="loadScenes"
      >
        <option value="">{{ t('allLocations') }}</option>
        <option v-for="l in locations" :key="l.locationId" :value="l.locationId">
          {{ l.name }}
        </option>
      </select>
    </section>

    <div v-if="listLoading" class="mt-6 flex items-center gap-2 text-sm text-muted">
      <span class="size-2 animate-pulse rounded-full bg-brand-2" /> {{ t('loading') }}
    </div>

    <!-- 씬 목록 -->
    <section v-if="!listLoading" class="mt-4 overflow-hidden rounded-xl border border-line bg-card">
      <header class="flex items-center gap-2 border-b border-line px-4 py-3">
        <span class="h-3.5 w-1 rounded-full bg-gradient-to-b from-brand to-brand-2" />
        <h3 class="text-sm font-bold">{{ t('sceneList') }}</h3>
        <span class="ml-auto text-xs text-muted">{{ t('count', { count: scenes.length }) }}</span>
      </header>
      <p v-if="!scenes.length" class="px-4 py-3 text-sm text-muted">{{ t('scenesEmpty') }}</p>
      <ul v-else class="divide-y divide-line">
        <li v-for="s in scenes" :key="s.sceneId" class="flex items-center gap-3 px-4 py-3">
          <div class="min-w-0 flex-1">
            <span class="truncate text-sm font-semibold text-text">
              {{ s.sceneName ?? s.sceneId }}
            </span>
            <div class="mt-0.5 flex items-center gap-2">
              <code class="truncate font-mono text-[11px] text-muted">{{ s.sceneId }}</code>
              <CopyButton :text="s.sceneId" :title="t('copySceneId')" />
            </div>
          </div>
          <button
            class="shrink-0 rounded-lg border border-transparent bg-gradient-to-br from-brand to-brand-2 px-4 py-1.5 text-sm font-semibold text-[#061026] transition hover:-translate-y-px disabled:opacity-50"
            :disabled="!!executingId"
            @click="doExecute(s)"
          >
            {{ executingId === s.sceneId ? t('executing') : t('execute') }}
          </button>
        </li>
      </ul>
    </section>

    <div v-if="result" class="mt-4">
      <JsonView :value="result" :label="t('resultLabel')" :default-open="true" />
    </div>
  </template>
</template>
