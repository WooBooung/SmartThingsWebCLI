import { apiFetch } from '@/lib/stClient'
import type { ListResponse } from '@/lib/types'

/**
 * SmartThings Location Modes 엔드포인트 헬퍼.
 * core-sdk endpoint/modes.ts 기준 (basePath: locations/{locationId}/modes):
 *  - GET    /locations/{locationId}/modes
 *  - POST   /locations/{locationId}/modes              body: ModeRequest
 *  - PUT    /locations/{locationId}/modes/{modeId}     body: ModeRequest
 *  - DELETE /locations/{locationId}/modes/{modeId}
 *  - GET    /locations/{locationId}/modes/current
 *  - PUT    /locations/{locationId}/modes/current      body: { modeId }
 * 참고: https://developer.smartthings.com/docs/api/public/#tag/Modes
 */

export interface Mode {
  id: string
  label: string
  name?: string
  [key: string]: unknown
}

/** 위치의 모드 목록 */
export const listModes = (locationId: string) =>
  apiFetch<ListResponse<Mode>>(`/locations/${encodeURIComponent(locationId)}/modes`)

/** 모드 단건 조회 */
export const getMode = (locationId: string, modeId: string) =>
  apiFetch<Mode>(
    `/locations/${encodeURIComponent(locationId)}/modes/${encodeURIComponent(modeId)}`,
  )

/** 모드 생성. body 는 JSON 문자열 (예: {"label":"..."}). */
export const createMode = (locationId: string, body: string) =>
  apiFetch<Mode>(`/locations/${encodeURIComponent(locationId)}/modes`, {
    method: 'POST',
    body,
  })

/** 모드 수정. body 는 JSON 문자열 (예: {"label":"..."}). */
export const updateMode = (locationId: string, modeId: string, body: string) =>
  apiFetch<Mode>(
    `/locations/${encodeURIComponent(locationId)}/modes/${encodeURIComponent(modeId)}`,
    { method: 'PUT', body },
  )

/** 모드 삭제 */
export const deleteMode = (locationId: string, modeId: string) =>
  apiFetch<null>(
    `/locations/${encodeURIComponent(locationId)}/modes/${encodeURIComponent(modeId)}`,
    { method: 'DELETE' },
  )

/** 현재 모드 조회 */
export const getCurrentMode = (locationId: string) =>
  apiFetch<Mode>(`/locations/${encodeURIComponent(locationId)}/modes/current`)

/** 현재 모드 설정. body 는 { modeId }. */
export const setCurrentMode = (locationId: string, modeId: string) =>
  apiFetch<Mode>(`/locations/${encodeURIComponent(locationId)}/modes/current`, {
    method: 'PUT',
    body: JSON.stringify({ modeId }),
  })
