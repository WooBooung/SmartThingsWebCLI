<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useTokenStore } from '@/stores/token'
import {
  listSchemaApps,
  getSchemaApp,
  createSchemaApp,
  updateSchemaApp,
  deleteSchemaApp,
  regenerateSchemaOauth,
  type SchemaApp,
  type SchemaCreateResponse,
} from '@/lib/api/schema'
import { parseJsonOrYaml } from '@/lib/yaml'
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
      title: 'Schema',
      desc: 'ST Schema 클라우드 커넥터(C2C)를 조회·생성·수정·삭제하고 OAuth 자격증명을 재발급합니다.',
      cliNote: 'ST Schema REST 는 /v1 이 아닌 호스트 루트의 /schema 경로를 사용합니다.',
      noName: '(이름 없음)',
      enterId: 'Schema App ID 를 입력하세요.',
      parseError: '파싱 오류',
      created: 'Schema 커넥터를 생성했습니다. clientId/secret 는 지금만 표시됩니다.',
      updated: 'Schema 커넥터를 수정했습니다.',
      deleteConfirm: 'Schema 커넥터 "{id}" 를 삭제할까요? 되돌릴 수 없습니다.',
      deleted: 'Schema 커넥터를 삭제했습니다.',
      regenerateConfirm:
        '"{id}" 의 OAuth clientId/secret 를 재발급할까요?\n기존 자격증명은 즉시 무효화되며, 새 값은 이번 한 번만 표시됩니다.',
      regenerated: 'clientId/secret 를 재발급했습니다. 지금 복사해 두세요.',
      selectConnector: 'Schema 커넥터 선택',
      loading: '불러오는 중…',
      refresh: '↻ 새로고침',
      connectorOption: 'Schema 커넥터 ({count})',
      get: '조회',
      summary: 'Schema 커넥터 정보',
      credsTitle: 'OAuth 자격증명 (이번 한 번만 표시)',
      credsDesc: '지금 복사해 안전한 곳에 보관하세요. 다시 조회할 수 없습니다.',
      credsLabel: 'clientId / secret',
      definition: '정의 (JSON 또는 YAML)',
      create: '생성',
      update: '수정',
      regenerate: '자격증명 재발급',
      delete: '삭제',
      definitionPlaceholder:
        'Schema 커넥터 정의를 JSON 또는 YAML 로 입력하세요. (appName, partnerName, schemaType, hostingType, userEmail 등)',
      rawJson: '원본 JSON',
    },
    en: {
      title: 'Schema',
      desc: 'List, create, update, and delete ST Schema cloud connectors (C2C) and regenerate OAuth credentials.',
      cliNote: 'The ST Schema REST API uses the host-root /schema path, not /v1.',
      noName: '(no name)',
      enterId: 'Enter a Schema App ID.',
      parseError: 'Parse error',
      created: 'Schema connector created. The clientId/secret are shown only now.',
      updated: 'Schema connector updated.',
      deleteConfirm: 'Delete Schema connector "{id}"? This cannot be undone.',
      deleted: 'Schema connector deleted.',
      regenerateConfirm:
        'Regenerate the OAuth clientId/secret for "{id}"?\nThe existing credentials are invalidated immediately and the new values are shown only once.',
      regenerated: 'clientId/secret regenerated. Copy them now.',
      selectConnector: 'Select Schema connector',
      loading: 'Loading…',
      refresh: '↻ Refresh',
      connectorOption: 'Schema connectors ({count})',
      get: 'Get',
      summary: 'Schema connector info',
      credsTitle: 'OAuth credentials (shown only once)',
      credsDesc: 'Copy them now and store them safely. You cannot retrieve them again.',
      credsLabel: 'clientId / secret',
      definition: 'Definition (JSON or YAML)',
      create: 'Create',
      update: 'Update',
      regenerate: 'Regenerate credentials',
      delete: 'Delete',
      definitionPlaceholder:
        'Enter the Schema connector definition as JSON or YAML. (appName, partnerName, schemaType, hostingType, userEmail, etc.)',
      rawJson: 'Raw JSON',
    },
  },
})

const apps = ref<SchemaApp[]>([])
const selected = ref('')
const listLoading = ref(false)

const appId = ref('')
const current = ref<SchemaApp | null>(null)
const editor = ref('')
const busy = ref(false)

// regenerate / create 시 1회 노출되는 clientId/secret
const secrets = ref<SchemaCreateResponse | null>(null)

const infoItems = computed<InfoItem[]>(() => {
  const a = current.value
  if (!a) return []
  return [
    { label: 'Endpoint App ID', value: a.endpointAppId ?? '', mono: true },
    { label: 'App Name', value: a.appName ?? '' },
    { label: 'Partner Name', value: a.partnerName ?? '' },
    { label: 'Schema Type', value: a.schemaType ?? '' },
    { label: 'Hosting Type', value: a.hostingType ?? '' },
    { label: 'Certification', value: a.certificationStatus ?? '' },
    { label: 'ST Client ID', value: a.stClientId ?? '', mono: true },
    { label: 'User Email', value: a.userEmail ?? '' },
  ]
})

function optionLabel(a: SchemaApp): string {
  const name = a.appName || a.partnerName || t('noName')
  return `${name} — ${a.endpointAppId ?? ''}`
}

async function loadList() {
  if (!hasToken.value) return
  listLoading.value = true
  try {
    apps.value = (await listSchemaApps()).sort((a, b) =>
      (a.appName ?? '').localeCompare(b.appName ?? ''),
    )
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    listLoading.value = false
  }
}

async function doGet(id?: string) {
  const aid = (id ?? appId.value).trim()
  if (!aid) return toastError(t('enterId'))
  appId.value = aid
  busy.value = true
  current.value = null
  secrets.value = null
  try {
    const data = await getSchemaApp(aid)
    current.value = data
    editor.value = JSON.stringify(data, null, 2)
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

function onSelect() {
  if (selected.value) doGet(selected.value)
}

async function doCreate() {
  const parsed = parseJsonOrYaml(editor.value)
  if (!parsed.ok) return toastError(parsed.error ?? t('parseError'))
  busy.value = true
  secrets.value = null
  try {
    const res = await createSchemaApp(parsed.json)
    secrets.value = res
    toastSuccess(t('created'))
    if (res.endpointAppId) appId.value = res.endpointAppId
    await loadList()
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

async function doUpdate() {
  const aid = appId.value.trim()
  if (!aid) return toastError(t('enterId'))
  const parsed = parseJsonOrYaml(editor.value)
  if (!parsed.ok) return toastError(parsed.error ?? t('parseError'))
  busy.value = true
  try {
    await updateSchemaApp(aid, parsed.json)
    toastSuccess(t('updated'))
    await doGet(aid)
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

async function doDelete() {
  const aid = appId.value.trim()
  if (!aid) return toastError(t('enterId'))
  if (!window.confirm(t('deleteConfirm', { id: aid }))) return
  busy.value = true
  try {
    await deleteSchemaApp(aid)
    current.value = null
    editor.value = ''
    secrets.value = null
    toastSuccess(t('deleted'))
    await loadList()
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

async function doRegenerate() {
  const aid = appId.value.trim()
  if (!aid) return toastError(t('enterId'))
  if (!window.confirm(t('regenerateConfirm', { id: aid }))) return
  busy.value = true
  try {
    secrets.value = await regenerateSchemaOauth(aid)
    toastSuccess(t('regenerated'))
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
    :commands="[
      'schema [id]',
      'schema:create',
      'schema:update [id]',
      'schema:delete [id]',
      'schema:regenerate [id]',
    ]"
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
          {{ t('selectConnector') }}
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
          <option value="">{{ t('connectorOption', { count: apps.length }) }}</option>
          <option v-for="a in apps" :key="a.endpointAppId" :value="a.endpointAppId">
            {{ optionLabel(a) }}
          </option>
        </select>
      </div>
      <div class="mt-3 flex gap-2">
        <input
          v-model="appId"
          spellcheck="false"
          placeholder="endpoint app id (e.g. viper_xxxxxxxx-...)"
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
      </div>
    </section>

    <!-- 요약 -->
    <div v-if="current" class="mt-4">
      <InfoGrid :title="t('summary')" :items="infoItems" />
    </div>

    <!-- clientId / secret (1회 노출) -->
    <section
      v-if="secrets"
      class="mt-4 rounded-xl border border-warn/50 bg-warn/10 p-4"
    >
      <div class="text-[11px] font-semibold tracking-wider text-warn uppercase">
        {{ t('credsTitle') }}
      </div>
      <p class="mt-1 text-xs text-warn/90">
        {{ t('credsDesc') }}
      </p>
      <div class="mt-3">
        <JsonView :value="secrets" :label="t('credsLabel')" :default-open="true" />
      </div>
    </section>

    <!-- 에디터 -->
    <section class="mt-4 rounded-xl border border-line bg-card p-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <span class="text-[11px] font-semibold tracking-wider text-muted uppercase">
          {{ t('definition') }}
        </span>
        <div class="flex flex-wrap gap-2">
          <button
            class="rounded-lg border border-transparent bg-gradient-to-br from-brand to-brand-2 px-4 py-1.5 text-sm font-semibold text-[#061026] transition hover:-translate-y-px disabled:opacity-50"
            :disabled="busy"
            @click="doCreate"
          >
            {{ t('create') }}
          </button>
          <button
            class="rounded-lg border border-line px-4 py-1.5 text-sm font-semibold transition hover:-translate-y-px hover:border-brand-2 disabled:opacity-50"
            :disabled="busy"
            @click="doUpdate"
          >
            {{ t('update') }}
          </button>
          <button
            class="rounded-lg border border-line px-4 py-1.5 text-sm font-semibold transition hover:-translate-y-px hover:border-brand-2 disabled:opacity-50"
            :disabled="busy"
            @click="doRegenerate"
          >
            {{ t('regenerate') }}
          </button>
          <button
            class="rounded-lg border border-warn/50 bg-warn/10 px-4 py-1.5 text-sm font-semibold text-warn transition hover:-translate-y-px hover:border-warn disabled:opacity-50"
            :disabled="busy"
            @click="doDelete"
          >
            {{ t('delete') }}
          </button>
        </div>
      </div>
      <textarea
        v-model="editor"
        spellcheck="false"
        rows="16"
        :placeholder="t('definitionPlaceholder')"
        class="mt-3 w-full resize-y rounded-lg border border-line bg-bg-2 px-3 py-2 font-mono text-[13px] leading-relaxed text-text outline-none focus:border-brand-2"
      />
    </section>

    <!-- 원본 결과 -->
    <div v-if="current" class="mt-4">
      <JsonView :value="current" :label="t('rawJson')" />
    </div>
  </template>
</template>
