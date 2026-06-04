import { createI18n } from 'vue-i18n'

export type Lang = 'ko' | 'en'
const LANG_KEY = 'webcli-lang'

function detectLang(): Lang {
  const saved = localStorage.getItem(LANG_KEY)
  if (saved === 'ko' || saved === 'en') return saved
  return navigator.language?.toLowerCase().startsWith('ko') ? 'ko' : 'en'
}

const ko = {
  app: { title: 'SmartThings Web CLI' },
  nav: { home: '홈', settings: 'PAT 설정', tokenSet: '토큰 설정됨', tokenNone: '토큰 없음' },
  home: {
    badge: 'SmartThings 개발자 도구',
    title: 'Web CLI',
    desc: 'SmartThings API 를 브라우저에서 바로 다루는 도구 모음. PAT 토큰을 설정하고 원하는 도구를 선택하세요.',
  },
  cli: { label: 'SmartThings CLI 대응 명령', docs: 'API 문서' },
  common: {
    noToken: 'PAT 토큰이 없습니다. 우측 상단의 ',
    noTokenStrong: 'PAT 설정',
    noTokenTail: ' 으로 토큰을 입력하세요.',
    preparing: '준비 중',
    copy: '복사',
    copied: '복사했습니다',
  },
  token: {
    title: 'SmartThings PAT 토큰',
    desc: 'Personal Access Token 을 입력하세요. 브라우저(localStorage)에만 저장되며 SmartThings API 직접 호출에 사용됩니다.',
    show: '보이기',
    hide: '숨기기',
    copy: 'PAT 복사',
    issue: 'PAT 발급 페이지 열기 →',
    delete: '삭제',
    cancel: '취소',
    save: '저장',
    saved: 'PAT 토큰을 저장했습니다.',
    removed: 'PAT 토큰을 삭제했습니다.',
  },
  groups: {
    apps: 'Apps & Schema',
    capability: 'Capabilities',
    profiles: 'Device Profiles & Presentation',
    devices: 'Devices',
    virtual: 'Virtual Devices',
    edge: 'Edge',
    locations: 'Locations',
    org: 'Organizations',
  },
  tools: {
    apps: { title: 'Apps', desc: 'SmartApp/API 앱 조회·생성·수정·삭제, OAuth·설정·등록' },
    installedapps: { title: 'Installed Apps', desc: '설치된 앱 인스턴스 조회·이름변경·삭제' },
    schema: { title: 'Schema', desc: 'ST Schema 커넥터 조회·생성·수정·삭제·자격 재발급' },
    installedschema: { title: 'Installed Schema', desc: '설치된 Schema 인스턴스 조회·삭제' },
    'schema-invites': { title: 'Schema 초대', desc: 'Schema 앱 초대 조회·생성·삭제' },
    capability: { title: 'Capability', desc: '커스텀 capability 조회/생성/수정/삭제' },
    'capability-presentation': { title: 'Capability Presentation', desc: 'capability presentation 조회/생성/수정' },
    'capability-generator': { title: 'Capability 샘플 생성', desc: '타입·속성으로 capability 정의 샘플 생성' },
    profile: { title: 'Device Profile', desc: '디바이스 프로파일 조회/생성/수정/게시/삭제' },
    configuration: { title: 'Device Config', desc: 'presentation device-config 조회/생성' },
    presentation: { title: 'Device Presentation', desc: '디바이스 presentation 조회' },
    devicepreferences: { title: 'Device Preferences', desc: '디바이스 preference 조회/생성/수정/번역' },
    device: { title: 'Device 조회', desc: '디바이스 목록·상세·상태·health·history' },
    'device-control': { title: 'Device 제어', desc: 'devices:commands 실행, rename/update, preferences' },
    tts: { title: '메시지 전송 (TTS)', desc: 'speechSynthesis 명령 전송' },
    virtual: { title: 'Virtual Device', desc: '가상 디바이스 생성 (프로토타입/프로파일/커스텀)' },
    events: { title: 'Event 전송', desc: '가상 디바이스 capability attribute 이벤트 전송' },
    edge: { title: 'Edge Driver', desc: 'Edge 드라이버 업로드/조회/삭제, 채널 배정·허브 설치' },
    channels: { title: 'Channel 관리', desc: 'Edge 채널 생성/수정/삭제, 드라이버 할당, 초대' },
    drivers: { title: 'Driver 업데이트', desc: '허브 드라이버 채널 최신 버전 설치/삭제' },
    hublog: { title: 'Hub Log', desc: 'logcat CLI 명령어 생성' },
    locations: { title: 'Locations', desc: '위치 조회/생성/수정/삭제/history' },
    rooms: { title: 'Rooms', desc: '방 조회/생성/수정/삭제' },
    modes: { title: 'Modes', desc: '모드 조회/생성/수정, 현재 모드 설정' },
    scenes: { title: 'Scenes', desc: '씬 목록/실행' },
    organizations: { title: 'Organizations', desc: '조직 목록/현재 조직' },
  },
}

const en: typeof ko = {
  app: { title: 'SmartThings Web CLI' },
  nav: { home: 'Home', settings: 'PAT', tokenSet: 'Token set', tokenNone: 'No token' },
  home: {
    badge: 'SmartThings developer tools',
    title: 'Web CLI',
    desc: 'A web toolkit for working with the SmartThings API directly in the browser. Set your PAT and pick a tool.',
  },
  cli: { label: 'SmartThings CLI equivalent', docs: 'API docs' },
  common: {
    noToken: 'No PAT token. Use ',
    noTokenStrong: 'PAT',
    noTokenTail: ' at the top right to enter your token.',
    preparing: 'Coming soon',
    copy: 'Copy',
    copied: 'Copied',
  },
  token: {
    title: 'SmartThings PAT token',
    desc: 'Enter a Personal Access Token. It is stored only in your browser (localStorage) and used to call the SmartThings API directly.',
    show: 'Show',
    hide: 'Hide',
    copy: 'Copy PAT',
    issue: 'Open PAT page →',
    delete: 'Delete',
    cancel: 'Cancel',
    save: 'Save',
    saved: 'Saved PAT token.',
    removed: 'Removed PAT token.',
  },
  groups: {
    apps: 'Apps & Schema',
    capability: 'Capabilities',
    profiles: 'Device Profiles & Presentation',
    devices: 'Devices',
    virtual: 'Virtual Devices',
    edge: 'Edge',
    locations: 'Locations',
    org: 'Organizations',
  },
  tools: {
    apps: { title: 'Apps', desc: 'List/create/update/delete SmartApp/API apps, OAuth, settings, register' },
    installedapps: { title: 'Installed Apps', desc: 'List, rename, delete installed app instances' },
    schema: { title: 'Schema', desc: 'List/create/update/delete ST Schema connectors, regenerate credentials' },
    installedschema: { title: 'Installed Schema', desc: 'List and delete installed Schema instances' },
    'schema-invites': { title: 'Schema Invites', desc: 'List/create/delete Schema app invitations' },
    capability: { title: 'Capability', desc: 'List/create/update/delete custom capabilities' },
    'capability-presentation': { title: 'Capability Presentation', desc: 'Get/create/update capability presentation' },
    'capability-generator': { title: 'Capability Sample Generator', desc: 'Generate a capability definition sample from type/attribute' },
    profile: { title: 'Device Profile', desc: 'List/create/update/publish/delete device profiles' },
    configuration: { title: 'Device Config', desc: 'Get/create presentation device-config' },
    presentation: { title: 'Device Presentation', desc: 'Query device presentation' },
    devicepreferences: { title: 'Device Preferences', desc: 'List/create/update device preferences and translations' },
    device: { title: 'Device Info', desc: 'Device list, detail, status, health, history' },
    'device-control': { title: 'Device Control', desc: 'Run devices:commands, rename/update, preferences' },
    tts: { title: 'Send Message (TTS)', desc: 'Send speechSynthesis command' },
    virtual: { title: 'Virtual Device', desc: 'Create virtual devices (prototype/profile/custom)' },
    events: { title: 'Send Event', desc: 'Send capability attribute events to virtual devices' },
    edge: { title: 'Edge Driver', desc: 'Upload/list/delete Edge drivers, channel assign, hub install' },
    channels: { title: 'Channels', desc: 'Create/update/delete Edge channels, assign drivers, invites' },
    drivers: { title: 'Update Driver', desc: 'Force-install latest channel version of a hub driver' },
    hublog: { title: 'Hub Log', desc: 'Generate logcat CLI command' },
    locations: { title: 'Locations', desc: 'List/create/update/delete locations, history' },
    rooms: { title: 'Rooms', desc: 'List/create/update/delete rooms' },
    modes: { title: 'Modes', desc: 'List/create/update modes, set current mode' },
    scenes: { title: 'Scenes', desc: 'List and execute scenes' },
    organizations: { title: 'Organizations', desc: 'List organizations / current org' },
  },
}

export const i18n = createI18n({
  legacy: false,
  locale: detectLang(),
  fallbackLocale: 'en',
  messages: { ko, en },
})

export function setLang(lang: Lang) {
  i18n.global.locale.value = lang
  localStorage.setItem(LANG_KEY, lang)
  document.documentElement.lang = lang
}

export function currentLang(): Lang {
  return i18n.global.locale.value as Lang
}

// 초기 <html lang> 동기화
document.documentElement.lang = detectLang()
