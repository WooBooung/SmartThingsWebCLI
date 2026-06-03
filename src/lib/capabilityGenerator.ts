// Capability Sample Generator
// 원본: X:\smartthings\capabilityGenerator\capabilityGenerator.js 의 생성 로직을 타입 안전하게 이식.
// API 호출이 전혀 없는 순수 클라이언트 생성기이므로 lib/api 가 아닌 lib 유틸로 둔다.

export type CapaType = 'string' | 'integer' | 'number' | 'boolean' | 'array'
export type ResultFormat = 'json' | 'yaml'

export interface GeneratorOptions {
  capaName: string
  capaType: CapaType
  attrName: string
  /** string 타입에서만 사용 */
  maxLength?: number | null
  /** integer/number 타입에서만 사용 */
  minimum?: number | null
  maximum?: number | null
  unit?: string | null
}

/** value 스키마 (선택 제약 포함) */
interface ValueSchema {
  type: CapaType
  maxLength?: number
  minimum?: number
  maximum?: number
}

interface AttributeSchemaProperties {
  value: ValueSchema
  unit?: { type: 'string'; enum: string[]; default: string }
}

export interface GeneratedCapability {
  name: string
  ephemeral: boolean
  attributes: Record<
    string,
    {
      schema: {
        type: 'object'
        properties: AttributeSchemaProperties
        additionalProperties: false
        required: string[]
      }
      setter: string
      enumCommands: never[]
    }
  >
  commands: Record<
    string,
    {
      name: string
      arguments: Array<{ name: string; optional: boolean; schema: ValueSchema }>
    }
  >
}

const CAPA_NAME_REGEX = /^[a-zA-Z][a-zA-Z0-9]{0,35}$/
const CONTAINS_HANGUL = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/
const ATTR_NAME_REGEX = /^[a-z]*([A-Z][a-z]*)*$/

/** capaName/attrName 검증. 통과하면 null, 실패하면 한국어 에러 메시지. */
export function validateInputs(capaName: string, attrName: string): string | null {
  if (!capaName) return 'Capability 이름을 입력하세요'
  if (CONTAINS_HANGUL.test(capaName)) return '한글을 사용할 수 없습니다. 영문자만 입력하세요.'
  if (/^[0-9]/.test(capaName)) return 'Capability 이름은 영문자로 시작해야 합니다.'
  if (!CAPA_NAME_REGEX.test(capaName))
    return 'Capability 이름은 1~36자의 영문 소문자 또는 대문자로 시작하는 단어로 입력하세요.'
  if (capaName.length > 36) return 'Capability 이름은 36자를 넘을 수 없습니다.'

  if (attrName.length > 36) return 'Attribute 이름은 최대 36자까지 허용됩니다.'
  if (!ATTR_NAME_REGEX.test(attrName)) return 'Attribute 이름은 소문자로 시작하고 영어만 가능합니다'

  return null
}

/** 검증된 입력으로 capability 정의 객체를 생성한다. */
export function generateCapability(opts: GeneratorOptions): GeneratedCapability {
  const { capaName, capaType, attrName } = opts
  const formattedAttrName = attrName.charAt(0).toUpperCase() + attrName.slice(1)
  const setterName = `set${formattedAttrName}`

  const valueSchema: ValueSchema = { type: capaType }
  const argSchema: ValueSchema = { type: capaType }
  const properties: AttributeSchemaProperties = { value: valueSchema }

  if (capaType === 'string' && opts.maxLength != null && !Number.isNaN(opts.maxLength)) {
    valueSchema.maxLength = opts.maxLength
    argSchema.maxLength = opts.maxLength
  }

  if (capaType === 'integer' || capaType === 'number') {
    if (opts.minimum != null && !Number.isNaN(opts.minimum)) {
      valueSchema.minimum = opts.minimum
      argSchema.minimum = opts.minimum
    }
    if (opts.maximum != null && !Number.isNaN(opts.maximum)) {
      valueSchema.maximum = opts.maximum
      argSchema.maximum = opts.maximum
    }
    if (opts.unit != null && opts.unit !== '') {
      properties.unit = { type: 'string', enum: [opts.unit], default: opts.unit }
    }
  }

  return {
    name: capaName,
    ephemeral: false,
    attributes: {
      [attrName]: {
        schema: {
          type: 'object',
          properties,
          additionalProperties: false,
          required: ['value'],
        },
        setter: setterName,
        enumCommands: [],
      },
    },
    commands: {
      [setterName]: {
        name: setterName,
        arguments: [{ name: 'value', optional: false, schema: argSchema }],
      },
    },
  }
}
