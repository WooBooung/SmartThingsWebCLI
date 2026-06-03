<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useTokenStore } from '@/stores/token'
import { listLocations, listRooms } from '@/lib/stClient'
import type { Location, Room } from '@/lib/types'
import { toastError, toastSuccess } from '@/lib/toast'
import JsonView from '@/components/JsonView.vue'
import {
  listHubs,
  listHubDrivers,
  listProfiles,
  getProfile,
  listStandardCapabilities,
  listCustomCapabilities,
  createByCustomProfile,
  createByProfileId,
  createByPrototype,
  CLOUD_PROTOTYPES,
  LOCAL_PROTOTYPES,
  DEVICE_CATEGORIES,
  type ExecutionTarget,
  type HubDriver,
  type ProfileSummary,
  type PrototypeOption,
} from '@/lib/api/virtual'

const { hasToken } = storeToRefs(useTokenStore())

// --- 공통 입력 ---
type Mode = 'prototype' | 'profileId' | 'custom'
const mode = ref<Mode>('prototype')

const deviceName = ref('')
const locationId = ref('')
const roomId = ref('')
const executionTarget = ref<ExecutionTarget>('CLOUD')
const hubId = ref('')
const driverId = ref('')

// --- 드롭다운 데이터 ---
const locations = ref<Location[]>([])
const rooms = ref<Room[]>([])
const hubs = ref<{ deviceId: string; label: string }[]>([])
const drivers = ref<HubDriver[]>([])
const profiles = ref<ProfileSummary[]>([])
const standardCaps = ref<string[]>([])
const customCaps = ref<string[]>([])

const busy = ref(false)
const result = ref<unknown>(null)

const isLocal = computed(() => executionTarget.value === 'LOCAL')
const prototypeOptions = computed<PrototypeOption[]>(() =>
  isLocal.value ? LOCAL_PROTOTYPES : CLOUD_PROTOTYPES,
)

// --- 모드별 입력 ---
const prototype = ref<string>(CLOUD_PROTOTYPES[0].value)
const profileId = ref('')
const profileBody = ref('') // 선택한 프로파일 본문(참고용 표시)
const deviceCategory = ref('Switch')
const capabilitySearch = ref('')
const selectedCaps = ref<string[]>([])
const capListOpen = ref(true)
const customListOpen = ref(true)

const customCapabilitiesText = computed(() => selectedCaps.value.join('\n'))

const filteredStandard = computed(() => {
  const q = capabilitySearch.value.trim().toLowerCase()
  return q ? standardCaps.value.filter((c) => c.toLowerCase().includes(q)) : standardCaps.value
})
const filteredCustom = computed(() => {
  const q = capabilitySearch.value.trim().toLowerCase()
  return q ? customCaps.value.filter((c) => c.toLowerCase().includes(q)) : customCaps.value
})

function toggleCap(id: string, checked: boolean) {
  const i = selectedCaps.value.indexOf(id)
  if (checked && i === -1) selectedCaps.value.push(id)
  else if (!checked && i > -1) selectedCaps.value.splice(i, 1)
}
function uncheckAll() {
  selectedCaps.value = []
}

// --- 초기 로딩 ---
async function loadInitial() {
  if (!hasToken.value) return
  try {
    const [locRes, profRes, stdRes, customList] = await Promise.all([
      listLocations(),
      listProfiles(),
      listStandardCapabilities(),
      listCustomCapabilities(),
    ])
    locations.value = locRes.items
    profiles.value = profRes.items ?? []
    standardCaps.value = (stdRes.items?.map((c) => c.id) ?? []).sort((a, b) => a.localeCompare(b))
    customCaps.value = customList.map((c) => c.id).sort((a, b) => a.localeCompare(b))
    if (locations.value.length === 1) {
      locationId.value = locations.value[0].locationId
      await onLocationChange()
    }
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  }
}

async function onLocationChange() {
  roomId.value = ''
  hubId.value = ''
  driverId.value = ''
  rooms.value = []
  hubs.value = []
  drivers.value = []
  if (!locationId.value) return
  try {
    const [roomRes, hubRes] = await Promise.all([
      listRooms(locationId.value),
      listHubs(locationId.value),
    ])
    rooms.value = roomRes.items
    hubs.value = hubRes.items?.map((h) => ({ deviceId: h.deviceId, label: h.label || h.name || h.deviceId })) ?? []
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  }
}

async function onHubChange() {
  driverId.value = ''
  drivers.value = []
  if (!hubId.value) return
  try {
    drivers.value = await listHubDrivers(hubId.value)
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  }
}

// 실행 대상 전환 시 프로토타입 기본값 보정
watch(executionTarget, () => {
  if (!prototypeOptions.value.some((p) => p.value === prototype.value)) {
    prototype.value = prototypeOptions.value[0].value
  }
})

// 프로파일 드롭다운 선택 → ID 채우고 본문 조회
async function onSelectProfile() {
  if (!profileId.value) return
  busy.value = true
  try {
    const data = await getProfile(profileId.value)
    profileBody.value = JSON.stringify(data, null, 2)
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

// --- 검증 + 생성 ---
function validateBase(): boolean {
  if (!deviceName.value.trim()) {
    toastError('Device Label 을 입력하세요.')
    return false
  }
  if (!locationId.value) {
    toastError('위치를 선택하세요.')
    return false
  }
  if (isLocal.value && (!hubId.value || !driverId.value)) {
    toastError('LOCAL 실행 대상은 허브와 드라이버를 선택해야 합니다.')
    return false
  }
  return true
}

function baseArgs() {
  return {
    name: deviceName.value.trim(),
    locationId: locationId.value,
    roomId: roomId.value || undefined,
    executionTarget: executionTarget.value,
    hubId: hubId.value || undefined,
    driverId: driverId.value || undefined,
  }
}

async function run<T>(fn: () => Promise<T>) {
  busy.value = true
  result.value = null
  try {
    result.value = await fn()
    toastSuccess('가상 디바이스를 생성했습니다.')
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

function createPrototypeDevice() {
  if (!validateBase()) return
  if (!prototype.value) {
    toastError('프로토타입을 선택하세요.')
    return
  }
  run(() => createByPrototype({ ...baseArgs(), prototype: prototype.value }))
}

function createProfileIdDevice() {
  if (!validateBase()) return
  if (!profileId.value.trim()) {
    toastError('Profile ID 를 입력하세요.')
    return
  }
  run(() => createByProfileId({ ...baseArgs(), profileId: profileId.value.trim() }))
}

function createCustomDevice() {
  if (!validateBase()) return
  if (selectedCaps.value.length === 0) {
    toastError('capability 를 하나 이상 선택하세요.')
    return
  }
  run(() =>
    createByCustomProfile({
      ...baseArgs(),
      capabilities: selectedCaps.value,
      deviceCategory: deviceCategory.value,
    }),
  )
}

onMounted(loadInitial)

const TABS: { key: Mode; label: string }[] = [
  { key: 'prototype', label: 'Prototype 으로 생성' },
  { key: 'profileId', label: '내 Profile 로 생성' },
  { key: 'custom', label: 'Custom Profile 로 생성' },
]
</script>

<template>
  <header class="mb-6">
    <h1 class="text-2xl font-extrabold tracking-tight md:text-3xl">Virtual Device 생성</h1>
    <p class="mt-1 text-sm text-muted">
      프로토타입 / 내 device profile / 커스텀 capability 조합 중 한 방식으로 가상 디바이스를 만듭니다.
    </p>
  </header>

  <div
    v-if="!hasToken"
    class="rounded-xl border-l-[3px] border-warn bg-warn/10 px-4 py-3 text-sm text-warn"
  >
    PAT 토큰이 없습니다. 우측 상단의 <strong>PAT 설정</strong> 으로 토큰을 입력하세요.
  </div>

  <template v-else>
    <!-- 공통 입력 -->
    <section class="rounded-xl border border-line bg-card p-4">
      <div class="flex items-center gap-2">
        <span class="h-3.5 w-1 rounded-full bg-gradient-to-b from-brand to-brand-2" />
        <span class="text-[11px] font-semibold tracking-wider text-muted uppercase">공통 설정</span>
      </div>
      <div class="mt-3 grid gap-3 sm:grid-cols-2">
        <label class="flex flex-col gap-1">
          <span class="text-xs font-semibold text-muted">Device Label</span>
          <input
            v-model="deviceName"
            spellcheck="false"
            placeholder="예: My Virtual Switch"
            class="rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
          />
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-xs font-semibold text-muted">실행 대상</span>
          <select
            v-model="executionTarget"
            class="rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
          >
            <option value="CLOUD">Cloud</option>
            <option value="LOCAL">Local</option>
          </select>
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-xs font-semibold text-muted">위치</span>
          <select
            v-model="locationId"
            class="rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
            @change="onLocationChange"
          >
            <option value="">위치 선택</option>
            <option v-for="l in locations" :key="l.locationId" :value="l.locationId">
              {{ l.name }}
            </option>
          </select>
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-xs font-semibold text-muted">방 (선택)</span>
          <select
            v-model="roomId"
            :disabled="!locationId"
            class="rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2 disabled:opacity-50"
          >
            <option value="">방 선택 안 함</option>
            <option v-for="r in rooms" :key="r.roomId" :value="r.roomId">{{ r.name }}</option>
          </select>
        </label>
      </div>

      <!-- LOCAL 전용 -->
      <div v-if="isLocal" class="mt-3 grid gap-3 sm:grid-cols-2">
        <label class="flex flex-col gap-1">
          <span class="text-xs font-semibold text-muted">허브</span>
          <select
            v-model="hubId"
            :disabled="!locationId"
            class="rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2 disabled:opacity-50"
            @change="onHubChange"
          >
            <option value="">허브 선택</option>
            <option v-for="h in hubs" :key="h.deviceId" :value="h.deviceId">{{ h.label }}</option>
          </select>
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-xs font-semibold text-muted">설치된 드라이버</span>
          <select
            v-model="driverId"
            :disabled="!hubId"
            class="rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2 disabled:opacity-50"
          >
            <option value="">드라이버 선택</option>
            <option v-for="d in drivers" :key="d.driverId" :value="d.driverId">{{ d.name }}</option>
          </select>
        </label>
      </div>
    </section>

    <!-- 모드 탭 -->
    <div class="mt-4 flex flex-wrap gap-2">
      <button
        v-for="t in TABS"
        :key="t.key"
        class="rounded-lg border px-4 py-2 text-sm font-semibold transition"
        :class="
          mode === t.key
            ? 'border-brand-2 bg-brand-2/10 text-brand-2'
            : 'border-line text-muted hover:border-brand-2 hover:text-text'
        "
        @click="mode = t.key"
      >
        {{ t.label }}
      </button>
    </div>

    <!-- 1. Prototype -->
    <section v-if="mode === 'prototype'" class="mt-4 rounded-xl border border-line bg-card p-4">
      <span class="text-[11px] font-semibold tracking-wider text-muted uppercase">Prototype</span>
      <div class="mt-3 flex flex-wrap items-end gap-3">
        <label class="flex min-w-60 flex-col gap-1">
          <span class="text-xs font-semibold text-muted">프로토타입</span>
          <select
            v-model="prototype"
            class="rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
          >
            <option v-for="p in prototypeOptions" :key="p.value" :value="p.value">
              {{ p.label }}
            </option>
          </select>
        </label>
        <button
          class="rounded-lg border border-transparent bg-gradient-to-br from-brand to-brand-2 px-4 py-2 text-sm font-semibold text-[#061026] transition hover:-translate-y-px disabled:opacity-50"
          :disabled="busy"
          @click="createPrototypeDevice"
        >
          {{ busy ? '생성 중…' : '가상 디바이스 생성' }}
        </button>
      </div>
    </section>

    <!-- 2. Profile ID -->
    <section v-else-if="mode === 'profileId'" class="mt-4 rounded-xl border border-line bg-card p-4">
      <span class="text-[11px] font-semibold tracking-wider text-muted uppercase">
        내 Device Profile
      </span>
      <div class="mt-3 grid gap-3 sm:grid-cols-2">
        <label class="flex flex-col gap-1">
          <span class="text-xs font-semibold text-muted">프로파일 선택</span>
          <select
            v-model="profileId"
            class="rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
            @change="onSelectProfile"
          >
            <option value="">프로파일 선택 ({{ profiles.length }})</option>
            <option v-for="p in profiles" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-xs font-semibold text-muted">Profile ID</span>
          <input
            v-model="profileId"
            spellcheck="false"
            placeholder="deviceProfileId"
            class="rounded-lg border border-line bg-bg-2 px-3 py-2 font-mono text-sm text-text outline-none focus:border-brand-2"
            @change="onSelectProfile"
          />
        </label>
      </div>
      <details v-if="profileBody" class="mt-3">
        <summary class="cursor-pointer text-xs font-semibold text-muted">프로파일 본문 미리보기</summary>
        <textarea
          v-model="profileBody"
          readonly
          spellcheck="false"
          rows="12"
          class="mt-2 w-full resize-y rounded-lg border border-line bg-bg-2 px-3 py-2 font-mono text-[12.5px] leading-relaxed text-text outline-none"
        />
      </details>
      <button
        class="mt-3 rounded-lg border border-transparent bg-gradient-to-br from-brand to-brand-2 px-4 py-2 text-sm font-semibold text-[#061026] transition hover:-translate-y-px disabled:opacity-50"
        :disabled="busy"
        @click="createProfileIdDevice"
      >
        {{ busy ? '생성 중…' : '선택한 Profile ID 로 생성' }}
      </button>
    </section>

    <!-- 3. Custom Profile -->
    <section v-else class="mt-4 rounded-xl border border-line bg-card p-4">
      <span class="text-[11px] font-semibold tracking-wider text-muted uppercase">
        Custom Profile (capability 조합)
      </span>

      <div class="mt-3 grid gap-3 sm:grid-cols-2">
        <label class="flex flex-col gap-1">
          <span class="text-xs font-semibold text-muted">Device Category</span>
          <select
            v-model="deviceCategory"
            class="rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
          >
            <option v-for="c in DEVICE_CATEGORIES" :key="c" :value="c">{{ c }}</option>
          </select>
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-xs font-semibold text-muted">Capability 검색</span>
          <input
            v-model="capabilitySearch"
            spellcheck="false"
            placeholder="입력해서 필터…"
            class="rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
          />
        </label>
      </div>

      <!-- 표준 capability -->
      <div class="mt-4">
        <button
          class="flex w-full items-center gap-2 text-left"
          @click="capListOpen = !capListOpen"
        >
          <span class="text-brand-2 transition-transform" :class="capListOpen ? 'rotate-90' : ''">▶</span>
          <span class="text-sm font-bold">표준 Capabilities</span>
          <span class="ml-auto text-xs text-muted">{{ filteredStandard.length }}개</span>
        </button>
        <div
          v-if="capListOpen"
          class="mt-2 grid max-h-64 grid-cols-1 gap-1 overflow-auto rounded-lg border border-line bg-bg-2 p-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          <label
            v-for="c in filteredStandard"
            :key="c"
            class="flex items-center gap-2 text-[13px] text-text"
          >
            <input
              type="checkbox"
              :checked="selectedCaps.includes(c)"
              class="accent-[var(--color-brand-2)]"
              @change="toggleCap(c, ($event.target as HTMLInputElement).checked)"
            />
            <span class="truncate font-mono">{{ c }}</span>
          </label>
        </div>
      </div>

      <!-- 커스텀 capability -->
      <div class="mt-4">
        <button
          class="flex w-full items-center gap-2 text-left"
          @click="customListOpen = !customListOpen"
        >
          <span class="text-brand-2 transition-transform" :class="customListOpen ? 'rotate-90' : ''">▶</span>
          <span class="text-sm font-bold">내 커스텀 Capabilities</span>
          <span class="ml-auto text-xs text-muted">{{ filteredCustom.length }}개</span>
        </button>
        <div
          v-if="customListOpen"
          class="mt-2 grid max-h-64 grid-cols-1 gap-1 overflow-auto rounded-lg border border-line bg-bg-2 p-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          <p v-if="filteredCustom.length === 0" class="col-span-full text-xs text-muted">
            커스텀 capability 가 없습니다.
          </p>
          <label
            v-for="c in filteredCustom"
            :key="c"
            class="flex items-center gap-2 text-[13px] text-text"
          >
            <input
              type="checkbox"
              :checked="selectedCaps.includes(c)"
              class="accent-[var(--color-brand-2)]"
              @change="toggleCap(c, ($event.target as HTMLInputElement).checked)"
            />
            <span class="truncate font-mono">{{ c }}</span>
          </label>
        </div>
      </div>

      <!-- 선택 목록 -->
      <div class="mt-4">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-muted">
            선택된 Capabilities ({{ selectedCaps.length }})
          </span>
          <button
            class="rounded-lg border border-warn/50 bg-warn/10 px-3 py-1 text-xs font-semibold text-warn transition hover:border-warn disabled:opacity-50"
            :disabled="selectedCaps.length === 0"
            @click="uncheckAll"
          >
            전체 해제
          </button>
        </div>
        <textarea
          :value="customCapabilitiesText"
          readonly
          spellcheck="false"
          rows="6"
          placeholder="위 목록에서 capability 를 체크하세요."
          class="mt-2 w-full resize-y rounded-lg border border-line bg-bg-2 px-3 py-2 font-mono text-[13px] leading-relaxed text-text outline-none"
        />
      </div>

      <button
        class="mt-3 rounded-lg border border-transparent bg-gradient-to-br from-brand to-brand-2 px-4 py-2 text-sm font-semibold text-[#061026] transition hover:-translate-y-px disabled:opacity-50"
        :disabled="busy"
        @click="createCustomDevice"
      >
        {{ busy ? '생성 중…' : '가상 디바이스 생성' }}
      </button>
    </section>

    <!-- 결과 -->
    <div v-if="result" class="mt-4">
      <JsonView :value="result" label="생성 결과" :default-open="true" />
    </div>
  </template>
</template>
