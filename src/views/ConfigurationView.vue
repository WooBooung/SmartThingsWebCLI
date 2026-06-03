<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useTokenStore } from '@/stores/token'
import { getDeviceConfig, createDeviceConfig } from '@/lib/api/configuration'
import { parseJsonOrYaml } from '@/lib/yaml'
import { toastError, toastSuccess } from '@/lib/toast'
import JsonView from '@/components/JsonView.vue'

const { hasToken } = storeToRefs(useTokenStore())

const presentationId = ref('')
const manufacturerName = ref('')
const editor = ref('')
const result = ref<unknown>(null)
const busy = ref(false)

async function doGet() {
  const pid = presentationId.value.trim()
  if (!pid) {
    toastError('Presentation ID 를 입력하세요.')
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
    result.value = { message: 'Configuration 을 불러왔습니다.' }
    toastSuccess('Configuration 을 불러왔습니다.')
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

async function doCreate() {
  const parsed = parseJsonOrYaml(editor.value)
  if (!parsed.ok) {
    toastError(parsed.error ?? '파싱 오류')
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
    toastSuccess('Configuration 을 생성했습니다.')
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <header class="mb-6">
    <h1 class="text-2xl font-extrabold tracking-tight md:text-3xl">Device Configuration</h1>
    <p class="mt-1 text-sm text-muted">
      presentationId 로 device configuration 을 조회하거나, JSON/YAML 로 새로 생성합니다.
    </p>
  </header>

  <div
    v-if="!hasToken"
    class="rounded-xl border-l-[3px] border-warn bg-warn/10 px-4 py-3 text-sm text-warn"
  >
    PAT 토큰이 없습니다. 우측 상단의 <strong>PAT 설정</strong> 으로 토큰을 입력하세요.
  </div>

  <template v-else>
    <!-- 조회 -->
    <section class="rounded-xl border border-line bg-card p-4">
      <div class="flex items-center gap-2">
        <span class="h-3.5 w-1 rounded-full bg-gradient-to-b from-brand to-brand-2" />
        <span class="text-[11px] font-semibold tracking-wider text-muted uppercase">조회</span>
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
            Manufacturer Name (선택)
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
          {{ busy ? '불러오는 중…' : '조회' }}
        </button>
      </div>
    </section>

    <!-- 에디터 -->
    <section class="mt-4 rounded-xl border border-line bg-card p-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <span class="text-[11px] font-semibold tracking-wider text-muted uppercase">
          Configuration Body (JSON 또는 YAML)
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
        rows="18"
        placeholder="device configuration 을 JSON 또는 YAML 로 입력하세요."
        class="mt-3 w-full resize-y rounded-lg border border-line bg-bg-2 px-3 py-2 font-mono text-[13px] leading-relaxed text-text outline-none focus:border-brand-2"
      />
    </section>

    <!-- 결과 -->
    <div v-if="result" class="mt-4">
      <JsonView :value="result" label="결과" :default-open="true" />
    </div>
  </template>
</template>
