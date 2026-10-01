# STEP 07 — 통합, 반응형 UX, 오류 정리

## 목표

각 STEP에서 만든 기능을 하나의 일관된 MVP로 연결하고 누락된 route, placeholder, mock, 권한 우회를 제거한다.

## 사용자 흐름 점검 기준

### 공개 사용자

`Home → Repository → Search/filter → Article detail → Login 안내`

`Home → Journals → Journal introduction → Browse articles → Article detail`

### MEMBER

`Login → Article detail → Read PDF → Select text → Create annotation → Reply/Edit/Delete`

### SOCIETY_ADMIN

`Login → Create journal (cover required) → Create issue → Upload article PDF → Article detail/read → Delete article or journal`

`Login → Admin members → Register member → Edit role/status → Delete member`

모든 breadcrumb, CTA, 성공 redirect, 뒤로 가기 링크가 이 흐름을 유지해야 한다.

## Frontend 통합 체크리스트

- route별 `loading.tsx`, 의미 있는 error/empty state
- 401은 login + 안전한 returnTo
- 403은 access restricted
- 404는 not found UI
- form field server validation message 표시
- mutation 중 중복 제출 금지
- 모든 icon-only button에 accessible name
- form input label 연결
- focus-visible style
- table의 mobile 대응
- 긴 title/DOI/email overflow 처리
- PDF reader sidebar mobile 전환
- 날짜 표시 방식 일관성
- 페이지네이션 첫/마지막 disabled
- Header active state
- 저널 카드와 홈 카드의 journal cover image / 플레이스홀더
- Header의 Repository 메뉴와 `/repository` active state
- 관리자 메뉴는 관리자만 표시
- logout 후 보호 화면의 cached user state 제거

## Backend 통합 체크리스트

- Controller는 validation/HTTP mapping, Service는 transaction/권한/business rule, Repository는 SQL 역할로 분리
- N+1이 과도한 annotation/reply/논문 조회 개선
- 모든 ID 조합에서 소속 관계 검증
- public metadata GET과 authenticated PDF/annotation 경로 순서가 Security matcher에서 정확함
- CSRF 적용과 frontend header 일치
- CORS credential 설정 일치
- file DB와 upload directory가 backend 기준 경로에 생성. S3 env가 없으면 로컬 ObjectStorage
- PDF·커버 stream에서 절대 경로·버킷·storage key 미노출
- transaction 실패 시 객체/DB 불일치 정리
- 마지막 관리자 보호와 자기 자신 회원 삭제 금지
- 공개 쿼리는 `deleted_at IS NULL`
- annotation ownership 보호
- page/size 범위 제한
- 검색 query trim과 case-insensitive 처리

## 금지 항목 검사

다음이 있으면 제거한다.

- mock journal/article/member/annotation fallback
- component 내부에 흩어진 직접 fetch
- `any` 남용과 backend field를 임의로 rename하는 mapper
- TODO/coming soon/placeholder로 남은 필수 화면
- localStorage 인증 token
- plaintext password
- frontend에 upload absolute path 또는 S3 URL
- 외부 CDN PDF worker
- R2/AWS/PostgreSQL를 MVP 필수 의존성으로 만드는 코드. 선택 S3 ObjectStorage는 허용하되 env가 없으면 로컬로 동작해야 한다
- 특정 저널 화면을 `Journal Repository`라고 중복 명명하는 메뉴
- site cover copy(`cover.json`)와 journal cover image를 한 파일로 섞는 구현
- 사용자가 요청하지 않은 투고/심사/결제 기능
- 저널/논문/회원 복구 UI, 로컬→S3 일괄 이관 job

## README 작성

비개발자도 다음 순서로 실행할 수 있도록 작성한다.

1. 사전 요구사항: Node/npm, Java
2. backend 실행 terminal
3. frontend env 및 실행 terminal
4. URL 목록
5. demo 계정
6. 사용자가 확인할 기능 순서
7. 서버 중지 `Ctrl+C`
8. H2/업로드 데이터 위치와 수동 초기화 설명
9. Site cover copy 수정: `frontend/public/site/cover.json`의 `title`과 `subtitle`만 고친 뒤 브라우저를 새로고침한다. JSON 따옴표와 쉼표를 유지한다. Next 재빌드는 필요 없다. 배포 반영을 위해 Git 커밋이 필요하다. 이 파일은 저널 표지 이미지가 아니다.
10. 선택 S3: `APP_S3_*` 네 값이 모두 있으면 커버와 PDF가 S3로 저장된다. 비어 있으면 로컬 `data/uploads`다.
11. 흔한 오류: port 사용 중, Java version, npm install, 401/403, PDF 없음

## 완료 조건

- 필수 route와 API가 모두 실제 구현이다.
- 외부 서비스 없이 로컬에서 전 기능을 확인할 수 있다. S3는 없어도 된다.
- 전역 Repository와 저널별 논문 탐색이 공통 component를 재사용한다.
- frontend와 backend 계약이 필드 단위로 일치한다.
- 화면과 API에 placeholder 핵심 기능이 없다.
