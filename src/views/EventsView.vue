<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useTokenStore } from '@/stores/token'
import { getDevice, getDeviceStatus, listLocations } from '@/lib/stClient'
import {
  listVirtualDevices,
  getCapabilitySchema,
  sendVirtualDeviceEvents,
  type VirtualDevice,
  type CapabilitySchema,
  type AttributeDef,
  type ValueSchema,
} from '@/lib/api/events'
import { toastError } from '@/lib/toast'
import { useI18n } from 'vue-i18n'
import JsonView from '@/components/JsonView.vue'
import CliRef from '@/components/CliRef.vue'

const { t } = useI18n({
  useScope: 'local',
  inheritLocale: true,
  messages: {
    ko: {
      title: 'Event Send',
      desc: '가상 디바이스의 capability attribute 에 이벤트(상태 값)를 전송합니다.',
      selectLocation: '위치',
      selectDevice: '가상 디바이스',
      locationPlaceholder: '위치 선택',
      devicePlaceholderNoLoc: '먼저 위치를 선택하세요',
      selectVirtualDevice: '가상 디바이스 선택',
      loading: '불러오는 중…',
      refreshDevices: '디바이스 목록 새로고침',
      noVirtualDevices: '가상 디바이스가 없습니다.',
      capabilities: 'Capabilities',
      schemaLoading: '스키마 불러오는 중…',
      noAttributes: '이 capability 에는 attribute 가 없습니다.',
      writable: '쓰기 가능 (setter)',
      readonly: '읽기 전용',
      sending: '전송 중…',
      sendEvent: '▶ Send Event',
      eventLog: 'Event Log',
      clear: 'Clear',
      refreshStatus: '↻ 상태 새로고침',
      deviceStatusLabel: '현재 디바이스 상태 (원본 JSON)',
      noLocation: '위치 없음',
      logSelectValue: '⚠ "{name}" 값을 선택/입력하세요.',
      logError: '✗ 오류: {msg}',
    },
    en: {
      title: 'Event Send',
      desc: 'Send events (state values) to a virtual device capability attribute.',
      selectLocation: 'Location',
      selectDevice: 'Virtual device',
      locationPlaceholder: 'Select a location',
      devicePlaceholderNoLoc: 'Select a location first',
      selectVirtualDevice: 'Select virtual device',
      loading: 'Loading…',
      refreshDevices: 'Refresh device list',
      noVirtualDevices: 'No virtual devices.',
      capabilities: 'Capabilities',
      schemaLoading: 'Loading schema…',
      noAttributes: 'This capability has no attributes.',
      writable: 'Writable (setter)',
      readonly: 'Read-only',
      sending: 'Sending…',
      sendEvent: '▶ Send Event',
      eventLog: 'Event Log',
      clear: 'Clear',
      refreshStatus: '↻ Refresh status',
      deviceStatusLabel: 'Current device status (raw JSON)',
      noLocation: 'No location',
      logSelectValue: '⚠ Select/enter a value for "{name}".',
      logError: '✗ Error: {msg}',
    },
  },
})

const { hasToken } = storeToRefs(useTokenStore())

// --- 디바이스 목록 (위치 → 디바이스 2단계) --------------------------------
interface DeviceOption {
  deviceId: string
  label: string
  locationId: string
}
const devices = ref<DeviceOption[]>([])
const selectedLocationId = ref('')
const selectedDeviceId = ref('')
const devicesLoading = ref(false)
const locationNames = ref(new Map<string, string>())

// 위치 옵션 (디바이스가 있는 위치만, 이름 + 개수)
const locationOptions = computed(() => {
  const map = new Map<string, { id: string; name: string; count: number }>()
  for (const d of devices.value) {
    const ex = map.get(d.locationId)
    if (ex) ex.count++
    else map.set(d.locationId, { id: d.locationId, name: locationNames.value.get(d.locationId) || d.locationId || t('noLocation'), count: 1 })
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
})
// 선택 위치의 디바이스
const filteredDevices = computed(() =>
  devices.value.filter((d) => d.locationId === selectedLocationId.value),
)

// --- 선택된 디바이스 상세/상태 -------------------------------------------
interface CapEntry {
  componentId: string
  capabilityId: string
}
interface ComponentGroup {
  componentId: string
  caps: string[]
}
const componentGroups = ref<ComponentGroup[]>([])
const deviceLoading = ref(false)

const selectedComponent = ref('')
const selectedCapability = ref('')

// 디바이스 status 캐시 (현재값 표시용)
const deviceStatus = ref<Record<string, unknown> | null>(null)
const statusLoading = ref(false)

// capability 스키마 캐시 (컴포넌트 내 ref Map)
const schemaCache = ref(new Map<string, CapabilitySchema>())
const currentSchema = ref<CapabilitySchema | null>(null)
const schemaLoading = ref(false)

// attribute 별 입력 모델
const inputs = ref<Record<string, unknown>>({})
const sendingAttr = ref<string | null>(null)

// --- 로그 -----------------------------------------------------------------
type LogKind = 'success' | 'error' | 'warning' | 'info'
interface LogLine {
  id: number
  time: string
  message: string
  kind: LogKind
}
const logs = ref<LogLine[]>([])
let logSeq = 0
function addLog(message: string, kind: LogKind) {
  logs.value.unshift({
    id: ++logSeq,
    time: new Date().toLocaleTimeString(),
    message,
    kind,
  })
  if (logs.value.length > 30) logs.value.length = 30
}
function clearLog() {
  logs.value = []
}
const logColor: Record<LogKind, string> = {
  success: 'text-success',
  error: 'text-warn',
  warning: 'text-warn',
  info: 'text-brand-2',
}

// --- 디바이스 로딩 --------------------------------------------------------
async function loadDevices() {
  if (!hasToken.value) return
  devicesLoading.value = true
  try {
    const [locRes, devRes] = await Promise.all([listLocations(), listVirtualDevices()])
    locationNames.value = new Map(locRes.items.map((l) => [l.locationId, l.name]))
    const opts = devRes.items
      .map((d: VirtualDevice) => {
        const label = d.label || d.name || d.deviceId
        return { deviceId: d.deviceId, label, locationId: d.locationId || '' }
      })
      .sort((a, b) => a.label.localeCompare(b.label))
    devices.value = opts
    selectedLocationId.value = ''
    selectedDeviceId.value = ''
    // 위치가 하나뿐이면 자동 선택
    if (locationOptions.value.length === 1) {
      selectedLocationId.value = locationOptions.value[0].id
    }
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    devicesLoading.value = false
  }
}

function onLocationChange() {
  selectedDeviceId.value = ''
  // 컴포넌트/스키마 등 초기화
  void onDeviceChange()
}

async function onDeviceChange() {
  const deviceId = selectedDeviceId.value
  componentGroups.value = []
  selectedComponent.value = ''
  selectedCapability.value = ''
  currentSchema.value = null
  inputs.value = {}
  deviceStatus.value = null
  schemaCache.value = new Map()
  if (!deviceId) return

  deviceLoading.value = true
  try {
    const [device] = await Promise.all([getDevice(deviceId), refreshStatus()])
    const comps = (device.components as Array<{ id: string; capabilities?: Array<{ id: string }> }>) ?? []
    const groups: ComponentGroup[] = []
    let first: CapEntry | null = null
    for (const comp of comps) {
      const caps = (comp.capabilities ?? []).map((c) => c.id)
      if (!caps.length) continue
      groups.push({ componentId: comp.id, caps })
      if (!first) first = { componentId: comp.id, capabilityId: caps[0] }
    }
    componentGroups.value = groups
    if (first) await selectCapability(first.componentId, first.capabilityId)
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    deviceLoading.value = false
  }
}

// --- status --------------------------------------------------------------
async function refreshStatus() {
  const deviceId = selectedDeviceId.value
  if (!deviceId) return
  statusLoading.value = true
  try {
    deviceStatus.value = await getDeviceStatus(deviceId)
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    statusLoading.value = false
  }
}

// --- capability 선택 ------------------------------------------------------
async function selectCapability(componentId: string, capabilityId: string) {
  selectedComponent.value = componentId
  selectedCapability.value = capabilityId
  currentSchema.value = null
  schemaLoading.value = true
  try {
    let schema = schemaCache.value.get(capabilityId)
    if (!schema) {
      schema = await getCapabilitySchema(capabilityId)
      schemaCache.value.set(capabilityId, schema)
    }
    currentSchema.value = schema
    initInputs(componentId, capabilityId, schema)
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    schemaLoading.value = false
  }
}

// --- 입력 위젯 모델 -------------------------------------------------------
function valueSchemaOf(attr: AttributeDef): ValueSchema | undefined {
  return attr.schema?.properties?.value
}
function unitEnumOf(attr: AttributeDef): string[] | undefined {
  return attr.schema?.properties?.unit?.enum
}

interface AttrView {
  name: string
  def: AttributeDef
  valueSchema?: ValueSchema
  unitEnum?: string[]
  hasSetter: boolean
  widget: 'enumButtons' | 'enumSelect' | 'boolean' | 'number' | 'string' | 'json'
  currentValue: unknown
  currentUnit?: string
}

function currentStatusOf(componentId: string, capabilityId: string, attrName: string) {
  const components = (deviceStatus.value as { components?: Record<string, unknown> } | null)?.components
  const comp = components?.[componentId] as Record<string, unknown> | undefined
  const cap = comp?.[capabilityId] as Record<string, unknown> | undefined
  const attr = cap?.[attrName] as { value?: unknown; unit?: string } | undefined
  return { value: attr?.value, unit: attr?.unit }
}

function widgetFor(vs?: ValueSchema): AttrView['widget'] {
  if (!vs) return 'json'
  if (vs.enum && vs.enum.length > 0) return vs.enum.length <= 10 ? 'enumButtons' : 'enumSelect'
  if (vs.type === 'boolean') return 'boolean'
  if (vs.type === 'integer' || vs.type === 'number') return 'number'
  if (vs.type === 'string') return 'string'
  return 'json'
}

const attrViews = computed<AttrView[]>(() => {
  const schema = currentSchema.value
  if (!schema?.attributes) return []
  const out: AttrView[] = []
  for (const [name, def] of Object.entries(schema.attributes)) {
    const valueSchema = valueSchemaOf(def)
    const { value, unit } = currentStatusOf(selectedComponent.value, selectedCapability.value, name)
    out.push({
      name,
      def,
      valueSchema,
      unitEnum: unitEnumOf(def),
      hasSetter: !!def.setter,
      widget: widgetFor(valueSchema),
      currentValue: value,
      currentUnit: unit,
    })
  }
  return out
})

function initInputs(componentId: string, capabilityId: string, schema: CapabilitySchema) {
  const next: Record<string, unknown> = {}
  for (const [name, def] of Object.entries(schema.attributes ?? {})) {
    const vs = valueSchemaOf(def)
    const { value } = currentStatusOf(componentId, capabilityId, name)
    const widget = widgetFor(vs)
    if (widget === 'boolean') {
      next[name] = value === true
    } else if (widget === 'number') {
      const min = vs?.minimum ?? 0
      next[name] = typeof value === 'number' ? value : min
    } else if (widget === 'enumButtons' || widget === 'enumSelect') {
      next[name] = value !== undefined ? String(value) : ''
    } else if (widget === 'string') {
      next[name] = value !== undefined ? String(value) : ''
    } else {
      next[name] = value !== undefined ? JSON.stringify(value, null, 2) : ''
    }
  }
  inputs.value = next
}

function stepFor(vs?: ValueSchema): number {
  if (vs?.multipleOf) return vs.multipleOf
  return vs?.type === 'integer' ? 1 : 0.1
}
function unitLabel(av: AttrView): string {
  return av.unitEnum && av.unitEnum.length > 0 ? av.unitEnum[0] : ''
}

// --- 전송할 값 추출 -------------------------------------------------------
function resolveSendValue(av: AttrView): { ok: boolean; value?: unknown } {
  const raw = inputs.value[av.name]
  switch (av.widget) {
    case 'boolean':
      return { ok: true, value: raw === true }
    case 'number': {
      const n = av.valueSchema?.type === 'integer' ? parseInt(String(raw), 10) : parseFloat(String(raw))
      if (Number.isNaN(n)) return { ok: false }
      return { ok: true, value: n }
    }
    case 'enumButtons':
    case 'enumSelect': {
      const s = String(raw ?? '')
      if (s === '') return { ok: false }
      // 원본 enum 이 숫자였으면 숫자로 캐스팅
      const hadNumber = (av.valueSchema?.enum ?? []).some((x) => typeof x === 'number')
      const v: unknown = hadNumber && !Number.isNaN(Number(s)) ? Number(s) : s
      return { ok: true, value: v }
    }
    case 'string': {
      const s = String(raw ?? '')
      if (s === '') return { ok: false }
      return { ok: true, value: s }
    }
    default: {
      // json: JSON 파싱 시도, 실패 시 원문 문자열
      const s = String(raw ?? '').trim()
      if (s === '') return { ok: false }
      try {
        return { ok: true, value: JSON.parse(s) }
      } catch {
        return { ok: true, value: s }
      }
    }
  }
}

async function sendEvent(av: AttrView) {
  if (!selectedDeviceId.value || !selectedComponent.value || !selectedCapability.value) return
  const resolved = resolveSendValue(av)
  if (!resolved.ok) {
    addLog(t('logSelectValue', { name: av.name }), 'warning')
    return
  }
  const unit = av.unitEnum && av.unitEnum.length > 0 ? av.unitEnum[0] : null

  sendingAttr.value = av.name
  addLog(`→ ${selectedCapability.value}.${av.name} = ${JSON.stringify(resolved.value)}`, 'info')
  try {
    await sendVirtualDeviceEvents(selectedDeviceId.value, [
      {
        value: resolved.value,
        component: selectedComponent.value,
        capability: selectedCapability.value,
        attribute: av.name,
        unit,
        data: null,
      },
    ])
    addLog(`✓ OK: ${selectedCapability.value}.${av.name} = ${JSON.stringify(resolved.value)}`, 'success')
    await refreshStatus()
  } catch (e) {
    addLog(t('logError', { msg: e instanceof Error ? e.message : String(e) }), 'error')
  } finally {
    sendingAttr.value = null
  }
}

function schemaText(def: AttributeDef): string {
  return JSON.stringify(def, null, 2)
}

onMounted(loadDevices)
</script>

<template>
  <header class="mb-6">
    <h1 class="text-2xl font-extrabold tracking-tight md:text-3xl">{{ t('title') }}</h1>
    <p class="mt-1 text-sm text-muted">
      {{ t('desc') }}
    </p>
  </header>
  <CliRef
    :commands="['virtualdevices:events [device-id] [name] [value] [unit]']"
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
    <!-- 위치 → 디바이스 선택 -->
    <section class="rounded-xl border border-line bg-card p-4">
      <label class="text-[11px] font-semibold tracking-wider text-muted uppercase">
        {{ t('selectVirtualDevice') }}
      </label>
      <!-- 1단계: 위치 -->
      <div class="mt-3 flex items-center gap-2">
        <span class="w-12 shrink-0 text-xs font-semibold text-muted">{{ t('selectLocation') }}</span>
        <select
          v-model="selectedLocationId"
          class="w-full rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2 disabled:opacity-50"
          :disabled="devicesLoading"
          @change="onLocationChange"
        >
          <option value="" disabled>{{ devicesLoading ? t('loading') : t('locationPlaceholder') }}</option>
          <option v-for="l in locationOptions" :key="l.id" :value="l.id">
            {{ l.name }} ({{ l.count }})
          </option>
        </select>
        <button
          class="shrink-0 rounded-lg border border-line px-3 py-2 text-sm text-muted transition hover:-translate-y-px hover:border-brand-2 hover:text-brand-2 disabled:opacity-50"
          :disabled="devicesLoading"
          :title="t('refreshDevices')"
          @click="loadDevices"
        >
          ↻
        </button>
      </div>
      <!-- 2단계: 디바이스 -->
      <div class="mt-2 flex items-center gap-2">
        <span class="w-12 shrink-0 text-xs font-semibold text-muted">{{ t('selectDevice') }}</span>
        <select
          v-model="selectedDeviceId"
          class="w-full rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2 disabled:opacity-50"
          :disabled="!selectedLocationId || devicesLoading"
          @change="onDeviceChange"
        >
          <option value="" disabled>
            {{ selectedLocationId ? t('selectVirtualDevice') : t('devicePlaceholderNoLoc') }}
          </option>
          <option v-for="d in filteredDevices" :key="d.deviceId" :value="d.deviceId">
            {{ d.label }}
          </option>
        </select>
      </div>
      <p v-if="!devicesLoading && !devices.length" class="mt-2 text-xs text-muted">
        {{ t('noVirtualDevices') }}
      </p>
    </section>

    <!-- 메인 패널 -->
    <div v-if="selectedDeviceId" class="mt-4 grid gap-4 md:grid-cols-[260px_1fr]">
      <!-- capability 목록 -->
      <section class="overflow-hidden rounded-xl border border-line bg-card">
        <header class="flex items-center gap-2 border-b border-line px-4 py-3">
          <span class="h-3.5 w-1 rounded-full bg-gradient-to-b from-brand to-brand-2" />
          <h3 class="text-sm font-bold">{{ t('capabilities') }}</h3>
        </header>
        <div v-if="deviceLoading" class="px-4 py-4 text-sm text-muted">{{ t('loading') }}</div>
        <div v-else class="max-h-[60vh] overflow-y-auto">
          <template v-for="g in componentGroups" :key="g.componentId">
            <div
              class="border-t border-line bg-bg-2 px-4 py-1.5 text-[10px] font-bold tracking-wider text-muted uppercase first:border-t-0"
            >
              {{ g.componentId }}
            </div>
            <button
              v-for="cap in g.caps"
              :key="`${g.componentId}.${cap}`"
              class="block w-full border-b border-line/60 px-4 py-2 text-left text-[13px] break-words transition"
              :class="
                selectedComponent === g.componentId && selectedCapability === cap
                  ? 'bg-gradient-to-br from-brand to-brand-2 font-semibold text-[#061026]'
                  : 'text-text hover:bg-bg-2 hover:text-brand-2'
              "
              @click="selectCapability(g.componentId, cap)"
            >
              {{ cap }}
            </button>
          </template>
        </div>
      </section>

      <!-- attribute 카드 -->
      <section>
        <div v-if="schemaLoading" class="flex items-center gap-2 text-sm text-muted">
          <span class="size-2 animate-pulse rounded-full bg-brand-2" /> {{ t('schemaLoading') }}
        </div>

        <template v-else-if="currentSchema">
          <div class="mb-3 flex flex-wrap items-center gap-2">
            <span
              class="rounded-full border border-brand-2/40 bg-brand-2/10 px-3 py-1 text-xs font-semibold text-brand-2"
            >
              {{ selectedCapability }}
            </span>
            <span class="text-xs text-muted">
              component: <strong class="text-text">{{ selectedComponent }}</strong>
            </span>
          </div>

          <div
            v-if="!attrViews.length"
            class="rounded-xl border border-line bg-card px-4 py-3 text-sm text-muted"
          >
            {{ t('noAttributes') }}
          </div>

          <div v-else class="grid gap-3.5 sm:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
            <div
              v-for="av in attrViews"
              :key="av.name"
              class="flex flex-col overflow-hidden rounded-xl border border-line bg-card"
            >
              <!-- 헤더 -->
              <div class="flex items-center justify-between border-b border-line bg-bg-2 px-4 py-2.5">
                <div class="flex items-center gap-1.5">
                  <strong class="text-sm text-text">{{ av.name }}</strong>
                  <span
                    v-if="av.hasSetter"
                    class="text-xs text-success"
                    :title="t('writable')"
                    >✎</span
                  >
                  <span v-else class="text-xs text-muted" :title="t('readonly')">👁</span>
                </div>
                <span
                  class="rounded-md px-2 py-0.5 text-xs font-semibold"
                  :class="
                    av.currentValue !== undefined
                      ? 'bg-success/15 text-success'
                      : 'bg-bg-2 text-muted'
                  "
                >
                  {{
                    av.currentValue !== undefined
                      ? `${av.currentValue}${av.currentUnit ? ' ' + av.currentUnit : ''}`
                      : '—'
                  }}
                </span>
              </div>

              <!-- 본문: 입력 위젯 -->
              <div class="flex-1 px-4 py-4">
                <!-- enum 버튼 -->
                <div v-if="av.widget === 'enumButtons'" class="flex flex-wrap gap-1.5">
                  <button
                    v-for="ev in av.valueSchema?.enum ?? []"
                    :key="String(ev)"
                    type="button"
                    class="rounded-full border px-3.5 py-1 text-[13px] transition"
                    :class="
                      inputs[av.name] === String(ev)
                        ? 'border-transparent bg-gradient-to-br from-brand to-brand-2 font-semibold text-[#061026]'
                        : 'border-line text-text hover:border-brand-2'
                    "
                    @click="inputs[av.name] = String(ev)"
                  >
                    {{ av.def.enumNames?.[String(ev)] ?? String(ev) }}
                  </button>
                </div>

                <!-- enum 셀렉트 -->
                <select
                  v-else-if="av.widget === 'enumSelect'"
                  v-model="inputs[av.name] as string"
                  class="w-full rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
                >
                  <option v-for="ev in av.valueSchema?.enum ?? []" :key="String(ev)" :value="String(ev)">
                    {{ av.def.enumNames?.[String(ev)] ?? String(ev) }}
                  </option>
                </select>

                <!-- boolean 토글 -->
                <label
                  v-else-if="av.widget === 'boolean'"
                  class="flex cursor-pointer items-center justify-center gap-3 py-2"
                >
                  <input
                    v-model="inputs[av.name] as boolean"
                    type="checkbox"
                    class="size-5 accent-brand-2"
                  />
                  <span class="font-mono text-sm text-text">{{ inputs[av.name] === true }}</span>
                </label>

                <!-- number 슬라이더 -->
                <div v-else-if="av.widget === 'number'">
                  <div class="mb-1 text-center">
                    <span class="text-3xl leading-none font-bold text-brand-2">{{ inputs[av.name] }}</span>
                    <span v-if="unitLabel(av)" class="ml-1 text-sm text-muted">{{ unitLabel(av) }}</span>
                  </div>
                  <input
                    v-model.number="inputs[av.name] as number"
                    type="range"
                    class="w-full accent-brand-2"
                    :min="av.valueSchema?.minimum ?? 0"
                    :max="av.valueSchema?.maximum ?? 100"
                    :step="stepFor(av.valueSchema)"
                  />
                  <div class="mt-0.5 flex justify-between text-[11px] text-muted">
                    <span>{{ av.valueSchema?.minimum ?? 0 }}{{ unitLabel(av) }}</span>
                    <span>{{ av.valueSchema?.maximum ?? 100 }}{{ unitLabel(av) }}</span>
                  </div>
                </div>

                <!-- string 텍스트 -->
                <input
                  v-else-if="av.widget === 'string'"
                  v-model="inputs[av.name] as string"
                  type="text"
                  spellcheck="false"
                  class="w-full rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
                />

                <!-- 그 외 JSON -->
                <textarea
                  v-else
                  v-model="inputs[av.name] as string"
                  spellcheck="false"
                  rows="3"
                  placeholder="JSON value"
                  class="w-full resize-y rounded-lg border border-line bg-bg-2 px-3 py-2 font-mono text-[13px] text-text outline-none focus:border-brand-2"
                />
              </div>

              <!-- 스키마 접이식 -->
              <details class="border-t border-line bg-bg-2">
                <summary class="cursor-pointer px-4 py-1.5 text-xs text-muted select-none hover:text-text">
                  Schema
                </summary>
                <pre
                  class="max-h-60 overflow-auto border-t border-line px-4 py-2 font-mono text-[11px] leading-relaxed text-muted"
                >{{ schemaText(av.def) }}</pre>
              </details>

              <!-- 전송 -->
              <div class="border-t border-line px-4 py-3">
                <button
                  class="w-full rounded-lg border border-transparent bg-gradient-to-br from-brand to-brand-2 px-4 py-2 text-sm font-semibold text-[#061026] transition hover:-translate-y-px disabled:opacity-50"
                  :disabled="sendingAttr === av.name"
                  @click="sendEvent(av)"
                >
                  {{ sendingAttr === av.name ? t('sending') : t('sendEvent') }}
                </button>
              </div>
            </div>
          </div>
        </template>
      </section>
    </div>

    <!-- 이벤트 로그 -->
    <section v-if="logs.length" class="mt-4 overflow-hidden rounded-xl border border-line bg-card">
      <header class="flex items-center justify-between border-b border-line px-4 py-2.5">
        <div class="flex items-center gap-2">
          <span class="h-3.5 w-1 rounded-full bg-gradient-to-b from-brand to-brand-2" />
          <h3 class="text-sm font-bold">{{ t('eventLog') }}</h3>
        </div>
        <button
          class="rounded-md border border-line px-2 py-1 text-xs text-muted transition hover:border-brand-2 hover:text-brand-2"
          @click="clearLog"
        >
          {{ t('clear') }}
        </button>
      </header>
      <div class="max-h-52 overflow-y-auto px-4 py-2 font-mono text-[12px]">
        <div
          v-for="line in logs"
          :key="line.id"
          class="border-b border-line/50 py-1"
          :class="logColor[line.kind]"
        >
          [{{ line.time }}] {{ line.message }}
        </div>
      </div>
    </section>

    <!-- 현재 디바이스 상태 -->
    <div v-if="selectedDeviceId" class="mt-4">
      <div class="mb-2 flex items-center justify-end">
        <button
          class="rounded-md border border-line px-2 py-1 text-xs text-muted transition hover:border-brand-2 hover:text-brand-2 disabled:opacity-50"
          :disabled="statusLoading"
          @click="refreshStatus"
        >
          {{ statusLoading ? t('loading') : t('refreshStatus') }}
        </button>
      </div>
      <JsonView v-if="deviceStatus" :value="deviceStatus" :label="t('deviceStatusLabel')" />
    </div>
  </template>
</template>
