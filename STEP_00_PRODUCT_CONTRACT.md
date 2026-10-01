# STEP 00 — 제품 범위와 공통 계약

## 목표

학회가 저널과 논문 PDF를 등록하고, 회원이 논문을 검색·열람하며 PDF 본문에 주석을 남길 수 있는 로컬 실행형 MVP를 만든다. 관리자는 회원 계정을 직접 등록·삭제하고, 저널과 논문을 soft delete한다. 홈 히어로의 타이틀/서브타이틀(site cover copy)은 `frontend/public/site/cover.json`에서 읽는다. 관리자 UI로 이 문구를 편집하지 않는다.

## 사용자 역할

### 비로그인 사용자

- 홈 열람
- 저널 목록 검색 및 필터
- 저널 소개와 권호 목록 열람
- 논문 목록 검색·필터·정렬
- 논문 메타데이터와 초록 열람
- PDF 본문과 주석에는 접근 불가

### MEMBER

- 비로그인 사용자의 모든 권한
- 로그인/로그아웃
- 업로드된 PDF 열람
- 텍스트 선택 후 주석 작성
- 주석 답글 작성
- 자신이 작성한 주석 수정·삭제

### SOCIETY_ADMIN

- MEMBER의 모든 권한
- 저널 등록(저널 커버 이미지 필수 업로드)
- 기존 저널에 권호 생성
- 논문 메타데이터와 PDF 업로드
- 저널·논문 soft delete
- 모든 주석 상태 변경 및 삭제
- 회원 등록(Register)·검색·수정·soft delete
- 회원 역할과 계정 상태 변경

## 화면 계약

| Route | 기능 |
| --- | --- |
| `/` | `cover.json`의 타이틀/서브타이틀, 최근 저널 3개(커버 이미지 또는 플레이스홀더), 저널 탐색 CTA, 로그인 상태별 CTA |
| `/login` | 이메일/비밀번호 로그인 |
| `/repository` | 모든 저널의 논문을 통합 검색·필터·정렬하는 전역 Repository |
| `/journals` | 저널 검색·학문 분야 필터·카드 목록 |
| `/journals/[journalId]` | 저널 소개, ISSN, 발행 정보, aims & scope, 권호 목록, 논문 탐색 CTA. 관리자에게 Delete journal |
| `/journals/[journalId]/articles` | 해당 저널 논문 검색·필터·정렬·페이지네이션 |
| `/journals/[journalId]/issues/[issueId]` | 권호 정보와 논문 목차(페이지 순) |
| `/journals/[journalId]/articles/[articleId]` | 논문 상세 메타데이터·초록·키워드·PDF 열람 CTA. 관리자에게 Delete article |
| `/journals/[journalId]/articles/[articleId]/read` | 로그인 전용 PDF reader와 주석 sidebar |
| `/admin/journals/new` | 관리자 저널 등록 + 저널 커버 이미지 필수 업로드 |
| `/admin/journals/[journalId]/issues/new` | 관리자 권호 생성 |
| `/admin/journals/[journalId]/articles/new` | 관리자 논문 메타데이터 + PDF 업로드 |
| `/admin/members` | 관리자 회원 검색·상태 필터·페이지네이션 |
| `/admin/members/new` | 관리자 회원 등록(Register member) |
| `/admin/members/[userId]` | 관리자 회원 정보·역할·상태 수정 및 Delete member |

특정 저널 내부 화면을 `Journal Repository`라고 부르지 않는다. 전역 논문 통합 검색 기능만 Header에서 `Repository`로 표시한다. 저널 내부에서는 `Journals`, `Articles`, `Browse articles` 용어를 사용한다.

사이트 히어로 문구는 `site cover copy`라고 부르고 `frontend/public/site/cover.json`에 둔다. 저널 목록/홈 카드에 보이는 표지는 `journal cover image`라고 부르며 관리자가 저널 생성 시 업로드한다. 두 개념을 한 파일이나 한 API로 섞지 않는다.

저널 커버 이미지와 논문 PDF는 공통 ObjectStorage를 사용한다. `APP_S3_BUCKET`, `APP_S3_REGION`, `APP_S3_ACCESS_KEY_ID`, `APP_S3_SECRET_ACCESS_KEY`가 모두 있으면 AWS S3, 아니면 로컬 디스크다. 프론트는 `/api/journals/{id}/cover`와 `/api/journals/{id}/articles/{id}/pdf`만 호출한다.

## 고정 기술

### Frontend

- Next.js 16 App Router
- React 19
- TypeScript strict mode
- Tailwind CSS v4
- `lucide-react`
- `pdfjs-dist`
- 상태는 React Context와 component state로 충분히 구현한다.

### Backend

- Java 21을 목표로 하되 로컬 Java 17에서도 컴파일 가능하게 작성
- Spring Boot 3.4.x
- Gradle
- Spring Web, Security, JDBC, Validation
- Flyway
- H2 file database

## 디자인 원칙

- 학술 출판 서비스에 맞는 차분하고 정돈된 화면
- 배경 `#F7F9FB`, 카드 `#FFFFFF`, 본문 `#191C1E`, 보조 텍스트 `#596270`, 경계선 `#E2E8F0`
- primary 검정, link/active/secondary `#4059AA`, success `#16A34A`, warning `#D97706`, error `#BA1A1A`
- UI는 Inter 계열 sans-serif, 논문 초록/읽기 본문은 serif 사용 가능
- 최대 콘텐츠 너비 1200~1320px, 본문 간격은 8px 배수
- 작은 radius와 얇은 경계선 사용. 과한 그림자, gradient, 대형 marketing illustration 금지
- 모바일에서 sidebar는 본문 위 또는 drawer로 이동
- 모든 데이터 화면에 loading, error, empty 상태 구현
- 키보드 focus, label, `aria-*`, 충분한 색 대비를 적용

## 완료 조건

이 STEP에서는 코드를 만들지 않아도 된다. 이후 모든 STEP에서 이 범위와 용어를 단일 제품 계약으로 사용한다.
