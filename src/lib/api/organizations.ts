// Organizations API 헬퍼 — OrganizationsView 전용.
// 엔드포인트는 @smartthings/core-sdk `src/endpoint/organizations.ts` 로 검증:
//   list(): getPagedItems('')      → GET /organizations        (paged: { items: [...] })
//   get(id): client.get(id)        → GET /organizations/{id}
// CLI `organizations:current` 는 목록 중 isDefaultUserOrg === true 인 항목을 가리킨다.
import { apiFetch } from '@/lib/stClient'

/** core-sdk OrganizationResponse 와 동일한 필드 구성. */
export interface Organization {
  organizationId: string
  name: string
  label?: string
  warehouseGroupId?: string
  manufacturerName?: string
  mnid?: string
  developerGroupId?: string
  adminGroupId?: string
  /** caller 의 기본(현재) 조직 여부. organizations:current 가 이 플래그로 결정된다. */
  isDefaultUserOrg?: boolean
}

interface PagedOrganizations {
  items?: Organization[]
}

/** GET /organizations — 조직 목록 (paged 응답의 items 를 평탄화). */
export async function listOrganizations(): Promise<Organization[]> {
  const res = await apiFetch<PagedOrganizations>('/organizations')
  return res.items ?? []
}

/** GET /organizations/{id} — 단일 조직 조회. */
export function getOrganization(id: string): Promise<Organization> {
  return apiFetch<Organization>(`/organizations/${encodeURIComponent(id)}`)
}
