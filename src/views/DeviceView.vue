<script setup lang="ts">
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useTokenStore } from '@/stores/token'
import { getDevice, getDeviceStatus, listDevices, listLocations, listRooms } from '@/lib/stClient'
import type { Device } from '@/lib/types'
import { toastError } from '@/lib/toast'
import DeviceSelect, { type DeviceSelection } from '@/components/DeviceSelect.vue'
import InfoGrid, { type InfoItem } from '@/components/InfoGrid.vue'
import CopyButton from '@/components/CopyButton.vue'
import JsonView from '@/components/JsonView.vue'
import CliRef from '@/components/CliRef.vue'

const { hasToken } = storeToRefs(useTokenStore())

const deviceIdInput = ref('')
const detail = ref<Device | null>(null)
const status = ref<Record<string, unknown> | null>(null)
const locationName = ref('')
const roomName = ref('')
const loading = ref(false)

function str(v: unknown): string {
  if (v == null) return ''
  return typeof v === 'string' ? v : String(v)
}

const heroTitle = computed(() => {
  const d = detail.value
  return d ? str(d.label) || str(d.name) || str(d.deviceId) : ''
})
const heroType = computed(() => str(detail.value?.type) || str(detail.value?.deviceTypeName))
const heroPlace = computed(() => [locationName.value, roomName.value].filter(Boolean).join(' · '))

// --- 디바이스 상세 정보 블록 (hero 에 없는 필드들) ---
const deviceInfo = computed<InfoItem[]>(() => {
  const d = detail.value
  if (!d) return []
  const items: InfoItem[] = [
    { label: '디바이스 타입명', value: str(d.deviceTypeName) },
    { label: '제조사', value: str(d['manufacturerName']) },
    { label: 'deviceId', value: str(d.deviceId), mono: true },
    { label: 'locationId', value: str(d.locationId), mono: true },
    { label: 'roomId', value: str(d.roomId), mono: true },
    {
      label: 'presentationId',
      value: str(d['presentationId']),
      mono: true,
      to: str(d['presentationId'])
        ? `/presentation?presentationId=${encodeURIComponent(str(d['presentationId']))}`
        : undefined,
      actionLabel: 'Presentation',
    },
    { label: 'profileId', value: str((d['profile'] as { id?: string } | undefined)?.id), mono: true },
  ]
  const comps = d['components']
  if (Array.isArray(comps)) {
    const capCount = comps.reduce(
      (n: number, c: unknown) =>
        n +
        (c && typeof c === 'object' && Array.isArray((c as { capabilities?: unknown[] }).capabilities)
          ? (c as { capabilities: unknown[] }).capabilities.length
          : 0),
      0,
    )
    items.push({ label: '컴포넌트 / capability', value: `${comps.length} / ${capCount}` })
  }
  return items.filter((i) => i.value)
})

// --- 현재 상태 칩 (main 컴포넌트 attribute 평탄화) ---
interface StatusChip {
  cap: string
  attr: string
  value: string
}
const statusChips = computed<StatusChip[]>(() => {
  const components = (status.value as { components?: Record<string, unknown> } | null)?.components
  const main = components?.['main'] as
    | Record<string, Record<string, { value?: unknown; unit?: string }>>
    | undefined
  if (!main) return []
  const out: StatusChip[] = []
  for (const [cap, attrs] of Object.entries(main)) {
    for (const [attr, data] of Object.entries(attrs)) {
      if (data?.value == null) continue
      const unit = data.unit ? ` ${data.unit}` : ''
      out.push({ cap, attr, value: `${str(data.value)}${unit}` })
    }
  }
  return out
})

async function loadFor(id: string) {
  if (!id) return
  loading.value = true
  detail.value = null
  status.value = null
  try {
    const [d, s] = await Promise.all([getDevice(id), getDeviceStatus(id)])
    detail.value = d
    status.value = s
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    loading.value = false
  }
}

function onSelect(sel: DeviceSelection) {
  deviceIdInput.value = sel.device.deviceId
  locationName.value = sel.locationName
  roomName.value = sel.roomName
  loadFor(sel.device.deviceId)
}

async function lookupById() {
  const id = deviceIdInput.value.trim()
  if (!id) return
  loading.value = true
  detail.value = null
  status.value = null
  locationName.value = ''
  roomName.value = ''
  try {
    const res = await listDevices({ deviceId: id })
    if (!res.items?.length) {
      toastError('해당 deviceId 를 찾을 수 없습니다.')
      return
    }
    const dev = res.items[0]
    await loadFor(id)
    if (dev.locationId) {
      try {
        const [locs, rooms] = await Promise.all([listLocations(), listRooms(dev.locationId)])
        locationName.value = locs.items.find((l) => l.locationId === dev.locationId)?.name ?? ''
        roomName.value = rooms.items.find((r) => r.roomId === dev.roomId)?.name ?? ''
      } catch {
        /* 무시 */
      }
    }
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <header class="mb-6">
    <h1 class="text-2xl font-extrabold tracking-tight md:text-3xl">Device 조회</h1>
    <p class="mt-1 text-sm text-muted">위치 → 디바이스를 선택하거나 deviceId 로 조회합니다.</p>
  </header>
  <CliRef :commands="['devices [id]', 'devices:status [id]', 'devices:health [id]', 'devices:history [id]']" />

  <div
    v-if="!hasToken"
    class="rounded-xl border-l-[3px] border-warn bg-warn/10 px-4 py-3 text-sm text-warn"
  >
    PAT 토큰이 없습니다. 우측 상단의 <strong>PAT 설정</strong> 으로 토큰을 입력하세요.
  </div>

  <template v-else>
    <div class="grid gap-4 md:grid-cols-2">
      <div class="rounded-xl border border-line bg-card p-4">
        <label class="text-[11px] font-semibold tracking-wider text-muted uppercase">
          위치 → 디바이스 선택
        </label>
        <div class="mt-3">
          <DeviceSelect @select="onSelect" />
        </div>
      </div>

      <div class="rounded-xl border border-line bg-card p-4">
        <label class="text-[11px] font-semibold tracking-wider text-muted uppercase">
          deviceId 직접 입력
        </label>
        <div class="mt-3 flex gap-2">
          <input
            v-model="deviceIdInput"
            spellcheck="false"
            placeholder="deviceId"
            class="w-full rounded-lg border border-line bg-bg-2 px-3 py-2 font-mono text-sm text-text outline-none focus:border-brand-2"
            @keyup.enter="lookupById"
          />
          <button
            class="shrink-0 rounded-lg border border-transparent bg-gradient-to-br from-brand to-brand-2 px-4 py-2 text-sm font-semibold text-[#061026] transition hover:-translate-y-px"
            @click="lookupById"
          >
            조회
          </button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="mt-8 flex items-center gap-2 text-sm text-muted">
      <span class="size-2 animate-pulse rounded-full bg-brand-2" /> 불러오는 중…
    </div>

    <div v-if="detail && !loading" class="mt-6 flex flex-col gap-4">
      <!-- Hero -->
      <section class="hero-glow overflow-hidden rounded-2xl border border-brand-2/25 p-5">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <h2 class="truncate text-xl font-extrabold tracking-tight">{{ heroTitle }}</h2>
            <p v-if="heroPlace" class="mt-1 text-sm text-muted">{{ heroPlace }}</p>
          </div>
          <span
            v-if="heroType"
            class="shrink-0 rounded-full border border-brand-2/40 bg-brand-2/10 px-3 py-1 text-xs font-semibold text-brand-2"
          >
            {{ heroType }}
          </span>
        </div>
        <div class="mt-3 flex items-center gap-2">
          <code class="truncate rounded-md bg-black/25 px-2 py-1 font-mono text-[12.5px] text-muted">
            {{ detail.deviceId }}
          </code>
          <CopyButton :text="detail.deviceId" title="deviceId 복사" />
        </div>
      </section>

      <!-- 상태 칩 -->
      <section v-if="statusChips.length" class="overflow-hidden rounded-xl border border-line bg-card">
        <header class="flex items-center gap-2 border-b border-line px-4 py-3">
          <span class="h-3.5 w-1 rounded-full bg-gradient-to-b from-brand to-brand-2" />
          <h3 class="text-sm font-bold">현재 상태</h3>
        </header>
        <div class="flex flex-wrap gap-2 p-4">
          <div
            v-for="c in statusChips"
            :key="`${c.cap}.${c.attr}`"
            class="flex items-baseline gap-2 rounded-lg border border-line bg-bg-2 px-3 py-1.5"
          >
            <span class="text-[11px] text-muted">{{ c.cap }}.{{ c.attr }}</span>
            <span class="text-sm font-semibold text-text">{{ c.value }}</span>
          </div>
        </div>
      </section>

      <!-- 상세 정보 -->
      <InfoGrid title="디바이스 정보" :items="deviceInfo" />

      <!-- 접힌 원본 JSON -->
      <JsonView :value="detail" label="Device (원본 JSON)" />
      <JsonView v-if="status" :value="status" label="Status (원본 JSON)" />
    </div>
  </template>
</template>
