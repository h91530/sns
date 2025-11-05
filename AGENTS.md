# Repository Guidelines

## 프로젝트 구조 & 모듈 구성
- `app/`는 Next.js App Router 진입점으로, `login/`, `signup/`, `feed/`, `dashboard/` 외에 비밀번호 재설정을 위한 `reset-password/`(`page.tsx`, `[token]/page.tsx`)를 포함합니다.
- API 엔드포인트는 `app/api/` 하위에 모이며, 인증 흐름은 `auth/login`, `auth/signup`, `auth/reset/{request,validate,confirm}`으로 구성됩니다.
- 공통 UI 컴포넌트는 `app/components/`, 전역 알림 컨텍스트는 `app/context/`, 상태 스토어는 `app/store/`에 위치합니다.
- 정적 스타일과 토큰은 `styles/`에서 관리하고, Playwright 시나리오 테스트는 루트의 `test_*.ts`, `test_*.py`로 정리되어 있습니다.
- 데이터베이스 변경은 `migrations/` SQL과 `setup_db.sh` 가이드를 통해 적용하며, `002_create_password_reset_tokens.sql`로 재설정 토큰 테이블을 생성합니다.

## 빌드·테스트·개발 명령어
- `npm install`: 프로젝트 의존성을 설치합니다.
- `npm run dev`: 개발 서버를 `http://localhost:3000`에서 실행합니다.
- `npm run build`: 프로덕션 번들과 타입 검사를 수행합니다.
- `npm run start`: 빌드 결과물을 기반으로 서버를 구동합니다.
- `npm run lint`: Next.js 기본 ESLint + TypeScript 룰을 적용합니다.
- Playwright(TypeScript): `npx playwright test test_avatar_upload.ts`; 비밀번호 재설정 흐름을 점검하려면 개발 서버 실행 후 `/reset-password`에서 토큰을 받아 진행하세요.
- Playwright(Python): `python test_login_api.py` 실행 전 `pip install playwright && playwright install`.

## 코딩 스타일 & 네이밍 규칙
- TypeScript/TSX는 2칸 공백 들여쓰기, 세미콜론 유지, 함수형 컴포넌트를 기본으로 사용합니다.
- React 컴포넌트 파일은 PascalCase, 커스텀 훅은 `use<Feature>.ts` 네이밍을 따릅니다.
- Tailwind 유틸리티 클래스를 우선 적용하고, 전역 CSS에는 재사용 토큰과 레이아웃 정의만 배치합니다.
- 인증·Supabase 관련 로직은 `app/lib/`, zustand 전역 상태는 `app/store/`로 모읍니다.
- ESLint/Prettier 경고를 해소한 뒤 PR을 올리고, 필요한 경우 파일 상단에 간결한 설명 주석을 추가합니다.

## 테스트 가이드라인
- 핵심 유저 플로우(로그인, 게시물 작성, 비밀번호 재설정)는 Playwright 시나리오로 검증합니다. 파일명은 `test_<feature>.{ts,py}`를 지키고, 시나리오 설명은 현재형으로 작성합니다.
- UI 테스트 전 `npm run dev` 혹은 `npm run start`로 서버를 띄우고, `.env.local` 설정을 로드해야 합니다.
- 비밀번호 재설정 토큰은 개발 환경에서만 응답 `debug.resetUrl`로 노출되므로, 테스트 시 해당 링크를 활용해 `[token]` 페이지로 이동합니다.
- 신규 기능은 최소 1개의 Happy-path 테스트를 추가하고, 실패 시 콘솔·네트워크 로그를 수집해 PR에 첨부합니다.

## 커밋 & PR 가이드라인
- 커밋 메시지는 “Fix password reset validation”처럼 명령형 현재 시제로 72자 이내 요약을 권장합니다.
- 기능, 리팩터링, 테스트 추가를 가능한 한 별도 커밋으로 분리하고, 커밋 본문에는 동기와 영향 범위를 기록합니다.
- PR 본문에는 요약, 검증 방법, 영향받는 라우트/상태, 신규 환경 변수나 마이그레이션 적용 방법을 bullet로 기재합니다.
- UI가 변경되면 스크린샷, API 응답이 달라지면 샘플 payload를 첨부하고, 관련 이슈나 할 일을 링크합니다.

## 환경 변수 & 보안 팁
- `.env.local`에는 Supabase 키와 Cloudinary 자격 증명 외에 `NEXT_PUBLIC_APP_URL`(기본 `http://localhost:3000`)과 `PASSWORD_RESET_TOKEN_TTL_MINUTES`(기본 60분)을 설정합니다.
- 서비스 롤 키 등 민감 값은 절대 커밋하지 말고, 배포 환경은 별도 비밀 관리 도구(예: Vercel 환경 변수, Supabase Secrets)를 사용합니다.
- 비밀번호 재설정 토큰 테이블은 `used_at`이 채워지면 재사용할 수 없으니, 운영 중에는 토큰 유출이 없도록 로그/모니터링을 주기적으로 확인하세요.
