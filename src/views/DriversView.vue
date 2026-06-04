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
import { useI18n } from 'vue-i18n'

const { t } = useI18n({
  useScope: 'local',
  inheritLocale: true,
  messages: {
    ko: {
      title: 'Update Driver',
      desc: '허브에 설치된 Edge 드라이버를 채널의 최신 버전으로 강제 설치하거나 삭제합니다.',
      scanning: '허브와 드라이버를 스캔하는 중…',
      loaded: '{count}개 채널을 불러왔습니다.',
      noChannels: '설치된 드라이버가 있는 채널을 찾지 못했습니다.',
      noticeTitle: '동작 안내',
      noticeBody:
        '드라이버를 선택하고 {update} 를 누르면 해당 채널에 배포된 {latest}됩니다. 현재 설치된 버전과 무관하게 덮어씌워집니다.',
      noticeUpdate: '업데이트',
      noticeLatest: '최신 버전이 강제 설치',
      scanningShort: '스캔 중…',
      refresh: '새로고침',
      step1: '1. 채널 선택',
      selectChannel: '채널을 선택하세요',
      scanFirst: '먼저 스캔하세요',
      step2: '2. 설치된 드라이버 선택',
      selectDriver: '드라이버를 선택하세요',
      selectChannelFirst: '먼저 채널을 선택하세요',
      channelDetail: '채널 상세 (원본 JSON)',
      driverDetail: '드라이버 상세 (원본 JSON)',
      processing: '처리 중…',
      update: '업데이트',
      delete: '삭제',
      result: '결과',
      selectDriverError: '드라이버를 선택하세요.',
      updateConfirm:
        "'{name}' 드라이버를 채널의 최신 버전으로 강제 설치합니다.\n허브: {hub} @ {loc}\n현재 v{version} → 채널 최신 버전으로 덮어씁니다. 계속할까요?",
      updating: '업데이트 중…',
      updateDone: '드라이버를 업데이트했습니다. (driverId: {id})',
      updateRequested: '드라이버 업데이트 요청을 보냈습니다.',
      deleteConfirm:
        "'{name}' 드라이버를 허브에서 삭제합니다.\n허브: {hub} @ {loc}\n되돌릴 수 없습니다. 계속할까요?",
      deleting: '삭제 중…',
      deleteDone: '드라이버를 삭제했습니다. (driverId: {id})',
      deleteSuccess: '드라이버를 삭제했습니다.',
    },
    en: {
      title: 'Update Driver',
      desc: 'Force-install the latest channel version of an Edge driver on a hub, or delete it.',
      scanning: 'Scanning hubs and drivers…',
      loaded: 'Loaded {count} channel(s).',
      noChannels: 'No channels with installed drivers found.',
      noticeTitle: 'How it works',
      noticeBody:
        'Select a driver and press {update} to {latest} the version deployed to that channel. It overwrites regardless of the currently installed version.',
      noticeUpdate: 'Update',
      noticeLatest: 'force-install the latest',
      scanningShort: 'Scanning…',
      refresh: 'Refresh',
      step1: '1. Select channel',
      selectChannel: 'Select a channel',
      scanFirst: 'Scan first',
      step2: '2. Select installed driver',
      selectDriver: 'Select a driver',
      selectChannelFirst: 'Select a channel first',
      channelDetail: 'Channel detail (raw JSON)',
      driverDetail: 'Driver detail (raw JSON)',
      processing: 'Processing…',
      update: 'Update',
      delete: 'Delete',
      result: 'Result',
      selectDriverError: 'Select a driver.',
      updateConfirm:
        "Force-install the latest channel version of driver '{name}'.\nHub: {hub} @ {loc}\nCurrent v{version} → overwritten with the latest channel version. Continue?",
      updating: 'Updating…',
      updateDone: 'Updated driver. (driverId: {id})',
      updateRequested: 'Sent driver update request.',
      deleteConfirm:
        "Delete driver '{name}' from the hub.\nHub: {hub} @ {loc}\nThis cannot be undone. Continue?",
      deleting: 'Deleting…',
      deleteDone: 'Deleted driver. (driverId: {id})',
      deleteSuccess: 'Deleted driver.',
    },
  },
})

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
  loadStatus.value = t('scanning')
  groups.value = []
  selectedChannelId.value = ''
  selectedDriverKey.value = ''
  driverDetail.value = null
  result.value = null
  try {
    const g = await scanChannelGroups()
    groups.value = g
    loadStatus.value = g.length ? t('loaded', { count: g.length }) : t('noChannels')
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
    toastError(t('selectDriverError'))
    return
  }
  if (
    !window.confirm(
      t('updateConfirm', {
        name: d.name,
        hub: d.hubName,
        loc: d.locationName,
        version: d.version,
      }),
    )
  )
    return

  busy.value = true
  result.value = t('updating')
  try {
    await enrollHubInChannel(cid, d.hubId)
    const res = await installHubDriver(d.hubId, d.driverId, cid)
    result.value = res ?? t('updateDone', { id: d.driverId })
    toastSuccess(t('updateRequested'))
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
    toastError(t('selectDriverError'))
    return
  }
  if (
    !window.confirm(
      t('deleteConfirm', { name: d.name, hub: d.hubName, loc: d.locationName }),
    )
  )
    return

  busy.value = true
  result.value = t('deleting')
  try {
    await deleteHubDriver(d.hubId, d.driverId)
    result.value = t('deleteDone', { id: d.driverId })
    toastSuccess(t('deleteSuccess'))
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
    <h1 class="text-2xl font-extrabold tracking-tight md:text-3xl">{{ t('title') }}</h1>
    <p class="mt-1 text-sm text-muted">
      {{ t('desc') }}
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
    {{ $t('common.noToken') }}<strong>{{ $t('common.noTokenStrong') }}</strong>{{ $t('common.noTokenTail') }}
  </div>

  <template v-else>
    <!-- 동작 안내 -->
    <div class="mb-5 rounded-xl border-l-[3px] border-brand-2 bg-brand-2/10 px-4 py-3 text-sm text-text">
      <strong class="text-brand-2">{{ t('noticeTitle') }}</strong><br />
      <i18n-t keypath="noticeBody" scope="parent" tag="span">
        <template #update><strong>{{ t('noticeUpdate') }}</strong></template>
        <template #latest><strong>{{ t('noticeLatest') }}</strong></template>
      </i18n-t>
    </div>

    <div class="mb-4 flex items-center gap-3">
      <button
        class="rounded-lg border border-line px-4 py-2 text-sm font-semibold transition hover:-translate-y-px hover:border-brand-2 disabled:opacity-50"
        :disabled="loading || busy"
        @click="load"
      >
        {{ loading ? t('scanningShort') : t('refresh') }}
      </button>
      <span class="text-sm text-muted">{{ loadStatus }}</span>
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <!-- Step 1: 채널 -->
      <div class="rounded-xl border border-line bg-card p-4">
        <label class="text-[11px] font-semibold tracking-wider text-muted uppercase">
          {{ t('step1') }}
        </label>
        <select
          v-model="selectedChannelId"
          class="mt-3 w-full rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
          :disabled="loading || !groups.length"
          @change="onChannelChange"
        >
          <option value="">{{ groups.length ? t('selectChannel') : t('scanFirst') }}</option>
          <option v-for="g in groups" :key="g.channelId" :value="g.channelId">
            {{ g.name }} ({{ g.channelId }})
          </option>
        </select>
      </div>

      <!-- Step 2: 드라이버 -->
      <div class="rounded-xl border border-line bg-card p-4">
        <label class="text-[11px] font-semibold tracking-wider text-muted uppercase">
          {{ t('step2') }}
        </label>
        <select
          v-model="selectedDriverKey"
          class="mt-3 w-full rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
          :disabled="!selectedChannelId || !driverOptions.length"
          @change="onDriverChange"
        >
          <option value="">{{ selectedChannelId ? t('selectDriver') : t('selectChannelFirst') }}</option>
          <option v-for="d in driverOptions" :key="driverKey(d)" :value="driverKey(d)">
            {{ d.name }} (v{{ d.version }}) — {{ d.hubName }} @ {{ d.locationName }}
          </option>
        </select>
      </div>
    </div>

    <!-- 채널 상세 -->
    <div v-if="selectedChannel?.detail" class="mt-4">
      <JsonView :value="selectedChannel.detail" :label="t('channelDetail')" />
    </div>

    <!-- 드라이버 상세 -->
    <div v-if="driverDetail" class="mt-4">
      <JsonView :value="driverDetail" :label="t('driverDetail')" />
    </div>

    <!-- 액션 -->
    <div class="mt-5 flex items-center gap-3">
      <button
        class="rounded-lg border border-transparent bg-gradient-to-br from-brand to-brand-2 px-4 py-2 text-sm font-semibold text-[#061026] transition hover:-translate-y-px disabled:opacity-50"
        :disabled="busy || !selectedDriver"
        @click="update"
      >
        {{ busy ? t('processing') : t('update') }}
      </button>
      <button
        class="rounded-lg border border-warn/50 bg-warn/10 px-4 py-2 text-sm font-semibold text-warn transition hover:border-warn disabled:opacity-50"
        :disabled="busy || !selectedDriver"
        @click="remove"
      >
        {{ t('delete') }}
      </button>
    </div>

    <!-- 결과 -->
    <div v-if="result != null" class="mt-5">
      <JsonView :value="result" :label="t('result')" :default-open="true" />
    </div>
  </template>
</template>
