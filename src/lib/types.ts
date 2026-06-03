// SmartThings API 타입 (필요한 부분만 — 점진적으로 확장)

export interface Location {
  locationId: string
  name: string
}

export interface Room {
  roomId: string
  name: string
  locationId?: string
}

export interface Device {
  deviceId: string
  name?: string
  label?: string
  locationId?: string
  roomId?: string
  deviceTypeName?: string
  type?: string
  // 그 외 필드는 원본 JSON 그대로 표시하므로 느슨하게 허용
  [key: string]: unknown
}

export interface ListResponse<T> {
  items: T[]
  _links?: unknown
}

// 위치별로 그룹핑된 디바이스 (DeviceSelect 용)
export interface DeviceWithLocationName extends Device {
  locationName: string
}
