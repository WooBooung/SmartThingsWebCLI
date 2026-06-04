<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useTokenStore } from '@/stores/token'
import { getDeviceConfig, createDeviceConfig, generateDeviceConfig } from '@/lib/api/configuration'
import { parseJsonOrYaml } from '@/lib/yaml'
import { toastError, toastSuccess } from '@/lib/toast'
import JsonView from '@/components/JsonView.vue'
import CliRef from '@/components/CliRef.vue'

const { t } = useI18n({
  useScope: 'local',
  inheritLocale: true,
  messages: {
    ko: {
      title: 'Device Configuration',
      desc: 'presentationId 로 device configuration 을 조회하거나, JSON/YAML 로 새로 생성합니다.',
      noTokenPre: 'PAT 토큰이 없습니다. 우측 상단의 ',
      noTokenPost: ' 으로 토큰을 입력하세요.',
      patSetting: 'PAT 설정',
      sectionGet: '조회',
      manufacturerOptional: 'Manufacturer Name (선택)',
      loading: '불러오는 중…',
      retrieve: '조회',
      sectionGenerate: 'Profile 로부터 생성 (generate)',
      generateHintPre: 'Device Profile ID 로 기본 device configuration 을 자동 생성해 아래 에디터에 채웁니다. (',
      generateHintPost: ')',
      generating: '생성 중…',
      bodyLabel: 'Configuration Body (JSON 또는 YAML)',
      create: '생성',
      bodyPlaceholder: 'device configuration 을 JSON 또는 YAML 로 입력하세요.',
      resultLabel: '결과',
      // toasts / messages
      needPresentationId: 'Presentation ID 를 입력하세요.',
      loaded: 'Configuration 을 불러왔습니다.',
      needProfileId: 'Device Profile ID 를 입력하세요.',
      generated: 'Profile 로부터 device configuration 을 생성(미리보기)했습니다.',
      parseError: '파싱 오류',
      created: 'Configuration 을 생성했습니다.',
    },
    en: {
      title: 'Device Configuration',
      desc: 'Retrieve a device configuration by presentationId, or create a new one from JSON/YAML.',
      noTokenPre: 'No PAT token. Enter a token via ',
      noTokenPost: ' at the top right.',
      patSetting: 'PAT Settings',
      sectionGet: 'Retrieve',
      manufacturerOptional: 'Manufacturer Name (optional)',
      loading: 'Loading…',
      retrieve: 'Retrieve',
      sectionGenerate: 'Generate from a Profile (generate)',
      generateHintPre:
        'Generates a default device configuration from the Device Profile ID and fills the editor below. (',
      generateHintPost: ')',
      generating: 'Generating…',
      bodyLabel: 'Configuration Body (JSON or YAML)',
      create: 'Create',
      bodyPlaceholder: 'Enter the device configuration as JSON or YAML.',
      resultLabel: 'Result',
      // toasts / messages
      needPresentationId: 'Enter a Presentation ID.',
      loaded: 'Loaded the configuration.',
      needProfileId: 'Enter a Device Profile ID.',
      generated: 'Generated (preview) a device configuration from the Profile.',
      parseError: 'Parse error',
      created: 'Created the configuration.',
    },
  },
})

const { hasToken } = storeToRefs(useTokenStore())

const presentationId = ref('')
const manufacturerName = ref('')
const profileId = ref('')
const editor = ref('')
const result = ref<unknown>(null)
const busy = ref(false)

async function doGet() {
  const pid = presentationId.value.trim()
  if (!pid) {
    toastError(t('needPresentationId'))
    return
  }
  busy.value = true
  result.value = null
  try {
    const data = await getDeviceConfig({
      presentationId: pid,
      manufacturerName: manufacturerName.value.trim() || undefined,
    })
    editor.value = JSON.stringify(data, null, 2)
    result.value = { message: t('loaded') }
    toastSuccess(t('loaded'))
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

async function doGenerate() {
  const pid = profileId.value.trim()
  if (!pid) {
    toastError(t('needProfileId'))
    return
  }
  busy.value = true
  result.value = null
  try {
    const data = await generateDeviceConfig(pid)
    editor.value = JSON.stringify(data, null, 2)
    result.value = data
    const vid = (data as { presentationId?: unknown }).presentationId
    if (typeof vid === 'string') presentationId.value = vid
    const mnmn = (data as { manufacturerName?: unknown }).manufacturerName
    if (typeof mnmn === 'string') manufacturerName.value = mnmn
    toastSuccess(t('generated'))
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

async function doCreate() {
  const parsed = parseJsonOrYaml(editor.value)
  if (!parsed.ok) {
    toastError(parsed.error ?? t('parseError'))
    return
  }
  busy.value = true
  result.value = null
  try {
    const data = await createDeviceConfig(parsed.json)
    result.value = data
    // 응답에 presentationId 가 있으면 입력란에 반영
    const pid = (data as { presentationId?: unknown }).presentationId
    if (typeof pid === 'string') presentationId.value = pid
    const mnmn = (data as { manufacturerName?: unknown }).manufacturerName
    if (typeof mnmn === 'string') manufacturerName.value = mnmn
    toastSuccess(t('created'))
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}
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
      'presentation:device-config <presentationId>',
      'presentation:device-config:create',
      'presentation:device-config:generate <profileId>',
    ]"
    :docs="[
      { label: 'Presentation', url: 'https://developer.smartthings.com/docs/api/public/#tag/Presentation' },
      { label: 'Device Profiles', url: 'https://developer.smartthings.com/docs/api/public/#tag/Device-Profiles' },
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
    <!-- 조회 -->
    <section class="rounded-xl border border-line bg-card p-4">
      <div class="flex items-center gap-2">
        <span class="h-3.5 w-1 rounded-full bg-gradient-to-b from-brand to-brand-2" />
        <span class="text-[11px] font-semibold tracking-wider text-muted uppercase">{{ t('sectionGet') }}</span>
      </div>
      <div class="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label class="text-[11px] font-semibold tracking-wider text-muted uppercase">
            Presentation ID
          </label>
          <input
            v-model="presentationId"
            spellcheck="false"
            placeholder="presentationId (vid)"
            class="mt-1.5 w-full rounded-lg border border-line bg-bg-2 px-3 py-2 font-mono text-sm text-text outline-none focus:border-brand-2"
            @keyup.enter="doGet"
          />
        </div>
        <div>
          <label class="text-[11px] font-semibold tracking-wider text-muted uppercase">
            {{ t('manufacturerOptional') }}
          </label>
          <input
            v-model="manufacturerName"
            spellcheck="false"
            placeholder="manufacturerName"
            class="mt-1.5 w-full rounded-lg border border-line bg-bg-2 px-3 py-2 font-mono text-sm text-text outline-none focus:border-brand-2"
            @keyup.enter="doGet"
          />
        </div>
      </div>
      <div class="mt-3">
        <button
          class="rounded-lg border border-line px-4 py-2 text-sm font-semibold transition hover:-translate-y-px hover:border-brand-2 disabled:opacity-50"
          :disabled="busy"
          @click="doGet"
        >
          {{ busy ? t('loading') : t('retrieve') }}
        </button>
      </div>
    </section>

    <!-- 생성(generate) -->
    <section class="mt-4 rounded-xl border border-line bg-card p-4">
      <div class="flex items-center gap-2">
        <span class="h-3.5 w-1 rounded-full bg-gradient-to-b from-brand to-brand-2" />
        <span class="text-[11px] font-semibold tracking-wider text-muted uppercase">
          {{ t('sectionGenerate') }}
        </span>
      </div>
      <p class="mt-2 text-xs text-muted">
        {{ t('generateHintPre')
        }}<code class="font-mono">presentation:device-config:generate &lt;profileId&gt;</code
        >{{ t('generateHintPost') }}
      </p>
      <div class="mt-3 flex gap-2">
        <input
          v-model="profileId"
          spellcheck="false"
          placeholder="deviceProfileId"
          class="w-full rounded-lg border border-line bg-bg-2 px-3 py-2 font-mono text-sm text-text outline-none focus:border-brand-2"
          @keyup.enter="doGenerate"
        />
        <button
          class="shrink-0 rounded-lg border border-line px-4 py-2 text-sm font-semibold transition hover:-translate-y-px hover:border-brand-2 disabled:opacity-50"
          :disabled="busy"
          @click="doGenerate"
        >
          {{ busy ? t('generating') : 'generate' }}
        </button>
      </div>
    </section>

    <!-- 에디터 -->
    <section class="mt-4 rounded-xl border border-line bg-card p-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <span class="text-[11px] font-semibold tracking-wider text-muted uppercase">
          {{ t('bodyLabel') }}
        </span>
        <button
          class="rounded-lg border border-transparent bg-gradient-to-br from-brand to-brand-2 px-4 py-1.5 text-sm font-semibold text-[#061026] transition hover:-translate-y-px disabled:opacity-50"
          :disabled="busy"
          @click="doCreate"
        >
          {{ t('create') }}
        </button>
      </div>
      <textarea
        v-model="editor"
        spellcheck="false"
        rows="18"
        :placeholder="t('bodyPlaceholder')"
        class="mt-3 w-full resize-y rounded-lg border border-line bg-bg-2 px-3 py-2 font-mono text-[13px] leading-relaxed text-text outline-none focus:border-brand-2"
      />
    </section>

    <!-- 결과 -->
    <div v-if="result" class="mt-4">
      <JsonView :value="result" :label="t('resultLabel')" :default-open="true" />
    </div>
  </template>
</template>
