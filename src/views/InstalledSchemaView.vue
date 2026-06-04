<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
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

const { t } = useI18n({
  useScope: 'local',
  inheritLocale: true,
  messages: {
    ko: {
      title: 'Installed Schema',
      desc: '설치된 ST Schema 커넥터 인스턴스를 조회·삭제합니다. (모든 location 을 순회해 목록을 만듭니다.)',
      cliNote:
        'REST 는 location 단위(/schema/installedapps/location/{locationId})라 전체 목록은 모든 location 을 합칩니다.',
      noName: '(이름 없음)',
      enterId: 'Installed App ID 를 입력하세요.',
      deleteConfirm:
        '설치된 Schema 인스턴스 "{id}" 를 삭제할까요?\n이 인스턴스가 생성한 device 도 함께 삭제됩니다. 되돌릴 수 없습니다.',
      deleted: '설치된 Schema 인스턴스를 삭제했습니다.',
      selectInstance: '설치된 Schema 인스턴스 선택',
      loading: '불러오는 중…',
      refresh: '↻ 새로고침',
      instanceOption: '설치된 인스턴스 ({count})',
      get: '조회',
      delete: '삭제',
      summary: '설치 인스턴스 정보',
      rawJson: '원본 JSON (device 포함)',
    },
    en: {
      title: 'Installed Schema',
      desc: 'List and delete installed ST Schema connector instances. (The list is built by iterating over all locations.)',
      cliNote:
        'The REST API is per-location (/schema/installedapps/location/{locationId}), so the full list merges all locations.',
      noName: '(no name)',
      enterId: 'Enter an Installed App ID.',
      deleteConfirm:
        'Delete installed Schema instance "{id}"?\nDevices created by this instance are also deleted. This cannot be undone.',
      deleted: 'Installed Schema instance deleted.',
      selectInstance: 'Select installed Schema instance',
      loading: 'Loading…',
      refresh: '↻ Refresh',
      instanceOption: 'Installed instances ({count})',
      get: 'Get',
      delete: 'Delete',
      summary: 'Installed instance info',
      rawJson: 'Raw JSON (incl. devices)',
    },
  },
})

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
  const name = a.appName || a.partnerName || t('noName')
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
  if (!sid) return toastError(t('enterId'))
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
  if (!sid) return toastError(t('enterId'))
  if (!window.confirm(t('deleteConfirm', { id: sid }))) return
  busy.value = true
  try {
    await deleteInstalledSchemaApp(sid)
    current.value = null
    toastSuccess(t('deleted'))
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
    <h1 class="text-2xl font-extrabold tracking-tight md:text-3xl">{{ t('title') }}</h1>
    <p class="mt-1 text-sm text-muted">
      {{ t('desc') }}
    </p>
  </header>

  <CliRef
    :commands="['installedschema [id]', 'installedschema:delete [id]']"
    :note="t('cliNote')"
    :docs="[{ label: 'ST Schema', url: 'https://developer.smartthings.com/docs/devices/cloud-connected/st-schema' }]"
  />

  <div
    v-if="!hasToken"
    class="rounded-xl border-l-[3px] border-warn bg-warn/10 px-4 py-3 text-sm text-warn"
  >
    {{ $t('common.noToken') }}<strong>{{ $t('common.noTokenStrong') }}</strong>{{ $t('common.noTokenTail') }}
  </div>

  <template v-else>
    <!-- 선택 / 조회 -->
    <section class="rounded-xl border border-line bg-card p-4">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-semibold tracking-wider text-muted uppercase">
          {{ t('selectInstance') }}
        </span>
        <button
          class="rounded-md border border-line px-2 py-1 text-xs text-muted transition hover:border-brand-2 hover:text-brand-2"
          :disabled="listLoading"
          @click="loadList"
        >
          {{ listLoading ? t('loading') : t('refresh') }}
        </button>
      </div>
      <div class="mt-3">
        <select
          v-model="selected"
          class="w-full rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
          @change="onSelect"
        >
          <option value="">{{ t('instanceOption', { count: apps.length }) }}</option>
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
          {{ t('get') }}
        </button>
        <button
          class="shrink-0 rounded-lg border border-warn/50 bg-warn/10 px-4 py-2 text-sm font-semibold text-warn transition hover:-translate-y-px hover:border-warn disabled:opacity-50"
          :disabled="busy"
          @click="doDelete"
        >
          {{ t('delete') }}
        </button>
      </div>
    </section>

    <!-- 요약 -->
    <div v-if="current" class="mt-4">
      <InfoGrid :title="t('summary')" :items="infoItems" />
    </div>

    <!-- 원본 결과 (생성된 device 목록 포함) -->
    <div v-if="current" class="mt-4">
      <JsonView :value="current" :label="t('rawJson')" :default-open="true" />
    </div>
  </template>
</template>
