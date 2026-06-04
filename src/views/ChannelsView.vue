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
import { useI18n } from 'vue-i18n'

const { t } = useI18n({
  useScope: 'local',
  inheritLocale: true,
  messages: {
    ko: {
      title: 'Edge Channel 관리',
      desc: 'Edge 채널 생성·수정·삭제, 드라이버 할당/해제, 초대(Invite) 관리.',
      tabChannel: '채널 / 드라이버',
      tabInvite: '초대 (Invite)',
      channelSelect: '채널 선택',
      loading: '불러오는 중…',
      refresh: '↻ 새로고침',
      selectChannel: '채널 선택 ({count})',
      newChannel: '새 채널 생성',
      phName: '채널 이름',
      phDescription: '채널 설명',
      phTerms: '약관 URL (또는 이메일)',
      createChannel: '채널 생성',
      channelDetailEditor: '채널 상세 (JSON 또는 YAML)',
      update: '수정',
      delete: '삭제',
      assignDriver: '드라이버 할당',
      selectDriver: '드라이버 선택 ({count})',
      assignToChannel: '채널에 할당',
      assignedDrivers: '할당된 드라이버 ({count})',
      selectAssignedDriver: '할당된 드라이버 선택',
      unassign: '할당 해제',
      metaInfo: '메타정보 조회',
      metaInfoTitle: '채널 내 드라이버 메타정보 조회 (edge:channels:metainfo)',
      enrollSection: '허브 등록 (Enroll)',
      enrollDesc:
        '허브를 이 채널에 등록(enroll)하면 채널에 할당된 드라이버를 해당 허브에 설치할 수 있습니다.',
      location: '위치(Location)',
      selectLocation: '위치 선택 ({count})',
      hub: '허브',
      selectHub: '허브 선택 ({count})',
      enroll: '채널에 등록 (enroll)',
      enrollmentsBtn: '등록된 채널 조회 (enrollments)',
      unenroll: '등록 해제 (unenroll)',
      noEnrollments: '이 허브가 등록된 (DRIVER) 채널이 없습니다.',
      enrollmentsLabel: '이 허브가 등록된 채널',
      inviteSelectFirst: '먼저 위에서 채널을 선택하면 초대를 생성·관리할 수 있습니다.',
      createInvite: '초대 생성',
      phInviteName: '이름',
      phInviteDescription: '설명',
      phInviteOwner: '소유자 (Owner)',
      phInviteTerms: '약관 URL',
      refreshInvites: '초대 목록 새로고침',
      inviteList: '초대 목록 ({count})',
      noInvites: '초대가 없습니다.',
      selectedInvite: '선택한 초대',
      deleteInvite: '초대 삭제',
      copyInviteUrl: '초대 URL 복사',
      inviteDetail: '초대 상세',
      result: '결과',
      // toast / confirm / 동적
      createRequired: '이름, 설명, 약관 URL 은 모두 필수입니다.',
      parseError: '파싱 오류',
      createdChannel: '채널을 생성했습니다.',
      selectChannelError: '채널을 선택하세요.',
      updatedChannel: '채널을 수정했습니다.',
      deleteChannelConfirm: '채널 "{name}" 을(를) 삭제할까요? 되돌릴 수 없습니다.',
      deleteChannelResult: '채널 "{name}" 삭제 성공',
      deletedChannel: '채널을 삭제했습니다.',
      selectAssignError: '할당할 드라이버를 선택하세요.',
      driverNotFound: '드라이버 정보를 찾을 수 없습니다.',
      assignedDriverToast: '드라이버 "{name}" 을(를) 채널에 할당했습니다.',
      selectUnassignError: '해제할 드라이버를 선택하세요.',
      unassignConfirm: '드라이버 "{name}" 을(를) 채널에서 해제할까요?',
      unassignResult: '드라이버 "{name}" 해제 성공',
      unassignedToast: '드라이버를 해제했습니다.',
      selectDriverError: '드라이버를 선택하세요.',
      metaInfoToast: '드라이버 "{name}" 메타정보를 조회했습니다.',
      selectHubError: '허브를 선택하세요.',
      enrolledResult: '허브를 채널에 등록(enroll)했습니다.',
      enrolledToast: '허브를 채널에 등록했습니다.',
      alreadyEnrolled: '이미 채널에 등록된 허브입니다.',
      unenrollConfirm: '허브 "{hub}" 를 이 채널에서 등록 해제할까요?',
      unenrollResult: '허브 "{hub}" 등록 해제 성공',
      unenrolledToast: '허브를 채널에서 등록 해제했습니다.',
      inviteSelectChannelFirst: '먼저 채널을 선택하세요.',
      inviteRequired: '이름, 설명, 소유자, 약관 URL 은 모두 필수입니다.',
      createdInvite: '초대를 생성했습니다.',
      selectInviteError: '초대를 선택하세요.',
      deleteInviteConfirm: '초대 "{id}" 을(를) 삭제할까요? 되돌릴 수 없습니다.',
      deleteInviteResult: '초대 "{id}" 삭제 성공',
      deletedInvite: '초대를 삭제했습니다.',
    },
    en: {
      title: 'Edge Channel Management',
      desc: 'Create/update/delete Edge channels, assign/unassign drivers, manage invites.',
      tabChannel: 'Channel / Driver',
      tabInvite: 'Invite',
      channelSelect: 'Select channel',
      loading: 'Loading…',
      refresh: '↻ Refresh',
      selectChannel: 'Select channel ({count})',
      newChannel: 'Create new channel',
      phName: 'Channel name',
      phDescription: 'Channel description',
      phTerms: 'Terms URL (or email)',
      createChannel: 'Create channel',
      channelDetailEditor: 'Channel detail (JSON or YAML)',
      update: 'Update',
      delete: 'Delete',
      assignDriver: 'Assign driver',
      selectDriver: 'Select driver ({count})',
      assignToChannel: 'Assign to channel',
      assignedDrivers: 'Assigned drivers ({count})',
      selectAssignedDriver: 'Select assigned driver',
      unassign: 'Unassign',
      metaInfo: 'Get meta info',
      metaInfoTitle: 'Get driver channel meta info (edge:channels:metainfo)',
      enrollSection: 'Hub enroll',
      enrollDesc:
        'Enrolling a hub in this channel lets you install drivers assigned to the channel onto that hub.',
      location: 'Location',
      selectLocation: 'Select location ({count})',
      hub: 'Hub',
      selectHub: 'Select hub ({count})',
      enroll: 'Enroll in channel',
      enrollmentsBtn: 'List enrolled channels (enrollments)',
      unenroll: 'Unenroll',
      noEnrollments: 'This hub is not enrolled in any (DRIVER) channel.',
      enrollmentsLabel: 'Channels this hub is enrolled in',
      inviteSelectFirst: 'Select a channel above to create and manage invites.',
      createInvite: 'Create invite',
      phInviteName: 'Name',
      phInviteDescription: 'Description',
      phInviteOwner: 'Owner',
      phInviteTerms: 'Terms URL',
      refreshInvites: 'Refresh invite list',
      inviteList: 'Invite list ({count})',
      noInvites: 'No invites.',
      selectedInvite: 'Selected invite',
      deleteInvite: 'Delete invite',
      copyInviteUrl: 'Copy invite URL',
      inviteDetail: 'Invite detail',
      result: 'Result',
      // toast / confirm / dynamic
      createRequired: 'Name, description, and terms URL are all required.',
      parseError: 'Parse error',
      createdChannel: 'Created channel.',
      selectChannelError: 'Select a channel.',
      updatedChannel: 'Updated channel.',
      deleteChannelConfirm: 'Delete channel "{name}"? This cannot be undone.',
      deleteChannelResult: 'Channel "{name}" deleted',
      deletedChannel: 'Deleted channel.',
      selectAssignError: 'Select a driver to assign.',
      driverNotFound: 'Driver info not found.',
      assignedDriverToast: 'Assigned driver "{name}" to the channel.',
      selectUnassignError: 'Select a driver to unassign.',
      unassignConfirm: 'Unassign driver "{name}" from the channel?',
      unassignResult: 'Driver "{name}" unassigned',
      unassignedToast: 'Unassigned driver.',
      selectDriverError: 'Select a driver.',
      metaInfoToast: 'Fetched meta info for driver "{name}".',
      selectHubError: 'Select a hub.',
      enrolledResult: 'Enrolled hub in the channel.',
      enrolledToast: 'Enrolled hub in the channel.',
      alreadyEnrolled: 'Hub is already enrolled in the channel.',
      unenrollConfirm: 'Unenroll hub "{hub}" from this channel?',
      unenrollResult: 'Hub "{hub}" unenrolled',
      unenrolledToast: 'Unenrolled hub from the channel.',
      inviteSelectChannelFirst: 'Select a channel first.',
      inviteRequired: 'Name, description, owner, and terms URL are all required.',
      createdInvite: 'Created invite.',
      selectInviteError: 'Select an invite.',
      deleteInviteConfirm: 'Delete invite "{id}"? This cannot be undone.',
      deleteInviteResult: 'Invite "{id}" deleted',
      deletedInvite: 'Deleted invite.',
    },
  },
})

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
    return toastError(t('createRequired'))
  }
  busy.value = true
  try {
    const created = await createChannel({
      name: newName.value.trim(),
      description: newDescription.value.trim(),
      termsOfServiceUrl: newTerms.value.trim(),
    })
    result.value = created
    toastSuccess(t('createdChannel'))
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
  if (!selectedChannelId.value) return toastError(t('selectChannelError'))
  const parsed = parseJsonOrYaml(channelEditor.value)
  if (!parsed.ok) return toastError(parsed.error ?? t('parseError'))
  busy.value = true
  try {
    result.value = await updateChannel(selectedChannelId.value, parsed.json)
    toastSuccess(t('updatedChannel'))
    await loadChannels()
  } catch (e) {
    reportError(e)
  } finally {
    busy.value = false
  }
}

async function doDeleteChannel() {
  const id = selectedChannelId.value
  if (!id) return toastError(t('selectChannelError'))
  const name = channels.value.find((c) => c.channelId === id)?.name ?? id
  if (!window.confirm(t('deleteChannelConfirm', { name }))) return
  busy.value = true
  try {
    await deleteChannel(id)
    result.value = { message: t('deleteChannelResult', { name }) }
    toastSuccess(t('deletedChannel'))
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
  if (!id) return toastError(t('selectChannelError'))
  if (!driverToAssign.value) return toastError(t('selectAssignError'))
  const driver = drivers.value.find((d) => d.driverId === driverToAssign.value)
  if (!driver) return toastError(t('driverNotFound'))
  busy.value = true
  try {
    result.value = await assignDriver(id, driver.driverId, driver.version)
    toastSuccess(t('assignedDriverToast', { name: driver.name }))
    await loadAssignedDrivers(id)
  } catch (e) {
    reportError(e)
  } finally {
    busy.value = false
  }
}

async function doUnassignDriver() {
  const id = selectedChannelId.value
  if (!id) return toastError(t('selectChannelError'))
  if (!driverToUnassign.value) return toastError(t('selectUnassignError'))
  const name = driverName(driverToUnassign.value)
  if (!window.confirm(t('unassignConfirm', { name }))) return
  busy.value = true
  try {
    await unassignDriver(id, driverToUnassign.value)
    result.value = { message: t('unassignResult', { name }) }
    toastSuccess(t('unassignedToast'))
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
  if (!id) return toastError(t('selectChannelError'))
  if (!driverId) return toastError(t('selectDriverError'))
  busy.value = true
  try {
    result.value = await getDriverChannelMetaInfo(id, driverId)
    toastSuccess(t('metaInfoToast', { name: driverName(driverId) }))
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
  if (!id) return toastError(t('selectChannelError'))
  if (!enrollHubId.value) return toastError(t('selectHubError'))
  busy.value = true
  try {
    const res = await enrollHub(id, enrollHubId.value)
    result.value = res ?? { message: t('enrolledResult') }
    toastSuccess(t('enrolledToast'))
    await loadHubEnrollments()
  } catch (e) {
    // 이미 등록된 경우 409
    if (e instanceof ApiError && e.status === 409) {
      toastSuccess(t('alreadyEnrolled'))
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
  if (!id) return toastError(t('selectChannelError'))
  if (!enrollHubId.value) return toastError(t('selectHubError'))
  const hubLabel =
    enrollHubs.value.find((h) => h.deviceId === enrollHubId.value)?.label ?? enrollHubId.value
  if (!window.confirm(t('unenrollConfirm', { hub: hubLabel }))) return
  busy.value = true
  try {
    await unenrollHub(id, enrollHubId.value)
    result.value = { message: t('unenrollResult', { hub: hubLabel }) }
    toastSuccess(t('unenrolledToast'))
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
  if (!channelId) return toastError(t('inviteSelectChannelFirst'))
  if (
    !inviteName.value.trim() ||
    !inviteDescription.value.trim() ||
    !inviteOwner.value.trim() ||
    !inviteTermsUrl.value.trim()
  ) {
    return toastError(t('inviteRequired'))
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
    toastSuccess(t('createdInvite'))
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
  if (!id) return toastError(t('selectInviteError'))
  if (!window.confirm(t('deleteInviteConfirm', { id }))) return
  busy.value = true
  try {
    await deleteInvite(id)
    result.value = { message: t('deleteInviteResult', { id }) }
    toastSuccess(t('deletedInvite'))
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
    <h1 class="text-2xl font-extrabold tracking-tight md:text-3xl">{{ t('title') }}</h1>
    <p class="mt-1 text-sm text-muted">
      {{ t('desc') }}
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
    {{ $t('common.noToken') }}<strong>{{ $t('common.noTokenStrong') }}</strong>{{ $t('common.noTokenTail') }}
  </div>

  <template v-else>
    <!-- 탭 -->
    <div class="mb-4 inline-flex gap-1 rounded-lg border border-line bg-bg-2 p-1">
      <button
        class="rounded-md px-4 py-1.5 text-sm font-semibold transition"
        :class="tab === 'channel' ? 'bg-gradient-to-br from-brand to-brand-2 text-[#061026]' : 'text-muted hover:text-text'"
        @click="tab = 'channel'"
      >
        {{ t('tabChannel') }}
      </button>
      <button
        class="rounded-md px-4 py-1.5 text-sm font-semibold transition"
        :class="tab === 'invite' ? 'bg-gradient-to-br from-brand to-brand-2 text-[#061026]' : 'text-muted hover:text-text'"
        @click="tab = 'invite'"
      >
        {{ t('tabInvite') }}
      </button>
    </div>

    <!-- 채널 선택 (공통) -->
    <section class="rounded-xl border border-line bg-card p-4">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-semibold tracking-wider text-muted uppercase">{{ t('channelSelect') }}</span>
        <button
          class="rounded-md border border-line px-2 py-1 text-xs text-muted transition hover:border-brand-2 hover:text-brand-2"
          :disabled="listLoading"
          @click="loadChannels"
        >
          {{ listLoading ? t('loading') : t('refresh') }}
        </button>
      </div>
      <select
        v-model="selectedChannelId"
        class="mt-3 w-full rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
        @change="onSelectChannel"
      >
        <option value="">{{ t('selectChannel', { count: channels.length }) }}</option>
        <option v-for="c in channels" :key="c.channelId" :value="c.channelId">{{ c.name }}</option>
      </select>
    </section>

    <!-- ============ 채널 / 드라이버 탭 ============ -->
    <template v-if="tab === 'channel'">
      <!-- 새 채널 생성 -->
      <section class="mt-4 rounded-xl border border-line bg-card p-4">
        <div class="flex items-center gap-2">
          <span class="h-3.5 w-1 rounded-full bg-gradient-to-b from-brand to-brand-2" />
          <h3 class="text-sm font-bold">{{ t('newChannel') }}</h3>
        </div>
        <div class="mt-3 grid gap-3 sm:grid-cols-3">
          <input
            v-model="newName"
            spellcheck="false"
            :placeholder="t('phName')"
            class="rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
          />
          <input
            v-model="newDescription"
            spellcheck="false"
            :placeholder="t('phDescription')"
            class="rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
          />
          <input
            v-model="newTerms"
            spellcheck="false"
            :placeholder="t('phTerms')"
            class="rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
          />
        </div>
        <button
          class="mt-3 rounded-lg border border-transparent bg-gradient-to-br from-brand to-brand-2 px-4 py-2 text-sm font-semibold text-[#061026] transition hover:-translate-y-px disabled:opacity-50"
          :disabled="busy"
          @click="doCreateChannel"
        >
          {{ t('createChannel') }}
        </button>
      </section>

      <!-- 선택 채널 상세 편집 -->
      <section v-if="hasSelectedChannel" class="mt-4 rounded-xl border border-line bg-card p-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="text-[11px] font-semibold tracking-wider text-muted uppercase">
            {{ t('channelDetailEditor') }}
          </span>
          <div class="flex gap-2">
            <button
              class="rounded-lg border border-line px-4 py-1.5 text-sm font-semibold transition hover:-translate-y-px hover:border-brand-2 disabled:opacity-50"
              :disabled="busy"
              @click="doUpdateChannel"
            >
              {{ t('update') }}
            </button>
            <button
              class="rounded-lg border border-warn/50 bg-warn/10 px-4 py-1.5 text-sm font-semibold text-warn transition hover:-translate-y-px hover:border-warn disabled:opacity-50"
              :disabled="busy"
              @click="doDeleteChannel"
            >
              {{ t('delete') }}
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
            <h3 class="text-sm font-bold">{{ t('assignDriver') }}</h3>
          </div>
          <select
            v-model="driverToAssign"
            class="mt-3 w-full rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
          >
            <option value="">{{ t('selectDriver', { count: drivers.length }) }}</option>
            <option v-for="d in drivers" :key="d.driverId" :value="d.driverId">
              {{ d.name }} (v{{ d.version }})
            </option>
          </select>
          <button
            class="mt-3 rounded-lg border border-transparent bg-gradient-to-br from-brand to-brand-2 px-4 py-2 text-sm font-semibold text-[#061026] transition hover:-translate-y-px disabled:opacity-50"
            :disabled="busy"
            @click="doAssignDriver"
          >
            {{ t('assignToChannel') }}
          </button>
        </div>

        <div class="rounded-xl border border-line bg-card p-4">
          <div class="flex items-center gap-2">
            <span class="h-3.5 w-1 rounded-full bg-gradient-to-b from-brand to-brand-2" />
            <h3 class="text-sm font-bold">{{ t('assignedDrivers', { count: assignedDrivers.length }) }}</h3>
          </div>
          <select
            v-model="driverToUnassign"
            class="mt-3 w-full rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
          >
            <option value="">{{ t('selectAssignedDriver') }}</option>
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
              {{ t('unassign') }}
            </button>
            <button
              class="rounded-lg border border-line px-4 py-2 text-sm font-semibold transition hover:-translate-y-px hover:border-brand-2 disabled:opacity-50"
              :disabled="busy || !driverToUnassign"
              :title="t('metaInfoTitle')"
              @click="doDriverMetaInfo(driverToUnassign)"
            >
              {{ t('metaInfo') }}
            </button>
          </div>
        </div>
      </section>

      <!-- 허브 등록 (enroll / unenroll / enrollments) -->
      <section v-if="hasSelectedChannel" class="mt-4 rounded-xl border border-line bg-card p-4">
        <div class="flex items-center gap-2">
          <span class="h-3.5 w-1 rounded-full bg-gradient-to-b from-brand to-brand-2" />
          <h3 class="text-sm font-bold">{{ t('enrollSection') }}</h3>
        </div>
        <p class="mt-2 text-sm text-muted">
          {{ t('enrollDesc') }}
        </p>
        <div class="mt-3 grid gap-3 sm:grid-cols-2">
          <label class="block">
            <span class="mb-1 block text-xs text-muted">{{ t('location') }}</span>
            <select
              v-model="enrollLocationId"
              class="w-full rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
              @change="onEnrollLocationChange"
            >
              <option value="">{{ t('selectLocation', { count: locations.length }) }}</option>
              <option v-for="l in locations" :key="l.locationId" :value="l.locationId">
                {{ l.name }}
              </option>
            </select>
          </label>
          <label class="block">
            <span class="mb-1 block text-xs text-muted">{{ t('hub') }}</span>
            <select
              v-model="enrollHubId"
              class="w-full rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
              @change="loadHubEnrollments"
            >
              <option value="">{{ t('selectHub', { count: enrollHubs.length }) }}</option>
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
            {{ t('enroll') }}
          </button>
          <button
            class="rounded-lg border border-line px-4 py-2 text-sm font-semibold transition hover:-translate-y-px hover:border-brand-2 disabled:opacity-50"
            :disabled="busy || !enrollHubId"
            @click="loadHubEnrollments"
          >
            {{ t('enrollmentsBtn') }}
          </button>
          <button
            class="rounded-lg border border-warn/50 bg-warn/10 px-4 py-2 text-sm font-semibold text-warn transition hover:-translate-y-px hover:border-warn disabled:opacity-50"
            :disabled="busy || !enrollHubId"
            @click="doUnenrollHub"
          >
            {{ t('unenroll') }}
          </button>
        </div>
        <div v-if="hubEnrollments" class="mt-3">
          <p v-if="!hubEnrollments.length" class="text-sm text-muted">
            {{ t('noEnrollments') }}
          </p>
          <JsonView v-else :value="hubEnrollments" :label="t('enrollmentsLabel')" :default-open="true" />
        </div>
      </section>
    </template>

    <!-- ============ 초대 탭 ============ -->
    <template v-else>
      <div
        v-if="!hasSelectedChannel"
        class="mt-4 rounded-xl border border-line bg-card px-4 py-3 text-sm text-muted"
      >
        {{ t('inviteSelectFirst') }}
      </div>

      <template v-else>
        <!-- 초대 생성 -->
        <section class="mt-4 rounded-xl border border-line bg-card p-4">
          <div class="flex items-center gap-2">
            <span class="h-3.5 w-1 rounded-full bg-gradient-to-b from-brand to-brand-2" />
            <h3 class="text-sm font-bold">{{ t('createInvite') }}</h3>
          </div>
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <input
              v-model="inviteName"
              spellcheck="false"
              :placeholder="t('phInviteName')"
              class="rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
            />
            <input
              v-model="inviteDescription"
              spellcheck="false"
              :placeholder="t('phInviteDescription')"
              class="rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
            />
            <input
              v-model="inviteOwner"
              spellcheck="false"
              :placeholder="t('phInviteOwner')"
              class="rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
            />
            <input
              v-model="inviteTermsUrl"
              spellcheck="false"
              :placeholder="t('phInviteTerms')"
              class="rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
            />
          </div>
          <div class="mt-3 flex gap-2">
            <button
              class="rounded-lg border border-transparent bg-gradient-to-br from-brand to-brand-2 px-4 py-2 text-sm font-semibold text-[#061026] transition hover:-translate-y-px disabled:opacity-50"
              :disabled="busy"
              @click="doCreateInvite"
            >
              {{ t('createInvite') }}
            </button>
            <button
              class="rounded-lg border border-line px-4 py-2 text-sm font-semibold transition hover:-translate-y-px hover:border-brand-2 disabled:opacity-50"
              :disabled="busy"
              @click="loadInvites(selectedChannelId)"
            >
              {{ t('refreshInvites') }}
            </button>
          </div>
        </section>

        <!-- 초대 목록 -->
        <section class="mt-4 rounded-xl border border-line bg-card p-4">
          <div class="flex items-center gap-2">
            <span class="h-3.5 w-1 rounded-full bg-gradient-to-b from-brand to-brand-2" />
            <h3 class="text-sm font-bold">{{ t('inviteList', { count: invites.length }) }}</h3>
          </div>
          <p v-if="!invites.length" class="mt-3 text-sm text-muted">{{ t('noInvites') }}</p>
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
              <h3 class="text-sm font-bold">{{ t('selectedInvite') }}</h3>
            </div>
            <button
              class="rounded-lg border border-warn/50 bg-warn/10 px-4 py-1.5 text-sm font-semibold text-warn transition hover:-translate-y-px hover:border-warn disabled:opacity-50"
              :disabled="busy"
              @click="doDeleteInvite"
            >
              {{ t('deleteInvite') }}
            </button>
          </div>

          <div v-if="inviteUrl" class="mt-3 flex items-center gap-2">
            <code class="min-w-0 flex-1 truncate rounded-md bg-black/25 px-2 py-1 font-mono text-[12.5px] text-muted">
              {{ inviteUrl }}
            </code>
            <CopyButton :text="inviteUrl" :title="t('copyInviteUrl')" />
          </div>

          <div class="mt-3">
            <JsonView :value="inviteDetails" :label="t('inviteDetail')" :default-open="true" />
          </div>
        </section>
      </template>
    </template>

    <!-- 공통 결과 -->
    <div v-if="result" class="mt-4">
      <JsonView :value="result" :label="t('result')" :default-open="true" />
    </div>
  </template>
</template>
