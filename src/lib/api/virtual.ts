import { apiFetch } from '@/lib/stClient'

// ---------------------------------------------------------------------------
// 타입
// ---------------------------------------------------------------------------

interface ListResponse<T> {
  items?: T[]
  _links?: unknown
}

/** 허브 드라이버 목록 항목 (`/hubdevices/{hubId}/drivers` 는 배열 직접 반환) */
export interface HubDriver {
  driverId: string
  name: string
  [key: string]: unknown
}

/** Device Profile 요약 (`/deviceprofiles`) */
export interface ProfileSummary {
  id: string
  name: string
  [key: string]: unknown
}

/** Capability 요약 (`/capabilities`, `/capabilities/namespaces/{ns}`) */
export interface CapabilitySummary {
  id: string
  version?: number
  [key: string]: unknown
}

/** Capability namespace (`/capabilities/namespaces`) */
export interface CapabilityNamespace {
  name: string
  ownerType?: string
  [key: string]: unknown
}

export type ExecutionTarget = 'CLOUD' | 'LOCAL'

/** 모든 생성 모드가 공유하는 기본 필드 */
export interface VirtualDeviceBase {
  name: string
  locationId: string
  roomId?: string
  executionTarget: ExecutionTarget
  /** executionTarget === 'LOCAL' 일 때만 사용 */
  hubId?: string
  driverId?: string
}

export interface CreateByCustomProfileArgs extends VirtualDeviceBase {
  /** capability id 목록 (main 컴포넌트로 묶임) */
  capabilities: string[]
  deviceCategory: string
}

export interface CreateByProfileIdArgs extends VirtualDeviceBase {
  profileId: string
}

export interface CreateByPrototypeArgs extends VirtualDeviceBase {
  prototype: string
}

/** 가상 디바이스 목록/관리용 요약 (GET /virtualdevices 응답 항목) */
export interface VirtualDeviceSummary {
  deviceId: string
  label?: string
  name?: string
  locationId?: string
  roomId?: string
  [key: string]: unknown
}

/** virtualdevices:update 가 보낼 수 있는 필드 (CLI 는 client.devices.update 사용) */
export interface VirtualDeviceUpdate {
  label?: string
  roomId?: string
}

// ---------------------------------------------------------------------------
// 드롭다운 데이터 조회 헬퍼
// ---------------------------------------------------------------------------

/** 위치의 허브 디바이스 목록 (가상 디바이스 LOCAL 실행 대상) */
export const listHubs = (locationId: string) =>
  apiFetch<ListResponse<import('@/lib/types').Device>>(
    `/devices?locationId=${encodeURIComponent(locationId)}&type=HUB`,
  )

/** 허브에 설치된 드라이버 목록 (배열 직접 반환) */
export const listHubDrivers = (hubId: string) =>
  apiFetch<HubDriver[]>(`/hubdevices/${hubId}/drivers`)

/** 내 Device Profile 목록 */
export const listProfiles = () => apiFetch<ListResponse<ProfileSummary>>('/deviceprofiles')

/** 단일 Device Profile 조회 (선택 → 본문 채우기용) */
export const getProfile = (id: string) =>
  apiFetch<Record<string, unknown>>(`/deviceprofiles/${id}`)

/** 표준 capability 목록 */
export const listStandardCapabilities = () =>
  apiFetch<ListResponse<CapabilitySummary>>('/capabilities')

/** 커스텀 capability 목록 (organization namespace 전체를 합산) */
export async function listCustomCapabilities(): Promise<CapabilitySummary[]> {
  const namespaces = await apiFetch<CapabilityNamespace[]>('/capabilities/namespaces')
  const orgNs = namespaces.filter((n) => n.ownerType === 'organization').map((n) => n.name)
  const per = await Promise.all(
    orgNs.map((ns) =>
      apiFetch<ListResponse<CapabilitySummary>>(`/capabilities/namespaces/${ns}`),
    ),
  )
  return per.flatMap((r) => r.items ?? [])
}

// ---------------------------------------------------------------------------
// 가상 디바이스 관리 (목록 / 수정 / 삭제)
// ---------------------------------------------------------------------------

/** 가상 디바이스 목록 (GET /virtualdevices) — 관리 섹션의 선택 드롭다운용 */
export const listVirtualDevices = () =>
  apiFetch<ListResponse<VirtualDeviceSummary>>('/virtualdevices')

/**
 * 가상 디바이스의 라벨/방 변경 — virtualdevices:update.
 * CLI 는 client.devices.update(id, data) 즉 PUT /devices/{id} (DeviceUpdate) 를 호출한다.
 * (검증: smartthings-cli src/commands/virtualdevices/update.ts, core-sdk endpoint/devices.ts)
 */
export const updateVirtualDevice = (deviceId: string, data: VirtualDeviceUpdate) =>
  apiFetch<Record<string, unknown>>(`/devices/${deviceId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })

/**
 * 가상 디바이스 삭제 — virtualdevices:delete.
 * CLI 는 client.devices.delete(id) 즉 DELETE /devices/{id} 를 호출한다.
 * (검증: smartthings-cli src/commands/virtualdevices/delete.ts, core-sdk endpoint/devices.ts)
 */
export const deleteVirtualDevice = (deviceId: string) =>
  apiFetch<null>(`/devices/${deviceId}`, { method: 'DELETE' })

// ---------------------------------------------------------------------------
// 가상 디바이스 생성 (3가지 모드)
// ---------------------------------------------------------------------------

function ownerBlock(args: VirtualDeviceBase) {
  return {
    name: args.name,
    owner: { ownerId: args.locationId, ownerType: 'LOCATION' as const },
    ...(args.roomId ? { roomId: args.roomId } : {}),
    executionTarget: args.executionTarget,
    ...(args.executionTarget === 'LOCAL'
      ? { hubId: args.hubId, driverId: args.driverId }
      : {}),
  }
}

/** 커스텀 capability 조합으로 deviceProfile 을 인라인 구성해 생성 — POST /virtualdevices */
export function createByCustomProfile(args: CreateByCustomProfileArgs) {
  const payload = {
    ...ownerBlock(args),
    deviceProfile: {
      components: [
        {
          id: 'main',
          capabilities: args.capabilities.map((id) => ({ id, version: 1 })),
          categories: [{ name: args.deviceCategory, categoryType: 'manufacturer' }],
        },
      ],
    },
  }
  return apiFetch<Record<string, unknown>>('/virtualdevices', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/** 기존 device profile ID 로 생성 — POST /virtualdevices */
export function createByProfileId(args: CreateByProfileIdArgs) {
  const payload = {
    ...ownerBlock(args),
    deviceProfileId: args.profileId,
  }
  return apiFetch<Record<string, unknown>>('/virtualdevices', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/** 프로토타입으로 생성 — POST /virtualdevices/prototypes */
export function createByPrototype(args: CreateByPrototypeArgs) {
  const payload = {
    ...ownerBlock(args),
    prototype: args.prototype,
  }
  return apiFetch<Record<string, unknown>>('/virtualdevices/prototypes', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

// ---------------------------------------------------------------------------
// 정적 데이터
// ---------------------------------------------------------------------------

export interface PrototypeOption {
  value: string
  label: string
}

/** CLOUD 실행 대상에서 사용 가능한 프로토타입 */
export const CLOUD_PROTOTYPES: PrototypeOption[] = [
  { value: 'VIRTUAL_SWITCH', label: 'Switch' },
  { value: 'VIRTUAL_DIMMER_SWITCH', label: 'Dimmer Switch' },
  { value: 'VIRTUAL_BUTTON', label: 'Button' },
  { value: 'VIRTUAL_CAMERA', label: 'Camera' },
  { value: 'VIRTUAL_COLOR_BULB', label: 'Color Bulb' },
  { value: 'VIRTUAL_CONTACT_SENSOR', label: 'Contact Sensor' },
  { value: 'VIRTUAL_DIMMER', label: 'Dimmer (no switch)' },
  { value: 'VIRTUAL_GARAGE_DOOR_OPENER', label: 'Garage Door Opener' },
  { value: 'VIRTUAL_LOCK', label: 'Lock' },
  { value: 'VIRTUAL_METERED_SWITCH', label: 'Metered Switch' },
  { value: 'VIRTUAL_MOTION_SENSOR', label: 'Motion Sensor' },
  { value: 'VIRTUAL_MULTI_SENSOR', label: 'Multi-Sensor' },
  { value: 'VIRTUAL_PRESENCE_SENSOR', label: 'Presence Sensor' },
  { value: 'VIRTUAL_REFRIGERATOR', label: 'Refrigerator' },
  { value: 'VIRTUAL_RGBW_BULB', label: 'RGBW Bulb' },
  { value: 'VIRTUAL_SIREN', label: 'Siren' },
  { value: 'VIRTUAL_THERMOSTAT', label: 'Thermostat' },
]

/** LOCAL 실행 대상에서 사용 가능한 프로토타입 */
export const LOCAL_PROTOTYPES: PrototypeOption[] = [
  { value: 'VIRTUAL_SWITCH', label: 'Switch' },
  { value: 'VIRTUAL_DIMMER_SWITCH', label: 'Dimmer Switch' },
]

/** device profile category 목록 (manufacturer category) */
export const DEVICE_CATEGORIES: string[] = [
  'AirConditioner', 'AirPurifier', 'AirQualityDetector', 'Battery', 'Blind', 'BluRayPlayer',
  'BluetoothCarSpeaker', 'BluetoothTracker', 'Bridges', 'Button', 'Camera', 'Car', 'Charger',
  'ClothingCareMachine', 'CoffeeMaker', 'ContactSensor', 'Cooktop', 'CubeRefrigerator',
  'CurbPowerMeter', 'Dehumidifier', 'Dishwasher', 'Door', 'DoorBell', 'Dryer', 'Earbuds',
  'ElectricVehicleCharger', 'Elevator', 'Fan', 'Feeder', 'FitnessMat', 'Flashlight', 'GarageDoor',
  'GasValve', 'GasMeter', 'GenericSensor', 'HealthTracker', 'Heatedmattresspad', 'HomeTheater', 'Hub',
  'Humidifier', 'HumiditySensor', 'IrRemote', 'Irrigation', 'KimchiRefrigerator', 'KitchenHood',
  'LeakSensor', 'Light', 'LightSensor', 'MicroFiberFilter', 'Microwave', 'Mobile', 'MobilePresence',
  'MotionSensor', 'MultiFunctionalSensor', 'NetworkAudio', 'Networking', 'Others', 'Oven', 'PresenceSensor',
  'Printer', 'PrinterMultiFunction', 'Projector', 'Pump', 'Range', 'Receiver', 'Refrigerator', 'RemoteController',
  'RiceCooker', 'RobotCleaner', 'ScaleToMeasureMassOfHumanBody', 'Scanner', 'SecurityPanel', 'SetTop',
  'Shade', 'ShoesCareMachine', 'Siren', 'SmartLock', 'SmartPlug', 'SmokeDetector', 'SolarPanel', 'SoundSensor',
  'SoundMachine', 'Speaker', 'StickVacuumCleaner', 'Storage', 'Stove', 'Switch', 'Television', 'TempSensor',
  'Thermostat', 'Tracker', 'UPnPMediaRenderer', 'Vent', 'VisionSensor', 'VoiceAssistance', 'Washer', 'WaterHeater',
  'WaterValve', 'WaterPurifier', 'WiFiRouter', 'Window', 'WineCellar',
]
