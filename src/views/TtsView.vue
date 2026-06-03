<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useTokenStore } from '@/stores/token'
import { listLocations } from '@/lib/stClient'
import type { Device } from '@/lib/types'
import { toastError, toastSuccess } from '@/lib/toast'
import { listSpeakers, speak } from '@/lib/api/tts'
import JsonView from '@/components/JsonView.vue'
import CliRef from '@/components/CliRef.vue'

const { hasToken } = storeToRefs(useTokenStore())

const speakers = ref<Device[]>([])
const locationName = ref(new Map<string, string>())
const selectedIds = ref<Set<string>>(new Set())
const message = ref('')

const loading = ref(false)
const sending = ref(false)

interface SendResult {
  deviceId: string
  name: string
  ok: boolean
  detail: unknown
}
const results = ref<SendResult[]>([])
const requestedAt = ref('')

function nameOf(d: Device): string {
  return (d.label && d.label.trim()) || d.name || d.deviceId
}

// 위치별로 그룹핑된 스피커 목록
interface SpeakerGroup {
  locationId: string
  locationName: string
  devices: Device[]
}
const groups = computed<SpeakerGroup[]>(() => {
  const byLoc = new Map<string, Device[]>()
  for (const d of speakers.value) {
    const key = d.locationId ?? '(위치 없음)'
    if (!byLoc.has(key)) byLoc.set(key, [])
    byLoc.get(key)!.push(d)
  }
  return [...byLoc.entries()]
    .map(([locationId, devices]) => ({
      locationId,
      locationName: locationName.value.get(locationId) ?? locationId,
      devices: [...devices].sort((a, b) => nameOf(a).localeCompare(nameOf(b))),
    }))
    .sort((a, b) => a.locationName.localeCompare(b.locationName))
})

const selectedCount = computed(() => selectedIds.value.size)
const canSend = computed(() => selectedCount.value > 0 && message.value.trim().length > 0 && !sending.value)

async function loadSpeakers() {
  if (!hasToken.value) return
  loading.value = true
  try {
    const [devRes, locRes] = await Promise.all([listSpeakers(), listLocations()])
    speakers.value = devRes.items ?? []
    locationName.value = new Map((locRes.items ?? []).map((l) => [l.locationId, l.name]))
    // 더 이상 존재하지 않는 디바이스는 선택 해제
    const present = new Set(speakers.value.map((d) => d.deviceId))
    selectedIds.value = new Set([...selectedIds.value].filter((id) => present.has(id)))
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    loading.value = false
  }
}

function toggle(deviceId: string) {
  const next = new Set(selectedIds.value)
  if (next.has(deviceId)) next.delete(deviceId)
  else next.add(deviceId)
  selectedIds.value = next
}

function toggleAll() {
  if (selectedIds.value.size === speakers.value.length) {
    selectedIds.value = new Set()
  } else {
    selectedIds.value = new Set(speakers.value.map((d) => d.deviceId))
  }
}

async function send() {
  const text = message.value.trim()
  if (!text) return toastError('보낼 메시지를 입력하세요.')
  const targets = speakers.value.filter((d) => selectedIds.value.has(d.deviceId))
  if (!targets.length) return toastError('대상 스피커를 하나 이상 선택하세요.')

  sending.value = true
  results.value = []
  requestedAt.value = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
  try {
    for (const d of targets) {
      try {
        const res = await speak(d.deviceId, text)
        results.value.push({ deviceId: d.deviceId, name: nameOf(d), ok: true, detail: res })
      } catch (e) {
        results.value.push({
          deviceId: d.deviceId,
          name: nameOf(d),
          ok: false,
          detail: e instanceof Error ? e.message : String(e),
        })
      }
    }
    const failed = results.value.filter((r) => !r.ok).length
    if (failed === 0) toastSuccess(`${targets.length}개 스피커로 메시지를 전송했습니다.`)
    else toastError(`${failed}개 스피커 전송 실패 (총 ${targets.length}개).`)
  } finally {
    sending.value = false
  }
}

onMounted(loadSpeakers)
</script>

<template>
  <header class="mb-6">
    <h1 class="text-2xl font-extrabold tracking-tight md:text-3xl">Send Message (TTS)</h1>
    <p class="mt-1 text-sm text-muted">
      speechSynthesis 를 지원하는 스피커를 골라 메시지를 음성으로 재생합니다.
    </p>
  </header>
  <CliRef :commands="['devices:commands [id]']" />

  <div
    v-if="!hasToken"
    class="rounded-xl border-l-[3px] border-warn bg-warn/10 px-4 py-3 text-sm text-warn"
  >
    PAT 토큰이 없습니다. 우측 상단의 <strong>PAT 설정</strong> 으로 토큰을 입력하세요.
  </div>

  <template v-else>
    <!-- 스피커 선택 -->
    <section class="overflow-hidden rounded-xl border border-line bg-card">
      <header class="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
        <span class="h-3.5 w-1 rounded-full bg-gradient-to-b from-brand to-brand-2" />
        <h3 class="text-sm font-bold">스피커 선택</h3>
        <span class="text-xs text-muted">{{ selectedCount }} / {{ speakers.length }} 선택</span>
        <div class="ml-auto flex gap-2">
          <button
            v-if="speakers.length"
            class="rounded-md border border-line px-2 py-1 text-xs text-muted transition hover:border-brand-2 hover:text-brand-2"
            @click="toggleAll"
          >
            {{ selectedCount === speakers.length ? '전체 해제' : '전체 선택' }}
          </button>
          <button
            class="rounded-md border border-line px-2 py-1 text-xs text-muted transition hover:border-brand-2 hover:text-brand-2 disabled:opacity-50"
            :disabled="loading"
            @click="loadSpeakers"
          >
            {{ loading ? '불러오는 중…' : '↻ 새로고침' }}
          </button>
        </div>
      </header>

      <div class="p-4">
        <div v-if="loading" class="flex items-center gap-2 text-sm text-muted">
          <span class="size-2 animate-pulse rounded-full bg-brand-2" /> 불러오는 중…
        </div>
        <p v-else-if="!speakers.length" class="text-sm text-muted">
          speechSynthesis / audioNotification 를 지원하는 스피커가 없습니다.
        </p>
        <div v-else class="flex flex-col gap-4">
          <div v-for="g in groups" :key="g.locationId">
            <div class="mb-2 text-[11px] font-semibold tracking-wider text-muted uppercase">
              {{ g.locationName }}
            </div>
            <div class="grid gap-2 sm:grid-cols-2">
              <label
                v-for="d in g.devices"
                :key="d.deviceId"
                class="flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm transition hover:border-brand-2"
                :class="selectedIds.has(d.deviceId) ? 'border-brand-2' : ''"
              >
                <input
                  type="checkbox"
                  class="accent-brand-2"
                  :checked="selectedIds.has(d.deviceId)"
                  @change="toggle(d.deviceId)"
                />
                <span class="min-w-0 flex-1 truncate text-text">{{ nameOf(d) }}</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 메시지 + 전송 -->
    <section class="mt-4 rounded-xl border border-line bg-card p-4">
      <label class="text-[11px] font-semibold tracking-wider text-muted uppercase">메시지</label>
      <div class="mt-3 flex gap-2">
        <input
          v-model="message"
          spellcheck="false"
          placeholder="재생할 메시지를 입력하세요"
          class="w-full rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
          @keyup.enter="canSend && send()"
        />
        <button
          class="shrink-0 rounded-lg border border-transparent bg-gradient-to-br from-brand to-brand-2 px-4 py-2 text-sm font-semibold text-[#061026] transition hover:-translate-y-px disabled:opacity-50"
          :disabled="!canSend"
          @click="send"
        >
          {{ sending ? '전송 중…' : '전송' }}
        </button>
      </div>
    </section>

    <!-- 결과 -->
    <section v-if="results.length" class="mt-4 overflow-hidden rounded-xl border border-line bg-card">
      <header class="flex items-center gap-2 border-b border-line px-4 py-3">
        <span class="h-3.5 w-1 rounded-full bg-gradient-to-b from-brand to-brand-2" />
        <h3 class="text-sm font-bold">전송 결과</h3>
        <span v-if="requestedAt" class="text-xs text-muted">요청 시각: {{ requestedAt }}</span>
      </header>
      <div class="flex flex-col gap-3 p-4">
        <div
          v-for="r in results"
          :key="r.deviceId"
          class="rounded-lg border border-line bg-bg-2 p-3"
        >
          <div class="flex items-center gap-2">
            <span
              class="rounded-full px-2 py-0.5 text-xs font-semibold"
              :class="r.ok ? 'bg-success/15 text-success' : 'bg-warn/15 text-warn'"
            >
              {{ r.ok ? '성공' : '실패' }}
            </span>
            <span class="truncate text-sm font-semibold text-text">{{ r.name }}</span>
          </div>
          <div class="mt-2">
            <JsonView :value="r.detail" label="응답" :default-open="!r.ok" />
          </div>
        </div>
      </div>
    </section>
  </template>
</template>
