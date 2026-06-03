<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useTokenStore } from '@/stores/token'
import { getPresentation } from '@/lib/api/presentation'
import { toastError } from '@/lib/toast'
import DeviceSelect, { type DeviceSelection } from '@/components/DeviceSelect.vue'
import JsonView from '@/components/JsonView.vue'
import CliRef from '@/components/CliRef.vue'

const { hasToken } = storeToRefs(useTokenStore())
const route = useRoute()

const presentationId = ref('')
const manufacturerName = ref('')
const deviceId = ref('')
const result = ref<Record<string, unknown> | null>(null)
const busy = ref(false)

function str(v: unknown): string {
  if (v == null) return ''
  return typeof v === 'string' ? v : String(v)
}

async function retrieve() {
  if (!presentationId.value.trim() && !manufacturerName.value.trim() && !deviceId.value.trim()) {
    toastError('Presentation ID, 제조사, Device ID 중 하나 이상을 입력하세요.')
    return
  }
  busy.value = true
  result.value = null
  try {
    result.value = await getPresentation({
      presentationId: presentationId.value.trim(),
      manufacturerName: manufacturerName.value.trim(),
      deviceId: deviceId.value.trim(),
    })
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

// 디바이스를 선택하면 원본 selectDevice() 처럼 세 필드를 채우고 즉시 조회한다.
function onSelect(sel: DeviceSelection) {
  presentationId.value = str(sel.device['presentationId'])
  manufacturerName.value = str(sel.device['manufacturerName'])
  deviceId.value = str(sel.device.deviceId)
  retrieve()
}

// Device 조회 등에서 ?presentationId=... / ?manufacturerName=... / ?deviceId= 로 넘어오면 자동 조회
onMounted(() => {
  const pid = route.query.presentationId
  const mfr = route.query.manufacturerName
  const did = route.query.deviceId
  if (typeof pid === 'string') presentationId.value = pid
  if (typeof mfr === 'string') manufacturerName.value = mfr
  if (typeof did === 'string') deviceId.value = did
  if ((presentationId.value || manufacturerName.value || deviceId.value) && hasToken.value) {
    retrieve()
  }
})
</script>

<template>
  <header class="mb-6">
    <h1 class="text-2xl font-extrabold tracking-tight md:text-3xl">Device Presentation</h1>
    <p class="mt-1 text-sm text-muted">
      디바이스를 선택하거나 presentationId / 제조사 / deviceId 로 device presentation 을 조회합니다.
      <a
        href="https://developer.smartthings.com/docs/api/public#tag/Presentations/operation/getDevicePresentation"
        target="_blank"
        rel="noopener"
        class="text-brand-2 underline-offset-2 hover:underline"
      >
        API 문서
      </a>
    </p>
  </header>
  <CliRef :commands="['presentation <presentationId>', 'devices:presentation [id]']" />

  <div
    v-if="!hasToken"
    class="rounded-xl border-l-[3px] border-warn bg-warn/10 px-4 py-3 text-sm text-warn"
  >
    PAT 토큰이 없습니다. 우측 상단의 <strong>PAT 설정</strong> 으로 토큰을 입력하세요.
  </div>

  <template v-else>
    <div class="grid gap-4 md:grid-cols-2">
      <!-- 위치 → 디바이스 선택 -->
      <section class="rounded-xl border border-line bg-card p-4">
        <label class="text-[11px] font-semibold tracking-wider text-muted uppercase">
          위치 → 디바이스 선택
        </label>
        <div class="mt-3">
          <DeviceSelect @select="onSelect" />
        </div>
        <p class="mt-2 text-xs text-muted">
          선택하면 아래 필드가 자동으로 채워지고 곧바로 조회합니다.
        </p>
      </section>

      <!-- 직접 입력 -->
      <section class="rounded-xl border border-line bg-card p-4">
        <label class="text-[11px] font-semibold tracking-wider text-muted uppercase">
          직접 입력
        </label>
        <div class="mt-3 flex flex-col gap-3">
          <div>
            <span class="text-xs font-semibold text-muted">Presentation ID</span>
            <input
              v-model="presentationId"
              spellcheck="false"
              placeholder="presentationId"
              class="mt-1 w-full rounded-lg border border-line bg-bg-2 px-3 py-2 font-mono text-sm text-text outline-none focus:border-brand-2"
              @keyup.enter="retrieve"
            />
          </div>
          <div>
            <span class="text-xs font-semibold text-muted">제조사 (manufacturerName)</span>
            <input
              v-model="manufacturerName"
              spellcheck="false"
              placeholder="manufacturerName"
              class="mt-1 w-full rounded-lg border border-line bg-bg-2 px-3 py-2 font-mono text-sm text-text outline-none focus:border-brand-2"
              @keyup.enter="retrieve"
            />
          </div>
          <div>
            <span class="text-xs font-semibold text-muted">Device ID</span>
            <input
              v-model="deviceId"
              spellcheck="false"
              placeholder="deviceId"
              class="mt-1 w-full rounded-lg border border-line bg-bg-2 px-3 py-2 font-mono text-sm text-text outline-none focus:border-brand-2"
              @keyup.enter="retrieve"
            />
          </div>
          <div>
            <button
              class="rounded-lg border border-transparent bg-gradient-to-br from-brand to-brand-2 px-4 py-2 text-sm font-semibold text-[#061026] transition hover:-translate-y-px disabled:opacity-50"
              :disabled="busy"
              @click="retrieve"
            >
              {{ busy ? '불러오는 중…' : '조회' }}
            </button>
          </div>
        </div>
      </section>
    </div>

    <div v-if="busy" class="mt-8 flex items-center gap-2 text-sm text-muted">
      <span class="size-2 animate-pulse rounded-full bg-brand-2" /> 불러오는 중…
    </div>

    <div v-if="result && !busy" class="mt-6">
      <JsonView :value="result" label="Presentation (원본 JSON)" :default-open="true" />
    </div>
  </template>
</template>
