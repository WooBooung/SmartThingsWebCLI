<script setup lang="ts">
import { ref, onMounted } from 'vue'
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
    toastError('Device Preference ID 를 입력하세요.')
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
  if (!parsed.ok) return toastError(parsed.error ?? '파싱 오류')
  busy.value = true
  try {
    const created = await createDevicePreference(parsed.json)
    result.value = created
    const newId = (created as { preferenceId?: string }).preferenceId
    if (newId) preferenceId.value = newId
    toastSuccess('Device Preference 를 생성했습니다.')
    await loadList()
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

async function doUpdate() {
  const pid = preferenceId.value.trim()
  if (!pid) return toastError('Device Preference ID 를 입력하세요.')
  const parsed = parseJsonOrYaml(editor.value)
  if (!parsed.ok) return toastError(parsed.error ?? '파싱 오류')
  if (!window.confirm(`Device Preference "${pid}" 를 수정할까요?`)) return
  busy.value = true
  try {
    result.value = await updateDevicePreference(pid, parsed.json)
    toastSuccess('Device Preference 를 수정했습니다.')
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
  if (!pid) return toastError('Device Preference ID 를 입력하세요.')
  if (!tag) return toastError('로케일 태그(예: ko, en)를 입력하세요.')
  const parsed = parseJsonOrYaml(localeBody.value)
  if (!parsed.ok) return toastError(parsed.error ?? '파싱 오류')
  busy.value = true
  try {
    await createDevicePreferenceTranslations(pid, parsed.json)
    toastSuccess(`번역 "${tag}" 을 추가했습니다.`)
    await loadLocales()
  } catch (e) {
    // 이미 존재하면 PUT 으로 갱신
    if (e instanceof ApiError && /already exists|conflict/i.test(e.message)) {
      try {
        await updateDevicePreferenceTranslations(pid, tag, parsed.json)
        toastSuccess(`번역 "${tag}" 을 갱신했습니다.`)
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
    <h1 class="text-2xl font-extrabold tracking-tight md:text-3xl">Device Preferences</h1>
    <p class="mt-1 text-sm text-muted">디바이스 환경설정(preference)을 조회·생성·수정하고 번역을 관리합니다.</p>
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
    PAT 토큰이 없습니다. 우측 상단의 <strong>PAT 설정</strong> 으로 토큰을 입력하세요.
  </div>

  <template v-else>
    <!-- 선택 -->
    <section class="rounded-xl border border-line bg-card p-4">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-semibold tracking-wider text-muted uppercase">
          Device Preference 선택
        </span>
        <button
          class="rounded-md border border-line px-2 py-1 text-xs text-muted transition hover:border-brand-2 hover:text-brand-2"
          :disabled="listLoading"
          @click="loadList"
        >
          {{ listLoading ? '불러오는 중…' : '↻ 새로고침' }}
        </button>
      </div>
      <div class="mt-3 grid gap-3 sm:grid-cols-2">
        <select
          v-model="selectedPref"
          class="rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
          @change="onSelectPref"
        >
          <option value="">device preference ({{ prefs.length }})</option>
          <option v-for="p in prefs" :key="p.preferenceId" :value="p.preferenceId">
            {{ prefLabel(p) }}
          </option>
        </select>
        <input
          v-model="namespaceFilter"
          spellcheck="false"
          placeholder="namespace 필터 (선택)"
          class="rounded-lg border border-line bg-bg-2 px-3 py-2 font-mono text-sm text-text outline-none focus:border-brand-2"
          @keyup.enter="loadList"
        />
      </div>
      <div class="mt-3 flex gap-2">
        <input
          v-model="preferenceId"
          spellcheck="false"
          placeholder="preference id"
          class="w-full rounded-lg border border-line bg-bg-2 px-3 py-2 font-mono text-sm text-text outline-none focus:border-brand-2"
          @keyup.enter="doGet()"
        />
        <button
          class="shrink-0 rounded-lg border border-line px-4 py-2 text-sm font-semibold transition hover:-translate-y-px hover:border-brand-2"
          :disabled="busy"
          @click="doGet()"
        >
          조회
        </button>
      </div>
    </section>

    <!-- 에디터 -->
    <section class="mt-4 rounded-xl border border-line bg-card p-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <span class="text-[11px] font-semibold tracking-wider text-muted uppercase">
          정의 (JSON 또는 YAML)
        </span>
        <div class="flex gap-2">
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
        </div>
      </div>
      <textarea
        v-model="editor"
        spellcheck="false"
        rows="16"
        placeholder="device preference 정의를 JSON 또는 YAML 로 입력하세요."
        class="mt-3 w-full resize-y rounded-lg border border-line bg-bg-2 px-3 py-2 font-mono text-[13px] leading-relaxed text-text outline-none focus:border-brand-2"
      />
    </section>

    <!-- 결과 -->
    <div v-if="result" class="mt-4">
      <JsonView :value="result" label="결과" :default-open="true" />
    </div>

    <!-- translations -->
    <section class="mt-4 overflow-hidden rounded-xl border border-line bg-card">
      <button
        class="flex w-full items-center gap-2 px-4 py-3 text-left"
        @click="i18nOpen = !i18nOpen"
      >
        <span class="text-brand-2 transition-transform" :class="i18nOpen ? 'rotate-90' : ''">▶</span>
        <span class="text-sm font-bold">번역 (i18n)</span>
        <span class="ml-auto text-xs text-muted">{{ locales.length }}개</span>
      </button>

      <div v-if="i18nOpen" class="border-t border-line p-4">
        <div class="flex flex-wrap gap-2">
          <select
            v-model="selectedLocale"
            class="min-w-40 rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
            @change="doGetLocale"
          >
            <option value="">로케일 선택</option>
            <option v-for="l in locales" :key="l" :value="l">{{ l }}</option>
          </select>
          <input
            v-model="localeTag"
            spellcheck="false"
            placeholder="태그 (예: ko)"
            class="w-28 rounded-lg border border-line bg-bg-2 px-3 py-2 font-mono text-sm text-text outline-none focus:border-brand-2"
          />
          <button
            class="rounded-lg border border-line px-4 py-2 text-sm font-semibold transition hover:-translate-y-px hover:border-brand-2 disabled:opacity-50"
            :disabled="busy"
            @click="doUpsertLocale"
          >
            저장
          </button>
        </div>
        <textarea
          v-model="localeBody"
          spellcheck="false"
          rows="8"
          placeholder="번역 정의 (JSON 또는 YAML). 예: { &quot;tag&quot;: &quot;ko&quot;, &quot;label&quot;: &quot;라벨&quot; }"
          class="mt-3 w-full resize-y rounded-lg border border-line bg-bg-2 px-3 py-2 font-mono text-[13px] leading-relaxed text-text outline-none focus:border-brand-2"
        />
      </div>
    </section>
  </template>
</template>
