import { apiFetch } from '@/lib/stClient'
import type { ListResponse } from '@/lib/types'

// --- 타입 -----------------------------------------------------------------

/** /virtualdevices 응답 항목 (필요한 필드만, 나머지는 느슨하게 허용) */
export interface VirtualDevice {
  deviceId: string
  label?: string
  name?: string
  locationId?: string
  [key: string]: unknown
}

/** capability attribute 의 value JSON Schema (필요한 부분만) */
export interface ValueSchema {
  type?: string
  enum?: unknown[]
  minimum?: number
  maximum?: number
  multipleOf?: number
  [key: string]: unknown
}

/** capability attribute 정의 */
export interface AttributeDef {
  schema?: {
    properties?: {
      value?: ValueSchema
      unit?: { enum?: string[] }
      [key: string]: unknown
    }
  }
  enumNames?: Record<string, string>
  setter?: string
  [key: string]: unknown
}

/** GET /capabilities/{id}/1 스키마 */
export interface CapabilitySchema {
  id?: string
  attributes?: Record<string, AttributeDef>
  [key: string]: unknown
}

/** POST /virtualdevices/{id}/events body 의 단일 이벤트 */
export interface DeviceEvent {
  value: unknown
  component: string
  capability: string
  attribute: string
  unit: string | null
  data: null
}

// --- 엔드포인트 헬퍼 -------------------------------------------------------

/** 가상 디바이스 목록 조회 (GET /virtualdevices). 위치 이름은 /locations 로 별도 해석한다. */
export const listVirtualDevices = () =>
  apiFetch<ListResponse<VirtualDevice>>('/virtualdevices')

/** capability 스키마 조회 (GET /capabilities/{id}/1). */
export const getCapabilitySchema = (capabilityId: string, version = 1) =>
  apiFetch<CapabilitySchema>(`/capabilities/${capabilityId}/${version}`)

/** 가상 디바이스로 이벤트 전송 (POST /virtualdevices/{id}/events). */
export const sendVirtualDeviceEvents = (deviceId: string, deviceEvents: DeviceEvent[]) =>
  apiFetch<Record<string, unknown>>(`/virtualdevices/${deviceId}/events`, {
    method: 'POST',
    body: JSON.stringify({ deviceEvents }),
  })
