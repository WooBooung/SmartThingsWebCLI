// Hub Log 도구 전용 API 헬퍼.
//
// 이 도구는 SmartThings 표준 REST(api.smartthings.com)만 사용한다.
// 허브 로컬 IP 로의 직접 접속이나 로그 스트리밍(EventSource/WebSocket)은 하지 않는다.
// 원본(X:\smartthings\hublog) 은 CLI 명령(`smartthings edge:drivers:logcat ...`)을
// "생성"해서 복사하게 하는 커맨드 생성기이며, 실제 로그 스트리밍은 사용자가
// 같은 LAN 의 터미널에서 CLI 로 실행한다.
//
// 표준 엔드포인트는 stClient 의 공용 헬퍼(listLocations / getDevice)를 재사용하고,
// 비표준 엔드포인트(/hubdevices/{hubId}/drivers)와 허브 상세 파싱만 여기서 다룬다.

import { apiFetch, listDevices, getDevice } from '@/lib/stClient'
import type { Device } from '@/lib/types'

/** 허브에서 추출한 표시용 정보 */
export interface HubInfo {
  deviceId: string
  label: string
  ip: string | null
  eui: string | null
  serialNumber: string | null
  version: string | null
}

/** /hubdevices/{hubId}/drivers 응답 항목 (필요한 필드만) */
export interface HubDriver {
  driverId: string
  name: string
  [key: string]: unknown
}

/** 허브 상세 응답의 hub 블록 (느슨하게) */
interface HubDetail extends Device {
  hub?: {
    hubData?: {
      localIP?: string
      zigbeeEui?: string
      serialNumber?: string
      firmwareVersion?: string
    }
    zigbeeId?: string
    serialNumber?: string
    firmwareVersion?: string
  }
}

/** 특정 location 의 허브(type=HUB) 디바이스 목록 */
export async function listHubs(locationId: string): Promise<Device[]> {
  const res = await listDevices({ locationId, type: 'HUB' })
  return res.items ?? []
}

/**
 * 허브 디바이스 상세를 조회해 표시용 정보(IP/EUI/시리얼/펌웨어)를 추출한다.
 * 상세 조회 실패 시에도 label/deviceId 만 채운 기본값을 반환한다.
 */
export async function getHubInfo(hub: Device): Promise<HubInfo> {
  const base: HubInfo = {
    deviceId: hub.deviceId,
    label: hub.label || hub.name || hub.deviceId,
    ip: null,
    eui: null,
    serialNumber: null,
    version: null,
  }
  try {
    const detail = (await getDevice(hub.deviceId)) as HubDetail
    const h = detail.hub ?? {}
    const hd = h.hubData ?? {}
    base.ip = hd.localIP ?? null
    base.eui = hd.zigbeeEui ?? h.zigbeeId ?? null
    base.serialNumber = hd.serialNumber ?? h.serialNumber ?? null
    base.version = hd.firmwareVersion ?? h.firmwareVersion ?? null
  } catch {
    /* 상세 정보 실패해도 기본값으로 계속 진행 */
  }
  return base
}

/**
 * 허브에 설치된 Edge 드라이버 목록.
 * 비표준 엔드포인트: GET /hubdevices/{hubId}/drivers (배열 반환)
 */
export async function listHubDrivers(hubId: string): Promise<HubDriver[]> {
  const drivers = await apiFetch<HubDriver[]>(`/hubdevices/${hubId}/drivers`)
  return Array.isArray(drivers) ? drivers : []
}
