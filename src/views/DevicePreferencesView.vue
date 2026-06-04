<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useTokenStore } from '@/stores/token'
import {
  listDevicePreferences,
  getDevicePreference,
  createDevicePreference,
  updateDevicePreference,
  listDevicePreferenceTranslations,
  getDevicePreferenceTranslations,
  createDevicePreferenceTranslations,
  updateDevicePreferenceTranslations,
  type DevicePreferenceSummary,
} from '@/lib/api/devicepreferences'
import { parseJsonOrYaml } from '@/lib/yaml'
import { toastError, toastSuccess } from '@/lib/toast'
import { ApiError } from '@/lib/stClient'
import JsonView from '@/components/JsonView.vue'
import CliRef from '@/components/CliRef.vue'

const { t } = useI18n({
  useScope: 'local',
  inheritLocale: true,
  messages: {
    ko: {
      title: 'Device Preferences',
      desc: '디바이스 환경설정(preference)을 조회·생성·수정하고 번역을 관리합니다.',
      noTokenPre: 'PAT 토큰이 없습니다. 우측 상단의 ',
      noTokenPost: ' 으로 토큰을 입력하세요.',
      patSetting: 'PAT 설정',
      selectLabel: 'Device Preference 선택',
      loading: '불러오는 중…',
      refresh: '↻ 새로고침',
      selectPlaceholder: 'device preference ({count})',
      namespacePlaceholder: 'namespace 필터 (선택)',
      idPlaceholder: 'preference id',
      retrieve: '조회',
      editorLabel: '정의 (JSON 또는 YAML)',
      create: '생성',
      update: '수정',
      editorPlaceholder: 'device preference 정의를 JSON 또는 YAML 로 입력하세요.',
      resultLabel: '결과',
      i18nTitle: '번역 (i18n)',
      localeCount: '{count}개',
      localeSelectPlaceholder: '로케일 선택',
      tagPlaceholder: '태그 (예: ko)',
      save: '저장',
      localeBodyPlaceholder: '번역 정의 (JSON 또는 YAML). 예: { "tag": "ko", "label": "라벨" }',
      // toasts / confirms / messages
      needPrefId: 'Device Preference ID 를 입력하세요.',
      parseError: '파싱 오류',
      created: 'Device Preference 를 생성했습니다.',
      confirmUpdate: 'Device Preference "{id}" 를 수정할까요?',
      updated: 'Device Preference 를 수정했습니다.',
      needLocaleTag: '로케일 태그(예: ko, en)를 입력하세요.',
      localeAdded: '번역 "{tag}" 을 추가했습니다.',
      localeUpdated: '번역 "{tag}" 을 갱신했습니다.',
    },
    en: {
      title: 'Device Preferences',
      desc: 'Retrieve, create, and update device preferences, and manage translations.',
      noTokenPre: 'No PAT token. Enter a token via ',
      noTokenPost: ' at the top right.',
      patSetting: 'PAT Settings',
      selectLabel: 'Select a Device Preference',
      loading: 'Loading…',
      refresh: '↻ Refresh',
      selectPlaceholder: 'device preference ({count})',
      namespacePlaceholder: 'namespace filter (optional)',
      idPlaceholder: 'preference id',
      retrieve: 'Retrieve',
      editorLabel: 'Definition (JSON or YAML)',
      create: 'Create',
      update: 'Update',
      editorPlaceholder: 'Enter the device preference definition as JSON or YAML.',
      resultLabel: 'Result',
      i18nTitle: 'Translations (i18n)',
      localeCount: '{count}',
      localeSelectPlaceholder: 'Select a locale',
      tagPlaceholder: 'tag (e.g. ko)',
      save: 'Save',
      localeBodyPlaceholder: 'Translation definition (JSON or YAML). e.g. { "tag": "ko", "label": "Label" }',
      // toasts / confirms / messages
      needPrefId: 'Enter a Device Preference ID.',
      parseError: 'Parse error',
      created: 'Created the Device Preference.',
      confirmUpdate: 'Update Device Preference "{id}"?',
      updated: 'Updated the Device Preference.',
      needLocaleTag: 'Enter a locale tag (e.g. ko, en).',
      localeAdded: 'Added translation "{tag}".',
      localeUpdated: 'Updated translation "{tag}".',
    },
  },
})

const { hasToken } = storeToRefs(useTokenStore())

const prefs = ref<DevicePreferenceSummary[]>([])
const selectedPref = ref('')
const namespaceFilter = ref('')
const listLoading = ref(false)

const preferenceId = ref('')
const editor = ref('')
const result = ref<unknown>(null)
const busy = ref(false)

// i18n / translations
const i18nOpen = ref(false)
const locales = ref<string[]>([])
const selectedLocale = ref('')
const localeTag = ref('')
const localeBody = ref('')

function prefLabel(p: DevicePreferenceSummary): string {
  const title = p.title || p.name
  return title ? `${p.preferenceId} — ${title}` : p.preferenceId
}

async function loadList() {
  if (!hasToken.value) return
  listLoading.value = true
  try {
    const data = await listDevicePreferences(namespaceFilter.value.trim() || undefined)
    prefs.value = [...data].sort((a, b) => a.preferenceId.localeCompare(b.preferenceId))
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    listLoading.value = false
  }
}

async function doGet(id?: string) {
  const pid = (id ?? preferenceId.value).trim()
  if (!pid) {
    toastError(t('needPrefId'))
    return
  }
  preferenceId.value = pid
  busy.value = true
  result.value = null
  try {
    const data = await getDevicePreference(pid)
    editor.value = JSON.stringify(data, null, 2)
    await loadLocales()
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

function onSelectPref() {
  if (selectedPref.value) doGet(selectedPref.value)
}

async function doCreate() {
  const parsed = parseJsonOrYaml(editor.value)
  if (!parsed.ok) return toastError(parsed.error ?? t('parseError'))
  busy.value = true
  try {
    const created = await createDevicePreference(parsed.json)
    result.value = created
    const newId = (created as { preferenceId?: string }).preferenceId
    if (newId) preferenceId.value = newId
    toastSuccess(t('created'))
    await loadList()
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

async function doUpdate() {
  const pid = preferenceId.value.trim()
  if (!pid) return toastError(t('needPrefId'))
  const parsed = parseJsonOrYaml(editor.value)
  if (!parsed.ok) return toastError(parsed.error ?? t('parseError'))
  if (!window.confirm(t('confirmUpdate', { id: pid }))) return
  busy.value = true
  try {
    result.value = await updateDevicePreference(pid, parsed.json)
    toastSuccess(t('updated'))
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

// --- translations ---
async function loadLocales() {
  const pid = preferenceId.value.trim()
  if (!pid) return
  try {
    const data = await listDevicePreferenceTranslations(pid)
    locales.value = data.map((l) => l.tag)
  } catch {
    locales.value = []
  }
}

async function doGetLocale() {
  const pid = preferenceId.value.trim()
  if (!pid || !selectedLocale.value) return
  busy.value = true
  try {
    const data = await getDevicePreferenceTranslations(pid, selectedLocale.value)
    localeBody.value = JSON.stringify(data, null, 2)
    localeTag.value = selectedLocale.value
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

async function doUpsertLocale() {
  const pid = preferenceId.value.trim()
  const tag = localeTag.value.trim()
  if (!pid) return toastError(t('needPrefId'))
  if (!tag) return toastError(t('needLocaleTag'))
  const parsed = parseJsonOrYaml(localeBody.value)
  if (!parsed.ok) return toastError(parsed.error ?? t('parseError'))
  busy.value = true
  try {
    await createDevicePreferenceTranslations(pid, parsed.json)
    toastSuccess(t('localeAdded', { tag }))
    await loadLocales()
  } catch (e) {
    // 이미 존재하면 PUT 으로 갱신
    if (e instanceof ApiError && /already exists|conflict/i.test(e.message)) {
      try {
        await updateDevicePreferenceTranslations(pid, tag, parsed.json)
        toastSuccess(t('localeUpdated', { tag }))
        await loadLocales()
      } catch (e2) {
        toastError(e2 instanceof Error ? e2.message : String(e2))
      }
    } else {
      toastError(e instanceof Error ? e.message : String(e))
    }
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
      'devicepreferences [id]',
      'devicepreferences:create',
      'devicepreferences:update [id]',
      'devicepreferences:translations [id] [tag]',
      'devicepreferences:translations:create [id]',
      'devicepreferences:translations:update [id] [tag]',
    ]"
    :docs="[
      { label: 'DevicePreferences', url: 'https://developer.smartthings.com/docs/api/public/#tag/DevicePreferences' },
    ]"
  />

  <div
    v-if="!hasToken"
    class="rounded-xl border-l-[3px] border-warn bg-warn/10 px-4 py-3 text-sm text-warn"
  >
    <span>{{ t('noTokenPre') }}</span
    ><strong>{{ t('patSetting') }}</strong><span>{{ t('noTokenPost') }}</span>
  </div>

  <template v-else>
    <!-- 선택 -->
    <section class="rounded-xl border border-line bg-card p-4">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-semibold tracking-wider text-muted uppercase">
          {{ t('selectLabel') }}
        </span>
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
          v-model="selectedPref"
          class="rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
          @change="onSelectPref"
        >
          <option value="">{{ t('selectPlaceholder', { count: prefs.length }) }}</option>
          <option v-for="p in prefs" :key="p.preferenceId" :value="p.preferenceId">
            {{ prefLabel(p) }}
          </option>
        </select>
        <input
          v-model="namespaceFilter"
          spellcheck="false"
          :placeholder="t('namespacePlaceholder')"
          class="rounded-lg border border-line bg-bg-2 px-3 py-2 font-mono text-sm text-text outline-none focus:border-brand-2"
          @keyup.enter="loadList"
        />
      </div>
      <div class="mt-3 flex gap-2">
        <input
          v-model="preferenceId"
          spellcheck="false"
          :placeholder="t('idPlaceholder')"
          class="w-full rounded-lg border border-line bg-bg-2 px-3 py-2 font-mono text-sm text-text outline-none focus:border-brand-2"
          @keyup.enter="doGet()"
        />
        <button
          class="shrink-0 rounded-lg border border-line px-4 py-2 text-sm font-semibold transition hover:-translate-y-px hover:border-brand-2"
          :disabled="busy"
          @click="doGet()"
        >
          {{ t('retrieve') }}
        </button>
      </div>
    </section>

    <!-- 에디터 -->
    <section class="mt-4 rounded-xl border border-line bg-card p-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <span class="text-[11px] font-semibold tracking-wider text-muted uppercase">
          {{ t('editorLabel') }}
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
        </div>
      </div>
      <textarea
        v-model="editor"
        spellcheck="false"
        rows="16"
        :placeholder="t('editorPlaceholder')"
        class="mt-3 w-full resize-y rounded-lg border border-line bg-bg-2 px-3 py-2 font-mono text-[13px] leading-relaxed text-text outline-none focus:border-brand-2"
      />
    </section>

    <!-- 결과 -->
    <div v-if="result" class="mt-4">
      <JsonView :value="result" :label="t('resultLabel')" :default-open="true" />
    </div>

    <!-- translations -->
    <section class="mt-4 overflow-hidden rounded-xl border border-line bg-card">
      <button
        class="flex w-full items-center gap-2 px-4 py-3 text-left"
        @click="i18nOpen = !i18nOpen"
      >
        <span class="text-brand-2 transition-transform" :class="i18nOpen ? 'rotate-90' : ''">▶</span>
        <span class="text-sm font-bold">{{ t('i18nTitle') }}</span>
        <span class="ml-auto text-xs text-muted">{{ t('localeCount', { count: locales.length }) }}</span>
      </button>

      <div v-if="i18nOpen" class="border-t border-line p-4">
        <div class="flex flex-wrap gap-2">
          <select
            v-model="selectedLocale"
            class="min-w-40 rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
            @change="doGetLocale"
          >
            <option value="">{{ t('localeSelectPlaceholder') }}</option>
            <option v-for="l in locales" :key="l" :value="l">{{ l }}</option>
          </select>
          <input
            v-model="localeTag"
            spellcheck="false"
            :placeholder="t('tagPlaceholder')"
            class="w-28 rounded-lg border border-line bg-bg-2 px-3 py-2 font-mono text-sm text-text outline-none focus:border-brand-2"
          />
          <button
            class="rounded-lg border border-line px-4 py-2 text-sm font-semibold transition hover:-translate-y-px hover:border-brand-2 disabled:opacity-50"
            :disabled="busy"
            @click="doUpsertLocale"
          >
            {{ t('save') }}
          </button>
        </div>
        <textarea
          v-model="localeBody"
          spellcheck="false"
          rows="8"
          :placeholder="t('localeBodyPlaceholder')"
          class="mt-3 w-full resize-y rounded-lg border border-line bg-bg-2 px-3 py-2 font-mono text-[13px] leading-relaxed text-text outline-none focus:border-brand-2"
        />
      </div>
    </section>
  </template>
</template>
