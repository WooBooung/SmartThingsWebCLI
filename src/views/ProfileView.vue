<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useTokenStore } from '@/stores/token'
import {
  listProfiles,
  getProfile,
  createProfile,
  updateProfile,
  publishProfile,
  deleteProfile,
  getProfileDeviceConfig,
  getProfilePresentation,
  extractPresentationRef,
  type DeviceProfileSummary,
} from '@/lib/api/profile'
import { parseJsonOrYaml } from '@/lib/yaml'
import { toastError, toastSuccess } from '@/lib/toast'
import JsonView from '@/components/JsonView.vue'
import CliRef from '@/components/CliRef.vue'

const { t } = useI18n({
  useScope: 'local',
  inheritLocale: true,
  messages: {
    ko: {
      title: 'Device Profile',
      desc: '디바이스 프로파일을 조회·생성·수정·게시·삭제합니다.',
      noTokenPre: 'PAT 토큰이 없습니다. 우측 상단의 ',
      noTokenPost: ' 으로 토큰을 입력하세요.',
      patSetting: 'PAT 설정',
      myProfiles: '내 프로파일 ({count})',
      loading: '불러오는 중…',
      refresh: '↻ 새로고침',
      noName: '(이름 없음)',
      noProfiles: '프로파일이 없습니다.',
      retrieve: '조회',
      viewBtn: '통합 보기 (view)',
      viewTitle: '프로파일 + presentation 통합 보기 (deviceprofiles:view)',
      deviceConfigTitle: 'metadata.vid/mnmn 로 device configuration 조회 (deviceprofiles:device-config)',
      presentationTitle: 'metadata.vid/mnmn 로 presentation 조회 (deviceprofiles:presentation)',
      refHintPre: '통합 보기·device-config·presentation 은 프로파일의 ',
      refHintMid: ' / ',
      refHintPost: ' 으로 presentation 을 조회합니다 (CLI 와 동일).',
      editorLabel: '프로파일 정의 (JSON 또는 YAML)',
      create: '생성',
      update: '수정',
      publish: '게시',
      del: '삭제',
      editorPlaceholder: '프로파일 정의를 JSON 또는 YAML 로 입력하세요.',
      resultLabel: '결과',
      // toasts / confirms / messages
      needProfileId: 'Profile ID 를 입력하세요.',
      noVidFor: '이 프로파일에는 {action} 에 필요한 metadata.vid 가 없습니다. (게시 전이거나 presentation 미연결)',
      noVidMerge: 'metadata.vid 가 없어 presentation 을 합칠 수 없습니다. 프로파일만 표시합니다.',
      presentationFetchFail: 'presentation 조회에 실패하여 프로파일만 표시합니다.',
      viewLoaded: '프로파일 + presentation 통합 보기를 불러왔습니다.',
      deviceConfigLoaded: '프로파일의 device configuration 을 불러왔습니다.',
      presentationLoaded: '프로파일의 presentation 을 불러왔습니다.',
      parseError: '파싱 오류',
      created: 'Device Profile 을 생성했습니다.',
      updated: 'Device Profile 을 수정했습니다.',
      confirmPublish: 'Device Profile "{id}" 을 게시(PUBLISHED)할까요? 게시 후에는 일부 변경이 제한됩니다.',
      published: 'Device Profile 을 게시했습니다.',
      confirmDelete: 'Device Profile "{id}" 을 삭제할까요? 되돌릴 수 없습니다.',
      deleteSuccess: 'Device Profile "{id}" 삭제 성공',
      deleted: 'Device Profile 을 삭제했습니다.',
    },
    en: {
      title: 'Device Profile',
      desc: 'Retrieve, create, update, publish, and delete device profiles.',
      noTokenPre: 'No PAT token. Enter a token via ',
      noTokenPost: ' at the top right.',
      patSetting: 'PAT Settings',
      myProfiles: 'My profiles ({count})',
      loading: 'Loading…',
      refresh: '↻ Refresh',
      noName: '(no name)',
      noProfiles: 'No profiles.',
      retrieve: 'Retrieve',
      viewBtn: 'Combined view (view)',
      viewTitle: 'Profile + presentation combined view (deviceprofiles:view)',
      deviceConfigTitle: 'Get device configuration via metadata.vid/mnmn (deviceprofiles:device-config)',
      presentationTitle: 'Get presentation via metadata.vid/mnmn (deviceprofiles:presentation)',
      refHintPre: 'Combined view, device-config, and presentation are looked up from the profile ',
      refHintMid: ' / ',
      refHintPost: ' (same as the CLI).',
      editorLabel: 'Profile definition (JSON or YAML)',
      create: 'Create',
      update: 'Update',
      publish: 'Publish',
      del: 'Delete',
      editorPlaceholder: 'Enter the profile definition as JSON or YAML.',
      resultLabel: 'Result',
      // toasts / confirms / messages
      needProfileId: 'Enter a Profile ID.',
      noVidFor: 'This profile has no metadata.vid required for {action}. (not published yet, or presentation not linked)',
      noVidMerge: 'No metadata.vid, so presentation cannot be merged. Showing the profile only.',
      presentationFetchFail: 'Failed to fetch presentation; showing the profile only.',
      viewLoaded: 'Loaded the profile + presentation combined view.',
      deviceConfigLoaded: 'Loaded the device configuration of the profile.',
      presentationLoaded: 'Loaded the presentation of the profile.',
      parseError: 'Parse error',
      created: 'Created the Device Profile.',
      updated: 'Updated the Device Profile.',
      confirmPublish: 'Publish (PUBLISHED) Device Profile "{id}"? Some changes are restricted after publishing.',
      published: 'Published the Device Profile.',
      confirmDelete: 'Delete Device Profile "{id}"? This cannot be undone.',
      deleteSuccess: 'Device Profile "{id}" deleted successfully',
      deleted: 'Deleted the Device Profile.',
    },
  },
})

const { hasToken } = storeToRefs(useTokenStore())

const profiles = ref<DeviceProfileSummary[]>([])
const listLoading = ref(false)

const profileId = ref('')
const editor = ref('')
const result = ref<unknown>(null)
const busy = ref(false)

async function loadList() {
  if (!hasToken.value) return
  listLoading.value = true
  try {
    const data = await listProfiles()
    profiles.value = (data.items ?? []).slice().sort((a, b) =>
      (a.name ?? '').localeCompare(b.name ?? ''),
    )
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    listLoading.value = false
  }
}

async function doRetrieve(id?: string) {
  const pid = (id ?? profileId.value).trim()
  if (!pid) {
    toastError(t('needProfileId'))
    return
  }
  profileId.value = pid
  busy.value = true
  result.value = null
  try {
    const data = await getProfile(pid)
    editor.value = JSON.stringify(data, null, 2)
    result.value = data
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

// metadata.vid/mnmn 를 통해 presentation 계열을 조회한다 (CLI 와 동일한 합성 방식).
async function withPresentationRef(action: string): Promise<ReturnType<typeof extractPresentationRef>> {
  const pid = profileId.value.trim()
  if (!pid) {
    toastError(t('needProfileId'))
    return null
  }
  const profile = await getProfile(pid)
  const ref = extractPresentationRef(profile)
  if (!ref) {
    toastError(t('noVidFor', { action }))
    return null
  }
  return ref
}

async function doView() {
  const pid = profileId.value.trim()
  if (!pid) return toastError(t('needProfileId'))
  busy.value = true
  result.value = null
  try {
    const profile = await getProfile(pid)
    editor.value = JSON.stringify(profile, null, 2)
    const ref = extractPresentationRef(profile)
    if (!ref) {
      result.value = profile
      toastError(t('noVidMerge'))
      return
    }
    try {
      const view = await getProfilePresentation(ref)
      result.value = { ...profile, view }
    } catch {
      result.value = profile
      toastError(t('presentationFetchFail'))
    }
    toastSuccess(t('viewLoaded'))
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

async function doDeviceConfig() {
  busy.value = true
  result.value = null
  try {
    const ref = await withPresentationRef('device-config')
    if (!ref) return
    result.value = await getProfileDeviceConfig(ref)
    toastSuccess(t('deviceConfigLoaded'))
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

async function doPresentation() {
  busy.value = true
  result.value = null
  try {
    const ref = await withPresentationRef('presentation')
    if (!ref) return
    result.value = await getProfilePresentation(ref)
    toastSuccess(t('presentationLoaded'))
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

async function doCreate() {
  const parsed = parseJsonOrYaml(editor.value)
  if (!parsed.ok) return toastError(parsed.error ?? t('parseError'))
  busy.value = true
  try {
    const data = await createProfile(parsed.json)
    result.value = data
    const newId = (data as { id?: string }).id
    if (newId) profileId.value = newId
    toastSuccess(t('created'))
    await loadList()
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

async function doUpdate() {
  const pid = profileId.value.trim()
  if (!pid) return toastError(t('needProfileId'))
  const parsed = parseJsonOrYaml(editor.value)
  if (!parsed.ok) return toastError(parsed.error ?? t('parseError'))
  busy.value = true
  try {
    result.value = await updateProfile(pid, parsed.json)
    toastSuccess(t('updated'))
    await loadList()
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

async function doPublish() {
  const pid = profileId.value.trim()
  if (!pid) return toastError(t('needProfileId'))
  if (!window.confirm(t('confirmPublish', { id: pid }))) return
  busy.value = true
  try {
    const data = await publishProfile(pid)
    editor.value = JSON.stringify(data, null, 2)
    result.value = data
    toastSuccess(t('published'))
    await loadList()
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

async function doDelete() {
  const pid = profileId.value.trim()
  if (!pid) return toastError(t('needProfileId'))
  if (!window.confirm(t('confirmDelete', { id: pid }))) return
  busy.value = true
  try {
    await deleteProfile(pid)
    result.value = { message: t('deleteSuccess', { id: pid }) }
    profileId.value = ''
    editor.value = ''
    toastSuccess(t('deleted'))
    await loadList()
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
      'deviceprofiles [id]',
      'deviceprofiles:create',
      'deviceprofiles:update [id]',
      'deviceprofiles:delete [id]',
      'deviceprofiles:publish [id]',
      'deviceprofiles:view [id]',
      'deviceprofiles:device-config [id]',
      'deviceprofiles:presentation [id]',
    ]"
    :docs="[
      { label: 'Device Profiles', url: 'https://developer.smartthings.com/docs/api/public/#tag/Device-Profiles' },
      { label: 'Presentation', url: 'https://developer.smartthings.com/docs/api/public/#tag/Presentation' },
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
    <!-- 목록 -->
    <section class="rounded-xl border border-line bg-card p-4">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-semibold tracking-wider text-muted uppercase">
          {{ t('myProfiles', { count: profiles.length }) }}
        </span>
        <button
          class="rounded-md border border-line px-2 py-1 text-xs text-muted transition hover:border-brand-2 hover:text-brand-2"
          :disabled="listLoading"
          @click="loadList"
        >
          {{ listLoading ? t('loading') : t('refresh') }}
        </button>
      </div>
      <div
        v-if="profiles.length"
        class="mt-3 grid max-h-[360px] gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3"
      >
        <button
          v-for="p in profiles"
          :key="p.id"
          class="flex flex-col gap-1 rounded-lg border border-line bg-bg-2 px-3 py-2 text-left transition hover:border-brand-2"
          :class="p.id === profileId ? 'border-brand-2' : ''"
          @click="doRetrieve(p.id)"
        >
          <span class="truncate text-sm font-semibold text-text">{{ p.name || t('noName') }}</span>
          <span class="flex items-center gap-2">
            <span class="truncate font-mono text-[11px] text-muted">{{ p.id }}</span>
            <span
              v-if="p.status"
              class="shrink-0 rounded-full border border-line px-1.5 text-[10px] text-muted"
            >
              {{ p.status }}
            </span>
          </span>
        </button>
      </div>
      <p v-else-if="!listLoading" class="mt-3 text-sm text-muted">{{ t('noProfiles') }}</p>
    </section>

    <!-- Profile ID -->
    <section class="mt-4 rounded-xl border border-line bg-card p-4">
      <label class="text-[11px] font-semibold tracking-wider text-muted uppercase">Profile ID</label>
      <div class="mt-3 flex gap-2">
        <input
          v-model="profileId"
          spellcheck="false"
          placeholder="deviceProfileId"
          class="w-full rounded-lg border border-line bg-bg-2 px-3 py-2 font-mono text-sm text-text outline-none focus:border-brand-2"
          @keyup.enter="doRetrieve()"
        />
        <button
          class="shrink-0 rounded-lg border border-line px-4 py-2 text-sm font-semibold transition hover:-translate-y-px hover:border-brand-2 disabled:opacity-50"
          :disabled="busy"
          @click="doRetrieve()"
        >
          {{ t('retrieve') }}
        </button>
      </div>
      <div class="mt-3 flex flex-wrap gap-2">
        <button
          class="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold transition hover:-translate-y-px hover:border-brand-2 disabled:opacity-50"
          :disabled="busy"
          :title="t('viewTitle')"
          @click="doView"
        >
          {{ t('viewBtn') }}
        </button>
        <button
          class="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold transition hover:-translate-y-px hover:border-brand-2 disabled:opacity-50"
          :disabled="busy"
          :title="t('deviceConfigTitle')"
          @click="doDeviceConfig"
        >
          device-config
        </button>
        <button
          class="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold transition hover:-translate-y-px hover:border-brand-2 disabled:opacity-50"
          :disabled="busy"
          :title="t('presentationTitle')"
          @click="doPresentation"
        >
          presentation
        </button>
      </div>
      <p class="mt-2 text-xs text-muted">
        {{ t('refHintPre') }}<code class="font-mono">metadata.vid</code>{{ t('refHintMid')
        }}<code class="font-mono">metadata.mnmn</code>{{ t('refHintPost') }}
      </p>
    </section>

    <!-- 에디터 -->
    <section class="mt-4 rounded-xl border border-line bg-card p-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <span class="text-[11px] font-semibold tracking-wider text-muted uppercase">
          {{ t('editorLabel') }}
        </span>
        <div class="flex flex-wrap gap-2">
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
            class="rounded-lg border border-line px-4 py-1.5 text-sm font-semibold transition hover:-translate-y-px hover:border-brand-2 disabled:opacity-50"
            :disabled="busy"
            @click="doPublish"
          >
            {{ t('publish') }}
          </button>
          <button
            class="rounded-lg border border-warn/50 bg-warn/10 px-4 py-1.5 text-sm font-semibold text-warn transition hover:-translate-y-px hover:border-warn disabled:opacity-50"
            :disabled="busy"
            @click="doDelete"
          >
            {{ t('del') }}
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
  </template>
</template>
