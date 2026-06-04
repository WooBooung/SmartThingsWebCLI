<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useTokenStore } from '@/stores/token'
import { listLocations } from '@/lib/stClient'
import { listHubs, getHubInfo, listHubDrivers, type HubInfo, type HubDriver } from '@/lib/api/hublog'
import type { Location } from '@/lib/types'
import { toastError, toastSuccess } from '@/lib/toast'
import InfoGrid, { type InfoItem } from '@/components/InfoGrid.vue'
import CliRef from '@/components/CliRef.vue'
import { useI18n } from 'vue-i18n'

const { t, tm, rt } = useI18n({
  useScope: 'local',
  inheritLocale: true,
  messages: {
    ko: {
      title: 'Hub Log',
      desc: 'Hub와 드라이버 정보를 자동으로 불러와 {cmd} 실행 명령어를 생성합니다. 복사해서 같은 네트워크의 터미널에서 실행하세요.',
      whyTitle: '이 기능은 왜 만들어졌나요?',
      whyBody:
        '웹에서 바로 로그를 보여드리고 싶었지만 방법을 찾지 못해, 초보자분들이 명령어를 직접 찾아 입력하는 수고 없이 Hub와 드라이버 정보를 자동으로 불러와 실행 커맨드를 쉽게 만들 수 있도록 제작한 커맨드 생성기입니다. 생성된 명령어를 복사해 터미널에 붙여넣기만 하면 됩니다.',
      sameNetTitle: '동일 네트워크 전용',
      sameNetBody:
        '이 기능은 {lan}에서만 동작합니다. 생성된 명령어를 Hub와 같은 Wi-Fi/LAN에 연결된 PC의 터미널에서 실행하세요. 외부 네트워크(원격)에서는 Hub에 직접 접근할 수 없습니다.',
      sameNetStrong: 'Hub와 같은 로컬 네트워크(내부망)',
      selectLocationPlaceholder: 'Select Location',
      selectLocationFirst: 'Location을 먼저 선택하세요',
      selectHubPlaceholder: 'Select Hub',
      loading: 'Loading…',
      hubIpHint: '허브 이름 옆에 IP가 표시되면 아래 Hub Address에 자동 입력됩니다.',
      hubInfoTitle: 'Hub 정보',
      hubAddrPlaceholder: '예: 192.168.1.25 또는 192.168.1.25:9495',
      hubAddrHint:
        'Hub의 내부 IP 주소입니다. 자동 감지되지 않으면 직접 입력하세요. SmartThings 앱 → Hub → 정보에서 확인 가능합니다.',
      selectHubFirst: 'Hub를 먼저 선택하세요',
      loadingDrivers: 'Loading drivers…',
      allDriversOption: '(모든 드라이버 — --all 옵션)',
      driverHint: '선택하지 않으면 설치된 모든 드라이버의 로그가 출력됩니다 (--all).',
      logLevelHint: '선택한 레벨 이상의 로그만 출력됩니다.',
      connectTimeoutHint: 'Hub 연결 대기 시간 (기본값: 30000ms)',
      includeToken: '토큰 포함',
      howToTitle: '사용 방법 (How to Use)',
      prereq: '사전 준비:',
      prereqBody: ' SmartThings CLI가 설치되어 있어야 합니다.',
      cliInstallGuide: 'SmartThings CLI 설치 가이드 →',
      optionsTitle: '옵션 설명 (CLI Options)',
      colOption: '옵션',
      colDefault: '기본값',
      colDesc: '설명',
      examplesTitle: '자주 쓰는 예시',
      exampleBlock:
        '# 특정 드라이버, TRACE 레벨 (가장 상세)\nsmartthings edge:drivers:logcat ca82d551-2824-44a7-8318-355cf082ade8 --hub-address 192.168.1.25\n\n# 모든 드라이버, DEBUG 이상 로그\nsmartthings edge:drivers:logcat --hub-address 192.168.1.25 --log-level DEBUG\n\n# 연결 타임아웃을 60초로 늘린 경우\nsmartthings edge:drivers:logcat --hub-address 192.168.1.25 --connect-timeout=60000',
      troubleTitle: '문제 해결',
      colSymptom: '증상',
      colCause: '원인 / 해결법',
      copy: 'Copy',
      copied: '명령어를 클립보드에 복사했습니다.',
      copyFailed: '복사에 실패했습니다.',
      loadLocationFail: 'Location 로드 실패: ',
      loadHubFail: 'Hub 로드 실패: ',
      loadDriverFail: '드라이버 로드 실패: ',
      driversLoaded: '설치된 드라이버 {count}개 로드 완료.',
      logLevelAll: 'TRACE (모든 로그, 기본값)',
      steps: [
        {
          t: 'Hub와 같은 네트워크에 PC를 연결합니다.',
          d: 'Hub가 연결된 공유기의 Wi-Fi에 접속하거나 유선 LAN으로 동일 네트워크에 있어야 합니다. 외부 인터넷 망이나 VPN 등 다른 네트워크에서는 Hub에 직접 접근할 수 없습니다.',
        },
        {
          t: 'Hub의 내부 IP를 확인합니다.',
          d: '위 드롭다운에서 자동 감지되지 않는다면: SmartThings 앱 → Devices → Hub → ⋮ → Information → IP Address, 공유기 관리 페이지의 연결 장치 목록, 또는 CLI(smartthings devices --type=HUB)로 확인하세요.',
        },
        {
          t: 'SmartThings CLI 로그인을 확인합니다.',
          d: '처음 사용 시 smartthings login 으로 로그인하거나, PAT 사용 시 smartthings config set token YOUR_PAT_TOKEN.',
        },
        {
          t: '위에서 옵션을 설정하고 명령어를 복사합니다.',
          d: 'Driver(특정/전체), Hub Address(내부 IP), Log Level(TRACE 가장 상세), Connect Timeout(느린 경우 증가).',
        },
        {
          t: '터미널에 붙여넣고 실행합니다.',
          d: '실행하면 Hub에서 실시간으로 로그가 스트리밍됩니다. 종료하려면 Ctrl + C 를 누르세요.',
        },
      ],
      options: [
        { o: '[DRIVERID]', d: '없음', t: '특정 드라이버 ID 지정 시 해당 로그만 표시. 생략 시 --all 과 동일.' },
        { o: '--hub-address', d: '입력 프롬프트', t: 'Hub의 내부 IP. 포트 지정 가능(192.168.1.25:9495). 생략하면 CLI가 직접 물어봄.' },
        { o: '--log-level', d: 'TRACE', t: '출력할 최소 로그 레벨. TRACE → DEBUG → INFO → WARN → ERROR → FATAL 순으로 적게 출력.' },
        { o: '--connect-timeout', d: '30000', t: 'Hub 연결 최대 대기 시간(ms). 응답이 느리면 늘려주세요.' },
      ],
      troubles: [
        { s: '연결이 안 됨 / 타임아웃', c: 'Hub와 같은 네트워크인지, IP가 올바른지 확인. ping 으로 Hub 응답 확인.' },
        { s: '로그가 아무것도 안 나옴', c: '드라이버가 실행 중인지 확인. Log Level을 TRACE로 낮추면 더 많은 로그가 나옴.' },
        { s: 'CLI 명령어를 찾을 수 없음', c: 'CLI 미설치 또는 PATH 누락. 설치 후 터미널 재시작.' },
        { s: '인증 오류', c: 'smartthings login 또는 PAT 토큰 재설정 필요.' },
      ],
    },
    en: {
      title: 'Hub Log',
      desc: 'Automatically loads hub and driver info to generate a {cmd} command. Copy it and run it in a terminal on the same network.',
      whyTitle: 'Why was this built?',
      whyBody:
        'We wanted to show logs directly in the web but could not find a way, so we built this command generator that automatically loads hub and driver info—saving beginners the trouble of finding and typing commands. Just copy the generated command and paste it into a terminal.',
      sameNetTitle: 'Same network only',
      sameNetBody:
        'This feature works only on the {lan}. Run the generated command in a terminal on a PC connected to the same Wi-Fi/LAN as the Hub. You cannot reach the Hub directly from an external (remote) network.',
      sameNetStrong: 'same local network (LAN) as the Hub',
      selectLocationPlaceholder: 'Select Location',
      selectLocationFirst: 'Select a location first',
      selectHubPlaceholder: 'Select Hub',
      loading: 'Loading…',
      hubIpHint: 'If an IP appears next to the hub name, it is auto-filled into Hub Address below.',
      hubInfoTitle: 'Hub info',
      hubAddrPlaceholder: 'e.g. 192.168.1.25 or 192.168.1.25:9495',
      hubAddrHint:
        "The Hub's internal IP address. Enter it manually if not auto-detected. Find it in the SmartThings app → Hub → Information.",
      selectHubFirst: 'Select a hub first',
      loadingDrivers: 'Loading drivers…',
      allDriversOption: '(All drivers — --all option)',
      driverHint: 'If none is selected, logs for all installed drivers are shown (--all).',
      logLevelHint: 'Only logs at or above the selected level are shown.',
      connectTimeoutHint: 'Hub connection wait time (default: 30000ms)',
      includeToken: 'Include token',
      howToTitle: 'How to Use',
      prereq: 'Prerequisite:',
      prereqBody: ' The SmartThings CLI must be installed.',
      cliInstallGuide: 'SmartThings CLI install guide →',
      optionsTitle: 'CLI Options',
      colOption: 'Option',
      colDefault: 'Default',
      colDesc: 'Description',
      examplesTitle: 'Common examples',
      exampleBlock:
        '# Specific driver, TRACE level (most verbose)\nsmartthings edge:drivers:logcat ca82d551-2824-44a7-8318-355cf082ade8 --hub-address 192.168.1.25\n\n# All drivers, DEBUG and above\nsmartthings edge:drivers:logcat --hub-address 192.168.1.25 --log-level DEBUG\n\n# Connect timeout increased to 60s\nsmartthings edge:drivers:logcat --hub-address 192.168.1.25 --connect-timeout=60000',
      troubleTitle: 'Troubleshooting',
      colSymptom: 'Symptom',
      colCause: 'Cause / fix',
      copy: 'Copy',
      copied: 'Copied command to clipboard.',
      copyFailed: 'Copy failed.',
      loadLocationFail: 'Failed to load locations: ',
      loadHubFail: 'Failed to load hubs: ',
      loadDriverFail: 'Failed to load drivers: ',
      driversLoaded: 'Loaded {count} installed driver(s).',
      logLevelAll: 'TRACE (all logs, default)',
      steps: [
        {
          t: 'Connect your PC to the same network as the Hub.',
          d: 'Join the Wi-Fi of the router the Hub is connected to, or be on the same network via wired LAN. You cannot reach the Hub directly from a different network such as external internet or VPN.',
        },
        {
          t: "Find the Hub's internal IP.",
          d: 'If not auto-detected in the dropdown above: SmartThings app → Devices → Hub → ⋮ → Information → IP Address, your router admin page device list, or the CLI (smartthings devices --type=HUB).',
        },
        {
          t: 'Confirm your SmartThings CLI login.',
          d: 'On first use, log in with smartthings login, or for PAT use smartthings config set token YOUR_PAT_TOKEN.',
        },
        {
          t: 'Set the options above and copy the command.',
          d: 'Driver (specific/all), Hub Address (internal IP), Log Level (TRACE is most verbose), Connect Timeout (increase if slow).',
        },
        {
          t: 'Paste into a terminal and run.',
          d: 'Once running, logs stream from the Hub in real time. Press Ctrl + C to stop.',
        },
      ],
      options: [
        { o: '[DRIVERID]', d: 'none', t: 'Shows logs only for the given driver ID. Same as --all if omitted.' },
        { o: '--hub-address', d: 'prompt', t: "Hub's internal IP. Port can be specified (192.168.1.25:9495). If omitted, the CLI prompts." },
        { o: '--log-level', d: 'TRACE', t: 'Minimum log level to print. Fewer logs in order TRACE → DEBUG → INFO → WARN → ERROR → FATAL.' },
        { o: '--connect-timeout', d: '30000', t: 'Max hub connection wait (ms). Increase if responses are slow.' },
      ],
      troubles: [
        { s: 'Cannot connect / timeout', c: 'Check you are on the same network as the Hub and the IP is correct. Verify with ping.' },
        { s: 'No logs appear', c: 'Check the driver is running. Lower Log Level to TRACE for more output.' },
        { s: 'CLI command not found', c: 'CLI not installed or missing from PATH. Install and restart the terminal.' },
        { s: 'Authentication error', c: 'Re-run smartthings login or reset the PAT token.' },
      ],
    },
  },
})

interface StepItem {
  t: string
  d: string
}
interface OptionItem {
  o: string
  d: string
  t: string
}
interface TroubleItem {
  s: string
  c: string
}

const tokenStore = useTokenStore()
const { hasToken, pat } = storeToRefs(tokenStore)

// --- 폼 상태 ---
const locations = ref<Location[]>([])
const locationId = ref('')
const hubs = ref<HubInfo[]>([])
const hubId = ref('')
const drivers = ref<HubDriver[]>([])
const driverId = ref('')

const hubAddress = ref('')
const logLevel = ref('TRACE')
const connectTimeout = ref('30000')
const includeToken = ref(false)

// --- 로딩 상태 ---
const loadingLocations = ref(false)
const loadingHubs = ref(false)
const loadingDrivers = ref(false)

const LOG_LEVELS = computed(() => [
  { value: 'TRACE', label: t('logLevelAll') },
  { value: 'DEBUG', label: 'DEBUG' },
  { value: 'INFO', label: 'INFO' },
  { value: 'WARN', label: 'WARN' },
  { value: 'ERROR', label: 'ERROR' },
  { value: 'FATAL', label: 'FATAL' },
])

const selectedHub = computed<HubInfo | null>(
  () => hubs.value.find((h) => h.deviceId === hubId.value) ?? null,
)

const hubInfoItems = computed<InfoItem[]>(() => {
  const h = selectedHub.value
  if (!h) return []
  return [
    { label: 'Hub ID', value: h.deviceId, mono: true },
    { label: 'EUI', value: h.eui ?? '—', mono: true },
    { label: 'Serial Number', value: h.serialNumber ?? '—', mono: true },
    { label: 'Firmware Version', value: h.version ?? '—' },
    { label: 'Local IP', value: h.ip ?? '—', mono: true },
  ]
})

// --- 명령어 생성 (원본 updateCommand 로직 그대로) ---
const generatedCommand = computed(() => {
  let cmd = 'smartthings edge:drivers:logcat'
  if (driverId.value) cmd += ` ${driverId.value}`
  const addr = hubAddress.value.trim()
  if (addr) cmd += ` --hub-address ${addr}`
  if (logLevel.value && logLevel.value !== 'TRACE') cmd += ` --log-level ${logLevel.value}`
  const timeout = connectTimeout.value.trim()
  if (timeout && timeout !== '30000') cmd += ` --connect-timeout=${timeout}`
  if (includeToken.value && pat.value) cmd += ` --token ${pat.value}`
  return cmd
})

// --- 데이터 로드 ---
async function loadLocationsList() {
  loadingLocations.value = true
  try {
    const res = await listLocations()
    locations.value = res.items ?? []
  } catch (e) {
    toastError(t('loadLocationFail') + (e instanceof Error ? e.message : String(e)))
  } finally {
    loadingLocations.value = false
  }
}

async function loadHubsList() {
  hubs.value = []
  hubId.value = ''
  clearDrivers()
  if (!locationId.value) return

  loadingHubs.value = true
  try {
    const hubDevices = await listHubs(locationId.value)
    // 각 허브 상세(IP/EUI/시리얼/펌웨어)를 병렬 조회
    hubs.value = await Promise.all(hubDevices.map((h) => getHubInfo(h)))
  } catch (e) {
    toastError(t('loadHubFail') + (e instanceof Error ? e.message : String(e)))
  } finally {
    loadingHubs.value = false
  }
}

async function loadDriversList() {
  clearDrivers()
  if (!hubId.value) return

  // IP 자동 입력
  const info = selectedHub.value
  if (info?.ip) hubAddress.value = info.ip

  loadingDrivers.value = true
  try {
    const list = await listHubDrivers(hubId.value)
    list.sort((a, b) => a.name.localeCompare(b.name))
    drivers.value = list
    toastSuccess(t('driversLoaded', { count: list.length }))
  } catch (e) {
    toastError(t('loadDriverFail') + (e instanceof Error ? e.message : String(e)))
  } finally {
    loadingDrivers.value = false
  }
}

function clearDrivers() {
  drivers.value = []
  driverId.value = ''
}

watch(locationId, loadHubsList)
watch(hubId, loadDriversList)

async function copyCommand() {
  try {
    await navigator.clipboard.writeText(generatedCommand.value)
    toastSuccess(t('copied'))
  } catch {
    toastError(t('copyFailed'))
  }
}

onMounted(() => {
  if (hasToken.value) loadLocationsList()
})
watch(hasToken, (v) => {
  if (v && locations.value.length === 0) loadLocationsList()
})
</script>

<template>
  <header class="mb-6">
    <h1 class="text-2xl font-extrabold tracking-tight md:text-3xl">{{ t('title') }}</h1>
    <p class="mt-1 text-sm text-muted">
      <i18n-t keypath="desc" scope="parent" tag="span">
        <template #cmd><code>edge:drivers:logcat</code></template>
      </i18n-t>
    </p>
  </header>
  <CliRef
    :commands="['edge:drivers:logcat [driver-id]']"
    :docs="[
      { label: 'SmartThings CLI 시작하기', url: 'https://developer.smartthings.com/docs/sdks/cli' },
      { label: 'Build a Custom Edge Driver', url: 'https://developer.smartthings.com/docs/devices/hub-connected/edge-architecture' },
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
    <!-- 안내 배너 -->
    <div class="mb-4 flex flex-col gap-3">
      <div class="flex items-start gap-3 rounded-xl border border-brand-2/25 bg-brand-2/5 px-4 py-3 text-sm">
        <span class="text-lg leading-none">💡</span>
        <div class="text-muted">
          <strong class="text-text">{{ t('whyTitle') }}</strong><br />
          {{ t('whyBody') }}
        </div>
      </div>
      <div class="flex items-start gap-3 rounded-xl border-l-[3px] border-warn bg-warn/10 px-4 py-3 text-sm text-warn">
        <span class="text-lg leading-none">⚠️</span>
        <div>
          <strong>{{ t('sameNetTitle') }}</strong><br />
          <i18n-t keypath="sameNetBody" scope="parent" tag="span">
            <template #lan><strong>{{ t('sameNetStrong') }}</strong></template>
          </i18n-t>
        </div>
      </div>
    </div>

    <!-- Command Generator -->
    <section class="overflow-hidden rounded-xl border border-line bg-card">
      <header class="flex items-center gap-2 border-b border-line px-4 py-3">
        <span class="h-3.5 w-1 rounded-full bg-gradient-to-b from-brand to-brand-2" />
        <h3 class="text-sm font-bold">Command Generator</h3>
      </header>

      <div class="flex flex-col gap-4 p-4">
        <!-- Location / Hub -->
        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <label class="text-[11px] font-semibold tracking-wider text-muted uppercase">Location</label>
            <select
              v-model="locationId"
              :disabled="loadingLocations"
              class="mt-2 w-full rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2 disabled:opacity-50"
            >
              <option value="">
                {{ loadingLocations ? t('loading') : t('selectLocationPlaceholder') }}
              </option>
              <option v-for="loc in locations" :key="loc.locationId" :value="loc.locationId">
                {{ loc.name }}
              </option>
            </select>
          </div>

          <div>
            <label class="text-[11px] font-semibold tracking-wider text-muted uppercase">Hub</label>
            <select
              v-model="hubId"
              :disabled="!locationId || loadingHubs"
              class="mt-2 w-full rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2 disabled:opacity-50"
            >
              <option value="">
                {{ !locationId ? t('selectLocationFirst') : loadingHubs ? t('loading') : t('selectHubPlaceholder') }}
              </option>
              <option v-for="h in hubs" :key="h.deviceId" :value="h.deviceId">
                {{ h.ip ? `${h.label} (${h.ip})` : h.label }}
              </option>
            </select>
            <p class="mt-1 text-xs text-muted">
              {{ t('hubIpHint') }}
            </p>
          </div>
        </div>

        <!-- 허브 정보 패널 -->
        <InfoGrid v-if="selectedHub" :title="t('hubInfoTitle')" :items="hubInfoItems" />

        <!-- Hub Address -->
        <div>
          <label class="text-[11px] font-semibold tracking-wider text-muted uppercase">
            Hub Address (IP[:Port])
          </label>
          <input
            v-model="hubAddress"
            spellcheck="false"
            :placeholder="t('hubAddrPlaceholder')"
            class="mt-2 w-full rounded-lg border border-line bg-bg-2 px-3 py-2 font-mono text-sm text-text outline-none focus:border-brand-2"
          />
          <p class="mt-1 text-xs text-muted">
            {{ t('hubAddrHint') }}
          </p>
        </div>

        <!-- Driver -->
        <div>
          <label class="text-[11px] font-semibold tracking-wider text-muted uppercase">Driver</label>
          <select
            v-model="driverId"
            :disabled="!hubId || loadingDrivers"
            class="mt-2 w-full rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2 disabled:opacity-50"
          >
            <option value="">
              {{
                !hubId
                  ? t('selectHubFirst')
                  : loadingDrivers
                    ? t('loadingDrivers')
                    : t('allDriversOption')
              }}
            </option>
            <option v-for="d in drivers" :key="d.driverId" :value="d.driverId" :title="d.driverId">
              {{ d.name }}
            </option>
          </select>
          <p class="mt-1 text-xs text-muted">
            {{ t('driverHint') }}
          </p>
        </div>

        <!-- Log Level / Connect Timeout -->
        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <label class="text-[11px] font-semibold tracking-wider text-muted uppercase">Log Level</label>
            <select
              v-model="logLevel"
              class="mt-2 w-full rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
            >
              <option v-for="lv in LOG_LEVELS" :key="lv.value" :value="lv.value">{{ lv.label }}</option>
            </select>
            <p class="mt-1 text-xs text-muted">{{ t('logLevelHint') }}</p>
          </div>
          <div>
            <label class="text-[11px] font-semibold tracking-wider text-muted uppercase">
              Connect Timeout (ms)
            </label>
            <input
              v-model="connectTimeout"
              type="number"
              min="1000"
              step="1000"
              class="mt-2 w-full rounded-lg border border-line bg-bg-2 px-3 py-2 font-mono text-sm text-text outline-none focus:border-brand-2"
            />
            <p class="mt-1 text-xs text-muted">{{ t('connectTimeoutHint') }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Generated Command -->
    <section class="mt-4 overflow-hidden rounded-xl border border-line bg-card">
      <header class="flex items-center gap-2 border-b border-line px-4 py-3">
        <span class="h-3.5 w-1 rounded-full bg-gradient-to-b from-brand to-brand-2" />
        <h3 class="text-sm font-bold">Generated Command</h3>
      </header>
      <div class="flex flex-col gap-3 p-4">
        <label class="inline-flex cursor-pointer items-center gap-2 text-sm text-muted">
          <input v-model="includeToken" type="checkbox" class="accent-brand-2" />
          {{ t('includeToken') }}
        </label>
        <pre
          class="overflow-auto rounded-lg border border-line bg-bg-2 px-3 py-3 font-mono text-[13px] leading-relaxed whitespace-pre-wrap text-text"
        >{{ generatedCommand }}</pre>
        <div>
          <button
            class="rounded-lg border border-line px-4 py-2 text-sm font-semibold transition hover:-translate-y-px hover:border-brand-2"
            @click="copyCommand"
          >
            {{ t('copy') }}
          </button>
        </div>
      </div>
    </section>

    <!-- 사용 방법 -->
    <section class="mt-4 overflow-hidden rounded-xl border border-line bg-card">
      <header class="flex items-center gap-2 border-b border-line px-4 py-3">
        <span class="h-3.5 w-1 rounded-full bg-gradient-to-b from-brand to-brand-2" />
        <h3 class="text-sm font-bold">{{ t('howToTitle') }}</h3>
      </header>
      <div class="flex flex-col gap-4 p-4 text-sm">
        <div class="rounded-lg border border-brand-2/25 bg-brand-2/5 px-3 py-2 text-muted">
          <strong class="text-text">{{ t('prereq') }}</strong>{{ t('prereqBody') }}
          <a
            href="https://github.com/SmartThingsCommunity/smartthings-cli#installation"
            target="_blank"
            rel="noopener"
            class="text-brand-2 hover:underline"
          >{{ t('cliInstallGuide') }}</a>
        </div>

        <ol class="flex flex-col gap-3">
          <li
            v-for="(step, i) in (tm('steps') as StepItem[])"
            :key="i"
            class="flex gap-3"
          >
            <span
              class="flex size-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-2 text-xs font-bold text-[#061026]"
            >{{ i + 1 }}</span>
            <div>
              <strong class="text-text">{{ rt(step.t) }}</strong>
              <p class="mt-0.5 text-muted">{{ rt(step.d) }}</p>
            </div>
          </li>
        </ol>

        <!-- 옵션 설명 -->
        <div>
          <h4 class="mb-2 text-[11px] font-semibold tracking-wider text-muted uppercase">
            {{ t('optionsTitle') }}
          </h4>
          <div class="overflow-hidden rounded-lg border border-line">
            <table class="w-full text-left text-[13px]">
              <thead class="bg-bg-2 text-muted">
                <tr>
                  <th class="px-3 py-2 font-semibold">{{ t('colOption') }}</th>
                  <th class="px-3 py-2 font-semibold">{{ t('colDefault') }}</th>
                  <th class="px-3 py-2 font-semibold">{{ t('colDesc') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="opt in (tm('options') as OptionItem[])"
                  :key="opt.o"
                  class="border-t border-line"
                >
                  <td class="px-3 py-2 font-mono whitespace-nowrap text-brand-2">{{ opt.o }}</td>
                  <td class="px-3 py-2 text-muted">{{ rt(opt.d) }}</td>
                  <td class="px-3 py-2 text-muted">{{ rt(opt.t) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 예시 -->
        <div>
          <h4 class="mb-2 text-[11px] font-semibold tracking-wider text-muted uppercase">{{ t('examplesTitle') }}</h4>
          <pre
            class="overflow-auto rounded-lg border border-line bg-bg-2 px-3 py-3 font-mono text-[12.5px] leading-relaxed whitespace-pre-wrap text-text"
          >{{ t('exampleBlock') }}</pre>
        </div>

        <!-- 문제 해결 -->
        <div>
          <h4 class="mb-2 text-[11px] font-semibold tracking-wider text-muted uppercase">{{ t('troubleTitle') }}</h4>
          <div class="overflow-hidden rounded-lg border border-line">
            <table class="w-full text-left text-[13px]">
              <thead class="bg-bg-2 text-muted">
                <tr>
                  <th class="px-3 py-2 font-semibold">{{ t('colSymptom') }}</th>
                  <th class="px-3 py-2 font-semibold">{{ t('colCause') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="tr in (tm('troubles') as TroubleItem[])"
                  :key="tr.s"
                  class="border-t border-line"
                >
                  <td class="px-3 py-2 whitespace-nowrap text-text">{{ rt(tr.s) }}</td>
                  <td class="px-3 py-2 text-muted">{{ rt(tr.c) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  </template>
</template>
