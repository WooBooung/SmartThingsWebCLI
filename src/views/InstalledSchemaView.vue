<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useTokenStore } from '@/stores/token'
import {
  listInstalledSchemaApps,
  getInstalledSchemaApp,
  deleteInstalledSchemaApp,
  type InstalledSchemaApp,
} from '@/lib/api/schema'
import { toastError, toastSuccess } from '@/lib/toast'
import CliRef from '@/components/CliRef.vue'
import InfoGrid, { type InfoItem } from '@/components/InfoGrid.vue'
import JsonView from '@/components/JsonView.vue'

const { hasToken } = storeToRefs(useTokenStore())

const apps = ref<InstalledSchemaApp[]>([])
const selected = ref('')
const listLoading = ref(false)

const isaId = ref('')
const current = ref<InstalledSchemaApp | null>(null)
const busy = ref(false)

const infoItems = computed<InfoItem[]>(() => {
  const a = current.value
  if (!a) return []
  return [
    { label: 'Installed App ID (isaId)', value: a.isaId ?? '', mono: true },
    { label: 'App Name', value: a.appName ?? '' },
    { label: 'Partner Name', value: a.partnerName ?? '' },
    { label: 'Connection', value: a.partnerSTConnection ?? '' },
    { label: 'Location ID', value: a.locationId ?? '', mono: true },
    { label: 'Devices', value: String(a.devices?.length ?? 0) },
  ]
})

function optionLabel(a: InstalledSchemaApp): string {
  const name = a.appName || a.partnerName || '(이름 없음)'
  return `${name} — ${a.isaId ?? ''}`
}

async function loadList() {
  if (!hasToken.value) return
  listLoading.value = true
  try {
    apps.value = (await listInstalledSchemaApps()).sort((a, b) =>
      (a.appName ?? '').localeCompare(b.appName ?? ''),
    )
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    listLoading.value = false
  }
}

async function doGet(id?: string) {
  const sid = (id ?? isaId.value).trim()
  if (!sid) return toastError('Installed App ID 를 입력하세요.')
  isaId.value = sid
  busy.value = true
  current.value = null
  try {
    current.value = await getInstalledSchemaApp(sid)
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

function onSelect() {
  if (selected.value) doGet(selected.value)
}

async function doDelete() {
  const sid = isaId.value.trim()
  if (!sid) return toastError('Installed App ID 를 입력하세요.')
  if (
    !window.confirm(
      `설치된 Schema 인스턴스 "${sid}" 를 삭제할까요?\n이 인스턴스가 생성한 device 도 함께 삭제됩니다. 되돌릴 수 없습니다.`,
    )
  )
    return
  busy.value = true
  try {
    await deleteInstalledSchemaApp(sid)
    current.value = null
    toastSuccess('설치된 Schema 인스턴스를 삭제했습니다.')
    await loadList()
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

onMounted(loadList)
</script>

<template>
  <header class="mb-6">
    <h1 class="text-2xl font-extrabold tracking-tight md:text-3xl">Installed Schema</h1>
    <p class="mt-1 text-sm text-muted">
      설치된 ST Schema 커넥터 인스턴스를 조회·삭제합니다. (모든 location 을 순회해 목록을 만듭니다.)
    </p>
  </header>

  <CliRef
    :commands="['installedschema [id]', 'installedschema:delete [id]']"
    note="REST 는 location 단위(/schema/installedapps/location/{locationId})라 전체 목록은 모든 location 을 합칩니다."
  />

  <div
    v-if="!hasToken"
    class="rounded-xl border-l-[3px] border-warn bg-warn/10 px-4 py-3 text-sm text-warn"
  >
    PAT 토큰이 없습니다. 우측 상단의 <strong>PAT 설정</strong> 으로 토큰을 입력하세요.
  </div>

  <template v-else>
    <!-- 선택 / 조회 -->
    <section class="rounded-xl border border-line bg-card p-4">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-semibold tracking-wider text-muted uppercase">
          설치된 Schema 인스턴스 선택
        </span>
        <button
          class="rounded-md border border-line px-2 py-1 text-xs text-muted transition hover:border-brand-2 hover:text-brand-2"
          :disabled="listLoading"
          @click="loadList"
        >
          {{ listLoading ? '불러오는 중…' : '↻ 새로고침' }}
        </button>
      </div>
      <div class="mt-3">
        <select
          v-model="selected"
          class="w-full rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
          @change="onSelect"
        >
          <option value="">설치된 인스턴스 ({{ apps.length }})</option>
          <option v-for="a in apps" :key="a.isaId" :value="a.isaId">
            {{ optionLabel(a) }}
          </option>
        </select>
      </div>
      <div class="mt-3 flex gap-2">
        <input
          v-model="isaId"
          spellcheck="false"
          placeholder="installed app id (isaId)"
          class="w-full rounded-lg border border-line bg-bg-2 px-3 py-2 font-mono text-sm text-text outline-none focus:border-brand-2"
          @keyup.enter="doGet()"
        />
        <button
          class="shrink-0 rounded-lg border border-line px-4 py-2 text-sm font-semibold transition hover:-translate-y-px hover:border-brand-2 disabled:opacity-50"
          :disabled="busy"
          @click="doGet()"
        >
          조회
        </button>
        <button
          class="shrink-0 rounded-lg border border-warn/50 bg-warn/10 px-4 py-2 text-sm font-semibold text-warn transition hover:-translate-y-px hover:border-warn disabled:opacity-50"
          :disabled="busy"
          @click="doDelete"
        >
          삭제
        </button>
      </div>
    </section>

    <!-- 요약 -->
    <div v-if="current" class="mt-4">
      <InfoGrid title="설치 인스턴스 정보" :items="infoItems" />
    </div>

    <!-- 원본 결과 (생성된 device 목록 포함) -->
    <div v-if="current" class="mt-4">
      <JsonView :value="current" label="원본 JSON (device 포함)" :default-open="true" />
    </div>
  </template>
</template>
