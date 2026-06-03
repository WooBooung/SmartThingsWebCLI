<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useTokenStore } from '@/stores/token'
import { ApiError, listLocations, listDevices } from '@/lib/stClient'
import { toastError, toastSuccess } from '@/lib/toast'
import JsonView from '@/components/JsonView.vue'
import {
  listDrivers,
  getDriver,
  deleteDriver,
  listChannels,
  assignDriverToChannel,
  enrollHubInChannel,
  installDriverToHub,
  listHubDrivers,
  deleteHubDriver,
  listHubs,
  uploadDriverPackage,
  findUnusedDrivers,
  type EdgeDriver,
  type DistChannel,
  type InstalledDriver,
  type EdgeHub,
} from '@/lib/api/edge'
import type { Location } from '@/lib/types'
import CliRef from '@/components/CliRef.vue'

const { hasToken } = storeToRefs(useTokenStore())

function msg(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

// --- 공통 데이터 ---
const drivers = ref<EdgeDriver[]>([])
const channels = ref<DistChannel[]>([])
const locations = ref<Location[]>([])
const listLoading = ref(false)

// --- 업로드 ---
const uploadFile = ref<File | null>(null)
const uploading = ref(false)

// --- 드라이버 선택/상세 ---
const selectedDriverId = ref('')
const selectedDriverVersion = ref('')
const driverDetails = ref<unknown>(null)
const busy = ref(false)

// --- 채널 배정 ---
const assignChannelId = ref('')

// --- 허브 설치 ---
const installLocationId = ref('')
const installHubs = ref<EdgeHub[]>([])
const installHubId = ref('')

// --- 미사용 드라이버 정리 ---
const cleanLocationId = ref('')
const cleanHubs = ref<EdgeHub[]>([])
const cleanHubId = ref('')
const unusedDrivers = ref<InstalledDriver[]>([])
const selectedUnusedId = ref('')
const installedOnHub = ref<InstalledDriver[]>([])
const cleanLoading = ref(false)

const result = ref<unknown>(null)

async function refreshAll() {
  if (!hasToken.value) return
  listLoading.value = true
  try {
    const [drv, ch, loc] = await Promise.all([listDrivers(), listChannels(), listLocations()])
    drivers.value = (drv.items ?? []).sort((a, b) => a.name.localeCompare(b.name))
    channels.value = (ch.items ?? []).sort((a, b) => a.name.localeCompare(b.name))
    locations.value = loc.items ?? []
  } catch (e) {
    toastError(msg(e))
  } finally {
    listLoading.value = false
  }
}

// --- 업로드 ---
function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  uploadFile.value = input.files?.[0] ?? null
}

async function doUpload() {
  if (!uploadFile.value) {
    toastError('업로드할 zip 파일을 선택하세요.')
    return
  }
  uploading.value = true
  result.value = null
  try {
    const data = await uploadDriverPackage(uploadFile.value)
    result.value = data
    toastSuccess('드라이버 패키지를 업로드했습니다.')
    await refreshDrivers()
  } catch (e) {
    toastError(msg(e))
  } finally {
    uploading.value = false
  }
}

async function refreshDrivers() {
  try {
    const drv = await listDrivers()
    drivers.value = (drv.items ?? []).sort((a, b) => a.name.localeCompare(b.name))
  } catch (e) {
    toastError(msg(e))
  }
}

// --- 드라이버 상세 ---
function onSelectDriver() {
  const id = selectedDriverId.value
  const found = drivers.value.find((d) => d.driverId === id)
  selectedDriverVersion.value = found?.version ?? ''
  if (id) doGetDriver(id)
  else driverDetails.value = null
}

async function doGetDriver(id: string) {
  busy.value = true
  driverDetails.value = null
  try {
    driverDetails.value = await getDriver(id)
  } catch (e) {
    toastError(msg(e))
  } finally {
    busy.value = false
  }
}

async function doDeleteDriver() {
  const id = selectedDriverId.value
  if (!id) {
    toastError('삭제할 드라이버를 선택하세요.')
    return
  }
  const found = drivers.value.find((d) => d.driverId === id)
  if (!window.confirm(`드라이버 "${found?.name ?? id}" 를 삭제할까요? 되돌릴 수 없습니다.`)) return
  busy.value = true
  try {
    await deleteDriver(id)
    result.value = { message: `드라이버 ${id} 삭제 성공` }
    toastSuccess('드라이버를 삭제했습니다.')
    selectedDriverId.value = ''
    driverDetails.value = null
    await refreshDrivers()
  } catch (e) {
    toastError(msg(e))
  } finally {
    busy.value = false
  }
}

// --- 채널 배정 ---
async function doAssignToChannel() {
  if (!assignChannelId.value) return toastError('채널을 선택하세요.')
  if (!selectedDriverId.value) return toastError('드라이버를 선택하세요.')
  busy.value = true
  result.value = null
  try {
    result.value = await assignDriverToChannel(
      assignChannelId.value,
      selectedDriverId.value,
      selectedDriverVersion.value,
    )
    toastSuccess('드라이버를 채널에 배정했습니다.')
  } catch (e) {
    toastError(msg(e))
  } finally {
    busy.value = false
  }
}

// --- 허브 설치 ---
async function onInstallLocationChange() {
  installHubId.value = ''
  installHubs.value = []
  if (!installLocationId.value) return
  try {
    const data = await listHubs(installLocationId.value)
    installHubs.value = data.items ?? []
  } catch (e) {
    toastError(msg(e))
  }
}

async function doInstallToHub() {
  if (!assignChannelId.value) return toastError('채널을 선택하세요.')
  if (!selectedDriverId.value) return toastError('드라이버를 선택하세요.')
  if (!installHubId.value) return toastError('허브를 선택하세요.')
  busy.value = true
  result.value = null
  try {
    // 1) 허브를 채널에 등록 (이미 등록되어 있으면 409 → 무시하고 진행)
    try {
      await enrollHubInChannel(assignChannelId.value, installHubId.value)
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 409)) throw e
    }
    // 2) 드라이버 설치
    const data = await installDriverToHub(
      installHubId.value,
      selectedDriverId.value,
      assignChannelId.value,
    )
    result.value = data ?? { message: '드라이버를 허브에 설치했습니다.' }
    toastSuccess('드라이버를 허브에 설치했습니다.')
  } catch (e) {
    toastError(msg(e))
  } finally {
    busy.value = false
  }
}

// --- 미사용 드라이버 정리 ---
async function onCleanLocationChange() {
  cleanHubId.value = ''
  cleanHubs.value = []
  unusedDrivers.value = []
  selectedUnusedId.value = ''
  installedOnHub.value = []
  if (!cleanLocationId.value) return
  try {
    const data = await listHubs(cleanLocationId.value)
    cleanHubs.value = data.items ?? []
  } catch (e) {
    toastError(msg(e))
  }
}

async function loadUnusedDrivers() {
  if (!cleanHubId.value) return
  cleanLoading.value = true
  unusedDrivers.value = []
  selectedUnusedId.value = ''
  try {
    const installed = await listHubDrivers(cleanHubId.value)
    installedOnHub.value = installed
    // type 필터 없이 위치 전체 디바이스 조회 (원본 주석: 복수 type 필터는 AND 처리되어 0 건)
    const devicesResp = cleanLocationId.value
      ? await listDevices({ locationId: cleanLocationId.value })
      : await listDevices()
    unusedDrivers.value = findUnusedDrivers(cleanHubId.value, installed, devicesResp.items ?? [])
  } catch (e) {
    toastError(msg(e))
  } finally {
    cleanLoading.value = false
  }
}

async function doDeleteUnused() {
  const driverId = selectedUnusedId.value
  if (!driverId) return toastError('삭제할 미사용 드라이버를 선택하세요.')
  const found = unusedDrivers.value.find((d) => d.driverId === driverId)
  if (
    !window.confirm(
      `허브에서 미사용 드라이버 "${found?.name ?? driverId}" 를 삭제할까요? 되돌릴 수 없습니다.`,
    )
  )
    return
  busy.value = true
  try {
    await deleteHubDriver(cleanHubId.value, driverId)
    result.value = { message: `드라이버 ${driverId} 삭제 성공` }
    toastSuccess('미사용 드라이버를 삭제했습니다.')
    await loadUnusedDrivers()
  } catch (e) {
    toastError(msg(e))
  } finally {
    busy.value = false
  }
}

onMounted(refreshAll)
</script>

<template>
  <header class="mb-6">
    <h1 class="text-2xl font-extrabold tracking-tight md:text-3xl">Edge Driver</h1>
    <p class="mt-1 text-sm text-muted">
      Edge 드라이버를 업로드·조회·삭제하고, 채널 배정·허브 설치·미사용 드라이버 정리를 합니다.
    </p>
  </header>
  <CliRef :commands="['edge:drivers [id]', 'edge:drivers:package [dir]', 'edge:drivers:delete [id]', 'edge:drivers:install [driver]', 'edge:drivers:installed', 'edge:drivers:prune', 'edge:channels:assign [driver] [version]']" />

  <div
    v-if="!hasToken"
    class="rounded-xl border-l-[3px] border-warn bg-warn/10 px-4 py-3 text-sm text-warn"
  >
    PAT 토큰이 없습니다. 우측 상단의 <strong>PAT 설정</strong> 으로 토큰을 입력하세요.
  </div>

  <template v-else>
    <!-- 업로드 -->
    <section class="rounded-xl border border-line bg-card p-4">
      <div class="mb-3 flex items-center gap-2">
        <span class="h-3.5 w-1 rounded-full bg-gradient-to-b from-brand to-brand-2" />
        <span class="text-[11px] font-semibold tracking-wider text-muted uppercase">
          드라이버 패키지 업로드
        </span>
      </div>
      <p class="mb-3 text-sm text-muted">
        드라이버 파일들을 .zip 으로 압축한 뒤 업로드하세요 (config.yml, init.lua 등이 zip 루트에
        위치). raw zip 바이너리로 전송됩니다.
      </p>
      <div class="flex flex-wrap items-center gap-2">
        <input
          type="file"
          accept=".zip"
          class="flex-1 rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none file:mr-3 file:rounded-md file:border-0 file:bg-bg-2 file:px-3 file:py-1 file:text-sm file:text-muted focus:border-brand-2"
          @change="onFileChange"
        />
        <button
          class="shrink-0 rounded-lg border border-transparent bg-gradient-to-br from-brand to-brand-2 px-4 py-2 text-sm font-semibold text-[#061026] transition hover:-translate-y-px disabled:opacity-50"
          :disabled="uploading"
          @click="doUpload"
        >
          {{ uploading ? '업로드 중…' : '업로드' }}
        </button>
      </div>
    </section>

    <!-- 드라이버 선택/상세 -->
    <section class="mt-4 rounded-xl border border-line bg-card p-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="h-3.5 w-1 rounded-full bg-gradient-to-b from-brand to-brand-2" />
          <span class="text-[11px] font-semibold tracking-wider text-muted uppercase">
            드라이버 목록 / 상세
          </span>
        </div>
        <button
          class="rounded-md border border-line px-2 py-1 text-xs text-muted transition hover:border-brand-2 hover:text-brand-2"
          :disabled="listLoading"
          @click="refreshAll"
        >
          {{ listLoading ? '불러오는 중…' : '↻ 새로고침' }}
        </button>
      </div>
      <div class="mt-3 flex flex-wrap gap-2">
        <select
          v-model="selectedDriverId"
          class="min-w-64 flex-1 rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
          @change="onSelectDriver"
        >
          <option value="">드라이버 선택 ({{ drivers.length }})</option>
          <option v-for="d in drivers" :key="d.driverId" :value="d.driverId">
            {{ d.name }} — v{{ d.version ?? '?' }}
          </option>
        </select>
        <button
          class="rounded-lg border border-warn/50 bg-warn/10 px-4 py-2 text-sm font-semibold text-warn transition hover:border-warn disabled:opacity-50"
          :disabled="busy || !selectedDriverId"
          @click="doDeleteDriver"
        >
          드라이버 삭제
        </button>
      </div>
      <div v-if="driverDetails" class="mt-3">
        <JsonView :value="driverDetails" label="드라이버 상세" :default-open="true" />
      </div>
    </section>

    <!-- 채널 배정 & 허브 설치 -->
    <section class="mt-4 rounded-xl border border-line bg-card p-4">
      <div class="mb-3 flex items-center gap-2">
        <span class="h-3.5 w-1 rounded-full bg-gradient-to-b from-brand to-brand-2" />
        <span class="text-[11px] font-semibold tracking-wider text-muted uppercase">
          채널 배정 / 허브 설치
        </span>
      </div>
      <p class="mb-3 text-sm text-muted">
        위에서 선택한 드라이버를 채널에 배정하거나, 채널·허브를 골라 허브에 설치합니다.
      </p>

      <div class="grid gap-3 sm:grid-cols-2">
        <label class="block">
          <span class="mb-1 block text-xs text-muted">채널</span>
          <select
            v-model="assignChannelId"
            class="w-full rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
          >
            <option value="">채널 선택 ({{ channels.length }})</option>
            <option v-for="c in channels" :key="c.channelId" :value="c.channelId">
              {{ c.name }}
            </option>
          </select>
        </label>
        <div class="flex items-end">
          <button
            class="w-full rounded-lg border border-line px-4 py-2 text-sm font-semibold transition hover:-translate-y-px hover:border-brand-2 disabled:opacity-50"
            :disabled="busy"
            @click="doAssignToChannel"
          >
            드라이버를 채널에 배정
          </button>
        </div>
      </div>

      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        <label class="block">
          <span class="mb-1 block text-xs text-muted">설치 위치(Location)</span>
          <select
            v-model="installLocationId"
            class="w-full rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
            @change="onInstallLocationChange"
          >
            <option value="">위치 선택</option>
            <option v-for="l in locations" :key="l.locationId" :value="l.locationId">
              {{ l.name }}
            </option>
          </select>
        </label>
        <label class="block">
          <span class="mb-1 block text-xs text-muted">허브</span>
          <select
            v-model="installHubId"
            class="w-full rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
          >
            <option value="">허브 선택</option>
            <option v-for="h in installHubs" :key="h.deviceId" :value="h.deviceId">
              {{ h.label ?? h.name ?? h.deviceId }}
            </option>
          </select>
        </label>
      </div>
      <div class="mt-3">
        <button
          class="rounded-lg border border-transparent bg-gradient-to-br from-brand to-brand-2 px-4 py-2 text-sm font-semibold text-[#061026] transition hover:-translate-y-px disabled:opacity-50"
          :disabled="busy"
          @click="doInstallToHub"
        >
          드라이버를 허브에 설치
        </button>
      </div>
    </section>

    <!-- 미사용 드라이버 정리 -->
    <section class="mt-4 rounded-xl border border-line bg-card p-4">
      <div class="mb-3 flex items-center gap-2">
        <span class="h-3.5 w-1 rounded-full bg-gradient-to-b from-brand to-brand-2" />
        <span class="text-[11px] font-semibold tracking-wider text-muted uppercase">
          미사용 드라이버 정리
        </span>
      </div>
      <p class="mb-3 text-sm text-muted">
        허브에 설치돼 있으나 어떤 디바이스에도 쓰이지 않는 드라이버를 찾아 삭제합니다.
      </p>

      <div class="grid gap-3 sm:grid-cols-2">
        <label class="block">
          <span class="mb-1 block text-xs text-muted">위치(Location)</span>
          <select
            v-model="cleanLocationId"
            class="w-full rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
            @change="onCleanLocationChange"
          >
            <option value="">위치 선택</option>
            <option v-for="l in locations" :key="l.locationId" :value="l.locationId">
              {{ l.name }}
            </option>
          </select>
        </label>
        <label class="block">
          <span class="mb-1 block text-xs text-muted">허브</span>
          <select
            v-model="cleanHubId"
            class="w-full rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
            @change="loadUnusedDrivers"
          >
            <option value="">허브 선택</option>
            <option v-for="h in cleanHubs" :key="h.deviceId" :value="h.deviceId">
              {{ h.label ?? h.name ?? h.deviceId }}
            </option>
          </select>
        </label>
      </div>

      <div class="mt-3 flex flex-wrap items-center gap-2">
        <select
          v-model="selectedUnusedId"
          class="min-w-64 flex-1 rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
        >
          <option value="">
            {{ cleanLoading ? '탐지 중…' : `미사용 드라이버 (${unusedDrivers.length})` }}
          </option>
          <option v-for="d in unusedDrivers" :key="d.driverId" :value="d.driverId">
            {{ d.name }}
          </option>
        </select>
        <button
          class="shrink-0 rounded-lg border border-line px-4 py-2 text-sm font-semibold transition hover:-translate-y-px hover:border-brand-2 disabled:opacity-50"
          :disabled="cleanLoading || !cleanHubId"
          @click="loadUnusedDrivers"
        >
          재탐지
        </button>
        <button
          class="shrink-0 rounded-lg border border-warn/50 bg-warn/10 px-4 py-2 text-sm font-semibold text-warn transition hover:border-warn disabled:opacity-50"
          :disabled="busy || !selectedUnusedId"
          @click="doDeleteUnused"
        >
          선택 미사용 드라이버 삭제
        </button>
      </div>

      <div v-if="installedOnHub.length" class="mt-3">
        <JsonView :value="installedOnHub" label="허브에 설치된 드라이버" />
      </div>
    </section>

    <!-- 결과 -->
    <div v-if="result" class="mt-4">
      <JsonView :value="result" label="결과" :default-open="true" />
    </div>
  </template>
</template>
