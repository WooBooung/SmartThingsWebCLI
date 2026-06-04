<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useTokenStore } from '@/stores/token'
import { listOrganizations, getOrganization, type Organization } from '@/lib/api/organizations'
import { toastError } from '@/lib/toast'
import InfoGrid, { type InfoItem } from '@/components/InfoGrid.vue'
import CopyButton from '@/components/CopyButton.vue'
import JsonView from '@/components/JsonView.vue'
import CliRef from '@/components/CliRef.vue'

const { hasToken } = storeToRefs(useTokenStore())

const orgs = ref<Organization[]>([])
const listLoading = ref(false)
const selectedId = ref('')
const detail = ref<Organization | null>(null)
const detailLoading = ref(false)

function str(v: unknown): string {
  if (v == null) return ''
  return typeof v === 'string' ? v : String(v)
}

function orgTitle(o: Organization): string {
  return o.label || o.name || o.organizationId
}

// CLI `organizations:current` — 기본 사용자 조직.
const currentOrg = computed(() => orgs.value.find((o) => o.isDefaultUserOrg) ?? null)

const detailInfo = computed<InfoItem[]>(() => {
  const o = detail.value
  if (!o) return []
  const items: InfoItem[] = [
    { label: 'name', value: str(o.name) },
    { label: 'label', value: str(o.label) },
    { label: 'organizationId', value: str(o.organizationId), mono: true },
    { label: 'mnid', value: str(o.mnid), mono: true },
    { label: '제조사 (manufacturerName)', value: str(o.manufacturerName) },
    { label: 'warehouseGroupId', value: str(o.warehouseGroupId), mono: true },
    { label: 'developerGroupId', value: str(o.developerGroupId), mono: true },
    { label: 'adminGroupId', value: str(o.adminGroupId), mono: true },
    { label: '기본 조직 (isDefaultUserOrg)', value: o.isDefaultUserOrg ? '예' : '아니오' },
  ]
  return items.filter((i) => i.value)
})

async function loadList() {
  listLoading.value = true
  try {
    orgs.value = await listOrganizations()
    if (!selectedId.value) {
      // 기본은 현재(기본) 조직을 우선 선택, 없으면 첫 항목.
      const init = currentOrg.value ?? orgs.value[0]
      if (init) {
        selectedId.value = init.organizationId
        await loadDetail(init.organizationId)
      }
    }
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    listLoading.value = false
  }
}

async function loadDetail(id: string) {
  if (!id) {
    detail.value = null
    return
  }
  detailLoading.value = true
  detail.value = null
  try {
    detail.value = await getOrganization(id)
  } catch (e) {
    toastError(e instanceof Error ? e.message : String(e))
  } finally {
    detailLoading.value = false
  }
}

function onSelect() {
  loadDetail(selectedId.value)
}

function selectCurrent() {
  const c = currentOrg.value
  if (!c) return
  selectedId.value = c.organizationId
  loadDetail(c.organizationId)
}

onMounted(() => {
  if (hasToken.value) loadList()
})
</script>

<template>
  <header class="mb-6">
    <h1 class="text-2xl font-extrabold tracking-tight md:text-3xl">Organizations</h1>
    <p class="mt-1 text-sm text-muted">조직 목록을 조회하고 현재(기본) 조직을 확인합니다.</p>
  </header>
  <CliRef
    :commands="['organizations', 'organizations:current']"
    note="읽기 전용 조회 도구입니다. organizations:current 는 isDefaultUserOrg 플래그로 결정됩니다."
    :docs="[
      {
        label: 'Organizations',
        url: 'https://developer.smartthings.com/docs/api/public/#tag/Organizations',
      },
    ]"
  />

  <div
    v-if="!hasToken"
    class="rounded-xl border-l-[3px] border-warn bg-warn/10 px-4 py-3 text-sm text-warn"
  >
    PAT 토큰이 없습니다. 우측 상단의 <strong>PAT 설정</strong> 으로 토큰을 입력하세요.
  </div>

  <template v-else>
    <div class="rounded-xl border border-line bg-card p-4">
      <div class="flex items-center justify-between gap-2">
        <label class="text-[11px] font-semibold tracking-wider text-muted uppercase">
          조직 선택
        </label>
        <button
          class="rounded-md border border-line px-3 py-1 text-xs font-semibold text-muted transition hover:border-brand-2 hover:text-brand-2 disabled:opacity-50"
          :disabled="listLoading"
          @click="loadList"
        >
          {{ listLoading ? '불러오는 중…' : '목록 새로고침' }}
        </button>
      </div>
      <div class="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <select
          v-model="selectedId"
          class="w-full rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2"
          @change="onSelect"
        >
          <option value="" disabled>— 조직을 선택하세요 —</option>
          <option v-for="o in orgs" :key="o.organizationId" :value="o.organizationId">
            {{ orgTitle(o) }}{{ o.isDefaultUserOrg ? ' (현재)' : '' }}
          </option>
        </select>
        <button
          v-if="currentOrg"
          class="shrink-0 rounded-lg border border-line px-4 py-2 text-sm font-semibold transition hover:-translate-y-px hover:border-brand-2"
          @click="selectCurrent"
        >
          현재 조직
        </button>
      </div>
      <p v-if="!listLoading && !orgs.length" class="mt-3 text-sm text-muted">
        조직이 없습니다.
      </p>
    </div>

    <div v-if="detailLoading" class="mt-8 flex items-center gap-2 text-sm text-muted">
      <span class="size-2 animate-pulse rounded-full bg-brand-2" /> 불러오는 중…
    </div>

    <div v-if="detail && !detailLoading" class="mt-6 flex flex-col gap-4">
      <!-- Hero -->
      <section class="hero-glow overflow-hidden rounded-2xl border border-brand-2/25 p-5">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <h2 class="truncate text-xl font-extrabold tracking-tight">{{ orgTitle(detail) }}</h2>
            <p v-if="detail.label && detail.name !== detail.label" class="mt-1 text-sm text-muted">
              {{ detail.name }}
            </p>
          </div>
          <span
            v-if="detail.isDefaultUserOrg"
            class="shrink-0 rounded-full border border-success/40 bg-success/10 px-3 py-1 text-xs font-semibold text-success"
          >
            현재 조직
          </span>
        </div>
        <div class="mt-3 flex items-center gap-2">
          <code class="truncate rounded-md bg-black/25 px-2 py-1 font-mono text-[12.5px] text-muted">
            {{ detail.organizationId }}
          </code>
          <CopyButton :text="detail.organizationId" title="organizationId 복사" />
        </div>
      </section>

      <InfoGrid title="조직 정보" :items="detailInfo" />

      <JsonView :value="detail" label="Organization (원본 JSON)" />
    </div>
  </template>
</template>
