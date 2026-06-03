<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { listLocations, listDevices, listRooms } from '@/lib/stClient'
import type { Device } from '@/lib/types'
import { toastError } from '@/lib/toast'

export interface DeviceSelection {
  device: Device
  locationName: string
  roomName: string
}

const emit = defineEmits<{ (e: 'select', payload: DeviceSelection): void }>()

const loading = ref(false)
const locationName = ref(new Map<string, string>())
const devicesByLoc = ref(new Map<string, Device[]>())
// locationId -> (roomId -> name)
const roomsByLoc = ref(new Map<string, Map<string, string>>())

const selectedLoc = ref('')
const selectedDevId = ref('')

const locationOptions = computed(() =>
  [...devicesByLoc.value.keys()]
    .map((id) => ({ id, name: locationName.value.get(id) ?? id, count: devicesByLoc.value.get(id)!.length }))
    .sort((a, b) => a.name.localeCompare(b.name)),
)

const deviceOptions = computed(() => {
  const list = devicesByLoc.value.get(selectedLoc.value) ?? []
  return [...list].sort((a, b) => {
    const na = a.label || a.name || a.deviceId
    const nb = b.label || b.name || b.deviceId
    return na.localeCompare(nb)
  })
})

async function load() {
  loading.value = true
  devicesByLoc.value = new Map()
  locationName.value = new Map()
  selectedLoc.value = ''
  selectedDevId.value = ''
  try {
    const [locRes, devRes] = await Promise.all([listLocations(), listDevices()])
    locationName.value = new Map(locRes.items.map((l) => [l.locationId, l.name]))

    const map = new Map<string, Device[]>()
    for (const d of devRes.items) {
      const key = d.locationId ?? '(위치 없음)'
      if (!locationName.value.has(key) && key === '(위치 없음)') locationName.value.set(key, '(위치 없음)')
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(d)
    }
    devicesByLoc.value = map

    // 위치가 하나뿐이면 자동 선택
    if (map.size === 1) {
      selectedLoc.value = [...map.keys()][0]
      void onLocationChange()
    }
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    loading.value = false
  }
}

async function ensureRooms(locationId: string) {
  if (roomsByLoc.value.has(locationId) || locationId === '(위치 없음)') return
  try {
    const res = await listRooms(locationId)
    roomsByLoc.value.set(locationId, new Map(res.items.map((r) => [r.roomId, r.name])))
  } catch {
    // 룸 조회 실패는 치명적 아님 — 룸 이름 없이 진행
    roomsByLoc.value.set(locationId, new Map())
  }
}

async function onLocationChange() {
  selectedDevId.value = ''
  if (selectedLoc.value) await ensureRooms(selectedLoc.value)
}

function onDeviceChange() {
  const device = deviceOptions.value.find((d) => d.deviceId === selectedDevId.value)
  if (!device) return
  const rooms = roomsByLoc.value.get(selectedLoc.value)
  emit('select', {
    device,
    locationName: locationName.value.get(selectedLoc.value) ?? selectedLoc.value,
    roomName: (device.roomId && rooms?.get(device.roomId)) || '',
  })
}

defineExpose({ reload: load })
onMounted(load)
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- 1단계: 위치 -->
    <div class="flex items-center gap-2">
      <span class="w-12 shrink-0 text-xs font-semibold text-muted">위치</span>
      <select
        v-model="selectedLoc"
        class="w-full rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2 disabled:opacity-50"
        :disabled="loading"
        @change="onLocationChange"
      >
        <option value="" disabled>{{ loading ? '불러오는 중…' : '위치 선택' }}</option>
        <option v-for="l in locationOptions" :key="l.id" :value="l.id">
          {{ l.name }} ({{ l.count }})
        </option>
      </select>
      <button
        class="shrink-0 rounded-lg border border-line px-3 py-2 text-sm text-muted transition hover:border-brand-2 hover:text-brand-2 disabled:opacity-50"
        :disabled="loading"
        title="새로고침"
        @click="load"
      >
        ↻
      </button>
    </div>

    <!-- 2단계: 디바이스 -->
    <div class="flex items-center gap-2">
      <span class="w-12 shrink-0 text-xs font-semibold text-muted">기기</span>
      <select
        v-model="selectedDevId"
        class="w-full rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2 disabled:opacity-50"
        :disabled="!selectedLoc || loading"
        @change="onDeviceChange"
      >
        <option value="" disabled>
          {{ selectedLoc ? '디바이스 선택' : '먼저 위치를 선택하세요' }}
        </option>
        <option v-for="d in deviceOptions" :key="d.deviceId" :value="d.deviceId">
          {{ d.label || d.name || d.deviceId }}
        </option>
      </select>
    </div>
  </div>
</template>
