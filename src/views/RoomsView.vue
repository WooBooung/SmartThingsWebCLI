<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useTokenStore } from '@/stores/token'
import { listLocations } from '@/lib/stClient'
import type { Location } from '@/lib/types'
import {
  listLocationRooms,
  getRoom,
  createRoom,
  updateRoom,
  deleteRoom,
  type RoomDetail,
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
      title: 'Room',
      subtitle: '위치를 선택한 뒤 그 위치의 방을 조회·생성·수정·삭제합니다.',
      noTokenPre: 'PAT 토큰이 없습니다. 우측 상단의',
      patSettings: 'PAT 설정',
      noTokenPost: '으로 토큰을 입력하세요.',
      selectLabel: '위치 → 방 선택',
      loading: '불러오는 중…',
      refresh: '↻ 새로고침',
      locationPlaceholder: '위치 선택 ({count})',
      roomPlaceholder: '방 선택 ({count})',
      get: '조회',
      detailTitle: '방 정보',
      copyRoomId: 'roomId 복사',
      created: '생성',
      lastModified: '최종 수정',
      defLabel: '정의 (JSON 또는 YAML)',
      create: '생성',
      update: '수정',
      delete: '삭제',
      editorPlaceholder: '방 정의를 JSON 또는 YAML 로 입력하세요. 예: { "name": "거실" }',
      editorHintPre: '방은 선택된 위치 하위에 생성됩니다. 본문은',
      editorHintPost: '만 사용합니다.',
      resultLabel: '결과',
      errSelectLocation: '먼저 위치를 선택하세요.',
      errSelectRoom: '방을 선택하세요.',
      errUpdateRoom: '수정할 방을 선택하세요.',
      errDeleteRoom: '삭제할 방을 선택하세요.',
      parseError: '파싱 오류',
      confirmDelete: '방 "{id}" 를 삭제할까요? 되돌릴 수 없습니다.',
      deleteSuccessMsg: '방 "{id}" 삭제 성공',
      createdToast: '방을 생성했습니다.',
      updatedToast: '방을 수정했습니다.',
      deletedToast: '방을 삭제했습니다.',
    },
    en: {
      title: 'Room',
      subtitle: 'Select a location, then query, create, update, and delete its rooms.',
      noTokenPre: 'No PAT token. Use',
      patSettings: 'PAT Settings',
      noTokenPost: 'in the top-right to enter a token.',
      selectLabel: 'Location → Room',
      loading: 'Loading…',
      refresh: '↻ Refresh',
      locationPlaceholder: 'Select a location ({count})',
      roomPlaceholder: 'Select a room ({count})',
      get: 'Get',
      detailTitle: 'Room Info',
      copyRoomId: 'Copy roomId',
      created: 'Created',
      lastModified: 'Last Modified',
      defLabel: 'Definition (JSON or YAML)',
      create: 'Create',
      update: 'Update',
      delete: 'Delete',
      editorPlaceholder: 'Enter a room definition as JSON or YAML. e.g. { "name": "Living Room" }',
      editorHintPre: 'A room is created under the selected location. The body only uses',
      editorHintPost: '.',
      resultLabel: 'Result',
      errSelectLocation: 'Select a location first.',
      errSelectRoom: 'Select a room.',
      errUpdateRoom: 'Select a room to update.',
      errDeleteRoom: 'Select a room to delete.',
      parseError: 'Parse error',
      confirmDelete: 'Delete room "{id}"? This cannot be undone.',
      deleteSuccessMsg: 'Room "{id}" deleted successfully',
      createdToast: 'Room created.',
      updatedToast: 'Room updated.',
      deletedToast: 'Room deleted.',
    },
  },
})

const locations = ref<Location[]>([])
const locationsLoading = ref(false)
const selectedLocationId = ref('')

const rooms = ref<RoomDetail[]>([])
const roomsLoading = ref(false)
const selectedRoomId = ref('')

const detail = ref<RoomDetail | null>(null)
const editor = ref('')
const result = ref<unknown>(null)
const busy = ref(false)

function str(v: unknown): string {
  if (v == null) return ''
  return typeof v === 'string' ? v : String(v)
}

const detailInfo = computed<InfoItem[]>(() => {
  const d = detail.value
  if (!d) return []
  const items: InfoItem[] = [
    { label: 'roomId', value: str(d.roomId), mono: true },
    { label: 'locationId', value: str(d.locationId), mono: true },
    { label: t('created'), value: str(d.created) },
    { label: t('lastModified'), value: str(d.lastModified) },
  ]
  return items.filter((i) => i.value)
})

async function loadLocations() {
  if (!hasToken.value) return
  locationsLoading.value = true
  try {
    const res = await listLocations()
    locations.value = (res.items ?? []).sort((a, b) => a.name.localeCompare(b.name))
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    locationsLoading.value = false
  }
}

async function loadRooms() {
  const lid = selectedLocationId.value.trim()
  rooms.value = []
  selectedRoomId.value = ''
  detail.value = null
  result.value = null
  if (!lid) return
  roomsLoading.value = true
  try {
    const res = await listLocationRooms(lid)
    rooms.value = (res.items ?? []).sort((a, b) => a.name.localeCompare(b.name))
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    roomsLoading.value = false
  }
}

async function doGet(id?: string) {
  const lid = selectedLocationId.value.trim()
  if (!lid) return toastError(t('errSelectLocation'))
  const rid = (id ?? selectedRoomId.value).trim()
  if (!rid) return toastError(t('errSelectRoom'))
  selectedRoomId.value = rid
  busy.value = true
  detail.value = null
  result.value = null
  try {
    const data = await getRoom(lid, rid)
    detail.value = data
    editor.value = JSON.stringify(data, null, 2)
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

function onSelectRoom() {
  if (selectedRoomId.value) doGet(selectedRoomId.value)
}

async function doCreate() {
  const lid = selectedLocationId.value.trim()
  if (!lid) return toastError(t('errSelectLocation'))
  const parsed = parseJsonOrYaml(editor.value)
  if (!parsed.ok) return toastError(parsed.error ?? t('parseError'))
  busy.value = true
  try {
    const created = await createRoom(lid, parsed.json)
    result.value = created
    detail.value = created
    if (created?.roomId) selectedRoomId.value = created.roomId
    toastSuccess(t('createdToast'))
    await loadRooms()
    if (created?.roomId) selectedRoomId.value = created.roomId
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

async function doUpdate() {
  const lid = selectedLocationId.value.trim()
  const rid = selectedRoomId.value.trim()
  if (!lid) return toastError(t('errSelectLocation'))
  if (!rid) return toastError(t('errUpdateRoom'))
  const parsed = parseJsonOrYaml(editor.value)
  if (!parsed.ok) return toastError(parsed.error ?? t('parseError'))
  busy.value = true
  try {
    const updated = await updateRoom(lid, rid, parsed.json)
    result.value = updated
    detail.value = updated
    toastSuccess(t('updatedToast'))
    await loadRooms()
    selectedRoomId.value = rid
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

async function doDelete() {
  const lid = selectedLocationId.value.trim()
  const rid = selectedRoomId.value.trim()
  if (!lid) return toastError(t('errSelectLocation'))
  if (!rid) return toastError(t('errDeleteRoom'))
  if (!window.confirm(t('confirmDelete', { id: rid }))) return
  busy.value = true
  try {
    await deleteRoom(lid, rid)
    result.value = { message: t('deleteSuccessMsg', { id: rid }) }
    detail.value = null
    selectedRoomId.value = ''
    toastSuccess(t('deletedToast'))
    await loadRooms()
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
    <h1 class="text-2xl font-extrabold tracking-tight md:text-3xl">{{ t('title') }}</h1>
    <p class="mt-1 text-sm text-muted">{{ t('subtitle') }}</p>
  </header>
  <CliRef
    :commands="[
      'locations:rooms [id]',
      'locations:rooms:create',
      'locations:rooms:update [id]',
      'locations:rooms:delete [id]',
    ]"
    :docs="[
      { label: 'Rooms', url: 'https://developer.smartthings.com/docs/api/public/#tag/Rooms' },
    ]"
  />

  <div
    v-if="!hasToken"
    class="rounded-xl border-l-[3px] border-warn bg-warn/10 px-4 py-3 text-sm text-warn"
  >
    {{ t('noTokenPre') }} <strong>{{ t('patSettings') }}</strong> {{ t('noTokenPost') }}
  </div>

  <template v-else>
    <!-- 위치 → 방 선택 -->
    <section class="rounded-xl border border-line bg-card p-4">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-semibold tracking-wider text-muted uppercase">
          {{ t('selectLabel') }}
        </span>
        <button
          class="rounded-md border border-line px-2 py-1 text-xs text-muted transition hover:border-brand-2 hover:text-brand-2"
          :disabled="locationsLoading"
          @click="loadLocations"
        >
          {{ locationsLoading ? t('loading') : t('refresh') }}
        </button>
      </div>
      <div class="mt-3 grid gap-3 sm:grid-cols-2">
        <select
          v-model="selectedLocationId"
          class="rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
          @change="loadRooms"
        >
          <option value="">{{ t('locationPlaceholder', { count: locations.length }) }}</option>
          <option v-for="l in locations" :key="l.locationId" :value="l.locationId">
            {{ l.name }}
          </option>
        </select>
        <div class="flex gap-2">
          <select
            v-model="selectedRoomId"
            class="w-full rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2 disabled:opacity-50"
            :disabled="!selectedLocationId || roomsLoading"
            @change="onSelectRoom"
          >
            <option value="">
              {{ roomsLoading ? t('loading') : t('roomPlaceholder', { count: rooms.length }) }}
            </option>
            <option v-for="r in rooms" :key="r.roomId" :value="r.roomId">
              {{ r.name }}
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
      </div>
    </section>

    <!-- 상세 -->
    <div v-if="detail" class="mt-4 flex flex-col gap-4">
      <section class="hero-glow overflow-hidden rounded-2xl border border-brand-2/25 p-5">
        <h2 class="truncate text-xl font-extrabold tracking-tight">{{ detail.name }}</h2>
        <div class="mt-3 flex items-center gap-2">
          <code class="truncate rounded-md bg-black/25 px-2 py-1 font-mono text-[12.5px] text-muted">
            {{ detail.roomId }}
          </code>
          <CopyButton :text="detail.roomId" :title="t('copyRoomId')" />
        </div>
      </section>
      <InfoGrid :title="t('detailTitle')" :items="detailInfo" />
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
        rows="10"
        :placeholder="t('editorPlaceholder')"
        class="mt-3 w-full resize-y rounded-lg border border-line bg-bg-2 px-3 py-2 font-mono text-[13px] leading-relaxed text-text outline-none focus:border-brand-2"
      />
      <p class="mt-2 text-xs text-muted">
        {{ t('editorHintPre') }} <code class="font-mono text-brand-2">name</code> {{ t('editorHintPost') }}
      </p>
    </section>

    <!-- 결과 -->
    <div v-if="result" class="mt-4">
      <JsonView :value="result" :label="t('resultLabel')" :default-open="true" />
    </div>
  </template>
</template>
