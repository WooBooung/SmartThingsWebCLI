// ST Schema Connector 앱 전용 API 헬퍼 (SchemaView / InstalledSchemaView / SchemaInvitesView 공용).
//
// CLI 대응:
//   schema [id] / schema:create / schema:update [id] / schema:delete [id] / schema:regenerate [id]
//   installedschema [id] / installedschema:delete [id]
//   invites:schema [id] / invites:schema:create / invites:schema:delete [id]
//
// 중요: ST Schema / InvitesSchema REST 는 표준 device API 와 달리 `/v1` 하위가 아니라
// 호스트 루트의 `/schema` · `/invites/schemaApp` 경로에 위치한다.
// (출처: @smartthings/core-sdk endpoint/schema.ts, endpoint/invites-schemaApp.ts —
//  EndpointClient basePath 가 각각 'schema', 'invites/schemaApp' 이고 baseURL 은
//  https://api.smartthings.com. URL = `${baseURL}/${basePath}/${path}`.)
// 따라서 apiFetch(=/v1 base) 를 쓸 수 없어 channels.ts 의 inviteFetch 패턴을 따라
// /v1 을 제거한 호스트 루트로 직접 fetch 한다.

import { ApiError } from '@/lib/stClient'
import { useTokenStore } from '@/stores/token'
import { listLocations } from '@/lib/stClient'

// apiFetch 의 base 에서 끝의 /v1 을 제거한 호스트 루트.
const ROOT_BASE = (import.meta.env.VITE_ST_API_BASE ?? 'https://api.smartthings.com/v1').replace(
  /\/v1\/?$/,
  '',
)

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

/**
 * 호스트 루트(/schema, /invites/...) 직접 호출용 fetch.
 * apiFetch 와 동일한 규약: body 있으면 JSON Content-Type 자동, 204/202 → null, 비-OK → ApiError.
 */
async function rootFetch<T = unknown>(path: string, opts: RequestInit = {}): Promise<T> {
  const pat = useTokenStore().pat
  if (!pat) throw new ApiError(401, 'PAT 토큰이 설정되지 않았습니다.')
  const headers: Record<string, string> = {
    ...(opts.headers as Record<string, string> | undefined),
    Authorization: `Bearer ${pat}`,
  }
  if (opts.body != null) headers['Content-Type'] = 'application/json'

  const res = await fetch(`${ROOT_BASE}${path}`, { ...opts, headers })
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

// ----------------------------------------------------------------------------
// 타입 (이 도구군 전용)
// ----------------------------------------------------------------------------

/** ST Schema 커넥터(엔드포인트 앱). 그 외 필드는 원본 JSON 그대로 노출. */
export interface SchemaApp {
  endpointAppId?: string
  appName?: string
  partnerName?: string
  schemaType?: string
  hostingType?: string
  certificationStatus?: string
  stClientId?: string
  organizationId?: string
  userEmail?: string
  [key: string]: unknown
}

/** GET /schema/apps 응답 래퍼. */
interface SchemaAppList {
  userId?: string
  endpointApps?: SchemaApp[]
}

/** create / regenerate 응답 — clientId/secret 1회 노출. */
export interface SchemaCreateResponse {
  endpointAppId?: string
  stClientId?: string
  stClientSecret?: string
  [key: string]: unknown
}

export interface DeviceResult {
  deviceId?: string
  name?: string
}

/** 설치된 ST Schema 커넥터 인스턴스. */
export interface InstalledSchemaApp {
  isaId?: string
  appName?: string
  partnerName?: string
  partnerSTConnection?: string
  locationId?: string
  icon?: string
  devices?: DeviceResult[]
  [key: string]: unknown
}

/** GET /schema/installedapps/location/{id} 응답 래퍼. */
interface InstalledSchemaAppList {
  userId?: string
  installedSmartApps?: InstalledSchemaApp[]
}

/** Schema 앱 초대. */
export interface SchemaAppInvitation {
  id?: string
  invitationId?: string
  schemaAppId?: string
  description?: string
  expiration?: number
  acceptUrl?: string
  acceptances?: number
  shortCode?: string
  [key: string]: unknown
}

interface SchemaInvitationList {
  items?: SchemaAppInvitation[]
}

export interface CreateSchemaInviteInput {
  schemaAppId: string
  description?: string
  acceptLimit?: number
}

// ----------------------------------------------------------------------------
// Schema 커넥터 (basePath: /schema)
// ----------------------------------------------------------------------------

/** ST Schema 커넥터 목록. */
export async function listSchemaApps(): Promise<SchemaApp[]> {
  const res = await rootFetch<SchemaAppList>('/schema/apps')
  return res?.endpointApps ?? []
}

/** 단일 커넥터 조회. */
export const getSchemaApp = (id: string) => rootFetch<SchemaApp>(`/schema/apps/${id}`)

/** 커넥터 생성. 정규화된 JSON 문자열 본문. clientId/secret 1회 반환. */
export const createSchemaApp = (body: string) =>
  rootFetch<SchemaCreateResponse>('/schema/apps', { method: 'POST', body })

/** 커넥터 수정. 성공 시 빈 본문(→ null) 을 반환할 수 있다. */
export const updateSchemaApp = (id: string, body: string) =>
  rootFetch<SchemaApp | null>(`/schema/apps/${id}`, { method: 'PUT', body })

/** 커넥터 삭제. */
export const deleteSchemaApp = (id: string) =>
  rootFetch<null>(`/schema/apps/${id}`, { method: 'DELETE' })

/**
 * OAuth clientId/secret 재발급. 기존 값은 즉시 무효화된다.
 * POST /schema/oauth/stclient/credentials body { endpointAppId }.
 */
export const regenerateSchemaOauth = (id: string) =>
  rootFetch<SchemaCreateResponse>('/schema/oauth/stclient/credentials', {
    method: 'POST',
    body: JSON.stringify({ endpointAppId: id }),
  })

// ----------------------------------------------------------------------------
// Installed Schema (basePath: /schema/installedapps)
// ----------------------------------------------------------------------------

/** 특정 location 의 설치된 schema 인스턴스. */
export async function listInstalledSchemaByLocation(locationId: string): Promise<InstalledSchemaApp[]> {
  const res = await rootFetch<InstalledSchemaAppList>(`/schema/installedapps/location/${locationId}`)
  return res?.installedSmartApps ?? []
}

/**
 * 전체 설치 schema 인스턴스 목록.
 * REST 가 location 단위라 모든 location 을 순회해 합친다 (CLI installedSchemaInstances 동일).
 */
export async function listInstalledSchemaApps(): Promise<InstalledSchemaApp[]> {
  const locations = await listLocations()
  const ids = (locations.items ?? []).map((l) => l.locationId)
  const perLocation = await Promise.all(ids.map((id) => listInstalledSchemaByLocation(id)))
  return perLocation.flat()
}

/** 단일 설치 인스턴스 조회 (생성된 device 목록 포함). */
export const getInstalledSchemaApp = (id: string) =>
  rootFetch<InstalledSchemaApp>(`/schema/installedapps/${id}`)

/** 설치 인스턴스 삭제. 이 인스턴스가 만든 device 도 함께 삭제된다. */
export const deleteInstalledSchemaApp = (id: string) =>
  rootFetch<null>(`/schema/installedapps/${id}`, { method: 'DELETE' })

// ----------------------------------------------------------------------------
// Schema 앱 초대 (basePath: /invites/schemaApp)
// ----------------------------------------------------------------------------

/** 특정 schema 앱의 초대 목록. (권한 없으면 CLI 와 동일하게 403 → 빈 배열) */
export async function listSchemaInvites(schemaAppId: string): Promise<SchemaAppInvitation[]> {
  try {
    const res = await rootFetch<SchemaInvitationList | SchemaAppInvitation[]>(
      `/invites/schemaApp?schemaAppId=${encodeURIComponent(schemaAppId)}`,
    )
    if (Array.isArray(res)) return res
    return res?.items ?? []
  } catch (e) {
    if (e instanceof ApiError && e.status === 403) return []
    throw e
  }
}

/** 단일 초대 조회. */
export const getSchemaInvite = (invitationId: string) =>
  rootFetch<SchemaAppInvitation>(`/invites/schemaApp/${invitationId}`)

/** 초대 생성. POST /invites/schemaApp body { schemaAppId, description?, acceptLimit? }. */
export const createSchemaInvite = (input: CreateSchemaInviteInput) =>
  rootFetch<{ invitationId?: string } & Record<string, unknown>>('/invites/schemaApp', {
    method: 'POST',
    body: JSON.stringify({
      schemaAppId: input.schemaAppId,
      ...(input.description != null ? { description: input.description } : {}),
      ...(input.acceptLimit != null ? { acceptLimit: input.acceptLimit } : {}),
    }),
  })

/** 초대 삭제(취소). */
export const deleteSchemaInvite = (invitationId: string) =>
  rootFetch<null>(`/invites/schemaApp/${invitationId}`, { method: 'DELETE' })
