import { apiFetch, ApiError, listLocations } from '@/lib/stClient'
import type { ListResponse } from '@/lib/types'

// ─── 타입 (이 도구 전용) ──────────────────────────────────────────────────

/** /hubdevices/{hubId}/drivers 항목 (느슨하게 허용) */
export interface InstalledDriver {
  driverId: string
  name?: string
  version?: string
  channelId?: string
  [key: string]: unknown
}

/** /hubdevices/{hubId}/channels 의 enrolled 채널 항목 */
export interface EnrolledChannel {
  channelId: string
  name?: string
  [key: string]: unknown
}

/** 화면에서 다루는 hub 엔트리 */
export interface HubEntry {
  hubId: string
  hubName: string
  locationId: string
  locationName: string
}

/** 채널별로 그룹핑된 설치 드라이버 1건 (어느 허브/위치에 깔렸는지 포함) */
export interface DriverPlacement {
  driverId: string
  name: string
  version: string
  hubId: string
  hubName: string
  locationId: string
  locationName: string
}

/** 채널 단위 묶음 */
export interface ChannelGroup {
  channelId: string
  name: string
  detail?: Record<string, unknown>
  drivers: DriverPlacement[]
}

// ─── 엔드포인트 헬퍼 ──────────────────────────────────────────────────────

/** 한 위치의 허브(type=HUB) 디바이스 목록. 공용 listDevices 는 locationId+type 동시 표현이 가능하므로 직접 구성. */
function listHubsInLocation(locationId: string) {
  const qs = new URLSearchParams({ locationId, type: 'HUB' })
  return apiFetch<ListResponse<{ deviceId: string; name?: string; label?: string }>>(
    `/devices?${qs.toString()}`,
  )
}

/** 허브에 설치된 드라이버 목록 */
export const listHubDrivers = (hubId: string) =>
  apiFetch<InstalledDriver[]>(`/hubdevices/${hubId}/drivers`)

/** 허브가 등록(enroll)된 채널 목록 */
export const listHubChannels = (hubId: string) =>
  apiFetch<EnrolledChannel[] | ListResponse<EnrolledChannel>>(`/hubdevices/${hubId}/channels`)

/** 배포 채널 상세 */
export const getDistChannel = (channelId: string) =>
  apiFetch<Record<string, unknown>>(`/distchannels/${channelId}`)

/** 드라이버 상세(전역) */
export const getDriver = (driverId: string) =>
  apiFetch<Record<string, unknown>>(`/drivers/${driverId}`)

/** 허브를 채널에 등록(이미 등록 시 409 → 정상으로 처리). */
export async function enrollHubInChannel(channelId: string, hubId: string): Promise<void> {
  try {
    await apiFetch(`/distchannels/${channelId}/hubs/${hubId}`, { method: 'POST' })
  } catch (e) {
    // 이미 등록된 경우 409 → 무시
    if (e instanceof ApiError && e.status === 409) return
    throw e
  }
}

/** 드라이버를 (재)설치 → 채널의 최신 버전으로 강제 설치 */
export const installHubDriver = (hubId: string, driverId: string, channelId: string) =>
  apiFetch<Record<string, unknown> | null>(`/hubdevices/${hubId}/drivers/${driverId}`, {
    method: 'PUT',
    body: JSON.stringify({ channelId }),
  })

/** 허브에서 드라이버 삭제 */
export const deleteHubDriver = (hubId: string, driverId: string) =>
  apiFetch<null>(`/hubdevices/${hubId}/drivers/${driverId}`, { method: 'DELETE' })

// ─── 전체 스캔: 모든 위치/허브의 설치 드라이버를 채널별로 묶기 ─────────────

const UUID_LIKE = /^[0-9a-f-]{36}$/i

/**
 * 모든 위치 → 허브를 훑어 설치된 드라이버를 채널별로 그룹핑한다.
 * (원본 drivers.js loadAllHubData 동작과 동일)
 */
export async function scanChannelGroups(): Promise<ChannelGroup[]> {
  const locData = await listLocations()
  const locations = locData.items ?? []

  // 위치별 허브 수집
  const hubLists = await Promise.all(
    locations.map(async (loc) => {
      try {
        const hubData = await listHubsInLocation(loc.locationId)
        return (hubData.items ?? []).map<HubEntry>((hub) => ({
          hubId: hub.deviceId,
          hubName: hub.label || hub.name || hub.deviceId,
          locationId: loc.locationId,
          locationName: loc.name,
        }))
      } catch {
        return [] as HubEntry[]
      }
    }),
  )
  const hubEntries = hubLists.flat()

  const groups: Record<string, ChannelGroup> = {}

  // 각 허브: 설치 드라이버 + 등록 채널
  await Promise.all(
    hubEntries.map(async ({ hubId, hubName, locationId, locationName }) => {
      let drivers: InstalledDriver[] = []
      let channels: EnrolledChannel[] = []
      try {
        const [d, c] = await Promise.all([listHubDrivers(hubId), listHubChannels(hubId)])
        drivers = Array.isArray(d) ? d : []
        channels = Array.isArray(c) ? c : (c?.items ?? [])
      } catch {
        return
      }

      const channelNameMap: Record<string, string> = {}
      channels.forEach((ch) => {
        if (ch.channelId) channelNameMap[ch.channelId] = ch.name ?? ch.channelId
      })

      drivers.forEach((driver) => {
        const cid = driver.channelId
        if (!cid) return
        if (!groups[cid]) {
          groups[cid] = { channelId: cid, name: channelNameMap[cid] || cid, drivers: [] }
        }
        groups[cid].drivers.push({
          driverId: driver.driverId,
          name: driver.name || driver.driverId,
          version: driver.version ?? '',
          hubId,
          hubName,
          locationId,
          locationName,
        })
      })
    }),
  )

  const channelIds = Object.keys(groups)
  if (channelIds.length === 0) return []

  // 채널명 미해석(raw id)분은 distchannels 상세로 보강
  await Promise.all(
    channelIds.map(async (cid) => {
      try {
        const ch = await getDistChannel(cid)
        const name = ch?.['name']
        if (typeof name === 'string' && name) groups[cid].name = name
        groups[cid].detail = ch
      } catch {
        /* 기존 값 유지 */
      }
    }),
  )

  return channelIds
    .map((cid) => groups[cid])
    .sort((a, b) => {
      // 이름으로 정렬하되 raw uuid 만 남은 건 뒤로
      const an = UUID_LIKE.test(a.name) ? 1 : 0
      const bn = UUID_LIKE.test(b.name) ? 1 : 0
      if (an !== bn) return an - bn
      return a.name.localeCompare(b.name)
    })
}
