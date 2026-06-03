<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useTokenStore } from '@/stores/token'
import {
  listSchemaApps,
  listSchemaInvites,
  getSchemaInvite,
  createSchemaInvite,
  deleteSchemaInvite,
  type SchemaApp,
  type SchemaAppInvitation,
} from '@/lib/api/schema'
import { parseJsonOrYaml } from '@/lib/yaml'
import { toastError, toastSuccess } from '@/lib/toast'
import CliRef from '@/components/CliRef.vue'
import InfoGrid, { type InfoItem } from '@/components/InfoGrid.vue'
import JsonView from '@/components/JsonView.vue'

const { hasToken } = storeToRefs(useTokenStore())

// schema 앱 선택 (초대 목록은 schemaAppId 기준)
const apps = ref<SchemaApp[]>([])
const selectedApp = ref('')
const appsLoading = ref(false)

// 초대 목록 / 단건
const invites = ref<SchemaAppInvitation[]>([])
const listLoading = ref(false)
const inviteId = ref('')
const current = ref<SchemaAppInvitation | null>(null)
const busy = ref(false)

// 생성 에디터 (JSON/YAML) — { schemaAppId, description?, acceptLimit? }
const editor = ref('')

const infoItems = computed<InfoItem[]>(() => {
  const v = current.value
  if (!v) return []
  return [
    { label: 'Invitation ID', value: v.invitationId ?? v.id ?? '', mono: true },
    { label: 'Schema App ID', value: v.schemaAppId ?? '', mono: true },
    { label: 'Description', value: v.description ?? '' },
    { label: 'Accept URL', value: v.acceptUrl ?? '' },
    { label: 'Acceptances', value: v.acceptances != null ? String(v.acceptances) : '' },
    { label: 'Short Code', value: v.shortCode ?? '' },
  ]
})

function appOptionLabel(a: SchemaApp): string {
  const name = a.appName || a.partnerName || '(이름 없음)'
  return `${name} — ${a.endpointAppId ?? ''}`
}

function inviteOptionLabel(v: SchemaAppInvitation): string {
  const id = v.invitationId ?? v.id ?? ''
  return v.description ? `${v.description} — ${id}` : id
}

async function loadApps() {
  if (!hasToken.value) return
  appsLoading.value = true
  try {
    apps.value = (await listSchemaApps()).sort((a, b) =>
      (a.appName ?? '').localeCompare(b.appName ?? ''),
    )
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    appsLoading.value = false
  }
}

async function loadInvites() {
  const appId = selectedApp.value.trim()
  if (!appId) return toastError('먼저 Schema 앱을 선택하세요.')
  listLoading.value = true
  invites.value = []
  try {
    invites.value = await listSchemaInvites(appId)
    // 다음 생성 시 편의를 위해 에디터에 기본 본문 채우기 (비어 있을 때만)
    if (!editor.value.trim()) {
      editor.value = JSON.stringify({ schemaAppId: appId, description: '' }, null, 2)
    }
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    listLoading.value = false
  }
}

function onSelectApp() {
  if (selectedApp.value) loadInvites()
}

async function doGet(id?: string) {
  const iid = (id ?? inviteId.value).trim()
  if (!iid) return toastError('Invitation ID 를 입력하세요.')
  inviteId.value = iid
  busy.value = true
  current.value = null
  try {
    current.value = await getSchemaInvite(iid)
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

function onSelectInvite(v: SchemaAppInvitation) {
  const id = v.invitationId ?? v.id
  if (id) doGet(id)
}

async function doCreate() {
  const parsed = parseJsonOrYaml(editor.value)
  if (!parsed.ok) return toastError(parsed.error ?? '파싱 오류')
  const value = parsed.value as { schemaAppId?: string; description?: string; acceptLimit?: number }
  const appId = (value.schemaAppId ?? selectedApp.value).trim()
  if (!appId) return toastError('schemaAppId 가 필요합니다. (에디터 본문 또는 앱 선택)')
  busy.value = true
  try {
    const res = await createSchemaInvite({
      schemaAppId: appId,
      description: value.description,
      acceptLimit: value.acceptLimit,
    })
    current.value = res as SchemaAppInvitation
    toastSuccess('Schema 앱 초대를 생성했습니다.')
    selectedApp.value = appId
    await loadInvites()
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

async function doDelete(id?: string) {
  const iid = (id ?? inviteId.value).trim()
  if (!iid) return toastError('Invitation ID 를 입력하세요.')
  if (!window.confirm(`초대 "${iid}" 를 삭제(취소)할까요? 되돌릴 수 없습니다.`)) return
  busy.value = true
  try {
    await deleteSchemaInvite(iid)
    if (current.value && (current.value.invitationId === iid || current.value.id === iid)) {
      current.value = null
    }
    toastSuccess('초대를 삭제했습니다.')
    if (selectedApp.value) await loadInvites()
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

onMounted(loadApps)
</script>

<template>
  <header class="mb-6">
    <h1 class="text-2xl font-extrabold tracking-tight md:text-3xl">Schema 초대</h1>
    <p class="mt-1 text-sm text-muted">
      ST Schema 앱 초대(invitation)를 조회·생성·삭제합니다.
    </p>
  </header>

  <CliRef
    :commands="['invites:schema [id]', 'invites:schema:create', 'invites:schema:delete [id]']"
    note="REST 는 /invites/schemaApp (호스트 루트). 목록은 schemaAppId 쿼리가 필요합니다."
  />

  <div
    v-if="!hasToken"
    class="rounded-xl border-l-[3px] border-warn bg-warn/10 px-4 py-3 text-sm text-warn"
  >
    PAT 토큰이 없습니다. 우측 상단의 <strong>PAT 설정</strong> 으로 토큰을 입력하세요.
  </div>

  <template v-else>
    <!-- 앱 선택 + 초대 목록 -->
    <section class="rounded-xl border border-line bg-card p-4">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-semibold tracking-wider text-muted uppercase">
          Schema 앱 선택 (초대 목록)
        </span>
        <button
          class="rounded-md border border-line px-2 py-1 text-xs text-muted transition hover:border-brand-2 hover:text-brand-2"
          :disabled="appsLoading"
          @click="loadApps"
        >
          {{ appsLoading ? '불러오는 중…' : '↻ 앱 새로고침' }}
        </button>
      </div>
      <div class="mt-3 flex gap-2">
        <select
          v-model="selectedApp"
          class="w-full rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
          @change="onSelectApp"
        >
          <option value="">Schema 앱 ({{ apps.length }})</option>
          <option v-for="a in apps" :key="a.endpointAppId" :value="a.endpointAppId">
            {{ appOptionLabel(a) }}
          </option>
        </select>
        <button
          class="shrink-0 rounded-lg border border-line px-4 py-2 text-sm font-semibold transition hover:-translate-y-px hover:border-brand-2 disabled:opacity-50"
          :disabled="listLoading || !selectedApp"
          @click="loadInvites"
        >
          {{ listLoading ? '불러오는 중…' : '초대 목록' }}
        </button>
      </div>

      <!-- 초대 목록 -->
      <ul v-if="invites.length" class="mt-3 flex flex-col gap-1.5">
        <li
          v-for="v in invites"
          :key="v.invitationId ?? v.id"
          class="flex items-center gap-2 rounded-lg border border-line bg-bg-2 px-3 py-2"
        >
          <span class="min-w-0 flex-1 truncate font-mono text-[12.5px] text-brand-2">
            {{ inviteOptionLabel(v) }}
          </span>
          <button
            class="shrink-0 rounded-md border border-line px-2 py-1 text-xs font-semibold transition hover:border-brand-2"
            :disabled="busy"
            @click="onSelectInvite(v)"
          >
            조회
          </button>
          <button
            class="shrink-0 rounded-md border border-warn/50 bg-warn/10 px-2 py-1 text-xs font-semibold text-warn transition hover:border-warn"
            :disabled="busy"
            @click="doDelete(v.invitationId ?? v.id)"
          >
            삭제
          </button>
        </li>
      </ul>
      <p v-else-if="selectedApp && !listLoading" class="mt-3 text-xs text-muted">
        이 앱에 대한 초대가 없거나 조회 권한이 없습니다.
      </p>
    </section>

    <!-- 단건 조회 / 삭제 by id -->
    <section class="mt-4 rounded-xl border border-line bg-card p-4">
      <span class="text-[11px] font-semibold tracking-wider text-muted uppercase">
        Invitation ID 로 직접 조회 / 삭제
      </span>
      <div class="mt-3 flex gap-2">
        <input
          v-model="inviteId"
          spellcheck="false"
          placeholder="invitation id"
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
          @click="doDelete()"
        >
          삭제
        </button>
      </div>
    </section>

    <!-- 요약 -->
    <div v-if="current" class="mt-4">
      <InfoGrid title="초대 정보" :items="infoItems" />
    </div>

    <!-- 생성 에디터 -->
    <section class="mt-4 rounded-xl border border-line bg-card p-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <span class="text-[11px] font-semibold tracking-wider text-muted uppercase">
          초대 생성 (JSON 또는 YAML)
        </span>
        <button
          class="rounded-lg border border-transparent bg-gradient-to-br from-brand to-brand-2 px-4 py-1.5 text-sm font-semibold text-[#061026] transition hover:-translate-y-px disabled:opacity-50"
          :disabled="busy"
          @click="doCreate"
        >
          생성
        </button>
      </div>
      <textarea
        v-model="editor"
        spellcheck="false"
        rows="8"
        placeholder='{ "schemaAppId": "viper_...", "description": "초대 설명", "acceptLimit": 1 }'
        class="mt-3 w-full resize-y rounded-lg border border-line bg-bg-2 px-3 py-2 font-mono text-[13px] leading-relaxed text-text outline-none focus:border-brand-2"
      />
    </section>

    <!-- 원본 결과 -->
    <div v-if="current" class="mt-4">
      <JsonView :value="current" label="원본 JSON" :default-open="true" />
    </div>
  </template>
</template>
