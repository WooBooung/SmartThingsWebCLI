# SmartThings Web CLI

[English](#english) | [한국어](#한국어)

---

## English

**🌐 Web URL:** [https://cli.dothesmartthings.com/](https://cli.dothesmartthings.com/)

SmartThings Web CLI is a **web-based version of the official [smartthings-cli](https://github.com/SmartThingsCommunity/smartthings-cli)**. It provides a suite of developer tools to manage and interact with the SmartThings API directly from your browser.

As a pure static Single Page Application (SPA), it makes direct requests to the SmartThings API (`api.smartthings.com`) without routing traffic through any intermediary servers or proxies.

This project is a complete rewrite of the previous [web cli](https://github.com/) moving from Vanilla JS + Bootstrap to **Vue 3 + Vite + TypeScript + Tailwind 4**, establishing a solid foundation for the design system, API client, token management, and layout.

### Tech Stack
- Vue 3 + Vite + TypeScript
- Pinia (State Management) & Vue Router
- Tailwind CSS 4 (AEB Dark Theme Tokens)

### Authentication
- Uses **PAT (Personal Access Token)**. Tokens are securely stored only in your browser's `localStorage`.
- Issue a PAT here: <https://account.smartthings.com/tokens>

### Development
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # creates dist/ (static files)
npm run preview
```

### Deployment
Deploy the generated `dist/` directory to any static host (e.g., GitHub Pages, NAS Nginx).
Since it's an SPA, ensure that all unknown routes fallback to `index.html`.

Optionally, you can change the API base URL by setting the `VITE_ST_API_BASE` environment variable (default: `https://api.smartthings.com/v1`).

### Tools Status
| Tool | Status |
| --- | --- |
| Device Info | ✅ |
| Capability / Events / Virtual / Profile / Presentation … | 🚧 Work in Progress |

---

## 한국어

**🌐 접속 주소 (Web URL):** [https://cli.dothesmartthings.com/](https://cli.dothesmartthings.com/)

SmartThings Web CLI는 공식 **[smartthings-cli](https://github.com/SmartThingsCommunity/smartthings-cli)의 웹 버전**입니다. 브라우저에서 SmartThings API를 바로 다룰 수 있도록 도와주는 개발자 도구 모음입니다.

순수 정적 SPA(Single Page Application)로 구성되어 있으며, 중간 서버나 프록시를 거치지 않고 브라우저에서 직접 SmartThings API(`api.smartthings.com`)를 호출합니다.

기존 [web cli](https://github.com/)의 재작성 버전으로, 기존 Vanilla JS + Bootstrap 환경에서 **Vue 3 + Vite + TypeScript + Tailwind 4** 환경으로 전환하며 디자인 시스템, API 클라이언트, 토큰 스토어, 레이아웃 등 공통 레이어를 깔끔하게 정리했습니다.

### 기술 스택
- Vue 3 + Vite + TypeScript
- Pinia (상태 관리) · Vue Router
- Tailwind CSS 4 (AEB 다크 테마 토큰)

### 인증
- **PAT(Personal Access Token)** 방식을 사용합니다. 발급받은 토큰은 브라우저의 `localStorage`에만 안전하게 저장됩니다.
- PAT 발급처: <https://account.smartthings.com/tokens>

### 개발
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/ 생성 (정적 파일)
npm run preview
```

### 배포
`npm run build`로 생성된 `dist/` 폴더를 정적 호스트(GitHub Pages, NAS nginx 등)에 업로드합니다.
SPA 라우팅을 정상적으로 처리하기 위해 알 수 없는 경로는 `index.html`로 fallback 되도록 설정해야 합니다.

선택적으로 API 베이스 주소를 변경하려면 `VITE_ST_API_BASE` 환경변수를 설정합니다 (기본값: `https://api.smartthings.com/v1`).

### 도구 지원 현황
| 도구 | 상태 |
| --- | --- |
| Device 조회 | ✅ |
| Capability / Events / Virtual / Profile / Presentation … | 🚧 점진 이식 중 |
