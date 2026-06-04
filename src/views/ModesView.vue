<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useTokenStore } from '@/stores/token'
import { listLocations } from '@/lib/stClient'
import {
  listModes,
  createMode,
  updateMode,
  deleteMode,
  getCurrentMode,
  setCurrentMode,
  type Mode,
} from '@/lib/api/modes'
import type { Location } from '@/lib/types'
import { parseJsonOrYaml } from '@/lib/yaml'
import { toastError, toastSuccess } from '@/lib/toast'
import JsonView from '@/components/JsonView.vue'
import CliRef from '@/components/CliRef.vue'

const { hasToken } = storeToRefs(useTokenStore())

const locations = ref<Location[]>([])
const selectedLocation = ref('')
const locationsLoading = ref(false)

const modes = ref<Mode[]>([])
const currentModeId = ref('')
const pickedModeId = ref('')
const listLoading = ref(false)
const busy = ref(false)

// 생성/수정 에디터
const editModeId = ref('')
const editor = ref('')
const result = ref<unknown>(null)

const currentModeLabel = computed(
  () => modes.value.find((m) => m.id === currentModeId.value)?.label ?? currentModeId.value,
)

async function loadLocations() {
  if (!hasToken.value) return
  locationsLoading.value = true
  try {
    const res = await listLocations()
    locations.value = res.items ?? []
    if (!selectedLocation.value && locations.value.length) {
      selectedLocation.value = locations.value[0].locationId
      await loadModes()
    }
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    locationsLoading.value = false
  }
}

async function loadModes() {
  const loc = selectedLocation.value
  if (!loc) return
  listLoading.value = true
  modes.value = []
  currentModeId.value = ''
  try {
    const [list, current] = await Promise.all([listModes(loc), getCurrentMode(loc)])
    modes.value = list.items ?? []
    currentModeId.value = current.id
    pickedModeId.value = current.id
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    listLoading.value = false
  }
}

async function doSetCurrent() {
  const loc = selectedLocation.value
  if (!loc || !pickedModeId.value) return
  busy.value = true
  try {
    await setCurrentMode(loc, pickedModeId.value)
    currentModeId.value = pickedModeId.value
    toastSuccess(`현재 모드를 "${currentModeLabel.value}" 로 변경했습니다.`)
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

function editFor(m: Mode) {
  editModeId.value = m.id
  editor.value = JSON.stringify({ label: m.label }, null, 2)
}

async function doCreate() {
  const loc = selectedLocation.value
  if (!loc) return toastError('위치를 먼저 선택하세요.')
  const parsed = parseJsonOrYaml(editor.value)
  if (!parsed.ok) return toastError(parsed.error ?? '파싱 오류')
  busy.value = true
  try {
    result.value = await createMode(loc, parsed.json)
    toastSuccess('모드를 생성했습니다.')
    editModeId.value = ''
    await loadModes()
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

async function doUpdate() {
  const loc = selectedLocation.value
  if (!loc) return toastError('위치를 먼저 선택하세요.')
  if (!editModeId.value.trim()) return toastError('수정할 모드 ID 가 없습니다 (목록에서 수정을 누르세요).')
  const parsed = parseJsonOrYaml(editor.value)
  if (!parsed.ok) return toastError(parsed.error ?? '파싱 오류')
  busy.value = true
  try {
    result.value = await updateMode(loc, editModeId.value.trim(), parsed.json)
    toastSuccess('모드를 수정했습니다.')
    await loadModes()
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

async function doDelete(m: Mode) {
  const loc = selectedLocation.value
  if (!loc) return
  if (!window.confirm(`모드 "${m.label}" 를 삭제할까요? 되돌릴 수 없습니다.`)) return
  busy.value = true
  try {
    await deleteMode(loc, m.id)
    result.value = { message: `모드 "${m.label}" 삭제 성공` }
    toastSuccess('모드를 삭제했습니다.')
    if (editModeId.value === m.id) editModeId.value = ''
    await loadModes()
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

onMounted(loadLocations)
</script>

<template>
  <header class="mb-6">
    <h1 class="text-2xl font-extrabold tracking-tight md:text-3xl">Modes</h1>
    <p class="mt-1 text-sm text-muted">위치별 모드를 조회·생성·수정·삭제하고 현재 모드를 설정합니다.</p>
  </header>
  <CliRef
    :commands="[
      'locations:modes',
      'locations:modes:create',
      'locations:modes:update [id]',
      'locations:modes:delete [id]',
      'locations:modes:getcurrent [id]',
      'locations:modes:setcurrent [id]',
    ]"
    :docs="[{ label: 'Modes', url: 'https://developer.smartthings.com/docs/api/public/#tag/Modes' }]"
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
        @change="loadModes"
      >
        <option value="">위치를 선택하세요 ({{ locations.length }})</option>
        <option v-for="l in locations" :key="l.locationId" :value="l.locationId">
          {{ l.name }}
        </option>
      </select>
    </section>

    <div v-if="listLoading" class="mt-6 flex items-center gap-2 text-sm text-muted">
      <span class="size-2 animate-pulse rounded-full bg-brand-2" /> 불러오는 중…
    </div>

    <template v-if="selectedLocation && !listLoading">
      <!-- 현재 모드 -->
      <section class="mt-4 overflow-hidden rounded-xl border border-line bg-card">
        <header class="flex items-center gap-2 border-b border-line px-4 py-3">
          <span class="h-3.5 w-1 rounded-full bg-gradient-to-b from-brand to-brand-2" />
          <h3 class="text-sm font-bold">현재 모드</h3>
          <span
            v-if="currentModeId"
            class="ml-auto rounded-full border border-brand-2/40 bg-brand-2/10 px-3 py-1 text-xs font-semibold text-brand-2"
          >
            ● {{ currentModeLabel }}
          </span>
        </header>
        <div class="flex flex-wrap items-center gap-2 p-4">
          <select
            v-model="pickedModeId"
            class="min-w-48 rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
          >
            <option v-for="m in modes" :key="m.id" :value="m.id">{{ m.label }}</option>
          </select>
          <button
            class="rounded-lg border border-transparent bg-gradient-to-br from-brand to-brand-2 px-4 py-2 text-sm font-semibold text-[#061026] transition hover:-translate-y-px disabled:opacity-50"
            :disabled="busy || !pickedModeId || pickedModeId === currentModeId"
            @click="doSetCurrent"
          >
            현재 모드로 설정
          </button>
        </div>
      </section>

      <!-- 모드 목록 -->
      <section class="mt-4 overflow-hidden rounded-xl border border-line bg-card">
        <header class="flex items-center gap-2 border-b border-line px-4 py-3">
          <span class="h-3.5 w-1 rounded-full bg-gradient-to-b from-brand to-brand-2" />
          <h3 class="text-sm font-bold">모드 목록</h3>
          <span class="ml-auto text-xs text-muted">{{ modes.length }}개</span>
        </header>
        <p v-if="!modes.length" class="px-4 py-3 text-sm text-muted">모드가 없습니다.</p>
        <ul v-else class="divide-y divide-line">
          <li
            v-for="m in modes"
            :key="m.id"
            class="flex items-center gap-3 px-4 py-3"
            :class="m.id === currentModeId ? 'bg-brand-2/5' : ''"
          >
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="truncate text-sm font-semibold text-text">{{ m.label }}</span>
                <span
                  v-if="m.id === currentModeId"
                  class="rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success"
                >
                  현재
                </span>
              </div>
              <code class="mt-0.5 block truncate font-mono text-[11px] text-muted">{{ m.id }}</code>
            </div>
            <button
              class="shrink-0 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold transition hover:-translate-y-px hover:border-brand-2 disabled:opacity-50"
              :disabled="busy"
              @click="editFor(m)"
            >
              수정
            </button>
            <button
              class="shrink-0 rounded-lg border border-warn/50 bg-warn/10 px-3 py-1.5 text-xs font-semibold text-warn transition hover:border-warn disabled:opacity-50"
              :disabled="busy"
              @click="doDelete(m)"
            >
              삭제
            </button>
          </li>
        </ul>
      </section>

      <!-- 생성 / 수정 에디터 -->
      <section class="mt-4 rounded-xl border border-line bg-card p-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="text-[11px] font-semibold tracking-wider text-muted uppercase">
            모드 정의 (JSON 또는 YAML)
            <template v-if="editModeId">· 수정 대상 <code class="font-mono text-brand-2">{{ editModeId }}</code></template>
          </span>
          <div class="flex gap-2">
            <button
              class="rounded-lg border border-transparent bg-gradient-to-br from-brand to-brand-2 px-4 py-1.5 text-sm font-semibold text-[#061026] transition hover:-translate-y-px disabled:opacity-50"
              :disabled="busy"
              @click="doCreate"
            >
              생성
            </button>
            <button
              class="rounded-lg border border-line px-4 py-1.5 text-sm font-semibold transition hover:-translate-y-px hover:border-brand-2 disabled:opacity-50"
              :disabled="busy || !editModeId"
              @click="doUpdate"
            >
              수정 저장
            </button>
            <button
              v-if="editModeId"
              class="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-muted transition hover:border-brand-2 hover:text-brand-2"
              @click="editModeId = ''"
            >
              새로 만들기
            </button>
          </div>
        </div>
        <textarea
          v-model="editor"
          spellcheck="false"
          rows="6"
          placeholder='{ "label": "Movie Time" }'
          class="mt-3 w-full resize-y rounded-lg border border-line bg-bg-2 px-3 py-2 font-mono text-[13px] leading-relaxed text-text outline-none focus:border-brand-2"
        />
      </section>

      <div v-if="result" class="mt-4">
        <JsonView :value="result" label="결과" :default-open="true" />
      </div>
    </template>
  </template>
</template>
