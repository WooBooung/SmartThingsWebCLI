<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useTokenStore } from '@/stores/token'
import { listLocations } from '@/lib/stClient'
import type { Location } from '@/lib/types'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  deleteInstalledApp,
  getInstalledApp,
  listInstalledApps,
  renameInstalledApp,
  type InstalledApp,
} from '@/lib/api/installedapps'
import CliRef from '@/components/CliRef.vue'
import InfoGrid, { type InfoItem } from '@/components/InfoGrid.vue'
import JsonView from '@/components/JsonView.vue'

const { hasToken } = storeToRefs(useTokenStore())

const { t } = useI18n({
  useScope: 'local',
  inheritLocale: true,
  messages: {
    ko: {
      title: 'Installed Apps',
      desc: '설치된 앱(SmartApp 인스턴스)을 조회·이름변경·삭제합니다.',
      createdDate: '생성일',
      updatedDate: '수정일',
      renamed: '이름을 변경했습니다.',
      deleteConfirm: '설치 앱 "{name}" 을(를) 삭제합니다. 되돌릴 수 없습니다. 계속할까요?',
      deleted: '삭제했습니다.',
      locationFilter: '위치 필터',
      allLocations: '전체 위치',
      loadList: '목록 조회',
      idInputLabel: 'installedAppId 직접 입력',
      get: '조회',
      loading: '불러오는 중…',
      listHeader: '설치된 앱 {count}개',
      noApps: '표시할 설치 앱이 없습니다.',
      manage: '관리',
      renameLabel: '이름 변경 (displayName)',
      newNamePlaceholder: '새 이름',
      rename: '이름 변경',
      delete: '삭제',
      rawJson: 'Installed App (원본 JSON)',
    },
    en: {
      title: 'Installed Apps',
      desc: 'List, rename, and delete installed apps (SmartApp instances).',
      createdDate: 'Created',
      updatedDate: 'Updated',
      renamed: 'Renamed.',
      deleteConfirm: 'Delete installed app "{name}"? This cannot be undone. Continue?',
      deleted: 'Deleted.',
      locationFilter: 'Location filter',
      allLocations: 'All locations',
      loadList: 'List',
      idInputLabel: 'Enter installedAppId directly',
      get: 'Get',
      loading: 'Loading…',
      listHeader: '{count} installed apps',
      noApps: 'No installed apps to show.',
      manage: 'Manage',
      renameLabel: 'Rename (displayName)',
      newNamePlaceholder: 'New name',
      rename: 'Rename',
      delete: 'Delete',
      rawJson: 'Installed App (raw JSON)',
    },
  },
})

function str(v: unknown): string {
  if (v == null) return ''
  return typeof v === 'string' ? v : String(v)
}

function appName(a: InstalledApp): string {
  return str(a.displayName) || str(a.installedAppId)
}

// --- 위치 필터 ---
const locations = ref<Location[]>([])
const locationId = ref('') // '' = 전체
const locationsLoaded = ref(false)

async function ensureLocations() {
  if (locationsLoaded.value) return
  try {
    const res = await listLocations()
    locations.value = res.items
    locationsLoaded.value = true
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  }
}

// --- 목록 ---
const apps = ref<InstalledApp[]>([])
const listLoading = ref(false)
const listed = ref(false)

async function loadList() {
  listLoading.value = true
  listed.value = false
  try {
    const res = await listInstalledApps(locationId.value || undefined)
    apps.value = res.items
    listed.value = true
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    listLoading.value = false
  }
}

// --- 상세 ---
const detail = ref<InstalledApp | null>(null)
const detailLoading = ref(false)
const idInput = ref('')
const renameInput = ref('')
const busy = ref(false)

const selectedId = computed(() => str(detail.value?.installedAppId))

const locationName = (id?: string) =>
  id ? (locations.value.find((l) => l.locationId === id)?.name ?? '') : ''

const detailInfo = computed<InfoItem[]>(() => {
  const a = detail.value
  if (!a) return []
  const loc = locationName(a.locationId)
  return [
    { label: 'displayName', value: str(a.displayName) },
    { label: 'installedAppId', value: str(a.installedAppId), mono: true },
    { label: 'appId', value: str(a.appId), mono: true },
    { label: 'installedAppType', value: str(a.installedAppType) },
    { label: 'installedAppStatus', value: str(a.installedAppStatus) },
    { label: 'locationId', value: loc ? `${loc} (${str(a.locationId)})` : str(a.locationId), mono: !loc },
    { label: t('createdDate'), value: str(a.createdDate) },
    { label: t('updatedDate'), value: str(a.lastUpdatedDate) },
  ].filter((i) => i.value)
})

async function loadDetail(id: string) {
  const trimmed = id.trim()
  if (!trimmed) return
  detailLoading.value = true
  detail.value = null
  try {
    const a = await getInstalledApp(trimmed)
    detail.value = a
    idInput.value = a.installedAppId
    renameInput.value = str(a.displayName)
    // 위치명 표시를 위해 위치 목록 확보 (실패해도 무시)
    void ensureLocations()
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    detailLoading.value = false
  }
}

function lookupById() {
  loadDetail(idInput.value)
}

async function doRename() {
  const id = selectedId.value
  const name = renameInput.value.trim()
  if (!id || !name) return
  busy.value = true
  try {
    const updated = await renameInstalledApp(id, name)
    detail.value = updated
    renameInput.value = str(updated.displayName)
    // 목록 항목도 갱신
    const idx = apps.value.findIndex((a) => a.installedAppId === id)
    if (idx >= 0) apps.value[idx] = { ...apps.value[idx], displayName: updated.displayName }
    toastSuccess(t('renamed'))
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

async function doDelete() {
  const id = selectedId.value
  if (!id) return
  const name = detail.value ? appName(detail.value) : id
  if (!window.confirm(t('deleteConfirm', { name }))) return
  busy.value = true
  try {
    await deleteInstalledApp(id)
    apps.value = apps.value.filter((a) => a.installedAppId !== id)
    detail.value = null
    toastSuccess(t('deleted'))
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

// 토큰이 있으면 위치 목록 선로딩 (필터 셀렉트용)
if (hasToken.value) void ensureLocations()
</script>

<template>
  <header class="mb-6">
    <h1 class="text-2xl font-extrabold tracking-tight md:text-3xl">{{ t('title') }}</h1>
    <p class="mt-1 text-sm text-muted">{{ t('desc') }}</p>
  </header>

  <CliRef
    :commands="['installedapps [id]', 'installedapps:rename [id] [new-name]', 'installedapps:delete [id]']"
    :docs="[{ label: 'InstalledApps', url: 'https://developer.smartthings.com/docs/api/public/#tag/InstalledApps' }]"
  />

  <div
    v-if="!hasToken"
    class="rounded-xl border-l-[3px] border-warn bg-warn/10 px-4 py-3 text-sm text-warn"
  >
    {{ $t('common.noToken') }}<strong>{{ $t('common.noTokenStrong') }}</strong>{{ $t('common.noTokenTail') }}
  </div>

  <template v-else>
    <div class="grid gap-4 md:grid-cols-2">
      <!-- 위치 필터 + 목록 불러오기 -->
      <div class="rounded-xl border border-line bg-card p-4">
        <label class="text-[11px] font-semibold tracking-wider text-muted uppercase">
          {{ t('locationFilter') }}
        </label>
        <div class="mt-3 flex gap-2">
          <select
            v-model="locationId"
            class="w-full rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
          >
            <option value="">{{ t('allLocations') }}</option>
            <option v-for="l in locations" :key="l.locationId" :value="l.locationId">
              {{ l.name }}
            </option>
          </select>
          <button
            class="shrink-0 rounded-lg border border-transparent bg-gradient-to-br from-brand to-brand-2 px-4 py-2 text-sm font-semibold text-[#061026] transition hover:-translate-y-px disabled:opacity-50"
            :disabled="listLoading"
            @click="loadList"
          >
            {{ t('loadList') }}
          </button>
        </div>
      </div>

      <!-- installedAppId 직접 입력 -->
      <div class="rounded-xl border border-line bg-card p-4">
        <label class="text-[11px] font-semibold tracking-wider text-muted uppercase">
          {{ t('idInputLabel') }}
        </label>
        <div class="mt-3 flex gap-2">
          <input
            v-model="idInput"
            spellcheck="false"
            placeholder="installedAppId"
            class="w-full rounded-lg border border-line bg-bg-2 px-3 py-2 font-mono text-sm text-text outline-none focus:border-brand-2"
            @keyup.enter="lookupById"
          />
          <button
            class="shrink-0 rounded-lg border border-line px-4 py-2 text-sm font-semibold transition hover:-translate-y-px hover:border-brand-2 disabled:opacity-50"
            :disabled="detailLoading"
            @click="lookupById"
          >
            {{ t('get') }}
          </button>
        </div>
      </div>
    </div>

    <!-- 목록 -->
    <div v-if="listLoading" class="mt-8 flex items-center gap-2 text-sm text-muted">
      <span class="size-2 animate-pulse rounded-full bg-brand-2" /> {{ t('loading') }}
    </div>

    <section
      v-else-if="listed"
      class="mt-6 overflow-hidden rounded-xl border border-line bg-card"
    >
      <header class="flex items-center gap-2 border-b border-line px-4 py-3">
        <span class="h-3.5 w-1 rounded-full bg-gradient-to-b from-brand to-brand-2" />
        <h3 class="text-sm font-bold">{{ t('listHeader', { count: apps.length }) }}</h3>
      </header>
      <p v-if="!apps.length" class="px-4 py-6 text-sm text-muted">{{ t('noApps') }}</p>
      <ul v-else class="divide-y divide-line">
        <li v-for="a in apps" :key="a.installedAppId">
          <button
            class="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-bg-2"
            :class="a.installedAppId === selectedId ? 'bg-bg-2' : ''"
            @click="loadDetail(a.installedAppId)"
          >
            <div class="min-w-0">
              <div class="truncate text-sm font-semibold text-text">{{ appName(a) }}</div>
              <div class="truncate font-mono text-[12px] text-brand-2">{{ a.installedAppId }}</div>
            </div>
            <span
              v-if="a.installedAppType"
              class="shrink-0 rounded-full border border-brand-2/40 bg-brand-2/10 px-2.5 py-0.5 text-[11px] font-semibold text-brand-2"
            >
              {{ a.installedAppType }}
            </span>
          </button>
        </li>
      </ul>
    </section>

    <!-- 상세 -->
    <div v-if="detailLoading" class="mt-8 flex items-center gap-2 text-sm text-muted">
      <span class="size-2 animate-pulse rounded-full bg-brand-2" /> {{ t('loading') }}
    </div>

    <div v-else-if="detail" class="mt-6 flex flex-col gap-4">
      <InfoGrid :title="appName(detail)" :items="detailInfo" />

      <!-- rename + delete -->
      <section class="overflow-hidden rounded-xl border border-line bg-card">
        <header class="flex items-center gap-2 border-b border-line px-4 py-3">
          <span class="h-3.5 w-1 rounded-full bg-gradient-to-b from-brand to-brand-2" />
          <h3 class="text-sm font-bold">{{ t('manage') }}</h3>
        </header>
        <div class="flex flex-col gap-3 p-4">
          <div>
            <label class="text-[11px] font-semibold tracking-wider text-muted uppercase">
              {{ t('renameLabel') }}
            </label>
            <div class="mt-2 flex gap-2">
              <input
                v-model="renameInput"
                spellcheck="false"
                :placeholder="t('newNamePlaceholder')"
                class="w-full rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
                @keyup.enter="doRename"
              />
              <button
                class="shrink-0 rounded-lg border border-line px-4 py-2 text-sm font-semibold transition hover:-translate-y-px hover:border-brand-2 disabled:opacity-50"
                :disabled="busy || !renameInput.trim()"
                @click="doRename"
              >
                {{ t('rename') }}
              </button>
            </div>
          </div>
          <div class="flex justify-end border-t border-line pt-3">
            <button
              class="rounded-lg border border-warn/50 bg-warn/10 px-4 py-2 text-sm font-semibold text-warn transition hover:border-warn disabled:opacity-50"
              :disabled="busy"
              @click="doDelete"
            >
              {{ t('delete') }}
            </button>
          </div>
        </div>
      </section>

      <JsonView :value="detail" :label="t('rawJson')" />
    </div>
  </template>
</template>
