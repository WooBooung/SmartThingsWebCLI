<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useTokenStore } from '@/stores/token'
import {
  listApps,
  getApp,
  createApp,
  updateApp,
  deleteApp,
  getAppOauth,
  updateAppOauth,
  generateAppOauth,
  getAppSettings,
  updateAppSettings,
  registerApp,
  type App,
  type AppSummary,
  type AppType,
  type AppClassification,
} from '@/lib/api/apps'
import { parseJsonOrYaml } from '@/lib/yaml'
import { toastError, toastSuccess } from '@/lib/toast'
import CliRef from '@/components/CliRef.vue'
import JsonView from '@/components/JsonView.vue'
import InfoGrid, { type InfoItem } from '@/components/InfoGrid.vue'

const { hasToken } = storeToRefs(useTokenStore())

const { t } = useI18n({
  useScope: 'local',
  inheritLocale: true,
  messages: {
    ko: {
      title: 'Apps',
      desc: 'SmartApp / API 앱을 조회·생성·수정·삭제하고 OAuth·설정·등록을 관리합니다.',
      enterAppId: 'App ID 를 입력하세요.',
      parseError: '파싱 오류',
      parseErrorOauth: '파싱 오류 (clientName, scope 필요)',
      created: 'App 을 생성했습니다.',
      updated: 'App 을 수정했습니다.',
      deleteConfirm: 'App "{id}" 를 삭제할까요? 되돌릴 수 없습니다.',
      deleteResult: 'App "{id}" 삭제 성공',
      deleted: 'App 을 삭제했습니다.',
      registerResult: 'App "{id}" 등록 요청 완료',
      registered: 'App 등록(확인) 요청을 보냈습니다.',
      regenerateConfirm:
        'App "{id}" 의 OAuth client secret 을 재발급할까요? 기존 secret 은 무효화되며 새 secret 은 이번 한 번만 표시됩니다.',
      oauthUpdated: 'OAuth 설정을 수정했습니다.',
      oauthRegenerated: 'OAuth client 를 재발급했습니다. (secret 은 지금만 표시됩니다)',
      settingsUpdated: '설정을 수정했습니다.',
      selectApp: 'App 선택',
      loading: '불러오는 중…',
      refresh: '↻ 새로고침',
      allAppType: '전체 appType',
      allClassification: '전체 classification',
      selectAppOption: '앱 선택 ({count})',
      get: '조회',
      register: '등록',
      summary: 'App 요약',
      definition: '정의 (JSON 또는 YAML)',
      create: '생성',
      update: '수정',
      delete: '삭제',
      definitionPlaceholder: 'app 정의를 JSON 또는 YAML 로 입력하세요.',
      result: '결과',
      rawJson: '원본 JSON',
      oauthSub: '조회 · 수정 · 재발급',
      oauthGet: 'OAuth 조회',
      oauthUpdate: 'OAuth 수정',
      oauthConfig: 'OAuth 설정 (clientName · scope · redirectUris)',
      oauthResult: 'OAuth 설정 결과',
      secretRotate: 'Client Secret 재발급 (secret 회전)',
      secretRotateDesc:
        '기존 secret 은 무효화됩니다. 응답의 clientId/clientSecret 은 이번 한 번만 표시됩니다.',
      regenerate: '재발급',
      regenerateResult: '재발급 결과 (clientId / clientSecret)',
      settings: '설정 (Settings)',
      settingsSub: '조회 · 수정',
      settingsGet: '설정 조회',
      settingsUpdate: '설정 수정',
      settingsResult: '설정 결과',
    },
    en: {
      title: 'Apps',
      desc: 'List, create, update, and delete SmartApp / API apps and manage OAuth, settings, and registration.',
      enterAppId: 'Enter an App ID.',
      parseError: 'Parse error',
      parseErrorOauth: 'Parse error (clientName, scope required)',
      created: 'App created.',
      updated: 'App updated.',
      deleteConfirm: 'Delete App "{id}"? This cannot be undone.',
      deleteResult: 'App "{id}" deleted',
      deleted: 'App deleted.',
      registerResult: 'App "{id}" registration requested',
      registered: 'Sent app registration (confirm) request.',
      regenerateConfirm:
        'Regenerate the OAuth client secret for App "{id}"? The existing secret is invalidated and the new secret is shown only once.',
      oauthUpdated: 'OAuth settings updated.',
      oauthRegenerated: 'OAuth client regenerated. (secret is shown only now)',
      settingsUpdated: 'Settings updated.',
      selectApp: 'Select App',
      loading: 'Loading…',
      refresh: '↻ Refresh',
      allAppType: 'All appTypes',
      allClassification: 'All classifications',
      selectAppOption: 'Select app ({count})',
      get: 'Get',
      register: 'Register',
      summary: 'App summary',
      definition: 'Definition (JSON or YAML)',
      create: 'Create',
      update: 'Update',
      delete: 'Delete',
      definitionPlaceholder: 'Enter the app definition as JSON or YAML.',
      result: 'Result',
      rawJson: 'Raw JSON',
      oauthSub: 'Get · Update · Regenerate',
      oauthGet: 'Get OAuth',
      oauthUpdate: 'Update OAuth',
      oauthConfig: 'OAuth settings (clientName · scope · redirectUris)',
      oauthResult: 'OAuth settings result',
      secretRotate: 'Regenerate Client Secret (secret rotation)',
      secretRotateDesc:
        'The existing secret is invalidated. The clientId/clientSecret in the response are shown only once.',
      regenerate: 'Regenerate',
      regenerateResult: 'Regenerate result (clientId / clientSecret)',
      settings: 'Settings',
      settingsSub: 'Get · Update',
      settingsGet: 'Get settings',
      settingsUpdate: 'Update settings',
      settingsResult: 'Settings result',
    },
  },
})

// --- 목록/필터 ---
const apps = ref<AppSummary[]>([])
const listLoading = ref(false)
const filterAppType = ref<'' | AppType>('')
const filterClassification = ref<'' | AppClassification>('')
const selectedAppId = ref('')

const appTypeOptions: AppType[] = ['LAMBDA_SMART_APP', 'WEBHOOK_SMART_APP', 'API_ONLY']
const classificationOptions: AppClassification[] = [
  'AUTOMATION',
  'SERVICE',
  'DEVICE',
  'CONNECTED_SERVICE',
  'HUB_LOCAL',
]

// --- 상세/에디터 ---
const appId = ref('')
const detail = ref<App | null>(null)
const editor = ref('')
const result = ref<unknown>(null)
const busy = ref(false)

const detailItems = computed<InfoItem[]>(() => {
  const a = detail.value
  if (!a) return []
  return [
    { label: 'App ID', value: a.appId ?? '', mono: true },
    { label: 'App Name', value: a.appName ?? '', mono: true },
    { label: 'Display Name', value: a.displayName ?? '' },
    { label: 'App Type', value: a.appType ?? '' },
    { label: 'Classifications', value: (a.classifications ?? []).join(', ') },
    { label: 'Description', value: a.description ?? '' },
  ]
})

function appLabel(a: AppSummary): string {
  const name = a.displayName || a.appName || a.appId
  const type = a.appType ? ` · ${a.appType}` : ''
  return `${name}${type}`
}

async function loadList() {
  if (!hasToken.value) return
  listLoading.value = true
  try {
    const res = await listApps({
      appType: filterAppType.value || undefined,
      classification: filterClassification.value || undefined,
    })
    apps.value = (res.items ?? []).sort((a, b) =>
      (a.displayName || a.appName || a.appId).localeCompare(b.displayName || b.appName || b.appId),
    )
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    listLoading.value = false
  }
}

async function doGet(id?: string) {
  const aid = (id ?? appId.value).trim()
  if (!aid) {
    toastError(t('enterAppId'))
    return
  }
  appId.value = aid
  busy.value = true
  result.value = null
  try {
    const data = await getApp(aid)
    detail.value = data
    editor.value = JSON.stringify(data, null, 2)
    // 부가 섹션 초기화
    oauth.value = null
    settings.value = null
    generated.value = null
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

function onSelectApp() {
  if (selectedAppId.value) doGet(selectedAppId.value)
}

async function doCreate() {
  const parsed = parseJsonOrYaml(editor.value)
  if (!parsed.ok) return toastError(parsed.error ?? t('parseError'))
  busy.value = true
  try {
    const created = await createApp(parsed.json)
    result.value = created
    detail.value = created
    if (created.appId) appId.value = created.appId
    toastSuccess(t('created'))
    await loadList()
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

async function doUpdate() {
  const aid = appId.value.trim()
  if (!aid) return toastError(t('enterAppId'))
  const parsed = parseJsonOrYaml(editor.value)
  if (!parsed.ok) return toastError(parsed.error ?? t('parseError'))
  busy.value = true
  try {
    const updated = await updateApp(aid, parsed.json)
    result.value = updated
    detail.value = updated
    toastSuccess(t('updated'))
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

async function doDelete() {
  const aid = appId.value.trim()
  if (!aid) return toastError(t('enterAppId'))
  if (!window.confirm(t('deleteConfirm', { id: aid }))) return
  busy.value = true
  try {
    await deleteApp(aid)
    result.value = { message: t('deleteResult', { id: aid }) }
    detail.value = null
    toastSuccess(t('deleted'))
    await loadList()
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

async function doRegister() {
  const aid = appId.value.trim()
  if (!aid) return toastError(t('enterAppId'))
  busy.value = true
  try {
    result.value = (await registerApp(aid)) ?? { message: t('registerResult', { id: aid }) }
    toastSuccess(t('registered'))
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

// --- OAuth 섹션 ---
const oauthOpen = ref(false)
const oauth = ref<unknown>(null)
const oauthEditor = ref('')
const generated = ref<unknown>(null)
const generateEditor = ref('')

async function doGetOauth() {
  const aid = appId.value.trim()
  if (!aid) return toastError(t('enterAppId'))
  busy.value = true
  try {
    const data = await getAppOauth(aid)
    oauth.value = data
    oauthEditor.value = JSON.stringify(data, null, 2)
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

async function doUpdateOauth() {
  const aid = appId.value.trim()
  if (!aid) return toastError(t('enterAppId'))
  const parsed = parseJsonOrYaml(oauthEditor.value)
  if (!parsed.ok) return toastError(parsed.error ?? t('parseError'))
  busy.value = true
  try {
    oauth.value = await updateAppOauth(aid, parsed.json)
    toastSuccess(t('oauthUpdated'))
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

async function doGenerateOauth() {
  const aid = appId.value.trim()
  if (!aid) return toastError(t('enterAppId'))
  const parsed = parseJsonOrYaml(generateEditor.value)
  if (!parsed.ok) return toastError(parsed.error ?? t('parseErrorOauth'))
  if (!window.confirm(t('regenerateConfirm', { id: aid }))) return
  busy.value = true
  try {
    const data = await generateAppOauth(aid, parsed.json)
    generated.value = data
    toastSuccess(t('oauthRegenerated'))
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

// --- 설정 섹션 ---
const settingsOpen = ref(false)
const settings = ref<unknown>(null)
const settingsEditor = ref('')

async function doGetSettings() {
  const aid = appId.value.trim()
  if (!aid) return toastError(t('enterAppId'))
  busy.value = true
  try {
    const data = await getAppSettings(aid)
    settings.value = data
    settingsEditor.value = JSON.stringify(data, null, 2)
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

async function doUpdateSettings() {
  const aid = appId.value.trim()
  if (!aid) return toastError(t('enterAppId'))
  const parsed = parseJsonOrYaml(settingsEditor.value)
  if (!parsed.ok) return toastError(parsed.error ?? t('parseError'))
  busy.value = true
  try {
    settings.value = await updateAppSettings(aid, parsed.json)
    toastSuccess(t('settingsUpdated'))
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
    <p class="mt-1 text-sm text-muted">{{ t('desc') }}</p>
  </header>

  <CliRef
    :commands="[
      'apps [id]',
      'apps:create',
      'apps:update [id]',
      'apps:delete [id]',
      'apps:oauth [id]',
      'apps:oauth:generate [id]',
      'apps:oauth:update [id]',
      'apps:settings [id]',
      'apps:settings:update [id]',
      'apps:register [id]',
    ]"
    :docs="[{ label: 'Apps', url: 'https://developer.smartthings.com/docs/api/public/#tag/Apps' }]"
  />

  <div
    v-if="!hasToken"
    class="rounded-xl border-l-[3px] border-warn bg-warn/10 px-4 py-3 text-sm text-warn"
  >
    {{ $t('common.noToken') }}<strong>{{ $t('common.noTokenStrong') }}</strong>{{ $t('common.noTokenTail') }}
  </div>

  <template v-else>
    <!-- 목록/선택 -->
    <section class="rounded-xl border border-line bg-card p-4">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-semibold tracking-wider text-muted uppercase">{{ t('selectApp') }}</span>
        <button
          class="rounded-md border border-line px-2 py-1 text-xs text-muted transition hover:border-brand-2 hover:text-brand-2"
          :disabled="listLoading"
          @click="loadList"
        >
          {{ listLoading ? t('loading') : t('refresh') }}
        </button>
      </div>

      <div class="mt-3 grid gap-3 sm:grid-cols-2">
        <select
          v-model="filterAppType"
          class="rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
          @change="loadList"
        >
          <option value="">{{ t('allAppType') }}</option>
          <option v-for="opt in appTypeOptions" :key="opt" :value="opt">{{ opt }}</option>
        </select>
        <select
          v-model="filterClassification"
          class="rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
          @change="loadList"
        >
          <option value="">{{ t('allClassification') }}</option>
          <option v-for="c in classificationOptions" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>

      <select
        v-model="selectedAppId"
        class="mt-3 w-full rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
        @change="onSelectApp"
      >
        <option value="">{{ t('selectAppOption', { count: apps.length }) }}</option>
        <option v-for="a in apps" :key="a.appId" :value="a.appId">{{ appLabel(a) }}</option>
      </select>

      <div class="mt-3 flex gap-2">
        <input
          v-model="appId"
          spellcheck="false"
          placeholder="app id (UUID)"
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
          class="shrink-0 rounded-lg border border-line px-4 py-2 text-sm font-semibold transition hover:-translate-y-px hover:border-brand-2 disabled:opacity-50"
          :disabled="busy"
          @click="doRegister"
        >
          {{ t('register') }}
        </button>
      </div>
    </section>

    <!-- 상세 요약 -->
    <div v-if="detail" class="mt-4">
      <InfoGrid :title="t('summary')" :items="detailItems" />
    </div>

    <!-- 에디터 -->
    <section class="mt-4 rounded-xl border border-line bg-card p-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <span class="text-[11px] font-semibold tracking-wider text-muted uppercase">
          {{ t('definition') }}
        </span>
        <div class="flex gap-2">
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

    <!-- 결과 -->
    <div v-if="result" class="mt-4">
      <JsonView :value="result" :label="t('result')" :default-open="true" />
    </div>

    <!-- 상세 원본 -->
    <div v-if="detail" class="mt-4">
      <JsonView :value="detail" :label="t('rawJson')" />
    </div>

    <!-- OAuth -->
    <section class="mt-4 overflow-hidden rounded-xl border border-line bg-card">
      <button
        class="flex w-full items-center gap-2 px-4 py-3 text-left"
        @click="oauthOpen = !oauthOpen"
      >
        <span class="text-brand-2 transition-transform" :class="oauthOpen ? 'rotate-90' : ''">▶</span>
        <span class="text-sm font-bold">OAuth</span>
        <span class="ml-auto text-xs text-muted">{{ t('oauthSub') }}</span>
      </button>

      <div v-if="oauthOpen" class="border-t border-line p-4">
        <div class="flex flex-wrap gap-2">
          <button
            class="rounded-lg border border-line px-4 py-2 text-sm font-semibold transition hover:-translate-y-px hover:border-brand-2 disabled:opacity-50"
            :disabled="busy"
            @click="doGetOauth"
          >
            {{ t('oauthGet') }}
          </button>
          <button
            class="rounded-lg border border-line px-4 py-2 text-sm font-semibold transition hover:-translate-y-px hover:border-brand-2 disabled:opacity-50"
            :disabled="busy"
            @click="doUpdateOauth"
          >
            {{ t('oauthUpdate') }}
          </button>
        </div>
        <p class="mt-3 text-[11px] font-semibold tracking-wider text-muted uppercase">
          {{ t('oauthConfig') }}
        </p>
        <textarea
          v-model="oauthEditor"
          spellcheck="false"
          rows="7"
          placeholder='{ "clientName": "...", "scope": ["r:devices:*"], "redirectUris": ["https://..."] }'
          class="mt-2 w-full resize-y rounded-lg border border-line bg-bg-2 px-3 py-2 font-mono text-[13px] leading-relaxed text-text outline-none focus:border-brand-2"
        />
        <div v-if="oauth" class="mt-3">
          <JsonView :value="oauth" :label="t('oauthResult')" :default-open="true" />
        </div>

        <!-- 재발급 -->
        <div class="mt-5 rounded-lg border border-warn/40 bg-warn/5 p-3">
          <p class="text-[11px] font-semibold tracking-wider text-warn uppercase">
            {{ t('secretRotate') }}
          </p>
          <p class="mt-1 text-xs text-muted">
            {{ t('secretRotateDesc') }}
          </p>
          <textarea
            v-model="generateEditor"
            spellcheck="false"
            rows="5"
            placeholder='{ "clientName": "...", "scope": ["r:devices:*"] }'
            class="mt-2 w-full resize-y rounded-lg border border-line bg-bg-2 px-3 py-2 font-mono text-[13px] leading-relaxed text-text outline-none focus:border-brand-2"
          />
          <button
            class="mt-2 rounded-lg border border-warn/50 bg-warn/10 px-4 py-2 text-sm font-semibold text-warn transition hover:-translate-y-px hover:border-warn disabled:opacity-50"
            :disabled="busy"
            @click="doGenerateOauth"
          >
            {{ t('regenerate') }}
          </button>
          <div v-if="generated" class="mt-3">
            <JsonView :value="generated" :label="t('regenerateResult')" :default-open="true" />
          </div>
        </div>
      </div>
    </section>

    <!-- 설정 -->
    <section class="mt-4 overflow-hidden rounded-xl border border-line bg-card">
      <button
        class="flex w-full items-center gap-2 px-4 py-3 text-left"
        @click="settingsOpen = !settingsOpen"
      >
        <span class="text-brand-2 transition-transform" :class="settingsOpen ? 'rotate-90' : ''">▶</span>
        <span class="text-sm font-bold">{{ t('settings') }}</span>
        <span class="ml-auto text-xs text-muted">{{ t('settingsSub') }}</span>
      </button>

      <div v-if="settingsOpen" class="border-t border-line p-4">
        <div class="flex flex-wrap gap-2">
          <button
            class="rounded-lg border border-line px-4 py-2 text-sm font-semibold transition hover:-translate-y-px hover:border-brand-2 disabled:opacity-50"
            :disabled="busy"
            @click="doGetSettings"
          >
            {{ t('settingsGet') }}
          </button>
          <button
            class="rounded-lg border border-line px-4 py-2 text-sm font-semibold transition hover:-translate-y-px hover:border-brand-2 disabled:opacity-50"
            :disabled="busy"
            @click="doUpdateSettings"
          >
            {{ t('settingsUpdate') }}
          </button>
        </div>
        <textarea
          v-model="settingsEditor"
          spellcheck="false"
          rows="7"
          placeholder='{ "settings": { "key": "value" } }'
          class="mt-3 w-full resize-y rounded-lg border border-line bg-bg-2 px-3 py-2 font-mono text-[13px] leading-relaxed text-text outline-none focus:border-brand-2"
        />
        <div v-if="settings" class="mt-3">
          <JsonView :value="settings" :label="t('settingsResult')" :default-open="true" />
        </div>
      </div>
    </section>
  </template>
</template>
