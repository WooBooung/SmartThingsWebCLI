import { apiFetch } from '@/lib/stClient'
import { ApiError } from '@/lib/stClient'
import { useTokenStore } from '@/stores/token'
import type { ListResponse } from '@/lib/types'

/** 한 위치의 HUB 타입 디바이스(표시용) */
export interface Hub {
  deviceId: string
  name?: string
  label?: string
}

/** 위치의 HUB 타입 디바이스 목록 */
export const listHubs = (locationId: string) =>
  apiFetch<ListResponse<Hub>>(
    `/devices?locationId=${encodeURIComponent(locationId)}&type=HUB`,
  )

// --- 타입 (이 도구 전용) ---

export interface Channel {
  channelId: string
  name: string
  description?: string
  type?: string
  termsOfServiceUrl?: string
  createdDate?: string
  lastModifiedDate?: string
  [key: string]: unknown
}

export interface Driver {
  driverId: string
  name: string
  version: string
  [key: string]: unknown
}

/** distchannels/{id}/drivers 에 할당된 드라이버 항목 */
export interface AssignedDriver {
  driverId: string
  version: string
  channelId?: string
  [key: string]: unknown
}

export interface Invite {
  id: string
  acceptUrl?: string
  invitationUrl?: string
  [key: string]: unknown
}

export interface CreateChannelInput {
  name: string
  description: string
  termsOfServiceUrl: string
}

export interface CreateInviteInput {
  channelId: string
  name: string
  description: string
  owner: string
  termsUrl: string
}

// ----------------------------------------------------------------------------
// Edge Channel / Driver — 표준 ST API (/v1, apiFetch 사용)
// ----------------------------------------------------------------------------

export const listChannels = () =>
  apiFetch<ListResponse<Channel>>('/distchannels?type=DRIVER')

export const getChannel = (channelId: string) =>
  apiFetch<Channel>(`/distchannels/${channelId}`)

export const createChannel = (input: CreateChannelInput) =>
  apiFetch<Channel>('/distchannels', {
    method: 'POST',
    body: JSON.stringify({
      name: input.name,
      description: input.description,
      type: 'DRIVER',
      termsOfServiceUrl: input.termsOfServiceUrl,
    }),
  })

/** 편집기 본문(정규화된 JSON 문자열)으로 채널 전체를 갱신한다. */
export const updateChannel = (channelId: string, body: string) =>
  apiFetch<Channel>(`/distchannels/${channelId}`, { method: 'PUT', body })

export const deleteChannel = (channelId: string) =>
  apiFetch<null>(`/distchannels/${channelId}`, { method: 'DELETE' })

/** 계정의 모든 Edge 드라이버 */
export const listDrivers = () => apiFetch<ListResponse<Driver>>('/drivers')

/** 특정 채널에 할당된 드라이버 */
export const listAssignedDrivers = (channelId: string) =>
  apiFetch<ListResponse<AssignedDriver>>(`/distchannels/${channelId}/drivers`)

export const assignDriver = (channelId: string, driverId: string, version: string) =>
  apiFetch<AssignedDriver>(`/distchannels/${channelId}/drivers`, {
    method: 'POST',
    body: JSON.stringify({ driverId, version }),
  })

export const unassignDriver = (channelId: string, driverId: string) =>
  apiFetch<null>(`/distchannels/${channelId}/drivers/${driverId}`, { method: 'DELETE' })

/**
 * 채널에 할당된 드라이버의 메타정보(편집기/패키지 정보 등).
 * core-sdk: GET distchannels/{channelId}/drivers/{driverId}/meta
 */
export const getDriverChannelMetaInfo = (channelId: string, driverId: string) =>
  apiFetch<Record<string, unknown>>(`/distchannels/${channelId}/drivers/${driverId}/meta`)

// ----------------------------------------------------------------------------
// 허브 enroll / unenroll / enrollments — core-sdk channels.ts & hubdevices.ts 검증
// ----------------------------------------------------------------------------

/** 한 채널에 enroll 된 허브 목록(표시용, 느슨하게) */
export interface EnrolledHub {
  hubId?: string
  deviceId?: string
  name?: string
  label?: string
  [key: string]: unknown
}

/** 허브가 enroll 된 채널 항목(GET /hubdevices/{hubId}/channels) */
export interface HubEnrolledChannel {
  channelId: string
  name?: string
  [key: string]: unknown
}

/**
 * 허브를 채널에 등록(enroll).
 * core-sdk: POST distchannels/{channelId}/hubs/{hubId}
 * 이미 등록되어 있으면 409 가 떨어지므로 호출부에서 허용.
 */
export const enrollHub = (channelId: string, hubId: string) =>
  apiFetch<Record<string, unknown> | null>(`/distchannels/${channelId}/hubs/${hubId}`, {
    method: 'POST',
  })

/**
 * 허브를 채널에서 등록 해제(unenroll).
 * core-sdk: DELETE distchannels/{channelId}/hubs/{hubId}
 */
export const unenrollHub = (channelId: string, hubId: string) =>
  apiFetch<null>(`/distchannels/${channelId}/hubs/${hubId}`, { method: 'DELETE' })

/**
 * 허브가 enroll 된 (DRIVER) 채널 목록.
 * core-sdk hubdevices.enrolledChannels: GET hubdevices/{hubId}/channels?channelType=DRIVERS
 * (배열 또는 {items} 형태 모두 대응)
 */
export const listHubEnrollments = (hubId: string) =>
  apiFetch<HubEnrolledChannel[] | ListResponse<HubEnrolledChannel>>(
    `/hubdevices/${hubId}/channels?channelType=DRIVERS`,
  )

// ----------------------------------------------------------------------------
// Invites — invitation-service 는 /v1 이 아닌 호스트 루트에 위치하므로
// apiFetch(=/v1 base) 를 쓸 수 없다. 동일 PAT 로 별도 fetch 한다.
// ----------------------------------------------------------------------------

// apiFetch 의 base 에서 /v1 를 제거한 invitation-service 루트.
const INVITE_BASE = (import.meta.env.VITE_ST_API_BASE ?? 'https://api.smartthings.com/v1').replace(
  /\/v1\/?$/,
  '',
)

// 채널 초대 생성 시 사용하는 SmartThings 표준 profileId (원본 동일).
const INVITE_PROFILE_ID = '61a79569-e8fd-4a4d-9b9c-a4a55ccdd15e'

async function inviteFetch<T = unknown>(path: string, opts: RequestInit = {}): Promise<T> {
  const pat = useTokenStore().pat
  if (!pat) throw new ApiError(401, 'PAT 토큰이 설정되지 않았습니다.')
  const headers: Record<string, string> = {
    ...(opts.headers as Record<string, string> | undefined),
    Authorization: `Bearer ${pat}`,
  }
  if (opts.body != null) headers['Content-Type'] = 'application/json'

  const res = await fetch(`${INVITE_BASE}${path}`, { ...opts, headers })
  if (res.status === 204 || res.status === 202) return null as T
  const text = await res.text()
  const body: unknown = text ? safeParse(text) : {}
  if (!res.ok) {
    const message =
      (body && typeof body === 'object' && 'message' in body
        ? (body as { message?: string }).message
        : undefined) ||
      text ||
      res.statusText
    throw new ApiError(res.status, `${res.status} – ${message}`)
  }
  return body as T
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

/** 채널에 연결된 초대 목록 */
export const listInvites = (channelId: string) =>
  inviteFetch<ListResponse<Invite>>(
    `/invites?resource=${encodeURIComponent(`st1:developer::channel/${channelId}`)}`,
  )

export const getInvite = (inviteId: string) => inviteFetch<Invite>(`/invites/${inviteId}`)

export const deleteInvite = (inviteId: string) =>
  inviteFetch<null>(`/invites/${inviteId}`, { method: 'DELETE' })

export const createInvite = (input: CreateInviteInput) =>
  inviteFetch<{ invitationId?: string } & Record<string, unknown>>('/invites', {
    method: 'POST',
    body: JSON.stringify({
      resource: {
        root: { service: 'developer' },
        components: [{ id: input.channelId, kind: 'channel' }],
      },
      profileId: INVITE_PROFILE_ID,
      metadata: {
        name: input.name,
        description: input.description,
        owner: input.owner,
        termsUrl: input.termsUrl,
      },
    }),
  })
