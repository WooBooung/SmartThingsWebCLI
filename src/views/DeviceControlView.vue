<script setup lang="ts">
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useTokenStore } from '@/stores/token'
import { getDevice, getDeviceStatus, listRooms } from '@/lib/stClient'
import type { Device } from '@/lib/types'
import { toastError, toastSuccess } from '@/lib/toast'
import DeviceSelect, { type DeviceSelection } from '@/components/DeviceSelect.vue'
import JsonView from '@/components/JsonView.vue'
import CliRef from '@/components/CliRef.vue'
import {
  getCapabilityCommands,
  executeDeviceCommands,
  updateDevice,
  getDevicePreferences,
  getCapabilityStatus,
  getComponentStatus,
  type CapabilityCommandsSchema,
  type CommandDef,
  type CommandArgument,
  type DevicePreferencesResponse,
} from '@/lib/api/deviceControl'

const { hasToken } = storeToRefs(useTokenStore())

// --- 선택된 디바이스 -------------------------------------------------------
const device = ref<Device | null>(null)
const deviceLoading = ref(false)

interface ComponentGroup {
  componentId: string
  caps: string[]
}
const componentGroups = ref<ComponentGroup[]>([])
const selectedComponent = ref('')
const selectedCapability = ref('')

const deviceLabel = computed(() => {
  const d = device.value
  return d ? d.label || d.name || d.deviceId : ''
})

// --- command 스키마 / 인자 입력 -------------------------------------------
const schemaCache = ref(new Map<string, CapabilityCommandsSchema>())
const currentCommands = ref<CommandDef[]>([])
const schemaLoading = ref(false)
// "commandName" -> ("argName" -> raw 입력값)
const argInputs = ref<Record<string, Record<string, unknown>>>({})
const sendingCommand = ref<string | null>(null)

// --- rename/update ---------------------------------------------------------
const labelInput = ref('')
const roomIdInput = ref('')
const rooms = ref<{ roomId: string; name: string }[]>([])
const updating = ref(false)

// --- 조회 결과 (JsonView) --------------------------------------------------
const preferences = ref<DevicePreferencesResponse | null>(null)
const preferencesLoading = ref(false)
const componentStatus = ref<Record<string, unknown> | null>(null)
const componentStatusLoading = ref(false)
const capabilityStatus = ref<Record<string, unknown> | null>(null)
const capabilityStatusLoading = ref(false)

// --- 현재 status 캐시 (명령 후 새로고침/표시용) ----------------------------
const deviceStatus = ref<Record<string, unknown> | null>(null)
const statusLoading = ref(false)

// --- 로그 -----------------------------------------------------------------
type LogKind = 'success' | 'error' | 'info'
interface LogLine {
  id: number
  time: string
  message: string
  kind: LogKind
}
const logs = ref<LogLine[]>([])
let logSeq = 0
function addLog(message: string, kind: LogKind) {
  logs.value.unshift({ id: ++logSeq, time: new Date().toLocaleTimeString(), message, kind })
  if (logs.value.length > 30) logs.value.length = 30
}
function clearLog() {
  logs.value = []
}
const logColor: Record<LogKind, string> = {
  success: 'text-success',
  error: 'text-warn',
  info: 'text-brand-2',
}

// ---------------------------------------------------------------------------
// 디바이스 선택
// ---------------------------------------------------------------------------
function resetForDevice() {
  componentGroups.value = []
  selectedComponent.value = ''
  selectedCapability.value = ''
  currentCommands.value = []
  argInputs.value = {}
  schemaCache.value = new Map()
  preferences.value = null
  componentStatus.value = null
  capabilityStatus.value = null
  deviceStatus.value = null
}

async function onSelect(sel: DeviceSelection) {
  deviceLoading.value = true
  device.value = null
  resetForDevice()
  try {
    const d = await getDevice(sel.device.deviceId)
    device.value = d
    labelInput.value = d.label || d.name || ''
    roomIdInput.value = d.roomId ?? ''

    const comps =
      (d.components as Array<{ id: string; capabilities?: Array<{ id: string }> }>) ?? []
    const groups: ComponentGroup[] = []
    let first: { componentId: string; capabilityId: string } | null = null
    for (const comp of comps) {
      const caps = (comp.capabilities ?? []).map((c) => c.id)
      if (!caps.length) continue
      groups.push({ componentId: comp.id, caps })
      if (!first) first = { componentId: comp.id, capabilityId: caps[0] }
    }
    componentGroups.value = groups

    // 방 목록 (rename 용)
    if (d.locationId) {
      try {
        const res = await listRooms(d.locationId)
        rooms.value = res.items.map((r) => ({ roomId: r.roomId, name: r.name }))
      } catch {
        rooms.value = []
      }
    } else {
      rooms.value = []
    }

    void refreshStatus()
    if (first) await selectCapability(first.componentId, first.capabilityId)
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    deviceLoading.value = false
  }
}

// ---------------------------------------------------------------------------
// capability 선택 -> command 스키마 로드
// ---------------------------------------------------------------------------
async function selectCapability(componentId: string, capabilityId: string) {
  selectedComponent.value = componentId
  selectedCapability.value = capabilityId
  currentCommands.value = []
  capabilityStatus.value = null
  schemaLoading.value = true
  try {
    let schema = schemaCache.value.get(capabilityId)
    if (!schema) {
      schema = await getCapabilityCommands(capabilityId)
      schemaCache.value.set(capabilityId, schema)
    }
    const cmds = schema.commands ? Object.values(schema.commands) : []
    currentCommands.value = cmds
    initArgInputs(cmds)
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    schemaLoading.value = false
  }
}

type Widget = 'enum' | 'boolean' | 'number' | 'string' | 'json'
function widgetFor(arg: CommandArgument): Widget {
  const s = arg.schema
  if (s.enum && s.enum.length > 0) return 'enum'
  if (s.type === 'boolean') return 'boolean'
  if (s.type === 'integer' || s.type === 'number') return 'number'
  if (s.type === 'string') return 'string'
  return 'json'
}

function initArgInputs(cmds: CommandDef[]) {
  const next: Record<string, Record<string, unknown>> = {}
  for (const cmd of cmds) {
    const perArg: Record<string, unknown> = {}
    for (const arg of cmd.arguments ?? []) {
      const w = widgetFor(arg)
      if (w === 'boolean') perArg[arg.name] = false
      else if (w === 'number') perArg[arg.name] = arg.schema.minimum ?? 0
      else if (w === 'enum') perArg[arg.name] = arg.schema.enum?.[0] ?? ''
      else perArg[arg.name] = ''
    }
    next[cmd.name] = perArg
  }
  argInputs.value = next
}

function stepFor(arg: CommandArgument): number {
  return arg.schema.type === 'integer' ? 1 : 0.1
}

// 단일 argument 의 입력값을 스키마 타입에 맞게 변환. ok=false 면 필수 누락/잘못된 값.
function resolveArg(arg: CommandArgument, raw: unknown): { ok: boolean; value?: unknown } {
  const w = widgetFor(arg)
  switch (w) {
    case 'boolean':
      return { ok: true, value: raw === true }
    case 'number': {
      const n =
        arg.schema.type === 'integer' ? parseInt(String(raw), 10) : parseFloat(String(raw))
      if (Number.isNaN(n)) return { ok: !!arg.optional }
      return { ok: true, value: n }
    }
    case 'enum': {
      const s = String(raw ?? '')
      if (s === '') return { ok: !!arg.optional }
      return { ok: true, value: s }
    }
    case 'string': {
      const s = String(raw ?? '')
      if (s === '') return { ok: !!arg.optional }
      return { ok: true, value: s }
    }
    default: {
      // json: 파싱 시도, 실패 시 원문 문자열
      const s = String(raw ?? '').trim()
      if (s === '') return { ok: !!arg.optional }
      try {
        return { ok: true, value: JSON.parse(s) }
      } catch {
        return { ok: true, value: s }
      }
    }
  }
}

async function runCommand(cmd: CommandDef) {
  const d = device.value
  if (!d || !selectedComponent.value || !selectedCapability.value) return
  const inputs = argInputs.value[cmd.name] ?? {}
  const args: unknown[] = []
  // arguments 는 순서가 의미 있다. 선택적 인자는 빈 값이면 그 시점부터 잘라낸다.
  for (const arg of cmd.arguments ?? []) {
    const r = resolveArg(arg, inputs[arg.name])
    if (!r.ok) {
      addLog(`⚠ "${cmd.name}" 의 필수 인자 "${arg.name}" 를 입력하세요.`, 'error')
      return
    }
    if (r.value === undefined) {
      // 선택적 인자가 비었음 — 뒤 인자도 더 보내지 않음
      break
    }
    args.push(r.value)
  }

  const argStr = args.length ? `(${args.map((a) => JSON.stringify(a)).join(', ')})` : '()'
  if (
    !window.confirm(
      `실제 기기에 명령을 전송합니다.\n\n${deviceLabel.value}\n${selectedCapability.value}.${cmd.name}${argStr}\n\n계속할까요?`,
    )
  ) {
    return
  }

  sendingCommand.value = cmd.name
  addLog(`→ ${selectedCapability.value}.${cmd.name}${argStr}`, 'info')
  try {
    await executeDeviceCommands(d.deviceId, [
      {
        component: selectedComponent.value,
        capability: selectedCapability.value,
        command: cmd.name,
        arguments: args,
      },
    ])
    addLog(`✓ OK: ${selectedCapability.value}.${cmd.name}${argStr}`, 'success')
    toastSuccess('명령을 전송했습니다.')
    void refreshStatus()
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    addLog(`✗ 오류: ${msg}`, 'error')
    toastError(msg)
  } finally {
    sendingCommand.value = null
  }
}

// ---------------------------------------------------------------------------
// rename / update (PUT /devices/{id})
// ---------------------------------------------------------------------------
async function applyUpdate() {
  const d = device.value
  if (!d) return
  const body: { label?: string; roomId?: string } = {}
  const newLabel = labelInput.value.trim()
  if (newLabel && newLabel !== (d.label ?? '')) body.label = newLabel
  const newRoom = roomIdInput.value.trim()
  if (newRoom !== (d.roomId ?? '')) body.roomId = newRoom
  if (!('label' in body) && !('roomId' in body)) {
    toastError('변경된 내용이 없습니다.')
    return
  }
  if (
    !window.confirm(
      `디바이스 정보를 변경합니다.\n\n${[
        'label' in body ? `이름: ${body.label}` : null,
        'roomId' in body ? `방: ${roomLabel(body.roomId ?? '')}` : null,
      ]
        .filter(Boolean)
        .join('\n')}\n\n계속할까요?`,
    )
  ) {
    return
  }
  updating.value = true
  try {
    await updateDevice(d.deviceId, body)
    toastSuccess('디바이스 정보를 변경했습니다.')
    // 로컬 반영
    const fresh = await getDevice(d.deviceId)
    device.value = fresh
    labelInput.value = fresh.label || fresh.name || ''
    roomIdInput.value = fresh.roomId ?? ''
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    updating.value = false
  }
}

function roomLabel(roomId: string): string {
  if (!roomId) return '(없음)'
  return rooms.value.find((r) => r.roomId === roomId)?.name ?? roomId
}

// ---------------------------------------------------------------------------
// 조회들
// ---------------------------------------------------------------------------
async function refreshStatus() {
  const d = device.value
  if (!d) return
  statusLoading.value = true
  try {
    deviceStatus.value = await getDeviceStatus(d.deviceId)
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    statusLoading.value = false
  }
}

async function loadPreferences() {
  const d = device.value
  if (!d) return
  preferencesLoading.value = true
  try {
    preferences.value = await getDevicePreferences(d.deviceId)
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    preferencesLoading.value = false
  }
}

async function loadComponentStatus() {
  const d = device.value
  if (!d || !selectedComponent.value) return
  componentStatusLoading.value = true
  try {
    componentStatus.value = await getComponentStatus(d.deviceId, selectedComponent.value)
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    componentStatusLoading.value = false
  }
}

async function loadCapabilityStatus() {
  const d = device.value
  if (!d || !selectedComponent.value || !selectedCapability.value) return
  capabilityStatusLoading.value = true
  try {
    capabilityStatus.value = await getCapabilityStatus(
      d.deviceId,
      selectedComponent.value,
      selectedCapability.value,
    )
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    capabilityStatusLoading.value = false
  }
}
</script>

<template>
  <header class="mb-6">
    <h1 class="text-2xl font-extrabold tracking-tight md:text-3xl">Device 제어</h1>
    <p class="mt-1 text-sm text-muted">
      실제 디바이스에 명령을 실행하고 이름/방을 변경하며 preferences·status 를 조회합니다.
    </p>
  </header>
  <CliRef
    :commands="[
      'devices:commands [id] [command]',
      'devices:rename [id] [label]',
      'devices:update [id]',
      'devices:preferences [id]',
      'devices:capability-status [id]',
      'devices:component-status [id]',
    ]"
    :docs="[{ label: 'Devices', url: 'https://developer.smartthings.com/docs/api/public/#tag/Devices' }]"
  />

  <div
    v-if="!hasToken"
    class="rounded-xl border-l-[3px] border-warn bg-warn/10 px-4 py-3 text-sm text-warn"
  >
    PAT 토큰이 없습니다. 우측 상단의 <strong>PAT 설정</strong> 으로 토큰을 입력하세요.
  </div>

  <template v-else>
    <!-- 디바이스 선택 -->
    <section class="rounded-xl border border-line bg-card p-4">
      <label class="text-[11px] font-semibold tracking-wider text-muted uppercase">
        위치 → 디바이스 선택
      </label>
      <div class="mt-3">
        <DeviceSelect @select="onSelect" />
      </div>
    </section>

    <div v-if="deviceLoading" class="mt-6 flex items-center gap-2 text-sm text-muted">
      <span class="size-2 animate-pulse rounded-full bg-brand-2" /> 불러오는 중…
    </div>

    <div v-if="device && !deviceLoading" class="mt-6 flex flex-col gap-4">
      <!-- 헤더 -->
      <section class="rounded-2xl border border-brand-2/25 p-5">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <h2 class="truncate text-xl font-extrabold tracking-tight">{{ deviceLabel }}</h2>
            <code class="mt-2 inline-block rounded-md bg-black/25 px-2 py-1 font-mono text-[12.5px] text-muted">
              {{ device.deviceId }}
            </code>
          </div>
          <button
            class="shrink-0 rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-muted transition hover:border-brand-2 hover:text-brand-2 disabled:opacity-50"
            :disabled="statusLoading"
            @click="refreshStatus"
          >
            {{ statusLoading ? '불러오는 중…' : '↻ 상태 새로고침' }}
          </button>
        </div>
      </section>

      <!-- 명령 실행 -->
      <div class="grid gap-4 md:grid-cols-[260px_1fr]">
        <!-- capability 목록 -->
        <section class="overflow-hidden rounded-xl border border-line bg-card">
          <header class="flex items-center gap-2 border-b border-line px-4 py-3">
            <span class="h-3.5 w-1 rounded-full bg-gradient-to-b from-brand to-brand-2" />
            <h3 class="text-sm font-bold">Capabilities</h3>
          </header>
          <div v-if="!componentGroups.length" class="px-4 py-4 text-sm text-muted">
            제어 가능한 capability 가 없습니다.
          </div>
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

        <!-- command 카드 -->
        <section>
          <div v-if="schemaLoading" class="flex items-center gap-2 text-sm text-muted">
            <span class="size-2 animate-pulse rounded-full bg-brand-2" /> 스키마 불러오는 중…
          </div>

          <template v-else-if="selectedCapability">
            <div class="mb-3 flex flex-wrap items-center gap-2">
              <span
                class="rounded-full border border-brand-2/40 bg-brand-2/10 px-3 py-1 text-xs font-semibold text-brand-2"
              >
                {{ selectedCapability }}
              </span>
              <span class="text-xs text-muted">
                component: <strong class="text-text">{{ selectedComponent }}</strong>
              </span>
              <div class="ml-auto flex gap-2">
                <button
                  class="rounded-md border border-line px-3 py-1 text-xs font-semibold text-muted transition hover:border-brand-2 hover:text-brand-2 disabled:opacity-50"
                  :disabled="capabilityStatusLoading"
                  @click="loadCapabilityStatus"
                >
                  {{ capabilityStatusLoading ? '…' : 'capability status' }}
                </button>
                <button
                  class="rounded-md border border-line px-3 py-1 text-xs font-semibold text-muted transition hover:border-brand-2 hover:text-brand-2 disabled:opacity-50"
                  :disabled="componentStatusLoading"
                  @click="loadComponentStatus"
                >
                  {{ componentStatusLoading ? '…' : 'component status' }}
                </button>
              </div>
            </div>

            <div
              v-if="!currentCommands.length"
              class="rounded-xl border border-line bg-card px-4 py-3 text-sm text-muted"
            >
              이 capability 에는 실행할 command 가 없습니다 (읽기 전용).
            </div>

            <div v-else class="grid gap-3.5 sm:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
              <div
                v-for="cmd in currentCommands"
                :key="cmd.name"
                class="flex flex-col overflow-hidden rounded-xl border border-line bg-card"
              >
                <div class="border-b border-line bg-bg-2 px-4 py-2.5">
                  <strong class="font-mono text-sm text-text">{{ cmd.name }}</strong>
                </div>

                <!-- 인자 입력 -->
                <div class="flex flex-1 flex-col gap-3 px-4 py-4">
                  <p v-if="!cmd.arguments?.length" class="text-xs text-muted">인자 없음</p>
                  <div v-for="arg in cmd.arguments ?? []" :key="arg.name" class="flex flex-col gap-1">
                    <label class="flex items-center gap-1.5 text-xs text-muted">
                      <span class="font-mono text-text">{{ arg.name }}</span>
                      <span v-if="arg.optional" class="text-[10px] text-muted">(선택)</span>
                      <span v-if="arg.schema.type" class="text-[10px] text-brand-2">{{ arg.schema.type }}</span>
                    </label>

                    <!-- enum -->
                    <select
                      v-if="widgetFor(arg) === 'enum'"
                      v-model="argInputs[cmd.name][arg.name] as string"
                      class="w-full rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
                    >
                      <option v-if="arg.optional" value="">(전송 안 함)</option>
                      <option v-for="ev in arg.schema.enum ?? []" :key="ev" :value="ev">
                        {{ ev }}
                      </option>
                    </select>

                    <!-- boolean -->
                    <label
                      v-else-if="widgetFor(arg) === 'boolean'"
                      class="flex cursor-pointer items-center gap-3 py-1"
                    >
                      <input
                        v-model="argInputs[cmd.name][arg.name] as boolean"
                        type="checkbox"
                        class="size-5 accent-brand-2"
                      />
                      <span class="font-mono text-sm text-text">{{ argInputs[cmd.name][arg.name] === true }}</span>
                    </label>

                    <!-- number -->
                    <div v-else-if="widgetFor(arg) === 'number'" class="flex items-center gap-2">
                      <input
                        v-model.number="argInputs[cmd.name][arg.name] as number"
                        type="number"
                        :min="arg.schema.minimum"
                        :max="arg.schema.maximum"
                        :step="stepFor(arg)"
                        class="w-full rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
                      />
                      <span
                        v-if="arg.schema.minimum != null || arg.schema.maximum != null"
                        class="shrink-0 text-[11px] text-muted"
                      >
                        {{ arg.schema.minimum ?? '' }}~{{ arg.schema.maximum ?? '' }}
                      </span>
                    </div>

                    <!-- string -->
                    <input
                      v-else-if="widgetFor(arg) === 'string'"
                      v-model="argInputs[cmd.name][arg.name] as string"
                      type="text"
                      spellcheck="false"
                      :maxlength="arg.schema.maxLength"
                      class="w-full rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
                    />

                    <!-- json (object/array 등) -->
                    <textarea
                      v-else
                      v-model="argInputs[cmd.name][arg.name] as string"
                      spellcheck="false"
                      rows="3"
                      placeholder="JSON value"
                      class="w-full resize-y rounded-lg border border-line bg-bg-2 px-3 py-2 font-mono text-[13px] text-text outline-none focus:border-brand-2"
                    />
                  </div>
                </div>

                <div class="border-t border-line px-4 py-3">
                  <button
                    class="w-full rounded-lg border border-transparent bg-gradient-to-br from-brand to-brand-2 px-4 py-2 text-sm font-semibold text-[#061026] transition hover:-translate-y-px disabled:opacity-50"
                    :disabled="sendingCommand === cmd.name"
                    @click="runCommand(cmd)"
                  >
                    {{ sendingCommand === cmd.name ? '전송 중…' : '▶ 명령 실행' }}
                  </button>
                </div>
              </div>
            </div>

            <JsonView
              v-if="capabilityStatus"
              :value="capabilityStatus"
              :label="`capability status — ${selectedCapability}`"
              :default-open="true"
              class="mt-4"
            />
            <JsonView
              v-if="componentStatus"
              :value="componentStatus"
              :label="`component status — ${selectedComponent}`"
              :default-open="true"
              class="mt-4"
            />
          </template>
        </section>
      </div>

      <!-- 이름 / 방 변경 -->
      <section class="overflow-hidden rounded-xl border border-line bg-card">
        <header class="flex items-center gap-2 border-b border-line px-4 py-3">
          <span class="h-3.5 w-1 rounded-full bg-gradient-to-b from-brand to-brand-2" />
          <h3 class="text-sm font-bold">이름 / 방 변경 (rename · update)</h3>
        </header>
        <div class="grid gap-3 p-4 sm:grid-cols-2">
          <div class="flex flex-col gap-1">
            <label class="text-[11px] font-semibold tracking-wider text-muted uppercase">label (이름)</label>
            <input
              v-model="labelInput"
              type="text"
              spellcheck="false"
              placeholder="디바이스 이름"
              class="w-full rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-[11px] font-semibold tracking-wider text-muted uppercase">room (방)</label>
            <select
              v-model="roomIdInput"
              class="w-full rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
            >
              <option value="">(방 없음)</option>
              <option v-for="r in rooms" :key="r.roomId" :value="r.roomId">{{ r.name }}</option>
            </select>
          </div>
        </div>
        <div class="border-t border-line px-4 py-3">
          <button
            class="rounded-lg border border-line px-4 py-2 text-sm font-semibold transition hover:-translate-y-px hover:border-brand-2 disabled:opacity-50"
            :disabled="updating"
            @click="applyUpdate"
          >
            {{ updating ? '저장 중…' : '변경 사항 저장' }}
          </button>
        </div>
      </section>

      <!-- preferences 조회 -->
      <section class="overflow-hidden rounded-xl border border-line bg-card">
        <header class="flex items-center gap-2 border-b border-line px-4 py-3">
          <span class="h-3.5 w-1 rounded-full bg-gradient-to-b from-brand to-brand-2" />
          <h3 class="text-sm font-bold">Preferences</h3>
          <button
            class="ml-auto rounded-md border border-line px-3 py-1 text-xs font-semibold text-muted transition hover:border-brand-2 hover:text-brand-2 disabled:opacity-50"
            :disabled="preferencesLoading"
            @click="loadPreferences"
          >
            {{ preferencesLoading ? '불러오는 중…' : '조회' }}
          </button>
        </header>
        <div class="p-4">
          <JsonView
            v-if="preferences"
            :value="preferences"
            label="Device Preferences"
            :default-open="true"
          />
          <p v-else class="text-xs text-muted">버튼을 눌러 이 디바이스의 preferences 를 조회합니다.</p>
        </div>
      </section>

      <!-- 이벤트 로그 -->
      <section v-if="logs.length" class="overflow-hidden rounded-xl border border-line bg-card">
        <header class="flex items-center justify-between border-b border-line px-4 py-2.5">
          <div class="flex items-center gap-2">
            <span class="h-3.5 w-1 rounded-full bg-gradient-to-b from-brand to-brand-2" />
            <h3 class="text-sm font-bold">실행 로그</h3>
          </div>
          <button
            class="rounded-md border border-line px-2 py-1 text-xs text-muted transition hover:border-brand-2 hover:text-brand-2"
            @click="clearLog"
          >
            Clear
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

      <!-- 현재 상태 원본 -->
      <JsonView v-if="deviceStatus" :value="deviceStatus" label="현재 디바이스 상태 (원본 JSON)" />
    </div>
  </template>
</template>
