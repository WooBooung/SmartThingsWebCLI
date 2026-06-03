# webcli 페이지 이식 컨벤션 (에이전트용)

기존 vanilla JS web cli(`X:\smartthings\<tool>\`)의 각 도구를 이 Vue 3 + Vite + TS 프로젝트로 이식할 때 **반드시** 따른다. 목표: 동작은 동일하게, 룩은 AEB 다크 테마로 일관되게.

## 반드시 읽을 참고 파일 (하우스 스타일)
- `src/views/DeviceView.vue` — 레이아웃/토큰 게이트/InfoGrid/JsonView 사용 예
- `src/views/CapabilityView.vue` — 목록 드롭다운/JSON·YAML 에디터/CRUD/삭제 확인/i18n 접이식 예
- `src/lib/stClient.ts` — 공통 API 클라이언트 (`apiFetch`, `ApiError`, 기존 헬퍼들)
- `src/components/JsonView.vue`, `InfoGrid.vue`, `CopyButton.vue`, `src/lib/toast.ts`, `src/lib/yaml.ts`

## 파일 배치 (절대 규칙)
- 뷰: `src/views/<Name>View.vue` (`<script setup lang="ts">`)
- 이 도구 전용 API: `src/lib/api/<tool>.ts` — 엔드포인트 헬퍼를 여기 정의
- **공유 파일을 수정하지 마라**: `src/router/index.ts`, `src/lib/tools.ts`, `src/lib/stClient.ts`(코어 함수 추가 금지 — 본인 api 모듈에 작성), `src/App.vue`, `src/components/AppSidebar.vue`. 라우트 배선은 메인 작업자가 한다.
- 타입은 본인 api 모듈 안에 정의(공유 `types.ts` 수정 금지).

## API 호출
- `import { apiFetch, ApiError } from '@/lib/stClient'` 사용. `apiFetch<T>(path, { method, body })` — body 는 JSON 문자열로 넘기면 Content-Type 자동 설정, 204는 null 반환, 비-OK 는 ApiError throw.
- 기존 공용 헬퍼 재사용 가능: `listLocations()`, `listDevices(query?)`, `getDevice(id)`, `getDeviceStatus(id)`, `listRooms(locationId)`.
- base 는 `https://api.smartthings.com/v1` (apiFetch 가 자동). path 는 `/...` 로 시작.
- JSON/YAML 입력이 필요하면 `import { parseJsonOrYaml } from '@/lib/yaml'` 사용. 결과 `{ ok, json, value, error }`.

## 인증 게이트 (모든 뷰 상단에 동일 적용)
```vue
<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useTokenStore } from '@/stores/token'
const { hasToken } = storeToRefs(useTokenStore())
</script>
```
템플릿:
```vue
<div v-if="!hasToken" class="rounded-xl border-l-[3px] border-warn bg-warn/10 px-4 py-3 text-sm text-warn">
  PAT 토큰이 없습니다. 우측 상단의 <strong>PAT 설정</strong> 으로 토큰을 입력하세요.
</div>
<template v-else> ... 실제 UI ... </template>
```

## 결과/에러/성공
- 성공/실패 알림: `import { toastError, toastSuccess } from '@/lib/toast'`.
- 응답 JSON 표시: `<JsonView :value="result" label="결과" />` (기본 접힘; 결과를 바로 보여주려면 `:default-open="true"`).
- 로딩 상태 ref(`busy`/`loading`)로 버튼 disabled + "불러오는 중…" 표기.

## 스타일 토큰 (Tailwind 4 @theme — 그대로 사용)
- 색: `bg`, `bg-2`, `card`, `line`, `text`, `muted`, `brand`, `brand-2`, `success`, `warn` (예: `bg-card`, `text-muted`, `border-line`, `text-brand-2`, `border-warn`).
- 페이지 헤더:
```vue
<header class="mb-6">
  <h1 class="text-2xl font-extrabold tracking-tight md:text-3xl">제목</h1>
  <p class="mt-1 text-sm text-muted">한 줄 설명.</p>
</header>
```
- 카드/섹션: `rounded-xl border border-line bg-card p-4`. 섹션 라벨: `text-[11px] font-semibold tracking-wider text-muted uppercase`. 액센트 헤더 바: `<span class="h-3.5 w-1 rounded-full bg-gradient-to-b from-brand to-brand-2" />`.
- 입력/셀렉트/텍스트영역: `rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm text-text outline-none focus:border-brand-2`. 코드/UUID/에디터는 `font-mono`.
- 버튼:
  - primary(생성/전송 등): `rounded-lg border border-transparent bg-gradient-to-br from-brand to-brand-2 px-4 py-2 text-sm font-semibold text-[#061026] transition hover:-translate-y-px disabled:opacity-50`
  - secondary(조회/수정): `rounded-lg border border-line px-4 py-2 text-sm font-semibold transition hover:-translate-y-px hover:border-brand-2 disabled:opacity-50`
  - destructive(삭제): `rounded-lg border border-warn/50 bg-warn/10 px-4 py-2 text-sm font-semibold text-warn transition hover:border-warn`
- 다크 전용. 가독성 위해 텍스트는 `text-text`/`text-muted`, 흰 배경 금지.

## 동작 규칙
- **파괴적 작업(삭제 등)은 `window.confirm` 으로 확인** 후 실행.
- 기존 도구의 모든 주요 기능(목록/조회/생성/수정/삭제/전송 등)을 빠짐없이 이식. 단 jQuery/Bootstrap 마크업은 위 토큰으로 재구성.
- 기존이 location/device 드롭다운을 쓰면 `listLocations`/`listDevices` 재사용하고 위치별로 보기 좋게 그룹/표기.
- 타입 안전: `any` 지양, `unknown` + 좁히기. 사용 안 하는 변수/임포트 금지(빌드가 `noUnusedLocals` strict). 빌드는 `vue-tsc -b && vite build`.

## 산출물 보고 (에이전트가 반환할 것)
- 생성한 파일 경로 목록
- 라우트 배선 정보: `{ path, name, viewFile }` (lazy import 경로)
- 도구 레지스트리 항목 제안: `{ key, title(한글), desc(한글), path, group }` (group 은 아래 중 하나)
  - group: `virtual` | `capability` | `devices` | `edge` | `etc`
- 기존 대비 빠뜨렸거나 불확실한 부분 메모
