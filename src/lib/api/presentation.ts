import { apiFetch } from '@/lib/stClient'

/** Device Presentation 조회 쿼리 파라미터 */
export interface PresentationQuery {
  presentationId?: string
  manufacturerName?: string
  deviceId?: string
}

/**
 * Device Presentation 조회.
 * GET /presentation?presentationId=&manufacturerName=&deviceId=
 * 원본 presentation.js 의 getPresentation() 과 동일하게 비어 있지 않은 값만 쿼리에 포함한다.
 * 참고: https://developer.smartthings.com/docs/api/public#tag/Presentations/operation/getDevicePresentation
 */
export function getPresentation(query: PresentationQuery): Promise<Record<string, unknown>> {
  const params = new URLSearchParams()
  if (query.presentationId) params.set('presentationId', query.presentationId)
  if (query.manufacturerName) params.set('manufacturerName', query.manufacturerName)
  if (query.deviceId) params.set('deviceId', query.deviceId)
  const qs = params.toString()
  return apiFetch<Record<string, unknown>>(`/presentation${qs ? `?${qs}` : ''}`)
}
