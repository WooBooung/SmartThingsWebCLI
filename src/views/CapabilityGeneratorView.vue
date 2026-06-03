<script setup lang="ts">
import { ref, computed } from 'vue'
import yaml from 'js-yaml'
import {
  validateInputs,
  generateCapability,
  type CapaType,
  type ResultFormat,
} from '@/lib/capabilityGenerator'
import { toastError } from '@/lib/toast'
import CopyButton from '@/components/CopyButton.vue'
import CliRef from '@/components/CliRef.vue'

const capaName = ref('')
const capaType = ref<CapaType | ''>('')
const attrName = ref('')

// string 옵션
const maxLengthOn = ref(false)
const maxLengthValue = ref<string>('')

// number/integer 옵션
const minimumOn = ref(false)
const minimumValue = ref<string>('')
const maximumOn = ref(false)
const maximumValue = ref<string>('')
const unitOn = ref(false)
const unitValue = ref<string>('')

const resultFormat = ref<ResultFormat>('json')
const output = ref('')

const showCommon = computed(() => capaType.value !== '')
const showStringOptions = computed(() => capaType.value === 'string')
const showNumberOptions = computed(() => capaType.value === 'integer' || capaType.value === 'number')

function toNum(v: string): number | null {
  if (v.trim() === '') return null
  const n = parseInt(v, 10)
  return Number.isNaN(n) ? null : n
}

function generate() {
  if (capaType.value === '') return
  const name = capaName.value.trim()
  // attr 이름은 원본과 동일하게 trim 없이 그대로 검증 (빈 값 허용)
  const attr = attrName.value

  const err = validateInputs(name, attr)
  if (err) {
    output.value = ''
    toastError(err)
    return
  }

  const cap = generateCapability({
    capaName: name,
    capaType: capaType.value,
    attrName: attr,
    maxLength: showStringOptions.value && maxLengthOn.value ? toNum(maxLengthValue.value) : null,
    minimum: showNumberOptions.value && minimumOn.value ? toNum(minimumValue.value) : null,
    maximum: showNumberOptions.value && maximumOn.value ? toNum(maximumValue.value) : null,
    unit: showNumberOptions.value && unitOn.value ? unitValue.value : null,
  })

  output.value =
    resultFormat.value === 'json' ? JSON.stringify(cap, null, 2) : yaml.dump(cap)
}

// 포맷만 바꿔도 이미 생성된 결과를 갱신
function onFormatChange() {
  if (output.value) generate()
}

const inputClass =
  'rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2'
</script>

<template>
  <header class="mb-6">
    <h1 class="text-2xl font-extrabold tracking-tight md:text-3xl">Capability Sample Generator</h1>
    <p class="mt-1 text-sm text-muted">
      타입과 속성 이름만 입력하면 커스텀 capability 정의 샘플(JSON/YAML)을 생성합니다.
    </p>
  </header>
  <CliRef
    :commands="[]"
    note="CLI 직접 대응 없는 보조 도구입니다. 생성한 정의는 capabilities:create 로 등록할 수 있습니다."
    :docs="[
      { label: 'Capabilities', url: 'https://developer.smartthings.com/docs/api/public/#tag/Capabilities' },
    ]"
  />

  <div class="grid gap-4 lg:grid-cols-2">
    <!-- 입력 -->
    <section class="rounded-xl border border-line bg-card p-4">
      <header class="mb-4 flex items-center gap-2">
        <span class="h-3.5 w-1 rounded-full bg-gradient-to-b from-brand to-brand-2" />
        <h2 class="text-sm font-bold">정의 입력</h2>
      </header>

      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1.5">
          <label
            for="capa_name"
            class="text-[11px] font-semibold tracking-wider text-muted uppercase"
          >
            Capability Name
          </label>
          <input
            id="capa_name"
            v-model="capaName"
            spellcheck="false"
            maxlength="50"
            placeholder="예: myCapability"
            :class="['font-mono', inputClass]"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <label
            for="capa_type"
            class="text-[11px] font-semibold tracking-wider text-muted uppercase"
          >
            Capability Type
          </label>
          <select id="capa_type" v-model="capaType" :class="inputClass">
            <option value="">==Select==</option>
            <option value="string">string</option>
            <option value="integer">integer</option>
            <option value="number">number</option>
            <option value="boolean">boolean</option>
            <option value="array">array</option>
          </select>
        </div>

        <template v-if="showCommon">
          <div class="flex flex-col gap-1.5">
            <label
              for="capa_attr_name"
              class="text-[11px] font-semibold tracking-wider text-muted uppercase"
            >
              Attribute ID
            </label>
            <input
              id="capa_attr_name"
              v-model="attrName"
              spellcheck="false"
              placeholder="예: myValue"
              :class="['font-mono', inputClass]"
            />
          </div>

          <!-- string 옵션 -->
          <div v-if="showStringOptions" class="rounded-lg border border-line bg-bg-2 p-3">
            <label class="flex items-center gap-2 text-sm text-text">
              <input v-model="maxLengthOn" type="checkbox" class="accent-brand-2" />
              maxLength
            </label>
            <input
              v-if="maxLengthOn"
              v-model="maxLengthValue"
              type="number"
              class="mt-2 w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
            />
          </div>

          <!-- number/integer 옵션 -->
          <div v-if="showNumberOptions" class="flex flex-col gap-3 rounded-lg border border-line bg-bg-2 p-3">
            <div>
              <label class="flex items-center gap-2 text-sm text-text">
                <input v-model="minimumOn" type="checkbox" class="accent-brand-2" />
                minimum
              </label>
              <input
                v-if="minimumOn"
                v-model="minimumValue"
                type="number"
                class="mt-2 w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
              />
            </div>
            <div>
              <label class="flex items-center gap-2 text-sm text-text">
                <input v-model="maximumOn" type="checkbox" class="accent-brand-2" />
                maximum
              </label>
              <input
                v-if="maximumOn"
                v-model="maximumValue"
                type="number"
                class="mt-2 w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
              />
            </div>
            <div>
              <label class="flex items-center gap-2 text-sm text-text">
                <input v-model="unitOn" type="checkbox" class="accent-brand-2" />
                add unit
              </label>
              <input
                v-if="unitOn"
                v-model="unitValue"
                spellcheck="false"
                class="mt-2 w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
              />
            </div>
          </div>

          <div class="flex flex-wrap items-end justify-between gap-3">
            <div class="flex flex-col gap-1.5">
              <label
                for="result_format"
                class="text-[11px] font-semibold tracking-wider text-muted uppercase"
              >
                Result Format
              </label>
              <select
                id="result_format"
                v-model="resultFormat"
                :class="inputClass"
                @change="onFormatChange"
              >
                <option value="json">JSON</option>
                <option value="yaml">YAML</option>
              </select>
            </div>
            <button
              class="rounded-lg border border-transparent bg-gradient-to-br from-brand to-brand-2 px-4 py-2 text-sm font-semibold text-[#061026] transition hover:-translate-y-px disabled:opacity-50"
              @click="generate"
            >
              Generate
            </button>
          </div>
        </template>
      </div>
    </section>

    <!-- 결과 -->
    <section class="rounded-xl border border-line bg-card">
      <header class="flex items-center justify-between border-b border-line px-4 py-3">
        <div class="flex items-center gap-2">
          <span class="h-3.5 w-1 rounded-full bg-gradient-to-b from-brand to-brand-2" />
          <h2 class="text-sm font-bold">결과 ({{ resultFormat.toUpperCase() }})</h2>
        </div>
        <CopyButton v-if="output" :text="output" title="결과 복사" />
      </header>
      <pre
        v-if="output"
        class="max-h-[70vh] overflow-auto px-4 py-3 font-mono text-[13px] leading-relaxed whitespace-pre-wrap text-text"
      >{{ output }}</pre>
      <p v-else class="px-4 py-6 text-sm text-muted">
        타입을 선택하고 <strong class="text-text">Generate</strong> 를 누르면 결과가 표시됩니다.
      </p>
    </section>
  </div>
</template>
