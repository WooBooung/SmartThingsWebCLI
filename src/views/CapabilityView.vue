<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useTokenStore } from '@/stores/token'
import {
  listCapabilityNamespaces,
  listCapabilitiesInNamespace,
  listStandardCapabilities,
  getCapability,
  createCapability,
  updateCapability,
  deleteCapability,
  listCapabilityLocales,
  getCapabilityLocale,
  createCapabilityLocale,
  updateCapabilityLocale,
} from '@/lib/stClient'
import { parseJsonOrYaml } from '@/lib/yaml'
import { toastError, toastSuccess } from '@/lib/toast'
import { ApiError } from '@/lib/stClient'
import JsonView from '@/components/JsonView.vue'
import CliRef from '@/components/CliRef.vue'

const { hasToken } = storeToRefs(useTokenStore())

const customCaps = ref<string[]>([])
const standardCaps = ref<string[]>([])
const selectedCustom = ref('')
const selectedStandard = ref('')
const listLoading = ref(false)

const capabilityId = ref('')
const editor = ref('')
const result = ref<unknown>(null)
const busy = ref(false)

// i18n
const i18nOpen = ref(false)
const locales = ref<string[]>([])
const selectedLocale = ref('')
const localeTag = ref('')
const localeBody = ref('')

async function loadLists() {
  if (!hasToken.value) return
  listLoading.value = true
  try {
    const [namespaces, standard] = await Promise.all([
      listCapabilityNamespaces(),
      listStandardCapabilities(),
    ])
    const orgNs = namespaces.filter((n) => n.ownerType === 'organization').map((n) => n.name)
    const perNs = await Promise.all(orgNs.map((ns) => listCapabilitiesInNamespace(ns)))
    customCaps.value = perNs
      .flatMap((r) => r.items?.map((c) => c.id) ?? [])
      .sort((a, b) => a.localeCompare(b))
    standardCaps.value = (standard.items?.map((c) => c.id) ?? []).sort((a, b) => a.localeCompare(b))
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    listLoading.value = false
  }
}

async function doGet(id?: string) {
  const cid = (id ?? capabilityId.value).trim()
  if (!cid) {
    toastError('Capability ID 를 입력하세요.')
    return
  }
  capabilityId.value = cid
  busy.value = true
  result.value = null
  try {
    const data = await getCapability(cid)
    editor.value = JSON.stringify(data, null, 2)
    await loadLocales()
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

function onSelectCustom() {
  if (selectedCustom.value) {
    selectedStandard.value = ''
    doGet(selectedCustom.value)
  }
}
function onSelectStandard() {
  if (selectedStandard.value) {
    selectedCustom.value = ''
    doGet(selectedStandard.value)
  }
}

async function doCreate() {
  const parsed = parseJsonOrYaml(editor.value)
  if (!parsed.ok) return toastError(parsed.error ?? '파싱 오류')
  busy.value = true
  try {
    result.value = await createCapability(parsed.json)
    toastSuccess('Capability 를 생성했습니다.')
    await loadLists()
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

async function doUpdate() {
  if (!capabilityId.value.trim()) return toastError('Capability ID 를 입력하세요.')
  const parsed = parseJsonOrYaml(editor.value)
  if (!parsed.ok) return toastError(parsed.error ?? '파싱 오류')
  busy.value = true
  try {
    result.value = await updateCapability(capabilityId.value.trim(), parsed.json)
    toastSuccess('Capability 를 수정했습니다.')
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

async function doDelete() {
  const cid = capabilityId.value.trim()
  if (!cid) return toastError('Capability ID 를 입력하세요.')
  if (!window.confirm(`Capability "${cid}" 를 삭제할까요? 되돌릴 수 없습니다.`)) return
  busy.value = true
  try {
    await deleteCapability(cid)
    result.value = { message: `Capability "${cid}" 삭제 성공` }
    toastSuccess('Capability 를 삭제했습니다.')
    await loadLists()
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

// --- i18n ---
async function loadLocales() {
  const cid = capabilityId.value.trim()
  if (!cid) return
  try {
    const data = await listCapabilityLocales(cid)
    locales.value = data.items?.map((l) => l.tag) ?? []
  } catch {
    locales.value = []
  }
}

async function doGetLocale() {
  const cid = capabilityId.value.trim()
  if (!cid || !selectedLocale.value) return
  busy.value = true
  try {
    const data = await getCapabilityLocale(cid, selectedLocale.value)
    localeBody.value = JSON.stringify(data, null, 2)
    localeTag.value = selectedLocale.value
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

async function doUpsertLocale() {
  const cid = capabilityId.value.trim()
  const tag = localeTag.value.trim()
  if (!cid) return toastError('Capability ID 를 입력하세요.')
  if (!tag) return toastError('로케일 태그(예: ko, en)를 입력하세요.')
  const parsed = parseJsonOrYaml(localeBody.value)
  if (!parsed.ok) return toastError(parsed.error ?? '파싱 오류')
  busy.value = true
  try {
    await createCapabilityLocale(cid, parsed.json)
    toastSuccess(`로케일 "${tag}" 을 추가했습니다.`)
    await loadLocales()
  } catch (e) {
    // 이미 존재하면 PUT 으로 갱신
    if (e instanceof ApiError && /already exists/i.test(e.message)) {
      try {
        await updateCapabilityLocale(cid, tag, parsed.json)
        toastSuccess(`로케일 "${tag}" 을 갱신했습니다.`)
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

onMounted(loadLists)
</script>

<template>
  <header class="mb-6">
    <h1 class="text-2xl font-extrabold tracking-tight md:text-3xl">Capability</h1>
    <p class="mt-1 text-sm text-muted">커스텀 capability 를 조회·생성·수정·삭제합니다 (version 1).</p>
  </header>
  <CliRef :commands="['capabilities [id]', 'capabilities:create', 'capabilities:update [id]', 'capabilities:delete [id]', 'capabilities:namespaces', 'capabilities:translations [id] [tag]']" />

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
          Capability 선택
        </span>
        <button
          class="rounded-md border border-line px-2 py-1 text-xs text-muted transition hover:border-brand-2 hover:text-brand-2"
          :disabled="listLoading"
          @click="loadLists"
        >
          {{ listLoading ? '불러오는 중…' : '↻ 새로고침' }}
        </button>
      </div>
      <div class="mt-3 grid gap-3 sm:grid-cols-2">
        <select
          v-model="selectedCustom"
          class="rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
          @change="onSelectCustom"
        >
          <option value="">커스텀 capability ({{ customCaps.length }})</option>
          <option v-for="c in customCaps" :key="c" :value="c">{{ c }}</option>
        </select>
        <select
          v-model="selectedStandard"
          class="rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
          @change="onSelectStandard"
        >
          <option value="">표준 capability ({{ standardCaps.length }})</option>
          <option v-for="c in standardCaps" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>
      <div class="mt-3 flex gap-2">
        <input
          v-model="capabilityId"
          spellcheck="false"
          placeholder="capability id (예: namespace.myCapability)"
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
        placeholder="capability 정의를 JSON 또는 YAML 로 입력하세요."
        class="mt-3 w-full resize-y rounded-lg border border-line bg-bg-2 px-3 py-2 font-mono text-[13px] leading-relaxed text-text outline-none focus:border-brand-2"
      />
    </section>

    <!-- 결과 -->
    <div v-if="result" class="mt-4">
      <JsonView :value="result" label="결과" :default-open="true" />
    </div>

    <!-- i18n -->
    <section class="mt-4 overflow-hidden rounded-xl border border-line bg-card">
      <button
        class="flex w-full items-center gap-2 px-4 py-3 text-left"
        @click="i18nOpen = !i18nOpen"
      >
        <span class="text-brand-2 transition-transform" :class="i18nOpen ? 'rotate-90' : ''">▶</span>
        <span class="text-sm font-bold">i18n 로케일</span>
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
          placeholder="로케일 정의 (JSON 또는 YAML)"
          class="mt-3 w-full resize-y rounded-lg border border-line bg-bg-2 px-3 py-2 font-mono text-[13px] leading-relaxed text-text outline-none focus:border-brand-2"
        />
      </div>
    </section>
  </template>
</template>
