<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
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
  const name = a.appName || a.partnerName || '(이름 없음)'
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
  if (!aid) return toastError('Schema App ID 를 입력하세요.')
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
  if (!parsed.ok) return toastError(parsed.error ?? '파싱 오류')
  busy.value = true
  secrets.value = null
  try {
    const res = await createSchemaApp(parsed.json)
    secrets.value = res
    toastSuccess('Schema 커넥터를 생성했습니다. clientId/secret 는 지금만 표시됩니다.')
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
  if (!aid) return toastError('Schema App ID 를 입력하세요.')
  const parsed = parseJsonOrYaml(editor.value)
  if (!parsed.ok) return toastError(parsed.error ?? '파싱 오류')
  busy.value = true
  try {
    await updateSchemaApp(aid, parsed.json)
    toastSuccess('Schema 커넥터를 수정했습니다.')
    await doGet(aid)
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

async function doDelete() {
  const aid = appId.value.trim()
  if (!aid) return toastError('Schema App ID 를 입력하세요.')
  if (!window.confirm(`Schema 커넥터 "${aid}" 를 삭제할까요? 되돌릴 수 없습니다.`)) return
  busy.value = true
  try {
    await deleteSchemaApp(aid)
    current.value = null
    editor.value = ''
    secrets.value = null
    toastSuccess('Schema 커넥터를 삭제했습니다.')
    await loadList()
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

async function doRegenerate() {
  const aid = appId.value.trim()
  if (!aid) return toastError('Schema App ID 를 입력하세요.')
  if (
    !window.confirm(
      `"${aid}" 의 OAuth clientId/secret 를 재발급할까요?\n기존 자격증명은 즉시 무효화되며, 새 값은 이번 한 번만 표시됩니다.`,
    )
  )
    return
  busy.value = true
  try {
    secrets.value = await regenerateSchemaOauth(aid)
    toastSuccess('clientId/secret 를 재발급했습니다. 지금 복사해 두세요.')
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
    <h1 class="text-2xl font-extrabold tracking-tight md:text-3xl">Schema</h1>
    <p class="mt-1 text-sm text-muted">
      ST Schema 클라우드 커넥터(C2C)를 조회·생성·수정·삭제하고 OAuth 자격증명을 재발급합니다.
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
    note="ST Schema REST 는 /v1 이 아닌 호스트 루트의 /schema 경로를 사용합니다."
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
          Schema 커넥터 선택
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
          <option value="">Schema 커넥터 ({{ apps.length }})</option>
          <option v-for="a in apps" :key="a.endpointAppId" :value="a.endpointAppId">
            {{ optionLabel(a) }}
          </option>
        </select>
      </div>
      <div class="mt-3 flex gap-2">
        <input
          v-model="appId"
          spellcheck="false"
          placeholder="endpoint app id (예: viper_xxxxxxxx-...)"
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
      </div>
    </section>

    <!-- 요약 -->
    <div v-if="current" class="mt-4">
      <InfoGrid title="Schema 커넥터 정보" :items="infoItems" />
    </div>

    <!-- clientId / secret (1회 노출) -->
    <section
      v-if="secrets"
      class="mt-4 rounded-xl border border-warn/50 bg-warn/10 p-4"
    >
      <div class="text-[11px] font-semibold tracking-wider text-warn uppercase">
        OAuth 자격증명 (이번 한 번만 표시)
      </div>
      <p class="mt-1 text-xs text-warn/90">
        지금 복사해 안전한 곳에 보관하세요. 다시 조회할 수 없습니다.
      </p>
      <div class="mt-3">
        <JsonView :value="secrets" label="clientId / secret" :default-open="true" />
      </div>
    </section>

    <!-- 에디터 -->
    <section class="mt-4 rounded-xl border border-line bg-card p-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <span class="text-[11px] font-semibold tracking-wider text-muted uppercase">
          정의 (JSON 또는 YAML)
        </span>
        <div class="flex flex-wrap gap-2">
          <button
            class="rounded-lg border border-transparent bg-gradient-to-br from-brand to-brand-2 px-4 py-1.5 text-sm font-semibold text-[#061026] transition hover:-translate-y-px disabled:opacity-50"
            :disabled="busy"
            @click="doCreate"
          >
            생성
          </button>
          <button
            class="rounded-lg border border-line px-4 py-1.5 text-sm font-semibold transition hover:-translate-y-px hover:border-brand-2 disabled:opacity-50"
            :disabled="busy"
            @click="doUpdate"
          >
            수정
          </button>
          <button
            class="rounded-lg border border-line px-4 py-1.5 text-sm font-semibold transition hover:-translate-y-px hover:border-brand-2 disabled:opacity-50"
            :disabled="busy"
            @click="doRegenerate"
          >
            자격증명 재발급
          </button>
          <button
            class="rounded-lg border border-warn/50 bg-warn/10 px-4 py-1.5 text-sm font-semibold text-warn transition hover:-translate-y-px hover:border-warn disabled:opacity-50"
            :disabled="busy"
            @click="doDelete"
          >
            삭제
          </button>
        </div>
      </div>
      <textarea
        v-model="editor"
        spellcheck="false"
        rows="16"
        placeholder="Schema 커넥터 정의를 JSON 또는 YAML 로 입력하세요. (appName, partnerName, schemaType, hostingType, userEmail 등)"
        class="mt-3 w-full resize-y rounded-lg border border-line bg-bg-2 px-3 py-2 font-mono text-[13px] leading-relaxed text-text outline-none focus:border-brand-2"
      />
    </section>

    <!-- 원본 결과 -->
    <div v-if="current" class="mt-4">
      <JsonView :value="current" label="원본 JSON" />
    </div>
  </template>
</template>
