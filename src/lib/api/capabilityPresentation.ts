import { apiFetch } from '@/lib/stClient'

// Capability Presentation API 헬퍼 (이 도구 전용)
// 엔드포인트: /capabilities/{id}/{version}/presentation
// 원본: X:\smartthings\capabilityPresentation\capabilityPresentation.js

export type PresentationResult = Record<string, unknown>

export const getCapabilityPresentation = (id: string, version: number | string) =>
  apiFetch<PresentationResult>(`/capabilities/${id}/${version}/presentation`)

export const createCapabilityPresentation = (
  id: string,
  version: number | string,
  body: string,
) =>
  apiFetch<PresentationResult>(`/capabilities/${id}/${version}/presentation`, {
    method: 'POST',
    body,
  })

export const updateCapabilityPresentation = (
  id: string,
  version: number | string,
  body: string,
) =>
  apiFetch<PresentationResult>(`/capabilities/${id}/${version}/presentation`, {
    method: 'PUT',
    body,
  })
