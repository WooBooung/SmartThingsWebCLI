import { useTokenStore } from '@/stores/token'
import type {
  CapabilityLocale,
  CapabilityNamespace,
  CapabilitySummary,
  Device,
  ListResponse,
  Location,
  Room,
} from '@/lib/types'

// SmartThings API 는 브라우저 CORS(ACAO: *)를 직접 허용하므로 프록시 없이 호출한다.
// 필요 시 VITE_ST_API_BASE 로 게이트웨이 등으로 교체 가능.
const BASE = import.meta.env.VITE_ST_API_BASE ?? 'https://api.smartthings.com/v1'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

function authHeaders(hasBody = false): Record<string, string> {
  const pat = useTokenStore().pat
  if (!pat) throw new ApiError(401, 'PAT 토큰이 설정되지 않았습니다.')
  const h: Record<string, string> = { Authorization: `Bearer ${pat}` }
  if (hasBody) h['Content-Type'] = 'application/json'
  return h
}

/**
 * 공통 fetch 래퍼. 모든 도구가 이걸 통해 ST API 를 호출한다.
 * (기존 rules-api.js 의 apiFetch 패턴을 타입 안전하게 채택)
 */
export async function apiFetch<T = unknown>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { ...authHeaders(opts.body != null), ...(opts.headers as Record<string, string>) },
  })
  if (res.status === 204) return null as T
  const text = await res.text()
  const body = text ? safeParse(text) : {}
  if (!res.ok) {
    const message =
      (body && typeof body === 'object' && 'message' in body && (body as { message?: string }).message) ||
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

// --- 얇은 엔드포인트 헬퍼들 (도구별로 추가) ---

export const listLocations = () => apiFetch<ListResponse<Location>>('/locations')

export const listDevices = (query?: Record<string, string>) => {
  const qs = query ? `?${new URLSearchParams(query).toString()}` : ''
  return apiFetch<ListResponse<Device>>(`/devices${qs}`)
}

export const getDevice = (deviceId: string) => apiFetch<Device>(`/devices/${deviceId}`)

export const getDeviceStatus = (deviceId: string) =>
  apiFetch<Record<string, unknown>>(`/devices/${deviceId}/status`)

export const getDeviceHealth = (deviceId: string) =>
  apiFetch<{ deviceId: string; state?: string; lastUpdatedDate?: string }>(
    `/devices/${deviceId}/health`,
  )

// devices:history — locationId 필수
export const getDeviceHistory = (locationId: string, deviceId: string, limit = 20) =>
  apiFetch<{ items: Record<string, unknown>[] }>(
    `/history/devices?${new URLSearchParams({ locationId, deviceId, limit: String(limit) }).toString()}`,
  )

export const listRooms = (locationId: string) =>
  apiFetch<ListResponse<Room>>(`/locations/${locationId}/rooms`)

// --- Capabilities ---
const CAP_VERSION = 1 // SmartThings capability 는 version 1 만 허용

export const listCapabilityNamespaces = () =>
  apiFetch<CapabilityNamespace[]>('/capabilities/namespaces')

export const listCapabilitiesInNamespace = (namespace: string) =>
  apiFetch<ListResponse<CapabilitySummary>>(`/capabilities/namespaces/${namespace}`)

export const listStandardCapabilities = () =>
  apiFetch<ListResponse<CapabilitySummary>>('/capabilities')

export const getCapability = (id: string, version = CAP_VERSION) =>
  apiFetch<Record<string, unknown>>(`/capabilities/${id}/${version}`)

export const createCapability = (body: string) =>
  apiFetch<Record<string, unknown>>('/capabilities', { method: 'POST', body })

export const updateCapability = (id: string, body: string, version = CAP_VERSION) =>
  apiFetch<Record<string, unknown>>(`/capabilities/${id}/${version}`, { method: 'PUT', body })

export const deleteCapability = (id: string, version = CAP_VERSION) =>
  apiFetch<null>(`/capabilities/${id}/${version}`, { method: 'DELETE' })

// Capability i18n locales
export const listCapabilityLocales = (id: string, version = CAP_VERSION) =>
  apiFetch<ListResponse<CapabilityLocale>>(`/capabilities/${id}/${version}/i18n`)

export const getCapabilityLocale = (id: string, tag: string, version = CAP_VERSION) =>
  apiFetch<Record<string, unknown>>(`/capabilities/${id}/${version}/i18n/${tag}`)

export const createCapabilityLocale = (id: string, body: string, version = CAP_VERSION) =>
  apiFetch<Record<string, unknown>>(`/capabilities/${id}/${version}/i18n`, { method: 'POST', body })

export const updateCapabilityLocale = (id: string, tag: string, body: string, version = CAP_VERSION) =>
  apiFetch<Record<string, unknown>>(`/capabilities/${id}/${version}/i18n/${tag}`, {
    method: 'PUT',
    body,
  })
