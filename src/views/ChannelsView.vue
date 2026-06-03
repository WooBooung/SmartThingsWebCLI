<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useTokenStore } from '@/stores/token'
import { ApiError, listLocations } from '@/lib/stClient'
import {
  listChannels,
  getChannel,
  createChannel,
  updateChannel,
  deleteChannel,
  listDrivers,
  listAssignedDrivers,
  assignDriver,
  unassignDriver,
  getDriverChannelMetaInfo,
  enrollHub,
  unenrollHub,
  listHubEnrollments,
  listHubs,
  listInvites,
  getInvite,
  createInvite,
  deleteInvite,
  type Channel,
  type Driver,
  type AssignedDriver,
  type Invite,
  type Hub,
  type HubEnrolledChannel,
} from '@/lib/api/channels'
import type { Location } from '@/lib/types'
import { parseJsonOrYaml } from '@/lib/yaml'
import { toastError, toastSuccess } from '@/lib/toast'
import JsonView from '@/components/JsonView.vue'
import CopyButton from '@/components/CopyButton.vue'
import CliRef from '@/components/CliRef.vue'

const { hasToken } = storeToRefs(useTokenStore())

type Tab = 'channel' | 'invite'
const tab = ref<Tab>('channel')

// --- 채널 ---
const channels = ref<Channel[]>([])
const selectedChannelId = ref('')
const channelEditor = ref('')
const listLoading = ref(false)
const busy = ref(false)
const result = ref<unknown>(null)

// 채널 생성
const newName = ref('')
const newDescription = ref('')
const newTerms = ref('')

// --- 드라이버 ---
const drivers = ref<Driver[]>([])
const assignedDrivers = ref<AssignedDriver[]>([])
const driverToAssign = ref('')
const driverToUnassign = ref('')

const driverName = (driverId: string) =>
  drivers.value.find((d) => d.driverId === driverId)?.name ?? driverId

// --- 허브 enroll / unenroll / enrollments ---
const locations = ref<Location[]>([])
const enrollLocationId = ref('')
const enrollHubs = ref<Hub[]>([])
const enrollHubId = ref('')
const hubEnrollments = ref<HubEnrolledChannel[] | null>(null)

// --- 초대 ---
const invites = ref<Invite[]>([])
const selectedInviteId = ref('')
const inviteDetails = ref<unknown>(null)
const inviteUrl = ref('')
// 생성 폼
const inviteName = ref('')
const inviteDescription = ref('')
const inviteOwner = ref('')
const inviteTermsUrl = ref('https://smartthings.com')

const hasSelectedChannel = computed(() => !!selectedChannelId.value)

function reportError(e: unknown) {
  toastError(e instanceof Error ? e.message : String(e))
}

// ---------------------------------------------------------------------------
// 채널
// ---------------------------------------------------------------------------
async function loadChannels() {
  if (!hasToken.value) return
  listLoading.value = true
  try {
    const data = await listChannels()
    channels.value = (data.items ?? []).sort((a, b) => a.name.localeCompare(b.name))
  } catch (e) {
    reportError(e)
  } finally {
    listLoading.value = false
  }
}

async function loadDrivers() {
  if (!hasToken.value) return
  try {
    const data = await listDrivers()
    drivers.value = (data.items ?? []).sort((a, b) => a.name.localeCompare(b.name))
  } catch (e) {
    reportError(e)
  }
}

async function onSelectChannel() {
  const id = selectedChannelId.value
  // 선택 변경 시 초대/드라이버 상태 초기화
  invites.value = []
  inviteDetails.value = null
  inviteUrl.value = ''
  selectedInviteId.value = ''
  assignedDrivers.value = []
  driverToAssign.value = ''
  driverToUnassign.value = ''
  channelEditor.value = ''
  if (!id) return
  busy.value = true
  try {
    const data = await getChannel(id)
    channelEditor.value = JSON.stringify(data, null, 2)
    await Promise.all([loadAssignedDrivers(id), loadInvites(id)])
  } catch (e) {
    reportError(e)
  } finally {
    busy.value = false
  }
}

async function doCreateChannel() {
  if (!newName.value.trim() || !newDescription.value.trim() || !newTerms.value.trim()) {
    return toastError('이름, 설명, 약관 URL 은 모두 필수입니다.')
  }
  busy.value = true
  try {
    const created = await createChannel({
      name: newName.value.trim(),
      description: newDescription.value.trim(),
      termsOfServiceUrl: newTerms.value.trim(),
    })
    result.value = created
    toastSuccess('채널을 생성했습니다.')
    newName.value = ''
    newDescription.value = ''
    newTerms.value = ''
    await loadChannels()
    if (created.channelId) {
      selectedChannelId.value = created.channelId
      await onSelectChannel()
    }
  } catch (e) {
    reportError(e)
  } finally {
    busy.value = false
  }
}

async function doUpdateChannel() {
  if (!selectedChannelId.value) return toastError('채널을 선택하세요.')
  const parsed = parseJsonOrYaml(channelEditor.value)
  if (!parsed.ok) return toastError(parsed.error ?? '파싱 오류')
  busy.value = true
  try {
    result.value = await updateChannel(selectedChannelId.value, parsed.json)
    toastSuccess('채널을 수정했습니다.')
    await loadChannels()
  } catch (e) {
    reportError(e)
  } finally {
    busy.value = false
  }
}

async function doDeleteChannel() {
  const id = selectedChannelId.value
  if (!id) return toastError('채널을 선택하세요.')
  const name = channels.value.find((c) => c.channelId === id)?.name ?? id
  if (!window.confirm(`채널 "${name}" 을(를) 삭제할까요? 되돌릴 수 없습니다.`)) return
  busy.value = true
  try {
    await deleteChannel(id)
    result.value = { message: `채널 "${name}" 삭제 성공` }
    toastSuccess('채널을 삭제했습니다.')
    selectedChannelId.value = ''
    channelEditor.value = ''
    assignedDrivers.value = []
    invites.value = []
    await loadChannels()
  } catch (e) {
    reportError(e)
  } finally {
    busy.value = false
  }
}

// ---------------------------------------------------------------------------
// 드라이버 할당/해제
// ---------------------------------------------------------------------------
async function loadAssignedDrivers(channelId: string) {
  try {
    const data = await listAssignedDrivers(channelId)
    assignedDrivers.value = data.items ?? []
  } catch (e) {
    reportError(e)
  }
}

async function doAssignDriver() {
  const id = selectedChannelId.value
  if (!id) return toastError('채널을 선택하세요.')
  if (!driverToAssign.value) return toastError('할당할 드라이버를 선택하세요.')
  const driver = drivers.value.find((d) => d.driverId === driverToAssign.value)
  if (!driver) return toastError('드라이버 정보를 찾을 수 없습니다.')
  busy.value = true
  try {
    result.value = await assignDriver(id, driver.driverId, driver.version)
    toastSuccess(`드라이버 "${driver.name}" 을(를) 채널에 할당했습니다.`)
    await loadAssignedDrivers(id)
  } catch (e) {
    reportError(e)
  } finally {
    busy.value = false
  }
}

async function doUnassignDriver() {
  const id = selectedChannelId.value
  if (!id) return toastError('채널을 선택하세요.')
  if (!driverToUnassign.value) return toastError('해제할 드라이버를 선택하세요.')
  const name = driverName(driverToUnassign.value)
  if (!window.confirm(`드라이버 "${name}" 을(를) 채널에서 해제할까요?`)) return
  busy.value = true
  try {
    await unassignDriver(id, driverToUnassign.value)
    result.value = { message: `드라이버 "${name}" 해제 성공` }
    toastSuccess('드라이버를 해제했습니다.')
    driverToUnassign.value = ''
    await loadAssignedDrivers(id)
  } catch (e) {
    reportError(e)
  } finally {
    busy.value = false
  }
}

/** 선택한 (할당된) 드라이버의 채널 메타정보 조회 — edge:channels:metainfo */
async function doDriverMetaInfo(driverId: string) {
  const id = selectedChannelId.value
  if (!id) return toastError('채널을 선택하세요.')
  if (!driverId) return toastError('드라이버를 선택하세요.')
  busy.value = true
  try {
    result.value = await getDriverChannelMetaInfo(id, driverId)
    toastSuccess(`드라이버 "${driverName(driverId)}" 메타정보를 조회했습니다.`)
  } catch (e) {
    reportError(e)
  } finally {
    busy.value = false
  }
}

// ---------------------------------------------------------------------------
// 허브 enroll / unenroll / enrollments
// ---------------------------------------------------------------------------
async function loadLocationsForEnroll() {
  if (!hasToken.value || locations.value.length) return
  try {
    const data = await listLocations()
    locations.value = data.items ?? []
  } catch (e) {
    reportError(e)
  }
}

async function onEnrollLocationChange() {
  enrollHubId.value = ''
  enrollHubs.value = []
  hubEnrollments.value = null
  if (!enrollLocationId.value) return
  try {
    const data = await listHubs(enrollLocationId.value)
    enrollHubs.value = data.items ?? []
  } catch (e) {
    reportError(e)
  }
}

async function doEnrollHub() {
  const id = selectedChannelId.value
  if (!id) return toastError('채널을 선택하세요.')
  if (!enrollHubId.value) return toastError('허브를 선택하세요.')
  busy.value = true
  try {
    const res = await enrollHub(id, enrollHubId.value)
    result.value = res ?? { message: '허브를 채널에 등록(enroll)했습니다.' }
    toastSuccess('허브를 채널에 등록했습니다.')
    await loadHubEnrollments()
  } catch (e) {
    // 이미 등록된 경우 409
    if (e instanceof ApiError && e.status === 409) {
      toastSuccess('이미 채널에 등록된 허브입니다.')
      await loadHubEnrollments()
    } else {
      reportError(e)
    }
  } finally {
    busy.value = false
  }
}

async function doUnenrollHub() {
  const id = selectedChannelId.value
  if (!id) return toastError('채널을 선택하세요.')
  if (!enrollHubId.value) return toastError('허브를 선택하세요.')
  const hubLabel =
    enrollHubs.value.find((h) => h.deviceId === enrollHubId.value)?.label ?? enrollHubId.value
  if (!window.confirm(`허브 "${hubLabel}" 를 이 채널에서 등록 해제할까요?`)) return
  busy.value = true
  try {
    await unenrollHub(id, enrollHubId.value)
    result.value = { message: `허브 "${hubLabel}" 등록 해제 성공` }
    toastSuccess('허브를 채널에서 등록 해제했습니다.')
    await loadHubEnrollments()
  } catch (e) {
    reportError(e)
  } finally {
    busy.value = false
  }
}

/** 선택한 허브가 enroll 된 채널 목록 — edge:channels:enrollments [hub] */
async function loadHubEnrollments() {
  if (!enrollHubId.value) {
    hubEnrollments.value = null
    return
  }
  busy.value = true
  try {
    const data = await listHubEnrollments(enrollHubId.value)
    hubEnrollments.value = Array.isArray(data) ? data : (data.items ?? [])
  } catch (e) {
    reportError(e)
  } finally {
    busy.value = false
  }
}

// ---------------------------------------------------------------------------
// 초대
// ---------------------------------------------------------------------------
async function loadInvites(channelId: string) {
  try {
    const data = await listInvites(channelId)
    invites.value = data.items ?? []
  } catch (e) {
    reportError(e)
  }
}

async function onSelectInvite(inviteId: string) {
  selectedInviteId.value = inviteId
  inviteDetails.value = null
  inviteUrl.value = ''
  busy.value = true
  try {
    const data = await getInvite(inviteId)
    inviteDetails.value = data
    inviteUrl.value = data.acceptUrl ?? data.invitationUrl ?? ''
  } catch (e) {
    reportError(e)
  } finally {
    busy.value = false
  }
}

async function doCreateInvite() {
  const channelId = selectedChannelId.value
  if (!channelId) return toastError('먼저 채널을 선택하세요.')
  if (
    !inviteName.value.trim() ||
    !inviteDescription.value.trim() ||
    !inviteOwner.value.trim() ||
    !inviteTermsUrl.value.trim()
  ) {
    return toastError('이름, 설명, 소유자, 약관 URL 은 모두 필수입니다.')
  }
  busy.value = true
  try {
    const data = await createInvite({
      channelId,
      name: inviteName.value.trim(),
      description: inviteDescription.value.trim(),
      owner: inviteOwner.value.trim(),
      termsUrl: inviteTermsUrl.value.trim(),
    })
    result.value = data
    toastSuccess('초대를 생성했습니다.')
    await loadInvites(channelId)
    if (data.invitationId) await onSelectInvite(data.invitationId)
  } catch (e) {
    reportError(e)
  } finally {
    busy.value = false
  }
}

async function doDeleteInvite() {
  const id = selectedInviteId.value
  if (!id) return toastError('초대를 선택하세요.')
  if (!window.confirm(`초대 "${id}" 을(를) 삭제할까요? 되돌릴 수 없습니다.`)) return
  busy.value = true
  try {
    await deleteInvite(id)
    result.value = { message: `초대 "${id}" 삭제 성공` }
    toastSuccess('초대를 삭제했습니다.')
    selectedInviteId.value = ''
    inviteDetails.value = null
    inviteUrl.value = ''
    if (selectedChannelId.value) await loadInvites(selectedChannelId.value)
  } catch (e) {
    reportError(e)
  } finally {
    busy.value = false
  }
}

onMounted(() => {
  loadChannels()
  loadDrivers()
  loadLocationsForEnroll()
})
</script>

<template>
  <header class="mb-6">
    <h1 class="text-2xl font-extrabold tracking-tight md:text-3xl">Edge Channel 관리</h1>
    <p class="mt-1 text-sm text-muted">
      Edge 채널 생성·수정·삭제, 드라이버 할당/해제, 초대(Invite) 관리.
    </p>
  </header>
  <CliRef
    :commands="[
      'edge:channels [id]',
      'edge:channels:create',
      'edge:channels:update [id]',
      'edge:channels:delete [id]',
      'edge:channels:drivers [id]',
      'edge:channels:assign [channel] [driver] [version]',
      'edge:channels:unassign [channel] [driver]',
      'edge:channels:metainfo [id]',
      'edge:channels:enroll [hub]',
      'edge:channels:unenroll [hub]',
      'edge:channels:enrollments [hub]',
      'edge:channels:invites',
      'edge:channels:invites:create',
      'edge:channels:invites:delete [id]',
    ]"
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
    <!-- 탭 -->
    <div class="mb-4 inline-flex gap-1 rounded-lg border border-line bg-bg-2 p-1">
      <button
        class="rounded-md px-4 py-1.5 text-sm font-semibold transition"
        :class="tab === 'channel' ? 'bg-gradient-to-br from-brand to-brand-2 text-[#061026]' : 'text-muted hover:text-text'"
        @click="tab = 'channel'"
      >
        채널 / 드라이버
      </button>
      <button
        class="rounded-md px-4 py-1.5 text-sm font-semibold transition"
        :class="tab === 'invite' ? 'bg-gradient-to-br from-brand to-brand-2 text-[#061026]' : 'text-muted hover:text-text'"
        @click="tab = 'invite'"
      >
        초대 (Invite)
      </button>
    </div>

    <!-- 채널 선택 (공통) -->
    <section class="rounded-xl border border-line bg-card p-4">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-semibold tracking-wider text-muted uppercase">채널 선택</span>
        <button
          class="rounded-md border border-line px-2 py-1 text-xs text-muted transition hover:border-brand-2 hover:text-brand-2"
          :disabled="listLoading"
          @click="loadChannels"
        >
          {{ listLoading ? '불러오는 중…' : '↻ 새로고침' }}
        </button>
      </div>
      <select
        v-model="selectedChannelId"
        class="mt-3 w-full rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
        @change="onSelectChannel"
      >
        <option value="">채널 선택 ({{ channels.length }})</option>
        <option v-for="c in channels" :key="c.channelId" :value="c.channelId">{{ c.name }}</option>
      </select>
    </section>

    <!-- ============ 채널 / 드라이버 탭 ============ -->
    <template v-if="tab === 'channel'">
      <!-- 새 채널 생성 -->
      <section class="mt-4 rounded-xl border border-line bg-card p-4">
        <div class="flex items-center gap-2">
          <span class="h-3.5 w-1 rounded-full bg-gradient-to-b from-brand to-brand-2" />
          <h3 class="text-sm font-bold">새 채널 생성</h3>
        </div>
        <div class="mt-3 grid gap-3 sm:grid-cols-3">
          <input
            v-model="newName"
            spellcheck="false"
            placeholder="채널 이름"
            class="rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
          />
          <input
            v-model="newDescription"
            spellcheck="false"
            placeholder="채널 설명"
            class="rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
          />
          <input
            v-model="newTerms"
            spellcheck="false"
            placeholder="약관 URL (또는 이메일)"
            class="rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
          />
        </div>
        <button
          class="mt-3 rounded-lg border border-transparent bg-gradient-to-br from-brand to-brand-2 px-4 py-2 text-sm font-semibold text-[#061026] transition hover:-translate-y-px disabled:opacity-50"
          :disabled="busy"
          @click="doCreateChannel"
        >
          채널 생성
        </button>
      </section>

      <!-- 선택 채널 상세 편집 -->
      <section v-if="hasSelectedChannel" class="mt-4 rounded-xl border border-line bg-card p-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="text-[11px] font-semibold tracking-wider text-muted uppercase">
            채널 상세 (JSON 또는 YAML)
          </span>
          <div class="flex gap-2">
            <button
              class="rounded-lg border border-line px-4 py-1.5 text-sm font-semibold transition hover:-translate-y-px hover:border-brand-2 disabled:opacity-50"
              :disabled="busy"
              @click="doUpdateChannel"
            >
              수정
            </button>
            <button
              class="rounded-lg border border-warn/50 bg-warn/10 px-4 py-1.5 text-sm font-semibold text-warn transition hover:-translate-y-px hover:border-warn disabled:opacity-50"
              :disabled="busy"
              @click="doDeleteChannel"
            >
              삭제
            </button>
          </div>
        </div>
        <textarea
          v-model="channelEditor"
          spellcheck="false"
          rows="12"
          class="mt-3 w-full resize-y rounded-lg border border-line bg-bg-2 px-3 py-2 font-mono text-[13px] leading-relaxed text-text outline-none focus:border-brand-2"
        />
      </section>

      <!-- 드라이버 할당 -->
      <section v-if="hasSelectedChannel" class="mt-4 grid gap-4 md:grid-cols-2">
        <div class="rounded-xl border border-line bg-card p-4">
          <div class="flex items-center gap-2">
            <span class="h-3.5 w-1 rounded-full bg-gradient-to-b from-brand to-brand-2" />
            <h3 class="text-sm font-bold">드라이버 할당</h3>
          </div>
          <select
            v-model="driverToAssign"
            class="mt-3 w-full rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
          >
            <option value="">드라이버 선택 ({{ drivers.length }})</option>
            <option v-for="d in drivers" :key="d.driverId" :value="d.driverId">
              {{ d.name }} (v{{ d.version }})
            </option>
          </select>
          <button
            class="mt-3 rounded-lg border border-transparent bg-gradient-to-br from-brand to-brand-2 px-4 py-2 text-sm font-semibold text-[#061026] transition hover:-translate-y-px disabled:opacity-50"
            :disabled="busy"
            @click="doAssignDriver"
          >
            채널에 할당
          </button>
        </div>

        <div class="rounded-xl border border-line bg-card p-4">
          <div class="flex items-center gap-2">
            <span class="h-3.5 w-1 rounded-full bg-gradient-to-b from-brand to-brand-2" />
            <h3 class="text-sm font-bold">할당된 드라이버 ({{ assignedDrivers.length }})</h3>
          </div>
          <select
            v-model="driverToUnassign"
            class="mt-3 w-full rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
          >
            <option value="">할당된 드라이버 선택</option>
            <option v-for="d in assignedDrivers" :key="d.driverId" :value="d.driverId">
              {{ driverName(d.driverId) }} (v{{ d.version }})
            </option>
          </select>
          <div class="mt-3 flex flex-wrap gap-2">
            <button
              class="rounded-lg border border-warn/50 bg-warn/10 px-4 py-2 text-sm font-semibold text-warn transition hover:-translate-y-px hover:border-warn disabled:opacity-50"
              :disabled="busy"
              @click="doUnassignDriver"
            >
              할당 해제
            </button>
            <button
              class="rounded-lg border border-line px-4 py-2 text-sm font-semibold transition hover:-translate-y-px hover:border-brand-2 disabled:opacity-50"
              :disabled="busy || !driverToUnassign"
              title="채널 내 드라이버 메타정보 조회 (edge:channels:metainfo)"
              @click="doDriverMetaInfo(driverToUnassign)"
            >
              메타정보 조회
            </button>
          </div>
        </div>
      </section>

      <!-- 허브 등록 (enroll / unenroll / enrollments) -->
      <section v-if="hasSelectedChannel" class="mt-4 rounded-xl border border-line bg-card p-4">
        <div class="flex items-center gap-2">
          <span class="h-3.5 w-1 rounded-full bg-gradient-to-b from-brand to-brand-2" />
          <h3 class="text-sm font-bold">허브 등록 (Enroll)</h3>
        </div>
        <p class="mt-2 text-sm text-muted">
          허브를 이 채널에 등록(enroll)하면 채널에 할당된 드라이버를 해당 허브에 설치할 수 있습니다.
        </p>
        <div class="mt-3 grid gap-3 sm:grid-cols-2">
          <label class="block">
            <span class="mb-1 block text-xs text-muted">위치(Location)</span>
            <select
              v-model="enrollLocationId"
              class="w-full rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
              @change="onEnrollLocationChange"
            >
              <option value="">위치 선택 ({{ locations.length }})</option>
              <option v-for="l in locations" :key="l.locationId" :value="l.locationId">
                {{ l.name }}
              </option>
            </select>
          </label>
          <label class="block">
            <span class="mb-1 block text-xs text-muted">허브</span>
            <select
              v-model="enrollHubId"
              class="w-full rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
              @change="loadHubEnrollments"
            >
              <option value="">허브 선택 ({{ enrollHubs.length }})</option>
              <option v-for="h in enrollHubs" :key="h.deviceId" :value="h.deviceId">
                {{ h.label ?? h.name ?? h.deviceId }}
              </option>
            </select>
          </label>
        </div>
        <div class="mt-3 flex flex-wrap gap-2">
          <button
            class="rounded-lg border border-transparent bg-gradient-to-br from-brand to-brand-2 px-4 py-2 text-sm font-semibold text-[#061026] transition hover:-translate-y-px disabled:opacity-50"
            :disabled="busy || !enrollHubId"
            @click="doEnrollHub"
          >
            채널에 등록 (enroll)
          </button>
          <button
            class="rounded-lg border border-line px-4 py-2 text-sm font-semibold transition hover:-translate-y-px hover:border-brand-2 disabled:opacity-50"
            :disabled="busy || !enrollHubId"
            @click="loadHubEnrollments"
          >
            등록된 채널 조회 (enrollments)
          </button>
          <button
            class="rounded-lg border border-warn/50 bg-warn/10 px-4 py-2 text-sm font-semibold text-warn transition hover:-translate-y-px hover:border-warn disabled:opacity-50"
            :disabled="busy || !enrollHubId"
            @click="doUnenrollHub"
          >
            등록 해제 (unenroll)
          </button>
        </div>
        <div v-if="hubEnrollments" class="mt-3">
          <p v-if="!hubEnrollments.length" class="text-sm text-muted">
            이 허브가 등록된 (DRIVER) 채널이 없습니다.
          </p>
          <JsonView v-else :value="hubEnrollments" label="이 허브가 등록된 채널" :default-open="true" />
        </div>
      </section>
    </template>

    <!-- ============ 초대 탭 ============ -->
    <template v-else>
      <div
        v-if="!hasSelectedChannel"
        class="mt-4 rounded-xl border border-line bg-card px-4 py-3 text-sm text-muted"
      >
        먼저 위에서 채널을 선택하면 초대를 생성·관리할 수 있습니다.
      </div>

      <template v-else>
        <!-- 초대 생성 -->
        <section class="mt-4 rounded-xl border border-line bg-card p-4">
          <div class="flex items-center gap-2">
            <span class="h-3.5 w-1 rounded-full bg-gradient-to-b from-brand to-brand-2" />
            <h3 class="text-sm font-bold">초대 생성</h3>
          </div>
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <input
              v-model="inviteName"
              spellcheck="false"
              placeholder="이름"
              class="rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
            />
            <input
              v-model="inviteDescription"
              spellcheck="false"
              placeholder="설명"
              class="rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
            />
            <input
              v-model="inviteOwner"
              spellcheck="false"
              placeholder="소유자 (Owner)"
              class="rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
            />
            <input
              v-model="inviteTermsUrl"
              spellcheck="false"
              placeholder="약관 URL"
              class="rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
            />
          </div>
          <div class="mt-3 flex gap-2">
            <button
              class="rounded-lg border border-transparent bg-gradient-to-br from-brand to-brand-2 px-4 py-2 text-sm font-semibold text-[#061026] transition hover:-translate-y-px disabled:opacity-50"
              :disabled="busy"
              @click="doCreateInvite"
            >
              초대 생성
            </button>
            <button
              class="rounded-lg border border-line px-4 py-2 text-sm font-semibold transition hover:-translate-y-px hover:border-brand-2 disabled:opacity-50"
              :disabled="busy"
              @click="loadInvites(selectedChannelId)"
            >
              초대 목록 새로고침
            </button>
          </div>
        </section>

        <!-- 초대 목록 -->
        <section class="mt-4 rounded-xl border border-line bg-card p-4">
          <div class="flex items-center gap-2">
            <span class="h-3.5 w-1 rounded-full bg-gradient-to-b from-brand to-brand-2" />
            <h3 class="text-sm font-bold">초대 목록 ({{ invites.length }})</h3>
          </div>
          <p v-if="!invites.length" class="mt-3 text-sm text-muted">초대가 없습니다.</p>
          <ul v-else class="mt-3 flex flex-col gap-2">
            <li v-for="inv in invites" :key="inv.id">
              <button
                class="w-full rounded-lg border px-3 py-2 text-left text-sm transition hover:border-brand-2"
                :class="selectedInviteId === inv.id ? 'border-brand-2 bg-brand-2/10' : 'border-line bg-bg-2'"
                @click="onSelectInvite(inv.id)"
              >
                <span class="font-mono text-xs text-muted">id:</span>
                <span class="ml-1 font-mono text-xs">{{ inv.id }}</span>
              </button>
            </li>
          </ul>
        </section>

        <!-- 선택 초대 상세 -->
        <section v-if="inviteDetails" class="mt-4 rounded-xl border border-line bg-card p-4">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <span class="h-3.5 w-1 rounded-full bg-gradient-to-b from-brand to-brand-2" />
              <h3 class="text-sm font-bold">선택한 초대</h3>
            </div>
            <button
              class="rounded-lg border border-warn/50 bg-warn/10 px-4 py-1.5 text-sm font-semibold text-warn transition hover:-translate-y-px hover:border-warn disabled:opacity-50"
              :disabled="busy"
              @click="doDeleteInvite"
            >
              초대 삭제
            </button>
          </div>

          <div v-if="inviteUrl" class="mt-3 flex items-center gap-2">
            <code class="min-w-0 flex-1 truncate rounded-md bg-black/25 px-2 py-1 font-mono text-[12.5px] text-muted">
              {{ inviteUrl }}
            </code>
            <CopyButton :text="inviteUrl" title="초대 URL 복사" />
          </div>

          <div class="mt-3">
            <JsonView :value="inviteDetails" label="초대 상세" :default-open="true" />
          </div>
        </section>
      </template>
    </template>

    <!-- 공통 결과 -->
    <div v-if="result" class="mt-4">
      <JsonView :value="result" label="결과" :default-open="true" />
    </div>
  </template>
</template>
