// 도구 레지스트리 — 사이드바와 홈 카드 그리드가 공유한다.
// 점진 이식: 도구를 추가할 때마다 enabled:true 로 켜고 라우트를 등록한다.

export type ToolGroup = 'virtual' | 'capability' | 'devices' | 'edge' | 'etc'

export interface ToolDef {
  key: string
  title: string
  desc: string
  path: string
  enabled: boolean
  group: ToolGroup
}

export const GROUP_LABELS: Record<ToolGroup, string> = {
  virtual: 'Virtual Device',
  capability: 'Capability',
  devices: 'Devices',
  edge: 'Edge Drivers',
  etc: '기타',
}

export const GROUP_ORDER: ToolGroup[] = ['virtual', 'capability', 'devices', 'edge', 'etc']

export const TOOLS: ToolDef[] = [
  // Virtual Device
  { key: 'virtual', title: 'Virtual Device', desc: '가상 디바이스 생성 (프로토타입/프로파일/커스텀)', path: '/virtual', enabled: true, group: 'virtual' },
  { key: 'events', title: 'Event 전송', desc: '가상 디바이스 capability attribute 이벤트 전송', path: '/events', enabled: true, group: 'virtual' },
  // Capability
  { key: 'capability', title: 'Capability', desc: '커스텀 capability 조회/생성/수정/삭제', path: '/capability', enabled: true, group: 'capability' },
  { key: 'capability-presentation', title: 'Capability Presentation', desc: 'capability presentation 조회/생성/수정', path: '/capability-presentation', enabled: true, group: 'capability' },
  { key: 'capability-generator', title: 'Capability 샘플 생성', desc: '타입·속성으로 capability 정의 샘플 생성', path: '/capability-generator', enabled: true, group: 'capability' },
  // Devices
  { key: 'profile', title: 'Device Profile', desc: '디바이스 프로파일 조회/생성/수정/게시/삭제', path: '/profile', enabled: true, group: 'devices' },
  { key: 'configuration', title: 'Device Configuration', desc: 'device configuration 조회/생성', path: '/configuration', enabled: true, group: 'devices' },
  { key: 'presentation', title: 'Device Presentation', desc: '디바이스 presentation 조회', path: '/presentation', enabled: true, group: 'devices' },
  { key: 'device', title: 'Device 조회', desc: '디바이스 목록·상세·현재 상태 조회', path: '/device', enabled: true, group: 'devices' },
  // Edge Drivers
  { key: 'edge', title: 'Edge Driver', desc: 'Edge 드라이버 업로드/조회/삭제, 채널 배정·허브 설치', path: '/edge', enabled: true, group: 'edge' },
  { key: 'channels', title: 'Channel 관리', desc: 'Edge 채널 생성/수정/삭제, 드라이버 할당, 초대', path: '/channels', enabled: true, group: 'edge' },
  { key: 'drivers', title: 'Driver 업데이트', desc: '허브 드라이버 채널 최신 버전 설치/삭제', path: '/drivers', enabled: true, group: 'edge' },
  { key: 'hublog', title: 'Hub Log', desc: 'logcat CLI 명령어 생성', path: '/hublog', enabled: true, group: 'edge' },
  // 기타
  { key: 'tts', title: '메시지 전송 (TTS)', desc: '스피커에 음성 메시지 전송', path: '/tts', enabled: true, group: 'etc' },
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
