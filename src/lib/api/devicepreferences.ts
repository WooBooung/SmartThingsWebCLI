import { apiFetch } from '@/lib/stClient'

// SmartThings Device Preferences API 헬퍼 (self-contained).
// 엔드포인트는 @smartthings/core-sdk src/endpoint/devicepreferences.ts 로 검증함:
//   base path = 'devicepreferences' (즉 /v1/devicepreferences)
//   GET    ''                              -> list(namespace?)        : DevicePreference[]
//   GET    '{id}'                          -> get(id)                 : DevicePreference
//   POST   ''                              -> create(body)            : DevicePreference
//   PUT    '{id}'                          -> update(id, body)        : DevicePreference
//   GET    '{id}/i18n'                     -> listTranslations(id)    : LocaleReference[]
//   GET    '{id}/i18n/{tag}'               -> getTranslations(id,tag) : PreferenceLocalization
//   POST   '{id}/i18n'                     -> createTranslations(...)  : PreferenceLocalization
//   PUT    '{id}/i18n/{tag}'               -> updateTranslations(...)  : PreferenceLocalization

export interface DevicePreferenceSummary {
  preferenceId: string
  title?: string
  name?: string
  description?: string
  preferenceType?: string
  namespace?: string
  [key: string]: unknown
}

export interface LocaleReference {
  tag: string
}

// list 는 wrapper 없이 bare 배열을 반환한다.
export const listDevicePreferences = (namespace?: string) => {
  const qs = namespace ? `?${new URLSearchParams({ namespace }).toString()}` : ''
  return apiFetch<DevicePreferenceSummary[]>(`/devicepreferences${qs}`)
}

export const getDevicePreference = (id: string) =>
  apiFetch<Record<string, unknown>>(`/devicepreferences/${id}`)

export const createDevicePreference = (body: string) =>
  apiFetch<Record<string, unknown>>('/devicepreferences', { method: 'POST', body })

export const updateDevicePreference = (id: string, body: string) =>
  apiFetch<Record<string, unknown>>(`/devicepreferences/${id}`, { method: 'PUT', body })

// --- Translations (i18n) ---
// listTranslations 도 bare 배열(LocaleReference[]) 을 반환한다.
export const listDevicePreferenceTranslations = (id: string) =>
  apiFetch<LocaleReference[]>(`/devicepreferences/${id}/i18n`)

export const getDevicePreferenceTranslations = (id: string, tag: string) =>
  apiFetch<Record<string, unknown>>(`/devicepreferences/${id}/i18n/${tag}`)

export const createDevicePreferenceTranslations = (id: string, body: string) =>
  apiFetch<Record<string, unknown>>(`/devicepreferences/${id}/i18n`, { method: 'POST', body })

export const updateDevicePreferenceTranslations = (id: string, tag: string, body: string) =>
  apiFetch<Record<string, unknown>>(`/devicepreferences/${id}/i18n/${tag}`, {
    method: 'PUT',
    body,
  })
