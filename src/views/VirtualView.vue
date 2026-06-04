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
  listVirtualDevices,
  updateVirtualDevice,
  deleteVirtualDevice,
  CLOUD_PROTOTYPES,
  LOCAL_PROTOTYPES,
  DEVICE_CATEGORIES,
  type ExecutionTarget,
  type HubDriver,
  type ProfileSummary,
  type PrototypeOption,
  type VirtualDeviceSummary,
} from '@/lib/api/virtual'
import CliRef from '@/components/CliRef.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n({
  useScope: 'local',
  inheritLocale: true,
  messages: {
    ko: {
      title: 'Virtual Device 생성',
      desc: '프로토타입 / 내 device profile / 커스텀 capability 조합 중 한 방식으로 가상 디바이스를 만듭니다.',
      commonSettings: '공통 설정',
      executionTarget: '실행 대상',
      location: '위치',
      selectLocation: '위치 선택',
      roomOptional: '방 (선택)',
      noRoom: '방 선택 안 함',
      hub: '허브',
      selectHub: '허브 선택',
      installedDriver: '설치된 드라이버',
      selectDriver: '드라이버 선택',
      tabPrototype: 'Prototype 으로 생성',
      tabProfileId: '내 Profile 로 생성',
      tabCustom: 'Custom Profile 로 생성',
      prototype: '프로토타입',
      creating: '생성 중…',
      createDevice: '가상 디바이스 생성',
      myDeviceProfile: '내 Device Profile',
      selectProfile: '프로파일 선택',
      selectProfileCount: '프로파일 선택 ({count})',
      profileBodyPreview: '프로파일 본문 미리보기',
      createByProfileId: '선택한 Profile ID 로 생성',
      customProfileTitle: 'Custom Profile (capability 조합)',
      capabilitySearch: 'Capability 검색',
      filterPlaceholder: '입력해서 필터…',
      standardCaps: '표준 Capabilities',
      myCustomCaps: '내 커스텀 Capabilities',
      countSuffix: '{count}개',
      noCustomCaps: '커스텀 capability 가 없습니다.',
      selectedCaps: '선택된 Capabilities ({count})',
      uncheckAll: '전체 해제',
      capCheckHint: '위 목록에서 capability 를 체크하세요.',
      createResult: '생성 결과',
      manageTitle: '가상 디바이스 관리',
      refreshTitle: '목록 새로고침',
      loading: '불러오는 중…',
      refresh: '↻ 새로고침',
      manageDesc: '기존 가상 디바이스의 라벨/방을 변경하거나 삭제합니다.',
      selectVirtualDevice: '가상 디바이스 선택',
      selectVirtualDeviceCount: '가상 디바이스 선택 ({count})',
      noLocation: '위치 없음',
      labelPlaceholder: '라벨',
      processing: '처리 중…',
      saveChanges: '변경 저장',
      delete: '삭제',
      noVirtualDevices: '가상 디바이스가 없습니다.',
      labelPlaceholderExample: '예: My Virtual Switch',
      errNeedLabel: 'Device Label 을 입력하세요.',
      errNeedLocation: '위치를 선택하세요.',
      errNeedHubDriver: 'LOCAL 실행 대상은 허브와 드라이버를 선택해야 합니다.',
      okCreated: '가상 디바이스를 생성했습니다.',
      errNeedPrototype: '프로토타입을 선택하세요.',
      errNeedProfileId: 'Profile ID 를 입력하세요.',
      errNeedCapability: 'capability 를 하나 이상 선택하세요.',
      okUpdated: '가상 디바이스를 수정했습니다.',
      confirmDelete: '가상 디바이스 "{label}" 를 삭제할까요? 되돌릴 수 없습니다.',
      okDeleted: '가상 디바이스를 삭제했습니다.',
    },
    en: {
      title: 'Create Virtual Device',
      desc: 'Create a virtual device using one of: a prototype, your device profile, or a custom capability set.',
      commonSettings: 'Common settings',
      executionTarget: 'Execution target',
      location: 'Location',
      selectLocation: 'Select location',
      roomOptional: 'Room (optional)',
      noRoom: 'No room',
      hub: 'Hub',
      selectHub: 'Select hub',
      installedDriver: 'Installed driver',
      selectDriver: 'Select driver',
      tabPrototype: 'Create from prototype',
      tabProfileId: 'Create from my profile',
      tabCustom: 'Create from custom profile',
      prototype: 'Prototype',
      creating: 'Creating…',
      createDevice: 'Create virtual device',
      myDeviceProfile: 'My device profile',
      selectProfile: 'Select profile',
      selectProfileCount: 'Select profile ({count})',
      profileBodyPreview: 'Profile body preview',
      createByProfileId: 'Create from selected profile ID',
      customProfileTitle: 'Custom profile (capability set)',
      capabilitySearch: 'Capability search',
      filterPlaceholder: 'Type to filter…',
      standardCaps: 'Standard capabilities',
      myCustomCaps: 'My custom capabilities',
      countSuffix: '{count}',
      noCustomCaps: 'No custom capabilities.',
      selectedCaps: 'Selected capabilities ({count})',
      uncheckAll: 'Clear all',
      capCheckHint: 'Check capabilities from the list above.',
      createResult: 'Create result',
      manageTitle: 'Manage virtual devices',
      refreshTitle: 'Refresh list',
      loading: 'Loading…',
      refresh: '↻ Refresh',
      manageDesc: 'Change the label/room of an existing virtual device, or delete it.',
      selectVirtualDevice: 'Select virtual device',
      selectVirtualDeviceCount: 'Select virtual device ({count})',
      noLocation: 'No location',
      labelPlaceholder: 'Label',
      processing: 'Processing…',
      saveChanges: 'Save changes',
      delete: 'Delete',
      noVirtualDevices: 'No virtual devices.',
      labelPlaceholderExample: 'e.g. My Virtual Switch',
      errNeedLabel: 'Enter a Device Label.',
      errNeedLocation: 'Select a location.',
      errNeedHubDriver: 'A LOCAL execution target requires a hub and driver.',
      okCreated: 'Virtual device created.',
      errNeedPrototype: 'Select a prototype.',
      errNeedProfileId: 'Enter a Profile ID.',
      errNeedCapability: 'Select at least one capability.',
      okUpdated: 'Virtual device updated.',
      confirmDelete: 'Delete virtual device "{label}"? This cannot be undone.',
      okDeleted: 'Virtual device deleted.',
    },
  },
})

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
    toastError(t('errNeedLabel'))
    return false
  }
  if (!locationId.value) {
    toastError(t('errNeedLocation'))
    return false
  }
  if (isLocal.value && (!hubId.value || !driverId.value)) {
    toastError(t('errNeedHubDriver'))
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
    toastSuccess(t('okCreated'))
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

function createPrototypeDevice() {
  if (!validateBase()) return
  if (!prototype.value) {
    toastError(t('errNeedPrototype'))
    return
  }
  run(() => createByPrototype({ ...baseArgs(), prototype: prototype.value }))
}

function createProfileIdDevice() {
  if (!validateBase()) return
  if (!profileId.value.trim()) {
    toastError(t('errNeedProfileId'))
    return
  }
  run(() => createByProfileId({ ...baseArgs(), profileId: profileId.value.trim() }))
}

function createCustomDevice() {
  if (!validateBase()) return
  if (selectedCaps.value.length === 0) {
    toastError(t('errNeedCapability'))
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

// ---------------------------------------------------------------------------
// 가상 디바이스 관리 (virtualdevices:update / virtualdevices:delete)
// ---------------------------------------------------------------------------
const vDevices = ref<VirtualDeviceSummary[]>([])
const vDevicesLoading = ref(false)
const manageSelectedId = ref('')
const manageLabel = ref('')
const manageRoomId = ref('')
const manageRooms = ref<Room[]>([])
const manageBusy = ref(false)

const manageSelected = computed<VirtualDeviceSummary | null>(
  () => vDevices.value.find((d) => d.deviceId === manageSelectedId.value) ?? null,
)
const locationNameById = computed(() => new Map(locations.value.map((l) => [l.locationId, l.name])))

async function loadVirtualDevices() {
  if (!hasToken.value) return
  vDevicesLoading.value = true
  try {
    const res = await listVirtualDevices()
    vDevices.value = (res.items ?? []).slice().sort((a, b) => {
      const la = a.label || a.name || a.deviceId
      const lb = b.label || b.name || b.deviceId
      return la.localeCompare(lb)
    })
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    vDevicesLoading.value = false
  }
}

async function onManageSelect() {
  const d = manageSelected.value
  manageRooms.value = []
  manageRoomId.value = ''
  if (!d) {
    manageLabel.value = ''
    return
  }
  manageLabel.value = d.label || d.name || ''
  if (d.locationId) {
    try {
      const res = await listRooms(d.locationId)
      manageRooms.value = res.items
      manageRoomId.value = res.items.some((r) => r.roomId === d.roomId) ? (d.roomId ?? '') : ''
    } catch (e) {
      toastError(e instanceof Error ? e.message : String(e))
    }
  }
}

async function saveManage() {
  const d = manageSelected.value
  if (!d) return
  const label = manageLabel.value.trim()
  if (!label) {
    toastError(t('errNeedLabel'))
    return
  }
  manageBusy.value = true
  try {
    await updateVirtualDevice(d.deviceId, { label, roomId: manageRoomId.value || undefined })
    toastSuccess(t('okUpdated'))
    await loadVirtualDevices()
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    manageBusy.value = false
  }
}

async function removeManage() {
  const d = manageSelected.value
  if (!d) return
  const label = d.label || d.name || d.deviceId
  if (!window.confirm(t('confirmDelete', { label }))) return
  manageBusy.value = true
  try {
    await deleteVirtualDevice(d.deviceId)
    toastSuccess(t('okDeleted'))
    manageSelectedId.value = ''
    manageLabel.value = ''
    manageRoomId.value = ''
    manageRooms.value = []
    await loadVirtualDevices()
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    manageBusy.value = false
  }
}

onMounted(() => {
  loadInitial()
  loadVirtualDevices()
})

const TABS = computed<{ key: Mode; labelKey: string }[]>(() => [
  { key: 'prototype', labelKey: 'tabPrototype' },
  { key: 'profileId', labelKey: 'tabProfileId' },
  { key: 'custom', labelKey: 'tabCustom' },
])
</script>

<template>
  <header class="mb-6">
    <h1 class="text-2xl font-extrabold tracking-tight md:text-3xl">{{ t('title') }}</h1>
    <p class="mt-1 text-sm text-muted">
      {{ t('desc') }}
    </p>
  </header>
  <CliRef
    :commands="[
      'virtualdevices:create',
      'virtualdevices:create-standard',
      'virtualdevices:update [id]',
      'virtualdevices:delete [id]',
    ]"
    :docs="[
      { label: 'Virtual Devices', url: 'https://developer.smartthings.com/docs/api/public/#tag/Virtual-Devices' },
    ]"
  />

  <div
    v-if="!hasToken"
    class="rounded-xl border-l-[3px] border-warn bg-warn/10 px-4 py-3 text-sm text-warn"
  >
    {{ $t('common.noToken') }}<strong>{{ $t('common.noTokenStrong') }}</strong>{{ $t('common.noTokenTail') }}
  </div>

  <template v-else>
    <!-- 공통 입력 -->
    <section class="rounded-xl border border-line bg-card p-4">
      <div class="flex items-center gap-2">
        <span class="h-3.5 w-1 rounded-full bg-gradient-to-b from-brand to-brand-2" />
        <span class="text-[11px] font-semibold tracking-wider text-muted uppercase">{{ t('commonSettings') }}</span>
      </div>
      <div class="mt-3 grid gap-3 sm:grid-cols-2">
        <label class="flex flex-col gap-1">
          <span class="text-xs font-semibold text-muted">Device Label</span>
          <input
            v-model="deviceName"
            spellcheck="false"
            :placeholder="t('labelPlaceholderExample')"
            class="rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
          />
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-xs font-semibold text-muted">{{ t('executionTarget') }}</span>
          <select
            v-model="executionTarget"
            class="rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
          >
            <option value="CLOUD">Cloud</option>
            <option value="LOCAL">Local</option>
          </select>
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-xs font-semibold text-muted">{{ t('location') }}</span>
          <select
            v-model="locationId"
            class="rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
            @change="onLocationChange"
          >
            <option value="">{{ t('selectLocation') }}</option>
            <option v-for="l in locations" :key="l.locationId" :value="l.locationId">
              {{ l.name }}
            </option>
          </select>
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-xs font-semibold text-muted">{{ t('roomOptional') }}</span>
          <select
            v-model="roomId"
            :disabled="!locationId"
            class="rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2 disabled:opacity-50"
          >
            <option value="">{{ t('noRoom') }}</option>
            <option v-for="r in rooms" :key="r.roomId" :value="r.roomId">{{ r.name }}</option>
          </select>
        </label>
      </div>

      <!-- LOCAL 전용 -->
      <div v-if="isLocal" class="mt-3 grid gap-3 sm:grid-cols-2">
        <label class="flex flex-col gap-1">
          <span class="text-xs font-semibold text-muted">{{ t('hub') }}</span>
          <select
            v-model="hubId"
            :disabled="!locationId"
            class="rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2 disabled:opacity-50"
            @change="onHubChange"
          >
            <option value="">{{ t('selectHub') }}</option>
            <option v-for="h in hubs" :key="h.deviceId" :value="h.deviceId">{{ h.label }}</option>
          </select>
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-xs font-semibold text-muted">{{ t('installedDriver') }}</span>
          <select
            v-model="driverId"
            :disabled="!hubId"
            class="rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2 disabled:opacity-50"
          >
            <option value="">{{ t('selectDriver') }}</option>
            <option v-for="d in drivers" :key="d.driverId" :value="d.driverId">{{ d.name }}</option>
          </select>
        </label>
      </div>
    </section>

    <!-- 모드 탭 -->
    <div class="mt-4 flex flex-wrap gap-2">
      <button
        v-for="tab in TABS"
        :key="tab.key"
        class="rounded-lg border px-4 py-2 text-sm font-semibold transition"
        :class="
          mode === tab.key
            ? 'border-brand-2 bg-brand-2/10 text-brand-2'
            : 'border-line text-muted hover:border-brand-2 hover:text-text'
        "
        @click="mode = tab.key"
      >
        {{ t(tab.labelKey) }}
      </button>
    </div>

    <!-- 1. Prototype -->
    <section v-if="mode === 'prototype'" class="mt-4 rounded-xl border border-line bg-card p-4">
      <span class="text-[11px] font-semibold tracking-wider text-muted uppercase">Prototype</span>
      <div class="mt-3 flex flex-wrap items-end gap-3">
        <label class="flex min-w-60 flex-col gap-1">
          <span class="text-xs font-semibold text-muted">{{ t('prototype') }}</span>
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
          {{ busy ? t('creating') : t('createDevice') }}
        </button>
      </div>
    </section>

    <!-- 2. Profile ID -->
    <section v-else-if="mode === 'profileId'" class="mt-4 rounded-xl border border-line bg-card p-4">
      <span class="text-[11px] font-semibold tracking-wider text-muted uppercase">
        {{ t('myDeviceProfile') }}
      </span>
      <div class="mt-3 grid gap-3 sm:grid-cols-2">
        <label class="flex flex-col gap-1">
          <span class="text-xs font-semibold text-muted">{{ t('selectProfile') }}</span>
          <select
            v-model="profileId"
            class="rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
            @change="onSelectProfile"
          >
            <option value="">{{ t('selectProfileCount', { count: profiles.length }) }}</option>
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
        <summary class="cursor-pointer text-xs font-semibold text-muted">{{ t('profileBodyPreview') }}</summary>
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
        {{ busy ? t('creating') : t('createByProfileId') }}
      </button>
    </section>

    <!-- 3. Custom Profile -->
    <section v-else class="mt-4 rounded-xl border border-line bg-card p-4">
      <span class="text-[11px] font-semibold tracking-wider text-muted uppercase">
        {{ t('customProfileTitle') }}
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
          <span class="text-xs font-semibold text-muted">{{ t('capabilitySearch') }}</span>
          <input
            v-model="capabilitySearch"
            spellcheck="false"
            :placeholder="t('filterPlaceholder')"
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
          <span class="text-sm font-bold">{{ t('standardCaps') }}</span>
          <span class="ml-auto text-xs text-muted">{{ t('countSuffix', { count: filteredStandard.length }) }}</span>
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
          <span class="text-sm font-bold">{{ t('myCustomCaps') }}</span>
          <span class="ml-auto text-xs text-muted">{{ t('countSuffix', { count: filteredCustom.length }) }}</span>
        </button>
        <div
          v-if="customListOpen"
          class="mt-2 grid max-h-64 grid-cols-1 gap-1 overflow-auto rounded-lg border border-line bg-bg-2 p-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          <p v-if="filteredCustom.length === 0" class="col-span-full text-xs text-muted">
            {{ t('noCustomCaps') }}
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
            {{ t('selectedCaps', { count: selectedCaps.length }) }}
          </span>
          <button
            class="rounded-lg border border-warn/50 bg-warn/10 px-3 py-1 text-xs font-semibold text-warn transition hover:border-warn disabled:opacity-50"
            :disabled="selectedCaps.length === 0"
            @click="uncheckAll"
          >
            {{ t('uncheckAll') }}
          </button>
        </div>
        <textarea
          :value="customCapabilitiesText"
          readonly
          spellcheck="false"
          rows="6"
          :placeholder="t('capCheckHint')"
          class="mt-2 w-full resize-y rounded-lg border border-line bg-bg-2 px-3 py-2 font-mono text-[13px] leading-relaxed text-text outline-none"
        />
      </div>

      <button
        class="mt-3 rounded-lg border border-transparent bg-gradient-to-br from-brand to-brand-2 px-4 py-2 text-sm font-semibold text-[#061026] transition hover:-translate-y-px disabled:opacity-50"
        :disabled="busy"
        @click="createCustomDevice"
      >
        {{ busy ? t('creating') : t('createDevice') }}
      </button>
    </section>

    <!-- 결과 -->
    <div v-if="result" class="mt-4">
      <JsonView :value="result" :label="t('createResult')" :default-open="true" />
    </div>

    <!-- 가상 디바이스 관리 (update / delete) -->
    <section class="mt-8 rounded-xl border border-line bg-card p-4">
      <div class="flex items-center gap-2">
        <span class="h-3.5 w-1 rounded-full bg-gradient-to-b from-brand to-brand-2" />
        <span class="text-[11px] font-semibold tracking-wider text-muted uppercase">
          {{ t('manageTitle') }}
        </span>
        <button
          class="ml-auto rounded-md border border-line px-3 py-1 text-xs font-semibold text-muted transition hover:border-brand-2 hover:text-brand-2 disabled:opacity-50"
          :disabled="vDevicesLoading"
          :title="t('refreshTitle')"
          @click="loadVirtualDevices"
        >
          {{ vDevicesLoading ? t('loading') : t('refresh') }}
        </button>
      </div>

      <p class="mt-2 text-xs text-muted">{{ t('manageDesc') }}</p>

      <div class="mt-3 grid gap-3 sm:grid-cols-2">
        <label class="flex flex-col gap-1 sm:col-span-2">
          <span class="text-xs font-semibold text-muted">{{ t('selectVirtualDevice') }}</span>
          <select
            v-model="manageSelectedId"
            :disabled="vDevicesLoading"
            class="rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2 disabled:opacity-50"
            @change="onManageSelect"
          >
            <option value="">
              {{ vDevicesLoading ? t('loading') : t('selectVirtualDeviceCount', { count: vDevices.length }) }}
            </option>
            <option v-for="d in vDevices" :key="d.deviceId" :value="d.deviceId">
              [{{ (d.locationId && locationNameById.get(d.locationId)) || t('noLocation') }}]
              {{ d.label || d.name || d.deviceId }}
            </option>
          </select>
        </label>

        <template v-if="manageSelected">
          <label class="flex flex-col gap-1">
            <span class="text-xs font-semibold text-muted">Device Label</span>
            <input
              v-model="manageLabel"
              spellcheck="false"
              :placeholder="t('labelPlaceholder')"
              class="rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
            />
          </label>
          <label class="flex flex-col gap-1">
            <span class="text-xs font-semibold text-muted">{{ t('roomOptional') }}</span>
            <select
              v-model="manageRoomId"
              class="rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
            >
              <option value="">{{ t('noRoom') }}</option>
              <option v-for="r in manageRooms" :key="r.roomId" :value="r.roomId">{{ r.name }}</option>
            </select>
          </label>
        </template>
      </div>

      <div v-if="manageSelected" class="mt-3 flex flex-wrap items-center gap-2">
        <code class="rounded bg-black/30 px-2 py-1 font-mono text-[12px] text-muted">
          {{ manageSelected.deviceId }}
        </code>
        <button
          class="ml-auto rounded-lg border border-line px-4 py-2 text-sm font-semibold transition hover:-translate-y-px hover:border-brand-2 disabled:opacity-50"
          :disabled="manageBusy"
          @click="saveManage"
        >
          {{ manageBusy ? t('processing') : t('saveChanges') }}
        </button>
        <button
          class="rounded-lg border border-warn/50 bg-warn/10 px-4 py-2 text-sm font-semibold text-warn transition hover:border-warn disabled:opacity-50"
          :disabled="manageBusy"
          @click="removeManage"
        >
          {{ t('delete') }}
        </button>
      </div>

      <p v-else-if="!vDevicesLoading && !vDevices.length" class="mt-3 text-xs text-muted">
        {{ t('noVirtualDevices') }}
      </p>
    </section>
  </template>
</template>
