<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useTokenStore } from '@/stores/token'
import {
  listCapabilityNamespaces,
  listCapabilitiesInNamespace,
  listStandardCapabilities,
} from '@/lib/stClient'
import {
  getCapabilityPresentation,
  createCapabilityPresentation,
  updateCapabilityPresentation,
} from '@/lib/api/capabilityPresentation'
import { parseJsonOrYaml } from '@/lib/yaml'
import { toastError, toastSuccess } from '@/lib/toast'
import JsonView from '@/components/JsonView.vue'
import CliRef from '@/components/CliRef.vue'

const { hasToken } = storeToRefs(useTokenStore())

const { t } = useI18n({
  useScope: 'local',
  inheritLocale: true,
  messages: {
    ko: {
      title: 'Capability Presentation',
      descPre: '커스텀 capability 의 presentation 을 조회·생성·수정합니다.',
      docs: '문서',
      noTokenPre: 'PAT 토큰이 없습니다. 우측 상단의 ',
      noTokenStrong: 'PAT 설정',
      noTokenPost: ' 으로 토큰을 입력하세요.',
      selectLabel: 'Capability 선택',
      loading: '불러오는 중…',
      refresh: '↻ 새로고침',
      customOption: '커스텀 capability ({count})',
      standardOption: '표준 capability ({count})',
      idPlaceholder: 'capability id (예: namespace.myCapability)',
      versionPlaceholder: 'version',
      get: '조회',
      bodyLabel: 'Presentation Body (JSON 또는 YAML)',
      create: '생성',
      update: '수정',
      bodyHintPre: 'body 의 ',
      bodyHintMid: ' 은 위 Capability ID / Version 과 일치해야 합니다.',
      editorPlaceholder: 'presentation 정의를 JSON 또는 YAML 로 입력하세요.',
      resultLabel: '결과',
      errIdVerRequired: 'Capability ID 와 Version 을 입력하세요.',
      errParse: '파싱 오류',
      errMismatch: 'Capability ID 및 Version 이 일치하지 않습니다. 확인 후 다시 시도하세요.',
      msgGetOk: 'Presentation 조회 성공',
      msgCreated: 'Presentation 을 생성했습니다.',
      msgUpdated: 'Presentation 을 수정했습니다.',
      confirmUpdate: 'Presentation "{id}" (v{version}) 을 수정할까요?',
    },
    en: {
      title: 'Capability Presentation',
      descPre: 'Get, create, and update the presentation of a custom capability.',
      docs: 'Docs',
      noTokenPre: 'No PAT token. Enter your token via ',
      noTokenStrong: 'PAT Settings',
      noTokenPost: ' at the top right.',
      selectLabel: 'Select Capability',
      loading: 'Loading…',
      refresh: '↻ Refresh',
      customOption: 'Custom capability ({count})',
      standardOption: 'Standard capability ({count})',
      idPlaceholder: 'capability id (e.g. namespace.myCapability)',
      versionPlaceholder: 'version',
      get: 'Get',
      bodyLabel: 'Presentation Body (JSON or YAML)',
      create: 'Create',
      update: 'Update',
      bodyHintPre: "The body's ",
      bodyHintMid: ' must match the Capability ID / Version above.',
      editorPlaceholder: 'Enter the presentation definition as JSON or YAML.',
      resultLabel: 'Result',
      errIdVerRequired: 'Enter a Capability ID and Version.',
      errParse: 'Parse error',
      errMismatch: 'Capability ID and Version do not match. Check and try again.',
      msgGetOk: 'Presentation retrieved successfully',
      msgCreated: 'Presentation created.',
      msgUpdated: 'Presentation updated.',
      confirmUpdate: 'Update presentation "{id}" (v{version})?',
    },
  },
})

const customCaps = ref<string[]>([])
const standardCaps = ref<string[]>([])
const selectedCustom = ref('')
const selectedStandard = ref('')
const listLoading = ref(false)

const capabilityId = ref('')
const capabilityVersion = ref('1')
const editor = ref('')
const result = ref<unknown>(null)
const busy = ref(false)

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
    standardCaps.value = (standard.items?.map((c) => c.id) ?? []).sort((a, b) =>
      a.localeCompare(b),
    )
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    listLoading.value = false
  }
}

async function doGet(id?: string) {
  const cid = (id ?? capabilityId.value).trim()
  const ver = capabilityVersion.value.trim()
  if (!cid || !ver) {
    toastError(t('errIdVerRequired'))
    return
  }
  capabilityId.value = cid
  busy.value = true
  result.value = null
  try {
    const data = await getCapabilityPresentation(cid, ver)
    editor.value = JSON.stringify(data, null, 2)
    toastSuccess(t('msgGetOk'))
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

function onSelectCustom() {
  if (selectedCustom.value) {
    selectedStandard.value = ''
    capabilityId.value = selectedCustom.value
    doGet(selectedCustom.value)
  }
}
function onSelectStandard() {
  if (selectedStandard.value) {
    selectedCustom.value = ''
    capabilityId.value = selectedStandard.value
    doGet(selectedStandard.value)
  }
}

/**
 * 원본 validatePresentationBody: 파싱 후 body.id === capabilityId,
 * body.version == capabilityVersion 일치 검사. 반환은 정규화된 JSON 문자열.
 */
function validateBody(): string | null {
  const cid = capabilityId.value.trim()
  const ver = capabilityVersion.value.trim()
  if (!cid || !ver) {
    toastError(t('errIdVerRequired'))
    return null
  }
  const parsed = parseJsonOrYaml(editor.value)
  if (!parsed.ok) {
    toastError(parsed.error ?? t('errParse'))
    return null
  }
  const obj = parsed.value as { id?: unknown; version?: unknown }
  if (obj.id !== cid || String(obj.version) !== ver) {
    toastError(t('errMismatch'))
    return null
  }
  return parsed.json
}

async function doCreate() {
  const body = validateBody()
  if (body == null) return
  busy.value = true
  try {
    result.value = await createCapabilityPresentation(
      capabilityId.value.trim(),
      capabilityVersion.value.trim(),
      body,
    )
    toastSuccess(t('msgCreated'))
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

async function doUpdate() {
  const body = validateBody()
  if (body == null) return
  if (
    !window.confirm(
      t('confirmUpdate', {
        id: capabilityId.value.trim(),
        version: capabilityVersion.value.trim(),
      }),
    )
  )
    return
  busy.value = true
  try {
    result.value = await updateCapabilityPresentation(
      capabilityId.value.trim(),
      capabilityVersion.value.trim(),
      body,
    )
    toastSuccess(t('msgUpdated'))
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

onMounted(loadLists)
</script>

<template>
  <header class="mb-6">
    <h1 class="text-2xl font-extrabold tracking-tight md:text-3xl">{{ t('title') }}</h1>
    <p class="mt-1 text-sm text-muted">
      {{ t('descPre') }}
      <a
        href="https://developer.smartthings.com/docs/devices/capabilities/capability-presentations"
        target="_blank"
        rel="noreferrer"
        class="text-brand-2 underline-offset-2 hover:underline"
      >
        {{ t('docs') }}
      </a>
    </p>
  </header>
  <CliRef
    :commands="[
      'capabilities:presentation [id]',
      'capabilities:presentation:create [id]',
      'capabilities:presentation:update [id]',
    ]"
    :docs="[
      { label: 'Capabilities', url: 'https://developer.smartthings.com/docs/api/public/#tag/Capabilities' },
      {
        label: 'Capability Presentations',
        url: 'https://developer.smartthings.com/docs/devices/capabilities/capability-presentations',
      },
    ]"
  />

  <div
    v-if="!hasToken"
    class="rounded-xl border-l-[3px] border-warn bg-warn/10 px-4 py-3 text-sm text-warn"
  >
    {{ t('noTokenPre') }}<strong>{{ t('noTokenStrong') }}</strong>{{ t('noTokenPost') }}
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
          @click="loadLists"
        >
          {{ listLoading ? t('loading') : t('refresh') }}
        </button>
      </div>
      <div class="mt-3 grid gap-3 sm:grid-cols-2">
        <select
          v-model="selectedCustom"
          class="rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
          @change="onSelectCustom"
        >
          <option value="">{{ t('customOption', { count: customCaps.length }) }}</option>
          <option v-for="c in customCaps" :key="c" :value="c">{{ c }}</option>
        </select>
        <select
          v-model="selectedStandard"
          class="rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
          @change="onSelectStandard"
        >
          <option value="">{{ t('standardOption', { count: standardCaps.length }) }}</option>
          <option v-for="c in standardCaps" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>
      <div class="mt-3 flex flex-wrap gap-2">
        <input
          v-model="capabilityId"
          spellcheck="false"
          :placeholder="t('idPlaceholder')"
          class="min-w-0 grow rounded-lg border border-line bg-bg-2 px-3 py-2 font-mono text-sm text-text outline-none focus:border-brand-2"
          @keyup.enter="doGet()"
        />
        <input
          v-model="capabilityVersion"
          spellcheck="false"
          :placeholder="t('versionPlaceholder')"
          class="w-24 shrink-0 rounded-lg border border-line bg-bg-2 px-3 py-2 font-mono text-sm text-text outline-none focus:border-brand-2"
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

    <!-- 에디터 -->
    <section class="mt-4 rounded-xl border border-line bg-card p-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <span class="text-[11px] font-semibold tracking-wider text-muted uppercase">
          {{ t('bodyLabel') }}
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
      <p class="mt-2 text-xs text-muted">
        {{ t('bodyHintPre')
        }}<code class="font-mono text-brand-2">id</code> /
        <code class="font-mono text-brand-2">version</code>{{ t('bodyHintMid') }}
      </p>
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
  </template>
</template>
