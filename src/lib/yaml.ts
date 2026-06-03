import yaml from 'js-yaml'

export interface ParseResult {
  ok: boolean
  /** 정규화된 JSON 문자열 (pretty) */
  json: string
  /** 파싱된 객체 */
  value?: unknown
  error?: string
}

/**
 * 입력 텍스트를 JSON 우선, 실패 시 YAML 로 파싱해 pretty JSON 문자열로 정규화한다.
 * (기존 capability.js 의 isJsonString + jsyaml.load 패턴을 통합)
 */
export function parseJsonOrYaml(text: string): ParseResult {
  const trimmed = text.trim()
  if (!trimmed) return { ok: false, json: '', error: '내용이 비어 있습니다.' }

  // JSON 먼저 시도
  try {
    const value = JSON.parse(trimmed)
    return { ok: true, value, json: JSON.stringify(value, null, 2) }
  } catch {
    /* YAML 시도 */
  }

  try {
    const value = yaml.load(trimmed)
    if (value == null || typeof value !== 'object') {
      return { ok: false, json: '', error: 'YAML 파싱 결과가 객체가 아닙니다.' }
    }
    return { ok: true, value, json: JSON.stringify(value, null, 2) }
  } catch (e) {
    return { ok: false, json: '', error: `YAML 파싱 오류: ${e instanceof Error ? e.message : String(e)}` }
  }
}
