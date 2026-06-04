import { apiFetch } from '@/lib/stClient'

// ---------------------------------------------------------------------------
// devices 제어/관리 전용 API 헬퍼.
// 엔드포인트는 @smartthings/core-sdk src/endpoint/devices.ts 소스로 검증함:
//   executeCommands  -> POST {id}/commands  { commands: [...] }
//   update           -> PUT  {id}           { label?, locationId?, roomId? }
//   getPreferences   -> GET  {id}/preferences
//   getCapabilityStatus -> GET {id}/components/{componentId}/capabilities/{capabilityId}/status
//   getComponentStatus  -> GET {id}/components/{componentId}/status
// ---------------------------------------------------------------------------

// --- 타입 -----------------------------------------------------------------

/** capability 스키마의 command argument 의 JSON Schema (필요한 부분만). */
export interface CommandArgSchema {
  type?: string
  enum?: string[]
  minimum?: number
  maximum?: number
  minLength?: number
  maxLength?: number
  title?: string
  items?: CommandArgSchema | CommandArgSchema[]
  properties?: Record<string, CommandArgSchema>
  [key: string]: unknown
}

/** capability command 의 단일 argument 정의. */
export interface CommandArgument {
  name: string
  optional?: boolean
  schema: CommandArgSchema
}

/** capability command 정의. */
export interface CommandDef {
  name: string
  arguments?: CommandArgument[]
}

/** GET /capabilities/{id}/1 응답 중 commands 부분 (나머지는 느슨하게 허용). */
export interface CapabilityCommandsSchema {
  id?: string
  commands?: Record<string, CommandDef>
  [key: string]: unknown
}

/** POST /devices/{id}/commands body 의 단일 command. */
export interface DeviceCommand {
  component: string
  capability: string
  command: string
  arguments?: unknown[]
}

/** PUT /devices/{id} body. */
export interface DeviceUpdateBody {
  label?: string
  roomId?: string
}

/** GET /devices/{id}/preferences 응답. */
export interface DevicePreferencesResponse {
  values?: Record<string, { value?: unknown; preferenceType?: string; [key: string]: unknown }>
  [key: string]: unknown
}

// --- 엔드포인트 헬퍼 -------------------------------------------------------

/** capability 스키마(commands 포함) 조회. GET /capabilities/{id}/1 */
export const getCapabilityCommands = (capabilityId: string, version = 1) =>
  apiFetch<CapabilityCommandsSchema>(`/capabilities/${capabilityId}/${version}`)

/** 디바이스에 명령 실행. POST /devices/{id}/commands */
export const executeDeviceCommands = (deviceId: string, commands: DeviceCommand[]) =>
  apiFetch<Record<string, unknown>>(`/devices/${deviceId}/commands`, {
    method: 'POST',
    body: JSON.stringify({ commands }),
  })

/** 디바이스 label/roomId 변경(rename/update). PUT /devices/{id} */
export const updateDevice = (deviceId: string, body: DeviceUpdateBody) =>
  apiFetch<Record<string, unknown>>(`/devices/${deviceId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })

/** 디바이스 preferences 조회. GET /devices/{id}/preferences */
export const getDevicePreferences = (deviceId: string) =>
  apiFetch<DevicePreferencesResponse>(`/devices/${deviceId}/preferences`)

/** capability status 조회. GET /devices/{id}/components/{componentId}/capabilities/{capabilityId}/status */
export const getCapabilityStatus = (deviceId: string, componentId: string, capabilityId: string) =>
  apiFetch<Record<string, unknown>>(
    `/devices/${deviceId}/components/${componentId}/capabilities/${capabilityId}/status`,
  )

/** component status 조회. GET /devices/{id}/components/{componentId}/status */
export const getComponentStatus = (deviceId: string, componentId: string) =>
  apiFetch<Record<string, unknown>>(`/devices/${deviceId}/components/${componentId}/status`)
