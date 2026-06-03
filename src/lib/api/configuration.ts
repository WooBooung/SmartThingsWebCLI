import { apiFetch } from '@/lib/stClient'

/** SmartThings device configuration (presentation/deviceconfig) 엔드포인트 헬퍼 */

export interface DeviceConfigQuery {
  presentationId: string
  /** 선택. vid 와 함께 쓰이는 제조사 식별자 */
  manufacturerName?: string
}

/**
 * presentationId(+선택 manufacturerName) 로 기존 device configuration 을 조회한다.
 * GET /presentation/deviceconfig?presentationId=...&manufacturerName=...
 */
export function getDeviceConfig(query: DeviceConfigQuery): Promise<Record<string, unknown>> {
  const params = new URLSearchParams({ presentationId: query.presentationId })
  if (query.manufacturerName) params.set('manufacturerName', query.manufacturerName)
  return apiFetch<Record<string, unknown>>(`/presentation/deviceconfig?${params.toString()}`)
}

/**
 * 새 device configuration 을 생성한다. 응답에 presentationId/manufacturerName 이 부여된다.
 * POST /presentation/deviceconfig
 * @param body JSON 문자열 (parseJsonOrYaml 로 정규화된 것)
 */
export function createDeviceConfig(body: string): Promise<Record<string, unknown>> {
  return apiFetch<Record<string, unknown>>('/presentation/deviceconfig', { method: 'POST', body })
}

/**
 * deviceProfileId 로 device configuration 을 자동 생성(미리보기)한다.
 * CLI: presentation:device-config:generate <profileId>
 * GET /presentation/types/{profileId}/deviceconfig
 * (core-sdk PresentationEndpoint.generate: basePath 'presentation' + 'types/{id}/deviceconfig')
 */
export function generateDeviceConfig(profileId: string): Promise<Record<string, unknown>> {
  return apiFetch<Record<string, unknown>>(
    `/presentation/types/${encodeURIComponent(profileId)}/deviceconfig`,
  )
}
