# STEP 02 — 로그인, 세션 보안, 메인 홈

## Backend 인증 구현

Spring Security session authentication을 구현한다. JWT와 localStorage token은 사용하지 않는다.

### API

#### `POST /api/auth/login`

Request:

```json
{ "email": "admin@example.com", "password": "Admin1234!" }
```

Response:

```json
{
  "user": {
    "id": 1,
    "email": "admin@example.com",
    "displayName": "Local Administrator",
    "role": "SOCIETY_ADMIN",
    "status": "ACTIVE"
  }
}
```

- email은 case-insensitive로 조회한다.
- BCrypt로 비밀번호를 검증한다.
- ACTIVE가 아닌 사용자와 `deleted_at`이 있는 사용자는 로그인할 수 없다. 삭제된 계정은 `401 account_deleted` 또는 구분 가능한 inactive 오류다.
- 성공하면 session fixation protection을 적용해 새 session을 만든다.

#### `GET /api/auth/me`

- 로그인 사용자에게 위와 동일한 `{ user }`를 반환한다.
- 비로그인은 `401 authentication_required`다.

#### `POST /api/auth/logout`

- session을 무효화하고 `{ "status": "ok" }`를 반환한다.

### Security 설정

- 공개: health, 로그인 POST, 저널/권호/논문 메타데이터 GET
- 인증 필요: PDF content, annotation 전체
- 관리자 필요: `/api/admin/**`
- form login, HTTP Basic 비활성화
- local cookie: HttpOnly, Secure=false, SameSite=Lax, Path=/
- CORS origins: `http://localhost:3000`, `http://127.0.0.1:3000`
- allowed methods: GET, POST, PATCH, DELETE, OPTIONS
- credentials 허용
- `CookieCsrfTokenRepository.withHttpOnlyFalse()`를 사용해 `XSRF-TOKEN` cookie와 `X-XSRF-TOKEN` header를 연결한다.
- login만 CSRF 예외로 둘 수 있다. 인증 후 최초 GET에서도 CSRF cookie가 생성되도록 filter를 둔다.

## Frontend AuthProvider

- 앱 시작 시 `/api/auth/me` 호출
- 상태: `user`, `isLoading`, `isAuthenticated`, `login`, `logout`, `refresh`
- 401은 정상 비로그인 상태로 처리하고 다른 오류와 구분한다.
- 관리자 여부는 `user.role === 'SOCIETY_ADMIN'`로 판단한다.

Header:

- 브랜드 클릭 → `/`
- `Home`, `Repository`, `Journals`
- 관리자인 경우 `Admin` 메뉴
- 비로그인 `Log in`, 로그인 사용자 이름과 `Log out`
- 모바일 navigation 제공

## `/login`

- email, password 필드
- submit 중 버튼 비활성화
- invalid credentials와 inactive account 오류 표시
- 성공 후 `returnTo` query가 안전한 내부 경로이면 그곳으로, 아니면 `/`로 이동
- 로그인 상태에서 접근하면 `/`로 이동
- public signup과 password reset은 MVP에 추가하지 않는다.

## `/` 메인 홈

메인 홈은 논문 목록 화면이 아니라 서비스 진입 화면이다.

필수 섹션:

1. Site cover copy: `title`과 `subtitle`. 컴포넌트에 학회명/소개를 하드코딩하지 않는다.
   - 클라이언트에서 `fetch('/site/cover.json')`으로 `frontend/public/site/cover.json`을 읽는다.
   - 실패하면 fallback `title`: `Journal of Applied Systems`, `subtitle`: `Peer-reviewed research for society members.`
   - 이 JSON은 site cover copy다. 저널 커버 이미지와 섞지 않는다.
2. `Browse Repository` primary CTA와 `Browse journals` secondary CTA
3. 비로그인 `Member login`, 로그인 회원 `Continue browsing`, 관리자 `Manage journals` 보조 CTA
4. 최근 저널 최대 3개 카드
   - 이름, 학문 분야, 짧은 설명, 발행기관
   - `coverUrl`이 있으면 고정 aspect-ratio 이미지(`object-cover`). 없으면 단색/이니셜 플레이스홀더. `onerror` 시 플레이스홀더
   - 클릭 시 저널 소개로 이동
5. 회원 기능 안내: PDF 읽기와 주석

선택적으로 최근 논문 3개 섹션을 함께 제공하되 반드시 실제 `GET /api/articles?sort=newest&size=3` 응답을 사용한다.

최근 저널은 실제 `GET /api/journals?sort=newest&size=3` 응답을 사용한다. API 실패를 static mock으로 대체하지 않고 error state를 표시한다. 삭제된 저널(`deleted_at`이 있는 행)은 포함되지 않아야 한다.

README와 홈 화면 주석에 운영자 가이드를 포함한다.

- 경로: `frontend/public/site/cover.json`
- `title` / `subtitle`만 수정
- JSON 문법(따옴표, 쉼표) 유지
- 저장 후 브라우저 새로고침. Next 재빌드는 필요 없다
- Git에 커밋해야 배포 환경에도 반영된다

## 완료 조건

- 두 데모 계정으로 사용할 session 인증 코드가 완성된다.
- role 기반 Header와 route guard가 동작하도록 구현돼 있다.
- 홈과 로그인 화면이 실제 API만 사용한다. 홈 히어로는 `cover.json`을 사용한다.
- 비밀번호 hash나 session ID를 frontend에 노출하지 않는다.
