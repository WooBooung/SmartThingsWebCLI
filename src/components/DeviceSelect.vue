<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { listLocations, listDevices } from '@/lib/stClient'
import type { Device } from '@/lib/types'
import { toastError } from '@/lib/toast'

const emit = defineEmits<{ (e: 'select', device: Device): void }>()

interface Option {
  label: string
  device: Device
}

const options = ref<Option[]>([])
const loading = ref(false)
const selectedId = ref('')

async function load() {
  loading.value = true
  options.value = []
  try {
    const [locRes, devRes] = await Promise.all([listLocations(), listDevices()])
    const locName = new Map(locRes.items.map((l) => [l.locationId, l.name]))

    const grouped = [...devRes.items].sort((a, b) => {
      const la = a.locationId ?? ''
      const lb = b.locationId ?? ''
      return la === lb ? 0 : la < lb ? -1 : 1
    })

    options.value = grouped.map((device) => {
      const ln = locName.get(device.locationId ?? '') ?? device.locationId ?? '?'
      const name = device.label || device.name || device.deviceId
      return { label: `[${ln}] ${name}`, device }
    })
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    loading.value = false
  }
}

function onChange() {
  const opt = options.value.find((o) => o.device.deviceId === selectedId.value)
  if (opt) emit('select', opt.device)
}

defineExpose({ reload: load })

onMounted(load)
</script>

<template>
  <div class="flex items-center gap-2">
    <select
      v-model="selectedId"
      class="w-full rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
      :disabled="loading"
      @change="onChange"
    >
      <option value="" disabled>
        {{ loading ? '불러오는 중…' : '디바이스 선택' }}
      </option>
      <option v-for="o in options" :key="o.device.deviceId" :value="o.device.deviceId">
        {{ o.label }}
      </option>
    </select>
    <button
      class="shrink-0 rounded-lg border border-line px-3 py-2 text-sm text-muted transition hover:border-brand-2 hover:text-brand-2"
      :disabled="loading"
      title="새로고침"
      @click="load"
    >
      ↻
    </button>
  </div>
</template>
