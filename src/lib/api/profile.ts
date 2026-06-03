import { apiFetch } from '@/lib/stClient'

/** Device Profile 목록 항목 (요약) */
export interface DeviceProfileSummary {
  id: string
  name: string
  status?: string
  [key: string]: unknown
}

interface ListResponse<T> {
  items?: T[]
  _links?: unknown
}

/** 내 Device Profile 목록 */
export const listProfiles = () =>
  apiFetch<ListResponse<DeviceProfileSummary>>('/deviceprofiles')

/** 단일 Device Profile 조회 */
export const getProfile = (id: string) =>
  apiFetch<Record<string, unknown>>(`/deviceprofiles/${id}`)

/** Device Profile 생성 */
export const createProfile = (body: string) =>
  apiFetch<Record<string, unknown>>('/deviceprofiles', { method: 'POST', body })

/** Device Profile 수정 */
export const updateProfile = (id: string, body: string) =>
  apiFetch<Record<string, unknown>>(`/deviceprofiles/${id}`, { method: 'PUT', body })

/** Device Profile 게시(PUBLISHED) */
export const publishProfile = (id: string) =>
  apiFetch<Record<string, unknown>>(`/deviceprofiles/${id}/status`, {
    method: 'POST',
    body: JSON.stringify({ deviceProfileStatus: 'PUBLISHED' }),
  })

/** Device Profile 삭제 */
export const deleteProfile = (id: string) =>
  apiFetch<null>(`/deviceprofiles/${id}`, { method: 'DELETE' })
