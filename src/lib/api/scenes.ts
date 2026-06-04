import { apiFetch } from '@/lib/stClient'
import type { ListResponse } from '@/lib/types'

/**
 * SmartThings Scenes 엔드포인트 헬퍼.
 * core-sdk endpoint/scenes.ts 기준:
 *  - GET  /scenes?locationId={id}   (locationId 생략 시 전체)
 *  - POST /scenes/{sceneId}/execute (빈 본문)
 * 참고: https://developer.smartthings.com/docs/api/public/#tag/Scenes
 */

export interface Scene {
  sceneId: string
  sceneName?: string
  locationId?: string
  sceneIcon?: string
  sceneColor?: string
  createdBy?: string
  createdDate?: string
  lastUpdatedDate?: string
  lastExecutedDate?: string
  [key: string]: unknown
}

/** 씬 목록. locationId 가 있으면 해당 위치로 필터한다. */
export const listScenes = (locationId?: string) => {
  const qs = locationId ? `?${new URLSearchParams({ locationId }).toString()}` : ''
  return apiFetch<ListResponse<Scene>>(`/scenes${qs}`)
}

/**
 * 씬 실행. POST /scenes/{sceneId}/execute (본문 없음).
 * 응답은 { status: 'success' } 형태.
 */
export const executeScene = (sceneId: string) =>
  apiFetch<{ status?: string }>(`/scenes/${encodeURIComponent(sceneId)}/execute`, {
    method: 'POST',
  })
