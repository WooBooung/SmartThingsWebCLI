// Installed Apps 전용 API 헬퍼.
// CLI: installedapps [id] / installedapps:delete [id] / installedapps:rename [id] [new-name]
// REST: GET /installedapps(?locationId=) · GET/DELETE/PUT /installedapps/{id}
import { apiFetch } from '@/lib/stClient'
import type { ListResponse } from '@/lib/types'

export interface InstalledApp {
  installedAppId: string
  appId?: string
  displayName?: string | null
  installedAppType?: string
  installedAppStatus?: string
  locationId?: string
  createdDate?: string
  lastUpdatedDate?: string
  // 그 외 필드는 원본 JSON 그대로 표시하므로 느슨하게 허용
  [key: string]: unknown
}

/** 설치된 앱 목록. locationId 로 필터 가능. */
export function listInstalledApps(locationId?: string) {
  const qs = locationId ? `?${new URLSearchParams({ locationId }).toString()}` : ''
  return apiFetch<ListResponse<InstalledApp>>(`/installedapps${qs}`)
}

/** 단일 설치 앱 조회. */
export function getInstalledApp(id: string) {
  return apiFetch<InstalledApp>(`/installedapps/${id}`)
}

/** 설치 앱 삭제. 204 → null. */
export function deleteInstalledApp(id: string) {
  return apiFetch<null>(`/installedapps/${id}`, { method: 'DELETE' })
}

/** 이름 변경 (rename). PUT body { displayName }. */
export function renameInstalledApp(id: string, displayName: string) {
  return apiFetch<InstalledApp>(`/installedapps/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ displayName }),
  })
}
