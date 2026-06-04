<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useTokenStore } from '@/stores/token'
import {
  listLocationsFull,
  getLocation,
  createLocation,
  updateLocation,
  deleteLocation,
  getLocationHistory,
  type LocationDetail,
} from '@/lib/api/locations'
import { parseJsonOrYaml } from '@/lib/yaml'
import { toastError, toastSuccess } from '@/lib/toast'
import InfoGrid, { type InfoItem } from '@/components/InfoGrid.vue'
import JsonView from '@/components/JsonView.vue'
import CopyButton from '@/components/CopyButton.vue'
import CliRef from '@/components/CliRef.vue'

const { hasToken } = storeToRefs(useTokenStore())

const { t } = useI18n({
  useScope: 'local',
  inheritLocale: true,
  messages: {
    ko: {
      title: 'Location',
      subtitle: '위치를 조회·생성·수정·삭제하고 이벤트 이력을 봅니다.',
      noTokenPre: 'PAT 토큰이 없습니다. 우측 상단의',
      patSettings: 'PAT 설정',
      noTokenPost: '으로 토큰을 입력하세요.',
      selectLabel: '위치 선택',
      loading: '불러오는 중…',
      refresh: '↻ 새로고침',
      selectPlaceholder: '위치 선택 ({count})',
      get: '조회',
      detailTitle: '위치 정보',
      copyLocationId: 'locationId 복사',
      historyTitle: '이력 (history)',
      historyLoad: '최근 20건 조회',
      historyEmpty: '이력이 없습니다.',
      historyLabel: 'Location History',
      historyHint: '버튼을 눌러 이 위치의 최근 디바이스 이벤트 이력을 조회합니다.',
      defLabel: '정의 (JSON 또는 YAML)',
      create: '생성',
      update: '수정',
      delete: '삭제',
      editorPlaceholder:
        '위치 정의를 JSON 또는 YAML 로 입력하세요. 예: { "name": "우리집", "countryCode": "KOR", "temperatureScale": "C" }',
      editorHintPre: '생성 시',
      editorHintPost: '가 필수입니다. 수정은 선택된 위치에 적용됩니다.',
      resultLabel: '결과',
      countryCode: '국가 코드',
      temperatureScale: '온도 단위',
      timeZone: '시간대',
      locale: '로케일',
      latLng: '위도 / 경도',
      regionRadius: '영역 반경(m)',
      errSelectId: 'Location ID 를 선택하거나 입력하세요.',
      errUpdateId: '수정할 Location ID 를 선택하세요.',
      errDeleteId: '삭제할 Location ID 를 선택하세요.',
      parseError: '파싱 오류',
      confirmDelete: '위치 "{id}" 를 삭제할까요? 되돌릴 수 없습니다.',
      deleteSuccessMsg: '위치 "{id}" 삭제 성공',
      createdToast: '위치를 생성했습니다.',
      updatedToast: '위치를 수정했습니다.',
      deletedToast: '위치를 삭제했습니다.',
    },
    en: {
      title: 'Location',
      subtitle: 'Query, create, update, and delete locations, and view event history.',
      noTokenPre: 'No PAT token. Use',
      patSettings: 'PAT Settings',
      noTokenPost: 'in the top-right to enter a token.',
      selectLabel: 'Select Location',
      loading: 'Loading…',
      refresh: '↻ Refresh',
      selectPlaceholder: 'Select a location ({count})',
      get: 'Get',
      detailTitle: 'Location Info',
      copyLocationId: 'Copy locationId',
      historyTitle: 'History',
      historyLoad: 'Get latest 20',
      historyEmpty: 'No history.',
      historyLabel: 'Location History',
      historyHint: 'Click the button to query recent device event history for this location.',
      defLabel: 'Definition (JSON or YAML)',
      create: 'Create',
      update: 'Update',
      delete: 'Delete',
      editorPlaceholder:
        'Enter a location definition as JSON or YAML. e.g. { "name": "My Home", "countryCode": "KOR", "temperatureScale": "C" }',
      editorHintPre: 'On create,',
      editorHintPost: 'are required. Update applies to the selected location.',
      resultLabel: 'Result',
      countryCode: 'Country Code',
      temperatureScale: 'Temperature Scale',
      timeZone: 'Time Zone',
      locale: 'Locale',
      latLng: 'Latitude / Longitude',
      regionRadius: 'Region Radius (m)',
      errSelectId: 'Select or enter a Location ID.',
      errUpdateId: 'Select a Location ID to update.',
      errDeleteId: 'Select a Location ID to delete.',
      parseError: 'Parse error',
      confirmDelete: 'Delete location "{id}"? This cannot be undone.',
      deleteSuccessMsg: 'Location "{id}" deleted successfully',
      createdToast: 'Location created.',
      updatedToast: 'Location updated.',
      deletedToast: 'Location deleted.',
    },
  },
})

const locations = ref<LocationDetail[]>([])
const listLoading = ref(false)
const selectedId = ref('')

const detail = ref<LocationDetail | null>(null)
const editor = ref('')
const result = ref<unknown>(null)
const busy = ref(false)

const history = ref<Record<string, unknown>[] | null>(null)
const historyLoading = ref(false)

function str(v: unknown): string {
  if (v == null) return ''
  return typeof v === 'string' ? v : String(v)
}

const detailInfo = computed<InfoItem[]>(() => {
  const d = detail.value
  if (!d) return []
  const items: InfoItem[] = [
    { label: 'locationId', value: str(d.locationId), mono: true },
    { label: t('countryCode'), value: str(d.countryCode) },
    { label: t('temperatureScale'), value: str(d.temperatureScale) },
    { label: t('timeZone'), value: str(d.timeZoneId) },
    { label: t('locale'), value: str(d.locale) },
    { label: t('latLng'), value: [d.latitude, d.longitude].filter((x) => x != null).join(' , ') },
    { label: t('regionRadius'), value: d.regionRadius != null ? String(d.regionRadius) : '' },
  ]
  return items.filter((i) => i.value)
})

async function loadList() {
  if (!hasToken.value) return
  listLoading.value = true
  try {
    const res = await listLocationsFull()
    locations.value = (res.items ?? []).sort((a, b) => a.name.localeCompare(b.name))
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    listLoading.value = false
  }
}

async function doGet(id?: string) {
  const lid = (id ?? selectedId.value).trim()
  if (!lid) {
    toastError(t('errSelectId'))
    return
  }
  selectedId.value = lid
  busy.value = true
  detail.value = null
  result.value = null
  history.value = null
  try {
    const data = await getLocation(lid)
    detail.value = data
    editor.value = JSON.stringify(data, null, 2)
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

function onSelect() {
  if (selectedId.value) doGet(selectedId.value)
}

async function doCreate() {
  const parsed = parseJsonOrYaml(editor.value)
  if (!parsed.ok) return toastError(parsed.error ?? t('parseError'))
  busy.value = true
  try {
    const created = await createLocation(parsed.json)
    result.value = created
    detail.value = created
    if (created?.locationId) selectedId.value = created.locationId
    toastSuccess(t('createdToast'))
    await loadList()
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

async function doUpdate() {
  const lid = selectedId.value.trim()
  if (!lid) return toastError(t('errUpdateId'))
  const parsed = parseJsonOrYaml(editor.value)
  if (!parsed.ok) return toastError(parsed.error ?? t('parseError'))
  busy.value = true
  try {
    const updated = await updateLocation(lid, parsed.json)
    result.value = updated
    detail.value = updated
    toastSuccess(t('updatedToast'))
    await loadList()
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

async function doDelete() {
  const lid = selectedId.value.trim()
  if (!lid) return toastError(t('errDeleteId'))
  if (!window.confirm(t('confirmDelete', { id: lid }))) return
  busy.value = true
  try {
    await deleteLocation(lid)
    result.value = { message: t('deleteSuccessMsg', { id: lid }) }
    detail.value = null
    selectedId.value = ''
    toastSuccess(t('deletedToast'))
    await loadList()
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

async function loadHistory() {
  const lid = selectedId.value.trim()
  if (!lid) return
  historyLoading.value = true
  try {
    const res = await getLocationHistory(lid, 20)
    history.value = res.items ?? []
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    historyLoading.value = false
  }
}

onMounted(loadList)
</script>

<template>
  <header class="mb-6">
    <h1 class="text-2xl font-extrabold tracking-tight md:text-3xl">{{ t('title') }}</h1>
    <p class="mt-1 text-sm text-muted">{{ t('subtitle') }}</p>
  </header>
  <CliRef
    :commands="[
      'locations [id]',
      'locations:create',
      'locations:update [id]',
      'locations:delete [id]',
      'locations:history [id]',
    ]"
    :docs="[
      { label: 'Locations', url: 'https://developer.smartthings.com/docs/api/public/#tag/Locations' },
      { label: 'History', url: 'https://developer.smartthings.com/docs/api/public/#tag/History' },
    ]"
  />

  <div
    v-if="!hasToken"
    class="rounded-xl border-l-[3px] border-warn bg-warn/10 px-4 py-3 text-sm text-warn"
  >
    {{ t('noTokenPre') }} <strong>{{ t('patSettings') }}</strong> {{ t('noTokenPost') }}
  </div>

  <template v-else>
    <!-- 선택 -->
    <section class="rounded-xl border border-line bg-card p-4">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-semibold tracking-wider text-muted uppercase">
          {{ t('selectLabel') }}
        </span>
        <button
          class="rounded-md border border-line px-2 py-1 text-xs text-muted transition hover:border-brand-2 hover:text-brand-2"
          :disabled="listLoading"
          @click="loadList"
        >
          {{ listLoading ? t('loading') : t('refresh') }}
        </button>
      </div>
      <div class="mt-3 flex flex-wrap gap-2">
        <select
          v-model="selectedId"
          class="min-w-56 flex-1 rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
          @change="onSelect"
        >
          <option value="">{{ t('selectPlaceholder', { count: locations.length }) }}</option>
          <option v-for="l in locations" :key="l.locationId" :value="l.locationId">
            {{ l.name }} — {{ l.locationId }}
          </option>
        </select>
        <button
          class="shrink-0 rounded-lg border border-line px-4 py-2 text-sm font-semibold transition hover:-translate-y-px hover:border-brand-2 disabled:opacity-50"
          :disabled="busy"
          @click="doGet()"
        >
          {{ t('get') }}
        </button>
      </div>
    </section>

    <!-- 상세 -->
    <div v-if="detail" class="mt-4 flex flex-col gap-4">
      <section class="hero-glow overflow-hidden rounded-2xl border border-brand-2/25 p-5">
        <h2 class="truncate text-xl font-extrabold tracking-tight">{{ detail.name }}</h2>
        <div class="mt-3 flex items-center gap-2">
          <code class="truncate rounded-md bg-black/25 px-2 py-1 font-mono text-[12.5px] text-muted">
            {{ detail.locationId }}
          </code>
          <CopyButton :text="detail.locationId" :title="t('copyLocationId')" />
        </div>
      </section>
      <InfoGrid :title="t('detailTitle')" :items="detailInfo" />

      <!-- 이력 -->
      <section class="overflow-hidden rounded-xl border border-line bg-card">
        <header class="flex items-center gap-2 border-b border-line px-4 py-3">
          <span class="h-3.5 w-1 rounded-full bg-gradient-to-b from-brand to-brand-2" />
          <h3 class="text-sm font-bold">{{ t('historyTitle') }}</h3>
          <button
            class="ml-auto rounded-md border border-line px-3 py-1 text-xs font-semibold text-muted transition hover:border-brand-2 hover:text-brand-2 disabled:opacity-50"
            :disabled="historyLoading"
            @click="loadHistory"
          >
            {{ historyLoading ? t('loading') : t('historyLoad') }}
          </button>
        </header>
        <div v-if="history" class="p-4">
          <p v-if="!history.length" class="text-sm text-muted">{{ t('historyEmpty') }}</p>
          <JsonView v-else :value="history" :label="t('historyLabel')" :default-open="true" />
        </div>
        <p v-else class="px-4 py-3 text-xs text-muted">
          {{ t('historyHint') }}
        </p>
      </section>
    </div>

    <!-- 에디터 -->
    <section class="mt-4 rounded-xl border border-line bg-card p-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <span class="text-[11px] font-semibold tracking-wider text-muted uppercase">
          {{ t('defLabel') }}
        </span>
        <div class="flex gap-2">
          <button
            class="rounded-lg border border-transparent bg-gradient-to-br from-brand to-brand-2 px-4 py-1.5 text-sm font-semibold text-[#061026] transition hover:-translate-y-px disabled:opacity-50"
            :disabled="busy"
            @click="doCreate"
          >
            {{ t('create') }}
          </button>
          <button
            class="rounded-lg border border-line px-4 py-1.5 text-sm font-semibold transition hover:-translate-y-px hover:border-brand-2 disabled:opacity-50"
            :disabled="busy"
            @click="doUpdate"
          >
            {{ t('update') }}
          </button>
          <button
            class="rounded-lg border border-warn/50 bg-warn/10 px-4 py-1.5 text-sm font-semibold text-warn transition hover:-translate-y-px hover:border-warn disabled:opacity-50"
            :disabled="busy"
            @click="doDelete"
          >
            {{ t('delete') }}
          </button>
        </div>
      </div>
      <textarea
        v-model="editor"
        spellcheck="false"
        rows="14"
        :placeholder="t('editorPlaceholder')"
        class="mt-3 w-full resize-y rounded-lg border border-line bg-bg-2 px-3 py-2 font-mono text-[13px] leading-relaxed text-text outline-none focus:border-brand-2"
      />
      <p class="mt-2 text-xs text-muted">
        {{ t('editorHintPre') }} <code class="font-mono text-brand-2">name</code>,
        <code class="font-mono text-brand-2">countryCode</code> {{ t('editorHintPost') }}
      </p>
    </section>

    <!-- 결과 -->
    <div v-if="result" class="mt-4">
      <JsonView :value="result" :label="t('resultLabel')" :default-open="true" />
    </div>
  </template>
</template>
