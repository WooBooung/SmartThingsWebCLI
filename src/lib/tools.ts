// 도구 레지스트리 — 사이드바와 홈 카드 그리드가 공유한다.
// SmartThings CLI 의 topic 구조에 맞춰 그룹을 구성한다.
// 점진 이식: 도구를 추가할 때마다 enabled:true 로 켜고 라우트를 등록한다.

export type ToolGroup =
  | 'apps'
  | 'capability'
  | 'profiles'
  | 'devices'
  | 'virtual'
  | 'edge'
  | 'locations'
  | 'org'

export interface ToolDef {
  key: string
  title: string
  desc: string
  path: string
  enabled: boolean
  group: ToolGroup
}

export const GROUP_LABELS: Record<ToolGroup, string> = {
  apps: 'Apps & Schema',
  capability: 'Capabilities',
  profiles: 'Device Profiles & Presentation',
  devices: 'Devices',
  virtual: 'Virtual Devices',
  edge: 'Edge',
  locations: 'Locations',
  org: 'Organizations',
}

export const GROUP_ORDER: ToolGroup[] = [
  'capability',
  'profiles',
  'devices',
  'virtual',
  'edge',
  'locations',
  'apps',
  'org',
]

export const TOOLS: ToolDef[] = [
  // Apps & Schema
  { key: 'apps', title: 'Apps', desc: 'SmartApp/API 앱 조회·생성·수정·삭제, OAuth·설정·등록', path: '/apps', enabled: true, group: 'apps' },
  { key: 'installedapps', title: 'Installed Apps', desc: '설치된 앱 인스턴스 조회·이름변경·삭제', path: '/installedapps', enabled: true, group: 'apps' },
  { key: 'schema', title: 'Schema', desc: 'ST Schema 커넥터 조회·생성·수정·삭제·자격 재발급', path: '/schema', enabled: true, group: 'apps' },
  { key: 'installedschema', title: 'Installed Schema', desc: '설치된 Schema 인스턴스 조회·삭제', path: '/installedschema', enabled: true, group: 'apps' },
  { key: 'schema-invites', title: 'Schema 초대', desc: 'Schema 앱 초대 조회·생성·삭제', path: '/schema-invites', enabled: true, group: 'apps' },
  // Capabilities
  { key: 'capability', title: 'Capability', desc: '커스텀 capability 조회/생성/수정/삭제', path: '/capability', enabled: true, group: 'capability' },
  { key: 'capability-presentation', title: 'Capability Presentation', desc: 'capability presentation 조회/생성/수정', path: '/capability-presentation', enabled: true, group: 'capability' },
  { key: 'capability-generator', title: 'Capability 샘플 생성', desc: '타입·속성으로 capability 정의 샘플 생성', path: '/capability-generator', enabled: true, group: 'capability' },
  // Device Profiles & Presentation
  { key: 'profile', title: 'Device Profile', desc: '디바이스 프로파일 조회/생성/수정/게시/삭제', path: '/profile', enabled: true, group: 'profiles' },
  { key: 'configuration', title: 'Device Config', desc: 'presentation device-config 조회/생성', path: '/configuration', enabled: true, group: 'profiles' },
  { key: 'presentation', title: 'Device Presentation', desc: '디바이스 presentation 조회', path: '/presentation', enabled: true, group: 'profiles' },
  { key: 'devicepreferences', title: 'Device Preferences', desc: '디바이스 preference 조회/생성/수정/번역', path: '/devicepreferences', enabled: true, group: 'profiles' },
  // Devices
  { key: 'device', title: 'Device 조회', desc: '디바이스 목록·상세·상태·health·history', path: '/device', enabled: true, group: 'devices' },
  { key: 'device-control', title: 'Device 제어', desc: 'devices:commands 실행, rename/update, preferences', path: '/device-control', enabled: true, group: 'devices' },
  { key: 'tts', title: '메시지 전송 (TTS)', desc: 'speechSynthesis 명령 전송', path: '/tts', enabled: true, group: 'devices' },
  // Virtual Devices
  { key: 'virtual', title: 'Virtual Device', desc: '가상 디바이스 생성 (프로토타입/프로파일/커스텀)', path: '/virtual', enabled: true, group: 'virtual' },
  { key: 'events', title: 'Event 전송', desc: '가상 디바이스 capability attribute 이벤트 전송', path: '/events', enabled: true, group: 'virtual' },
  // Edge
  { key: 'edge', title: 'Edge Driver', desc: 'Edge 드라이버 업로드/조회/삭제, 채널 배정·허브 설치', path: '/edge', enabled: true, group: 'edge' },
  { key: 'channels', title: 'Channel 관리', desc: 'Edge 채널 생성/수정/삭제, 드라이버 할당, 초대', path: '/channels', enabled: true, group: 'edge' },
  { key: 'drivers', title: 'Driver 업데이트', desc: '허브 드라이버 채널 최신 버전 설치/삭제', path: '/drivers', enabled: true, group: 'edge' },
  { key: 'hublog', title: 'Hub Log', desc: 'logcat CLI 명령어 생성', path: '/hublog', enabled: true, group: 'edge' },
  // Locations
  { key: 'locations', title: 'Locations', desc: '위치 조회/생성/수정/삭제/history', path: '/locations', enabled: true, group: 'locations' },
  { key: 'rooms', title: 'Rooms', desc: '방 조회/생성/수정/삭제', path: '/rooms', enabled: true, group: 'locations' },
  { key: 'modes', title: 'Modes', desc: '모드 조회/생성/수정, 현재 모드 설정', path: '/modes', enabled: true, group: 'locations' },
  { key: 'scenes', title: 'Scenes', desc: '씬 목록/실행', path: '/scenes', enabled: true, group: 'locations' },
  // Organizations
  { key: 'organizations', title: 'Organizations', desc: '조직 목록/현재 조직', path: '/organizations', enabled: true, group: 'org' },
]

export const enabledTools = () => TOOLS.filter((t) => t.enabled)

export interface ToolGroupView {
  group: ToolGroup
  label: string
  tools: ToolDef[]
}

export const toolsByGroup = (): ToolGroupView[] =>
  GROUP_ORDER.map((group) => ({
    group,
    label: GROUP_LABELS[group],
    tools: TOOLS.filter((t) => t.group === group),
  })).filter((g) => g.tools.length > 0)
