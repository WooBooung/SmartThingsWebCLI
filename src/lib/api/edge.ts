import { apiFetch } from '@/lib/stClient'
import { useTokenStore } from '@/stores/token'
import type { ListResponse } from '@/lib/types'

// SmartThings API 베이스 (apiFetch 와 동일 규칙). 바이너리 업로드는 apiFetch 가
// Content-Type 을 application/json 으로 강제하므로 fetch 를 직접 쓴다.
const BASE = import.meta.env.VITE_ST_API_BASE ?? 'https://api.smartthings.com/v1'

// --- 타입 (이 도구 전용, 공유 types.ts 는 건드리지 않음) ---

export interface EdgeDriver {
  driverId: string
  name: string
  version?: string
  packageKey?: string
  [key: string]: unknown
}

export interface DistChannel {
  channelId: string
  name: string
  description?: string
  [key: string]: unknown
}

export interface InstalledDriver {
  driverId: string
  name: string
  version?: string
  [key: string]: unknown
}

export interface EdgeHub {
  deviceId: string
  label?: string
  name?: string
}

// 미사용 드라이버 BFS 순회용 (driverId 가 들어있는 디바이스 트리)
interface DeviceNode {
  deviceId?: string
  parentDeviceId?: string
  [key: string]: unknown
}

// --- JSON 조회 헬퍼들 (apiFetch 사용 가능) ---

/** 계정에 업로드된 Edge 드라이버 목록 */
export const listDrivers = () => apiFetch<ListResponse<EdgeDriver>>('/drivers')

/** 단일 드라이버 상세 */
export const getDriver = (driverId: string) => apiFetch<EdgeDriver>(`/drivers/${driverId}`)

/** 드라이버 삭제 */
export const deleteDriver = (driverId: string) =>
  apiFetch<null>(`/drivers/${driverId}`, { method: 'DELETE' })

/** 배포 채널 목록 */
export const listChannels = () => apiFetch<ListResponse<DistChannel>>('/distchannels')

/** 드라이버를 채널에 배정 */
export const assignDriverToChannel = (channelId: string, driverId: string, version: string) =>
  apiFetch<Record<string, unknown>>(`/distchannels/${channelId}/drivers`, {
    method: 'POST',
    body: JSON.stringify({ driverId, version }),
  })

/** 허브를 채널에 등록(enroll). 이미 등록되어 있으면 409 가 떨어지므로 호출부에서 허용. */
export const enrollHubInChannel = (channelId: string, hubId: string) =>
  apiFetch<Record<string, unknown>>(`/distchannels/${channelId}/hubs/${hubId}`, { method: 'POST' })

/** 허브에 드라이버 설치 */
export const installDriverToHub = (hubId: string, driverId: string, channelId: string) =>
  apiFetch<Record<string, unknown>>(`/hubdevices/${hubId}/drivers/${driverId}`, {
    method: 'PUT',
    body: JSON.stringify({ channelId }),
  })

/** 허브에 설치된 드라이버 목록 */
export const listHubDrivers = (hubId: string) =>
  apiFetch<InstalledDriver[]>(`/hubdevices/${hubId}/drivers`)

/** 허브에서 드라이버 제거 */
export const deleteHubDriver = (hubId: string, driverId: string) =>
  apiFetch<null>(`/hubdevices/${hubId}/drivers/${driverId}`, { method: 'DELETE' })

/** 위치의 HUB 타입 디바이스 목록 */
export const listHubs = (locationId: string) =>
  apiFetch<ListResponse<EdgeHub>>(`/devices?locationId=${locationId}&type=HUB`)

// --- 드라이버 패키지 업로드 (바이너리, fetch 직접 호출) ---
// 원본: POST /drivers/package, Content-Type: application/zip, body = raw ArrayBuffer.
// apiFetch 는 body 가 있으면 application/json 을 강제하므로 여기서는 쓰지 않는다.

/**
 * .zip 드라이버 패키지를 업로드한다.
 * Content-Type 은 application/zip 으로 명시 (multipart 가 아니라 raw zip 바이너리).
 */
export async function uploadDriverPackage(file: File): Promise<Record<string, unknown>> {
  const pat = useTokenStore().pat
  if (!pat) throw new Error('PAT 토큰이 설정되지 않았습니다.')

  const res = await fetch(`${BASE}/drivers/package`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${pat}`,
      'Content-Type': 'application/zip',
    },
    body: file,
  })

  const text = await res.text()
  let body: unknown = {}
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = text
    }
  }
  if (!res.ok) {
    const message =
      (body && typeof body === 'object' && 'message' in body
        ? (body as { message?: string }).message
        : undefined) ||
      text ||
      res.statusText
    throw new Error(`${res.status} – ${message}`)
  }
  return body as Record<string, unknown>
}

// --- 미사용 드라이버 탐지 (원본 BFS 로직 이식) ---

/**
 * 허브에 설치돼 있으나 어떤 디바이스에도 쓰이지 않는 드라이버를 찾는다.
 * parentDeviceId 역맵을 만들어 hubId 를 루트로 BFS 순회하며 driverId 를 수집한다.
 * (다른 허브의 동일 driverId 혼입 방지 + Matter 브리지 하위 child 누락 방지)
 */
export function findUnusedDrivers(
  hubId: string,
  installed: InstalledDriver[],
  devices: DeviceNode[],
): InstalledDriver[] {
  const byParent = new Map<string, DeviceNode[]>()
  for (const device of devices) {
    const pid = device.parentDeviceId
    if (pid) {
      const arr = byParent.get(pid)
      if (arr) arr.push(device)
      else byParent.set(pid, [device])
    }
  }

  const usedDriverIds = new Set<string>()
  const collectDriverId = (obj: unknown): void => {
    if (typeof obj !== 'object' || obj === null) return
    const rec = obj as Record<string, unknown>
    if (typeof rec.driverId === 'string') usedDriverIds.add(rec.driverId)
    for (const key of Object.keys(rec)) collectDriverId(rec[key])
  }

  const queue: string[] = [hubId]
  while (queue.length > 0) {
    const currentId = queue.shift() as string
    const children = byParent.get(currentId) ?? []
    for (const child of children) {
      collectDriverId(child)
      if (child.deviceId) queue.push(child.deviceId)
    }
  }

  return installed.filter((d) => !usedDriverIds.has(d.driverId))
}
