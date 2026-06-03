# SmartThings Web CLI

SmartThings API 를 브라우저에서 바로 다루는 개발자 도구 모음. 순수 정적 SPA 로,
SmartThings API(`api.smartthings.com`)를 직접 호출한다(별도 서버/프록시 없음).

기존 [web cli](https://github.com/) 의 재작성 버전. Vanilla JS + Bootstrap →
**Vue 3 + Vite + TypeScript + Tailwind 4** 로 전환하며 공통 레이어(디자인 시스템 · API
클라이언트 · 토큰 스토어 · 레이아웃)를 정리했다.

## 기술 스택

- Vue 3 + Vite + TypeScript
- Pinia (상태) · Vue Router
- Tailwind CSS 4 (AEB 다크 테마 토큰)

## 인증

- **PAT(Personal Access Token)** 방식. 토큰은 브라우저 `localStorage` 에만 저장된다.
- PAT 발급: <https://account.smartthings.com/tokens>

## 개발

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/ 생성 (정적 파일)
npm run preview
```

## 배포

`npm run build` 로 생성된 `dist/` 를 정적 호스트(NAS nginx, GitHub Pages 등)에 올린다.
SPA 라우팅을 위해 알 수 없는 경로는 `index.html` 로 fallback 하도록 설정한다.

선택적으로 API 베이스를 바꾸려면 `VITE_ST_API_BASE` 환경변수를 설정한다
(기본값 `https://api.smartthings.com/v1`).

## 도구

| 도구 | 상태 |
| --- | --- |
| Device 조회 | ✅ |
| Capability / Events / Virtual / Profile / Presentation … | 🚧 점진 이식 |
