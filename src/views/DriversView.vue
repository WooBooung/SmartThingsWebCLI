<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useTokenStore } from '@/stores/token'
import { toastError, toastSuccess } from '@/lib/toast'
import JsonView from '@/components/JsonView.vue'
import {
  scanChannelGroups,
  getDriver,
  enrollHubInChannel,
  installHubDriver,
  deleteHubDriver,
  type ChannelGroup,
  type DriverPlacement,
} from '@/lib/api/drivers'
import CliRef from '@/components/CliRef.vue'

const { hasToken } = storeToRefs(useTokenStore())

const groups = ref<ChannelGroup[]>([])
const loadStatus = ref('')
const loading = ref(false)
const busy = ref(false)

const selectedChannelId = ref('')
// 같은 채널 내 동일 driverId 가 여러 허브에 깔릴 수 있어 driverId|hubId 복합키로 식별
const selectedDriverKey = ref('')

const driverDetail = ref<Record<string, unknown> | null>(null)
const result = ref<Record<string, unknown> | string | null>(null)

const selectedChannel = computed(
  () => groups.value.find((g) => g.channelId === selectedChannelId.value) ?? null,
)

const driverOptions = computed(() => selectedChannel.value?.drivers ?? [])

function driverKey(d: DriverPlacement): string {
  return `${d.driverId}|${d.hubId}`
}

const selectedDriver = computed<DriverPlacement | null>(
  () => driverOptions.value.find((d) => driverKey(d) === selectedDriverKey.value) ?? null,
)

async function load() {
  loading.value = true
  loadStatus.value = '허브와 드라이버를 스캔하는 중…'
  groups.value = []
  selectedChannelId.value = ''
  selectedDriverKey.value = ''
  driverDetail.value = null
  result.value = null
  try {
    const g = await scanChannelGroups()
    groups.value = g
    loadStatus.value = g.length
      ? `${g.length}개 채널을 불러왔습니다.`
      : '설치된 드라이버가 있는 채널을 찾지 못했습니다.'
  } catch (e) {
    loadStatus.value = ''
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    loading.value = false
  }
}

function onChannelChange() {
  selectedDriverKey.value = ''
  driverDetail.value = null
}

async function onDriverChange() {
  driverDetail.value = null
  const d = selectedDriver.value
  if (!d) return
  const installedOn = {
    locationId: d.locationId,
    locationName: d.locationName,
    hubId: d.hubId,
    hubName: d.hubName,
  }
  // 먼저 로컬 정보로 표시, 그다음 API 상세 병합
  driverDetail.value = { driverId: d.driverId, installedOn }
  try {
    const data = await getDriver(d.driverId)
    driverDetail.value = { ...data, installedOn }
  } catch {
    /* 로컬 정보 유지 */
  }
}

async function update() {
  const d = selectedDriver.value
  const cid = selectedChannelId.value
  if (!d || !cid) {
    toastError('드라이버를 선택하세요.')
    return
  }
  if (
    !window.confirm(
      `'${d.name}' 드라이버를 채널의 최신 버전으로 강제 설치합니다.\n` +
        `허브: ${d.hubName} @ ${d.locationName}\n현재 v${d.version} → 채널 최신 버전으로 덮어씁니다. 계속할까요?`,
    )
  )
    return

  busy.value = true
  result.value = '업데이트 중…'
  try {
    await enrollHubInChannel(cid, d.hubId)
    const res = await installHubDriver(d.hubId, d.driverId, cid)
    result.value = res ?? `드라이버를 업데이트했습니다. (driverId: ${d.driverId})`
    toastSuccess('드라이버 업데이트 요청을 보냈습니다.')
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    result.value = `Error: ${msg}`
    toastError(msg)
  } finally {
    busy.value = false
  }
}

async function remove() {
  const d = selectedDriver.value
  if (!d) {
    toastError('드라이버를 선택하세요.')
    return
  }
  if (
    !window.confirm(
      `'${d.name}' 드라이버를 허브에서 삭제합니다.\n허브: ${d.hubName} @ ${d.locationName}\n되돌릴 수 없습니다. 계속할까요?`,
    )
  )
    return

  busy.value = true
  result.value = '삭제 중…'
  try {
    await deleteHubDriver(d.hubId, d.driverId)
    result.value = `드라이버를 삭제했습니다. (driverId: ${d.driverId})`
    toastSuccess('드라이버를 삭제했습니다.')
    // 로컬 목록에서 제거
    const g = selectedChannel.value
    if (g) g.drivers = g.drivers.filter((x) => driverKey(x) !== driverKey(d))
    selectedDriverKey.value = ''
    driverDetail.value = null
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    result.value = `Error: ${msg}`
    toastError(msg)
  } finally {
    busy.value = false
  }
}

onMounted(() => {
  if (hasToken.value) load()
})
</script>

<template>
  <header class="mb-6">
    <h1 class="text-2xl font-extrabold tracking-tight md:text-3xl">Update Driver</h1>
    <p class="mt-1 text-sm text-muted">
      허브에 설치된 Edge 드라이버를 채널의 최신 버전으로 강제 설치하거나 삭제합니다.
    </p>
  </header>
  <CliRef
    :commands="['edge:drivers:installed [hub]', 'edge:drivers:install [driver]', 'edge:drivers:switch [device]', 'edge:drivers:uninstall [driver]']"
    :docs="[
      { label: 'Build a Custom Edge Driver', url: 'https://developer.smartthings.com/docs/devices/hub-connected/edge-architecture' },
      { label: 'Hub-Connected 시작하기', url: 'https://developer.smartthings.com/docs/devices/hub-connected/get-started' },
      { label: 'SmartThings CLI', url: 'https://github.com/SmartThingsCommunity/smartthings-cli' },
    ]"
  />

  <div
    v-if="!hasToken"
    class="rounded-xl border-l-[3px] border-warn bg-warn/10 px-4 py-3 text-sm text-warn"
  >
    PAT 토큰이 없습니다. 우측 상단의 <strong>PAT 설정</strong> 으로 토큰을 입력하세요.
  </div>

  <template v-else>
    <!-- 동작 안내 -->
    <div class="mb-5 rounded-xl border-l-[3px] border-brand-2 bg-brand-2/10 px-4 py-3 text-sm text-text">
      <strong class="text-brand-2">동작 안내</strong><br />
      드라이버를 선택하고 <strong>업데이트</strong> 를 누르면 해당 채널에 배포된
      <strong>최신 버전이 강제 설치</strong>됩니다. 현재 설치된 버전과 무관하게 덮어씌워집니다.
    </div>

    <div class="mb-4 flex items-center gap-3">
      <button
        class="rounded-lg border border-line px-4 py-2 text-sm font-semibold transition hover:-translate-y-px hover:border-brand-2 disabled:opacity-50"
        :disabled="loading || busy"
        @click="load"
      >
        {{ loading ? '스캔 중…' : '새로고침' }}
      </button>
      <span class="text-sm text-muted">{{ loadStatus }}</span>
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <!-- Step 1: 채널 -->
      <div class="rounded-xl border border-line bg-card p-4">
        <label class="text-[11px] font-semibold tracking-wider text-muted uppercase">
          1. 채널 선택
        </label>
        <select
          v-model="selectedChannelId"
          class="mt-3 w-full rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
          :disabled="loading || !groups.length"
          @change="onChannelChange"
        >
          <option value="">{{ groups.length ? '채널을 선택하세요' : '먼저 스캔하세요' }}</option>
          <option v-for="g in groups" :key="g.channelId" :value="g.channelId">
            {{ g.name }} ({{ g.channelId }})
          </option>
        </select>
      </div>

      <!-- Step 2: 드라이버 -->
      <div class="rounded-xl border border-line bg-card p-4">
        <label class="text-[11px] font-semibold tracking-wider text-muted uppercase">
          2. 설치된 드라이버 선택
        </label>
        <select
          v-model="selectedDriverKey"
          class="mt-3 w-full rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
          :disabled="!selectedChannelId || !driverOptions.length"
          @change="onDriverChange"
        >
          <option value="">{{ selectedChannelId ? '드라이버를 선택하세요' : '먼저 채널을 선택하세요' }}</option>
          <option v-for="d in driverOptions" :key="driverKey(d)" :value="driverKey(d)">
            {{ d.name }} (v{{ d.version }}) — {{ d.hubName }} @ {{ d.locationName }}
          </option>
        </select>
      </div>
    </div>

    <!-- 채널 상세 -->
    <div v-if="selectedChannel?.detail" class="mt-4">
      <JsonView :value="selectedChannel.detail" label="채널 상세 (원본 JSON)" />
    </div>

    <!-- 드라이버 상세 -->
    <div v-if="driverDetail" class="mt-4">
      <JsonView :value="driverDetail" label="드라이버 상세 (원본 JSON)" />
    </div>

    <!-- 액션 -->
    <div class="mt-5 flex items-center gap-3">
      <button
        class="rounded-lg border border-transparent bg-gradient-to-br from-brand to-brand-2 px-4 py-2 text-sm font-semibold text-[#061026] transition hover:-translate-y-px disabled:opacity-50"
        :disabled="busy || !selectedDriver"
        @click="update"
      >
        {{ busy ? '처리 중…' : '업데이트' }}
      </button>
      <button
        class="rounded-lg border border-warn/50 bg-warn/10 px-4 py-2 text-sm font-semibold text-warn transition hover:border-warn disabled:opacity-50"
        :disabled="busy || !selectedDriver"
        @click="remove"
      >
        삭제
      </button>
    </div>

    <!-- 결과 -->
    <div v-if="result != null" class="mt-5">
      <JsonView :value="result" label="결과" :default-open="true" />
    </div>
  </template>
</template>
