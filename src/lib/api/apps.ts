// SmartThings Apps API — 엔드포인트 헬퍼 + 타입 (apps 명령군의 웹 버전)
// 엔드포인트는 SmartThings CLI / core-sdk(AppsEndpoint)와 공식 Public API 기준으로 검증함.
import { apiFetch } from '@/lib/stClient'
import type { ListResponse } from '@/lib/types'

// --- 타입 ---

export type AppType = 'LAMBDA_SMART_APP' | 'WEBHOOK_SMART_APP' | 'API_ONLY'

export type AppClassification =
  | 'AUTOMATION'
  | 'SERVICE'
  | 'DEVICE'
  | 'CONNECTED_SERVICE'
  | 'HUB_LOCAL'

export interface AppSummary {
  appId: string
  appName: string
  displayName?: string
  description?: string
  appType?: AppType
  classifications?: AppClassification[]
}

/** 단일 App 상세 (원본 JSON 은 느슨하게 허용) */
export interface App extends AppSummary {
  webhookSmartApp?: Record<string, unknown>
  lambdaSmartApp?: Record<string, unknown>
  apiOnly?: Record<string, unknown>
  ui?: Record<string, unknown>
  iconImage?: Record<string, unknown>
  installMetadata?: Record<string, unknown>
  createdDate?: string
  lastUpdatedDate?: string
  [key: string]: unknown
}

export interface AppOAuth {
  clientName?: string
  scope?: string[]
  redirectUris?: string[]
  [key: string]: unknown
}

export interface GenerateAppOAuthResponse {
  oauthClientId: string
  oauthClientSecret: string
  oauthClientDetails?: AppOAuth
}

export interface AppSettings {
  settings?: Record<string, string>
  [key: string]: unknown
}

/** GET /apps 의 필터 쿼리 */
export interface ListAppsQuery {
  appType?: AppType
  classification?: AppClassification
}

// --- 엔드포인트 헬퍼 ---

export const listApps = (query?: ListAppsQuery) => {
  const params: Record<string, string> = {}
  if (query?.appType) params.appType = query.appType
  if (query?.classification) params.classification = query.classification
  const qs = Object.keys(params).length ? `?${new URLSearchParams(params).toString()}` : ''
  return apiFetch<ListResponse<AppSummary>>(`/apps${qs}`)
}

export const getApp = (id: string) => apiFetch<App>(`/apps/${id}`)

// body 는 parseJsonOrYaml 로 정규화된 JSON 문자열을 그대로 전달한다.
export const createApp = (body: string) => apiFetch<App>('/apps', { method: 'POST', body })

export const updateApp = (id: string, body: string) =>
  apiFetch<App>(`/apps/${id}`, { method: 'PUT', body })

export const deleteApp = (id: string) => apiFetch<null>(`/apps/${id}`, { method: 'DELETE' })

// OAuth
export const getAppOauth = (id: string) => apiFetch<AppOAuth>(`/apps/${id}/oauth`)

export const updateAppOauth = (id: string, body: string) =>
  apiFetch<AppOAuth>(`/apps/${id}/oauth`, { method: 'PUT', body })

// secret 회전 — body: { clientName, scope }, 응답에 clientId/clientSecret 1회 노출
export const generateAppOauth = (id: string, body: string) =>
  apiFetch<GenerateAppOAuthResponse>(`/apps/${id}/oauth/generate`, { method: 'POST', body })

// Settings
export const getAppSettings = (id: string) => apiFetch<AppSettings>(`/apps/${id}/settings`)

export const updateAppSettings = (id: string, body: string) =>
  apiFetch<AppSettings>(`/apps/${id}/settings`, { method: 'PUT', body })

// 등록 — PUT /apps/{id}/register (body 없음)
export const registerApp = (id: string) =>
  apiFetch<Record<string, unknown>>(`/apps/${id}/register`, { method: 'PUT' })
