<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useTokenStore } from '@/stores/token'
import { listLocations } from '@/lib/stClient'
import { listHubs, getHubInfo, listHubDrivers, type HubInfo, type HubDriver } from '@/lib/api/hublog'
import type { Location } from '@/lib/types'
import { toastError, toastSuccess } from '@/lib/toast'
import InfoGrid, { type InfoItem } from '@/components/InfoGrid.vue'

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

const LOG_LEVELS = [
  { value: 'TRACE', label: 'TRACE (모든 로그, 기본값)' },
  { value: 'DEBUG', label: 'DEBUG' },
  { value: 'INFO', label: 'INFO' },
  { value: 'WARN', label: 'WARN' },
  { value: 'ERROR', label: 'ERROR' },
  { value: 'FATAL', label: 'FATAL' },
]

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
    toastError('Location 로드 실패: ' + (e instanceof Error ? e.message : String(e)))
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
    toastError('Hub 로드 실패: ' + (e instanceof Error ? e.message : String(e)))
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
    toastSuccess(`설치된 드라이버 ${list.length}개 로드 완료.`)
  } catch (e) {
    toastError('드라이버 로드 실패: ' + (e instanceof Error ? e.message : String(e)))
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
    toastSuccess('명령어를 클립보드에 복사했습니다.')
  } catch {
    toastError('복사에 실패했습니다.')
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
    <h1 class="text-2xl font-extrabold tracking-tight md:text-3xl">Hub Log</h1>
    <p class="mt-1 text-sm text-muted">
      Hub와 드라이버 정보를 자동으로 불러와 <code>edge:drivers:logcat</code> 실행 명령어를
      생성합니다. 복사해서 같은 네트워크의 터미널에서 실행하세요.
    </p>
  </header>

  <div
    v-if="!hasToken"
    class="rounded-xl border-l-[3px] border-warn bg-warn/10 px-4 py-3 text-sm text-warn"
  >
    PAT 토큰이 없습니다. 우측 상단의 <strong>PAT 설정</strong> 으로 토큰을 입력하세요.
  </div>

  <template v-else>
    <!-- 안내 배너 -->
    <div class="mb-4 flex flex-col gap-3">
      <div class="flex items-start gap-3 rounded-xl border border-brand-2/25 bg-brand-2/5 px-4 py-3 text-sm">
        <span class="text-lg leading-none">💡</span>
        <div class="text-muted">
          <strong class="text-text">이 기능은 왜 만들어졌나요?</strong><br />
          웹에서 바로 로그를 보여드리고 싶었지만 방법을 찾지 못해, 초보자분들이 명령어를 직접 찾아
          입력하는 수고 없이 Hub와 드라이버 정보를 자동으로 불러와 실행 커맨드를 쉽게 만들 수 있도록
          제작한 커맨드 생성기입니다. 생성된 명령어를 복사해 터미널에 붙여넣기만 하면 됩니다.
        </div>
      </div>
      <div class="flex items-start gap-3 rounded-xl border-l-[3px] border-warn bg-warn/10 px-4 py-3 text-sm text-warn">
        <span class="text-lg leading-none">⚠️</span>
        <div>
          <strong>동일 네트워크 전용</strong><br />
          이 기능은 <strong>Hub와 같은 로컬 네트워크(내부망)</strong>에서만 동작합니다. 생성된 명령어를
          Hub와 같은 Wi-Fi/LAN에 연결된 PC의 터미널에서 실행하세요. 외부 네트워크(원격)에서는 Hub에
          직접 접근할 수 없습니다.
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
                {{ loadingLocations ? 'Loading…' : 'Select Location' }}
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
                {{ !locationId ? 'Location을 먼저 선택하세요' : loadingHubs ? 'Loading…' : 'Select Hub' }}
              </option>
              <option v-for="h in hubs" :key="h.deviceId" :value="h.deviceId">
                {{ h.ip ? `${h.label} (${h.ip})` : h.label }}
              </option>
            </select>
            <p class="mt-1 text-xs text-muted">
              허브 이름 옆에 IP가 표시되면 아래 Hub Address에 자동 입력됩니다.
            </p>
          </div>
        </div>

        <!-- 허브 정보 패널 -->
        <InfoGrid v-if="selectedHub" title="Hub 정보" :items="hubInfoItems" />

        <!-- Hub Address -->
        <div>
          <label class="text-[11px] font-semibold tracking-wider text-muted uppercase">
            Hub Address (IP[:Port])
          </label>
          <input
            v-model="hubAddress"
            spellcheck="false"
            placeholder="예: 192.168.1.25 또는 192.168.1.25:9495"
            class="mt-2 w-full rounded-lg border border-line bg-bg-2 px-3 py-2 font-mono text-sm text-text outline-none focus:border-brand-2"
          />
          <p class="mt-1 text-xs text-muted">
            Hub의 내부 IP 주소입니다. 자동 감지되지 않으면 직접 입력하세요. SmartThings 앱 → Hub →
            정보에서 확인 가능합니다.
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
                  ? 'Hub를 먼저 선택하세요'
                  : loadingDrivers
                    ? 'Loading drivers…'
                    : '(모든 드라이버 — --all 옵션)'
              }}
            </option>
            <option v-for="d in drivers" :key="d.driverId" :value="d.driverId" :title="d.driverId">
              {{ d.name }}
            </option>
          </select>
          <p class="mt-1 text-xs text-muted">
            선택하지 않으면 설치된 모든 드라이버의 로그가 출력됩니다 (--all).
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
            <p class="mt-1 text-xs text-muted">선택한 레벨 이상의 로그만 출력됩니다.</p>
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
            <p class="mt-1 text-xs text-muted">Hub 연결 대기 시간 (기본값: 30000ms)</p>
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
          토큰 포함
        </label>
        <pre
          class="overflow-auto rounded-lg border border-line bg-bg-2 px-3 py-3 font-mono text-[13px] leading-relaxed whitespace-pre-wrap text-text"
        >{{ generatedCommand }}</pre>
        <div>
          <button
            class="rounded-lg border border-line px-4 py-2 text-sm font-semibold transition hover:-translate-y-px hover:border-brand-2"
            @click="copyCommand"
          >
            Copy
          </button>
        </div>
      </div>
    </section>

    <!-- 사용 방법 -->
    <section class="mt-4 overflow-hidden rounded-xl border border-line bg-card">
      <header class="flex items-center gap-2 border-b border-line px-4 py-3">
        <span class="h-3.5 w-1 rounded-full bg-gradient-to-b from-brand to-brand-2" />
        <h3 class="text-sm font-bold">사용 방법 (How to Use)</h3>
      </header>
      <div class="flex flex-col gap-4 p-4 text-sm">
        <div class="rounded-lg border border-brand-2/25 bg-brand-2/5 px-3 py-2 text-muted">
          <strong class="text-text">사전 준비:</strong> SmartThings CLI가 설치되어 있어야 합니다.
          <a
            href="https://github.com/SmartThingsCommunity/smartthings-cli#installation"
            target="_blank"
            rel="noopener"
            class="text-brand-2 hover:underline"
          >SmartThings CLI 설치 가이드 →</a>
        </div>

        <ol class="flex flex-col gap-3">
          <li v-for="(step, i) in [
              { t: 'Hub와 같은 네트워크에 PC를 연결합니다.', d: 'Hub가 연결된 공유기의 Wi-Fi에 접속하거나 유선 LAN으로 동일 네트워크에 있어야 합니다. 외부 인터넷 망이나 VPN 등 다른 네트워크에서는 Hub에 직접 접근할 수 없습니다.' },
              { t: 'Hub의 내부 IP를 확인합니다.', d: '위 드롭다운에서 자동 감지되지 않는다면: SmartThings 앱 → Devices → Hub → ⋮ → Information → IP Address, 공유기 관리 페이지의 연결 장치 목록, 또는 CLI(smartthings devices --type=HUB)로 확인하세요.' },
              { t: 'SmartThings CLI 로그인을 확인합니다.', d: '처음 사용 시 smartthings login 으로 로그인하거나, PAT 사용 시 smartthings config set token YOUR_PAT_TOKEN.' },
              { t: '위에서 옵션을 설정하고 명령어를 복사합니다.', d: 'Driver(특정/전체), Hub Address(내부 IP), Log Level(TRACE 가장 상세), Connect Timeout(느린 경우 증가).' },
              { t: '터미널에 붙여넣고 실행합니다.', d: '실행하면 Hub에서 실시간으로 로그가 스트리밍됩니다. 종료하려면 Ctrl + C 를 누르세요.' },
            ]"
            :key="i"
            class="flex gap-3"
          >
            <span
              class="flex size-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-2 text-xs font-bold text-[#061026]"
            >{{ i + 1 }}</span>
            <div>
              <strong class="text-text">{{ step.t }}</strong>
              <p class="mt-0.5 text-muted">{{ step.d }}</p>
            </div>
          </li>
        </ol>

        <!-- 옵션 설명 -->
        <div>
          <h4 class="mb-2 text-[11px] font-semibold tracking-wider text-muted uppercase">
            옵션 설명 (CLI Options)
          </h4>
          <div class="overflow-hidden rounded-lg border border-line">
            <table class="w-full text-left text-[13px]">
              <thead class="bg-bg-2 text-muted">
                <tr>
                  <th class="px-3 py-2 font-semibold">옵션</th>
                  <th class="px-3 py-2 font-semibold">기본값</th>
                  <th class="px-3 py-2 font-semibold">설명</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="opt in [
                    { o: '[DRIVERID]', d: '없음', t: '특정 드라이버 ID 지정 시 해당 로그만 표시. 생략 시 --all 과 동일.' },
                    { o: '--hub-address', d: '입력 프롬프트', t: 'Hub의 내부 IP. 포트 지정 가능(192.168.1.25:9495). 생략하면 CLI가 직접 물어봄.' },
                    { o: '--log-level', d: 'TRACE', t: '출력할 최소 로그 레벨. TRACE → DEBUG → INFO → WARN → ERROR → FATAL 순으로 적게 출력.' },
                    { o: '--connect-timeout', d: '30000', t: 'Hub 연결 최대 대기 시간(ms). 응답이 느리면 늘려주세요.' },
                  ]"
                  :key="opt.o"
                  class="border-t border-line"
                >
                  <td class="px-3 py-2 font-mono whitespace-nowrap text-brand-2">{{ opt.o }}</td>
                  <td class="px-3 py-2 text-muted">{{ opt.d }}</td>
                  <td class="px-3 py-2 text-muted">{{ opt.t }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 예시 -->
        <div>
          <h4 class="mb-2 text-[11px] font-semibold tracking-wider text-muted uppercase">자주 쓰는 예시</h4>
          <pre
            class="overflow-auto rounded-lg border border-line bg-bg-2 px-3 py-3 font-mono text-[12.5px] leading-relaxed whitespace-pre-wrap text-text"
          ># 특정 드라이버, TRACE 레벨 (가장 상세)
smartthings edge:drivers:logcat ca82d551-2824-44a7-8318-355cf082ade8 --hub-address 192.168.1.25

# 모든 드라이버, DEBUG 이상 로그
smartthings edge:drivers:logcat --hub-address 192.168.1.25 --log-level DEBUG

# 연결 타임아웃을 60초로 늘린 경우
smartthings edge:drivers:logcat --hub-address 192.168.1.25 --connect-timeout=60000</pre>
        </div>

        <!-- 문제 해결 -->
        <div>
          <h4 class="mb-2 text-[11px] font-semibold tracking-wider text-muted uppercase">문제 해결</h4>
          <div class="overflow-hidden rounded-lg border border-line">
            <table class="w-full text-left text-[13px]">
              <thead class="bg-bg-2 text-muted">
                <tr>
                  <th class="px-3 py-2 font-semibold">증상</th>
                  <th class="px-3 py-2 font-semibold">원인 / 해결법</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="tr in [
                    { s: '연결이 안 됨 / 타임아웃', c: 'Hub와 같은 네트워크인지, IP가 올바른지 확인. ping 으로 Hub 응답 확인.' },
                    { s: '로그가 아무것도 안 나옴', c: '드라이버가 실행 중인지 확인. Log Level을 TRACE로 낮추면 더 많은 로그가 나옴.' },
                    { s: 'CLI 명령어를 찾을 수 없음', c: 'CLI 미설치 또는 PATH 누락. 설치 후 터미널 재시작.' },
                    { s: '인증 오류', c: 'smartthings login 또는 PAT 토큰 재설정 필요.' },
                  ]"
                  :key="tr.s"
                  class="border-t border-line"
                >
                  <td class="px-3 py-2 whitespace-nowrap text-text">{{ tr.s }}</td>
                  <td class="px-3 py-2 text-muted">{{ tr.c }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  </template>
</template>
