// 도구 레지스트리 — 사이드바와 홈 카드 그리드가 공유한다.
// 점진 이식: 도구를 추가할 때마다 enabled:true 로 켜고 라우트를 등록한다.

export interface ToolDef {
  key: string
  title: string
  desc: string
  path: string
  enabled: boolean
}

export const TOOLS: ToolDef[] = [
  { key: 'device', title: 'Device 조회', desc: '디바이스 목록·상세·현재 상태 조회', path: '/device', enabled: true },
  { key: 'capability', title: 'Capability', desc: '커스텀 capability 생성/관리', path: '/capability', enabled: false },
  { key: 'events', title: 'Event 전송', desc: '가상 디바이스 이벤트/상태 전송', path: '/events', enabled: false },
  { key: 'virtual', title: 'Virtual Device', desc: '가상 디바이스 생성', path: '/virtual', enabled: false },
  { key: 'profile', title: 'Device Profile', desc: '디바이스 프로파일 관리', path: '/profile', enabled: false },
  { key: 'presentation', title: 'Presentation', desc: '디바이스 프레젠테이션 관리', path: '/presentation', enabled: false },
]

export const enabledTools = () => TOOLS.filter((t) => t.enabled)
