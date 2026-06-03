import { apiFetch } from '@/lib/stClient'

/** Device Profile 목록 항목 (요약) */
export interface DeviceProfileSummary {
  id: string
  name: string
  status?: string
  [key: string]: unknown
}

interface ListResponse<T> {
  items?: T[]
  _links?: unknown
}

/** 내 Device Profile 목록 */
export const listProfiles = () =>
  apiFetch<ListResponse<DeviceProfileSummary>>('/deviceprofiles')

/** 단일 Device Profile 조회 */
export const getProfile = (id: string) =>
  apiFetch<Record<string, unknown>>(`/deviceprofiles/${id}`)

/** Device Profile 생성 */
export const createProfile = (body: string) =>
  apiFetch<Record<string, unknown>>('/deviceprofiles', { method: 'POST', body })

/** Device Profile 수정 */
export const updateProfile = (id: string, body: string) =>
  apiFetch<Record<string, unknown>>(`/deviceprofiles/${id}`, { method: 'PUT', body })

/** Device Profile 게시(PUBLISHED) */
export const publishProfile = (id: string) =>
  apiFetch<Record<string, unknown>>(`/deviceprofiles/${id}/status`, {
    method: 'POST',
    body: JSON.stringify({ deviceProfileStatus: 'PUBLISHED' }),
  })

/** Device Profile 삭제 */
export const deleteProfile = (id: string) =>
  apiFetch<null>(`/deviceprofiles/${id}`, { method: 'DELETE' })

/** 프로파일에서 추출한 presentation 식별자 (metadata.vid / metadata.mnmn) */
export interface ProfilePresentationRef {
  vid: string
  mnmn?: string
}

/**
 * 프로파일 객체의 metadata 에서 vid/mnmn 을 뽑아낸다.
 * (smartthings-cli deviceprofiles:device-config / :presentation 은
 *  profile.metadata.vid + profile.metadata.mnmn 로 presentation 을 조회한다)
 */
export function extractPresentationRef(profile: Record<string, unknown>): ProfilePresentationRef | null {
  const meta = profile['metadata']
  if (!meta || typeof meta !== 'object') return null
  const vid = (meta as Record<string, unknown>)['vid']
  const mnmn = (meta as Record<string, unknown>)['mnmn']
  if (typeof vid !== 'string' || !vid) return null
  return { vid, mnmn: typeof mnmn === 'string' && mnmn ? mnmn : undefined }
}

function presentationQuery(ref: ProfilePresentationRef): string {
  const params = new URLSearchParams({ presentationId: ref.vid })
  if (ref.mnmn) params.set('manufacturerName', ref.mnmn)
  return params.toString()
}

/**
 * 프로파일의 device configuration 조회.
 * CLI: deviceprofiles:device-config [id] → presentation.get(vid, mnmn)
 * GET /presentation/deviceconfig?presentationId={vid}&manufacturerName={mnmn}
 */
export const getProfileDeviceConfig = (ref: ProfilePresentationRef) =>
  apiFetch<Record<string, unknown>>(`/presentation/deviceconfig?${presentationQuery(ref)}`)

/**
 * 프로파일의 presentation 조회.
 * CLI: deviceprofiles:presentation [id] → presentation.getPresentation(vid, mnmn)
 * GET /presentation?presentationId={vid}&manufacturerName={mnmn}
 */
export const getProfilePresentation = (ref: ProfilePresentationRef) =>
  apiFetch<Record<string, unknown>>(`/presentation?${presentationQuery(ref)}`)
