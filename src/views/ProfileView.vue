<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useTokenStore } from '@/stores/token'
import {
  listProfiles,
  getProfile,
  createProfile,
  updateProfile,
  publishProfile,
  deleteProfile,
  type DeviceProfileSummary,
} from '@/lib/api/profile'
import { parseJsonOrYaml } from '@/lib/yaml'
import { toastError, toastSuccess } from '@/lib/toast'
import JsonView from '@/components/JsonView.vue'

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
    toastError('Profile ID 를 입력하세요.')
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

async function doCreate() {
  const parsed = parseJsonOrYaml(editor.value)
  if (!parsed.ok) return toastError(parsed.error ?? '파싱 오류')
  busy.value = true
  try {
    const data = await createProfile(parsed.json)
    result.value = data
    const newId = (data as { id?: string }).id
    if (newId) profileId.value = newId
    toastSuccess('Device Profile 을 생성했습니다.')
    await loadList()
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

async function doUpdate() {
  const pid = profileId.value.trim()
  if (!pid) return toastError('Profile ID 를 입력하세요.')
  const parsed = parseJsonOrYaml(editor.value)
  if (!parsed.ok) return toastError(parsed.error ?? '파싱 오류')
  busy.value = true
  try {
    result.value = await updateProfile(pid, parsed.json)
    toastSuccess('Device Profile 을 수정했습니다.')
    await loadList()
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

async function doPublish() {
  const pid = profileId.value.trim()
  if (!pid) return toastError('Profile ID 를 입력하세요.')
  if (!window.confirm(`Device Profile "${pid}" 을 게시(PUBLISHED)할까요? 게시 후에는 일부 변경이 제한됩니다.`))
    return
  busy.value = true
  try {
    const data = await publishProfile(pid)
    editor.value = JSON.stringify(data, null, 2)
    result.value = data
    toastSuccess('Device Profile 을 게시했습니다.')
    await loadList()
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

async function doDelete() {
  const pid = profileId.value.trim()
  if (!pid) return toastError('Profile ID 를 입력하세요.')
  if (!window.confirm(`Device Profile "${pid}" 을 삭제할까요? 되돌릴 수 없습니다.`)) return
  busy.value = true
  try {
    await deleteProfile(pid)
    result.value = { message: `Device Profile "${pid}" 삭제 성공` }
    profileId.value = ''
    editor.value = ''
    toastSuccess('Device Profile 을 삭제했습니다.')
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
    <h1 class="text-2xl font-extrabold tracking-tight md:text-3xl">Device Profile</h1>
    <p class="mt-1 text-sm text-muted">디바이스 프로파일을 조회·생성·수정·게시·삭제합니다.</p>
  </header>

  <div
    v-if="!hasToken"
    class="rounded-xl border-l-[3px] border-warn bg-warn/10 px-4 py-3 text-sm text-warn"
  >
    PAT 토큰이 없습니다. 우측 상단의 <strong>PAT 설정</strong> 으로 토큰을 입력하세요.
  </div>

  <template v-else>
    <!-- 목록 -->
    <section class="rounded-xl border border-line bg-card p-4">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-semibold tracking-wider text-muted uppercase">
          내 프로파일 ({{ profiles.length }})
        </span>
        <button
          class="rounded-md border border-line px-2 py-1 text-xs text-muted transition hover:border-brand-2 hover:text-brand-2"
          :disabled="listLoading"
          @click="loadList"
        >
          {{ listLoading ? '불러오는 중…' : '↻ 새로고침' }}
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
          <span class="truncate text-sm font-semibold text-text">{{ p.name || '(이름 없음)' }}</span>
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
      <p v-else-if="!listLoading" class="mt-3 text-sm text-muted">프로파일이 없습니다.</p>
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
          조회
        </button>
      </div>
    </section>

    <!-- 에디터 -->
    <section class="mt-4 rounded-xl border border-line bg-card p-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <span class="text-[11px] font-semibold tracking-wider text-muted uppercase">
          프로파일 정의 (JSON 또는 YAML)
        </span>
        <div class="flex flex-wrap gap-2">
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
            class="rounded-lg border border-line px-4 py-1.5 text-sm font-semibold transition hover:-translate-y-px hover:border-brand-2 disabled:opacity-50"
            :disabled="busy"
            @click="doPublish"
          >
            게시
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
        placeholder="프로파일 정의를 JSON 또는 YAML 로 입력하세요."
        class="mt-3 w-full resize-y rounded-lg border border-line bg-bg-2 px-3 py-2 font-mono text-[13px] leading-relaxed text-text outline-none focus:border-brand-2"
      />
    </section>

    <!-- 결과 -->
    <div v-if="result" class="mt-4">
      <JsonView :value="result" label="결과" :default-open="true" />
    </div>
  </template>
</template>
