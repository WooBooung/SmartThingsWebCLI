<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useTokenStore } from '@/stores/token'
import { getDevice, getDeviceStatus, listDevices } from '@/lib/stClient'
import type { Device } from '@/lib/types'
import { toastError } from '@/lib/toast'
import DeviceSelect from '@/components/DeviceSelect.vue'
import JsonView from '@/components/JsonView.vue'

const { hasToken } = storeToRefs(useTokenStore())

const deviceId = ref('')
const detail = ref<unknown>(null)
const status = ref<unknown>(null)
const loading = ref(false)

async function loadFor(id: string) {
  if (!id) return
  loading.value = true
  detail.value = null
  status.value = null
  try {
    const [d, s] = await Promise.all([getDevice(id), getDeviceStatus(id)])
    detail.value = d
    status.value = s
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    loading.value = false
  }
}

function onSelect(device: Device) {
  deviceId.value = device.deviceId
  loadFor(device.deviceId)
}

async function lookupById() {
  const id = deviceId.value.trim()
  if (!id) return
  // deviceId 직접 입력: ?deviceId= 로 존재 확인 후 상세/상태 조회
  loading.value = true
  detail.value = null
  status.value = null
  try {
    const res = await listDevices({ deviceId: id })
    if (!res.items?.length) {
      toastError('해당 deviceId 를 찾을 수 없습니다.')
      return
    }
    await loadFor(id)
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <header class="mb-6">
    <h1 class="text-2xl font-extrabold tracking-tight md:text-3xl">Device 조회</h1>
    <p class="mt-1 text-sm text-muted">디바이스 목록·상세 정보·현재 상태를 조회합니다.</p>
  </header>

  <div
    v-if="!hasToken"
    class="rounded-xl border-l-[3px] border-warn bg-warn/10 px-4 py-3 text-sm text-warn"
  >
    PAT 토큰이 없습니다. 우측 상단의 <strong>PAT 설정</strong> 으로 토큰을 입력하세요.
  </div>

  <template v-else>
    <div class="grid gap-4 md:grid-cols-2">
      <div class="rounded-xl border border-line bg-card p-4">
        <label class="text-xs font-semibold tracking-wider text-muted uppercase">
          디바이스 선택
        </label>
        <div class="mt-2">
          <DeviceSelect @select="onSelect" />
        </div>
      </div>

      <div class="rounded-xl border border-line bg-card p-4">
        <label class="text-xs font-semibold tracking-wider text-muted uppercase">
          deviceId 직접 입력
        </label>
        <div class="mt-2 flex gap-2">
          <input
            v-model="deviceId"
            spellcheck="false"
            placeholder="deviceId"
            class="w-full rounded-lg border border-line bg-bg-2 px-3 py-2 font-mono text-sm text-text outline-none focus:border-brand-2"
            @keyup.enter="lookupById"
          />
          <button
            class="shrink-0 rounded-lg border border-transparent bg-gradient-to-br from-brand to-brand-2 px-4 py-2 text-sm font-semibold text-[#061026] transition hover:-translate-y-px"
            @click="lookupById"
          >
            조회
          </button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="mt-6 text-sm text-muted">불러오는 중…</div>

    <div v-if="detail || status" class="mt-6 grid gap-4">
      <JsonView v-if="detail" :value="detail" label="Device" />
      <JsonView v-if="status" :value="status" label="Status" />
    </div>
  </template>
</template>
