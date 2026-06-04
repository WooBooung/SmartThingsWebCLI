// Locations / Rooms 전용 API 헬퍼 + 타입.
// 엔드포인트는 @smartthings/core-sdk (src/endpoint/locations.ts, rooms.ts, history.ts) 로 검증.
//  - Locations: GET/POST /locations, GET/PUT/DELETE /locations/{id}
//  - Rooms:     GET/POST /locations/{id}/rooms, GET/PUT/DELETE /locations/{id}/rooms/{roomId}
//  - History:   GET /history/devices?locationId=&limit=  (SDK 는 location 단위 history 를
//               별도 path 로 노출하지 않고, /history/devices 에 locationId 만 주면 그 위치의
//               전체 디바이스 이벤트를 반환한다)
import { apiFetch } from '@/lib/stClient'
import type { ListResponse } from '@/lib/types'

// --- 타입 (공유 types.ts 수정 금지 → 여기 정의) ---

export interface LocationDetail {
  locationId: string
  name: string
  countryCode?: string
  latitude?: number
  longitude?: number
  regionRadius?: number
  temperatureScale?: string
  timeZoneId?: string
  locale?: string
  // 그 외 필드는 원본 JSON 으로 표시하므로 느슨하게 허용
  [key: string]: unknown
}

export interface RoomDetail {
  roomId: string
  locationId?: string
  name: string
  backgroundImage?: string
  created?: string
  lastModified?: string
  [key: string]: unknown
}

// --- Locations ---

export const listLocationsFull = () => apiFetch<ListResponse<LocationDetail>>('/locations')

export const getLocation = (locationId: string) =>
  apiFetch<LocationDetail>(`/locations/${locationId}`)

export const createLocation = (body: string) =>
  apiFetch<LocationDetail>('/locations', { method: 'POST', body })

export const updateLocation = (locationId: string, body: string) =>
  apiFetch<LocationDetail>(`/locations/${locationId}`, { method: 'PUT', body })

export const deleteLocation = (locationId: string) =>
  apiFetch<null>(`/locations/${locationId}`, { method: 'DELETE' })

// locations:history — 해당 위치의 디바이스 이벤트 이력 (locationId 기준)
export const getLocationHistory = (locationId: string, limit = 20) =>
  apiFetch<{ items: Record<string, unknown>[] }>(
    `/history/devices?${new URLSearchParams({ locationId, limit: String(limit) }).toString()}`,
  )

// --- Rooms (위치 하위) ---

export const listLocationRooms = (locationId: string) =>
  apiFetch<ListResponse<RoomDetail>>(`/locations/${locationId}/rooms`)

export const getRoom = (locationId: string, roomId: string) =>
  apiFetch<RoomDetail>(`/locations/${locationId}/rooms/${roomId}`)

export const createRoom = (locationId: string, body: string) =>
  apiFetch<RoomDetail>(`/locations/${locationId}/rooms`, { method: 'POST', body })

export const updateRoom = (locationId: string, roomId: string, body: string) =>
  apiFetch<RoomDetail>(`/locations/${locationId}/rooms/${roomId}`, { method: 'PUT', body })

export const deleteRoom = (locationId: string, roomId: string) =>
  apiFetch<null>(`/locations/${locationId}/rooms/${roomId}`, { method: 'DELETE' })
