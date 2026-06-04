<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
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
    { label: '생성', value: str(d.created) },
    { label: '최종 수정', value: str(d.lastModified) },
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
  if (!lid) return toastError('먼저 위치를 선택하세요.')
  const rid = (id ?? selectedRoomId.value).trim()
  if (!rid) return toastError('방을 선택하세요.')
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
  if (!lid) return toastError('먼저 위치를 선택하세요.')
  const parsed = parseJsonOrYaml(editor.value)
  if (!parsed.ok) return toastError(parsed.error ?? '파싱 오류')
  busy.value = true
  try {
    const created = await createRoom(lid, parsed.json)
    result.value = created
    detail.value = created
    if (created?.roomId) selectedRoomId.value = created.roomId
    toastSuccess('방을 생성했습니다.')
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
  if (!lid) return toastError('먼저 위치를 선택하세요.')
  if (!rid) return toastError('수정할 방을 선택하세요.')
  const parsed = parseJsonOrYaml(editor.value)
  if (!parsed.ok) return toastError(parsed.error ?? '파싱 오류')
  busy.value = true
  try {
    const updated = await updateRoom(lid, rid, parsed.json)
    result.value = updated
    detail.value = updated
    toastSuccess('방을 수정했습니다.')
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
  if (!lid) return toastError('먼저 위치를 선택하세요.')
  if (!rid) return toastError('삭제할 방을 선택하세요.')
  if (!window.confirm(`방 "${rid}" 를 삭제할까요? 되돌릴 수 없습니다.`)) return
  busy.value = true
  try {
    await deleteRoom(lid, rid)
    result.value = { message: `방 "${rid}" 삭제 성공` }
    detail.value = null
    selectedRoomId.value = ''
    toastSuccess('방을 삭제했습니다.')
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
    <h1 class="text-2xl font-extrabold tracking-tight md:text-3xl">Room</h1>
    <p class="mt-1 text-sm text-muted">위치를 선택한 뒤 그 위치의 방을 조회·생성·수정·삭제합니다.</p>
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
    PAT 토큰이 없습니다. 우측 상단의 <strong>PAT 설정</strong> 으로 토큰을 입력하세요.
  </div>

  <template v-else>
    <!-- 위치 → 방 선택 -->
    <section class="rounded-xl border border-line bg-card p-4">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-semibold tracking-wider text-muted uppercase">
          위치 → 방 선택
        </span>
        <button
          class="rounded-md border border-line px-2 py-1 text-xs text-muted transition hover:border-brand-2 hover:text-brand-2"
          :disabled="locationsLoading"
          @click="loadLocations"
        >
          {{ locationsLoading ? '불러오는 중…' : '↻ 새로고침' }}
        </button>
      </div>
      <div class="mt-3 grid gap-3 sm:grid-cols-2">
        <select
          v-model="selectedLocationId"
          class="rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
          @change="loadRooms"
        >
          <option value="">위치 선택 ({{ locations.length }})</option>
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
              {{ roomsLoading ? '불러오는 중…' : `방 선택 (${rooms.length})` }}
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
            조회
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
          <CopyButton :text="detail.roomId" title="roomId 복사" />
        </div>
      </section>
      <InfoGrid title="방 정보" :items="detailInfo" />
    </div>

    <!-- 에디터 -->
    <section class="mt-4 rounded-xl border border-line bg-card p-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <span class="text-[11px] font-semibold tracking-wider text-muted uppercase">
          정의 (JSON 또는 YAML)
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
            :disabled="busy"
            @click="doUpdate"
          >
            수정
          </button>
          <button
            class="rounded-lg border border-warn/50 bg-warn/10 px-4 py-1.5 text-sm font-semibold text-warn transition hover:-translate-y-px hover:border-warn disabled:opacity-50"
            :disabled="busy"
            @click="doDelete"
          >
            삭제
          </button>
        </div>
      </div>
      <textarea
        v-model="editor"
        spellcheck="false"
        rows="10"
        placeholder='방 정의를 JSON 또는 YAML 로 입력하세요. 예: { "name": "거실" }'
        class="mt-3 w-full resize-y rounded-lg border border-line bg-bg-2 px-3 py-2 font-mono text-[13px] leading-relaxed text-text outline-none focus:border-brand-2"
      />
      <p class="mt-2 text-xs text-muted">
        방은 선택된 위치 하위에 생성됩니다. 본문은 <code class="font-mono text-brand-2">name</code> 만 사용합니다.
      </p>
    </section>

    <!-- 결과 -->
    <div v-if="result" class="mt-4">
      <JsonView :value="result" label="결과" :default-open="true" />
    </div>
  </template>
</template>
